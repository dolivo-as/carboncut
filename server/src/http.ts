export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

/** Én og samme svar for ukjent, utløpt og trukket lenke (v0.2). Ikke endre teksten per tilfelle. */
export const LENKE_UGYLDIG_BODY = JSON.stringify({ feil: "Lenken er ikke gyldig." });
export function lenkeUgyldig(): Response {
  return new Response(LENKE_UGYLDIG_BODY, {
    status: 404,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export const feil = (status: number, melding: string) => json({ feil: melding }, status);

export async function lesJson(req: Request, maksBytes = 8_192): Promise<unknown> {
  const tekst = await req.text();
  if (tekst.length > maksBytes) throw new Error("for_stor");
  return JSON.parse(tekst);
}
