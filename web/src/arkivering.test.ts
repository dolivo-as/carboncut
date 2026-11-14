import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ARKIV_TEKST, ArkiverDialog, Arkivering, delProsjekter, erArkivert, ingenAktivLenke, lagLenkeTekst, ProsjektListe, type Lenke, type Prosjekt } from "./pages/Admin";

const ingenting = () => {};
const vis = (status: string, bekrefter = false) =>
  renderToStaticMarkup(createElement(Arkivering, {
    navn: "Fiktivt prosjekt Nord", status, bekrefter, onBe: ingenting, onBekreft: ingenting, onAvbryt: ingenting, onGjenopprett: ingenting,
  }));
const p = (id: string, status: string): Prosjekt => ({ id, navn: `Fiktivt ${id}`, status, registrerte_reiser: 0, offentlig: true });
const lenke = (id: string, opprettet: string, trukket: string | null = null): Lenke =>
  ({ id, prefiks: "abcdef", opprettet, utloper: "2027-11-14T00:00:00Z", trukket_tilbake: trukket });

describe("arkivering i admin", () => {
  it("bare «aktiv» regnes som ikke arkivert", () => {
    expect(erArkivert("aktiv")).toBe(false);
    expect(erArkivert("arkivert")).toBe(true);
  });

  it("aktivt prosjekt: sekundær tekstknapp, ikke rød, med skillelinje over", () => {
    const html = vis("aktiv");
    expect(html).toContain("Arkiver prosjekt…");
    expect(html).toContain('class="linkbtn"');
    expect(html).not.toMatch(/danger/);
    expect(html).toMatch(/border-top/);
    expect(html).not.toContain("Gjenopprett");
  });

  it("bekreftelsen har UX-tittel, eksakt brødtekst og knappene Arkiver/Avbryt", () => {
    const html = vis("aktiv", true);
    expect(html).toContain("Arkivere Fiktivt prosjekt Nord?");
    expect(html).toContain("Lenken og QR-koden slutter å virke for godt, og prosjektet tar ikke imot nye reiser. Tallene på dashbordet blir stående. Du kan gjenopprette prosjektet senere, men da må du lage en ny lenke.");
    expect(html).toContain('role="alertdialog"');
    expect(html).toMatch(/>Arkiver<\/button>/);
    expect(html).toMatch(/>Avbryt<\/button>/);
    expect(html).not.toMatch(/danger/);
    expect(html).not.toContain("Arkiver prosjekt…");
  });

  it("dialogen viser Arkiver før Avbryt (fokus på Avbryt settes i useEffect og er ikke DOM-testet)", () => {
    // SSR kjører ikke effekter; vi sjekker at rekkefølgen er Arkiver, Avbryt og at begge finnes.
    const html = renderToStaticMarkup(createElement(ArkiverDialog, { navn: "X", onArkiver: ingenting, onAvbryt: ingenting }));
    expect(html.indexOf(">Arkiver<")).toBeLessThan(html.indexOf(">Avbryt<"));
  });

  it("arkivert prosjekt: gjenoppretting uten advarsel, med CTOs tekst", () => {
    const html = vis("arkivert", true);
    expect(html).toMatch(/<button type="button" class="btn secondary">Gjenopprett prosjekt<\/button>/);
    expect(html).toContain("Prosjektet tar imot reiser igjen når du lager en ny lenke. Gamle lenker og QR-plakater virker ikke lenger.");
    expect(html).not.toContain("alertdialog");
    expect(html).not.toContain("Arkiver prosjekt…");
  });

  it("statusteksten etter gjenoppretting er UX-teksten", () => {
    expect(ARKIV_TEKST.gjenopprettetStatus).toBe("Prosjektet er gjenopprettet. Lag en ny lenke med «Lag ny lenke» før du deler eller skriver ut QR-koden igjen.");
  });

  it("statusteksten etter arkivering er UX-teksten i tre setninger", () => {
    expect(ARKIV_TEKST.arkivertStatus).toBe("Prosjektet er arkivert. Lenken og QR-koden virker ikke lenger. Tallene på dashbordet blir stående.");
  });
});

describe("adminlista: arkiverte for seg", () => {
  it("deler i aktive og arkiverte og beholder rekkefølgen", () => {
    const d = delProsjekter([p("a", "aktiv"), p("b", "arkivert"), p("c", "aktiv")]);
    expect(d.aktive.map((x) => x.id)).toEqual(["a", "c"]);
    expect(d.arkiverte.map((x) => x.id)).toEqual(["b"]);
  });

  it("aktive øverst, arkiverte i lukket <details> med antall og tekstmerket «Arkivert»", () => {
    const html = renderToStaticMarkup(createElement(ProsjektListe, { prosjekter: [p("b", "arkivert"), p("a", "aktiv"), p("d", "arkivert")], valgt: null, onVelg: ingenting }));
    expect(html).toContain("<summary>Arkiverte prosjekter (2)</summary>");
    expect(html).not.toMatch(/<details[^>]*open/);
    expect(html.indexOf("Fiktivt a")).toBeLessThan(html.indexOf("<details"));
    expect(html.indexOf("Fiktivt b")).toBeGreaterThan(html.indexOf("<details"));
    expect(html.match(/>Arkivert</g)).toHaveLength(2);
  });

  it("ingen arkiverte: ingen <details>", () => {
    const html = renderToStaticMarkup(createElement(ProsjektListe, { prosjekter: [p("a", "aktiv")], valgt: null, onVelg: ingenting }));
    expect(html).not.toContain("<details");
  });
});

describe("«Lag ny lenke» etter gjenoppretting", () => {
  const naa = "2026-11-14T12:00:00Z";
  const trukket = lenke("t", "2026-11-01T00:00:00Z", "2026-11-10T00:00:00Z");
  it("heter «Lag ny lenke» når prosjektet er aktivt og ingen lenke er aktiv (også uten lenker)", () => {
    expect(ingenAktivLenke("aktiv", [trukket], naa)).toBe(true);
    expect(ingenAktivLenke("aktiv", [], naa)).toBe(true);
    expect(lagLenkeTekst(true)).toBe("Lag ny lenke");
  });
  it("heter «Lag ny delelenke» når en lenke er aktiv, og gjelder ikke arkivert prosjekt", () => {
    expect(ingenAktivLenke("aktiv", [trukket, lenke("aktiv", "2026-11-12T00:00:00Z")], naa)).toBe(false);
    expect(lagLenkeTekst(false)).toBe("Lag ny delelenke");
    expect(ingenAktivLenke("arkivert", [trukket], naa)).toBe(false);
  });
  it("utløpt lenke regnes ikke som aktiv", () => {
    const utlopt = { ...lenke("u", "2025-01-01T00:00:00Z"), utloper: "2026-01-01T00:00:00Z" };
    expect(ingenAktivLenke("aktiv", [utlopt], naa)).toBe(true);
  });
});

describe("live-regioner i admin", () => {
  it("statusmeldingene for reiser og arkivering ligger ikke i nestede live-regioner", async () => {
    const { readFileSync } = await import("node:fs");
    const kilde = readFileSync(new URL("./pages/Admin.tsx", import.meta.url), "utf8");
    expect(kilde).not.toMatch(/aria-live="polite">\{(status|arkivStatus) && <p[^>]*role="status"/);
    expect(kilde).toContain('<div aria-live="polite">{arkivStatus && <p className="notice">{arkivStatus}</p>}</div>');
  });
});
