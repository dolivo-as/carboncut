import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { calculateHomeOffice, calculateTrip } from "../../calc/src/calc";
import { FACTORS, REFERENCE_CAR } from "../../calc/src/factors";
import { iDag, kall, nyLenke, nyttProsjekt, registrer } from "./hjelp";

const antall = async (p: string) => (await env.DB.prepare("SELECT COUNT(*) AS n FROM reise WHERE prosjekt_id = ?").bind(p).first<{ n: number }>())!.n;
const dagerSiden = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

describe("registrering: bare jobb", () => {
  it("godtar jobb", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    const r = await registrer(token);
    expect(r.status).toBe(201);
    expect(await antall(p)).toBe(1);
  });

  it.each([["privat"], ["private"], ["Jobb"], [""], [null], [undefined], [["jobb"]]])("avviser formaal=%j og lagrer ingenting", async (formaal) => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    const r = await registrer(token, { formaal });
    expect(r.status).toBe(422);
    expect(await antall(p)).toBe(0);
  });

  it("databasen nekter alt annet enn jobb, også ved direkte innsetting", async () => {
    const p = await nyttProsjekt();
    const { id } = await nyLenke(p);
    const forsok = env.DB.prepare(
      "INSERT INTO reise (id, prosjekt_id, lenke_id, formaal, dato, transportmiddel, distanse_km, tur_retur, etapper, utslipp_kg, referanse_kg, faktorversjon, faktor_snapshot, opprettet) VALUES ('x', ?, ?, 'privat', '2026-11-01', 'walking', 1, 0, '[]', 0, 0, 1, '{}', 'n')",
    ).bind(p, id).run();
    await expect(forsok).rejects.toThrow();
  });
});

describe("registrering: serveren regner selv", () => {
  it("ignorerer klientens tall og bruker calc", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    const r = await registrer(token, {
      tur_retur: true, etapper: [{ transportmiddel: "city_bus", distanse_km: 12.5 }, { transportmiddel: "electric_train", distanse_km: 40 }],
      utslipp_kg: 0, referanse_kg: 99999, besparelse_kg: 99999,
    });
    expect(r.status).toBe(201);
    const fasit = calculateTrip({ segments: [{ mode: "city_bus", distanceKm: 12.5 }, { mode: "electric_train", distanceKm: 40 }], returnTrip: true }, FACTORS, REFERENCE_CAR);
    const rad = await env.DB.prepare("SELECT * FROM reise WHERE prosjekt_id = ?").bind(p).first<Record<string, number | string>>();
    expect(rad!.utslipp_kg).toBeCloseTo(fasit.emissionsKg, 10);
    expect(rad!.referanse_kg).toBeCloseTo(fasit.baselineKg, 10);
    expect(rad!.distanse_km).toBe(105);
    expect(rad!.transportmiddel).toBe("electric_train");
    expect(rad!.formaal).toBe("jobb");
    expect(JSON.parse(rad!.faktor_snapshot as string)).toEqual(JSON.parse(JSON.stringify(fasit.snapshot)));
  });

  it("hjemmekontor regnes med referansebil", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    const r = await kall("/api/reiser", { method: "POST", body: JSON.stringify({ token, formaal: "jobb", dato: iDag(), type: "hjemmekontor", pendling_km: 20, tur_retur: true }) });
    expect(r.status).toBe(201);
    const fasit = calculateHomeOffice({ oneWayCommuteKm: 20, avoided: "return" }, REFERENCE_CAR);
    const j = (await r.json()) as { besparelse_kg: number };
    expect(j.besparelse_kg).toBeCloseTo(fasit.savingsKg, 10);
  });

  it("lagrer ingen navn, e-post eller fritekst", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    await registrer(token, { navn: "Ola Fiktiv", epost: "ola@example.invalid", beskrivelse: "Fiktiv fritekst" });
    const rad = await env.DB.prepare("SELECT * FROM reise WHERE prosjekt_id = ?").bind(p).first();
    const tekst = JSON.stringify(rad);
    expect(tekst).not.toContain("Ola Fiktiv");
    expect(tekst).not.toContain("ola@example.invalid");
    expect(tekst).not.toContain("Fiktiv fritekst");
  });
});

describe("registrering: rimelighetssjekk", () => {
  const ugyldige: [string, Record<string, unknown>][] = [
    ["for kort distanse", { etapper: [{ transportmiddel: "city_bus", distanse_km: 0.05 }] }],
    ["for lang distanse", { etapper: [{ transportmiddel: "airplane", distanse_km: 2000.1 }] }],
    ["samlet over 2000 km", { etapper: [{ transportmiddel: "airplane", distanse_km: 1500 }, { transportmiddel: "city_bus", distanse_km: 600 }] }],
    ["negativ distanse", { etapper: [{ transportmiddel: "city_bus", distanse_km: -3 }] }],
    ["tekst som distanse", { etapper: [{ transportmiddel: "city_bus", distanse_km: "12" }] }],
    ["dato fram i tid", { dato: dagerSiden(-2) }],
    ["dato eldre enn 31 dager", { dato: dagerSiden(33) }],
    ["ugyldig dato", { dato: "2026-02-30" }],
    ["ukjent transportmiddel", { etapper: [{ transportmiddel: "rakett", distanse_km: 5 }] }],
    ["transportmiddel uten kilde", { etapper: [{ transportmiddel: "hybrid_car", distanse_km: 5 }] }],
    ["hjemmekontor som etappe", { etapper: [{ transportmiddel: "home_office", distanse_km: 5 }] }],
    ["ingen etapper", { etapper: [] }],
    ["mangler tur_retur", { tur_retur: undefined }],
  ];
  it.each(ugyldige)("avviser %s", async (_navn, ekstra) => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    const r = await registrer(token, ekstra);
    expect(r.status).toBe(422);
    expect(await antall(p)).toBe(0);
  });
  it("godtar 30 dager tilbake og 0,1 km", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    expect((await registrer(token, { dato: dagerSiden(30), etapper: [{ transportmiddel: "walking", distanse_km: 0.1 }] })).status).toBe(201);
  });
  it("honningfelt: svarer 201, men lagrer ingenting", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    const r = await registrer(token, { nettside: "http://spam.example" });
    expect(r.status).toBe(201);
    expect(await antall(p)).toBe(0);
  });
  it("avviser for stor forespørsel og ugyldig JSON", async () => {
    expect((await kall("/api/reiser", { method: "POST", body: "{" })).status).toBe(400);
    expect((await kall("/api/reiser", { method: "POST", body: JSON.stringify({ x: "a".repeat(9000) }) })).status).toBe(400);
  });
});
