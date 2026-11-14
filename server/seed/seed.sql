-- FIKTIVE testdata. Ingen ekte personer, bedrifter eller e-postadresser.
-- Ingen lenker seedes: tokenet skal bare finnes i det øyeblikket det lages (bruk admin-siden).
INSERT OR IGNORE INTO bedrift (id, navn, opprettet) VALUES
  ('00000000-0000-4000-8000-00000000b001', 'Testbedrift Fiktiv AS', '2026-11-14T00:00:00.000Z');
INSERT OR IGNORE INTO administrator (id, bedrift_id, epost, navn, rolle, opprettet) VALUES
  ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-00000000b001', 'admin@example.invalid', 'Fiktiv Admin', 'eier', '2026-11-14T00:00:00.000Z');
INSERT OR IGNORE INTO prosjekt (id, bedrift_id, navn, status, min_gruppe, opprettet_av, opprettet) VALUES
  ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000b001', 'Fiktivt prosjekt Nordvei', 'aktiv', 10, '00000000-0000-4000-8000-00000000a001', '2026-11-14T00:00:00.000Z');
