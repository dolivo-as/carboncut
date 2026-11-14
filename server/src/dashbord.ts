/** Minste antall registrerte reiser i en celle (transportmiddel × måned) før den vises for seg (v0.2). */
export const MIN_CELLE = 5;

export interface Sum { registrerte_reiser: number; spart_kg: number; utslipp_kg: number }
export interface Celle extends Sum { noekkel: string }
export interface Undertrykt { synlige: Celle[]; annet: Sum | null }

const tom = (): Sum => ({ registrerte_reiser: 0, spart_kg: 0, utslipp_kg: 0 });
function legg(a: Sum, b: Sum): Sum {
  return { registrerte_reiser: a.registrerte_reiser + b.registrerte_reiser, spart_kg: a.spart_kg + b.spart_kg, utslipp_kg: a.utslipp_kg + b.utslipp_kg };
}
const rund = (x: number) => Math.round(x * 1000) / 1000;
function rundSum<T extends Sum>(s: T): T {
  return { ...s, spart_kg: rund(s.spart_kg), utslipp_kg: rund(s.utslipp_kg) };
}

/**
 * Celler under k slås sammen til «annet». Hvis «annet» da får 1–(k-1) reiser, flyttes også den minste
 * synlige cellen dit (sekundær undertrykking), slik at ingen liten celle kan regnes ut ved å trekke fra.
 * Hvis alt havner i «annet» og summen fortsatt er under k, vises ingenting (annet = null, synlige = []).
 */
export function undertrykk(celler: Celle[], k = MIN_CELLE): Undertrykt {
  const sortert = [...celler].filter((c) => c.registrerte_reiser > 0).sort((a, b) => a.registrerte_reiser - b.registrerte_reiser || a.noekkel.localeCompare(b.noekkel));
  let annet = tom();
  const synlige: Celle[] = [];
  for (const c of sortert) {
    if (c.registrerte_reiser < k) annet = legg(annet, c);
    else synlige.push(c);
  }
  while (annet.registrerte_reiser > 0 && annet.registrerte_reiser < k && synlige.length) {
    annet = legg(annet, synlige.shift()!);
  }
  if (annet.registrerte_reiser > 0 && annet.registrerte_reiser < k) return { synlige: [], annet: null };
  synlige.sort((a, b) => b.registrerte_reiser - a.registrerte_reiser || a.noekkel.localeCompare(b.noekkel));
  return { synlige: synlige.map(rundSum), annet: annet.registrerte_reiser ? rundSum(annet) : null };
}

export interface Rad { maaned: string; transportmiddel: string; antall: number; spart: number; utslipp: number }

export interface Maaned extends Sum { maaned: string; per_transportmiddel: Celle[]; annet: Sum | null }
export interface Aggregat {
  tilstrekkelig: true;
  totalt: Sum;
  per_maaned: Maaned[];
  /** Måneder med under 5 reiser, slått sammen. null hvis ingen. */
  ovrige_maaneder: (Sum & { per_transportmiddel: Celle[]; annet: Sum | null }) | null;
  /** Summert fra de publiserte cellene, så det ikke gir mer informasjon enn tabellen over. */
  per_transportmiddel: Celle[];
  annet_transportmiddel: Sum | null;
  min_celle: number;
}
export type Dashbord = Aggregat | { tilstrekkelig: false; min_gruppe: number };

/** Bygger dashbordet fra rader (måned × transportmiddel). Ingen rådata eller dag-oppløsning går ut. */
export function byggDashbord(rader: Rad[], minGruppe: number, k = MIN_CELLE): Dashbord {
  const celle = (r: Rad): Celle => ({ noekkel: r.transportmiddel, registrerte_reiser: r.antall, spart_kg: r.spart, utslipp_kg: r.utslipp });
  const total = rader.reduce((s, r) => legg(s, celle(r)), tom());
  if (total.registrerte_reiser < Math.max(minGruppe, 10)) return { tilstrekkelig: false, min_gruppe: Math.max(minGruppe, 10) };

  const perMnd = new Map<string, Rad[]>();
  for (const r of rader) perMnd.set(r.maaned, [...(perMnd.get(r.maaned) ?? []), r]);
  const mndCeller: Celle[] = [...perMnd].map(([m, rs]) => ({ noekkel: m, ...rs.reduce((s, r) => legg(s, celle(r)), tom()) }));
  const mnd = undertrykk(mndCeller, k);

  const per_maaned: Maaned[] = mnd.synlige
    .map((m) => {
      const u = undertrykk(perMnd.get(m.noekkel)!.map(celle), k);
      return { maaned: m.noekkel, registrerte_reiser: m.registrerte_reiser, spart_kg: m.spart_kg, utslipp_kg: m.utslipp_kg, per_transportmiddel: u.synlige, annet: u.annet };
    })
    .sort((a, b) => a.maaned.localeCompare(b.maaned));

  let ovrige_maaneder: Aggregat["ovrige_maaneder"] = null;
  if (mnd.annet) {
    const synligeMnd = new Set(per_maaned.map((m) => m.maaned));
    const samlet = new Map<string, Celle>();
    for (const r of rader) {
      if (synligeMnd.has(r.maaned)) continue;
      const c = samlet.get(r.transportmiddel) ?? { noekkel: r.transportmiddel, ...tom() };
      samlet.set(r.transportmiddel, { noekkel: r.transportmiddel, ...legg(c, celle(r)) });
    }
    const u = undertrykk([...samlet.values()], k);
    ovrige_maaneder = { ...mnd.annet, per_transportmiddel: u.synlige, annet: u.annet };
  }

  // Fordeling per transportmiddel = sum av publiserte celler. Resten er «annet».
  const blokker = [...per_maaned, ...(ovrige_maaneder ? [ovrige_maaneder] : [])];
  const tm = new Map<string, Celle>();
  let annet = tom();
  for (const b of blokker) {
    for (const c of b.per_transportmiddel) tm.set(c.noekkel, { noekkel: c.noekkel, ...legg(tm.get(c.noekkel) ?? tom(), c) });
    if (b.annet) annet = legg(annet, b.annet);
  }
  const per_transportmiddel = [...tm.values()].map(rundSum).sort((a, b) => b.registrerte_reiser - a.registrerte_reiser);
  return {
    tilstrekkelig: true,
    totalt: rundSum(total),
    per_maaned,
    ovrige_maaneder,
    per_transportmiddel,
    annet_transportmiddel: annet.registrerte_reiser ? rundSum(annet) : null,
    min_celle: k,
  };
}
