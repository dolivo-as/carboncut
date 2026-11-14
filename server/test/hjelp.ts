import { env, exports } from "cloudflare:workers";

export const ADMIN = "00000000-0000-4000-8000-00000000a001";
export const BEDRIFT = "00000000-0000-4000-8000-00000000b001";
export const NOKKEL = "test-nokkel-kun-for-tester-0123456789";
export const OPPHAV = "http://127.0.0.1:5180";

let ipTeller = 0;
/** Ny fiktiv IP (100.64.0.0/10, delt adresserom) per kall, så IP-grensen ikke slår inn der den ikke testes. */
export const nyIp = () => { const i = ipTeller++; return `100.${64 + (i >> 16)}.${(i >> 8) & 255}.${i & 255}`; };

export function kall(sti: string, init: RequestInit & { ip?: string; admin?: boolean; opphav?: string | null } = {}) {
  const h = new Headers(init.headers);
  if (init.opphav !== null) h.set("origin", init.opphav ?? OPPHAV);
  h.set("cf-connecting-ip", init.ip ?? nyIp());
  if (init.admin) h.set("authorization", `Bearer ${NOKKEL}`);
  if (init.body) h.set("content-type", "application/json");
  return (exports as unknown as { default: Fetcher }).default.fetch(new Request(`http://api.test${sti}`, { ...init, headers: h }));
}

export async function seedAdmin() {
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO bedrift (id, navn, opprettet) VALUES (?, 'Testbedrift Fiktiv AS', '2026-01-01T00:00:00Z')").bind(BEDRIFT),
    env.DB.prepare("INSERT OR IGNORE INTO administrator (id, bedrift_id, epost, navn, rolle, opprettet) VALUES (?, ?, 'admin@example.invalid', 'Fiktiv Admin', 'eier', '2026-01-01T00:00:00Z')").bind(ADMIN, BEDRIFT),
  ]);
}

export async function nyttProsjekt(navn = "Fiktivt prosjekt"): Promise<string> {
  await seedAdmin();
  const r = await kall("/api/admin/prosjekter", { method: "POST", admin: true, body: JSON.stringify({ navn }) });
  if (r.status !== 201) throw new Error(`prosjekt ${r.status}`);
  return ((await r.json()) as { prosjekt: { id: string } }).prosjekt.id;
}

export async function nyLenke(prosjektId: string): Promise<{ token: string; id: string }> {
  const r = await kall(`/api/admin/prosjekter/${prosjektId}/lenker`, { method: "POST", admin: true });
  if (r.status !== 201) throw new Error(`lenke ${r.status}`);
  const j = (await r.json()) as { token: string; lenke: { id: string } };
  return { token: j.token, id: j.lenke.id };
}

export const iDag = () => new Date().toISOString().slice(0, 10);

export function reise(token: string, ekstra: Record<string, unknown> = {}) {
  return JSON.stringify({
    token, formaal: "jobb", dato: iDag(), type: "reise", tur_retur: false,
    etapper: [{ transportmiddel: "city_bus", distanse_km: 12.5 }], ...ekstra,
  });
}

export const registrer = (token: string, ekstra: Record<string, unknown> = {}, ip?: string) =>
  kall("/api/reiser", { method: "POST", body: reise(token, ekstra), ip });
