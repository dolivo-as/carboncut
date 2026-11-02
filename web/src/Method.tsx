import { FACTORS, FACTOR_VERSION, MODE_LABELS, REFERENCE_CAR } from "@calc/factors";
import { fmtFactor } from "./format";

const UNIT = { kg_co2e_per_pkm: "kg CO₂e/pkm", kg_co2e_per_vkm: "kg CO₂e/kjøretøy-km" } as const;
const th = "px-2 py-1 text-left font-medium text-slate-600 border-b border-slate-200 whitespace-nowrap";
const td = "px-2 py-1 align-top border-b border-slate-100";

export function Method() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold">Metode og kilder (faktorversjon {FACTOR_VERSION})</h2>
      <p className="text-sm">Tallene i denne testversjonen er <strong>estimater</strong> basert på norske kilder, og noen er egne regnestykker på flere kilder. De er ikke verifisert, og siden gir ingen garanti for faktisk miljøeffekt.</p>
      <h3 className="font-medium">Regler</h3>
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Utslipp</strong> = distanse × faktor per etappe. Tur-retur dobler distansen. Ingen avrunding i beregningen; tall rundes bare ved visning.</li>
        <li><strong>Referanse</strong> = total distanse × referansebilen: bensinbil, {fmtFactor(REFERENCE_CAR.kgCo2ePerKm!)} kg CO₂e per kjøretøy-km, 1 person i bilen. Besparelse = referanse − utslipp og kan være negativ.</li>
        <li><strong>Bil = 1 person.</strong> Bilfaktorene er per kjøretøy-km med føreren alene, så kg per kjøretøy-km er lik kg per personkm. Antall personer i bilen kan ikke velges i denne versjonen.</li>
        <li><strong>Hjemmekontor</strong> = unngått pendling regnet med referansebilen på pendleavstanden (én vei eller tur-retur). Utslippet settes til 0 og fysisk distanse til 0.</li>
        <li><strong>Livsløp</strong> er grunnlaget for alle faktorer, unntatt <strong>ferje</strong>, som er «bare direkte utslipp».</li>
        <li><strong>Fly</strong> er regnet med høydeeffekt (multiplikator 1,8 på forbrenningsdelen).</li>
        <li>Øvrige transportformer bruker kildens eget belegg (f.eks. buss 25 % i by og 50 % i region, fly 70 %). Det er en annen konvensjon enn bil.</li>
        <li>Transportformer uten godkjent kilde står som «mangler kilde» og kan ikke velges.</li>
      </ul>

      <h3 className="font-medium">Kildetabell</h3>
      <div className="overflow-x-auto">
        <table className="text-xs min-w-full">
          <thead><tr>
            <th className={th}>Transportform</th><th className={th}>Verdi</th><th className={th}>Enhet</th><th className={th}>Omfang</th><th className={th}>Belegg</th>
            <th className={th}>Kilde</th><th className={th}>Utgave</th><th className={th}>Dato</th><th className={th}>CSV-rad</th><th className={th}>Status</th>
          </tr></thead>
          <tbody>
            {FACTORS.map((f) => (
              <tr key={f.mode} className={f.status === "mangler_kilde" ? "text-slate-500" : ""}>
                <td className={td + " font-medium"}>{MODE_LABELS[f.mode].nb}</td>
                <td className={td}>{f.value == null ? "–" : fmtFactor(f.value)}</td>
                <td className={td}>{UNIT[f.unit]}</td>
                <td className={td}>{f.lifecycle == null ? "–" : f.lifecycle ? "livsløp" : "bare direkte utslipp"}</td>
                <td className={td}>{f.occupancyBasis ?? "–"}</td>
                <td className={td}>{f.source ?? "–"}{f.note ? <div className="text-slate-500">{f.note}</div> : null}</td>
                <td className={td}>{f.edition ?? "–"}</td>
                <td className={td}>{f.sourceDate ?? "–"}</td>
                <td className={td}>{f.csvId ?? "–"}</td>
                <td className={td}>{f.status === "dokumentert" ? "kilde oppgitt" : "mangler kilde"}</td>
              </tr>
            ))}
            <tr className="bg-slate-50">
              <td className={td + " font-medium"}>Referansebil (bensin)</td>
              <td className={td}>{fmtFactor(REFERENCE_CAR.kgCo2ePerKm!)}</td><td className={td}>{UNIT.kg_co2e_per_vkm}</td>
              <td className={td}>livsløp</td><td className={td}>{REFERENCE_CAR.occupancyBasis}</td>
              <td className={td}>{REFERENCE_CAR.source}</td><td className={td}>{REFERENCE_CAR.edition}</td><td className={td}>{REFERENCE_CAR.sourceDate}</td>
              <td className={td}>{REFERENCE_CAR.csvId}</td><td className={td}>kilde oppgitt</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Alle tall hentet 2026-11-02 fra faktorlisten utslippsfaktorer_YTM (v2, godkjent av CTO). Hybridbil og «annet» mangler kilde i faktorversjon 1.</p>
    </section>
  );
}
