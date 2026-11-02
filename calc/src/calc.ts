import type { EmissionFactor, TransportMode, Baseline } from "./factors.js";

export class CalcError extends Error {}

export interface Segment { mode: Exclude<TransportMode,"home_office">; distanceKm: number; }
export interface TripInput { segments: Segment[]; returnTrip: boolean; }
export interface HomeOfficeInput { oneWayCommuteKm: number; avoided: "one_way" | "return"; }

/** Faktorene som faktisk ble brukt – lagres på turen så historikk ikke endres. */
export interface FactorSnapshotEntry {
  /** Effektiv verdi brukt i regnestykket (kg CO2e per pkm). */
  kgCo2ePerPkm: number;
  /** Verdi og enhet slik de står i faktorlisten (bil: per kjøretøy-km). */
  value: number; unit: EmissionFactor["unit"];
  /** Antall personer (bil) og belegg slik kilden oppgir det. */
  vehicleOccupancy: number | null; occupancyBasis: string | null;
  source: string; edition: string | null; sourceDate: string | null; csvId: string | null;
  factorVersion: number; lifecycle: boolean | null;
}
export interface BaselineSnapshot {
  kgCo2ePerVkm: number; kgCo2ePerPkm: number; unit: "kg_co2e_per_vkm";
  vehicleOccupancy: number | null; occupancyBasis: string | null;
  source: string; edition: string | null; sourceDate: string | null; csvId: string | null;
  factorVersion: number; lifecycle: boolean | null;
}
export interface FactorSnapshot { factors: Record<string, FactorSnapshotEntry>; baselineKgPerKm: number; baselineSource: string; baseline: BaselineSnapshot; }
export interface TripResult { distanceKm: number; emissionsKg: number; baselineKg: number; savingsKg: number; snapshot: FactorSnapshot; }

function requireDistance(d: number) {
  if (!Number.isFinite(d) || d <= 0) throw new CalcError(`Ugyldig distanse: ${d}`);
}
/** Per kjøretøy-km → per pkm: verdi / antall personer. Bil har 1 person (CTO), så tallet er uendret. */
function perPerson(value: number, unit: EmissionFactor["unit"], occupancy: number | null, what: string) {
  if (unit === "kg_co2e_per_pkm") return value;
  if (occupancy == null || !Number.isFinite(occupancy) || occupancy <= 0) throw new CalcError(`Faktor for ${what} mangler antall personer`);
  return value / occupancy;
}
function lookup(factors: EmissionFactor[], mode: string) {
  const f = factors.find((x) => x.mode === mode);
  if (!f) throw new CalcError(`Ukjent transportform: ${mode}`);
  if (f.status !== "dokumentert" || f.value == null || !f.source)
    throw new CalcError(`Faktor for ${mode} mangler kilde`);
  return { kgCo2ePerPkm: perPerson(f.value, f.unit, f.vehicleOccupancy, mode), source: f.source, f };
}
function baselineOf(b: Baseline) {
  if (b.status !== "dokumentert" || b.kgCo2ePerKm == null || !b.source) throw new CalcError("Referansebil mangler kilde");
  const v = perPerson(b.kgCo2ePerKm, "kg_co2e_per_vkm", b.vehicleOccupancy, "referansebil");
  const snap: BaselineSnapshot = { kgCo2ePerVkm: b.kgCo2ePerKm, kgCo2ePerPkm: v, unit: "kg_co2e_per_vkm", vehicleOccupancy: b.vehicleOccupancy,
    occupancyBasis: b.occupancyBasis, source: b.source, edition: b.edition, sourceDate: b.sourceDate, csvId: b.csvId,
    factorVersion: b.factorVersion, lifecycle: b.lifecycle };
  return { v, s: b.source, snap };
}

/** Standardtur: sum(segment × faktor), referanse = total distanse × referansebil. Negativ besparelse tillates. Ingen avrunding. */
export function calculateTrip(input: TripInput, factors: EmissionFactor[], baseline: Baseline): TripResult {
  if (!input.segments.length) throw new CalcError("Turen må ha minst én etappe");
  const mult = input.returnTrip ? 2 : 1;
  const b = baselineOf(baseline);
  const snap: FactorSnapshot = { factors: {}, baselineKgPerKm: b.v, baselineSource: b.s, baseline: b.snap };
  let dist = 0, em = 0;
  for (const s of input.segments) {
    requireDistance(s.distanceKm);
    const f = lookup(factors, s.mode);
    const x = f.f;
    snap.factors[s.mode] = { kgCo2ePerPkm: f.kgCo2ePerPkm, value: x.value as number, unit: x.unit, vehicleOccupancy: x.vehicleOccupancy,
      occupancyBasis: x.occupancyBasis, source: f.source, edition: x.edition, sourceDate: x.sourceDate, csvId: x.csvId,
      factorVersion: x.factorVersion, lifecycle: x.lifecycle };
    dist += s.distanceKm * mult;
    em += s.distanceKm * mult * f.kgCo2ePerPkm;
  }
  const base = dist * b.v;
  return { distanceKm: dist, emissionsKg: em, baselineKg: base, savingsKg: base - em, snapshot: snap };
}

/** Hjemmekontor: unngått pendling, ingen fysisk distanse.
 *  Spesifikasjonen sier kun «avoided commute»; vi bruker referansebil som unngått utslipp og 0 fysisk distanse. */
export function calculateHomeOffice(input: HomeOfficeInput, baseline: Baseline): TripResult & { avoidedKm: number } {
  requireDistance(input.oneWayCommuteKm);
  const b = baselineOf(baseline);
  const avoidedKm = input.oneWayCommuteKm * (input.avoided === "return" ? 2 : 1);
  const base = avoidedKm * b.v;
  return { distanceKm: 0, avoidedKm, emissionsKg: 0, baselineKg: base, savingsKg: base,
    snapshot: { factors: {}, baselineKgPerKm: b.v, baselineSource: b.s, baseline: b.snap } };
}
