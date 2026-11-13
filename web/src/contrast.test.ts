import { describe, it, expect } from "vitest";
import { contrastRatio, TOKEN_PAIRS } from "./contrast";

describe("designtokens, WCAG 2.1-kontrast", () => {
  it("har minst 4,5:1 for tekst og 3:1 for feltkanter i lys og mørk modus", () => {
    const results = TOKEN_PAIRS.map((p) => ({ ...p, ratio: contrastRatio(p.fg, p.bg) }));
    for (const r of results) {
      expect(r.ratio, `${r.id} (${r.fg} på ${r.bg}) = ${r.ratio.toFixed(2)}:1, krav ${r.min}:1`).toBeGreaterThanOrEqual(r.min);
    }
  });

  it("kjent par: slate-900 på nesten hvit er over 17:1", () => {
    expect(contrastRatio("#0f172a", "#f8fafc")).toBeGreaterThan(17);
  });
});
