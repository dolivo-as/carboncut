/** Hash-ruter, så siden fortsatt er statisk (GitHub Pages) og tokenet i #-delen aldri sendes til noen server i URL-en. */
export type Route =
  | { name: "app" }
  | { name: "admin" }
  | { name: "dashbord"; id: string | null }
  | { name: "lenke"; token: string };

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function parseRoute(hash: string): Route {
  const p = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (p[0] === "admin" && p.length === 1) return { name: "admin" };
  if (p[0] === "dashbord" && p.length <= 2) return { name: "dashbord", id: p[1] && UUID_RE.test(p[1]) ? p[1] : null };
  if (p[0] === "r" && p.length === 2 && TOKEN_RE.test(p[1])) return { name: "lenke", token: p[1] };
  return { name: "app" };
}

export const lenkeUrl = (origin: string, token: string) => `${origin}/#/r/${token}`;
export const dashbordUrl = (origin: string, id: string) => `${origin}/#/dashbord/${id}`;
