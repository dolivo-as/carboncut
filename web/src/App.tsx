import { useEffect, useRef, useState } from "react";
import { Banner } from "./Banner";
import { Method } from "./Method";
import { IconBook, IconLeaf, IconList, IconMoon, IconSun } from "./components/Icons";
import { Overview } from "./flow/Overview";
import { RegisterTrip } from "./flow/RegisterTrip";
import type { Purpose } from "./flowLogic";
import { PURPOSE_LABELS } from "./flowLogic";
import { loadTrips, markPurpose, restoreTrip, saveTrips, type StoredTrip } from "./storage";
import { applyTheme, readTheme, type Theme } from "./theme";

type View = "overview" | "register" | "method";

interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  duration: number;
  onAction?: () => void;
  restoreId?: string;
}

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [trips, setTrips] = useState<StoredTrip[]>(() => loadTrips());
  const [theme, setTheme] = useState<Theme>(() => (typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : readTheme()));
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const toastSeq = useRef(0);
  useEffect(() => { saveTrips(trips); }, [trips]);
  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => {
    if (!pendingFocusId) return;
    document.getElementById(pendingFocusId)?.focus();
    setPendingFocusId(null);
  }, [pendingFocusId, trips, toast]);

  function returnFocus(preferredId?: string) {
    const preferred = preferredId ? document.getElementById(preferredId) : null;
    const prev = restoreFocusRef.current;
    const target = preferred ?? (prev && document.contains(prev) ? prev : document.getElementById("oversikt-tittel"));
    if (target instanceof HTMLElement) target.focus();
  }

  useEffect(() => {
    if (!toast) return;
    const focusEl = actionRef.current ?? toastRef.current;
    focusEl?.focus();
    const id = window.setTimeout(() => {
      const root = toastRef.current;
      const active = document.activeElement;
      const wasInToast = Boolean(root && (active === root || root.contains(active)));
      const restoreId = toast.restoreId;
      setToast(null);
      if (wasInToast) requestAnimationFrame(() => returnFocus(restoreId));
    }, toast.duration);
    return () => window.clearTimeout(id);
  }, [toast]);

  function showToast(partial: Omit<Toast, "id">) {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    toastSeq.current += 1;
    setToast({ ...partial, id: toastSeq.current });
  }

  function saved(trip: StoredTrip) {
    setTrips((list) => [trip, ...list]);
    setView("overview");
    showToast({
      message: `Tur lagret som ${PURPOSE_LABELS[trip.purpose ?? "unspecified"]}.`,
      duration: 5000,
      restoreId: `trip-${trip.id}`,
    });
  }

  function deleteTrip(id: string) {
    const index = trips.findIndex((t) => t.id === id);
    const trip = trips[index];
    if (!trip) return;
    setTrips((list) => list.filter((t) => t.id !== id));
    showToast({
      message: "Turen er tatt bort.",
      actionLabel: "Angre",
      duration: 8000,
      restoreId: "oversikt-tittel",
      onAction: () => {
        setTrips((list) => restoreTrip(list, trip, index));
        setToast(null);
        setPendingFocusId(`trip-${trip.id}`);
      },
    });
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
            onDelete={deleteTrip}
            onClear={() => setTrips([])}
            onMark={(id: string, purpose: Purpose) => setTrips((l) => markPurpose(l, id, purpose))}
          />
        )}
        {view === "register" && <RegisterTrip onSave={saved} onCancel={() => setView("overview")} />}
        {view === "method" && <Method />}
      </main>
      {toast && (
        <div className="toast" ref={toastRef} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction ? (
            <button type="button" className="toast-action" ref={actionRef} onClick={toast.onAction}>
              {toast.actionLabel}
            </button>
          ) : null}
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
