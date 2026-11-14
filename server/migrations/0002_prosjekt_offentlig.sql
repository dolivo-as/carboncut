-- Offentlig dashbord (1) eller skjult (0). Skjult gir samme 404 som et ukjent prosjekt.
-- DEFAULT 1: eksisterende prosjekter forblir offentlige.
ALTER TABLE prosjekt ADD COLUMN offentlig INTEGER NOT NULL DEFAULT 1 CHECK (offentlig IN (0, 1));
