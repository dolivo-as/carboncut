import { describe, expect, it } from "vitest";
import { kall, nyttProsjekt, seedAdmin } from "./hjelp";

describe("prosjekt: utløp og offentlig dashbord", () => {
  it("forvalgt utløp er 12 måneder, og første lenke kommer i samme svar", async () => {
    await seedAdmin();
    const r = await kall("/api/admin/prosjekter", { method: "POST", admin: true, body: JSON.stringify({ navn: "Fiktivt prosjekt Øst" }) });
    expect(r.status).toBe(201);
    const j = (await r.json()) as { prosjekt: { offentlig: boolean }; token: string; lenke: { opprettet: string; utloper: string } };
    expect(j.prosjekt.offentlig).toBe(true);
    expect(j.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const o = new Date(j.lenke.opprettet);
    o.setUTCMonth(o.getUTCMonth() + 12);
    expect(j.lenke.utloper).toBe(o.toISOString());
  });

  it.each([3, 6, 12] as const)("godtar utloper_maaneder=%s", async (mnd) => {
    await seedAdmin();
    const r = await kall("/api/admin/prosjekter", {
      method: "POST", admin: true,
      body: JSON.stringify({ navn: `Fiktivt ${mnd} mnd`, utloper_maaneder: mnd }),
    });
    expect(r.status).toBe(201);
    const j = (await r.json()) as { lenke: { opprettet: string; utloper: string } };
    const o = new Date(j.lenke.opprettet);
    o.setUTCMonth(o.getUTCMonth() + mnd);
    expect(j.lenke.utloper).toBe(o.toISOString());
  });

  it.each([1, 24, 0, "12", 12.5])("avviser utloper_maaneder=%j", async (verdi) => {
    await seedAdmin();
    const r = await kall("/api/admin/prosjekter", {
      method: "POST", admin: true,
      body: JSON.stringify({ navn: "Fiktivt ugyldig utløp", utloper_maaneder: verdi }),
    });
    expect(r.status).toBe(422);
    const j = (await r.json()) as { feil: string };
    expect(j.feil).toMatch(/3, 6 eller 12/);
  });

  it("avviser offentlig som ikke er boolean", async () => {
    await seedAdmin();
    const r = await kall("/api/admin/prosjekter", {
      method: "POST", admin: true,
      body: JSON.stringify({ navn: "Fiktivt ugyldig flagg", offentlig: 1 }),
    });
    expect(r.status).toBe(422);
  });

  it("skjult dashbord gir nøyaktig samme 404 som ukjent prosjekt", async () => {
    await seedAdmin();
    const r = await kall("/api/admin/prosjekter", {
      method: "POST", admin: true,
      body: JSON.stringify({ navn: "Fiktivt skjult prosjekt", offentlig: false }),
    });
    expect(r.status).toBe(201);
    const j = (await r.json()) as { prosjekt: { id: string; offentlig: boolean } };
    expect(j.prosjekt.offentlig).toBe(false);

    const skjult = await kall(`/api/dashbord/${j.prosjekt.id}`);
    const ukjent = await kall("/api/dashbord/00000000-0000-4000-8000-0000000000ff");
    const ugyldig = await kall("/api/dashbord/ikke-en-id");
    const a = { status: skjult.status, body: await skjult.text(), type: skjult.headers.get("content-type") };
    const b = { status: ukjent.status, body: await ukjent.text(), type: ukjent.headers.get("content-type") };
    const c = { status: ugyldig.status, body: await ugyldig.text(), type: ugyldig.headers.get("content-type") };
    expect(a.status).toBe(404);
    expect(a).toEqual(b);
    expect(a).toEqual(c);
    expect(JSON.parse(a.body)).toEqual({ feil: "Fant ikke prosjektet." });
  });

  it("offentlig dashbord er tilgjengelig, og ny lenke kan få eget utløp", async () => {
    const p = await nyttProsjekt("Fiktivt åpent prosjekt");
    const vis = await kall(`/api/dashbord/${p}`);
    expect(vis.status).toBe(200);
    const lenke = await kall(`/api/admin/prosjekter/${p}/lenker`, {
      method: "POST", admin: true, body: JSON.stringify({ utloper_maaneder: 3 }),
    });
    expect(lenke.status).toBe(201);
    const j = (await lenke.json()) as { lenke: { opprettet: string; utloper: string } };
    const o = new Date(j.lenke.opprettet);
    o.setUTCMonth(o.getUTCMonth() + 3);
    expect(j.lenke.utloper).toBe(o.toISOString());
  });

  it("forny uten parameter beholder 3 måneders utløp", async () => {
    await seedAdmin();
    const r = await kall("/api/admin/prosjekter", {
      method: "POST", admin: true,
      body: JSON.stringify({ navn: "Fiktivt forny 3", utloper_maaneder: 3 }),
    });
    const opprettet = (await r.json()) as { lenke: { id: string } };
    const forny = await kall(`/api/admin/lenker/${opprettet.lenke.id}/forny`, { method: "POST", admin: true });
    expect(forny.status).toBe(201);
    const j = (await forny.json()) as { lenke: { opprettet: string; utloper: string } };
    const o = new Date(j.lenke.opprettet);
    o.setUTCMonth(o.getUTCMonth() + 3);
    expect(j.lenke.utloper).toBe(o.toISOString());
  });
});
