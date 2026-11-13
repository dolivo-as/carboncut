import { FACTORS, FACTOR_VERSION, MODE_LABELS, REFERENCE_CAR } from "@calc/factors";
import { UNIT_LABELS, fmtFactor, plainFactorText } from "./format";

export function Method() {
  return (
    <section className="narrow">
      <h1 tabIndex={-1}>Metode og kilder</h1>
      <p>Faktorversjon {FACTOR_VERSION} = godkjent faktorliste v2 (utslippsfaktorer_YTM.csv).</p>
      <p>Tallene i denne testversjonen er <strong>estimater</strong> basert på norske kilder, og noen er egne regnestykker på flere kilder. De er ikke verifisert, og siden gir ingen garanti for faktisk miljøeffekt.</p>

      <div className="card">
        <h2>Regler</h2>
        <ul className="rules">
          <li><strong>Utslipp</strong> = distanse × faktor per strekning. Tur-retur dobler distansen. Ingen avrunding i beregningen; tall rundes bare ved visning.</li>
          <li><strong>Referanse</strong> = hele distansen × referansebilen: bensinbil med 1 person, {fmtFactor(REFERENCE_CAR.kgCo2ePerKm!)} kg CO₂e for hver kilometer bilen kjører. Besparelse = referanse − utslipp og kan være negativ.</li>
          <li><strong>Bil = 1 person.</strong> Tallet for bil gjelder når bare føreren sitter i bilen, per kilometer bilen kjører. Antall personer i bilen kan ikke velges i denne versjonen.</li>
          <li><strong>Hjemmekontor</strong> = unngått pendling regnet med referansebilen på pendleavstanden (én vei eller tur-retur). Utslippet settes til 0 og fysisk distanse til 0. Tilbys bare når formålet er Jobb.</li>
          <li><strong>Livsløp</strong> er grunnlaget for alle faktorer, unntatt <strong>ferje</strong>, som er «bare direkte utslipp».</li>
          <li><strong>Fly</strong> er regnet med høydeeffekt (multiplikator 1,8 på forbrenningsdelen).</li>
          <li>Øvrige reisemåter bruker kildens eget belegg (f.eks. buss 25 % i by og 50 % i region, fly 70 %). Det er en annen konvensjon enn bil.</li>
          <li>Reisemåter uten godkjent kilde står som «mangler kilde» og kan ikke velges.</li>
          <li><strong>Jobb og Privat</strong> regnes med de samme faktorene. Formålet merkes på hver tur. Deling med firma og åpent dashbord kommer først når en server er valgt. Inntil da lagres alt bare i denne nettleseren.</li>
        </ul>
      </div>

      <h2>Kildetabell</h2>
      <p className="small muted">Enheten forteller om tallet gjelder én person som reiser 1 km, eller 1 km bilen kjører (med én person i denne versjonen).</p>
      <div style={{ overflowX: "auto" }}>
        <table className="src">
          <thead>
            <tr>
              <th>Reisemåte</th><th>Verdi</th><th>Enhet</th><th>Omfang</th><th>Belegg</th>
              <th>Kilde</th><th>Utgave</th><th>Dato</th><th>CSV-rad</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {FACTORS.map((f) => (
              <tr key={f.mode} className={f.status === "mangler_kilde" ? "miss" : undefined}>
                <td className="mode" data-l="Reisemåte">{MODE_LABELS[f.mode].nb}</td>
                <td data-l="Verdi">{f.value == null ? "–" : fmtFactor(f.value)}</td>
                <td data-l="Enhet">{UNIT_LABELS[f.unit]}</td>
                <td data-l="Omfang">{f.lifecycle == null ? "–" : f.lifecycle ? "livsløp" : "bare direkte utslipp"}</td>
                <td data-l="Belegg">{f.occupancyBasis ? plainFactorText(f.occupancyBasis) : "–"}</td>
                <td data-l="Kilde">{f.source ? plainFactorText(f.source) : "–"}{f.note ? <div className="muted">{plainFactorText(f.note)}</div> : null}</td>
                <td data-l="Utgave">{f.edition ?? "–"}</td>
                <td data-l="Dato">{f.sourceDate ?? "–"}</td>
                <td data-l="CSV-rad">{f.csvId ?? "–"}</td>
                <td data-l="Status">{f.status === "dokumentert" ? "kilde oppgitt" : "mangler kilde"}</td>
              </tr>
            ))}
            <tr>
              <td className="mode" data-l="Reisemåte">Referansebil (bensin)</td>
              <td data-l="Verdi">{fmtFactor(REFERENCE_CAR.kgCo2ePerKm!)}</td>
              <td data-l="Enhet">{UNIT_LABELS.kg_co2e_per_vkm}</td>
              <td data-l="Omfang">livsløp</td>
              <td data-l="Belegg">{REFERENCE_CAR.occupancyBasis ? plainFactorText(REFERENCE_CAR.occupancyBasis) : "–"}</td>
              <td data-l="Kilde">{REFERENCE_CAR.source ? plainFactorText(REFERENCE_CAR.source) : "–"}</td>
              <td data-l="Utgave">{REFERENCE_CAR.edition}</td>
              <td data-l="Dato">{REFERENCE_CAR.sourceDate}</td>
              <td data-l="CSV-rad">{REFERENCE_CAR.csvId}</td>
              <td data-l="Status">kilde oppgitt</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="small muted">Alle tall hentet 2026-11-02 fra faktorlisten utslippsfaktorer_YTM (v2, godkjent av CTO). Hybridbil og «annet» mangler kilde i faktorversjon 1.</p>
    </section>
  );
}
