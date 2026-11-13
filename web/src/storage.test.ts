import { describe, it, expect, beforeEach } from "vitest";
import { groupTrips, markPurpose, purposeOf, restoreTrip, sumSavingsKg, type StoredTrip } from "./storage";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });
});

function trip(id: string, purpose?: StoredTrip["purpose"], savings = 1): StoredTrip {
  return {
    id, date: "2026-11-13", description: "", kind: "trip", purpose,
    result: { distanceKm: 1, emissionsKg: 0, baselineKg: savings, savingsKg: savings, snapshot: { factors: {}, baselineKgPerKm: 0, baselineSource: "TESTDATA", baseline: {} as never } },
    savedAt: "2026-11-13T00:00:00.000Z",
  };
}

describe("formål på lagrede turer", () => {
  it("behandler turer uten formål som «ikke oppgitt»", () => {
    expect(purposeOf(trip("a"))).toBe("unspecified");
    expect(purposeOf(trip("b", "work"))).toBe("work");
  });

  it("grupperer jobb, privat og umerkede hver for seg", () => {
    const g = groupTrips([trip("1", "work"), trip("2", "private"), trip("3"), trip("4", "work")]);
    expect(g.work.map((t) => t.id)).toEqual(["1", "4"]);
    expect(g.private.map((t) => t.id)).toEqual(["2"]);
    expect(g.unspecified.map((t) => t.id)).toEqual(["3"]);
  });

  it("kan merke en gammel tur i etterkant", () => {
    const next = markPurpose([trip("1"), trip("2", "private")], "1", "work");
    expect(purposeOf(next[0])).toBe("work");
    expect(purposeOf(next[1])).toBe("private");
  });

  it("summerer besparelse per gruppe", () => {
    expect(sumSavingsKg([trip("1", "work", 2.5), trip("2", "work", -0.5)])).toBe(2);
  });
});

describe("angre sletting", () => {
  it("setter turen tilbake på samme plass", () => {
    const a = trip("a", "work");
    const b = trip("b", "work");
    const c = trip("c", "private");
    const after = [a, c];
    expect(restoreTrip(after, b, 1).map((t) => t.id)).toEqual(["a", "b", "c"]);
  });
  it("dupliserer ikke en tur som allerede ligger i lista", () => {
    const a = trip("a", "work");
    expect(restoreTrip([a], a, 0)).toEqual([a]);
  });
});
