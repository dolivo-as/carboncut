import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");

describe("reiselista: mobil", () => {
  it("knappen for skjul/vis er minst 44 px høy", () => {
    const regel = /\.btn\.reise-knapp\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    const h = /min-height:\s*(\d+)px/.exec(regel)?.[1];
    expect(Number(h)).toBeGreaterThanOrEqual(44);
  });
  it("hver reise er én rad (flex, ikke stablet)", () => {
    const regel = /\.reise-rad\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(regel).toMatch(/display:\s*flex/);
    expect(regel).not.toMatch(/flex-direction:\s*column/);
  });
});
