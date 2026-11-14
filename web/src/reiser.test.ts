import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { flereAar, REISE_TEKST, ReiseKort, ReiseListe, reiseLinje, ukeTekst, type AdminReise, type ReiseSvar } from "./pages/Admin";

const ingenting = () => {};
const reise = (ekstra: Partial<AdminReise> = {}): AdminReise => ({
  id: "r1", uke: 46, aar: 2026, transportmiddel: "city_bus", distanse_km: 12.5, tur_retur: false, utslipp_kg: 0.5, referanse_kg: 2, skjult: false, ...ekstra,
});
const vis = (svar: ReiseSvar | null, status = "") =>
  renderToStaticMarkup(createElement(ReiseListe, { svar, status, onSkjul: ingenting, onVis: ingenting }));

describe("skjul reiser: visning", () => {
  it("reiselinja har bare uke, transportmiddel, eksakt km og tur-retur", () => {
    expect(reiseLinje(reise())).toBe("Uke 46 · Buss (by) · 12,5 km");
    expect(reiseLinje(reise({ tur_retur: true, distanse_km: 1.234 }))).toBe("Uke 46 · Buss (by) · 1,234 km · tur-retur");
    expect(reiseLinje(reise({ transportmiddel: "home_office", distanse_km: 30 }))).toBe("Uke 46 · Hjemmekontor · 30 km unngått");
  });

  it("viser år bare når lista spenner over flere uke-år", () => {
    expect(ukeTekst({ uke: 1, aar: 2027 }, false)).toBe("Uke 1");
    expect(ukeTekst({ uke: 1, aar: 2027 }, true)).toBe("Uke 1, 2027");
    expect(flereAar([{ aar: 2026 }, { aar: 2026 }])).toBe(false);
    expect(flereAar([{ aar: 2026 }, { aar: 2027 }])).toBe(true);
    const html = vis({ reiser: [reise({ id: "a", uke: 1, aar: 2027 }), reise({ id: "b", uke: 52, aar: 2026 })], totalt: 2, skjulte: 0, maks: 200 });
    expect(html).toContain("Uke 1, 2027");
    expect(html).toContain("Uke 52, 2026");
    expect(vis({ reiser: [reise()], totalt: 1, skjulte: 0, maks: 200 })).not.toMatch(/Uke 46, 2026/);
  });

  it("viser aldri en dag", () => {
    const html = vis({ reiser: [reise()], totalt: 1, skjulte: 0, maks: 200 });
    expect(html).not.toMatch(/\d{1,2}\. (jan|feb|mar|apr|mai|jun|jul|aug|sep|okt|nov|des)/);
    expect(html).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("«Registrerte reiser (n)» er en lukket <details> med antall (også skjulte)", () => {
    const html = renderToStaticMarkup(createElement(ReiseKort, { svar: { reiser: [reise()], totalt: 7, skjulte: 2, maks: 200 }, status: "", onSkjul: ingenting, onVis: ingenting }));
    expect(html).toMatch(/^<details class="reise-kort"><summary>/);
    expect(html).not.toMatch(/<details[^>]*open/);
    expect(html).toContain("Registrerte reiser (7)");
    const laster = renderToStaticMarkup(createElement(ReiseKort, { svar: null, status: "", onSkjul: ingenting, onVis: ingenting }));
    expect(laster).toContain(">Registrerte reiser</h2>");
  });

  it("én knapp per rad som bytter tekst (fokus blir på samme knapp), minst 44 px via .reise-knapp", () => {
    const html = vis({ reiser: [reise(), reise({ id: "r2", skjult: true })], totalt: 2, skjulte: 1, maks: 200 });
    expect(html.match(/<button[^>]*class="btn secondary reise-knapp"[^>]*>(Skjul|Vis igjen)<\/button>/g)).toHaveLength(2);
    expect(html.match(/<li class="lrow reise-rad">/g)).toHaveLength(2);
    expect(html).not.toMatch(/alertdialog|Bekreft/);
  });

  it("synlig reise har «Skjul», skjult reise har merket «Skjult» og «Vis igjen»", () => {
    const html = vis({ reiser: [reise(), reise({ id: "r2", skjult: true })], totalt: 2, skjulte: 1, maks: 200 });
    expect(html.match(/>Skjul<\/button>/g)).toHaveLength(1);
    expect(html.match(/>Vis igjen<\/button>/g)).toHaveLength(1);
    expect(html).toContain(">Skjult</span>");
    expect(html).toContain("2 registrerte reiser, 1 skjult.");
    expect(html).toContain("Estimert spart 1,5 kg CO₂e");
  });

  it("forklarer at skjulte reiser ikke telles og ikke slettes", () => {
    const html = vis({ reiser: [reise()], totalt: 1, skjulte: 0, maks: 200 });
    expect(html).toContain(REISE_TEKST.intro);
    expect(REISE_TEKST.intro).toMatch(/telles ikke/);
    expect(REISE_TEKST.intro).toMatch(/slettes ikke/);
  });

  it("sier fra når lista er avkortet", () => {
    const html = vis({ reiser: [reise()], totalt: 250, skjulte: 0, maks: 200 });
    expect(html).toContain("Viser de 1 nyeste.");
    expect(vis({ reiser: [reise()], totalt: 1, skjulte: 0, maks: 200 })).not.toContain("nyeste");
  });

  it("tom liste, lasting og status i polite live-region", () => {
    expect(vis({ reiser: [], totalt: 0, skjulte: 0, maks: 200 })).toContain("Ingen registrerte reiser ennå.");
    expect(vis(null)).toContain("Henter");
    const html = vis({ reiser: [reise()], totalt: 1, skjulte: 0, maks: 200 }, REISE_TEKST.skjult);
    // Én live-region: wrapperen har aria-live, <p> inni har ingen egen rolle (UX 14.11, unngår dobbel opplesning).
    expect(html).toMatch(/aria-live="polite"><p class="notice">Reisen er skjult/);
    expect(html).not.toContain('role="status"');
  });

  it("viser aldri ord som peker på personer eller lenker", () => {
    const html = vis({ reiser: [reise()], totalt: 1, skjulte: 0, maks: 200 }).toLowerCase();
    expect(html).not.toMatch(/person|lenke|token|ansatt/);
  });
});
