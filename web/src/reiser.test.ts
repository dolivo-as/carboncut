import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { REISE_TEKST, ReiseListe, reiseLinje, type AdminReise, type ReiseSvar } from "./pages/Admin";

const ingenting = () => {};
const reise = (ekstra: Partial<AdminReise> = {}): AdminReise => ({
  id: "r1", dato: "2026-11-13", transportmiddel: "city_bus", distanse_km: 12.5, tur_retur: false, utslipp_kg: 0.5, referanse_kg: 2, skjult: false, ...ekstra,
});
const vis = (svar: ReiseSvar | null, status = "") =>
  renderToStaticMarkup(createElement(ReiseListe, { svar, status, onSkjul: ingenting, onVis: ingenting }));

describe("skjul reiser: visning", () => {
  it("reiselinja har bare dag, transportmiddel, km og tur-retur", () => {
    expect(reiseLinje(reise())).toBe("13. nov. 2026 · Buss (by) · 12,5 km");
    expect(reiseLinje(reise({ tur_retur: true }))).toBe("13. nov. 2026 · Buss (by) · 12,5 km · tur-retur");
    expect(reiseLinje(reise({ transportmiddel: "home_office", distanse_km: 30 }))).toBe("13. nov. 2026 · Hjemmekontor · 30 km unngått");
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
    expect(html).toMatch(/aria-live="polite"><p class="notice" role="status">Reisen er skjult/);
  });

  it("viser aldri ord som peker på personer eller lenker", () => {
    const html = vis({ reiser: [reise()], totalt: 1, skjulte: 0, maks: 200 }).toLowerCase();
    expect(html).not.toMatch(/person|lenke|token|ansatt/);
  });
});
