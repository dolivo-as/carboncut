/** WCAG 2.1 relativ luminans og kontrast, for sjekk av designtokens. */

export function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastPair = {
  id: string;
  theme: "light" | "dark";
  fg: string;
  bg: string;
  /** 4.5 for normal tekst, 3 for stor tekst / UI-komponent (1.4.11). */
  min: number;
};

/** Alle tekst- og kontrollpar som brukes i flyten, hentet fra ux/skisser-v2.html. */
export const TOKEN_PAIRS: ContrastPair[] = [
  { id: "light fg på bg", theme: "light", fg: "#0f172a", bg: "#f8fafc", min: 4.5 },
  { id: "light fg på kort", theme: "light", fg: "#0f172a", bg: "#ffffff", min: 4.5 },
  { id: "light muted på bg", theme: "light", fg: "#475569", bg: "#f8fafc", min: 4.5 },
  { id: "light muted på kort", theme: "light", fg: "#475569", bg: "#ffffff", min: 4.5 },
  { id: "light primærtekst på primær", theme: "light", fg: "#ffffff", bg: "#065f46", min: 4.5 },
  { id: "light primær-myk", theme: "light", fg: "#064e3b", bg: "#d1fae5", min: 4.5 },
  { id: "light banner", theme: "light", fg: "#451a03", bg: "#fbbf24", min: 4.5 },
  { id: "light advarsel", theme: "light", fg: "#78350f", bg: "#fef3c7", min: 4.5 },
  { id: "light feiltekst på feilbakgrunn", theme: "light", fg: "#7f1d1d", bg: "#fee2e2", min: 4.5 },
  { id: "light feil på kort", theme: "light", fg: "#b91c1c", bg: "#ffffff", min: 4.5 },
  { id: "light positiv på kort", theme: "light", fg: "#065f46", bg: "#ffffff", min: 4.5 },
  { id: "light feltkant på kort (UI)", theme: "light", fg: "#64748b", bg: "#ffffff", min: 3 },
  { id: "dark fg på bg", theme: "dark", fg: "#f1f5f9", bg: "#0b1220", min: 4.5 },
  { id: "dark fg på kort", theme: "dark", fg: "#f1f5f9", bg: "#121c2f", min: 4.5 },
  { id: "dark muted på bg", theme: "dark", fg: "#cbd5e1", bg: "#0b1220", min: 4.5 },
  { id: "dark muted på kort", theme: "dark", fg: "#cbd5e1", bg: "#121c2f", min: 4.5 },
  { id: "dark primærtekst på primær", theme: "dark", fg: "#022c22", bg: "#34d399", min: 4.5 },
  { id: "dark primær-myk", theme: "dark", fg: "#d1fae5", bg: "#0b4a39", min: 4.5 },
  { id: "dark advarsel", theme: "dark", fg: "#fde68a", bg: "#3b2a07", min: 4.5 },
  { id: "dark feiltekst på feilbakgrunn", theme: "dark", fg: "#fecaca", bg: "#4a1717", min: 4.5 },
  { id: "dark feil på kort", theme: "dark", fg: "#fca5a5", bg: "#121c2f", min: 4.5 },
  { id: "dark positiv på bg", theme: "dark", fg: "#6ee7b7", bg: "#0b1220", min: 4.5 },
  { id: "dark feltkant på kort (UI)", theme: "dark", fg: "#8294ad", bg: "#121c2f", min: 3 },
];
