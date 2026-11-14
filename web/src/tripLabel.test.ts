import { describe, expect, it } from "vitest";
import { deleteLabel } from "./tripLabel";
import type { StoredTrip } from "./storage";

const base = {
  id: "fiktiv", date: "2026-11-14", description: "", savedAt: "2026-11-14T10:00:00Z", purpose: "work" as const,
  result: { distanceKm: 0, emissionsKg: 0, baselineKg: 0, savingsKg: 0, snapshot: {} as StoredTrip["result"]["snapshot"] },
};

describe("aria-label på «Slett»", () => {
  it("én strekning", () => {
    expect(deleteLabel({ ...base, kind: "trip", segments: [{ mode: "city_bus", distanceKm: 12.5 }] }))
      .toBe("Slett tur 14. nov. 2026, buss (by), 12,5 km");
  });
  it("flere strekninger og tur-retur", () => {
    expect(deleteLabel({ ...base, kind: "trip", returnTrip: true, segments: [{ mode: "city_bus", distanceKm: 12.5 }, { mode: "electric_train", distanceKm: 40 }, { mode: "city_bus", distanceKm: 2 }] }))
      .toBe("Slett tur 14. nov. 2026, buss (by) og elektrisk tog, 54,5 km tur-retur");
  });
  it("hjemmekontor", () => {
    expect(deleteLabel({ ...base, kind: "home_office", oneWayCommuteKm: 10, avoided: "one_way" })).toBe("Slett hjemmekontor 14. nov. 2026, 10 km unngått");
    expect(deleteLabel({ ...base, kind: "home_office", oneWayCommuteKm: 10, avoided: "return" })).toBe("Slett hjemmekontor 14. nov. 2026, 20 km unngått");
  });
  it("ulike turer får ulike navn", () => {
    const a = deleteLabel({ ...base, kind: "trip", segments: [{ mode: "walking", distanceKm: 1 }] });
    const b = deleteLabel({ ...base, date: "2026-11-13", kind: "trip", segments: [{ mode: "walking", distanceKm: 1 }] });
    expect(a).not.toBe(b);
  });
});
