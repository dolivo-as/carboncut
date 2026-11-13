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
