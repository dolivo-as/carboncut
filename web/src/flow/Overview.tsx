import { MODE_LABELS } from "@calc/factors";
import { Button } from "../components/Button";
import { PurposeBadge, ResultCard } from "../components/ResultCard";
import { fmtDate, fmtKg, fmtKm } from "../format";
import { PURPOSE_LABELS, type Purpose } from "../flowLogic";
import { groupTrips, purposeOf, sumSavingsKg, type StoredTrip } from "../storage";

export function Overview({
  trips,
  onStart,
  onDelete,
  onClear,
  onMark,
}: {
  trips: StoredTrip[];
  onStart: () => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onMark: (id: string, purpose: Purpose) => void;
}) {
  const groups = groupTrips(trips);
  const order = ["work", "private", "unspecified"] as const;

  return (
    <section className="narrow">
      <h1 id="oversikt-tittel" tabIndex={-1}>Dine turer</h1>
      <p className="muted">Turer i denne nettleseren, merket som jobb eller privat. Ingenting sendes noe sted.</p>
      <Button onClick={onStart} style={{ margin: "8px 0 18px" }}>Registrer tur</Button>

      {trips.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>Ingen lagrede turer ennå. Start med å velge om turen er jobb eller privat.</p>
        </div>
      ) : (
        <>
          {order.map((key) => {
            const list = groups[key];
            if (key === "unspecified" && list.length === 0) return null;
            const sum = sumSavingsKg(list);
            return (
              <section className="card" key={key} aria-labelledby={`g-${key}`}>
                <div className="ghead">
                  <h2 id={`g-${key}`}><PurposeBadge purpose={key} /> <span className="sr">{PURPOSE_LABELS[key]}</span></h2>
                  <p className="muted small" style={{ margin: 0 }}>
                    {list.length} {list.length === 1 ? "tur" : "turer"}
                    {list.length > 0 ? ` · ${fmtKg(sum)} kg CO₂e estimert besparelse` : ""}
                  </p>
                </div>
                {list.length === 0 ? <p className="muted small">Ingen turer her ennå.</p> : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {list.map((t) => (
                      <li key={t.id} id={`trip-${t.id}`} className="trip" tabIndex={-1}>
                        <div className="body">
                          <div className="t">{fmtDate(t.date)}{t.description ? ` · ${t.description}` : t.kind === "home_office" ? " · Hjemmekontor" : ""}</div>
                          <div className="small muted">
                            {t.kind === "home_office"
                              ? `Hjemmekontor: pendleavstand ${fmtKm(t.oneWayCommuteKm ?? 0)} km ${t.avoided === "return" ? "tur-retur" : "én vei"}`
                              : `${(t.segments ?? []).map((s) => `${MODE_LABELS[s.mode]?.nb ?? s.mode} ${fmtKm(s.distanceKm)} km`).join(" + ")}${t.returnTrip ? " (tur-retur)" : ""}`}
                          </div>
                          <div className={t.result.savingsKg < 0 ? "neg" : "pos"}>
                            {t.result.savingsKg < 0 ? "Mer enn referansen: " : "Besparelse: "}
                            {fmtKg(t.result.savingsKg)} kg CO₂e
                          </div>
                          {purposeOf(t) === "unspecified" && (
                            <div className="mark">
                              <Button variant="small" onClick={() => onMark(t.id, "work")}>Merk som jobb</Button>
                              <Button variant="secondary" className="small" onClick={() => onMark(t.id, "private")}>Merk som privat</Button>
                            </div>
                          )}
                          <details className="facts">
                            <summary>Detaljer</summary>
                            <div style={{ marginTop: 8 }}>
                              <ResultCard
                                result={t.result}
                                purpose={purposeOf(t)}
                                kind={t.kind}
                                perSegment={t.segments}
                                avoidedKm={t.kind === "home_office" ? (t.oneWayCommuteKm ?? 0) * (t.avoided === "return" ? 2 : 1) : undefined}
                              />
                            </div>
                          </details>
                        </div>
                        <Button variant="danger" className="small" onClick={() => onDelete(t.id)}>
                          Slett
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          <Button variant="danger" onClick={() => { if (confirm("Slette alle lagrede turer i denne nettleseren?")) onClear(); }}>
            Slett alle turer
          </Button>
        </>
      )}
      <p className="page-footer">Testversjon. Ingen innlogging, ingen server, ingen sporing. Data lagres bare i din nettleser.</p>
    </section>
  );
}
