import { useEffect, useRef, useState } from "react";
import { MODE_LABELS, type TransportMode } from "@calc/factors";
import { api, serverAvailable } from "../api";
import { fmtMaaned, reiserTekst, type Blokk, type Celle, type DashbordSvar, type Sum } from "../dashbordTyper";
import { fmtKg } from "../format";

const modeNavn = (k: string) => MODE_LABELS[k as TransportMode]?.nb ?? k;

function Rader({ celler, annet }: { celler: Celle[]; annet: Sum | null }) {
  const maks = Math.max(1, ...celler.map((c) => c.registrerte_reiser), annet?.registrerte_reiser ?? 0);
  const rader = [...celler.map((c) => ({ navn: modeNavn(c.noekkel), s: c as Sum })), ...(annet ? [{ navn: "Annet (små grupper slått sammen)", s: annet }] : [])];
  return (
    <ul className="dlist">
      {rader.map((r) => (
        <li key={r.navn}>
          <div className="cap">
            <span>{r.navn}</span>
            <span>{reiserTekst(r.s.registrerte_reiser)}</span>
          </div>
          <div className="bar" aria-hidden="true"><i style={{ width: `${(r.s.registrerte_reiser / maks) * 100}%`, background: "var(--bar-you)" }} /></div>
          <p className="small muted" style={{ margin: "4px 0 0" }}>{fmtKg(r.s.spart_kg)} kg CO₂e spart · {fmtKg(r.s.utslipp_kg)} kg utslipp</p>
        </li>
      ))}
    </ul>
  );
}

function MaanedKort({ tittel, b }: { tittel: string; b: Blokk }) {
  return (
    <section className="card" aria-label={tittel}>
      <h3 style={{ marginTop: 0, color: "var(--fg)" }}>{tittel}</h3>
      <p className="small muted">{reiserTekst(b.registrerte_reiser)} · {fmtKg(b.spart_kg)} kg CO₂e spart</p>
      <Rader celler={b.per_transportmiddel} annet={b.annet} />
    </section>
  );
}

export function Dashbord({ id }: { id: string | null }) {
  const [svar, setSvar] = useState<{ status: "laster" } | { status: "feil"; feil: string } | { status: "ok"; d: DashbordSvar }>({ status: "laster" });
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1.current?.focus(); }, []);
  useEffect(() => {
    if (!id) return;
    let aktiv = true;
    api<DashbordSvar>(`/api/dashbord/${id}`).then((r) => {
      if (!aktiv) return;
      setSvar(r.ok ? { status: "ok", d: r.data } : { status: "feil", feil: r.status === 404 ? "Fant ikke prosjektet." : r.feil });
    });
    return () => { aktiv = false; };
  }, [id]);

  if (!id) {
    return (
      <section className="narrow">
        <h1 ref={h1} tabIndex={-1}>Dashbord</h1>
        <p className="muted">Åpne dashbordet fra lenken til prosjektet. Administrator finner lenken på admin-siden.</p>
        {!serverAvailable() && <p className="notice">Serveren er ikke satt opp ennå. Dashbordet kommer når serveren er godkjent.</p>}
      </section>
    );
  }
  const d = svar.status === "ok" ? svar.d : null;
  return (
    <section className="narrow">
      <h1 ref={h1} tabIndex={-1}>{d ? d.prosjekt.navn : "Dashbord"}</h1>
      <p className="muted">Estimert klimaeffekt av jobbreiser registrert på prosjektet. Tallene er summer. Enkeltreiser vises aldri.</p>
      <div aria-live="polite">
        {svar.status === "laster" && <p className="muted">Henter tall …</p>}
        {svar.status === "feil" && <p className="notice bad" role="alert">{svar.feil}</p>}
        {d && !d.tilstrekkelig && (
          <div className="card">
            <p style={{ margin: 0 }}>
              Prosjektet har ennå ikke nok registrerte reiser til at tall kan vises. Dashbordet åpnes når det er minst {d.min_gruppe ?? 10} registrerte reiser.
            </p>
          </div>
        )}
        {d && d.tilstrekkelig && d.totalt && (
          <>
            <div className="stats" style={{ marginBottom: 14 }}>
              <div className="stat wide"><div className="v">{fmtKg(d.totalt.spart_kg)} <span className="unit">kg CO₂e</span></div><div className="l">Estimert spart mot referansebil</div></div>
              <div className="stat"><div className="v">{fmtKg(d.totalt.utslipp_kg)} <span className="unit">kg</span></div><div className="l">Utslipp fra reisene</div></div>
              <div className="stat"><div className="v">{d.totalt.registrerte_reiser.toLocaleString("nb-NO")}</div><div className="l">Registrerte reiser</div></div>
            </div>
            <section className="card" aria-labelledby="d-tm">
              <h2 id="d-tm">Per transportmiddel</h2>
              <Rader celler={d.per_transportmiddel ?? []} annet={d.annet_transportmiddel ?? null} />
            </section>
            <h2>Per måned</h2>
            {(d.per_maaned ?? []).map((m) => <MaanedKort key={m.maaned} tittel={fmtMaaned(m.maaned)} b={m} />)}
            {d.ovrige_maaneder && <MaanedKort tittel="Øvrige måneder (slått sammen)" b={d.ovrige_maaneder} />}
          </>
        )}
      </div>
      <p className="page-footer">
        Tallene viser registrerte reiser, ikke antall personer. Grupper med under {d?.min_celle ?? 5} reiser er slått sammen, slik at ingen enkeltreiser kan leses ut. Testversjon – estimerte tall.
      </p>
    </section>
  );
}
