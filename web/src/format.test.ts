import { describe, it, expect } from "vitest";
import { fmtDate, plainFactorText } from "./format";

describe("fmtDate", () => {
  it("viser ISO-dato som norsk dato med kort månedsnavn", () => {
    expect(fmtDate("2026-11-13")).toBe("13. nov. 2026");
    expect(fmtDate("2026-01-05")).toBe("5. jan. 2026");
  });
  it("lar ugyldig verdi stå uendret", () => {
    expect(fmtDate("ukjent")).toBe("ukjent");
  });
});

describe("plainFactorText", () => {
  it("forklarer pkm og kjøretøy-km uten å endre resten", () => {
    expect(plainFactorText("Per kjøretøy-km, 1 person i bilen")).toBe("Per kilometer bilen kjører, 1 person i bilen");
    expect(plainFactorText("per pkm; belegg ikke oppgitt")).toBe("per person og kilometer; belegg ikke oppgitt");
    expect(plainFactorText("båt (kg fossilt CO2e/pkm)")).toBe("båt (kg fossilt CO₂e for én person som reiser 1 km)");
    expect(plainFactorText("ikke oppgitt (Ruters pkm)")).toBe("ikke oppgitt (Ruters tall per person og kilometer)");
  });
});
