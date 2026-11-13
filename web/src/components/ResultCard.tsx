import type { TripResult } from "@calc/calc";
import type { TransportMode } from "@calc/factors";
import { FactorInfo } from "../FactorInfo";
import { fmtFactor, fmtKg, fmtKm } from "../format";
import { PURPOSE_LABELS, type Kind, type Purpose } from "../flowLogic";
import { MODE_LABELS } from "@calc/factors";
import { IconBriefcase, IconUser } from "./Icons";

export function PurposeBadge({ purpose }: { purpose: Purpose | "unspecified" }) {
  const cls = purpose === "work" ? "work" : purpose === "private" ? "priv" : "none";
  const Icon = purpose === "work" ? IconBriefcase : IconUser;
  return (
    <span className={`tag ${cls}`}>
      <Icon width="14" height="14" />
      {PURPOSE_LABELS[purpose]}
    </span>
  );
}

export function ResultCard({
  result,
  purpose,
  kind,
  live = false,
  perSegment,
  extra,
  avoidedKm,
}: {
  result: TripResult;
  purpose: Purpose | "unspecified";
  kind: Kind;
  live?: boolean;
  perSegment?: { mode: Exclude<TransportMode, "home_office">; distanceKm: number }[];
  extra?: string;
  avoidedKm?: number;
}) {
  const b = result.snapshot.baseline;
  const max = Math.max(result.emissionsKg, result.baselineKg, 0.0001);
  const saved = result.savingsKg >= 0;
  const headline = kind === "home_office" ? "Estimert effekt av hjemmekontor" : "Estimert besparelse mot bensinbil med én person";

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <PurposeBadge purpose={purpose} />
        {kind === "home_office" ? <span className="tag">Hjemmekontor</span> : null}
      </div>
      <div aria-live={live ? "polite" : undefined} aria-atomic="true">
        <p className="muted small" style={{ marginBottom: 4 }}>{headline}</p>
        <p className={`big ${saved ? "pos" : "neg"}`} style={{ margin: "0 0 8px" }}>
          {fmtKg(result.savingsKg)}
          <span className="unit"> kg CO₂e</span>
        </p>
        {saved
          ? <p className="small">Lavere utslipp enn referansen (bensinbil, 1 person).</p>
          : <p className="notice bad">Høyere estimert utslipp enn referansebilen (bensinbil, 1 person).</p>}
      </div>

      <div className="bars">
        <div className="barrow">
          <div className="cap"><span>{kind === "home_office" ? "Hjemmekontor" : "Din tur"}</span><span>{fmtKg(result.emissionsKg)} kg CO₂e</span></div>
          <div className="bar" aria-hidden="true"><i style={{ width: `${(result.emissionsKg / max) * 100}%`, background: "var(--bar-you)" }} /></div>
        </div>
        <div className="barrow">
          <div className="cap"><span>Bensinbil, 1 person</span><span>{fmtKg(result.baselineKg)} kg CO₂e</span></div>
          <div className="bar" aria-hidden="true"><i style={{ width: `${(result.baselineKg / max) * 100}%`, background: "var(--bar-ref)" }} /></div>
        </div>
      </div>

      <dl className="stats" style={{ marginTop: 12 }}>
        <div className="stat">
          <dt className="l">Utslipp</dt>
          <dd className="v">{fmtKg(result.emissionsKg)} <span className="unit">kg</span></dd>
        </div>
        <div className="stat">
          <dt className="l">{kind === "home_office" ? "Unngått" : "Distanse"}</dt>
          <dd className="v">{fmtKm(kind === "home_office" ? (avoidedKm ?? result.distanceKm) : result.distanceKm)} <span className="unit">km</span></dd>
        </div>
      </dl>
      {extra ? <p className="small muted" style={{ marginTop: 10 }}>{extra}</p> : null}

      <details className="facts" style={{ marginTop: 12 }}>
        <summary>Slik er tallet regnet ut</summary>
        <div className="small" style={{ paddingTop: 8 }}>
          {Object.entries(result.snapshot.factors).map(([mode, f]) => (
            <div key={mode} className="segcard">
              <div className="n">
                {MODE_LABELS[mode as TransportMode]?.nb ?? mode}
                {perSegment ? <span className="muted"> · {perSegment.filter((s) => s.mode === mode).map((s) => fmtKm(s.distanceKm) + " km").join(", ")}</span> : null}
                <span className="muted"> · {fmtFactor(f.kgCo2ePerPkm)} kg CO₂e per personkilometer</span>
              </div>
              <FactorInfo f={f} />
            </div>
          ))}
          <div className="segcard">
            <div className="n">Referansebil (bensin) <span className="muted">· {fmtFactor(b.kgCo2ePerVkm)} kg CO₂e per kjøretøy-km, {b.vehicleOccupancy} person</span></div>
            <FactorInfo f={{ ...b, value: b.kgCo2ePerVkm }} />
          </div>
        </div>
      </details>
    </div>
  );
}
