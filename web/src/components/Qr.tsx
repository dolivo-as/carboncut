import { encode } from "uqr";

/** QR-kode tegnet lokalt i nettleseren (uqr, ingen nettverkskall). Mørke moduler på hvit bunn også i mørkt tema. */
export function Qr({ text, label }: { text: string; label: string }) {
  const { data } = encode(text, { ecc: "M", border: 2 });
  const n = data.length;
  let d = "";
  data.forEach((rad, y) => rad.forEach((on, x) => { if (on) d += `M${x} ${y}h1v1h-1z`; }));
  return (
    <svg className="qr" viewBox={`0 0 ${n} ${n}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  );
}
