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
export async function ipNokkel(db: D1Database, ip: string, naa: number): Promise<string> {
  return "ip:" + (await hmacHex(await dognsalt(db, naa), ip));
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

/** Sletter tellere eldre enn 24 t og døgnsalt fra tidligere døgn. */
export async function rydd(db: D1Database, naa: number): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM misbruk_teller WHERE vindu < ?").bind(Math.floor(naa / 1000) - 86_400),
    db.prepare("DELETE FROM dognsalt WHERE dag < ?").bind(dagUtc(naa)),
  ]);
}
