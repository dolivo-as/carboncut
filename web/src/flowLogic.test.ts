import { describe, it, expect } from "vitest";
import {
  canLeaveMode, canLeavePurpose, documentedMode, homeOfficeAllowed,
  PURPOSE_LABELS, VANLIGE_MODUSER, gyldigUtloperMaaneder, ovrigeModuser,
  validateDistance, validateSegments, KM_HURTIGVALG,
} from "./flowLogic";

describe("hovedflyt", () => {
  it("krever at formål er valgt før neste steg", () => {
    expect(canLeavePurpose(null)).toBe(false);
    expect(canLeavePurpose("work")).toBe(true);
    expect(canLeavePurpose("private")).toBe(true);
  });

  it("tillater hjemmekontor bare når formålet er jobb", () => {
    expect(homeOfficeAllowed("work")).toBe(true);
    expect(homeOfficeAllowed("private")).toBe(false);
    expect(homeOfficeAllowed(null)).toBe(false);
    expect(canLeaveMode("home_office", null, "private")).toBe(false);
    expect(canLeaveMode("home_office", null, "work")).toBe(true);
  });

  it("avviser distanse som er 0, tom eller ikke et tall, og godtar komma", () => {
    expect(validateDistance("")).toBeTruthy();
    expect(validateDistance("0")).toBeTruthy();
    expect(validateDistance("-1")).toBeTruthy();
    expect(validateDistance("abc")).toBeTruthy();
    expect(validateDistance("12,5")).toBeNull();
    expect(validateDistance("3")).toBeNull();
  });

  it("krever dokumentert reisemåte og distanse på alle strekninger", () => {
    expect(validateSegments([])).toBeTruthy();
    expect(validateSegments([{ mode: "walking", km: "2" }])).toBeNull();
    expect(validateSegments([{ mode: "hybrid_car", km: "2" }])).toMatch(/kilde/);
    expect(documentedMode("hybrid_car")).toBe(false);
    expect(documentedMode("electric_car")).toBe(true);
  });

  it("har norske merkelapper for formål", () => {
    expect(PURPOSE_LABELS.work).toBe("Jobb");
    expect(PURPOSE_LABELS.private).toBe("Privat");
    expect(PURPOSE_LABELS.unspecified).toBe("Ikke oppgitt");
  });
});

describe("lenkeflyt og hurtigvalg (v3)", () => {
  it("har seks vanlige reisemåter, alle dokumentert", () => {
    expect(VANLIGE_MODUSER).toEqual(["walking", "bicycle", "city_bus", "electric_train", "electric_car", "gasoline_car"]);
    for (const m of VANLIGE_MODUSER) expect(documentedMode(m)).toBe(true);
  });

  it("holder vanlige og øvrige adskilt", () => {
    const resten = ovrigeModuser();
    expect(resten).not.toContain("walking");
    expect(resten).toContain("regional_bus");
    expect(new Set([...VANLIGE_MODUSER, ...resten]).size).toBe(VANLIGE_MODUSER.length + resten.length);
  });

  it("hurtigvalg for km er 2, 5, 10, 20 og 50", () => {
    expect([...KM_HURTIGVALG]).toEqual([2, 5, 10, 20, 50]);
  });

  it("godtar bare utløp på 3, 6 eller 12 måneder", () => {
    expect(gyldigUtloperMaaneder(3)).toBe(true);
    expect(gyldigUtloperMaaneder(6)).toBe(true);
    expect(gyldigUtloperMaaneder(12)).toBe(true);
    expect(gyldigUtloperMaaneder(1)).toBe(false);
    expect(gyldigUtloperMaaneder(24)).toBe(false);
    expect(gyldigUtloperMaaneder("12")).toBe(false);
  });
});
