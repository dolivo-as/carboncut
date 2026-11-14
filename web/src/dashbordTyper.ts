export interface Sum { registrerte_reiser: number; spart_kg: number; utslipp_kg: number }
export interface Celle extends Sum { noekkel: string }
export interface Blokk extends Sum { per_transportmiddel: Celle[]; annet: Sum | null }
export interface DashbordSvar {
  prosjekt: { id: string; navn: string; status: string };
  tilstrekkelig: boolean;
  min_gruppe?: number;
  totalt?: Sum;
  per_maaned?: (Blokk & { maaned: string })[];
  ovrige_maaneder?: Blokk | null;
  per_transportmiddel?: Celle[];
  annet_transportmiddel?: Sum | null;
  min_celle?: number;
}

/** «2026-11» → «november 2026». */
export function fmtMaaned(m: string): string {
  const x = /^(\d{4})-(\d{2})$/.exec(m);
  if (!x) return m;
  return new Date(Number(x[1]), Number(x[2]) - 1, 1).toLocaleDateString("nb-NO", { month: "long", year: "numeric" });
}

export const reiserTekst = (n: number) => `${n.toLocaleString("nb-NO")} ${n === 1 ? "registrert reise" : "registrerte reiser"}`;
