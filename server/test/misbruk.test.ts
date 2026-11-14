import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { GRENSE_IP_PER_TIME, GRENSE_LENKE_PER_DOGN, rydd, sekTilNyttVindu } from "../src/misbruk";
import { kall, nyLenke, nyttProsjekt, registrer } from "./hjelp";

describe("ratebegrensning", () => {
  it(`maks ${GRENSE_IP_PER_TIME} per time per IP`, async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    const ip = "198.51.100.10";
    for (let i = 0; i < GRENSE_IP_PER_TIME; i++) expect((await registrer(token, {}, ip)).status).toBe(201);
    const r = await registrer(token, {}, ip);
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("3600");
    // En annen IP slipper fortsatt til.
    expect((await registrer(token, {}, "198.51.100.11")).status).toBe(201);
  });

  it("IP-grensen teller også forsøk med ugyldig lenke (gjetting)", async () => {
    const ip = "198.51.100.20";
    for (let i = 0; i < GRENSE_IP_PER_TIME; i++) expect((await registrer("B".repeat(43), {}, ip)).status).toBe(404);
    expect((await registrer("B".repeat(43), {}, ip)).status).toBe(429);
  });

  it(`maks ${GRENSE_LENKE_PER_DOGN} per døgn per lenke`, async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    for (let i = 0; i < GRENSE_LENKE_PER_DOGN; i++) {
      const s = (await registrer(token, {}, `10.${i >> 8}.${i & 255}.1`)).status;
      if (s !== 201) throw new Error(`registrering ${i + 1} ga ${s}`);
    }
    const foer = Math.floor(Date.now() / 1000);
    const stopp = await registrer(token, {}, "10.250.0.1");
    const etter = Math.floor(Date.now() / 1000);
    expect(stopp.status).toBe(429);
    // Retry-After = sekunder til døgnvinduet (UTC) nullstilles.
    const ra = Number(stopp.headers.get("retry-after"));
    expect(Number.isInteger(ra)).toBe(true);
    expect(ra).toBeGreaterThanOrEqual(86_400 - (etter % 86_400));
    expect(ra).toBeLessThanOrEqual(86_400 - (foer % 86_400));
    // En annen lenke er ikke berørt.
    const annen = await nyLenke(p);
    expect((await registrer(annen.token, {}, "10.250.0.2")).status).toBe(201);
  }, 60_000);
});

describe("sekTilNyttVindu", () => {
  it("regner sekunder til neste faste vindu", () => {
    expect(sekTilNyttVindu(86_400, Date.UTC(2026, 10, 16, 0, 0, 0))).toBe(86_400);
    expect(sekTilNyttVindu(86_400, Date.UTC(2026, 10, 16, 23, 59, 59))).toBe(1);
    expect(sekTilNyttVindu(86_400, Date.UTC(2026, 10, 16, 12, 0, 0, 500))).toBe(43_200);
  });
});

describe("IP lagres ikke i klartekst", () => {
  it("bare HMAC med døgnsalt finnes i databasen", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    const ip = "198.51.100.77";
    await registrer(token, {}, ip);
    await registrer("C".repeat(43), {}, ip);
    await kall("/api/lenke", { method: "POST", body: JSON.stringify({ token }), ip });
    const { results } = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all<{ name: string }>();
    for (const { name } of results) {
      const alt = JSON.stringify((await env.DB.prepare(`SELECT * FROM "${name}"`).all()).results);
      expect(alt, name).not.toContain(ip);
      expect(alt, name).not.toContain("198.51.100");
    }
    const tellere = await env.DB.prepare("SELECT noekkel FROM misbruk_teller WHERE noekkel LIKE 'ip:%'").all<{ noekkel: string }>();
    expect(tellere.results.length).toBeGreaterThan(0);
    for (const t of tellere.results) expect(t.noekkel).toMatch(/^ip:[0-9a-f]{64}$/);
  });

  it("rydding sletter tellere eldre enn 24 t og gammelt døgnsalt", async () => {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO misbruk_teller (noekkel, vindu, antall) VALUES ('ip:gammel', ?, 3)").bind(Math.floor(Date.now() / 1000) - 90_000),
      env.DB.prepare("INSERT INTO dognsalt (dag, salt) VALUES ('2000-01-01', 'gammelt')"),
    ]);
    await rydd(env.DB, Date.now());
    expect(await env.DB.prepare("SELECT 1 FROM misbruk_teller WHERE noekkel = 'ip:gammel'").first()).toBeNull();
    expect(await env.DB.prepare("SELECT 1 FROM dognsalt WHERE dag = '2000-01-01'").first()).toBeNull();
  });
});
