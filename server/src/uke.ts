/** ISO-8601-uke og uke-år for en dag (YYYY-MM-DD). Admin ser bare uke, ikke dag (CTO 14.11, personvern). */
export function isoUke(dato: string): { uke: number; aar: number } {
  const [y, m, d] = dato.slice(0, 10).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const ukedag = t.getUTCDay() || 7; // mandag = 1 … søndag = 7
  t.setUTCDate(t.getUTCDate() + 4 - ukedag); // torsdag i samme uke bestemmer uke-året
  const aar = t.getUTCFullYear();
  const uke = Math.ceil(((t.getTime() - Date.UTC(aar, 0, 1)) / 86_400_000 + 1) / 7);
  return { uke, aar };
}
