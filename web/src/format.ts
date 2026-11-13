/** Resultat og oversikt: én desimal, så tallet ikke ser mer presist ut enn estimatet er. */
export function fmtKg(n: number): string {
  const s = Math.abs(n).toLocaleString("nb-NO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (n < 0 && s !== "0,0" ? "−" : "") + s;
}
/** Bare under «Slik er tallet regnet ut»: tre desimaler. */
export function fmtKgPrecise(n: number): string {
  const s = Math.abs(n).toLocaleString("nb-NO", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return (n < 0 ? "−" : "") + s;
}
export function fmtKm(n: number): string {
  return n.toLocaleString("nb-NO", { maximumFractionDigits: 3 });
}
export function fmtFactor(n: number): string {
  return n.toLocaleString("nb-NO", { maximumFractionDigits: 6 });
}
export function parseNum(s: string): number {
  const t = s.trim().replace(",", ".");
  return t === "" ? NaN : Number(t);
}
/** ISO-dato (YYYY-MM-DD) som «13. nov. 2026» med Intl nb-NO. */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

/** Enheter med kort forklaring, til metode og «Slik er tallet regnet ut». */
export const UNIT_LABELS = {
  kg_co2e_per_pkm: "kg CO₂e for én person som reiser 1 km",
  kg_co2e_per_vkm: "kg CO₂e per kilometer bilen kjører",
} as const;

/** Gjør fagspråk i kildetekst om til vanlig norsk i visningen. Kildedata endres ikke. */
export function plainFactorText(s: string): string {
  return s
    .replace(/kjøretøy-km/gi, "kilometer bilen kjører")
    .replace(/CO[2₂]e\/pkm/gi, "CO₂e for én person som reiser 1 km")
    .replace(/\(Ruters pkm\)/gi, "(Ruters tall per person og kilometer)")
    .replace(/per pkm/gi, "per person og kilometer")
    .replace(/\bpkm\b/gi, "person og kilometer");
}

