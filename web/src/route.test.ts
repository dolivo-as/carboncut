import { describe, expect, it } from "vitest";
import { lenkeUrl, parseRoute } from "./route";

const T = "abcDEF_-0123456789abcdefghijklmnopqrstuvwxy".slice(0, 43);

describe("parseRoute", () => {
  it("standard er appen", () => {
    expect(parseRoute("")).toEqual({ name: "app" });
    expect(parseRoute("#/ukjent")).toEqual({ name: "app" });
  });
  it("delelenke krever et token på 43 tegn", () => {
    expect(T).toHaveLength(43);
    expect(parseRoute(`#/r/${T}`)).toEqual({ name: "lenke", token: T });
    expect(parseRoute("#/r/kort")).toEqual({ name: "app" });
    expect(parseRoute(`#/r/${T}x`)).toEqual({ name: "app" });
  });
  it("admin og dashbord", () => {
    expect(parseRoute("#/admin")).toEqual({ name: "admin" });
    expect(parseRoute("#/dashbord")).toEqual({ name: "dashbord", id: null });
    expect(parseRoute("#/dashbord/00000000-0000-4000-8000-00000000c001")).toEqual({ name: "dashbord", id: "00000000-0000-4000-8000-00000000c001" });
    expect(parseRoute("#/dashbord/<script>")).toEqual({ name: "dashbord", id: null });
  });
  it("tokenet ligger i #-delen, ikke i stien", () => {
    expect(lenkeUrl("https://carboncut.no", T)).toBe(`https://carboncut.no/#/r/${T}`);
  });
});
