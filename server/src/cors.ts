import type { Env } from "./env";

export function tillatteOpphav(env: Env): Set<string> {
  const liste = [env.ALLOWED_ORIGINS, env.DEV_ORIGINS ?? ""].join(",");
  return new Set(liste.split(",").map((s) => s.trim()).filter(Boolean));
}

/** null = opphavet er ikke tillatt. Uten Origin-header (ikke nettleser) er det ingen CORS å gi. */
export function corsHoder(req: Request, env: Env): Record<string, string> | null {
  const origin = req.headers.get("origin");
  if (origin == null) return {};
  if (!tillatteOpphav(env).has(origin)) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}
