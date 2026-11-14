-- Skjermbildet for å skjule reiser (etter 16.11). reise.skjult (0|1, CHECK) og handlingen 'skjul_reise' finnes
-- fra 0001. Denne migreringen legger bare til 'vis_reise' (angre skjuling) i CHECK på hendelseslogg.handling.
-- SQLite kan ikke endre en CHECK på stedet, så tabellen bygges på nytt og radene kopieres (som i 0003).
-- Ingen andre tabeller peker på hendelseslogg, og ingen data slettes.
CREATE TABLE hendelseslogg_ny (
  id               TEXT PRIMARY KEY,
  administrator_id TEXT NOT NULL REFERENCES administrator(id),
  handling         TEXT NOT NULL CHECK (handling IN ('opprett_prosjekt','opprett_lenke','forny_lenke','trekk_tilbake_lenke','skjul_reise','arkiver_prosjekt','gjenopprett_prosjekt','vis_reise')),
  mal_id           TEXT NOT NULL,
  tid              TEXT NOT NULL
);
INSERT INTO hendelseslogg_ny (id, administrator_id, handling, mal_id, tid)
  SELECT id, administrator_id, handling, mal_id, tid FROM hendelseslogg;
DROP TABLE hendelseslogg;
ALTER TABLE hendelseslogg_ny RENAME TO hendelseslogg;
