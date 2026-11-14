/**
 * Kall mot CarbonCut-API-et (trinn 2). I utvikling: lokal `wrangler dev` på 127.0.0.1:8787.
 * I et produksjonsbygg uten VITE_API_URL er serveren ikke satt opp, og server-funksjonene viser det.
 */
const fraEnv = import.meta.env.VITE_API_URL as string | undefined;
export const API_BASE: string = (fraEnv ?? (import.meta.env.DEV ? "http://127.0.0.1:8787" : "")).replace(/\/$/, "");
export const serverAvailable = () => API_BASE !== "";

export type ApiSvar<T> = { ok: true; data: T } | { ok: false; status: number; feil: string };

export async function api<T>(sti: string, init: RequestInit & { adminKey?: string } = {}): Promise<ApiSvar<T>> {
  if (!serverAvailable()) return { ok: false, status: 0, feil: "Serveren er ikke satt opp ennå." };
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  if (init.adminKey) headers.set("authorization", `Bearer ${init.adminKey}`);
  try {
    const r = await fetch(API_BASE + sti, { ...init, headers, credentials: "omit", referrerPolicy: "no-referrer" });
    const j = (await r.json().catch(() => ({}))) as { feil?: string };
    if (!r.ok) return { ok: false, status: r.status, feil: j.feil ?? `Feil fra serveren (${r.status}).` };
    return { ok: true, data: j as T };
  } catch {
    return { ok: false, status: 0, feil: "Fikk ikke kontakt med serveren. Prøv igjen." };
  }
}
