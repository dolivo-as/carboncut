import { describe, it, expect } from "vitest";
import {
  canLeaveMode, canLeavePurpose, documentedMode, homeOfficeAllowed,
  PURPOSE_LABELS, validateDistance, validateSegments,
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
