import { MODE_LABELS } from "@calc/factors";
import { ResultView } from "./ResultView";
import { fmtKg, fmtKm } from "./format";
import type { StoredTrip } from "./storage";

export function TripList({ trips, onDelete, onClear }: { trips: StoredTrip[]; onDelete: (id: string) => void; onClear: () => void }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Lagrede turer ({trips.length})</h2>
        {trips.length > 0 && <button className="text-sm text-red-700 underline" onClick={() => { if (confirm("Slette alle lagrede turer i denne nettleseren?")) onClear(); }}>Slett alle</button>}
      </div>
      <p className="text-xs text-slate-500 mb-3">Turene ligger kun i denne nettleserens localStorage. Ingenting sendes noe sted.</p>
      {trips.length === 0 && <p className="text-sm text-slate-500">Ingen lagrede turer.</p>}
      <ul className="space-y-3">
        {trips.map((t) => (
          <li key={t.id} className="rounded border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{t.date} · {t.description || (t.kind === "home_office" ? "Hjemmekontor" : "Tur")}</div>
                <div className="text-sm text-slate-600">
                  {t.kind === "home_office"
                    ? `Hjemmekontor: pendleavstand ${fmtKm(t.oneWayCommuteKm ?? 0)} km ${t.avoided === "return" ? "tur-retur" : "én vei"}`
                    : `${(t.segments ?? []).map((s) => `${MODE_LABELS[s.mode]?.nb ?? s.mode} ${fmtKm(s.distanceKm)} km`).join(" + ")}${t.returnTrip ? " (tur-retur)" : ""}`}
                  {" · "}besparelse {fmtKg(t.result.savingsKg)} kg CO₂e
                </div>
              </div>
              <button className="rounded border border-red-300 px-2 py-1 text-sm text-red-700" onClick={() => onDelete(t.id)}>Slett</button>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-slate-700">Detaljer og faktorer som ble brukt</summary>
              <div className="mt-2"><ResultView r={t.result} perSegment={t.segments} /></div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
