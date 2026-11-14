import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { byggDashbord, MIN_CELLE, undertrykk, type Aggregat, type Celle, type Rad, type Sum } from "../src/dashbord";
import { kall, nyLenke, nyttProsjekt, registrer } from "./hjelp";

const rad = (maaned: string, transportmiddel: string, antall: number): Rad => ({ maaned, transportmiddel, antall, spart: antall * 2, utslipp: antall });

/** Alle publiserte celler i et dashbord. */
function publiserte(d: Aggregat): Sum[] {
  const ut: Sum[] = [...d.per_transportmiddel, ...(d.annet_transportmiddel ? [d.annet_transportmiddel] : [])];
  for (const m of [...d.per_maaned, ...(d.ovrige_maaneder ? [d.ovrige_maaneder] : [])]) {
    ut.push(m, ...m.per_transportmiddel, ...(m.annet ? [m.annet] : []));
  }
  return ut;
}

describe("dashbord: minst 10 registrerte reiser per prosjekt", () => {
  it("9 reiser gir ingen tall", () => {
    const d = byggDashbord([rad("2026-11", "city_bus", 9)], 10);
    expect(d).toEqual({ tilstrekkelig: false, min_gruppe: 10 });
  });
  it("10 reiser vises", () => {
    const d = byggDashbord([rad("2026-11", "city_bus", 10)], 10);
    expect(d.tilstrekkelig).toBe(true);
  });
  it("min_gruppe kan ikke settes lavere enn 10", () => {
    expect(byggDashbord([rad("2026-11", "city_bus", 7)], 5).tilstrekkelig).toBe(false);
  });
});

describe("dashbord: celler under 5 slås sammen eller skjules", () => {
  it("små transportmidler går til «annet»", () => {
    const d = byggDashbord([rad("2026-11", "city_bus", 8), rad("2026-11", "bicycle", 3), rad("2026-11", "walking", 2)], 10) as Aggregat;
    expect(d.per_maaned[0].per_transportmiddel.map((c) => c.noekkel)).toEqual(["city_bus"]);
    expect(d.per_maaned[0].annet!.registrerte_reiser).toBe(5);
  });
  it("sekundær undertrykking: «annet» med 1–4 tar med seg minste synlige celle", () => {
    const u = undertrykk([
      { noekkel: "a", registrerte_reiser: 9, spart_kg: 0, utslipp_kg: 0 },
      { noekkel: "b", registrerte_reiser: 6, spart_kg: 0, utslipp_kg: 0 },
      { noekkel: "c", registrerte_reiser: 2, spart_kg: 0, utslipp_kg: 0 },
    ]);
    expect(u.synlige.map((c) => c.noekkel)).toEqual(["a"]);
    expect(u.annet!.registrerte_reiser).toBe(8);
  });
  it("måneder med under 5 reiser slås sammen", () => {
    const d = byggDashbord([rad("2026-10", "city_bus", 3), rad("2026-11", "city_bus", 6), rad("2026-09", "walking", 2)], 10) as Aggregat;
    expect(d.per_maaned.map((m) => m.maaned)).toEqual(["2026-11"]);
    expect(d.ovrige_maaneder!.registrerte_reiser).toBe(5);
  });
  it("én liten måned kan ikke regnes ut ved å trekke fra totalen", () => {
    const d = byggDashbord([rad("2026-10", "city_bus", 2), rad("2026-11", "city_bus", 8)], 10) as Aggregat;
    expect(d.per_maaned).toEqual([]);
    expect(d.ovrige_maaneder!.registrerte_reiser).toBe(10);
  });

  it("ingen publisert celle har 1–4 reiser, og summene stemmer (1000 tilfeldige datasett)", () => {
    let seed = 42;
    const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % n; };
    const moduser = ["walking", "bicycle", "city_bus", "electric_train", "electric_car", "airplane"];
    let vist = 0;
    for (let i = 0; i < 1000; i++) {
      const rader: Rad[] = [];
      for (const m of ["2026-09", "2026-10", "2026-11"]) for (const t of moduser) { const n = rnd(9); if (n) rader.push(rad(m, t, n)); }
      const d = byggDashbord(rader, 10);
      const total = rader.reduce((s, r) => s + r.antall, 0);
      if (total < 10) { expect(d.tilstrekkelig).toBe(false); continue; }
      vist++;
      const a = d as Aggregat;
      for (const c of publiserte(a)) expect(c.registrerte_reiser).toBeGreaterThanOrEqual(MIN_CELLE);
      const sumMnd = [...a.per_maaned, ...(a.ovrige_maaneder ? [a.ovrige_maaneder] : [])].reduce((s, m) => s + m.registrerte_reiser, 0);
      expect(sumMnd).toBe(total);
      for (const m of [...a.per_maaned, ...(a.ovrige_maaneder ? [a.ovrige_maaneder] : [])]) {
        expect(m.per_transportmiddel.reduce((s, c: Celle) => s + c.registrerte_reiser, 0) + (m.annet?.registrerte_reiser ?? 0)).toBe(m.registrerte_reiser);
      }
    }
    expect(vist).toBeGreaterThan(500);
  });
});

describe("dashbord via API", () => {
  it("viser ingenting under 10, og summer fra 10", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    for (let i = 0; i < 9; i++) expect((await registrer(token)).status).toBe(201);
    let r = await kall(`/api/dashbord/${p}`);
    let j = (await r.json()) as Record<string, unknown>;
    expect(r.status).toBe(200);
    expect(j.tilstrekkelig).toBe(false);
    expect(j).not.toHaveProperty("totalt");
    expect(JSON.stringify(j)).not.toMatch(/registrerte_reiser|spart_kg|utslipp_kg/);

    expect((await registrer(token)).status).toBe(201);
    r = await kall(`/api/dashbord/${p}`);
    j = (await r.json()) as Record<string, unknown>;
    expect(j.tilstrekkelig).toBe(true);
    expect((j.totalt as Sum).registrerte_reiser).toBe(10);
    const tekst = JSON.stringify(j);
    expect(tekst).not.toMatch(/person|anonym|lenke|token|"dato"|\d{4}-\d{2}-\d{2}/i);
  });

  it("skjulte reiser telles ikke med", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    for (let i = 0; i < 10; i++) await registrer(token);
    const id = (await env.DB.prepare("SELECT id FROM reise WHERE prosjekt_id = ? LIMIT 1").bind(p).first<{ id: string }>())!.id;
    expect((await kall(`/api/admin/reiser/${id}/skjul`, { method: "POST", admin: true })).status).toBe(200);
    const j = (await (await kall(`/api/dashbord/${p}`)).json()) as { tilstrekkelig: boolean };
    expect(j.tilstrekkelig).toBe(false);
  });

  it("ukjent prosjekt gir 404", async () => {
    expect((await kall("/api/dashbord/00000000-0000-4000-8000-0000000000ff")).status).toBe(404);
    expect((await kall("/api/dashbord/ikke-en-id")).status).toBe(404);
  });
});
