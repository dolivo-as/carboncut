import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import { api, serverAvailable } from "../api";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { createPortal } from "react-dom";
import { Plakat } from "../components/Plakat";
import { Qr } from "../components/Qr";
import { SegmentedChoice } from "../components/SegmentedChoice";
import { UTLØP_FORVALGT, type UtloperMaaneder } from "../flowLogic";
import { MODE_LABELS, type TransportMode } from "@calc/factors";
import { fmtDate, fmtKg, fmtKm } from "../format";
import { reiserTekst } from "../dashbordTyper";
import { dashbordUrl, lenkeUrl } from "../route";

export interface Prosjekt { id: string; navn: string; status: string; registrerte_reiser: number; offentlig?: boolean }
export interface Lenke { id: string; prefiks: string; opprettet: string; utloper: string; trukket_tilbake: string | null }
interface NyLenke { token: string; lenke: Lenke; prosjektId?: string }

const KEY = "carboncut.devkey";
const origin = () => window.location.origin;

/**
 * A4-plakaten kan bare skrives ut når admin har tokenet i minnet (rett etter oppretting/fornying, fordi
 * serveren bare lagrer hashen), lenken er aktiv, og prosjektet ikke er arkivert.
 */
export function kanSkriveUtPlakat(
  prosjekt: { id: string; status: string } | null,
  ny: { lenke: Lenke; prosjektId?: string } | null,
  naa = new Date().toISOString(),
): boolean {
  if (!prosjekt || !ny || prosjekt.status !== "aktiv") return false;
  if (ny.prosjektId !== undefined && ny.prosjektId !== prosjekt.id) return false;
  return lenkeStatus(ny.lenke, naa) === "aktiv";
}

/** Skriver ut bare plakaten: body får klassen mens utskriftsdialogen er åpen. */
export function skrivUtPlakat(win: Pick<Window, "print" | "addEventListener"> = window, body: HTMLElement = document.body) {
  body.classList.add("skriver-plakat");
  const rydd = () => body.classList.remove("skriver-plakat");
  win.addEventListener("afterprint", rydd, { once: true });
  win.print();
}

export function lenkeStatus(l: Lenke, naa = new Date().toISOString()): "aktiv" | "utlopt" | "trukket" {
  if (l.trukket_tilbake) return "trukket";
  return l.utloper <= naa ? "utlopt" : "aktiv";
}
const STATUS_TEKST = { aktiv: "Aktiv", utlopt: "Utløpt", trukket: "Trukket tilbake" } as const;

export const erArkivert = (status: string) => status !== "aktiv";

/** UX/CTO 14.11: aktive prosjekter øverst, arkiverte for seg (i en lukket <details>). Rekkefølgen beholdes. */
export function delProsjekter<T extends { status: string }>(ps: T[]): { aktive: T[]; arkiverte: T[] } {
  return { aktive: ps.filter((p) => !erArkivert(p.status)), arkiverte: ps.filter((p) => erArkivert(p.status)) };
}

/** Tekster godkjent av UX/CTO 14.11. */
export const ARKIV_TEKST = {
  tittel: (navn: string) => `Arkivere ${navn}?`,
  brod: "Lenken og QR-koden slutter å virke for godt, og prosjektet tar ikke imot nye reiser. Tallene på dashbordet blir stående. Du kan gjenopprette prosjektet senere, men da må du lage en ny lenke.",
  gjenopprettInfo: "Prosjektet tar imot reiser igjen når du lager en ny lenke. Gamle lenker og QR-plakater virker ikke lenger.",
  gjenopprettetStatus: "Prosjektet er gjenopprettet. Lag en ny lenke med «Lag ny lenke» før du deler eller skriver ut QR-koden igjen.",
  arkivertStatus: "Prosjektet er arkivert. Lenken og QR-koden virker ikke lenger. Tallene på dashbordet blir stående.",
} as const;

/** Bekreftelse før arkivering. Fokus starter på «Avbryt» (UX 14.11). */
export function ArkiverDialog({ navn, onArkiver, onAvbryt }: { navn: string; onArkiver: () => void; onAvbryt: () => void }) {
  const avbryt = useRef<HTMLButtonElement>(null);
  useEffect(() => { avbryt.current?.focus(); }, []);
  return (
    <div className="arkiv-dialog" role="alertdialog" aria-labelledby="arkiv-tittel" aria-describedby="arkiv-brod">
      <h3 id="arkiv-tittel" style={{ fontSize: 17, margin: "0 0 6px" }}>{ARKIV_TEKST.tittel(navn)}</h3>
      <p id="arkiv-brod" className="small" style={{ margin: "0 0 12px" }}>{ARKIV_TEKST.brod}</p>
      <div className="row-actions">
        <Button variant="secondary" onClick={onArkiver}>Arkiver</Button>
        <button ref={avbryt} type="button" className="btn" onClick={onAvbryt}>Avbryt</button>
      </div>
    </div>
  );
}

/**
 * Nederst i prosjektkortet, under lenkehandlingene med skillelinje over (UX 14.11).
 * Aktivt prosjekt: sekundær tekstknapp «Arkiver prosjekt…» (ikke rød), eller bekreftelsen.
 * Arkivert prosjekt: «Gjenopprett prosjekt» uten advarsel, med CTOs tekst.
 */
export function Arkivering({ navn, status, bekrefter, onBe, onBekreft, onAvbryt, onGjenopprett, gjenopprettRef }: {
  navn: string;
  status: string;
  bekrefter: boolean;
  onBe: () => void;
  onBekreft: () => void;
  onAvbryt: () => void;
  onGjenopprett: () => void;
  /** Etter arkivering går fokus hit (UX 14.11). */
  gjenopprettRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <div className="arkiv" style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--edge)" }}>
      {erArkivert(status) ? (
        <>
          <p className="small" style={{ margin: "0 0 8px" }}>{ARKIV_TEKST.gjenopprettInfo}</p>
          <button ref={gjenopprettRef} type="button" className="btn secondary" onClick={onGjenopprett}>Gjenopprett prosjekt</button>
        </>
      ) : bekrefter ? (
        <ArkiverDialog navn={navn} onArkiver={onBekreft} onAvbryt={onAvbryt} />
      ) : (
        <button type="button" className="linkbtn" onClick={onBe}>Arkiver prosjekt…</button>
      )}
    </div>
  );
}

/** Én rad i prosjektlista. Arkiverte har tekstmerket «Arkivert», ikke bare grå farge. */
export function ProsjektRad({ p, valgt, onVelg }: { p: Prosjekt; valgt: boolean; onVelg: () => void }) {
  return (
    <li>
      <button type="button" className="prow" aria-pressed={valgt} onClick={onVelg}>
        <span className="t">{p.navn}{erArkivert(p.status) && <> <span className="tag none">Arkivert</span></>}</span>
        <span className="small muted">
          {reiserTekst(p.registrerte_reiser)}
          {p.offentlig === false ? " · skjult dashbord" : ""}
        </span>
      </button>
    </li>
  );
}

export function ProsjektListe({ prosjekter, valgt, onVelg }: { prosjekter: Prosjekt[]; valgt: string | null; onVelg: (id: string) => void }) {
  const { aktive, arkiverte } = delProsjekter(prosjekter);
  return (
    <>
      {aktive.length === 0 ? <p className="muted">Ingen aktive prosjekter.</p> : (
        <ul className="plist">{aktive.map((p) => <ProsjektRad key={p.id} p={p} valgt={valgt === p.id} onVelg={() => onVelg(p.id)} />)}</ul>
      )}
      {arkiverte.length > 0 && (
        <details className="arkiv-liste" style={{ marginTop: 12 }}>
          <summary>Arkiverte prosjekter ({arkiverte.length})</summary>
          <ul className="plist" style={{ marginTop: 8 }}>{arkiverte.map((p) => <ProsjektRad key={p.id} p={p} valgt={valgt === p.id} onVelg={() => onVelg(p.id)} />)}</ul>
        </details>
      )}
    </>
  );
}

/**
 * Aktivt prosjekt uten noen aktiv lenke (f.eks. etter gjenoppretting, når arkiveringen har trukket tilbake
 * alle): knappen på prosjektnivå heter da «Lag ny lenke» (UX/CTO 14.11), ellers «Lag ny delelenke».
 * Begge lager en ny lenke; gamle, tilbaketrukne lenker forblir tilbaketrukket.
 */
export function ingenAktivLenke(status: string, lenker: Lenke[], naa = new Date().toISOString()): boolean {
  return !erArkivert(status) && !lenker.some((l) => lenkeStatus(l, naa) === "aktiv");
}
export const lagLenkeTekst = (ingenAktiv: boolean) => (ingenAktiv ? "Lag ny lenke" : "Lag ny delelenke");

export interface AdminReise { id: string; uke: number; aar: number; transportmiddel: string; distanse_km: number; tur_retur: boolean; utslipp_kg: number; referanse_kg: number; skjult: boolean }
export interface ReiseSvar { reiser: AdminReise[]; totalt: number; skjulte: number; maks: number }

export const REISE_TEKST = {
  intro: "Skjul reiser som er registrert feil. Skjulte reiser telles ikke i dashbordet eller i summene, men de slettes ikke, og du kan vise dem igjen.",
  skjult: "Reisen er skjult og telles ikke lenger med.",
  vist: "Reisen vises igjen og telles med.",
} as const;

const modeNavn = (k: string) => MODE_LABELS[k as TransportMode]?.nb ?? k;

/** «Uke 46», eller «Uke 46, 2026» når lista spenner over flere uke-år (CTO 14.11: uke, ikke dag). */
export function ukeTekst(r: Pick<AdminReise, "uke" | "aar">, flereAar: boolean): string {
  return flereAar ? `Uke ${r.uke}, ${r.aar}` : `Uke ${r.uke}`;
}
export const flereAar = (rs: Pick<AdminReise, "aar">[]) => new Set(rs.map((r) => r.aar)).size > 1;

/** Én linje som beskriver reisen uten persondata: uke, transportmiddel, eksakt km og tur-retur. */
export function reiseLinje(r: AdminReise, visAar = false): string {
  const km = r.transportmiddel === "home_office" ? `${fmtKm(r.distanse_km)} km unngått` : `${fmtKm(r.distanse_km)} km`;
  return [ukeTekst(r, visAar), modeNavn(r.transportmiddel), km, r.tur_retur ? "tur-retur" : null].filter(Boolean).join(" · ");
}

/** Skjermbildet «Registrerte reiser» for valgt prosjekt (punkt 2 etter 16.11). */
export function ReiseListe({ svar, status, onSkjul, onVis }: {
  svar: ReiseSvar | null;
  status: string;
  onSkjul: (id: string) => void;
  onVis: (id: string) => void;
}) {
  const visAar = svar ? flereAar(svar.reiser) : false;
  return (
    <>
      <p className="small muted">{REISE_TEKST.intro}</p>
      <div aria-live="polite">{status && <p className="notice">{status}</p>}</div>
      {svar === null ? <p className="muted">Henter …</p> : svar.reiser.length === 0 ? <p className="muted">Ingen registrerte reiser ennå.</p> : (
        <>
          <p className="small">
            {reiserTekst(svar.totalt)}{svar.skjulte > 0 ? `, ${svar.skjulte} skjult` : ""}.
            {svar.totalt > svar.reiser.length ? ` Viser de ${svar.reiser.length} nyeste.` : ""}
          </p>
          <ul className="plist">
            {svar.reiser.map((r) => (
              <li key={r.id} className="lrow reise-rad">
                <div className="reise-tekst">
                  <span className="t">{reiseLinje(r, visAar)}</span>
                  {r.skjult && <> <span className="tag none">Skjult</span></>}
                  <span className="small muted reise-spart">Estimert spart {fmtKg(r.referanse_kg - r.utslipp_kg)} kg CO₂e</span>
                </div>
                {/* Én knapp som bytter tekst, så fokus blir på samme knapp etter skjul/vis (UX 14.11). */}
                <button type="button" className="btn secondary reise-knapp" onClick={() => (r.skjult ? onVis(r.id) : onSkjul(r.id))}>
                  {r.skjult ? "Vis igjen" : "Skjul"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** «Registrerte reiser (n)» som lukket <details> (UX 14.11). n = alle reiser, også skjulte. */
export function ReiseKort(props: Parameters<typeof ReiseListe>[0]) {
  const n = props.svar?.totalt;
  return (
    <details className="reise-kort">
      <summary><h2 style={{ display: "inline", fontSize: "inherit" }}>{n === undefined ? "Registrerte reiser" : `Registrerte reiser (${n})`}</h2></summary>
      <div style={{ marginTop: 12 }}><ReiseListe {...props} /></div>
    </details>
  );
}

export function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY) ?? "");
  const [keyInput, setKeyInput] = useState("");
  const [prosjekter, setProsjekter] = useState<Prosjekt[] | null>(null);
  const [feil, setFeil] = useState<string | null>(null);
  const [navn, setNavn] = useState("");
  const [utloper, setUtloper] = useState<UtloperMaaneder>(UTLØP_FORVALGT);
  const [offentlig, setOffentlig] = useState(true);
  const [valgt, setValgt] = useState<string | null>(null);
  const [lenker, setLenker] = useState<Lenke[]>([]);
  const [ny, setNy] = useState<NyLenke | null>(null);
  const [visQr, setVisQr] = useState(true);
  const [bekreft, setBekreft] = useState<string | null>(null);
  const [bekreftArkiv, setBekreftArkiv] = useState(false);
  const [arkivStatus, setArkivStatus] = useState("");
  const [reiser, setReiser] = useState<ReiseSvar | null>(null);
  const [reiseStatus, setReiseStatus] = useState("");
  const [fokus, setFokus] = useState<null | "gjenopprett" | "lagLenke">(null);
  const kortRef = useRef<HTMLElement>(null);
  const lagLenkeRef = useRef<HTMLButtonElement>(null);
  const gjenopprettRef = useRef<HTMLButtonElement>(null);
  const [kopiert, setKopiert] = useState(false);
  const h1 = useRef<HTMLHeadingElement>(null);
  const nyRef = useRef<HTMLDivElement>(null);
  useEffect(() => { h1.current?.focus(); }, []);
  useEffect(() => { if (ny) nyRef.current?.focus(); }, [ny]);

  const hent = useCallback(async () => {
    if (!key) return;
    const r = await api<{ prosjekter: Prosjekt[] }>("/api/admin/prosjekter", { adminKey: key });
    if (r.ok) { setProsjekter(r.data.prosjekter); setFeil(null); }
    else {
      setFeil(r.status === 401 ? "Feil dev-nøkkel." : r.feil);
      if (r.status === 401) { sessionStorage.removeItem(KEY); setKey(""); }
    }
  }, [key]);
  useEffect(() => { void hent(); }, [hent]);

  const hentLenker = useCallback(async (id: string) => {
    const r = await api<{ lenker: Lenke[] }>(`/api/admin/prosjekter/${id}/lenker`, { adminKey: key });
    if (r.ok) setLenker(r.data.lenker); else setFeil(r.feil);
  }, [key]);
  useEffect(() => { if (valgt) void hentLenker(valgt); }, [valgt, hentLenker]);

  const hentReiser = useCallback(async (id: string) => {
    const r = await api<ReiseSvar>(`/api/admin/prosjekter/${id}/reiser`, { adminKey: key });
    if (r.ok) setReiser(r.data); else setFeil(r.feil);
  }, [key]);
  useEffect(() => { setReiser(null); setReiseStatus(""); if (valgt) void hentReiser(valgt); }, [valgt, hentReiser]);

  async function settSkjult(id: string, skjul: boolean) {
    setReiseStatus("");
    const r = await api(`/api/admin/reiser/${id}/${skjul ? "skjul" : "vis"}`, { method: "POST", adminKey: key });
    if (!r.ok) { setFeil(r.feil); return; }
    setFeil(null);
    if (valgt) await hentReiser(valgt);
    await hent();
    setReiseStatus(skjul ? REISE_TEKST.skjult : REISE_TEKST.vist);
  }

  async function opprettProsjekt() {
    const r = await api<{ prosjekt: Prosjekt; token: string; lenke: Lenke }>("/api/admin/prosjekter", {
      method: "POST",
      adminKey: key,
      body: JSON.stringify({ navn, utloper_maaneder: utloper, offentlig }),
    });
    if (!r.ok) { setFeil(r.feil); return; }
    setNavn(""); setUtloper(UTLØP_FORVALGT); setOffentlig(true); setFeil(null);
    setKopiert(false); setVisQr(true);
    setNy({ token: r.data.token, lenke: r.data.lenke, prosjektId: r.data.prosjekt.id });
    await hent();
    setValgt(r.data.prosjekt.id);
  }
  async function lagLenke(sti: string, maaneder?: UtloperMaaneder) {
    setNy(null); setKopiert(false); setVisQr(true);
    const r = await api<NyLenke>(sti, {
      method: "POST",
      adminKey: key,
      body: maaneder ? JSON.stringify({ utloper_maaneder: maaneder }) : undefined,
    });
    if (!r.ok) { setFeil(r.feil); return; }
    setNy({ ...r.data, prosjektId: valgt ?? undefined }); setFeil(null);
    if (valgt) await hentLenker(valgt);
  }
  async function trekk(id: string) {
    setBekreft(null);
    const r = await api(`/api/admin/lenker/${id}/trekk-tilbake`, { method: "POST", adminKey: key });
    if (!r.ok) setFeil(r.feil);
    if (valgt) await hentLenker(valgt);
  }

  async function settArkiv(id: string, handling: "arkiver" | "gjenopprett") {
    setBekreftArkiv(false);
    setArkivStatus("");
    const r = await api(`/api/admin/prosjekter/${id}/${handling}`, { method: "POST", adminKey: key });
    if (!r.ok) { setFeil(r.feil); return; }
    setFeil(null); setNy(null);
    await hent();
    await hentLenker(id);
    // Etter arkivering: fokus til «Gjenopprett prosjekt». Etter gjenoppretting: fokus til «Lag ny lenke» (UX 14.11).
    setArkivStatus(handling === "arkiver" ? ARKIV_TEKST.arkivertStatus : ARKIV_TEKST.gjenopprettetStatus);
    setFokus(handling === "arkiver" ? "gjenopprett" : "lagLenke");
  }
  useEffect(() => {
    if (!fokus) return;
    const el = (fokus === "lagLenke" ? lagLenkeRef.current : gjenopprettRef.current) ?? kortRef.current;
    if (el) { el.focus(); setFokus(null); }
  }, [fokus, lenker, prosjekter]);

  if (!serverAvailable()) {
    return <section className="narrow"><h1 ref={h1} tabIndex={-1}>Admin</h1><p className="notice">Serveren er ikke satt opp ennå.</p></section>;
  }

  if (!key) {
    return (
      <section className="narrow">
        <h1 ref={h1} tabIndex={-1}>Admin</h1>
        <p className="notice open"><strong>Midlertidig innlogging for lokal utvikling.</strong> Byttes ut med ekte innlogging før serveren tas i bruk.</p>
        {feil && <p className="notice bad" role="alert">{feil}</p>}
        <form onSubmit={(e) => { e.preventDefault(); sessionStorage.setItem(KEY, keyInput); setKey(keyInput); setKeyInput(""); }}>
          <Field id="devkey" label="Dev-nøkkel" type="password" compact autoComplete="off" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} hint="Står i server/.dev.vars (ADMIN_DEV_KEY). Lagres bare i denne fanen." />
          <Button type="submit" disabled={!keyInput}>Logg inn</Button>
        </form>
      </section>
    );
  }

  const prosjekt = prosjekter?.find((p) => p.id === valgt) ?? null;
  const url = ny ? lenkeUrl(origin(), ny.token) : "";
  const plakat = kanSkriveUtPlakat(prosjekt, ny);

  return (
    <section className="admin-page">
      <h1 ref={h1} tabIndex={-1}>Admin</h1>
      <p className="small muted">Midlertidig dev-innlogging. <button type="button" className="linkbtn" onClick={() => { sessionStorage.removeItem(KEY); setKey(""); setProsjekter(null); setNy(null); }}>Logg ut</button></p>
      <div role="alert">{feil && <p className="notice bad">{feil}</p>}</div>

      {ny && (
        <section className="card reveal" aria-labelledby="ny-tittel">
          <div className="confirm" ref={nyRef} tabIndex={-1} role="status" id="ny-tittel">
            Prosjektet er opprettet. Lenken vises bare nå – kopier den eller vis QR-koden.
          </div>
          <p className="notice"><strong>Lenken vises bare nå.</strong> Serveren lagrer den ikke og kan ikke vise den igjen.</p>
          <label className="lbl" htmlFor="delelenke">Delelenke for registrering</label>
          <p id="delelenke" className="linkbox">{url}</p>
          <div className="row-actions">
            <Button onClick={async () => { try { await navigator.clipboard.writeText(url); setKopiert(true); } catch { setKopiert(false); } }}>
              {kopiert ? "Kopiert" : "Kopier lenke"}
            </Button>
            <Button variant="secondary" onClick={() => setVisQr((v) => !v)}>
              {visQr ? "Skjul QR-kode" : "Vis QR-kode"}
            </Button>
            {plakat && <Button variant="secondary" onClick={() => skrivUtPlakat()}>Skriv ut A4-plakat</Button>}
          </div>
          {plakat && prosjekt && ny && createPortal(<Plakat navn={prosjekt.navn} url={url} gyldigTil={ny.lenke.utloper} />, document.body)}
          {visQr && <Qr text={url} label="QR-kode for delelenken" />}
          <p className="small muted" style={{ marginTop: 10 }}>
            Gyldig til {fmtDate(ny.lenke.utloper)}. Lenken gir bare rett til å registrere jobbreiser på prosjektet.
          </p>
        </section>
      )}

      {!ny && <section className="card" aria-labelledby="nytt-tittel">
        <h2 id="nytt-tittel">Nytt prosjekt</h2>
        <p className="muted small">Bare prosjektnavn. Ingen navn på ansatte, og ingen fritekst om personer.</p>
        <form onSubmit={(e) => { e.preventDefault(); void opprettProsjekt(); }}>
          <Field id="pnavn" label="Prosjektnavn" type="text" compact maxLength={80} value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Prosjektnavn" />
          <p className="lbl" id="utloper-label">Lenken utløper</p>
          <SegmentedChoice
            legend="Lenken utløper"
            name="utloper"
            layout="tiles3"
            value={String(utloper)}
            onChange={(v) => setUtloper(Number(v) as UtloperMaaneder)}
            options={[
              { value: "3", label: "3 mnd" },
              { value: "6", label: "6 mnd" },
              { value: "12", label: "12 mnd" },
            ]}
          />
          <p className="lbl" id="dash-label" style={{ marginTop: 12 }}>Dashbord</p>
          <SegmentedChoice
            legend="Dashbord"
            name="offentlig"
            layout="tiles"
            value={offentlig ? "ja" : "nei"}
            onChange={(v) => setOffentlig(v === "ja")}
            options={[
              { value: "ja", label: "Offentlig (bare summer)" },
              { value: "nei", label: "Skjult" },
            ]}
          />
          <div className="row-actions" style={{ marginTop: 16 }}>
            <Button type="submit" disabled={navn.trim().length < 2}>Opprett og lag lenke</Button>
          </div>
        </form>
      </section>}

      <section className="card" aria-labelledby="p-tittel">
        <h2 id="p-tittel">Prosjekter</h2>
        {prosjekter === null ? <p className="muted">Henter …</p> : prosjekter.length === 0 ? <p className="muted">Ingen prosjekter ennå.</p> : (
          <ProsjektListe prosjekter={prosjekter} valgt={valgt} onVelg={(id) => { setValgt(id); setNy(null); setBekreftArkiv(false); setArkivStatus(""); }} />
        )}
      </section>

      {prosjekt && (
        <section className="card" aria-labelledby="l-tittel" ref={kortRef} tabIndex={-1}>
          <h2 id="l-tittel">{prosjekt.navn}{erArkivert(prosjekt.status) && <> <span className="tag none">Arkivert</span></>}</h2>
          <div aria-live="polite">{arkivStatus && <p className="notice">{arkivStatus}</p>}</div>
          <h3 style={{ fontSize: 17 }}>Delelenker</h3>
          {prosjekt.offentlig !== false
            ? <p className="small"><a href={dashbordUrl(origin(), prosjekt.id)}>Åpent dashbord for prosjektet</a></p>
            : <p className="small muted">Dashbordet er skjult. Det gir samme svar som et ukjent prosjekt.</p>}
          {(() => {
            const ingen = ingenAktivLenke(prosjekt.status, lenker);
            return (
              <button ref={lagLenkeRef} type="button" className={ingen ? "btn" : "btn secondary"} disabled={prosjekt.status !== "aktiv"}
                onClick={() => void lagLenke(`/api/admin/prosjekter/${prosjekt.id}/lenker`, utloper)}>
                {lagLenkeTekst(ingen)}
              </button>
            );
          })()}
          {lenker.length === 0 ? <p className="muted" style={{ marginTop: 12 }}>Ingen lenker ennå.</p> : (
            <ul className="plist" style={{ marginTop: 12 }}>
              {lenker.map((l) => {
                const s = lenkeStatus(l);
                return (
                  <li key={l.id} className="lrow">
                    <div>
                      <span className="t mono">{l.prefiks}…</span> <span className={`tag ${s === "aktiv" ? "work" : "none"}`}>{STATUS_TEKST[s]}</span>
                      <p className="small muted" style={{ margin: "4px 0 0" }}>Laget {fmtDate(l.opprettet)} · {s === "trukket" ? `trukket ${fmtDate(l.trukket_tilbake!)}` : `gyldig til ${fmtDate(l.utloper)}`}</p>
                    </div>
                    {s === "aktiv" && !erArkivert(prosjekt.status) && (
                      <div className="row-actions">
                        {bekreft === l.id ? (
                          <>
                            <Button variant="danger" onClick={() => void trekk(l.id)}>Bekreft: trekk tilbake</Button>
                            <Button variant="secondary" onClick={() => setBekreft(null)}>Avbryt</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="secondary" onClick={() => setBekreft(l.id)}>Trekk tilbake…</Button>
                            <Button variant="secondary" onClick={() => void lagLenke(`/api/admin/lenker/${l.id}/forny`)}>Forny</Button>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="small muted" style={{ marginTop: 10 }}>«Forny» trekker tilbake den gamle lenken og lager en ny i samme operasjon. Personer med den gamle lenken kan ikke registrere mer.</p>
          <Arkivering
            navn={prosjekt.navn}
            status={prosjekt.status}
            bekrefter={bekreftArkiv}
            onBe={() => setBekreftArkiv(true)}
            onBekreft={() => void settArkiv(prosjekt.id, "arkiver")}
            onAvbryt={() => setBekreftArkiv(false)}
            onGjenopprett={() => void settArkiv(prosjekt.id, "gjenopprett")}
            gjenopprettRef={gjenopprettRef}
          />
        </section>
      )}

      {prosjekt && (
        <section className="card">
          <ReiseKort svar={reiser} status={reiseStatus} onSkjul={(id) => void settSkjult(id, true)} onVis={(id) => void settSkjult(id, false)} />
        </section>
      )}
    </section>
  );
}
