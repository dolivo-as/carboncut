import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

// Egen tom D1 (MIGRERINGSTEST). Bare fiktive data.
const db = () => env.MIGRERINGSTEST;
const navn = () => env.TEST_MIGRATIONS.map((m) => m.name);

const GAMLE_HANDLINGER = ["opprett_prosjekt", "opprett_lenke", "forny_lenke", "trekk_tilbake_lenke", "skjul_reise"];
const NYE_HANDLINGER = ["arkiver_prosjekt", "gjenopprett_prosjekt", "vis_reise"];

async function alt(tabell: string) {
  return (await db().prepare(`SELECT * FROM ${tabell} ORDER BY id`).all()).results;
}

describe("migrering 0003 (arkivering og vis_reise) på fiktive rader", () => {
  it("det finnes nøyaktig tre migreringer, og 0004 er slått sammen inn i 0003", () => {
    expect(navn()).toEqual(["0001_init.sql", "0002_prosjekt_offentlig.sql", "0003_arkivering_og_vis_reise.sql"]);
  });

  it("0001+0002 med fiktive rader, så 0003: alle rader bevares, nye handlinger godtas, ukjente avvises", async () => {
    const forTo = env.TEST_MIGRATIONS.filter((m) => m.name < "0003");
    await applyD1Migrations(db(), forTo);

    // Fiktive rader i alle tabeller som finnes etter 0002.
    const b = "10000000-0000-4000-8000-000000000001";
    const a = "10000000-0000-4000-8000-000000000002";
    const p1 = "10000000-0000-4000-8000-000000000003";
    const p2 = "10000000-0000-4000-8000-000000000004";
    const l1 = "10000000-0000-4000-8000-000000000005";
    await db().batch([
      db().prepare("INSERT INTO bedrift (id, navn, opprettet) VALUES (?, 'Migrering Fiktiv AS', '2026-01-01T00:00:00Z')").bind(b),
      db().prepare("INSERT INTO administrator (id, bedrift_id, epost, navn, rolle, opprettet) VALUES (?, ?, 'migrering@example.invalid', 'Fiktiv Migrering', 'eier', '2026-01-01T00:00:00Z')").bind(a, b),
      db().prepare("INSERT INTO prosjekt (id, bedrift_id, navn, status, min_gruppe, offentlig, opprettet_av, opprettet) VALUES (?, ?, 'Fiktivt aktivt', 'aktiv', 10, 1, ?, '2026-01-02T00:00:00Z')").bind(p1, b, a),
      db().prepare("INSERT INTO prosjekt (id, bedrift_id, navn, status, min_gruppe, offentlig, opprettet_av, opprettet) VALUES (?, ?, 'Fiktivt skjult', 'aktiv', 10, 0, ?, '2026-01-03T00:00:00Z')").bind(p2, b, a),
      db().prepare("INSERT INTO lenke (id, prosjekt_id, token_hash, token_prefiks, opprettet, utloper, trukket_tilbake, opprettet_av) VALUES (?, ?, 'fiktiv-hash-migrering', 'MIGRER', '2026-01-02T00:00:00Z', '2027-01-02T00:00:00Z', NULL, ?)").bind(l1, p1, a),
      ...[0, 1, 2].map((i) =>
        db().prepare(
          "INSERT INTO reise (id, prosjekt_id, lenke_id, formaal, dato, transportmiddel, distanse_km, tur_retur, etapper, utslipp_kg, referanse_kg, faktorversjon, faktor_snapshot, skjult, opprettet) " +
            "VALUES (?, ?, ?, 'jobb', ?, 'city_bus', 10, 0, '[]', 0.5, 1.5, 1, '{}', ?, '2026-11-10T00:00:00Z')",
        ).bind(`20000000-0000-4000-8000-00000000000${i}`, p1, l1, `2026-11-0${i + 1}`, i === 2 ? 1 : 0)),
      ...GAMLE_HANDLINGER.map((h, i) =>
        db().prepare("INSERT INTO hendelseslogg (id, administrator_id, handling, mal_id, tid) VALUES (?, ?, ?, ?, ?)")
          .bind(`30000000-0000-4000-8000-00000000000${i}`, a, h, p1, `2026-11-1${i}T00:00:00Z`)),
    ]);
    // Før 0003 avvises de nye handlingene.
    await expect(db().prepare("INSERT INTO hendelseslogg (id, administrator_id, handling, mal_id, tid) VALUES ('for-0003', ?, 'vis_reise', ?, '2026-11-14T00:00:00Z')").bind(a, p1).run()).rejects.toThrow(/CHECK/);

    const tabeller = ["bedrift", "administrator", "prosjekt", "lenke", "reise", "hendelseslogg"];
    const for_ = Object.fromEntries(await Promise.all(tabeller.map(async (t) => [t, await alt(t)] as const)));
    expect(for_.hendelseslogg).toHaveLength(GAMLE_HANDLINGER.length);
    expect(for_.reise).toHaveLength(3);

    await applyD1Migrations(db(), env.TEST_MIGRATIONS);

    // Alle rader er bevart, felt for felt.
    for (const t of tabeller) expect(await alt(t)).toEqual(for_[t]);

    // Skjemaet er det samme som før, bortsett fra CHECK på handling.
    const kolonner = (await db().prepare("PRAGMA table_info(hendelseslogg)").all<{ name: string }>()).results.map((c) => c.name);
    expect(kolonner).toEqual(["id", "administrator_id", "handling", "mal_id", "tid"]);
    const sql = (await db().prepare("SELECT sql FROM sqlite_master WHERE name = 'hendelseslogg'").first<{ sql: string }>())!.sql;
    for (const h of [...GAMLE_HANDLINGER, ...NYE_HANDLINGER]) expect(sql).toContain(`'${h}'`);
    expect((await db().prepare("SELECT name FROM sqlite_master WHERE name = 'hendelseslogg_ny'").first())).toBeNull();

    // Alle handlinger (gamle og nye) godtas, ukjente avvises.
    for (const [i, h] of [...GAMLE_HANDLINGER, ...NYE_HANDLINGER].entries()) {
      await db().prepare("INSERT INTO hendelseslogg (id, administrator_id, handling, mal_id, tid) VALUES (?, ?, ?, ?, '2026-11-14T00:00:00Z')")
        .bind(`etter-0003-${i}`, a, h, p1).run();
    }
    await expect(db().prepare("INSERT INTO hendelseslogg (id, administrator_id, handling, mal_id, tid) VALUES ('ukjent', ?, 'slett_prosjekt', ?, '2026-11-14T00:00:00Z')").bind(a, p1).run()).rejects.toThrow(/CHECK/);
    // Fremmednøkkelen til administrator gjelder fortsatt.
    await expect(db().prepare("INSERT INTO hendelseslogg (id, administrator_id, handling, mal_id, tid) VALUES ('fk', 'finnes-ikke', 'vis_reise', ?, '2026-11-14T00:00:00Z')").bind(p1).run()).rejects.toThrow(/FOREIGN KEY/);
    // Øvrige CHECK-er er urørt.
    await expect(db().prepare("UPDATE prosjekt SET status = 'slettet' WHERE id = ?").bind(p1).run()).rejects.toThrow(/CHECK/);
    await db().prepare("UPDATE prosjekt SET status = 'arkivert' WHERE id = ?").bind(p1).run();
  });
});
