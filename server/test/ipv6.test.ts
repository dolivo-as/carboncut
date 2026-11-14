import { describe, expect, it } from "vitest";
import { GRENSE_IP_PER_TIME, ipGrunnlag } from "../src/misbruk";
import { kall, nyLenke, nyttProsjekt, registrer } from "./hjelp";

describe("ipGrunnlag: IPv4 per adresse, IPv6 per /64", () => {
  it.each([
    ["192.0.2.1", "v4:192.0.2.1"],
    ["192.0.2.2", "v4:192.0.2.2"],
    ["::ffff:192.0.2.1", "v4:192.0.2.1"],
    ["::ffff:c000:201", "v4:192.0.2.1"],
    ["2001:db8:1:2::1", "v6:2001:0db8:0001:0002::/64"],
    ["2001:0DB8:0001:0002:ffff:eeee:dddd:cccc", "v6:2001:0db8:0001:0002::/64"],
    ["[2001:db8:1:2::abcd]", "v6:2001:0db8:0001:0002::/64"],
    ["fe80::1%eth0", "v6:fe80:0000:0000:0000::/64"],
    ["2001:db8::", "v6:2001:0db8:0000:0000::/64"],
    ["2001:db8:1:3::1", "v6:2001:0db8:0001:0003::/64"],
    ["", "ukjent"], [null, "ukjent"], ["999.1.1.1", "ukjent"], ["1::2::3", "ukjent"], ["hei", "ukjent"], ["1:2:3:4:5:6:7:8:9", "ukjent"],
  ])("%s → %s", (inn, ut) => expect(ipGrunnlag(inn)).toBe(ut));
});

describe("ratebegrensning per IPv6 /64", () => {
  it("adresser i samme /64 deler teller, et annet /64 gjør ikke", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    for (let i = 1; i <= GRENSE_IP_PER_TIME; i++) {
      expect((await registrer(token, {}, `2001:db8:aaaa:1::${i.toString(16)}`)).status).toBe(201);
    }
    expect((await registrer(token, {}, "2001:db8:aaaa:1:ffff:ffff:ffff:fffe")).status).toBe(429);
    expect((await registrer(token, {}, "2001:db8:aaaa:2::1")).status).toBe(201);
  });
  it("IPv4: ulike adresser har egne tellere", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    for (let i = 0; i < GRENSE_IP_PER_TIME; i++) expect((await registrer(token, {}, "198.51.100.200")).status).toBe(201);
    expect((await registrer(token, {}, "198.51.100.200")).status).toBe(429);
    expect((await registrer(token, {}, "198.51.100.201")).status).toBe(201);
  });
});

describe("POST /api/lenke har ratebegrensning", () => {
  it(`maks ${GRENSE_IP_PER_TIME} oppslag per time per IP, også for gyldig token`, async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    const ip = "2001:db8:bbbb:1::1";
    for (let i = 0; i < GRENSE_IP_PER_TIME; i++) {
      expect((await kall("/api/lenke", { method: "POST", body: JSON.stringify({ token }), ip })).status).toBe(200);
    }
    const r = await kall("/api/lenke", { method: "POST", body: JSON.stringify({ token }), ip });
    expect(r.status).toBe(429);
    const ra = Number(r.headers.get("retry-after"));
    expect(Number.isInteger(ra) && ra >= 1 && ra <= 3600).toBe(true);
    // Og oppslag teller mot samme kvote som registrering.
    expect((await registrer(token, {}, ip)).status).toBe(429);
  });
});

describe("kall uten Origin godtas (Tech Lead/CTO 14.11)", () => {
  it("registrering, oppslag og admin svarer uten Origin-header", async () => {
    const p = await nyttProsjekt();
    const { token } = await nyLenke(p);
    expect((await kall("/api/reiser", { method: "POST", body: JSON.stringify({ token, formaal: "jobb", dato: new Date().toISOString().slice(0, 10), type: "reise", tur_retur: false, etapper: [{ transportmiddel: "city_bus", distanse_km: 3 }] }), opphav: null })).status).toBe(201);
    expect((await kall("/api/lenke", { method: "POST", body: JSON.stringify({ token }), opphav: null })).status).toBe(200);
    const a = await kall("/api/admin/prosjekter", { admin: true, opphav: null });
    expect(a.status).toBe(200);
    expect(a.headers.get("access-control-allow-origin")).toBeNull();
  });
});
