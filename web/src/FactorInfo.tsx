import type { FactorSnapshotEntry } from "@calc/calc";
import { fmtFactor } from "./format";

const UNIT: Record<string, string> = { kg_co2e_per_pkm: "kg CO₂e/pkm", kg_co2e_per_vkm: "kg CO₂e/kjøretøy-km" };

/** Faktorversjon, verdi, enhet, kilde, utgave og dato for én faktor – fra snapshot. */
export function FactorInfo({ f }: { f: FactorSnapshotEntry }) {
  return (
    <div className="text-xs text-slate-600 mt-1 leading-relaxed">
      <div>
        <span className="font-medium">Faktorversjon {f.factorVersion}</span>
        {f.csvId ? <> · rad {f.csvId}</> : null} · {fmtFactor(f.value)} {UNIT[f.unit] ?? f.unit}
        {f.unit === "kg_co2e_per_vkm" && f.vehicleOccupancy != null ? <> ({f.vehicleOccupancy} person i bilen)</> : null}
      </div>
      <div>Kilde: {f.source}</div>
      <div>Utgave: {f.edition ?? "–"} · Dato: {f.sourceDate ?? "–"}{f.occupancyBasis ? <> · Belegg: {f.occupancyBasis}</> : null}</div>
      {f.lifecycle === false && <div className="text-amber-800 font-medium">Merknad: bare direkte utslipp (ikke livsløp)</div>}
    </div>
  );
}
