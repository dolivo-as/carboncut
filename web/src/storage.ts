import type { TripResult } from "@calc/calc";
import type { TransportMode } from "@calc/factors";
import type { Purpose } from "./flowLogic";

/** Lagres kun i nettleserens localStorage. Ingen backend, ingen kall ut. */
export interface StoredTrip {
  id: string;
  date: string;
  description: string;
  kind: "trip" | "home_office";
  /** Jobb eller privat. Mangler på turer lagret før formål ble påkrevd. */
  purpose?: Purpose;
  /** Reise: etapper og tur-retur. */
  segments?: { mode: Exclude<TransportMode, "home_office">; distanceKm: number }[];
  returnTrip?: boolean;
  /** Hjemmekontor: pendleavstand én vei og om én vei eller tur-retur er unngått. */
  oneWayCommuteKm?: number;
  avoided?: "one_way" | "return";
  /** Resultatet slik det ble regnet da turen ble lagret (inkl. faktor-snapshot). Regnes ikke om. */
  result: TripResult;
  savedAt: string;
}

export type PurposeOrUnknown = Purpose | "unspecified";

const KEY = "carboncut.trips.v1";

export function loadTrips(): StoredTrip[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as StoredTrip[]).filter((t) => t && typeof t.id === "string" && t.result) : [];
  } catch {
    return [];
  }
}
export function saveTrips(trips: StoredTrip[]) {
  localStorage.setItem(KEY, JSON.stringify(trips));
}

export function purposeOf(t: StoredTrip): PurposeOrUnknown {
  return t.purpose === "work" || t.purpose === "private" ? t.purpose : "unspecified";
}

export function groupTrips(trips: StoredTrip[]): Record<PurposeOrUnknown, StoredTrip[]> {
  const out: Record<PurposeOrUnknown, StoredTrip[]> = { work: [], private: [], unspecified: [] };
  for (const t of trips) out[purposeOf(t)].push(t);
  return out;
}

export function markPurpose(trips: StoredTrip[], id: string, purpose: Purpose): StoredTrip[] {
  return trips.map((t) => (t.id === id ? { ...t, purpose } : t));
}

export function sumSavingsKg(trips: StoredTrip[]): number {
  return trips.reduce((s, t) => s + t.result.savingsKg, 0);
}
