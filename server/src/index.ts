import { calculateHomeOffice, calculateTrip, CalcError } from "../../calc/src/calc";
import { FACTOR_VERSION, FACTORS, REFERENCE_CAR } from "../../calc/src/factors";
import { devAuth } from "./auth";
import { corsHoder } from "./cors";
import { byggDashbord, type Rad } from "./dashbord";
import type { Env } from "./env";
import { feil, json, lenkeUgyldig, lesJson } from "./http";
import { nyttToken, sha256Hex, TOKEN_RE } from "./krypto";
import { GRENSE_IP_PER_TIME, GRENSE_LENKE_PER_DOGN, ipNokkel, rydd, tell } from "./misbruk";
import { validerReise } from "./validering";

export type { Env };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const iso = (ms: number) => new Date(ms).toISOString();
function plussMaaneder(ms: number, n: number): string {
  const d = new Date(ms);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString();
}
const LENKE_GYLDIG_MND = 12;

interface LenkeRad { id: string; prosjekt_id: string; utloper: string; trukket_tilbake: string | null; status: string; navn: string }

/** Slår opp lenke på hash. null for ukjent, utløpt, trukket tilbake eller arkivert prosjekt – kalleren svarer likt (404). */
async function finnGyldigLenke(env: Env, token: unknown, naa: number): Promise<LenkeRad | null> {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return null;
  const rad = await env.DB.prepare(
    "SELECT l.id, l.prosjekt_id, l.utloper, l.trukket_tilbake, p.status, p.navn FROM lenke l JOIN prosjekt p ON p.id = l.prosjekt_id WHERE l.token_hash = ?",
  ).bind(await sha256Hex(token)).first<LenkeRad>();
  if (!rad || rad.trukket_tilbake != null || rad.utloper <= iso(naa) || rad.status !== "aktiv") return null;
  return rad;
}

// ---------- Offentlig ----------

async function lenkeInfo(req: Request, env: Env, naa: number): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = (await lesJson(req)) as Record<string, unknown>; } catch { return lenkeUgyldig(); }
  const l = await finnGyldigLenke(env, body?.token, naa);
  if (!l) return lenkeUgyldig();
  return json({ prosjekt: { navn: l.navn } });
}

async function registrer(req: Request, env: Env, naa: number): Promise<Response> {
  const ip = req.headers.get("cf-connecting-ip") ?? "ukjent";
  if (!(await tell(env.DB, await ipNokkel(env.DB, ip, naa), 3600, GRENSE_IP_PER_TIME, naa))) {
    return json({ feil: "For mange registreringer. Prøv igjen om en time." }, 429, { "retry-after": "3600" });
  }
  let b: Record<string, unknown>;
  try {
    const v = await lesJson(req);
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error();
    b = v as Record<string, unknown>;
  } catch { return feil(400, "Ugyldig forespørsel."); }

  // Personvern: bare jobbreiser. Private reiser skal aldri hit, og blir avvist før noe annet skjer.
  if (b.formaal !== "jobb") return feil(422, "Bare jobbreiser kan sendes. Private reiser lagres bare på enheten din.");

  const l = await finnGyldigLenke(env, b.token, naa);
  if (!l) return lenkeUgyldig();

  // Honningfelt: roboter fyller det ut. Svar som om det gikk bra, men lagre ingenting.
  if (typeof b.nettside === "string" && b.nettside.trim() !== "") return json({ lagret: true }, 201);

  if (!(await tell(env.DB, "lenke:" + l.id, 86_400, GRENSE_LENKE_PER_DOGN, naa))) {
    return json({ feil: "Lenken har nådd grensen for i dag. Prøv igjen i morgen." }, 429);
  }

  const v = validerReise(b, naa);
  if (!v.ok) return feil(422, v.feil);
  const r = v.verdi;

  // Tallene regnes her med samme calc-modul som nettsiden. Klientens tall brukes aldri.
  let res;
  let transportmiddel: string;
  let etapper: { transportmiddel: string; distanse_km: number }[];
  let distanse: number;
  try {
    if (r.type === "hjemmekontor") {
      res = calculateHomeOffice({ oneWayCommuteKm: r.pendlingKm, avoided: r.turRetur ? "return" : "one_way" }, REFERENCE_CAR);
      transportmiddel = "home_office";
      etapper = [{ transportmiddel: "home_office", distanse_km: r.pendlingKm }];
      distanse = res.avoidedKm;
    } else {
      res = calculateTrip({ segments: r.etapper, returnTrip: r.turRetur }, FACTORS, REFERENCE_CAR);
      transportmiddel = [...r.etapper].sort((a, b) => b.distanceKm - a.distanceKm)[0].mode;
      etapper = r.etapper.map((e) => ({ transportmiddel: e.mode, distanse_km: e.distanceKm }));
      distanse = res.distanceKm;
    }
  } catch (e) {
    if (e instanceof CalcError) return feil(422, e.message);
    throw e;
  }

  await env.DB.prepare(
    "INSERT INTO reise (id, prosjekt_id, lenke_id, formaal, dato, transportmiddel, distanse_km, tur_retur, etapper, utslipp_kg, referanse_kg, faktorversjon, faktor_snapshot, opprettet) " +
      "VALUES (?, ?, ?, 'jobb', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(
    crypto.randomUUID(), l.prosjekt_id, l.id, r.dato, transportmiddel, distanse, r.turRetur ? 1 : 0, JSON.stringify(etapper),
    res.emissionsKg, res.baselineKg, FACTOR_VERSION, JSON.stringify(res.snapshot), iso(naa),
  ).run();

  if (Math.random() < 0.05) await rydd(env.DB, naa);
  return json({ lagret: true, prosjekt: { navn: l.navn }, utslipp_kg: res.emissionsKg, referanse_kg: res.baselineKg, besparelse_kg: res.savingsKg, faktorversjon: FACTOR_VERSION }, 201);
}

async function dashbord(env: Env, prosjektId: string): Promise<Response> {
  if (!UUID_RE.test(prosjektId)) return feil(404, "Fant ikke prosjektet.");
  const p = await env.DB.prepare("SELECT id, navn, status, min_gruppe FROM prosjekt WHERE id = ?").bind(prosjektId)
    .first<{ id: string; navn: string; status: string; min_gruppe: number }>();
  if (!p) return feil(404, "Fant ikke prosjektet.");
  const { results } = await env.DB.prepare(
    "SELECT substr(dato, 1, 7) AS maaned, transportmiddel, COUNT(*) AS antall, SUM(referanse_kg - utslipp_kg) AS spart, SUM(utslipp_kg) AS utslipp " +
      "FROM reise WHERE prosjekt_id = ? AND skjult = 0 GROUP BY 1, 2",
  ).bind(prosjektId).all<Rad>();
  const d = byggDashbord(results, p.min_gruppe);
  return json({ prosjekt: { id: p.id, navn: p.navn, status: p.status }, ...d }, 200, { "cache-control": "public, max-age=300" });
}

// ---------- Admin (bak midlertidig dev-innlogging) ----------

async function adminBedrift(env: Env, adminId: string): Promise<string | null> {
  const r = await env.DB.prepare("SELECT bedrift_id FROM administrator WHERE id = ?").bind(adminId).first<{ bedrift_id: string }>();
  return r?.bedrift_id ?? null;
}

const logg = (env: Env, adminId: string, handling: string, malId: string, naa: number) =>
  env.DB.prepare("INSERT INTO hendelseslogg (id, administrator_id, handling, mal_id, tid) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), adminId, handling, malId, iso(naa));

async function nyLenkeSetninger(env: Env, prosjektId: string, adminId: string, naa: number) {
  const token = nyttToken();
  const id = crypto.randomUUID();
  const lenke = { id, prefiks: token.slice(0, 6), opprettet: iso(naa), utloper: plussMaaneder(naa, LENKE_GYLDIG_MND) };
  const insert = env.DB.prepare(
    "INSERT INTO lenke (id, prosjekt_id, token_hash, token_prefiks, opprettet, utloper, trukket_tilbake, opprettet_av) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)",
  ).bind(id, prosjektId, await sha256Hex(token), lenke.prefiks, lenke.opprettet, lenke.utloper, adminId);
  return { token, lenke, insert };
}

async function admin(req: Request, env: Env, sti: string[], naa: number): Promise<Response> {
  const a = devAuth(req, env);
  if (!a.ok) return a.status === 503 ? feil(503, "Admin er ikke satt opp i dette miljøet.") : feil(401, "Ikke innlogget.");
  const bedrift = await adminBedrift(env, a.adminId);
  if (!bedrift) return feil(401, "Ikke innlogget.");
  const m = req.method;

  // /api/admin/prosjekter
  if (sti.length === 1 && sti[0] === "prosjekter") {
    if (m === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT p.id, p.navn, p.status, p.min_gruppe, p.opprettet, " +
          "(SELECT COUNT(*) FROM reise r WHERE r.prosjekt_id = p.id AND r.skjult = 0) AS registrerte_reiser " +
          "FROM prosjekt p WHERE p.bedrift_id = ? ORDER BY p.opprettet DESC, p.navn",
      ).bind(bedrift).all();
      return json({ prosjekter: results });
    }
    if (m === "POST") {
      let b: Record<string, unknown>;
      try { b = (await lesJson(req)) as Record<string, unknown>; } catch { return feil(400, "Ugyldig forespørsel."); }
      const navn = typeof b?.navn === "string" ? b.navn.trim() : "";
      if (navn.length < 2 || navn.length > 80) return feil(422, "Prosjektnavnet må ha 2–80 tegn.");
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO prosjekt (id, bedrift_id, navn, status, min_gruppe, opprettet_av, opprettet) VALUES (?, ?, ?, 'aktiv', 10, ?, ?)")
          .bind(id, bedrift, navn, a.adminId, iso(naa)),
        logg(env, a.adminId, "opprett_prosjekt", id, naa),
      ]);
      return json({ prosjekt: { id, navn, status: "aktiv", min_gruppe: 10, opprettet: iso(naa), registrerte_reiser: 0 } }, 201);
    }
  }

  // /api/admin/prosjekter/:id/lenker
  if (sti.length === 3 && sti[0] === "prosjekter" && sti[2] === "lenker") {
    const p = await env.DB.prepare("SELECT id, status FROM prosjekt WHERE id = ? AND bedrift_id = ?").bind(sti[1], bedrift).first<{ id: string; status: string }>();
    if (!p) return feil(404, "Fant ikke prosjektet.");
    if (m === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT id, token_prefiks AS prefiks, opprettet, utloper, trukket_tilbake FROM lenke WHERE prosjekt_id = ? ORDER BY opprettet DESC",
      ).bind(p.id).all();
      return json({ lenker: results });
    }
    if (m === "POST") {
      if (p.status !== "aktiv") return feil(409, "Prosjektet er arkivert.");
      const n = await nyLenkeSetninger(env, p.id, a.adminId, naa);
      await env.DB.batch([n.insert, logg(env, a.adminId, "opprett_lenke", n.lenke.id, naa)]);
      // Tokenet finnes bare i dette svaret. Det lagres ikke og kan ikke hentes igjen.
      return json({ token: n.token, lenke: { ...n.lenke, trukket_tilbake: null } }, 201);
    }
  }

  // /api/admin/lenker/:id/(trekk-tilbake|forny)
  if (sti.length === 3 && sti[0] === "lenker" && m === "POST" && (sti[2] === "trekk-tilbake" || sti[2] === "forny")) {
    const l = await env.DB.prepare(
      "SELECT l.id, l.prosjekt_id, l.trukket_tilbake, p.status FROM lenke l JOIN prosjekt p ON p.id = l.prosjekt_id WHERE l.id = ? AND p.bedrift_id = ?",
    ).bind(sti[1], bedrift).first<{ id: string; prosjekt_id: string; trukket_tilbake: string | null; status: string }>();
    if (!l) return feil(404, "Fant ikke lenken.");
    const trekk = env.DB.prepare("UPDATE lenke SET trukket_tilbake = ? WHERE id = ? AND trukket_tilbake IS NULL").bind(iso(naa), l.id);
    if (sti[2] === "trekk-tilbake") {
      await env.DB.batch([trekk, logg(env, a.adminId, "trekk_tilbake_lenke", l.id, naa)]);
      return json({ lenke: { id: l.id, trukket_tilbake: l.trukket_tilbake ?? iso(naa) } });
    }
    if (l.status !== "aktiv") return feil(409, "Prosjektet er arkivert.");
    // Forny: trekk tilbake gammel og lag ny i samme transaksjon (D1 batch).
    const n = await nyLenkeSetninger(env, l.prosjekt_id, a.adminId, naa);
    await env.DB.batch([trekk, n.insert, logg(env, a.adminId, "forny_lenke", n.lenke.id, naa)]);
    return json({ token: n.token, lenke: { ...n.lenke, trukket_tilbake: null }, erstattet: l.id }, 201);
  }

  // /api/admin/reiser/:id/skjul
  if (sti.length === 3 && sti[0] === "reiser" && sti[2] === "skjul" && m === "POST") {
    const r = await env.DB.prepare("SELECT r.id FROM reise r JOIN prosjekt p ON p.id = r.prosjekt_id WHERE r.id = ? AND p.bedrift_id = ?")
      .bind(sti[1], bedrift).first<{ id: string }>();
    if (!r) return feil(404, "Fant ikke reisen.");
    await env.DB.batch([env.DB.prepare("UPDATE reise SET skjult = 1 WHERE id = ?").bind(r.id), logg(env, a.adminId, "skjul_reise", r.id, naa)]);
    return json({ skjult: true });
  }
  return feil(404, "Fant ikke ressursen.");
}

// ---------- Ruting ----------

async function rute(req: Request, env: Env): Promise<Response> {
  const naa = Date.now();
  const url = new URL(req.url);
  const deler = url.pathname.split("/").filter(Boolean);
  if (deler[0] !== "api") return feil(404, "Fant ikke ressursen.");
  const [, hoved, ...rest] = deler;
  if (hoved === "lenke" && rest.length === 0 && req.method === "POST") return lenkeInfo(req, env, naa);
  if (hoved === "reiser" && rest.length === 0 && req.method === "POST") return registrer(req, env, naa);
  if (hoved === "dashbord" && rest.length === 1 && req.method === "GET") return dashbord(env, rest[0]);
  if (hoved === "admin") return admin(req, env, rest, naa);
  return feil(404, "Fant ikke ressursen.");
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHoder(req, env);
    // Andre opphav avvises før noe annet skjer, og får ingen CORS-hoder.
    if (cors === null) return json({ feil: "Opphavet er ikke tillatt." }, 403);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    let res: Response;
    try {
      res = await rute(req, env);
    } catch {
      res = feil(500, "Noe gikk galt på serveren.");
    }
    const ut = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) ut.headers.set(k, v);
    ut.headers.set("x-content-type-options", "nosniff");
    return ut;
  },
  async scheduled(_c: ScheduledController, env: Env): Promise<void> {
    await rydd(env.DB, Date.now());
  },
} satisfies ExportedHandler<Env>;
