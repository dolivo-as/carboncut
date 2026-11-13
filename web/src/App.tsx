import { useEffect, useRef, useState } from "react";
import { Banner } from "./Banner";
import { Method } from "./Method";
import { IconBook, IconLeaf, IconList, IconMoon, IconSun } from "./components/Icons";
import { Overview } from "./flow/Overview";
import { RegisterTrip } from "./flow/RegisterTrip";
import type { Purpose } from "./flowLogic";
import { PURPOSE_LABELS } from "./flowLogic";
import { loadTrips, markPurpose, saveTrips, type StoredTrip } from "./storage";
import { applyTheme, readTheme, type Theme } from "./theme";

type View = "overview" | "register" | "method";

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [trips, setTrips] = useState<StoredTrip[]>(() => loadTrips());
  const [theme, setTheme] = useState<Theme>(() => (typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : readTheme()));
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  useEffect(() => { saveTrips(trips); }, [trips]);
  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => {
    if (!toast) return;
    toastRef.current?.focus();
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  function saved(trip: StoredTrip) {
    setTrips((list) => [trip, ...list]);
    setView("overview");
    setToast(`Tur lagret som ${PURPOSE_LABELS[trip.purpose ?? "unspecified"]}.`);
  }

  const showTabs = view !== "register";

  return (
    <div className="shell">
      <Banner />
      <header className="appbar">
        <div className="brand">
          <IconLeaf />
          Carboncut
        </div>
        <button
          type="button"
          className="iconbtn"
          aria-label={theme === "dark" ? "Bytt til lys modus" : "Bytt til mørk modus"}
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
      </header>
      <main className="page" style={showTabs ? undefined : { paddingBottom: 148 }}>
        {view === "overview" && (
          <Overview
            trips={trips}
            onStart={() => setView("register")}
            onDelete={(id) => setTrips((l) => l.filter((t) => t.id !== id))}
            onClear={() => setTrips([])}
            onMark={(id: string, purpose: Purpose) => setTrips((l) => markPurpose(l, id, purpose))}
          />
        )}
        {view === "register" && <RegisterTrip onSave={saved} onCancel={() => setView("overview")} />}
        {view === "method" && <Method />}
      </main>
      {toast && (
        <div className="toast" ref={toastRef} tabIndex={-1} role="status">
          {toast}
        </div>
      )}
      {showTabs && (
        <nav className="tabbar" aria-label="Hovedmeny">
          <div className="in">
            <button type="button" aria-current={view === "overview" ? "page" : undefined} onClick={() => setView("overview")}>
              <IconList />
              Oversikt
            </button>
            <button type="button" aria-current={view === "method" ? "page" : undefined} onClick={() => setView("method")}>
              <IconBook />
              Metode
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
