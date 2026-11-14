import { base64url, hmacHex } from "./krypto";

export const GRENSE_IP_PER_TIME = 10;
export const GRENSE_LENKE_PER_DOGN = 500;

const dagUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Tilfeldig HMAC-nøkkel for dagens døgn (UTC). Lagres bare i D1 og slettes neste døgn. */
export async function dognsalt(db: D1Database, naa: number): Promise<string> {
  const dag = dagUtc(naa);
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  await db.prepare("INSERT OR IGNORE INTO dognsalt (dag, salt) VALUES (?, ?)").bind(dag, base64url(b)).run();
  const rad = await db.prepare("SELECT salt FROM dognsalt WHERE dag = ?").bind(dag).first<{ salt: string }>();
  return rad!.salt;
}

/** IP blir aldri lagret. Bare HMAC(IP, døgnsalt) brukes som nøkkel i telleren. */
export async function ipNokkel(db: D1Database, ip: string | null, naa: number): Promise<string> {
  return "ip:" + (await hmacHex(await dognsalt(db, naa), ipGrunnlag(ip)));
}

/** Teller ett forsøk for IP-en (eller IPv6-/64-en). false = grensen er nådd. Brukes av alle offentlige POST-ruter. */
export async function tellIp(db: D1Database, ip: string | null, naa: number): Promise<boolean> {
  return tell(db, await ipNokkel(db, ip, naa), 3600, GRENSE_IP_PER_TIME, naa);
}

/** Øker telleren i et fast vindu og svarer om grensen er passert. */
export async function tell(db: D1Database, noekkel: string, vinduSek: number, grense: number, naa: number): Promise<boolean> {
  const vindu = Math.floor(naa / 1000 / vinduSek) * vinduSek;
  const r = await db
    .prepare(
      "INSERT INTO misbruk_teller (noekkel, vindu, antall) VALUES (?, ?, 1) " +
        "ON CONFLICT (noekkel, vindu) DO UPDATE SET antall = antall + 1 RETURNING antall",
    )
    .bind(noekkel, vindu)
    .first<{ antall: number }>();
  return (r?.antall ?? 0) <= grense;
}

/** Sekunder til et fast vindu (samme inndeling som i tell) nullstilles. Brukes i Retry-After. */
export function sekTilNyttVindu(vinduSek: number, naa: number): number {
  return vinduSek - (Math.floor(naa / 1000) % vinduSek);
}

/** Sletter tellere eldre enn 24 t og døgnsalt fra tidligere døgn. */
export async function rydd(db: D1Database, naa: number): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM misbruk_teller WHERE vindu < ?").bind(Math.floor(naa / 1000) - 86_400),
    db.prepare("DELETE FROM dognsalt WHERE dag < ?").bind(dagUtc(naa)),
  ]);
}

/**
 * Grunnlaget for IP-telleren. IPv4: hele adressen. IPv6: bare /64-prefikset (normalisert),
 * fordi én kunde ofte får et helt /64 og ellers kunne bytte adresse fritt.
 * IPv4-tilordnet IPv6 (::ffff:a.b.c.d) behandles som IPv4. Ugyldig eller manglende IP gir «ukjent».
 */
export function ipGrunnlag(ip: string | null | undefined): string {
  if (!ip) return "ukjent";
  let s = ip.trim().toLowerCase();
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  s = s.replace(/%.*$/, ""); // sone-id
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m4 = v4.exec(s);
  if (m4) return m4.slice(1).every((x) => Number(x) <= 255) ? "v4:" + m4.slice(1).map(Number).join(".") : "ukjent";
  if (!s.includes(":")) return "ukjent";
  // Siste del kan være IPv4 (f.eks. ::ffff:192.0.2.1)
  let deler: string[];
  const sisteKolon = s.lastIndexOf(":");
  const hale = s.slice(sisteKolon + 1);
  if (hale.includes(".")) {
    const mm = v4.exec(hale);
    if (!mm || !mm.slice(1).every((x) => Number(x) <= 255)) return "ukjent";
    const [a, b, c, d] = mm.slice(1).map(Number);
    s = s.slice(0, sisteKolon + 1) + ((a << 8) | b).toString(16) + ":" + ((c << 8) | d).toString(16);
  }
  const dobbel = s.split("::");
  if (dobbel.length > 2) return "ukjent";
  const venstre = dobbel[0] ? dobbel[0].split(":") : [];
  const hoyre = dobbel.length === 2 && dobbel[1] ? dobbel[1].split(":") : [];
  if (dobbel.length === 2) {
    const mangler = 8 - venstre.length - hoyre.length;
    if (mangler < 1) return "ukjent";
    deler = [...venstre, ...Array(mangler).fill("0"), ...hoyre];
  } else deler = venstre;
  if (deler.length !== 8 || !deler.every((h) => /^[0-9a-f]{1,4}$/.test(h))) return "ukjent";
  const tall = deler.map((h) => parseInt(h, 16));
  // ::ffff:0:0/96 = IPv4-tilordnet
  if (tall.slice(0, 5).every((x) => x === 0) && tall[5] === 0xffff) {
    return `v4:${tall[6] >> 8}.${tall[6] & 255}.${tall[7] >> 8}.${tall[7] & 255}`;
  }
  return "v6:" + tall.slice(0, 4).map((x) => x.toString(16).padStart(4, "0")).join(":") + "::/64";
}
