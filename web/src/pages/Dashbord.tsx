import { useEffect, useRef, useState } from "react";
import { MODE_LABELS, type TransportMode } from "@calc/factors";
import { api, serverAvailable } from "../api";
import { type Celle, type DashbordSvar, type Sum, reiserTekst } from "../dashbordTyper";
import { fmtKg } from "../format";

const modeNavn = (k: string) => MODE_LABELS[k as TransportMode]?.nb ?? k;

function Rader({ celler, annet }: { celler: Celle[]; annet: Sum | null }) {
  const maks = Math.max(1, ...celler.map((c) => c.registrerte_reiser), annet?.registrerte_reiser ?? 0);
  const rader = [
    ...celler.map((c) => ({ navn: modeNavn(c.noekkel), s: c as Sum, annet: false })),
    ...(annet ? [{ navn: "Annet (små grupper slått sammen)", s: annet, annet: true }] : []),
  ];
  return (
    <ul className="dlist">
      {rader.map((r) => (
        <li key={r.navn}>
          <div className="cap">
            <span>{r.navn}</span>
            <span><b>{reiserTekst(r.s.registrerte_reiser)}</b></span>
          </div>
          <div className="bar" aria-hidden="true">
            <i style={{ width: `${(r.s.registrerte_reiser / maks) * 100}%`, background: r.annet ? "var(--bar-ref)" : "var(--bar-you)" }} />
          </div>
        </li>
      ))}
    </ul>
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
    <section className="narrow dash-page">
      <p className="small muted" style={{ margin: 0 }}>Offentlig dashbord</p>
      <h1 ref={h1} tabIndex={-1}>{d ? d.prosjekt.navn : "Dashbord"}</h1>
      {d?.prosjekt.status === "arkivert" && <p className="small muted">Prosjektet er arkivert og tar ikke imot nye reiser.</p>}
      {/* Feil i egen alert-region som alltid ligger i DOM; status/innhold i polite-regionen under (UX 14.11). */}
      <div role="alert">{svar.status === "feil" && <p className="notice bad">{svar.feil}</p>}</div>
      <div aria-live="polite">
        {svar.status === "laster" && <p className="muted">Henter tall …</p>}
        {d && !d.tilstrekkelig && (
          <div className="card" style={{ textAlign: "center", padding: "28px 16px" }}>
            <div style={{ fontSize: 40 }} aria-hidden="true">🌱</div>
            <h2 style={{ margin: "8px 0", color: "var(--fg)" }}>Snart klar</h2>
            <p className="small" style={{ margin: 0 }}>
              Tallene vises når prosjektet har minst <b>10 registrerte reiser</b>. Det beskytter de som har registrert.
            </p>
          </div>
        )}
        {d && d.tilstrekkelig && d.totalt && (
          <>
            <div className="card dash-hero">
              <p className="small muted" style={{ margin: 0 }}>Estimert spart hittil</p>
              <p className="big accent" style={{ margin: "6px 0" }}>
                {fmtKg(d.totalt.spart_kg)} <span className="unit">kg CO₂e</span>
              </p>
              <p className="small" style={{ margin: 0 }}>
                fra <b>{reiserTekst(d.totalt.registrerte_reiser)}</b>, sammenlignet med bensinbil alene
              </p>
            </div>
            <section className="card" aria-labelledby="d-tm">
              <h2 id="d-tm" style={{ fontSize: 17 }}>Reisemåter</h2>
              <Rader celler={d.per_transportmiddel ?? []} annet={d.annet_transportmiddel ?? null} />
            </section>
          </>
        )}
      </div>
      <p className="page-footer">
        Bare summer vises. Grupper under {d?.min_celle ?? 5} reiser slås sammen. Tallene viser registrerte reiser, ikke antall personer. Testversjon – estimerte tall.
      </p>
    </section>
  );
}
