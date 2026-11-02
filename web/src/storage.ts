import type { TripResult } from "@calc/calc";
import type { TransportMode } from "@calc/factors";

/** Lagres kun i nettleserens localStorage. Ingen backend, ingen kall ut. */
export interface StoredTrip {
  id: string;
  date: string;
  description: string;
  kind: "trip" | "home_office";
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
