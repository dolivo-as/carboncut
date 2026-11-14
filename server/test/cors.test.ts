import { describe, expect, it } from "vitest";
import { kall, nyttProsjekt } from "./hjelp";

describe("CORS", () => {
  it.each(["https://evil.example", "https://carboncut.no.evil.example", "http://carboncut.no", "https://www.carboncut.no", "null"])(
    "avviser opphav %s uten CORS-hoder",
    async (opphav) => {
      for (const init of [{ method: "OPTIONS" }, { method: "POST", body: "{}" }, { method: "GET" }]) {
        const sti = init.method === "GET" ? "/api/dashbord/00000000-0000-4000-8000-00000000c001" : "/api/reiser";
        const r = await kall(sti, { ...init, opphav });
        expect(r.status).toBe(403);
        expect(r.headers.get("access-control-allow-origin")).toBeNull();
      }
    },
  );

  it("tillater carboncut.no og lokal dev", async () => {
    const p = await nyttProsjekt();
    for (const opphav of ["https://carboncut.no", "http://127.0.0.1:5180"]) {
      const pre = await kall("/api/reiser", { method: "OPTIONS", opphav });
      expect(pre.status).toBe(204);
      expect(pre.headers.get("access-control-allow-origin")).toBe(opphav);
      const r = await kall(`/api/dashbord/${p}`, { opphav });
      expect(r.status).toBe(200);
      expect(r.headers.get("access-control-allow-origin")).toBe(opphav);
      expect(r.headers.get("vary")).toBe("Origin");
    }
  });
});
