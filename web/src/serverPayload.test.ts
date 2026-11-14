import { describe, expect, it } from "vitest";
import { toServerPayload } from "./serverPayload";
import type { StoredTrip } from "./storage";

const TOKEN = "A".repeat(43);
const base = {
  id: "fiktiv-1", date: "2026-11-13", description: "Fiktiv beskrivelse", savedAt: "2026-11-13T10:00:00Z",
  result: { distanceKm: 25, emissionsKg: 1, baselineKg: 6, savingsKg: 5, snapshot: {} as StoredTrip["result"]["snapshot"] },
};
const reise: StoredTrip = { ...base, kind: "trip", purpose: "work", returnTrip: true, segments: [{ mode: "city_bus", distanceKm: 12.5 }] };

describe("toServerPayload", () => {
  it("private turer sendes aldri", () => {
    expect(toServerPayload({ ...reise, purpose: "private" }, TOKEN)).toBeNull();
    expect(toServerPayload({ ...reise, purpose: undefined }, TOKEN)).toBeNull();
  });
  it("jobbtur gir bare de feltene serveren trenger", () => {
    const p = toServerPayload(reise, TOKEN)!;
    expect(p).toEqual({ token: TOKEN, formaal: "jobb", dato: "2026-11-13", nettside: "", type: "reise", tur_retur: true, etapper: [{ transportmiddel: "city_bus", distanse_km: 12.5 }] });
    const tekst = JSON.stringify(p);
    expect(tekst).not.toContain("Fiktiv beskrivelse");
    expect(tekst).not.toContain("fiktiv-1");
    expect(tekst).not.toMatch(/savings|emissions|baseline|utslipp|referanse|besparelse/);
  });
  it("hjemmekontor", () => {
    const p = toServerPayload({ ...base, kind: "home_office", purpose: "work", oneWayCommuteKm: 20, avoided: "one_way" }, TOKEN, "x")!;
    expect(p).toEqual({ token: TOKEN, formaal: "jobb", dato: "2026-11-13", nettside: "x", type: "hjemmekontor", pendling_km: 20, tur_retur: false });
  });
});
