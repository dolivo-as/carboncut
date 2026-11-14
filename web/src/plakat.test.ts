import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { encode } from "uqr";
import { describe, expect, it, vi } from "vitest";
import { lenkeDeler, Plakat, PLAKAT_TEKST } from "./components/Plakat";
import { kanSkriveUtPlakat, skrivUtPlakat } from "./pages/Admin";

const NAA = "2026-11-14T12:00:00.000Z";
const URL_FIKTIV = "http://127.0.0.1:5190/#/r/TEST-fiktivt-token-0000000000000000000000";
const lenke = (o: Partial<{ utloper: string; trukket_tilbake: string | null }> = {}) => ({
  id: "l1", opprettet: "2026-11-01T00:00:00.000Z", utloper: "2027-05-14T00:00:00.000Z", trukket_tilbake: null, ...o,
});
const aktivt = { id: "p1", status: "aktiv" };

describe("A4-plakat: når den kan skrives ut", () => {
  it("aktivt prosjekt + aktiv, ny lenke for samme prosjekt → ja", () => {
    expect(kanSkriveUtPlakat(aktivt, { lenke: lenke() as never, prosjektId: "p1" }, NAA)).toBe(true);
  });
  it("arkivert prosjekt → nei", () => {
    expect(kanSkriveUtPlakat({ id: "p1", status: "arkivert" }, { lenke: lenke() as never, prosjektId: "p1" }, NAA)).toBe(false);
  });
  it("ingen ny lenke i minnet → nei", () => {
    expect(kanSkriveUtPlakat(aktivt, null, NAA)).toBe(false);
  });
  it("utløpt eller tilbaketrukket lenke → nei", () => {
    expect(kanSkriveUtPlakat(aktivt, { lenke: lenke({ utloper: "2026-11-01T00:00:00.000Z" }) as never, prosjektId: "p1" }, NAA)).toBe(false);
    expect(kanSkriveUtPlakat(aktivt, { lenke: lenke({ trukket_tilbake: "2026-11-10T00:00:00.000Z" }) as never, prosjektId: "p1" }, NAA)).toBe(false);
  });
  it("lenke for et annet prosjekt → nei", () => {
    expect(kanSkriveUtPlakat(aktivt, { lenke: lenke() as never, prosjektId: "p2" }, NAA)).toBe(false);
  });
  it("ingen prosjekt valgt → nei", () => {
    expect(kanSkriveUtPlakat(null, { lenke: lenke() as never, prosjektId: "p1" }, NAA)).toBe(false);
  });
});

describe("A4-plakat: innhold", () => {
  const html = renderToStaticMarkup(createElement(Plakat, { navn: "Testprosjekt Nord", url: URL_FIKTIV, gyldigTil: "2027-05-14T00:00:00.000Z" }));
  it("har tittel, prosjektnavn, tre steg, personverntekst og lenken som tekst", () => {
    expect(html).toContain(`<h1 class="plakat-tittel">${PLAKAT_TEKST.tittel}</h1>`);
    expect(html).toContain('<p class="plakat-prosjekt">Testprosjekt Nord</p>');
    expect(html.match(/<li>/g)).toHaveLength(3);
    for (const s of PLAKAT_TEKST.steg) expect(html).toContain(s);
    expect(html).toContain(PLAKAT_TEKST.personvern);
    expect(html.replace(/<wbr\/?>|<\/?span[^>]*>/g, "")).toContain(URL_FIKTIV);
    expect(html).toMatch(/Gyldig til \d+\. \S+ 2027/);
  });
  it("stegene matcher knappene i lenkeflyten", () => {
    const flyt = readFileSync(new URL("./flow/LinkTrip.tsx", import.meta.url), "utf8");
    expect(flyt).toContain("Neste");
    expect(flyt).toContain("Send inn");
  });
  it("QR-koden er en SVG med etikett og stillesone på 4 moduler", () => {
    expect(html).toMatch(/<svg class="plakat-qr"[^>]*role="img"[^>]*aria-label="QR-kode for registrering på Testprosjekt Nord"/);
    const storrelse = encode(URL_FIKTIV, { ecc: "M", border: 4 }).size;
    expect(html).toContain(`viewBox="0 0 ${storrelse} ${storrelse}"`);
  });
});

describe("A4-plakat: lenketeksten", () => {
  const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");
  it("brytes foran tokenet, ikke midt i det", () => {
    expect(lenkeDeler(URL_FIKTIV)).toEqual(["http://127.0.0.1:5190/#/r/", "TEST-fiktivt-token-0000000000000000000000"]);
    const html = renderToStaticMarkup(createElement(Plakat, { navn: "X", url: URL_FIKTIV, gyldigTil: "2027-05-14" }));
    expect(html).toMatch(/#\/r\/<\/span><wbr\/?><span class="plakat-lenkedel">TEST-fiktivt-token/);
    expect(css).toMatch(/\.plakat-lenkedel\s*\{\s*white-space:\s*nowrap/);
  });
});

describe("A4-plakat: utskrift", () => {
  it("legger på body-klassen før print og fjerner den etter", () => {
    const body = { classList: new Set<string>() } as unknown as HTMLElement;
    const cl = new Set<string>();
    Object.assign(body, { classList: { add: (c: string) => cl.add(c), remove: (c: string) => cl.delete(c) } });
    let etter: () => void = () => {};
    const win = {
      print: vi.fn(() => expect(cl.has("skriver-plakat")).toBe(true)),
      addEventListener: vi.fn((_: string, f: () => void) => { etter = f; }),
    };
    skrivUtPlakat(win as never, body);
    expect(win.print).toHaveBeenCalledOnce();
    etter();
    expect(cl.has("skriver-plakat")).toBe(false);
  });
});

describe("A4-plakat: print-CSS", () => {
  const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const print = css.slice(css.indexOf("A4-plakat med QR-kode"));
  it("skjult på skjerm, A4 stående én side ved utskrift", () => {
    expect(print).toMatch(/\.plakat\s*\{\s*display:\s*none;\s*\}/);
    expect(print).toMatch(/@page\s*\{\s*size:\s*A4 portrait/);
    expect(print).toMatch(/body\.skriver-plakat > \*:not\(\.plakat\)\s*\{\s*display:\s*none !important/);
    expect(print).toMatch(/break-inside:\s*avoid/);
    const mh = Number(/max-height:\s*(\d+)mm/.exec(print)?.[1]);
    expect(mh).toBeLessThanOrEqual(297 - 2 * 12);
  });
  it("svart på hvitt og QR minst 100 mm", () => {
    expect(print).toMatch(/color:\s*#000000;\s*background:\s*#ffffff/);
    const w = Number(/\.plakat-qr\s*\{[^}]*width:\s*(\d+)mm/.exec(print)?.[1]);
    expect(w).toBeGreaterThanOrEqual(100);
  });
  it("tittelen overstyrer den generelle print-regelen som skjuler h1", () => {
    expect(print).toMatch(/\.plakat-tittel\s*\{\s*display:\s*block !important/);
  });
});

describe("A4-plakat: skrift og nummerering (UX 14.11)", () => {
  const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const print = css.slice(css.indexOf("A4-plakat med QR-kode"));
  const regel = (sel: string) => new RegExp(`\\n\\s*${sel.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`).exec(print)?.[1] ?? "";
  it("stegene er nummerert (decimal) med plass til tallene", () => {
    expect(regel(".plakat-steg")).toMatch(/list-style:\s*decimal/);
    expect(Number(/padding-left:\s*(\d+)mm/.exec(regel(".plakat-steg"))?.[1])).toBeGreaterThanOrEqual(8);
    expect(print).toMatch(/\.plakat \.plakat-steg\s*\{\s*list-style:\s*decimal outside !important/);
  });
  it("stegene er 18–20 pt", () => {
    const pt = Number(/font-size:\s*(\d+)pt/.exec(regel(".plakat-steg"))?.[1]);
    expect(pt).toBeGreaterThanOrEqual(18);
    expect(pt).toBeLessThanOrEqual(20);
  });
  it("lenken er minst 11 pt monospace og brytes uten break-all", () => {
    const r = regel(".plakat-lenke");
    expect(Number(/font-size:\s*(\d+)pt/.exec(r)?.[1])).toBeGreaterThanOrEqual(11);
    expect(r).toMatch(/monospace/);
    expect(r).toMatch(/overflow-wrap:\s*anywhere/);
    expect(r).not.toMatch(/break-all/);
  });
});
