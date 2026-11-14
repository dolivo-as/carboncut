import { FACTORS, TRANSPORT_MODES } from "../../calc/src/factors";
import type { Segment } from "../../calc/src/calc";

export const MIN_KM = 0.1;
export const MAKS_KM = 2000;
export const MAKS_DAGER_TILBAKE = 31;
const MAKS_ETAPPER = 10;

export type GyldigReise =
  | { type: "reise"; dato: string; etapper: Segment[]; turRetur: boolean }
  | { type: "hjemmekontor"; dato: string; pendlingKm: number; turRetur: boolean };

type Resultat = { ok: true; verdi: GyldigReise } | { ok: false; feil: string };

/** Transportmidler som har dokumentert faktor (samme regel som i nettsiden). */
export function gyldigTransportmiddel(m: unknown): m is Segment["mode"] {
  if (typeof m !== "string" || m === "home_office" || !(TRANSPORT_MODES as readonly string[]).includes(m)) return false;
  return FACTORS.find((f) => f.mode === m)?.status === "dokumentert";
}

const gyldigKm = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= MIN_KM && x <= MAKS_KM;

function dagTall(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (new Date(t).toISOString().slice(0, 10) !== iso) return null; // f.eks. 2026-02-30
  return t / 86_400_000;
}

function osloDato(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
}

/** Dato: ikke fram i tid, ikke eldre enn 31 dager. Godtar både UTC- og Oslo-dato som «i dag». */
export function sjekkDato(dato: unknown, naa: number): string | null {
  if (typeof dato !== "string") return "Ugyldig dato.";
  const d = dagTall(dato);
  if (d == null) return "Ugyldig dato.";
  const iDagUtc = dagTall(new Date(naa).toISOString().slice(0, 10))!;
  const iDagOslo = dagTall(osloDato(naa))!;
  if (d > Math.max(iDagUtc, iDagOslo)) return "Datoen kan ikke være fram i tid.";
  if (d < Math.min(iDagUtc, iDagOslo) - MAKS_DAGER_TILBAKE) return `Datoen kan ikke være mer enn ${MAKS_DAGER_TILBAKE} dager tilbake.`;
  return null;
}

/** Rimelighetssjekk etter v0.2. Kaster ikke; svarer med norsk feiltekst. Formål sjekkes før dette. */
export function validerReise(b: Record<string, unknown>, naa: number): Resultat {
  const datoFeil = sjekkDato(b.dato, naa);
  if (datoFeil) return { ok: false, feil: datoFeil };
  const dato = b.dato as string;
  if (typeof b.tur_retur !== "boolean") return { ok: false, feil: "Mangler tur_retur." };

  if (b.type === "hjemmekontor") {
    if (!gyldigKm(b.pendling_km)) return { ok: false, feil: `Pendleavstand må være ${MIN_KM}–${MAKS_KM} km.` };
    return { ok: true, verdi: { type: "hjemmekontor", dato, pendlingKm: b.pendling_km, turRetur: b.tur_retur } };
  }
  if (b.type !== "reise") return { ok: false, feil: "Ukjent type." };
  if (!Array.isArray(b.etapper) || b.etapper.length < 1 || b.etapper.length > MAKS_ETAPPER) {
    return { ok: false, feil: `Turen må ha 1–${MAKS_ETAPPER} strekninger.` };
  }
  const etapper: Segment[] = [];
  for (const e of b.etapper as unknown[]) {
    if (!e || typeof e !== "object") return { ok: false, feil: "Ugyldig strekning." };
    const { transportmiddel, distanse_km } = e as Record<string, unknown>;
    if (!gyldigTransportmiddel(transportmiddel)) return { ok: false, feil: "Ugyldig transportmiddel." };
    if (!gyldigKm(distanse_km)) return { ok: false, feil: `Distanse må være ${MIN_KM}–${MAKS_KM} km.` };
    etapper.push({ mode: transportmiddel, distanceKm: distanse_km });
  }
  const sum = etapper.reduce((s, e) => s + e.distanceKm, 0);
  if (sum > MAKS_KM) return { ok: false, feil: `Samlet distanse kan ikke være over ${MAKS_KM} km.` };
  return { ok: true, verdi: { type: "reise", dato, etapper, turRetur: b.tur_retur } };
}
