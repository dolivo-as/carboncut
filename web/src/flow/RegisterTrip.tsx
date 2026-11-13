import { useEffect, useMemo, useRef, useState } from "react";
import { calculateHomeOffice, calculateTrip, CalcError, type TripResult } from "@calc/calc";
import { FACTORS, MODE_LABELS, REFERENCE_CAR } from "@calc/factors";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { IconBriefcase, IconLock, IconUser } from "../components/Icons";
import { ResultCard } from "../components/ResultCard";
import { SegmentedChoice } from "../components/SegmentedChoice";
import {
  STEP_LABELS, canLeaveMode, canLeavePurpose, documentedMode, homeOfficeAllowed,
  tripModes, validateDistance, validateSegments, type Kind, type Mode, type Purpose,
} from "../flowLogic";
import { fmtKm, parseNum } from "../format";
import type { StoredTrip } from "../storage";

interface SegRow { key: number; mode: Mode; km: string }
let seq = 1;
const today = () => new Date().toISOString().slice(0, 10);

export function RegisterTrip({ onSave, onCancel }: { onSave: (t: StoredTrip) => void; onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [kind, setKind] = useState<Kind>("trip");
  const [mode, setMode] = useState<Mode | null>(null);
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [segs, setSegs] = useState<SegRow[]>([{ key: seq++, mode: "walking", km: "" }]);
  const [returnTrip, setReturnTrip] = useState(false);
  const [commute, setCommute] = useState("");
  const [avoided, setAvoided] = useState<"one_way" | "return">("return");
  const [attempted, setAttempted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus(); }, [step]);

  useEffect(() => {
    if (purpose === "private" && kind === "home_office") {
      setKind("trip");
    }
  }, [purpose, kind]);

  function chooseMode(next: Mode | "home_office") {
    if (next === "home_office") {
      if (!homeOfficeAllowed(purpose)) return;
      setKind("home_office");
      setMode(null);
      return;
    }
    if (!documentedMode(next)) return;
    setKind("trip");
    setMode(next);
    setSegs((rows) => {
      const first = { ...rows[0], mode: next };
      return rows.length ? [first, ...rows.slice(1)] : [{ key: seq++, mode: next, km: "" }];
    });
  }

  const distanceError = kind === "home_office" ? validateDistance(commute) : validateSegments(segs);

  const calc = useMemo(() => {
    try {
      if (kind === "home_office") {
        if (validateDistance(commute)) return null;
        return calculateHomeOffice({ oneWayCommuteKm: parseNum(commute), avoided }, REFERENCE_CAR);
      }
      if (validateSegments(segs)) return null;
      return calculateTrip(
        { segments: segs.map((s) => ({ mode: s.mode, distanceKm: parseNum(s.km) })), returnTrip },
        FACTORS,
        REFERENCE_CAR,
      );
    } catch (e) {
      return { error: e instanceof CalcError ? e.message : "Ukjent feil i beregningen." };
    }
  }, [kind, segs, returnTrip, commute, avoided]);

  const result: TripResult | null = calc && "emissionsKg" in calc ? calc : null;
  const calcError = calc && "error" in calc ? calc.error : null;
  const hasFerry = kind === "trip" && segs.some((s) => s.mode === "ferry");

  function goNext() {
    if (step === 1) {
      setAttempted(true);
      if (!canLeavePurpose(purpose)) return;
      setAttempted(false);
      setStep(2);
      return;
    }
    if (step === 2) {
      setAttempted(true);
      if (!canLeaveMode(kind, mode, purpose)) return;
      setAttempted(false);
      setStep(3);
      return;
    }
    if (step === 3) {
      setAttempted(true);
      if (distanceError) return;
      setAttempted(false);
      setStep(4);
    }
  }

  function goBack() {
    setAttempted(false);
    if (step === 1) onCancel();
    else setStep((s) => s - 1);
  }

  function save() {
    if (!result || !purpose) return;
    const base = {
      id: crypto.randomUUID?.() ?? String(Date.now()) + Math.random(),
      date,
      description: description.trim(),
      purpose,
      savedAt: new Date().toISOString(),
      result,
    };
    if (kind === "home_office") onSave({ ...base, kind, oneWayCommuteKm: parseNum(commute), avoided });
    else onSave({ ...base, kind, returnTrip, segments: segs.map((s) => ({ mode: s.mode, distanceKm: parseNum(s.km) })) });
  }

  const update = (key: number, patch: Partial<SegRow>) => setSegs((l) => l.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const modeOptions = tripModes().map((m) => ({
    value: m,
    label: MODE_LABELS[m].nb,
    description: documentedMode(m)
      ? FACTORS.find((f) => f.mode === m)?.lifecycle === false ? "Bare direkte utslipp" : undefined
      : "Mangler kilde",
    disabled: !documentedMode(m),
  }));

  const hint =
    step === 1 && attempted && !purpose ? "Velg om turen er jobb eller privat." :
    step === 2 && attempted && !canLeaveMode(kind, mode, purpose) ? "Velg en reisemåte som har kilde." :
    step === 3 && attempted && distanceError ? distanceError :
    step === 4 && !result ? (calcError ?? "Fyll inn distanse før du kan lagre.") :
    "";

  const nextLabel = step === 4 ? "Lagre i denne nettleseren" : "Neste";
  const nextDisabled = step === 4 ? !result : false;

  return (
    <section className="narrow">
      <ol className="steps" aria-label="Fremgang">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          return (
            <li key={label} aria-current={step === n ? "step" : undefined} className={step > n ? "done" : undefined}>
              {label}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <>
          <h1 ref={headingRef} tabIndex={-1}>Hva slags tur er dette?</h1>
          <p className="muted">Formålet er påkrevd og merkes tydelig på resultatet.</p>
          <SegmentedChoice
            legend="Formål"
            name="purpose"
            layout="purpose"
            value={purpose}
            onChange={(v) => { setPurpose(v); setAttempted(false); }}
            options={[
              { value: "work", label: "Jobb", description: "Reise i jobben", icon: <IconBriefcase /> },
              { value: "private", label: "Privat", description: "Reise på fritiden", icon: <IconUser /> },
            ]}
          />
          {attempted && !purpose ? <p className="field-error" role="alert">Velg om turen er jobb eller privat.</p> : null}
          <div className="privacy">
            <IconLock />
            <div>
              <strong>Personvern</strong>
              <p style={{ margin: "4px 0 0" }}>Formålet merkes på hver tur, slik at jobb og privat holdes fra hverandre. Alt lagres bare i denne nettleseren. Deling med firma og åpent dashbord kommer først når en server er valgt.</p>
            </div>
          </div>
          <div className="notice open">
            <strong>Åpent spørsmål: pendling.</strong> Skal pendling (hjem–jobb) regnes som jobb, som privat eller som en egen kategori? Det er ikke avgjort. Foreløpig velger du selv.
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 ref={headingRef} tabIndex={-1}>Hvordan reiste du?</h1>
          <p className="muted">Velg reisemåte. Alternativer uten godkjent kilde kan ikke brukes.</p>
          <div role="radiogroup" aria-label="Reisemåte" className="grid2">
            {homeOfficeAllowed(purpose) && (
              <button
                type="button"
                role="radio"
                className="tile wide"
                aria-checked={kind === "home_office"}
                onClick={() => chooseMode("home_office")}
              >
                <span className="name">Hjemmekontor</span>
                <span className="sub">Unngått pendling med referansebilen. Bare for jobb.</span>
              </button>
            )}
            {modeOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                className="tile"
                aria-checked={kind === "trip" && mode === o.value}
                aria-disabled={o.disabled || undefined}
                disabled={o.disabled}
                onClick={() => chooseMode(o.value)}
              >
                <span className="name">{o.label}</span>
                {o.description ? <span className="sub">{o.description}</span> : null}
              </button>
            ))}
          </div>
          {attempted && !canLeaveMode(kind, mode, purpose) ? <p className="field-error" role="alert">Velg en reisemåte som har kilde.</p> : null}
          <p className="small muted">Reisemåter merket «mangler kilde» (hybridbil og annet) har ingen godkjent verdi i faktorversjon 1.</p>
        </>
      )}

      {step === 3 && (
        <>
          <h1 ref={headingRef} tabIndex={-1}>{kind === "home_office" ? "Pendleavstand" : "Hvor langt reiste du?"}</h1>
          <Field id="date" label="Dato" type="date" compact value={date} onChange={(e) => setDate(e.target.value)} />
          <Field id="desc" label="Beskrivelse (valgfritt)" type="text" compact value={description} maxLength={200} placeholder="For eksempel møte i byen" onChange={(e) => setDescription(e.target.value)} />

          {kind === "home_office" ? (
            <>
              <Field
                id="commute"
                label="Pendleavstand én vei"
                suffix="km"
                inputMode="decimal"
                value={commute}
                placeholder="0"
                error={attempted ? validateDistance(commute) ?? undefined : undefined}
                onChange={(e) => { setCommute(e.target.value); setAttempted(false); }}
              />
              <p className="lbl" id="avoided-label">Unngått reise</p>
              <SegmentedChoice
                legend="Unngått reise"
                name="avoided"
                layout="cards"
                value={avoided}
                onChange={setAvoided}
                options={[
                  { value: "one_way", label: "Én vei" },
                  { value: "return", label: "Tur-retur" },
                ]}
              />
              <p className="small muted">Hjemmekontor regnes som unngått pendling med referansebilen (bensinbil, 1 person). Ingen fysisk distanse.</p>
            </>
          ) : (
            <>
              {segs.map((s, i) => (
                <div key={s.key} className="segcard">
                  <div className="segtop">
                    <span className="n">Strekning {i + 1}</span>
                    <Button variant="secondary" className="small" disabled={segs.length === 1} onClick={() => setSegs((l) => l.filter((x) => x.key !== s.key))}>Fjern</Button>
                  </div>
                  <label className="lbl" htmlFor={`mode-${s.key}`}>Reisemåte</label>
                  <div className="inp txt" style={{ marginBottom: 10 }}>
                    <select id={`mode-${s.key}`} value={s.mode} onChange={(e) => update(s.key, { mode: e.target.value as Mode })}>
                      {tripModes().map((m) => {
                        const missing = !documentedMode(m);
                        return <option key={m} value={m} disabled={missing}>{MODE_LABELS[m].nb}{missing ? " – mangler kilde" : FACTORS.find((f) => f.mode === m)?.lifecycle === false ? " – bare direkte utslipp" : ""}</option>;
                      })}
                    </select>
                  </div>
                  <Field
                    id={`km-${s.key}`}
                    label="Distanse"
                    suffix="km"
                    inputMode="decimal"
                    value={s.km}
                    placeholder="0"
                    error={attempted ? validateDistance(s.km) ?? undefined : undefined}
                    onChange={(e) => { update(s.key, { km: e.target.value }); setAttempted(false); }}
                  />
                </div>
              ))}
              <Button variant="secondary" onClick={() => setSegs((l) => [...l, { key: seq++, mode: mode ?? "walking", km: "" }])}>+ Legg til strekning</Button>
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={returnTrip}
                onClick={() => setReturnTrip((v) => !v)}
                style={{ marginTop: 12 }}
              >
                <span className="track" />
                Tur-retur (alle strekninger dobles)
              </button>
              {hasFerry && <p className="notice" style={{ marginTop: 12 }}>Ferje: bare direkte utslipp (ikke livsløp). Tallet gjelder Ruters kollektivbåter i Oslofjorden.</p>}
            </>
          )}
        </>
      )}

      {step === 4 && (
        <>
          <h1 ref={headingRef} tabIndex={-1}>Resultat</h1>
          {result && purpose ? (
            <ResultCard
              result={result}
              purpose={purpose}
              kind={kind}
              live
              perSegment={kind === "trip" ? segs.map((s) => ({ mode: s.mode, distanceKm: parseNum(s.km) })) : undefined}
              avoidedKm={kind === "home_office" ? parseNum(commute) * (avoided === "return" ? 2 : 1) : undefined}
              extra={kind === "home_office" ? `Unngått pendling: ${fmtKm(parseNum(commute) * (avoided === "return" ? 2 : 1))} km.` : returnTrip ? "Alle strekninger er regnet som tur-retur." : undefined}
            />
          ) : (
            <p className="notice bad" role="alert">{calcError ?? "Mangler tall til å vise et resultat."}</p>
          )}
        </>
      )}

      <div className="actionbar">
        <div className="in">
          <p className="hint">{hint || `Steg ${step} av 4`}</p>
          <Button variant="secondary" onClick={goBack}>{step === 1 ? "Avbryt" : "Tilbake"}</Button>
          <Button onClick={step === 4 ? save : goNext} disabled={nextDisabled}>{nextLabel}</Button>
        </div>
      </div>
    </section>
  );
}
