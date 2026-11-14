export interface Env {
  DB: D1Database;
  /** Kommaseparert liste over tillatte opphav i produksjon (wrangler.toml). */
  ALLOWED_ORIGINS: string;
  /** Kun lokalt (.dev.vars): ekstra opphav som localhost. */
  DEV_ORIGINS?: string;
  /** Kun lokalt (.dev.vars): «lokal» slår på dev-innlogging for admin. */
  MILJO?: string;
  ADMIN_DEV_KEY?: string;
  ADMIN_DEV_ID?: string;
}
