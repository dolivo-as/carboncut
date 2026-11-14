import type { Env } from "./env";
import { likKonstantTid } from "./krypto";

/**
 * MIDLERTIDIG DEV-INNLOGGING – MÅ BYTTES UT (Clerk, runde 2) FØR EKTE KONTO/UTRULLING.
 * Slås bare på når MILJO=lokal og ADMIN_DEV_KEY finnes, og de står bare i .dev.vars (gitignored).
 * I en utrulling uten .dev.vars svarer alle admin-endepunkter 503.
 */
export type AuthResultat = { ok: true; adminId: string } | { ok: false; status: 401 | 503 };

export function devAuth(req: Request, env: Env): AuthResultat {
  if (env.MILJO !== "lokal" || !env.ADMIN_DEV_KEY || env.ADMIN_DEV_KEY.length < 24 || !env.ADMIN_DEV_ID) {
    return { ok: false, status: 503 };
  }
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer (.+)$/.exec(h);
  if (!m || !likKonstantTid(m[1], env.ADMIN_DEV_KEY)) return { ok: false, status: 401 };
  return { ok: true, adminId: env.ADMIN_DEV_ID };
}
