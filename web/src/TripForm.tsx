import { useMemo, useState } from "react";
import { calculateHomeOffice, calculateTrip, CalcError, type TripResult } from "@calc/calc";
import { FACTORS, MODE_LABELS, REFERENCE_CAR, TRANSPORT_MODES, type TransportMode } from "@calc/factors";
import { ResultView } from "./ResultView";
import { fmtKm, parseNum } from "./format";
import type { StoredTrip } from "./storage";

type Mode = Exclude<TransportMode, "home_office">;
const MODES = TRANSPORT_MODES.filter((m): m is Mode => m !== "home_office");
const factorOf = (m: Mode) => FACTORS.find((f) => f.mode === m);
const today = () => new Date().toISOString().slice(0, 10);
const firstAvailable = (): Mode => MODES.find((m) => factorOf(m)?.status === "dokumentert") ?? MODES[0];

interface SegRow { key: number; mode: Mode; km: string }
let seq = 1;

export function TripForm({ onSave }: { onSave: (t: StoredTrip) => void }) {
  const [kind, setKind] = useState<"trip" | "home_office">("trip");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [segs, setSegs] = useState<SegRow[]>([{ key: seq++, mode: firstAvailable(), km: "" }]);
  const [returnTrip, setReturnTrip] = useState(false);
  const [commute, setCommute] = useState("");
  const [avoided, setAvoided] = useState<"one_way" | "return">("return");

  const calc = useMemo(() => {
    try {
      if (kind === "home_office") {
        const km = parseNum(commute);
        if (!(km > 0)) return { error: "Fyll inn pendleavstand (km, én vei) større enn 0." };
        return { result: calculateHomeOffice({ oneWayCommuteKm: km, avoided }, REFERENCE_CAR) as TripResult };
      }
      const segments = segs.map((s) => ({ mode: s.mode, distanceKm: parseNum(s.km) }));
      if (segments.some((s) => !(s.distanceKm > 0) || !Number.isFinite(s.distanceKm))) return { error: "Fyll inn distanse (km) større enn 0 for alle etapper." };
      return { result: calculateTrip({ segments, returnTrip }, FACTORS, REFERENCE_CAR) };
    } catch (e) {
      return { error: e instanceof CalcError ? e.message : "Ukjent feil i beregningen." };
    }
  }, [kind, segs, returnTrip, commute, avoided]);

  const hasFerry = segs.some((s) => s.mode === "ferry");
  const update = (key: number, patch: Partial<SegRow>) => setSegs((l) => l.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  function save() {
    if (!("result" in calc) || !calc.result) return;
    const base = { id: crypto.randomUUID?.() ?? String(Date.now()) + Math.random(), date, description: description.trim(), savedAt: new Date().toISOString(), result: calc.result };
    if (kind === "home_office") onSave({ ...base, kind, oneWayCommuteKm: parseNum(commute), avoided });
    else onSave({ ...base, kind, returnTrip, segments: segs.map((s) => ({ mode: s.mode, distanceKm: parseNum(s.km) })) });
    setDescription(""); setSegs([{ key: seq++, mode: firstAvailable(), km: "" }]); setCommute(""); setReturnTrip(false);
  }

  const input = "w-full rounded border border-slate-300 bg-white px-2 py-1.5";
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Ny tur</h2>
      <div className="flex gap-4 mb-3 text-sm" role="radiogroup" aria-label="Type">
        <label className="flex items-center gap-1"><input type="radio" checked={kind === "trip"} onChange={() => setKind("trip")} /> Reise</label>
        <label className="flex items-center gap-1"><input type="radio" checked={kind === "home_office"} onChange={() => setKind("home_office")} /> Hjemmekontor</label>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        <label className="text-sm">Dato<input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="text-sm sm:col-span-2">Beskrivelse<input type="text" className={input} value={description} maxLength={200} placeholder="F.eks. jobbreise" onChange={(e) => setDescription(e.target.value)} /></label>
      </div>

      {kind === "trip" ? (
        <div>
          <div className="space-y-2">
            {segs.map((s, i) => (
              <div key={s.key} className="flex flex-wrap items-end gap-2">
                <label className="text-sm flex-1 min-w-48">Etappe {i + 1}: transportform
                  <select className={input} value={s.mode} onChange={(e) => update(s.key, { mode: e.target.value as Mode })}>
                    {MODES.map((m) => {
                      const f = factorOf(m);
                      const missing = !f || f.status !== "dokumentert";
                      return <option key={m} value={m} disabled={missing}>{MODE_LABELS[m].nb}{missing ? " – mangler kilde" : f?.lifecycle === false ? " – bare direkte utslipp" : ""}</option>;
                    })}
                  </select>
                </label>
                <label className="text-sm w-36">Distanse (km)
                  <input inputMode="decimal" className={input} value={s.km} placeholder="0" onChange={(e) => update(s.key, { km: e.target.value })} />
                </label>
                <button type="button" className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-40" disabled={segs.length === 1}
                  onClick={() => setSegs((l) => l.filter((x) => x.key !== s.key))}>Fjern</button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setSegs((l) => [...l, { key: seq++, mode: firstAvailable(), km: "" }])}>+ Legg til etappe</button>
          <label className="flex items-center gap-2 mt-3 text-sm"><input type="checkbox" checked={returnTrip} onChange={(e) => setReturnTrip(e.target.checked)} /> Tur-retur (alle etapper dobles)</label>
          {hasFerry && <p className="mt-2 text-sm text-amber-800">Ferje: bare direkte utslipp (ikke livsløp). Tallet gjelder Ruters kollektivbåter i Oslofjorden.</p>}
          <p className="mt-2 text-xs text-slate-500">Transportformer som er nedtonet, mangler kilde i faktorversjon 1 og kan ikke velges.</p>
        </div>
      ) : (
        <div>
          <label className="text-sm block max-w-xs">Pendleavstand (km, én vei)
            <input inputMode="decimal" className={input} value={commute} placeholder="0" onChange={(e) => setCommute(e.target.value)} />
          </label>
          <div className="flex gap-4 mt-2 text-sm">
            <label className="flex items-center gap-1"><input type="radio" checked={avoided === "one_way"} onChange={() => setAvoided("one_way")} /> Én vei</label>
            <label className="flex items-center gap-1"><input type="radio" checked={avoided === "return"} onChange={() => setAvoided("return")} /> Tur-retur</label>
          </div>
          <p className="mt-2 text-xs text-slate-500">Hjemmekontor regnes som unngått pendling med referansebilen (bensinbil, 1 person) på pendleavstanden. Ingen fysisk distanse.</p>
        </div>
      )}

      <div className="mt-4">
        <h3 className="font-medium mb-2">Estimat</h3>
        {"result" in calc && calc.result ? <ResultView r={calc.result} perSegment={kind === "trip" ? segs.map((s) => ({ mode: s.mode, distanceKm: parseNum(s.km) })) : undefined} />
          : <p className="text-sm text-slate-500">{(calc as { error: string }).error}</p>}
        <p className="text-xs text-slate-500 mt-2">{kind === "home_office" && "result" in calc && calc.result ? `Unngått pendling: ${fmtKm(parseNum(commute) * (avoided === "return" ? 2 : 1))} km.` : null}</p>
      </div>
      <button type="button" disabled={!("result" in calc)} onClick={save}
        className="mt-3 rounded bg-emerald-700 px-4 py-2 text-white font-medium disabled:opacity-40">Lagre tur i denne nettleseren</button>
    </section>
  );
}
