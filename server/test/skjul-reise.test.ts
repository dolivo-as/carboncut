import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { isoUke } from "../src/uke";
import { ADMIN, kall, nyLenke, nyttProsjekt, registrer } from "./hjelp";

interface AdminReise { id: string; uke: number; aar: number; transportmiddel: string; distanse_km: number; tur_retur: boolean; utslipp_kg: number; referanse_kg: number; skjult: boolean }
interface ReiseSvar { reiser: AdminReise[]; totalt: number; skjulte: number; maks: number }

const hentReiser = async (p: string) => (await (await kall(`/api/admin/prosjekter/${p}/reiser`, { admin: true })).json()) as ReiseSvar;
const skjul = (id: string) => kall(`/api/admin/reiser/${id}/skjul`, { method: "POST", admin: true });
const vis = (id: string) => kall(`/api/admin/reiser/${id}/vis`, { method: "POST", admin: true });
const dashbord = async (p: string) => (await (await kall(`/api/dashbord/${p}`)).json()) as { tilstrekkelig: boolean; totalt?: { registrerte_reiser: number } };
const adminAntall = async (p: string) => {
  const j = (await (await kall("/api/admin/prosjekter", { admin: true })).json()) as { prosjekter: { id: string; registrerte_reiser: number }[] };
  return j.prosjekter.find((x) => x.id === p)!.registrerte_reiser;
};

/** Legger inn fiktive reiser direkte (uten ratebegrensning), med gitt dato. */
async function settInn(p: string, lenkeId: string, datoer: string[]) {
  await env.DB.batch(datoer.map((dato, i) =>
    env.DB.prepare(
      "INSERT INTO reise (id, prosjekt_id, lenke_id, formaal, dato, transportmiddel, distanse_km, tur_retur, etapper, utslipp_kg, referanse_kg, faktorversjon, faktor_snapshot, opprettet) " +
        "VALUES (?, ?, ?, 'jobb', ?, 'city_bus', 10, 0, '[]', 0.5, 1.5, 1, '{}', ?)",
    ).bind(crypto.randomUUID(), p, lenkeId, dato, `2026-11-14T10:00:${String(i % 60).padStart(2, "0")}Z`),
  ));
}

describe("skjul reiser: liste for admin", () => {
  it("viser prosjektets reiser uten dag, lenke-id, token eller innsendingstidspunkt", async () => {
    const p = await nyttProsjekt("Fiktivt reiseprosjekt A");
    const { token } = await nyLenke(p);
    expect((await registrer(token)).status).toBe(201);
    const r = await kall(`/api/admin/prosjekter/${p}/reiser`, { admin: true });
    expect(r.status).toBe(200);
    const tekst = await r.text();
    const j = JSON.parse(tekst) as ReiseSvar;
    expect(j.totalt).toBe(1);
    expect(j.skjulte).toBe(0);
    expect(j.reiser).toHaveLength(1);
    expect(Object.keys(j.reiser[0]).sort()).toEqual(["aar", "distanse_km", "id", "referanse_kg", "skjult", "transportmiddel", "tur_retur", "uke", "utslipp_kg"]);
    expect(j.reiser[0].transportmiddel).toBe("city_bus");
    expect(j.reiser[0].skjult).toBe(false);
    expect(tekst).not.toContain(token.slice(0, 6));
    expect(tekst).not.toMatch(/lenke|opprettet|dato|T\d{2}:\d{2}/);
    expect(tekst).not.toMatch(/\d{4}-\d{2}-\d{2}/); // ingen dag i noe format
    expect(j.reiser[0]).toMatchObject(isoUke(new Date().toISOString().slice(0, 10)));
  });

  it("nyeste først (sortert på dag på serveren), og høyst 200 reiser", async () => {
    const p = await nyttProsjekt("Fiktivt reiseprosjekt B");
    const { id } = await nyLenke(p);
    const datoer = Array.from({ length: 205 }, (_, i) => `2026-10-${String((i % 28) + 1).padStart(2, "0")}`);
    await settInn(p, id, datoer);
    const j = await hentReiser(p);
    expect(j.totalt).toBe(205);
    expect(j.maks).toBe(200);
    expect(j.reiser).toHaveLength(200);
    const u = j.reiser.map((x) => x.aar * 100 + x.uke);
    expect([...u].sort((a, b) => b - a)).toEqual(u);
    expect(j.reiser[0]).toMatchObject({ uke: 44, aar: 2026 }); // 28.10.2026 er i uke 44
  });
});

describe("skjul reiser: skjul og vis igjen", () => {
  it("skjulte reiser telles ikke i dashbord eller adminlista, og «vis» teller dem igjen", async () => {
    const p = await nyttProsjekt("Fiktivt reiseprosjekt C");
    const { token } = await nyLenke(p);
    for (let i = 0; i < 10; i++) expect((await registrer(token)).status).toBe(201);
    expect((await dashbord(p)).tilstrekkelig).toBe(true);
    expect(await adminAntall(p)).toBe(10);

    const id = (await hentReiser(p)).reiser[0].id;
    const s = await skjul(id);
    expect(s.status).toBe(200);
    expect(await s.json()).toEqual({ skjult: true });
    expect((await dashbord(p)).tilstrekkelig).toBe(false); // 9 < 10
    expect(await adminAntall(p)).toBe(9);
    const etter = await hentReiser(p);
    expect(etter.skjulte).toBe(1);
    expect(etter.totalt).toBe(10); // ingenting slettes
    expect(etter.reiser.find((x) => x.id === id)!.skjult).toBe(true);

    const v = await vis(id);
    expect(v.status).toBe(200);
    expect(await v.json()).toEqual({ skjult: false });
    const d = await dashbord(p);
    expect(d.tilstrekkelig).toBe(true);
    expect(d.totalt!.registrerte_reiser).toBe(10);
    expect(await adminAntall(p)).toBe(10);
  });

  it("er idempotent og logger bare faktiske endringer", async () => {
    const p = await nyttProsjekt("Fiktivt reiseprosjekt D");
    const { token } = await nyLenke(p);
    await registrer(token);
    const id = (await hentReiser(p)).reiser[0].id;
    for (const f of [skjul, skjul, vis, vis]) expect((await f(id)).status).toBe(200);
    const { results } = await env.DB.prepare("SELECT handling, administrator_id FROM hendelseslogg WHERE mal_id = ?").bind(id).all<{ handling: string; administrator_id: string }>();
    expect(results.map((r) => r.handling).sort()).toEqual(["skjul_reise", "vis_reise"]);
    expect(results.every((r) => r.administrator_id === ADMIN)).toBe(true);
  });

  it("virker også for arkivert prosjekt", async () => {
    const p = await nyttProsjekt("Fiktivt reiseprosjekt E");
    const { token } = await nyLenke(p);
    await registrer(token);
    const id = (await hentReiser(p)).reiser[0].id;
    expect((await kall(`/api/admin/prosjekter/${p}/arkiver`, { method: "POST", admin: true })).status).toBe(200);
    expect((await skjul(id)).status).toBe(200);
    expect((await hentReiser(p)).skjulte).toBe(1);
  });
});

describe("skjul reiser: tilgang", () => {
  it("ukjent, feilformet og annen bedrifts reise eller prosjekt gir 404", async () => {
    await nyttProsjekt("Fiktivt reiseprosjekt F");
    const annenBedrift = "00000000-0000-4000-8000-00000000b003";
    const annenAdmin = "00000000-0000-4000-8000-00000000a003";
    const annetProsjekt = "00000000-0000-4000-8000-0000000c0f03";
    const annenLenke = "00000000-0000-4000-8000-0000000d0f03";
    const annenReise = "00000000-0000-4000-8000-0000000e0f03";
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO bedrift (id, navn, opprettet) VALUES (?, 'Annen Fiktiv AS', '2026-01-01T00:00:00Z')").bind(annenBedrift),
      env.DB.prepare("INSERT OR IGNORE INTO administrator (id, bedrift_id, epost, navn, rolle, opprettet) VALUES (?, ?, 'annen3@example.invalid', 'Annen Fiktiv', 'eier', '2026-01-01T00:00:00Z')").bind(annenAdmin, annenBedrift),
      env.DB.prepare("INSERT OR IGNORE INTO prosjekt (id, bedrift_id, navn, status, min_gruppe, offentlig, opprettet_av, opprettet) VALUES (?, ?, 'Annet fiktivt', 'aktiv', 10, 1, ?, '2026-01-01T00:00:00Z')").bind(annetProsjekt, annenBedrift, annenAdmin),
      env.DB.prepare("INSERT OR IGNORE INTO lenke (id, prosjekt_id, token_hash, token_prefiks, opprettet, utloper, trukket_tilbake, opprettet_av) VALUES (?, ?, 'fiktiv-hash-3', 'ZZZZZZ', '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z', NULL, ?)").bind(annenLenke, annetProsjekt, annenAdmin),
    ]);
    await settInn(annetProsjekt, annenLenke, ["2026-11-01"]);
    await env.DB.prepare("UPDATE reise SET id = ? WHERE prosjekt_id = ?").bind(annenReise, annetProsjekt).run();

    for (const id of ["00000000-0000-4000-8000-000000000000", "ikke-en-uuid", annenReise]) {
      for (const f of [skjul, vis]) {
        const r = await f(id);
        expect(r.status).toBe(404);
        expect(await r.json()).toEqual({ feil: "Fant ikke reisen." });
      }
    }
    expect((await env.DB.prepare("SELECT skjult FROM reise WHERE id = ?").bind(annenReise).first<{ skjult: number }>())!.skjult).toBe(0);
    for (const id of ["00000000-0000-4000-8000-000000000000", "ikke-en-uuid", annetProsjekt]) {
      const r = await kall(`/api/admin/prosjekter/${id}/reiser`, { admin: true });
      expect(r.status).toBe(404);
      expect(await r.json()).toEqual({ feil: "Fant ikke prosjektet." });
    }
  });

  it("krever admin", async () => {
    const p = await nyttProsjekt("Fiktivt reiseprosjekt G");
    expect((await kall(`/api/admin/prosjekter/${p}/reiser`)).status).toBe(401);
    expect((await kall("/api/admin/reiser/00000000-0000-4000-8000-000000000000/vis", { method: "POST" })).status).toBe(401);
  });
});

describe("skjul reiser: ISO-uke", () => {
  it.each([
    ["2026-11-14", 46, 2026], ["2026-11-09", 46, 2026], ["2026-11-15", 46, 2026], ["2026-11-16", 47, 2026],
    ["2026-01-01", 1, 2026], ["2025-12-29", 1, 2026], ["2027-01-01", 53, 2026], ["2027-01-04", 1, 2027],
    ["2024-12-30", 1, 2025], ["2021-01-03", 53, 2020],
  ])("%s er uke %i i %i", (dato, uke, aar) => {
    expect(isoUke(dato)).toEqual({ uke, aar });
  });
});

describe("skjul reiser: migrering 0004", () => {
  it("hendelseslogg godtar vis_reise og avviser ukjente handlinger", async () => {
    const p = await nyttProsjekt("Fiktivt migrering 0004");
    const sett = (h: string) =>
      env.DB.prepare("INSERT INTO hendelseslogg (id, administrator_id, handling, mal_id, tid) VALUES (?, ?, ?, ?, '2026-11-14T00:00:00Z')")
        .bind(crypto.randomUUID(), ADMIN, h, p).run();
    await expect(sett("vis_reise")).resolves.toBeTruthy();
    await expect(sett("arkiver_prosjekt")).resolves.toBeTruthy();
    await expect(sett("slett_reise")).rejects.toThrow(/CHECK/);
  });
});
