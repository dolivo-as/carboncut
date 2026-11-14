import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { kall, nyLenke, nyttProsjekt, registrer } from "./hjelp";

const UKJENT_TOKEN = "A".repeat(43);
const arkiver = (id: string) => kall(`/api/admin/prosjekter/${id}/arkiver`, { method: "POST", admin: true });
const gjenopprett = (id: string) => kall(`/api/admin/prosjekter/${id}/gjenopprett`, { method: "POST", admin: true });
const status = async (id: string) =>
  (await env.DB.prepare("SELECT status FROM prosjekt WHERE id = ?").bind(id).first<{ status: string }>())!.status;
const loggFor = async (id: string) =>
  (await env.DB.prepare("SELECT handling FROM hendelseslogg WHERE mal_id = ? ORDER BY tid, handling").bind(id).all<{ handling: string }>())
    .results.map((r) => r.handling);

async function svarBilde(r: Response) {
  return { status: r.status, body: await r.text(), type: r.headers.get("content-type") };
}

describe("arkivering: admin arkiverer og gjenoppretter prosjekt", () => {
  it("arkivert prosjekt tar ikke imot reiser, og svaret er likt ukjent lenke", async () => {
    const p = await nyttProsjekt("Fiktivt arkivprosjekt A");
    const { token } = await nyLenke(p);
    expect((await registrer(token)).status).toBe(201);

    const a = await arkiver(p);
    expect(a.status).toBe(200);
    expect(await a.json()).toEqual({ prosjekt: { id: p, status: "arkivert" } });
    expect(await status(p)).toBe("arkivert");

    const ukjentReise = await svarBilde(await registrer(UKJENT_TOKEN));
    expect(await svarBilde(await registrer(token))).toEqual(ukjentReise);
    expect(ukjentReise.status).toBe(404);

    const lenke = (t: string) => kall("/api/lenke", { method: "POST", body: JSON.stringify({ token: t }) });
    expect(await svarBilde(await lenke(token))).toEqual(await svarBilde(await lenke(UKJENT_TOKEN)));
  });

  it("ingenting slettes: reiser og lenker står urørt, og gjenoppretting gjør lenken gyldig igjen", async () => {
    const p = await nyttProsjekt("Fiktivt arkivprosjekt B");
    const { token, id } = await nyLenke(p);
    expect((await registrer(token)).status).toBe(201);
    const antall = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM reise WHERE prosjekt_id = ?").bind(p).first<{ n: number }>())!.n;
    const lenkeRad = () => env.DB.prepare("SELECT * FROM lenke WHERE id = ?").bind(id).first();
    const forLenke = await lenkeRad();

    expect((await arkiver(p)).status).toBe(200);
    expect(await antall()).toBe(1);
    expect(await lenkeRad()).toEqual(forLenke);

    const g = await gjenopprett(p);
    expect(g.status).toBe(200);
    expect(await g.json()).toEqual({ prosjekt: { id: p, status: "aktiv" } });
    expect((await registrer(token)).status).toBe(201);
    expect(await antall()).toBe(2);
  });

  it("arkivert prosjekt: ny lenke og fornying gir 409, tilbaketrekking går fortsatt", async () => {
    const p = await nyttProsjekt("Fiktivt arkivprosjekt C");
    const { id } = await nyLenke(p);
    expect((await arkiver(p)).status).toBe(200);

    const ny = await kall(`/api/admin/prosjekter/${p}/lenker`, { method: "POST", admin: true });
    expect(ny.status).toBe(409);
    expect(await ny.json()).toEqual({ feil: "Prosjektet er arkivert." });
    const forny = await kall(`/api/admin/lenker/${id}/forny`, { method: "POST", admin: true });
    expect(forny.status).toBe(409);

    const trekk = await kall(`/api/admin/lenker/${id}/trekk-tilbake`, { method: "POST", admin: true });
    expect(trekk.status).toBe(200);
  });

  it("er idempotent og logger bare faktiske endringer", async () => {
    const p = await nyttProsjekt("Fiktivt arkivprosjekt D");
    expect((await arkiver(p)).status).toBe(200);
    expect((await arkiver(p)).status).toBe(200);
    expect(await status(p)).toBe("arkivert");
    expect((await gjenopprett(p)).status).toBe(200);
    expect((await gjenopprett(p)).status).toBe(200);
    expect(await status(p)).toBe("aktiv");
    const logg = await loggFor(p);
    expect(logg.filter((h) => h === "arkiver_prosjekt")).toHaveLength(1);
    expect(logg.filter((h) => h === "gjenopprett_prosjekt")).toHaveLength(1);
  });

  it("adminlista viser status arkivert", async () => {
    const p = await nyttProsjekt("Fiktivt arkivprosjekt E");
    await arkiver(p);
    const r = await kall("/api/admin/prosjekter", { admin: true });
    const j = (await r.json()) as { prosjekter: { id: string; status: string }[] };
    expect(j.prosjekter.find((x) => x.id === p)?.status).toBe("arkivert");
  });

  it("ukjent, feilformet og annen bedrifts prosjekt gir samme 404", async () => {
    const p = await nyttProsjekt("Fiktivt arkivprosjekt F");
    const annenBedrift = "00000000-0000-4000-8000-00000000b002";
    const annetProsjekt = "00000000-0000-4000-8000-0000000c0f02";
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO bedrift (id, navn, opprettet) VALUES (?, 'Annen Fiktiv AS', '2026-01-01T00:00:00Z')").bind(annenBedrift),
      env.DB.prepare("INSERT OR IGNORE INTO administrator (id, bedrift_id, epost, navn, rolle, opprettet) VALUES ('00000000-0000-4000-8000-00000000a002', ?, 'annen@example.invalid', 'Annen Fiktiv', 'eier', '2026-01-01T00:00:00Z')").bind(annenBedrift),
      env.DB.prepare("INSERT OR IGNORE INTO prosjekt (id, bedrift_id, navn, status, min_gruppe, offentlig, opprettet_av, opprettet) VALUES (?, ?, 'Annet fiktivt', 'aktiv', 10, 1, '00000000-0000-4000-8000-00000000a002', '2026-01-01T00:00:00Z')").bind(annetProsjekt, annenBedrift),
    ]);
    for (const id of ["00000000-0000-4000-8000-000000000000", "ikke-en-uuid", annetProsjekt]) {
      for (const f of [arkiver, gjenopprett]) {
        const r = await f(id);
        expect(r.status).toBe(404);
        expect(await r.json()).toEqual({ feil: "Fant ikke prosjektet." });
      }
    }
    expect((await env.DB.prepare("SELECT status FROM prosjekt WHERE id = ?").bind(annetProsjekt).first<{ status: string }>())!.status).toBe("aktiv");
    expect(await status(p)).toBe("aktiv");
  });

  it("krever admin", async () => {
    const p = await nyttProsjekt("Fiktivt arkivprosjekt G");
    const r = await kall(`/api/admin/prosjekter/${p}/arkiver`, { method: "POST" });
    expect(r.status).toBe(401);
    expect(await status(p)).toBe("aktiv");
  });

  it("offentlig dashbord for arkivert prosjekt vises fortsatt med status; skjult gir fortsatt samme 404", async () => {
    const p = await nyttProsjekt("Fiktivt arkivprosjekt H");
    await arkiver(p);
    const d = await kall(`/api/dashbord/${p}`);
    expect(d.status).toBe(200);
    expect(((await d.json()) as { prosjekt: { status: string } }).prosjekt.status).toBe("arkivert");

    const s = await kall("/api/admin/prosjekter", { method: "POST", admin: true, body: JSON.stringify({ navn: "Fiktivt skjult arkiv", offentlig: false }) });
    const sid = ((await s.json()) as { prosjekt: { id: string } }).prosjekt.id;
    await arkiver(sid);
    const skjult = await kall(`/api/dashbord/${sid}`);
    const ukjent = await kall("/api/dashbord/00000000-0000-4000-8000-000000000000");
    expect(skjult.status).toBe(404);
    expect(await skjult.text()).toBe(await ukjent.text());
  });
});

describe("arkivering: migrering 0003", () => {
  it("hendelseslogg godtar de nye handlingene og avviser ukjente", async () => {
    const p = await nyttProsjekt("Fiktivt migreringsprosjekt");
    const sett = (h: string) =>
      env.DB.prepare("INSERT INTO hendelseslogg (id, administrator_id, handling, mal_id, tid) VALUES (?, '00000000-0000-4000-8000-00000000a001', ?, ?, '2026-11-14T00:00:00Z')")
        .bind(crypto.randomUUID(), h, p).run();
    await expect(sett("arkiver_prosjekt")).resolves.toBeTruthy();
    await expect(sett("gjenopprett_prosjekt")).resolves.toBeTruthy();
    await expect(sett("slett_prosjekt")).rejects.toThrow(/CHECK/);
  });

  it("prosjekt.status har fortsatt CHECK (bare aktiv|arkivert)", async () => {
    const p = await nyttProsjekt("Fiktivt statusprosjekt");
    await expect(env.DB.prepare("UPDATE prosjekt SET status = 'slettet' WHERE id = ?").bind(p).run()).rejects.toThrow(/CHECK/);
  });
});
