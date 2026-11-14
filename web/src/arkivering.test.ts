import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Arkivering, erArkivert } from "./pages/Admin";

const ingenting = () => {};
const vis = (status: string, bekrefter = false) =>
  renderToStaticMarkup(createElement(Arkivering, {
    status, bekrefter, onBe: ingenting, onBekreft: ingenting, onAvbryt: ingenting, onGjenopprett: ingenting,
  }));

describe("arkivering i admin", () => {
  it("bare «aktiv» regnes som ikke arkivert", () => {
    expect(erArkivert("aktiv")).toBe(false);
    expect(erArkivert("arkivert")).toBe(true);
  });

  it("aktivt prosjekt: én knapp, ingen arkivering uten bekreftelse", () => {
    const html = vis("aktiv");
    expect(html).toContain("Arkiver prosjekt…");
    expect(html).not.toContain("Bekreft: arkiver");
    expect(html).not.toContain("Gjenopprett");
  });

  it("bekreftelsen sier hva som skjer, og at ingenting slettes", () => {
    const html = vis("aktiv", true);
    expect(html).toContain("Bekreft: arkiver");
    expect(html).toContain("Avbryt");
    expect(html).toMatch(/delelenker slutter å virke/);
    expect(html).toMatch(/Ingen data slettes/);
    expect(html).toContain('role="alert"');
  });

  it("arkivert prosjekt: viser status og gjenoppretting, ikke arkiver-knappen", () => {
    const html = vis("arkivert", true);
    expect(html).toContain("Prosjektet er arkivert.");
    expect(html).toContain("Gjenopprett prosjekt");
    expect(html).not.toContain("Arkiver prosjekt…");
    expect(html).not.toContain("Bekreft: arkiver");
  });
});
