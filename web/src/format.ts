export function fmtKg(n: number): string {
  const s = Math.abs(n).toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
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
/** ISO-dato (YYYY-MM-DD) som 13.11.2026. */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
