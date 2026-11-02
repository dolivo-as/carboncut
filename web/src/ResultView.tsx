import type { TripResult } from "@calc/calc";
import { MODE_LABELS, type TransportMode } from "@calc/factors";
import { FactorInfo } from "./FactorInfo";
import { fmtKg, fmtKm, fmtFactor } from "./format";

export function ResultView({ r, perSegment }: { r: TripResult; perSegment?: { mode: Exclude<TransportMode, "home_office">; distanceKm: number }[] }) {
  const b = r.snapshot.baseline;
  return (
    <div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Utslipp" value={`${fmtKg(r.emissionsKg)} kg CO₂e`} />
        <Stat label="Referanse (bensinbil, 1 person)" value={`${fmtKg(r.baselineKg)} kg CO₂e`} />
        <Stat label="Besparelse" value={`${fmtKg(r.savingsKg)} kg CO₂e`} tone={r.savingsKg < 0 ? "bad" : "ok"} />
        <Stat label="Distanse" value={`${fmtKm(r.distanceKm)} km`} />
      </dl>
      {r.savingsKg < 0 && <p className="text-sm text-red-700 mt-2">Negativ besparelse: denne turen gir høyere estimert utslipp enn referansebilen.</p>}
      <div className="mt-3 space-y-2">
        {Object.entries(r.snapshot.factors).map(([mode, f]) => (
          <div key={mode} className="rounded border border-slate-200 bg-white p-2">
            <div className="font-medium text-sm">
              {MODE_LABELS[mode as TransportMode]?.nb ?? mode}
              {perSegment ? <span className="font-normal text-slate-500"> · {perSegment.filter((s) => s.mode === mode).map((s) => fmtKm(s.distanceKm) + " km").join(", ")}</span> : null}
              <span className="font-normal text-slate-500"> · effektiv faktor {fmtFactor(f.kgCo2ePerPkm)} kg CO₂e/pkm</span>
            </div>
            <FactorInfo f={f} />
          </div>
        ))}
        <div className="rounded border border-slate-200 bg-white p-2">
          <div className="font-medium text-sm">Referansebil (bensin) <span className="font-normal text-slate-500">· {fmtFactor(b.kgCo2ePerVkm)} kg CO₂e/kjøretøy-km, {b.vehicleOccupancy} person</span></div>
          <FactorInfo f={{ ...b, value: b.kgCo2ePerVkm }} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={"font-semibold " + (tone === "bad" ? "text-red-700" : "")}>{value}</dd>
    </div>
  );
}
