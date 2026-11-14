import { describe, expect, it } from "vitest";
import { lenkeStatus } from "./pages/Admin";
import { fmtMaaned, reiserTekst } from "./dashbordTyper";

describe("admin og dashbord, visning", () => {
  const l = { id: "x", prefiks: "abcdef", opprettet: "2026-11-14T00:00:00Z", utloper: "2027-11-14T00:00:00Z", trukket_tilbake: null };
  it("lenkestatus", () => {
    expect(lenkeStatus(l, "2026-11-14T10:00:00Z")).toBe("aktiv");
    expect(lenkeStatus(l, "2027-11-15T00:00:00Z")).toBe("utlopt");
    expect(lenkeStatus({ ...l, trukket_tilbake: "2026-11-14T11:00:00Z" }, "2026-11-14T12:00:00Z")).toBe("trukket");
  });
  it("dashbordet snakker om registrerte reiser, ikke personer", () => {
    expect(reiserTekst(1)).toBe("1 registrert reise");
    expect(reiserTekst(12)).toBe("12 registrerte reiser");
    expect(fmtMaaned("2026-11")).toBe("november 2026");
  });
});
