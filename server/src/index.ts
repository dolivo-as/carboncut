import { calculateHomeOffice, calculateTrip, CalcError } from "../../calc/src/calc";
import { FACTOR_VERSION, FACTORS, REFERENCE_CAR } from "../../calc/src/factors";
import { devAuth } from "./auth";
import { corsHoder } from "./cors";
import { byggDashbord, type Rad } from "./dashbord";
import type { Env } from "./env";
import { feil, json, lenkeUgyldig, lesJson } from "./http";
import { nyttToken, sha256Hex, TOKEN_RE } from "./krypto";
import { GRENSE_LENKE_PER_DOGN, rydd, sekTilNyttVindu, tell, tellIp } from "./misbruk";
import { lesOffentlig, lesUtloperMaaneder, validerReise } from "./validering";

export type { Env };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const iso = (ms: number) => new Date(ms).toISOString();
function plussMaaneder(ms: number, n: number): string {
  const d = new Date(ms);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString();
}

/** Avleder 3, 6 eller 12 måneder fra en eksisterende lenke. Ukjent intervall → 12. */
function maanederMellom(fra?: string, til?: string): 3 | 6 | 12 {
  if (!fra || !til) return 12;
  const a = new Date(fra);
  const b = new Date(til);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 12;
  const m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (m === 3 || m === 6 || m === 12) return m;
  return 12;
}
interface LenkeRad { id: string; prosjekt_id: string; utloper: string; trukket_tilbake: string | null; status: string; navn: string; offentlig: number }

/** Slår opp lenke på hash. null for ukjent, utløpt, trukket tilbake eller arkivert prosjekt – kalleren svarer likt (404). */
async function finnGyldigLenke(env: Env, token: unknown, naa: number): Promise<LenkeRad | null> {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return null;
  const rad = await env.DB.prepare(
    "SELECT l.id, l.prosjekt_id, l.utloper, l.trukket_tilbake, p.status, p.navn, p.offentlig FROM lenke l JOIN prosjekt p ON p.id = l.prosjekt_id WHERE l.token_hash = ?",
  ).bind(await sha256Hex(token)).first<LenkeRad>();
  if (!rad || rad.trukket_tilbake != null || rad.utloper <= iso(naa) || rad.status !== "aktiv") return null;
  return rad;
}

// ---------- Offentlig ----------

// Retry-After = sekunder til timevinduet i tellIp nullstilles (1–3600), ikke alltid 3600.
const forMange = (naa: number) =>
  json({ feil: "For mange forsøk. Prøv igjen om en time." }, 429, { "retry-after": String(sekTilNyttVindu(3600, naa)) });

async function lenkeInfo(req: Request, env: Env, naa: number): Promise<Response> {
  // Samme IP-teller som registrering (Tech Lead 14.11): hindrer at oppslaget brukes til å belaste serveren.
  if (!(await tellIp(env.DB, req.headers.get("cf-connecting-ip"), naa))) return forMange(naa);
  let body: Record<string, unknown>;
  try { body = (await lesJson(req)) as Record<string, unknown>; } catch { return lenkeUgyldig(); }
  const l = await finnGyldigLenke(env, body?.token, naa);
  if (!l) return lenkeUgyldig();
  return json({ prosjekt: { id: l.prosjekt_id, navn: l.navn, offentlig: l.offentlig !== 0 } });
}

async function registrer(req: Request, env: Env, naa: number): Promise<Response> {
  if (!(await tellIp(env.DB, req.headers.get("cf-connecting-ip"), naa))) return forMange(naa);
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
    return json({ feil: "Lenken har nådd grensen for i dag. Prøv igjen i morgen." }, 429, {
      "retry-after": String(sekTilNyttVindu(86_400, naa)),
    });
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
  return json({
    lagret: true,
    prosjekt: { id: l.prosjekt_id, navn: l.navn, offentlig: l.offentlig !== 0 },
    utslipp_kg: res.emissionsKg, referanse_kg: res.baselineKg, besparelse_kg: res.savingsKg, faktorversjon: FACTOR_VERSION,
  }, 201);
}

/** Samme 404 for ukjent id, ugyldig format og skjult (ikke-offentlig) dashbord. */
const prosjektUkjent = () => feil(404, "Fant ikke prosjektet.");

async function dashbord(env: Env, prosjektId: string): Promise<Response> {
  if (!UUID_RE.test(prosjektId)) return prosjektUkjent();
  const p = await env.DB.prepare("SELECT id, navn, status, min_gruppe, offentlig FROM prosjekt WHERE id = ?").bind(prosjektId)
    .first<{ id: string; navn: string; status: string; min_gruppe: number; offentlig: number }>();
  // Skjult dashbord skal ikke røpe at prosjektet finnes.
  if (!p || p.offentlig === 0) return prosjektUkjent();
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

async function nyLenkeSetninger(env: Env, prosjektId: string, adminId: string, naa: number, maaneder: number) {
  const token = nyttToken();
  const id = crypto.randomUUID();
  const lenke = { id, prefiks: token.slice(0, 6), opprettet: iso(naa), utloper: plussMaaneder(naa, maaneder) };
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
        "SELECT p.id, p.navn, p.status, p.min_gruppe, p.offentlig, p.opprettet, " +
          "(SELECT COUNT(*) FROM reise r WHERE r.prosjekt_id = p.id AND r.skjult = 0) AS registrerte_reiser " +
          "FROM prosjekt p WHERE p.bedrift_id = ? ORDER BY p.opprettet DESC, p.navn",
      ).bind(bedrift).all<{ id: string; navn: string; status: string; min_gruppe: number; offentlig: number; opprettet: string; registrerte_reiser: number }>();
      return json({
        prosjekter: results.map((p) => ({ ...p, offentlig: p.offentlig !== 0 })),
      });
    }
    if (m === "POST") {
      let b: Record<string, unknown>;
      try { b = (await lesJson(req)) as Record<string, unknown>; } catch { return feil(400, "Ugyldig forespørsel."); }
      const navn = typeof b?.navn === "string" ? b.navn.trim() : "";
      if (navn.length < 2 || navn.length > 80) return feil(422, "Prosjektnavnet må ha 2–80 tegn.");
      const utloper = lesUtloperMaaneder(b);
      if (!utloper.ok) return feil(422, utloper.feil);
      const offentlig = lesOffentlig(b);
      if (!offentlig.ok) return feil(422, offentlig.feil);
      const id = crypto.randomUUID();
      const n = await nyLenkeSetninger(env, id, a.adminId, naa, utloper.verdi);
      await env.DB.batch([
        env.DB.prepare("INSERT INTO prosjekt (id, bedrift_id, navn, status, min_gruppe, offentlig, opprettet_av, opprettet) VALUES (?, ?, ?, 'aktiv', 10, ?, ?, ?)")
          .bind(id, bedrift, navn, offentlig.verdi ? 1 : 0, a.adminId, iso(naa)),
        n.insert,
        logg(env, a.adminId, "opprett_prosjekt", id, naa),
        logg(env, a.adminId, "opprett_lenke", n.lenke.id, naa),
      ]);
      // Tokenet finnes bare i dette svaret. Det lagres ikke og kan ikke hentes igjen.
      return json({
        prosjekt: { id, navn, status: "aktiv", min_gruppe: 10, offentlig: offentlig.verdi, opprettet: iso(naa), registrerte_reiser: 0 },
        token: n.token,
        lenke: { ...n.lenke, trukket_tilbake: null },
      }, 201);
    }
  }

  // /api/admin/prosjekter/:id/(arkiver|gjenopprett)
  // Arkivering (CTO 14.11): prosjektet settes til arkivert, og alle aktive lenker trekkes tilbake for godt
  // i samme D1-batch (samme mekanisme og logg som «Trekk tilbake»). Reiser og lenkerader slettes ikke.
  // Gjenoppretting gjør IKKE gamle lenker gyldige; admin må lage en ny lenke og QR-kode.
  if (sti.length === 3 && sti[0] === "prosjekter" && m === "POST" && (sti[2] === "arkiver" || sti[2] === "gjenopprett")) {
    if (!UUID_RE.test(sti[1])) return feil(404, "Fant ikke prosjektet.");
    const p = await env.DB.prepare("SELECT id, status FROM prosjekt WHERE id = ? AND bedrift_id = ?").bind(sti[1], bedrift).first<{ id: string; status: string }>();
    if (!p) return feil(404, "Fant ikke prosjektet.");
    const arkiver = sti[2] === "arkiver";
    const ny = arkiver ? "arkivert" : "aktiv";
    // Idempotent: samme tilstand to ganger gir 200 og logges ikke på nytt.
    if (p.status !== ny) {
      const setninger = [
        env.DB.prepare("UPDATE prosjekt SET status = ? WHERE id = ?").bind(ny, p.id),
        logg(env, a.adminId, arkiver ? "arkiver_prosjekt" : "gjenopprett_prosjekt", p.id, naa),
      ];
      if (arkiver) {
        const { results } = await env.DB.prepare(
          "SELECT id FROM lenke WHERE prosjekt_id = ? AND trukket_tilbake IS NULL AND utloper > ?",
        ).bind(p.id, iso(naa)).all<{ id: string }>();
        for (const l of results) {
          setninger.push(
            env.DB.prepare("UPDATE lenke SET trukket_tilbake = ? WHERE id = ? AND trukket_tilbake IS NULL").bind(iso(naa), l.id),
            logg(env, a.adminId, "trekk_tilbake_lenke", l.id, naa),
          );
        }
      }
      await env.DB.batch(setninger);
    }
    return json({ prosjekt: { id: p.id, status: ny } });
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
      let b: Record<string, unknown> = {};
      const raw = await req.text();
      if (raw) {
        try { b = JSON.parse(raw) as Record<string, unknown>; } catch { return feil(400, "Ugyldig forespørsel."); }
      }
      const utloper = lesUtloperMaaneder(b);
      if (!utloper.ok) return feil(422, utloper.feil);
      const n = await nyLenkeSetninger(env, p.id, a.adminId, naa, utloper.verdi);
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
    let b: Record<string, unknown> = {};
    const raw = await req.text();
    if (raw) {
      try { b = JSON.parse(raw) as Record<string, unknown>; } catch { return feil(400, "Ugyldig forespørsel."); }
    }
    let maaneder: number;
    if (b.utloper_maaneder !== undefined && b.utloper_maaneder !== null) {
      const utloper = lesUtloperMaaneder(b);
      if (!utloper.ok) return feil(422, utloper.feil);
      maaneder = utloper.verdi;
    } else {
      const gammel = await env.DB.prepare("SELECT opprettet, utloper FROM lenke WHERE id = ?").bind(l.id).first<{ opprettet: string; utloper: string }>();
      maaneder = maanederMellom(gammel?.opprettet, gammel?.utloper);
    }
    const n = await nyLenkeSetninger(env, l.prosjekt_id, a.adminId, naa, maaneder);
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
