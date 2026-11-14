-- Etter 16.11: arkivering av prosjekt og «vis igjen» for skjulte reiser (0003 og 0004 slått sammen, CTO 14.11).
-- prosjekt.status ('aktiv'|'arkivert') og reise.skjult (0|1) finnes allerede fra 0001, med CHECK.
-- Denne migreringen utvider bare hendelseslogg.handling med de nye admin-handlingene:
--   arkiver_prosjekt, gjenopprett_prosjekt (arkivering) og vis_reise (angre skjuling).
-- SQLite kan ikke endre en CHECK på stedet, så tabellen bygges på nytt én gang og alle rader kopieres.
-- Ingen andre tabeller peker på hendelseslogg, og ingen data slettes.
CREATE TABLE hendelseslogg_ny (
  id               TEXT PRIMARY KEY,
  administrator_id TEXT NOT NULL REFERENCES administrator(id),
  handling         TEXT NOT NULL CHECK (handling IN (
                     'opprett_prosjekt','opprett_lenke','forny_lenke','trekk_tilbake_lenke','skjul_reise',
                     'arkiver_prosjekt','gjenopprett_prosjekt','vis_reise')),
  mal_id           TEXT NOT NULL,
  tid              TEXT NOT NULL
);
INSERT INTO hendelseslogg_ny (id, administrator_id, handling, mal_id, tid)
  SELECT id, administrator_id, handling, mal_id, tid FROM hendelseslogg;
DROP TABLE hendelseslogg;
ALTER TABLE hendelseslogg_ny RENAME TO hendelseslogg;
