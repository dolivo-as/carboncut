import type { StoredTrip } from "./storage";

export interface ServerPayload {
  token: string;
  formaal: "jobb";
  dato: string;
  type: "reise" | "hjemmekontor";
  tur_retur: boolean;
  etapper?: { transportmiddel: string; distanse_km: number }[];
  pendling_km?: number;
  nettside: string;
}

/**
 * Det eneste som sendes til serveren. Private turer gir null og forlater aldri nettleseren.
 * Ingen beskrivelse, ingen tall fra klienten (serveren regner selv), ingen id.
 */
export function toServerPayload(trip: StoredTrip, token: string, honningfelt = ""): ServerPayload | null {
  if (trip.purpose !== "work") return null;
  const base = { token, formaal: "jobb" as const, dato: trip.date, nettside: honningfelt };
  if (trip.kind === "home_office") {
    return { ...base, type: "hjemmekontor", pendling_km: trip.oneWayCommuteKm ?? NaN, tur_retur: trip.avoided === "return" };
  }
  return {
    ...base,
    type: "reise",
    tur_retur: Boolean(trip.returnTrip),
    etapper: (trip.segments ?? []).map((s) => ({ transportmiddel: s.mode, distanse_km: s.distanceKm })),
  };
}
