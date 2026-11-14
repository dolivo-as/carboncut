import { useEffect, useRef, useState } from "react";
import { Banner } from "./Banner";
import { Method } from "./Method";
import { IconBook, IconLeaf, IconList, IconMoon, IconSun } from "./components/Icons";
import { Overview } from "./flow/Overview";
import { LinkTrip } from "./flow/LinkTrip";
import { RegisterTrip } from "./flow/RegisterTrip";
import { api } from "./api";
import { Admin } from "./pages/Admin";
import { Dashbord } from "./pages/Dashbord";
import { parseRoute, type Route } from "./route";
import { toServerPayload } from "./serverPayload";
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

type LinkState = { status: "laster" } | { status: "ok"; id: string; navn: string; offentlig: boolean } | { status: "ugyldig" } | { status: "feil"; feil: string };

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(typeof window !== "undefined" ? window.location.hash : ""));
  const [link, setLink] = useState<LinkState | null>(null);
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
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const linkToken = route.name === "lenke" ? route.token : null;
  useEffect(() => {
    if (!linkToken) { setLink(null); return; }
    let active = true;
    setLink({ status: "laster" });
    api<{ prosjekt: { id: string; navn: string; offentlig: boolean } }>("/api/lenke", { method: "POST", body: JSON.stringify({ token: linkToken }) }).then((r) => {
      if (!active) return;
      if (r.ok) { setLink({ status: "ok", id: r.data.prosjekt.id, navn: r.data.prosjekt.navn, offentlig: r.data.prosjekt.offentlig }); setView("register"); }
      else setLink(r.status === 404 ? { status: "ugyldig" } : { status: "feil", feil: r.feil });
    });
    return () => { active = false; };
  }, [linkToken]);
  const linkProject = link?.status === "ok" ? link.navn : undefined;
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

  async function saved(trip: StoredTrip, honeypot: string): Promise<string | null> {
    let message = `Tur lagret som ${PURPOSE_LABELS[trip.purpose ?? "unspecified"]}.`;
    if (linkToken && linkProject) {
      // Bare jobbturer har en payload. Private turer forlater aldri nettleseren.
      const payload = toServerPayload(trip, linkToken, honeypot);
      if (payload) {
        const r = await api("/api/reiser", { method: "POST", body: JSON.stringify(payload) });
        if (!r.ok) {
          return r.status === 404
            ? "Lenken er ikke gyldig lenger. Turen er ikke sendt og ikke lagret. Be om en ny lenke."
            : `Turen er ikke sendt: ${r.feil}`;
        }
        trip = { ...trip, sentTo: linkProject };
        message = `Tur sendt til ${linkProject} og lagret her.`;
      } else {
        message = "Privat tur lagret bare her. Den er ikke sendt.";
      }
    }
    setTrips((list) => [trip, ...list]);
    setView("overview");
    showToast({
      message,
      duration: 5000,
      restoreId: `trip-${trip.id}`,
    });
    return null;
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

  const page = route.name === "admin" || route.name === "dashbord" ? route.name : null;
  const showTabs = page === null && route.name !== "lenke" && view !== "register";
  function goTab(v: View) {
    if (page) window.location.hash = "";
    setView(v);
  }

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
      <main className="page" style={showTabs || route.name === "admin" || route.name === "dashbord" ? undefined : { paddingBottom: 148 }}>
        {route.name === "admin" && <Admin />}
        {route.name === "dashbord" && <Dashbord id={route.id} />}
        {route.name === "lenke" && link?.status === "laster" && <p className="muted">Sjekker lenken …</p>}
        {route.name === "lenke" && (link?.status === "ugyldig" || link?.status === "feil") && (
          <div className="notice bad" role="alert">
            <p style={{ margin: 0 }}>{link.status === "ugyldig" ? "Lenken er ikke gyldig. Be om en ny lenke." : link.feil}</p>
          </div>
        )}
        {route.name === "lenke" && link?.status === "ok" && (
          <LinkTrip token={route.token} prosjekt={{ id: link.id, navn: link.navn, offentlig: link.offentlig }} />
        )}
        {!page && route.name !== "lenke" && view === "overview" && (
          <Overview
            trips={trips}
            onStart={() => setView("register")}
            onDelete={deleteTrip}
            onClear={() => setTrips([])}
            onMark={(id: string, purpose: Purpose) => setTrips((l) => markPurpose(l, id, purpose))}
            note={linkProject ? `Turer i denne nettleseren. Jobbturer du lagrer nå sendes også til ${linkProject}.` : undefined}
          />
        )}
        {!page && route.name !== "lenke" && view === "register" && <RegisterTrip onSave={saved} onCancel={() => setView("overview")} linkProject={linkProject} />}
        {!page && route.name !== "lenke" && view === "method" && <Method />}
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
            <button type="button" aria-current={!page && view === "overview" ? "page" : undefined} onClick={() => goTab("overview")}>
              <IconList />
              Oversikt
            </button>
            <button type="button" aria-current={!page && view === "method" ? "page" : undefined} onClick={() => goTab("method")}>
              <IconBook />
              Metode
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
