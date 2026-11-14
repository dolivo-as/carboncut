-- Arkivering av prosjekt (etter 16.11). prosjekt.status ('aktiv'|'arkivert') finnes allerede fra 0001,
-- med CHECK. Denne migreringen utvider bare hendelseslogg.handling med de to nye admin-handlingene.
-- SQLite kan ikke endre en CHECK på stedet, så tabellen bygges på nytt og radene kopieres.
-- Ingen andre tabeller peker på hendelseslogg, og ingen data slettes.
CREATE TABLE hendelseslogg_ny (
  id               TEXT PRIMARY KEY,
  administrator_id TEXT NOT NULL REFERENCES administrator(id),
  handling         TEXT NOT NULL CHECK (handling IN ('opprett_prosjekt','opprett_lenke','forny_lenke','trekk_tilbake_lenke','skjul_reise','arkiver_prosjekt','gjenopprett_prosjekt')),
  mal_id           TEXT NOT NULL,
  tid              TEXT NOT NULL
);
INSERT INTO hendelseslogg_ny (id, administrator_id, handling, mal_id, tid)
  SELECT id, administrator_id, handling, mal_id, tid FROM hendelseslogg;
DROP TABLE hendelseslogg;
ALTER TABLE hendelseslogg_ny RENAME TO hendelseslogg;
