import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { devAuth } from "../src/auth";
import { sha256Hex } from "../src/krypto";
import type { Env } from "../src/env";
import { kall, nyLenke, nyttProsjekt, registrer } from "./hjelp";

/** Alt tekstinnhold i alle tabeller, for å bevise at noe IKKE er lagret. */
async function heleDatabasen(): Promise<string> {
  const { results } = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all<{ name: string }>();
  let alt = "";
  for (const { name } of results) alt += JSON.stringify((await env.DB.prepare(`SELECT * FROM "${name}"`).all()).results);
  return alt;
}

describe("lenke: token lagres bare som hash", () => {
  it("lagrer SHA-256 og 6 tegns prefiks, aldri selve tokenet", async () => {
    const p = await nyttProsjekt();
    const { token, id } = await nyLenke(p);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 byte base64url = 256 bit
    const rad = await env.DB.prepare("SELECT * FROM lenke WHERE id = ?").bind(id).first<Record<string, unknown>>();
    expect(rad!.token_hash).toBe(await sha256Hex(token));
    expect(rad!.token_prefiks).toBe(token.slice(0, 6));
    // Registrer en reise også, så tokenet har vært gjennom hele løpet.
    expect((await registrer(token)).status).toBe(201);
    const alt = await heleDatabasen();
    expect(alt).not.toContain(token);
    expect(alt).not.toContain(token.slice(6)); // heller ikke resten av tokenet
  });

  it("tokenet kan ikke hentes igjen fra admin-API-et", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    const r = await kall(`/api/admin/prosjekter/${p}/lenker`, { admin: true });
    const tekst = await r.text();
    expect(r.status).toBe(200);
    expect(tekst).not.toContain(token);
    expect(tekst).toContain(token.slice(0, 6));
  });

  it("to lenker får ulike tokener", async () => {
    const p = await nyttProsjekt();
    const a = await nyLenke(p);
    const b = await nyLenke(p);
    expect(a.token).not.toBe(b.token);
  });

  it("utløper etter 12 måneder", async () => {
    const p = await nyttProsjekt();
    const r = await kall(`/api/admin/prosjekter/${p}/lenker`, { method: "POST", admin: true });
    const j = (await r.json()) as { lenke: { opprettet: string; utloper: string } };
    const o = new Date(j.lenke.opprettet);
    o.setUTCMonth(o.getUTCMonth() + 12);
    expect(j.lenke.utloper).toBe(o.toISOString());
  });
});

describe("lenke: ukjent, utløpt og trukket gir identisk 404", () => {
  it("samme status og body på /api/reiser og /api/lenke", async () => {
    const p = await nyttProsjekt();
    const utlopt = await nyLenke(p);
    await env.DB.prepare("UPDATE lenke SET utloper = '2020-01-01T00:00:00.000Z' WHERE id = ?").bind(utlopt.id).run();
    const trukket = await nyLenke(p);
    expect((await kall(`/api/admin/lenker/${trukket.id}/trekk-tilbake`, { method: "POST", admin: true })).status).toBe(200);
    const ukjent = "A".repeat(43);
    const misdannet = "kort";

    for (const sti of ["/api/reiser", "/api/lenke"]) {
      const svar = [];
      for (const t of [ukjent, utlopt.token, trukket.token, misdannet]) {
        const r = sti === "/api/reiser" ? await registrer(t) : await kall(sti, { method: "POST", body: JSON.stringify({ token: t }) });
        svar.push({ status: r.status, body: await r.text(), type: r.headers.get("content-type") });
      }
      expect(svar[0].status).toBe(404);
      for (const s of svar) expect(s).toEqual(svar[0]);
    }
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM reise WHERE prosjekt_id = ?").bind(p).first<{ n: number }>())!.n).toBe(0);
  });

  it("gyldig lenke svarer med prosjektnavn, men aldri reiser", async () => {
    const p = await nyttProsjekt("Fiktivt prosjekt Sørbru");
    const { token } = await nyLenke(p);
    await registrer(token);
    const r = await kall("/api/lenke", { method: "POST", body: JSON.stringify({ token }) });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ prosjekt: { id: p, navn: "Fiktivt prosjekt Sørbru", offentlig: true } });
  });

  it("trekk tilbake avviser nye registreringer straks", async () => {
    const p = await nyttProsjekt();
    const l = await nyLenke(p);
    expect((await registrer(l.token)).status).toBe(201);
    await kall(`/api/admin/lenker/${l.id}/trekk-tilbake`, { method: "POST", admin: true });
    expect((await registrer(l.token)).status).toBe(404);
  });

  it("forny trekker tilbake gammel og lager ny i samme operasjon", async () => {
    const p = await nyttProsjekt();
    const gammel = await nyLenke(p);
    const r = await kall(`/api/admin/lenker/${gammel.id}/forny`, { method: "POST", admin: true });
    expect(r.status).toBe(201);
    const ny = (await r.json()) as { token: string; erstattet: string };
    expect(ny.erstattet).toBe(gammel.id);
    expect((await registrer(gammel.token)).status).toBe(404);
    expect((await registrer(ny.token)).status).toBe(201);
    const logg = await env.DB.prepare("SELECT handling FROM hendelseslogg ORDER BY tid").all<{ handling: string }>();
    expect(logg.results.map((x) => x.handling)).toContain("forny_lenke");
  });
});

describe("admin: midlertidig dev-innlogging", () => {
  it("avviser uten eller med feil nøkkel", async () => {
    expect((await kall("/api/admin/prosjekter", {})).status).toBe(401);
    expect((await kall("/api/admin/prosjekter", { headers: { authorization: "Bearer feil-nokkel-feil-nokkel-feil" } })).status).toBe(401);
  });
  it("er slått av (503) når MILJO ikke er «lokal» eller nøkkelen mangler", () => {
    const req = new Request("http://x", { headers: { authorization: "Bearer test-nokkel-kun-for-tester-0123456789" } });
    const base = { DB: env.DB, ALLOWED_ORIGINS: "https://carboncut.no", ADMIN_DEV_ID: "a" } as Env;
    expect(devAuth(req, { ...base, ADMIN_DEV_KEY: "test-nokkel-kun-for-tester-0123456789" })).toEqual({ ok: false, status: 503 });
    expect(devAuth(req, { ...base, MILJO: "lokal" })).toEqual({ ok: false, status: 503 });
    expect(devAuth(req, { ...base, MILJO: "lokal", ADMIN_DEV_KEY: "kort" })).toEqual({ ok: false, status: 503 });
    expect(devAuth(req, { ...base, MILJO: "lokal", ADMIN_DEV_KEY: "test-nokkel-kun-for-tester-0123456789" })).toEqual({ ok: true, adminId: "a" });
  });
  it("admin ser ikke prosjekter i en annen bedrift", async () => {
    await nyttProsjekt();
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO bedrift (id, navn, opprettet) VALUES ('00000000-0000-4000-8000-00000000b999', 'Annen Fiktiv AS', '2026-01-01')"),
      env.DB.prepare("INSERT OR IGNORE INTO administrator (id, bedrift_id, epost, navn, rolle, opprettet) VALUES ('00000000-0000-4000-8000-00000000a999', '00000000-0000-4000-8000-00000000b999', 'x@example.invalid', 'X', 'eier', '2026-01-01')"),
      env.DB.prepare("INSERT OR IGNORE INTO prosjekt (id, bedrift_id, navn, status, min_gruppe, opprettet_av, opprettet) VALUES ('00000000-0000-4000-8000-00000000c999', '00000000-0000-4000-8000-00000000b999', 'Fremmed', 'aktiv', 10, '00000000-0000-4000-8000-00000000a999', '2026-01-01')"),
    ]);
    const r = await kall("/api/admin/prosjekter/00000000-0000-4000-8000-00000000c999/lenker", { method: "POST", admin: true });
    expect(r.status).toBe(404);
  });
});
