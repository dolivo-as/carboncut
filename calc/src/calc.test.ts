import { describe, it, expect } from "vitest";
import { calculateTrip, calculateHomeOffice, CalcError } from "./calc.js";
import { FACTORS, REFERENCE_CAR, FACTOR_VERSION, TRANSPORT_MODES, type EmissionFactor, type Baseline } from "./factors.js";

// TESTVERDIER – fiktive, kun for å teste regnelogikken. Ikke ekte utslippsfaktorer.
const f = (mode: any, v: number, unit: EmissionFactor["unit"] = "kg_co2e_per_pkm", occ: number | null = null): EmissionFactor => ({
  mode, factorVersion: 0, value: v, unit, vehicleOccupancy: occ, occupancyBasis: null, source: "TESTDATA", edition: "T", sourceDate: "2026-01-01", retrievedDate: "2026-01-01",
  lifecycle: false, note: null, status: "dokumentert", csvId: null });
const T = [f("bicycle", 0), f("electric_train", 1), f("walking", 0), f("airplane", 10)];
const B: Baseline = { kgCo2ePerKm: 2, vehicleOccupancy: 1, occupancyBasis: null, source: "TESTDATA", edition: "T", sourceDate: null, retrievedDate: null, lifecycle: false, factorVersion: 0, status: "dokumentert", csvId: null };

describe("standardtur", () => {
  it("summerer segmenter (sykkel–tog–gange)", () => {
    const r = calculateTrip({ returnTrip: false, segments: [
      { mode: "bicycle", distanceKm: 3 }, { mode: "electric_train", distanceKm: 20 }, { mode: "walking", distanceKm: 1 }] }, T, B);
    expect(r.distanceKm).toBe(24); expect(r.emissionsKg).toBe(20); expect(r.baselineKg).toBe(48); expect(r.savingsKg).toBe(28);
  });
  it("tur/retur dobler distansen", () => {
    expect(calculateTrip({ returnTrip: true, segments: [{ mode: "electric_train", distanceKm: 5 }] }, T, B).distanceKm).toBe(10);
  });
  it("tillater negativ besparelse", () => {
    expect(calculateTrip({ returnTrip: false, segments: [{ mode: "airplane", distanceKm: 1 }] }, T, B).savingsKg).toBe(-8);
  });
  it("runder ikke av", () => {
    expect(calculateTrip({ returnTrip: false, segments: [{ mode: "electric_train", distanceKm: 1 / 3 }] }, T, B).emissionsKg).toBe(1 / 3);
  });
  it("lagrer faktorene som ble brukt", () => {
    const r = calculateTrip({ returnTrip: false, segments: [{ mode: "electric_train", distanceKm: 1 }] }, T, B);
    expect(r.snapshot.factors).toEqual({ electric_train: { kgCo2ePerPkm: 1, value: 1, unit: "kg_co2e_per_pkm", vehicleOccupancy: null, occupancyBasis: null,
      source: "TESTDATA", edition: "T", sourceDate: "2026-01-01", csvId: null, factorVersion: 0, lifecycle: false } });
    expect(r.snapshot.baselineKgPerKm).toBe(2); expect(r.snapshot.baselineSource).toBe("TESTDATA");
    expect(r.snapshot.baseline).toMatchObject({ kgCo2ePerVkm: 2, kgCo2ePerPkm: 2, unit: "kg_co2e_per_vkm", vehicleOccupancy: 1, factorVersion: 0 });
  });
  it("avviser ugyldige verdier", () => {
    for (const d of [0, -1, NaN, Infinity])
      expect(() => calculateTrip({ returnTrip: false, segments: [{ mode: "bicycle", distanceKm: d }] }, T, B)).toThrow(CalcError);
    expect(() => calculateTrip({ returnTrip: false, segments: [] }, T, B)).toThrow(CalcError);
    expect(() => calculateTrip({ returnTrip: false, segments: [{ mode: "bus" as any, distanceKm: 1 }] }, T, B)).toThrow(/Ukjent/);
  });
});

describe("hjemmekontor", () => {
  it("én vei og retur, null fysisk distanse", () => {
    const a = calculateHomeOffice({ oneWayCommuteKm: 10, avoided: "one_way" }, B);
    const b = calculateHomeOffice({ oneWayCommuteKm: 10, avoided: "return" }, B);
    expect(a.distanceKm).toBe(0); expect(a.avoidedKm).toBe(10); expect(a.savingsKg).toBe(20); expect(b.savingsKg).toBe(40);
  });
});

describe("per kjøretøy-km", () => {
  it("1 person: per vkm = per pkm", () => {
    const r = calculateTrip({ returnTrip: false, segments: [{ mode: "gasoline_car", distanceKm: 10 }] }, [f("gasoline_car", 0.2, "kg_co2e_per_vkm", 1)], B);
    expect(r.emissionsKg).toBe(2); expect(r.snapshot.factors.gasoline_car.kgCo2ePerPkm).toBe(0.2);
  });
  it("flere personer deler per-vkm-tallet", () => {
    const r = calculateTrip({ returnTrip: false, segments: [{ mode: "gasoline_car", distanceKm: 10 }] }, [f("gasoline_car", 0.2, "kg_co2e_per_vkm", 2)], B);
    expect(r.emissionsKg).toBe(1);
  });
  it("per vkm uten antall personer avvises", () => {
    expect(() => calculateTrip({ returnTrip: false, segments: [{ mode: "gasoline_car", distanceKm: 1 }] }, [f("gasoline_car", 0.2, "kg_co2e_per_vkm", null)], B)).toThrow(CalcError);
  });
});

describe("produksjonsfaktorer (faktorversjon 1, YTM v2)", () => {
  const byMode = (m: string) => FACTORS.find((x) => x.mode === m)!;
  const MISSING = ["hybrid_car", "other"];

  it("alle modus (unntatt hjemmekontor) har en rad med faktorversjon 1", () => {
    expect(FACTOR_VERSION).toBe(1);
    expect(FACTORS.map((x) => x.mode).sort()).toEqual(TRANSPORT_MODES.filter((m) => m !== "home_office").sort());
    expect(FACTORS.every((x) => x.factorVersion === 1)).toBe(true);
  });
  it("mangler_kilde-modusene har null-verdi og kaster CalcError", () => {
    for (const m of MISSING) {
      expect(byMode(m).status).toBe("mangler_kilde"); expect(byMode(m).value).toBeNull();
      expect(() => calculateTrip({ returnTrip: false, segments: [{ mode: m as any, distanceKm: 1 }] }, FACTORS, REFERENCE_CAR)).toThrow(CalcError);
      expect(() => calculateTrip({ returnTrip: false, segments: [{ mode: m as any, distanceKm: 1 }] }, FACTORS, REFERENCE_CAR)).toThrow(/mangler kilde/);
    }
  });
  it("dokumenterte rader har verdi, kilde, utgave, dato og lifecycle-flagg", () => {
    for (const x of FACTORS.filter((x) => !MISSING.includes(x.mode))) {
      expect(x.status).toBe("dokumentert");
      expect(typeof x.value).toBe("number"); expect(x.source).toBeTruthy(); expect(x.edition).toBeTruthy();
      expect(x.sourceDate).toBeTruthy(); expect(x.retrievedDate).toBeTruthy(); expect(typeof x.lifecycle).toBe("boolean");
    }
  });
  it("ferje er bare direkte utslipp; alle andre er livsløp", () => {
    expect(byMode("ferry").lifecycle).toBe(false); expect(byMode("ferry").note).toMatch(/bare direkte utslipp/);
    expect(FACTORS.filter((x) => x.status === "dokumentert" && x.mode !== "ferry").every((x) => x.lifecycle === true)).toBe(true);
  });
  it("biler er per kjøretøy-km med 1 person", () => {
    for (const m of ["electric_car", "gasoline_car", "diesel_car"]) {
      expect(byMode(m).unit).toBe("kg_co2e_per_vkm"); expect(byMode(m).vehicleOccupancy).toBe(1);
    }
  });
  it("referansebil: bensin 0,2569 kg CO2e/vkm (CSV: 0,25691), 1 person", () => {
    expect(REFERENCE_CAR.status).toBe("dokumentert"); expect(REFERENCE_CAR.vehicleOccupancy).toBe(1);
    expect(REFERENCE_CAR.kgCo2ePerKm).toBeCloseTo(0.2569, 4);
    expect(REFERENCE_CAR.kgCo2ePerKm).toBe(byMode("gasoline_car").value);
  });
  it("tur med referansebil: bensinbil 10 km gir ingen besparelse, tog gir besparelse", () => {
    const car = calculateTrip({ returnTrip: false, segments: [{ mode: "gasoline_car", distanceKm: 10 }] }, FACTORS, REFERENCE_CAR);
    expect(car.baselineKg).toBeCloseTo(2.569, 3); expect(car.savingsKg).toBeCloseTo(0, 10);
    const train = calculateTrip({ returnTrip: false, segments: [{ mode: "electric_train", distanceKm: 10 }] }, FACTORS, REFERENCE_CAR);
    expect(train.savingsKg).toBeCloseTo(10 * (0.25691 - 0.0048), 10);
  });
  it("hjemmekontor bruker referansebilen (0,2569/km)", () => {
    expect(calculateHomeOffice({ oneWayCommuteKm: 10, avoided: "one_way" }, REFERENCE_CAR).savingsKg).toBeCloseTo(2.569, 3);
  });
  it("buss er delt i city_bus (BU2) og regional_bus (BU4); «bus» finnes ikke lenger", () => {
    expect((TRANSPORT_MODES as readonly string[]).includes("bus")).toBe(false);
    expect(byMode("city_bus")).toMatchObject({ value: 0.1107, csvId: "BU2", occupancyBasis: "25,2 % (J70)", lifecycle: true, status: "dokumentert", sourceDate: "2026-02-11" });
    expect(byMode("regional_bus")).toMatchObject({ value: 0.04146, csvId: "BU4", occupancyBasis: "50 % (J71)", lifecycle: true, status: "dokumentert", sourceDate: "2026-02-11" });
    expect(byMode("city_bus").edition).toMatch(/VegLCA v6\.03/);
  });
  it("e_scooter S1 0,061 er beholdt", () => {
    expect(byMode("e_scooter")).toMatchObject({ value: 0.061, csvId: "S1", status: "dokumentert" });
  });
  it("snapshot lagrer factorVersion, edition, sourceDate, csvId, enhet og belegg for faktor og referansebil", () => {
    const r = calculateTrip({ returnTrip: false, segments: [{ mode: "city_bus", distanceKm: 10 }, { mode: "gasoline_car", distanceKm: 5 }] }, FACTORS, REFERENCE_CAR);
    expect(r.snapshot.factors.city_bus).toMatchObject({ kgCo2ePerPkm: 0.1107, value: 0.1107, unit: "kg_co2e_per_pkm", occupancyBasis: "25,2 % (J70)",
      factorVersion: 1, csvId: "BU2", sourceDate: "2026-02-11", lifecycle: true });
    expect(r.snapshot.factors.city_bus.edition).toMatch(/VegLCA v6\.03/);
    expect(r.snapshot.factors.city_bus.source).toMatch(/VegLCA/);
    expect(r.snapshot.factors.gasoline_car).toMatchObject({ unit: "kg_co2e_per_vkm", vehicleOccupancy: 1, factorVersion: 1, csvId: "G3" });
    expect(r.snapshot.baseline).toMatchObject({ kgCo2ePerVkm: 0.25691, kgCo2ePerPkm: 0.25691, unit: "kg_co2e_per_vkm", vehicleOccupancy: 1,
      occupancyBasis: "1 person pr bil (CTO)", factorVersion: 1, csvId: "R3", sourceDate: "2025 / 2026-02-11", lifecycle: true });
    expect(r.snapshot.baseline.edition).toBeTruthy();
    const h = calculateHomeOffice({ oneWayCommuteKm: 1, avoided: "one_way" }, REFERENCE_CAR);
    expect(h.snapshot.baseline.factorVersion).toBe(1); expect(h.snapshot.baseline.csvId).toBe("R3");
  });
});
