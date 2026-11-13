import type { FactorSnapshotEntry } from "@calc/calc";
import { UNIT_LABELS, fmtFactor, plainFactorText } from "./format";

/** Faktorversjon, verdi, enhet, kilde, utgave og dato for én faktor – fra snapshot. */
export function FactorInfo({ f }: { f: FactorSnapshotEntry }) {
  return (
    <div className="small muted" style={{ marginTop: 4, lineHeight: 1.45 }}>
      <div>
        <span style={{ fontWeight: 700 }}>Faktorversjon {f.factorVersion}</span>
        {f.csvId ? <> · rad {f.csvId}</> : null} · {fmtFactor(f.value)} {UNIT_LABELS[f.unit] ?? f.unit}
        {f.unit === "kg_co2e_per_vkm" && f.vehicleOccupancy != null ? <> ({f.vehicleOccupancy} person i bilen)</> : null}
      </div>
      <div>Kilde: {plainFactorText(f.source)}</div>
      <div>Utgave: {f.edition ?? "–"} · Dato: {f.sourceDate ?? "–"}{f.occupancyBasis ? <> · Belegg: {plainFactorText(f.occupancyBasis)}</> : null}</div>
      {f.lifecycle === false && <div className="tag dir" style={{ marginTop: 4 }}>Bare direkte utslipp (ikke livsløp)</div>}
    </div>
  );
}
