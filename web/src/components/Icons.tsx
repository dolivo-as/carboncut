import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...p }: P & { children: ReactNode }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} {...p}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function IconBriefcase(p: P) {
  return <Svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></Svg>;
}
export function IconUser(p: P) {
  return <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" /></Svg>;
}
export function IconLeaf(p: P) {
  return <Svg {...p}><path d="M5 19c8-1 13-8 14-14-6 1-13 6-14 14z" /><path d="M8 14c2-1 5-4 6-6" /></Svg>;
}
export function IconSun(p: P) {
  return <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18" /></Svg>;
}
export function IconMoon(p: P) {
  return <Svg {...p}><path d="M19 14.5A7.5 7.5 0 1 1 9.5 5 6 6 0 0 0 19 14.5z" /></Svg>;
}
export function IconList(p: P) {
  return <Svg {...p}><path d="M8 7h12M8 12h12M8 17h12" /><circle cx="4" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="17" r="1" fill="currentColor" stroke="none" /></Svg>;
}
export function IconBook(p: P) {
  return <Svg {...p}><path d="M5 5h10a3 3 0 0 1 3 3v12H8a3 3 0 0 0-3 3V5z" /><path d="M5 5a3 3 0 0 1 3-3h8" /></Svg>;
}
export function IconLock(p: P) {
  return <Svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>;
}
