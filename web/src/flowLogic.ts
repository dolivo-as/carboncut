import { FACTORS, TRANSPORT_MODES, type TransportMode } from "@calc/factors";
import { parseNum } from "./format";

export type Purpose = "work" | "private";
export type Kind = "trip" | "home_office";
export type Mode = Exclude<TransportMode, "home_office">;

export const PURPOSE_LABELS: Record<Purpose | "unspecified", string> = {
  work: "Jobb",
  private: "Privat",
  unspecified: "Ikke oppgitt",
};

export const STEP_LABELS = ["Formål", "Reisemåte", "Avstand", "Resultat"] as const;

export function documentedMode(mode: Mode): boolean {
  const f = FACTORS.find((x) => x.mode === mode);
  return f?.status === "dokumentert";
}

export function tripModes(): Mode[] {
  return TRANSPORT_MODES.filter((m): m is Mode => m !== "home_office");
}

export function homeOfficeAllowed(purpose: Purpose | null): boolean {
  return purpose === "work";
}

export function validateDistance(raw: string): string | null {
  const n = parseNum(raw);
  if (!(n > 0) || !Number.isFinite(n)) return "Fyll inn en distanse større enn 0 km.";
  return null;
}

export function validateSegments(rows: { mode: Mode; km: string }[]): string | null {
  if (!rows.length) return "Turen må ha minst én strekning.";
  for (const r of rows) {
    if (!documentedMode(r.mode)) return "Velg en reisemåte som har kilde.";
    const err = validateDistance(r.km);
    if (err) return err;
  }
  return null;
}

export function canLeavePurpose(purpose: Purpose | null): boolean {
  return purpose === "work" || purpose === "private";
}

export function canLeaveMode(kind: Kind, mode: Mode | null, purpose: Purpose | null): boolean {
  if (kind === "home_office") return homeOfficeAllowed(purpose);
  return mode != null && documentedMode(mode);
}

export const KM_HURTIGVALG = [2, 5, 10, 20, 50] as const;

export const UTLØP_MAANEDER = [3, 6, 12] as const;
export type UtloperMaaneder = (typeof UTLØP_MAANEDER)[number];
export const UTLØP_FORVALGT: UtloperMaaneder = 12;

export function gyldigUtloperMaaneder(v: unknown): v is UtloperMaaneder {
  return v === 3 || v === 6 || v === 12;
}

/** De seks vanligste reisemåtene i lenkeflyten (designforslag v3, B1). */
export const VANLIGE_MODUSER: Mode[] = [
  "walking", "bicycle", "city_bus", "electric_train", "electric_car", "gasoline_car",
];

export function ovrigeModuser(): Mode[] {
  const vanlige = new Set<string>(VANLIGE_MODUSER);
  return tripModes().filter((m) => !vanlige.has(m));
}

export const LINK_STEP_LABELS = ["Reisemåte", "Avstand", "Takk"] as const;
