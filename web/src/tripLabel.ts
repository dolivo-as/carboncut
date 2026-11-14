import { MODE_LABELS } from "@calc/factors";
import { fmtDate, fmtKm } from "./format";
import type { StoredTrip } from "./storage";

const navn = (m: string) => {
  const n = MODE_LABELS[m as keyof typeof MODE_LABELS]?.nb ?? m;
  return n.charAt(0).toLowerCase() + n.slice(1);
};

/** Liste med «og» til slutt: «buss (by), elbil og gange». */
function liste(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} og ${xs[xs.length - 1]}`;
}

/** Tilgjengelig navn på «Slett» for én tur, slik at skjermlesere vet hvilken tur knappen gjelder (UX 14.11). */
export function deleteLabel(t: StoredTrip): string {
  const dato = fmtDate(t.date);
  if (t.kind === "home_office") {
    const km = (t.oneWayCommuteKm ?? 0) * (t.avoided === "return" ? 2 : 1);
    return `Slett hjemmekontor ${dato}, ${fmtKm(km)} km unngått`;
  }
  const segs = t.segments ?? [];
  const moduser = liste([...new Set(segs.map((s) => navn(s.mode)))]);
  const km = segs.reduce((s, x) => s + x.distanceKm, 0);
  return `Slett tur ${dato}, ${moduser}, ${fmtKm(km)} km${t.returnTrip ? " tur-retur" : ""}`;
}
