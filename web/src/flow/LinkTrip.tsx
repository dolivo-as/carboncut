import { useEffect, useMemo, useRef, useState } from "react";
import { calculateHomeOffice, calculateTrip, CalcError, type TripResult } from "@calc/calc";
import { FACTORS, MODE_LABELS, REFERENCE_CAR } from "@calc/factors";
import { api } from "../api";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { IconBriefcase } from "../components/Icons";
import { KmChips } from "../components/KmChips";
import { SegmentedChoice } from "../components/SegmentedChoice";
import {
  canLeaveMode, documentedMode, ovrigeModuser, validateDistance,
  VANLIGE_MODUSER, type Kind, type Mode,
} from "../flowLogic";
import { fmtKg, parseNum } from "../format";
import { toServerPayload } from "../serverPayload";
import { loadTrips, saveTrips, type StoredTrip } from "../storage";

export interface LenkeProsjekt { id: string; navn: string; offentlig: boolean }

const today = () => new Date().toISOString().slice(0, 10);

function modeOptions(modes: Mode[]) {
  return modes.map((m) => ({
    value: m,
    label: MODE_LABELS[m].nb,
    description: documentedMode(m)
      ? FACTORS.find((f) => f.mode === m)?.lifecycle === false ? "Bare direkte utslipp" : undefined
      : "Mangler kilde",
    disabled: !documentedMode(m),
  }));
}

export function LinkTrip({ token, prosjekt }: { token: string; prosjekt: LenkeProsjekt }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<Kind>("trip");
  const [mode, setMode] = useState<Mode | null>(null);
  const [visAlle, setVisAlle] = useState(false);
  const [km, setKm] = useState("");
  const [returnTrip, setReturnTrip] = useState(true);
  const [attempted, setAttempted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lagret, setLagret] = useState<{ savingsKg: number } | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const thanksRef = useRef<HTMLDivElement>(null);
  const sendErrorRef = useRef<HTMLParagraphElement>(null);
  // Når innsendingen feiler, er «Send inn» deaktivert mens den sender; flytt fokus til feilmeldingen så tastaturbrukeren ikke havner på body.
  useEffect(() => { if (sendError) sendErrorRef.current?.focus(); }, [sendError]);

  useEffect(() => {
    if (step === 3) thanksRef.current?.focus();
    else headingRef.current?.focus();
  }, [step]);

  function choose(next: Mode | "home_office") {
    if (next === "home_office") {
      setKind("home_office");
      setMode(null);
      return;
    }
    if (!documentedMode(next)) return;
    setKind("trip");
    setMode(next);
  }

  const distanceError = validateDistance(km);
  const calc = useMemo(() => {
    try {
      if (distanceError) return null;
      const n = parseNum(km);
      if (kind === "home_office") {
        return calculateHomeOffice({ oneWayCommuteKm: n, avoided: returnTrip ? "return" : "one_way" }, REFERENCE_CAR);
      }
      if (!mode) return null;
      return calculateTrip({ segments: [{ mode, distanceKm: n }], returnTrip }, FACTORS, REFERENCE_CAR);
    } catch (e) {
      return { error: e instanceof CalcError ? e.message : "Ukjent feil i beregningen." };
    }
  }, [kind, mode, km, returnTrip, distanceError]);

  const result: TripResult | null = calc && "emissionsKg" in calc ? calc : null;

  function startPaNytt() {
    setStep(1);
    setKind("trip");
    setMode(null);
    setVisAlle(false);
    setKm("");
    setReturnTrip(true);
    setAttempted(false);
    setSending(false);
    setSendError(null);
    setLagret(null);
  }

  async function send() {
    if (!result || sending) return;
    setAttempted(true);
    if (distanceError || !canLeaveMode(kind, mode, "work")) return;
    const base = {
      id: crypto.randomUUID?.() ?? String(Date.now()) + Math.random(),
      date: today(),
      description: "",
      purpose: "work" as const,
      savedAt: new Date().toISOString(),
      result,
    };
    const trip: StoredTrip = kind === "home_office"
      ? { ...base, kind, oneWayCommuteKm: parseNum(km), avoided: returnTrip ? "return" : "one_way" }
      : { ...base, kind, returnTrip, segments: [{ mode: mode!, distanceKm: parseNum(km) }] };
    const payload = toServerPayload(trip, token, honeypotRef.current?.value ?? "");
    if (!payload) return;
    setSending(true);
    setSendError(null);
    try {
      const r = await api<unknown>("/api/reiser", { method: "POST", body: JSON.stringify(payload) });
      if (!r.ok) {
        setSendError(r.status === 404
          ? "Lenken er ikke gyldig lenger. Turen er ikke sendt. Be om en ny lenke."
          : `Turen er ikke sendt: ${r.feil}`);
        return;
      }
      trip.sentTo = prosjekt.navn;
      saveTrips([trip, ...loadTrips()]);
      setLagret({ savingsKg: result.savingsKg });
      setStep(3);
    } finally {
      setSending(false);
    }
  }

  const skjulte = ovrigeModuser().length + 1; // øvrige + hjemmekontor
  const merke = kind === "home_office"
    ? `Hjemmekontor · ${prosjekt.navn}`
    : mode
      ? `${MODE_LABELS[mode].nb} · ${prosjekt.navn}`
      : `Jobbreise · ${prosjekt.navn}`;

  return (
    <section className="narrow">
      <div className="hp" aria-hidden="true">
        <label htmlFor="nettside">Ikke fyll ut dette feltet</label>
        <input id="nettside" name="nettside" type="text" tabIndex={-1} autoComplete="off" ref={honeypotRef} defaultValue="" />
      </div>

      {step < 3 && (
        <p className="tag work" style={{ marginBottom: 10 }}>
          <IconBriefcase width="14" height="14" />
          {merke}
        </p>
      )}

      {step === 1 && (
        <>
          <h1 ref={headingRef} tabIndex={-1}>Hvordan reiste du i dag?</h1>
          <p className="muted">Ingen innlogging. Vi lagrer ikke navn, og ikke IP-adressen din.</p>
          <div role="radiogroup" aria-label="Reisemåte" className="grid2">
            {modeOptions(VANLIGE_MODUSER).map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                className="tile"
                aria-checked={kind === "trip" && mode === o.value}
                aria-disabled={o.disabled || undefined}
                disabled={o.disabled}
                onClick={() => choose(o.value)}
              >
                <span className="name">{o.label}</span>
                {o.description ? <span className="sub">{o.description}</span> : null}
              </button>
            ))}
            {visAlle && (
              <button
                type="button"
                role="radio"
                className="tile wide"
                aria-checked={kind === "home_office"}
                onClick={() => choose("home_office")}
              >
                <span className="name">Hjemmekontor</span>
                <span className="sub">Unngått pendling med referansebilen. Bare for jobb.</span>
              </button>
            )}
            {visAlle && modeOptions(ovrigeModuser()).map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                className="tile"
                aria-checked={kind === "trip" && mode === o.value}
                aria-disabled={o.disabled || undefined}
                disabled={o.disabled}
                onClick={() => choose(o.value)}
              >
                <span className="name">{o.label}</span>
                {o.description ? <span className="sub">{o.description}</span> : null}
              </button>
            ))}
          </div>
          {!visAlle && (
            <button type="button" className="linkbtn" onClick={() => setVisAlle(true)}>
              Vis alle reisemåter ({skjulte} til)
            </button>
          )}
          {attempted && !canLeaveMode(kind, mode, "work") ? <p className="field-error" role="alert">Velg en reisemåte som har kilde.</p> : null}
        </>
      )}

      {step === 2 && (
        <>
          <h1 ref={headingRef} tabIndex={-1}>{kind === "home_office" ? "Pendleavstand én vei?" : "Hvor langt én vei?"}</h1>
          <Field
            id="link-km"
            label={kind === "home_office" ? "Pendleavstand én vei" : "Kilometer én vei"}
            suffix="km"
            inputMode="decimal"
            value={km}
            placeholder="0"
            error={attempted ? distanceError ?? undefined : undefined}
            onChange={(e) => { setKm(e.target.value); setAttempted(false); }}
          />
          <KmChips value={km} onPick={(n) => { setKm(String(n).replace(".", ",")); setAttempted(false); }} />
          <p className="lbl" id="turretur-label">Tur-retur?</p>
          <SegmentedChoice
            legend="Tur-retur?"
            name="turretur"
            layout="tiles"
            value={returnTrip ? "ja" : "nei"}
            onChange={(v) => setReturnTrip(v === "ja")}
            options={[
              { value: "ja", label: "Ja, tur-retur" },
              { value: "nei", label: "Nei, én vei" },
            ]}
          />
          <div className="card" style={{ marginTop: 14 }} aria-live="polite" aria-atomic="true">
            {result ? (
              <>
                <p className="small muted" style={{ margin: 0 }}>Du sparer cirka</p>
                <p className="big accent" style={{ fontSize: 44, margin: "4px 0" }}>
                  {fmtKg(result.savingsKg)} <span className="unit">kg CO₂e</span>
                </p>
                <p className="small" style={{ margin: 0 }}>mot bensinbil alene. Tallet oppdateres mens du skriver.</p>
              </>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>Tallet oppdateres mens du skriver.</p>
            )}
          </div>
          {sendError && <p className="notice bad" role="alert" ref={sendErrorRef} tabIndex={-1}>{sendError}</p>}
        </>
      )}

      {step === 3 && lagret && (
        <>
          <div className="confirm" ref={thanksRef} tabIndex={-1} role="status">
            Takk! Reisen er registrert på {prosjekt.navn}.
          </div>
          <div className="card">
            <p style={{ margin: 0 }}>
              <b>{fmtKg(lagret.savingsKg)} kg CO₂e</b> spart mot bensinbil alene.
            </p>
          </div>
          {prosjekt.offentlig ? (
            <Button onClick={() => { window.location.hash = `#/dashbord/${prosjekt.id}`; }}>
              Se prosjektets dashbord
            </Button>
          ) : null}
          <Button variant={prosjekt.offentlig ? "secondary" : "primary"} onClick={startPaNytt} style={{ marginTop: 10 }}>
            Registrer en til
          </Button>
          <p className="small muted" style={{ marginTop: 14 }}>
            Feil? Reisen kan ikke endres, fordi vi ikke vet hvem du er. Kontakt prosjektets admin.
          </p>
        </>
      )}

      {step < 3 && (
        <div className="actionbar">
          <div className={step === 1 ? "in one" : "in"}>
            {step === 2 && <Button variant="secondary" onClick={() => { setAttempted(false); setStep(1); }}>Tilbake</Button>}
            {step === 1 && (
              <Button
                onClick={() => {
                  setAttempted(true);
                  if (!canLeaveMode(kind, mode, "work")) return;
                  setAttempted(false);
                  setStep(2);
                }}
              >
                Neste
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => void send()} disabled={!result || sending}>
                {sending ? "Sender …" : "Send inn"}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
