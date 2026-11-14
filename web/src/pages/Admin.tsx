import { useCallback, useEffect, useRef, useState } from "react";
import { api, serverAvailable } from "../api";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Qr } from "../components/Qr";
import { SegmentedChoice } from "../components/SegmentedChoice";
import { UTLØP_FORVALGT, type UtloperMaaneder } from "../flowLogic";
import { fmtDate } from "../format";
import { reiserTekst } from "../dashbordTyper";
import { dashbordUrl, lenkeUrl } from "../route";

interface Prosjekt { id: string; navn: string; status: string; registrerte_reiser: number; offentlig?: boolean }
interface Lenke { id: string; prefiks: string; opprettet: string; utloper: string; trukket_tilbake: string | null }
interface NyLenke { token: string; lenke: Lenke }

const KEY = "carboncut.devkey";
const origin = () => window.location.origin;

export function lenkeStatus(l: Lenke, naa = new Date().toISOString()): "aktiv" | "utlopt" | "trukket" {
  if (l.trukket_tilbake) return "trukket";
  return l.utloper <= naa ? "utlopt" : "aktiv";
}
const STATUS_TEKST = { aktiv: "Aktiv", utlopt: "Utløpt", trukket: "Trukket tilbake" } as const;

export const erArkivert = (status: string) => status !== "aktiv";

/**
 * Arkiver / gjenopprett for valgt prosjekt. Arkivering sletter ingenting: delelenkene slutter å virke og nye
 * reiser avvises så lenge prosjektet er arkivert. Gjenoppretting gjør lenker som ikke er trukket tilbake
 * eller utløpt, gyldige igjen.
 */
export function Arkivering({ status, bekrefter, onBe, onBekreft, onAvbryt, onGjenopprett }: {
  status: string;
  bekrefter: boolean;
  onBe: () => void;
  onBekreft: () => void;
  onAvbryt: () => void;
  onGjenopprett: () => void;
}) {
  if (erArkivert(status)) {
    return (
      <div className="arkiv" style={{ marginTop: 16 }}>
        <p className="notice" role="status">
          <strong>Prosjektet er arkivert.</strong> Delelenkene virker ikke, og nye reiser tas ikke imot. Ingen data er slettet.
        </p>
        <Button variant="secondary" onClick={onGjenopprett}>Gjenopprett prosjekt</Button>
        <p className="small muted" style={{ marginTop: 8 }}>Lenker som ikke er trukket tilbake eller utløpt, virker igjen etter gjenoppretting.</p>
      </div>
    );
  }
  if (bekrefter) {
    return (
      <div className="arkiv" style={{ marginTop: 16 }}>
        <p className="notice" role="alert">
          Arkiverte prosjekter tar ikke imot nye reiser, og alle delelenker slutter å virke. Ingen data slettes, og du kan gjenopprette prosjektet senere.
        </p>
        <div className="row-actions">
          <Button variant="danger" onClick={onBekreft}>Bekreft: arkiver</Button>
          <Button variant="secondary" onClick={onAvbryt}>Avbryt</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="arkiv" style={{ marginTop: 16 }}>
      <Button variant="secondary" onClick={onBe}>Arkiver prosjekt…</Button>
    </div>
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

  async function opprettProsjekt() {
    const r = await api<{ prosjekt: Prosjekt; token: string; lenke: Lenke }>("/api/admin/prosjekter", {
      method: "POST",
      adminKey: key,
      body: JSON.stringify({ navn, utloper_maaneder: utloper, offentlig }),
    });
    if (!r.ok) { setFeil(r.feil); return; }
    setNavn(""); setUtloper(UTLØP_FORVALGT); setOffentlig(true); setFeil(null);
    setKopiert(false); setVisQr(true);
    setNy({ token: r.data.token, lenke: r.data.lenke });
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
    setNy(r.data); setFeil(null);
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
    const r = await api(`/api/admin/prosjekter/${id}/${handling}`, { method: "POST", adminKey: key });
    if (!r.ok) { setFeil(r.feil); return; }
    setFeil(null); setNy(null);
    await hent();
    await hentLenker(id);
  }

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

  return (
    <section className="admin-page">
      <h1 ref={h1} tabIndex={-1}>Admin</h1>
      <p className="small muted">Midlertidig dev-innlogging. <button type="button" className="linkbtn" onClick={() => { sessionStorage.removeItem(KEY); setKey(""); setProsjekter(null); setNy(null); }}>Logg ut</button></p>
      <div aria-live="polite">{feil && <p className="notice bad" role="alert">{feil}</p>}</div>

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
          </div>
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
          <ul className="plist">
            {prosjekter.map((p) => (
              <li key={p.id}>
                <button type="button" className="prow" aria-pressed={valgt === p.id} onClick={() => { setValgt(p.id); setNy(null); setBekreftArkiv(false); }}>
                  <span className="t">{p.navn}</span>
                  <span className="small muted">
                    {reiserTekst(p.registrerte_reiser)}
                    {p.offentlig === false ? " · skjult dashbord" : ""}
                    {p.status !== "aktiv" ? " · arkivert" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {prosjekt && (
        <section className="card" aria-labelledby="l-tittel">
          <h2 id="l-tittel">Delelenker for {prosjekt.navn}</h2>
          {prosjekt.offentlig !== false
            ? <p className="small"><a href={dashbordUrl(origin(), prosjekt.id)}>Åpent dashbord for prosjektet</a></p>
            : <p className="small muted">Dashbordet er skjult. Det gir samme svar som et ukjent prosjekt.</p>}
          <Button variant="secondary" onClick={() => void lagLenke(`/api/admin/prosjekter/${prosjekt.id}/lenker`, utloper)} disabled={prosjekt.status !== "aktiv"}>Lag ny delelenke</Button>
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
          <Arkivering
            status={prosjekt.status}
            bekrefter={bekreftArkiv}
            onBe={() => setBekreftArkiv(true)}
            onBekreft={() => void settArkiv(prosjekt.id, "arkiver")}
            onAvbryt={() => setBekreftArkiv(false)}
            onGjenopprett={() => void settArkiv(prosjekt.id, "gjenopprett")}
          />
          <p className="small muted" style={{ marginTop: 10 }}>«Forny» trekker tilbake den gamle lenken og lager en ny i samme operasjon. Personer med den gamle lenken kan ikke registrere mer.</p>
        </section>
      )}
    </section>
  );
}
