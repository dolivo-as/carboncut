-- CarbonCut trinn 2 – første skjema. Følger arkitektur/datamodell_og_server_v0.2.md (Tech Lead).
-- Ingen navn, e-post eller fritekst på reiser. IP lagres aldri i klartekst.

CREATE TABLE bedrift (
  id        TEXT PRIMARY KEY,
  navn      TEXT NOT NULL,
  opprettet TEXT NOT NULL
);

CREATE TABLE administrator (
  id         TEXT PRIMARY KEY,
  bedrift_id TEXT NOT NULL REFERENCES bedrift(id),
  epost      TEXT NOT NULL,
  navn       TEXT NOT NULL,
  rolle      TEXT NOT NULL CHECK (rolle IN ('eier','admin')),
  opprettet  TEXT NOT NULL
);

CREATE TABLE prosjekt (
  id           TEXT PRIMARY KEY,
  bedrift_id   TEXT NOT NULL REFERENCES bedrift(id),
  navn         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'aktiv' CHECK (status IN ('aktiv','arkivert')),
  min_gruppe   INTEGER NOT NULL DEFAULT 10 CHECK (min_gruppe >= 10),
  opprettet_av TEXT NOT NULL REFERENCES administrator(id),
  opprettet    TEXT NOT NULL
);
CREATE INDEX prosjekt_bedrift ON prosjekt(bedrift_id);

CREATE TABLE lenke (
  id              TEXT PRIMARY KEY,
  prosjekt_id     TEXT NOT NULL REFERENCES prosjekt(id),
  token_hash      TEXT NOT NULL UNIQUE,          -- SHA-256 (hex) av tokenet. Selve tokenet lagres aldri.
  token_prefiks   TEXT NOT NULL CHECK (length(token_prefiks) = 6),
  opprettet       TEXT NOT NULL,
  utloper         TEXT NOT NULL,
  trukket_tilbake TEXT,                           -- tidspunkt, NULL = aktiv
  opprettet_av    TEXT NOT NULL REFERENCES administrator(id)
);
CREATE INDEX lenke_prosjekt ON lenke(prosjekt_id);

CREATE TABLE reise (
  id              TEXT PRIMARY KEY,
  prosjekt_id     TEXT NOT NULL REFERENCES prosjekt(id),
  lenke_id        TEXT NOT NULL REFERENCES lenke(id),
  formaal         TEXT NOT NULL CHECK (formaal = 'jobb'),
  dato            TEXT NOT NULL CHECK (length(dato) = 10),   -- bare dag (YYYY-MM-DD)
  transportmiddel TEXT NOT NULL,                  -- hovedtransportmiddel (lengste etappe) eller home_office
  distanse_km     REAL NOT NULL,                  -- total fysisk distanse (inkl. tur-retur); hjemmekontor: unngått km
  tur_retur       INTEGER NOT NULL CHECK (tur_retur IN (0,1)),
  etapper         TEXT NOT NULL,                  -- JSON [{transportmiddel, distanse_km}] (avvik fra v0.2, se server/README.md)
  utslipp_kg      REAL NOT NULL,
  referanse_kg    REAL NOT NULL,
  faktorversjon   INTEGER NOT NULL,
  faktor_snapshot TEXT NOT NULL,
  skjult          INTEGER NOT NULL DEFAULT 0 CHECK (skjult IN (0,1)),
  opprettet       TEXT NOT NULL
);
CREATE INDEX reise_prosjekt ON reise(prosjekt_id, skjult);

-- noekkel = 'ip:' || HMAC(IP, døgnsalt) eller 'lenke:' || lenke_id. vindu = starttid for vinduet (epoch-sekunder).
CREATE TABLE misbruk_teller (
  noekkel TEXT NOT NULL,
  vindu   INTEGER NOT NULL,
  antall  INTEGER NOT NULL,
  PRIMARY KEY (noekkel, vindu)
);

-- Tilfeldig HMAC-nøkkel per døgn (UTC). Slettes etter 24 t, så gamle IP-HMAC-er ikke kan regnes om.
CREATE TABLE dognsalt (
  dag  TEXT PRIMARY KEY,
  salt TEXT NOT NULL
);

CREATE TABLE hendelseslogg (
  id               TEXT PRIMARY KEY,
  administrator_id TEXT NOT NULL REFERENCES administrator(id),
  handling         TEXT NOT NULL CHECK (handling IN ('opprett_prosjekt','opprett_lenke','forny_lenke','trekk_tilbake_lenke','skjul_reise')),
  mal_id           TEXT NOT NULL,
  tid              TEXT NOT NULL
);
