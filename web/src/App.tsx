import { useEffect, useState } from "react";
import { Banner } from "./Banner";
import { Method } from "./Method";
import { TripForm } from "./TripForm";
import { TripList } from "./TripList";
import { loadTrips, saveTrips, type StoredTrip } from "./storage";

export default function App() {
  const [tab, setTab] = useState<"calc" | "method">("calc");
  const [trips, setTrips] = useState<StoredTrip[]>(() => loadTrips());
  useEffect(() => { saveTrips(trips); }, [trips]);

  const tabCls = (t: string) => "px-3 py-2 text-sm font-medium border-b-2 " + (tab === t ? "border-emerald-700 text-emerald-800" : "border-transparent text-slate-600");
  return (
    <>
      <Banner />
      <header className="max-w-4xl mx-auto px-4 pt-4">
        <h1 className="text-2xl font-bold">Carboncut</h1>
        <p className="text-sm text-slate-600">Estimer utslipp fra reiser sammenlignet med en bensinbil med én person. Tallene er estimater og ikke verifisert miljøeffekt.</p>
        <nav className="flex gap-2 mt-3 border-b border-slate-200">
          <button className={tabCls("calc")} onClick={() => setTab("calc")}>Beregn</button>
          <button className={tabCls("method")} onClick={() => setTab("method")}>Metode og kilder</button>
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {tab === "calc" ? (
          <>
            <TripForm onSave={(t) => setTrips((l) => [t, ...l])} />
            <TripList trips={trips} onDelete={(id) => setTrips((l) => l.filter((t) => t.id !== id))} onClear={() => setTrips([])} />
          </>
        ) : <Method />}
      </main>
      <footer className="max-w-4xl mx-auto px-4 pb-8 text-xs text-slate-500">
        Testversjon. Ingen innlogging, ingen server, ingen sporing. Data lagres bare i din nettleser (localStorage).
      </footer>
    </>
  );
}
