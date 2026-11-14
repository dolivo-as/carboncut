# CarbonCut API – trinn 2 (bare lokalt)

Cloudflare Worker (TypeScript) + D1. Følger `arkitektur/datamodell_og_server_v0.2.md` (Tech Lead, 13.11.2026).
**Ingen Cloudflare-konto er brukt.** Alt kjører med `wrangler dev --local` og lokal D1 (miniflare/workerd). Ingen `account_id`, og `database_id` er en plassholder.

## Kjøre lokalt

```bash
cd server
npm install
cp .dev.vars.example .dev.vars        # bytt ADMIN_DEV_KEY til en lang tilfeldig streng
npm run db:migrate                    # lokal D1 i .wrangler/ (gitignored)
npm run db:seed                       # fiktiv bedrift, admin og prosjekt
npm run db:demo                       # valgfritt: 24 fiktive reiser, så dashbordet har noe å vise
npm run dev                           # http://127.0.0.1:8787
npm test                              # vitest i workerd (@cloudflare/vitest-pool-workers), D1 i minnet
npm run typecheck
```

Nettsiden (`web/`, `npm run dev`) bruker `http://127.0.0.1:8787` i utvikling. I et produksjonsbygg må `VITE_API_URL` settes. Uten den viser server-sidene «Serveren er ikke satt opp ennå», og trinn 1 virker som før.

Ruter i nettsiden (hash, så tokenet aldri havner i en server-logg som del av stien):
- `#/admin`: prosjekter, delelenker og QR (dev-innlogging)
- `#/r/<token>`: registrering via delelenke. Jobb sendes, privat blir i nettleseren
- `#/dashbord/<prosjekt-id>`: åpent dashbord

## ⚠️ Midlertidig admin-innlogging – MÅ byttes før ekte konto

`src/auth.ts` er et dev-lag: `Authorization: Bearer <ADMIN_DEV_KEY>` mot en nøkkel i `.dev.vars` (gitignored), og den knyttes til én fiktiv admin (`ADMIN_DEV_ID`).
Laget er bare på når `MILJO=lokal`, og det står bare i `.dev.vars`. En utrulling uten `.dev.vars` svarer **503** på alle admin-kall.
Laget må byttes ut med Clerk (runde 2) før serveren kobles til en ekte konto. Tech Lead gjør kodegjennomgang først.

## Endepunkter

| Metode og sti | Tilgang | Hva |
|---|---|---|
| `POST /api/lenke` `{token}` | offentlig | Sjekker lenken og gir prosjektnavnet. Ukjent, utløpt og trukket lenke gir identisk 404 |
| `POST /api/reiser` | offentlig (token i body) | Registrerer én jobbreise. Serveren regner CO₂ med `calc` |
| `GET /api/dashbord/:prosjektId` | offentlig | Bare summer. Under 10 registrerte reiser: ingen tall |
| `GET/POST /api/admin/prosjekter` | admin | Lister eller oppretter prosjekt |
| `GET/POST /api/admin/prosjekter/:id/lenker` | admin | Lister lenker (bare prefiks) eller lager ny. Tokenet vises én gang |
| `POST /api/admin/lenker/:id/trekk-tilbake` | admin | Trekker lenken tilbake, gjelder straks |
| `POST /api/admin/lenker/:id/forny` | admin | Trekker tilbake og lager ny i én D1-batch (transaksjon) |
| `POST /api/admin/reiser/:id/skjul` | admin | Skjuler én reise (logges). Har ikke grensesnitt ennå |

Body for `POST /api/reiser`:
`{ token, formaal: "jobb", dato: "YYYY-MM-DD", type: "reise", etapper: [{ transportmiddel, distanse_km }], tur_retur, nettside: "" }`
eller `{ …, type: "hjemmekontor", pendling_km, tur_retur }`. Tall fra klienten (utslipp osv.) ignoreres.

## Sikkerhet og personvern (slik det er bygget)

- **Token:** 32 byte fra `crypto.getRandomValues`, base64url. Bare SHA-256 (hex) og de 6 første tegnene lagres.
- **Samme 404** for ukjent, utløpt, trukket og misdannet token, og for arkivert prosjekt. Status, body og header er like.
- **Bare jobb:** `formaal` må være `"jobb"`. Det sjekkes før tokenoppslaget, og D1 har i tillegg `CHECK (formaal = 'jobb')`.
- **Ratebegrensning:** 10 per time per IP-HMAC (teller alle forsøk, også ugyldige token) og 500 per døgn per lenke. Ved brudd svarer serveren 429.
- **IP:** lagres aldri. Nøkkelen er `HMAC-SHA256(IP, døgnsalt)`, der døgnsaltet er 32 tilfeldige byte per UTC-døgn i tabellen `dognsalt`. Salt fra tidligere døgn og tellere eldre enn 24 t slettes (cron hver time og tilfeldig ved registrering).
- **Rimelighetssjekk:** 0,1–2 000 km per strekning og samlet, dato ikke fram i tid og ikke over 31 dager tilbake, bare transportmidler med dokumentert faktor. Honningfelt `nettside` gir 201 uten lagring.
- **CORS:** bare `https://carboncut.no` (`wrangler.toml`), og localhost bare via `DEV_ORIGINS` i `.dev.vars`. Andre opphav får 403 uten CORS-hoder.
- **Dashbord:** se `src/dashbord.ts`. Celler under 5 går til «annet». Får «annet» 1–4, flyttes også minste synlige celle dit (sekundær undertrykking), slik at små tall ikke kan regnes ut ved å trekke fra. Fordelingen per transportmiddel summeres bare fra publiserte celler. Det finnes ingen dagsoppløsning, enkeltreiser eller ID-er, og teksten sier «registrerte reiser», aldri personer.

## Avvik fra v0.2 (til Tech Lead)

1. **Ny tabell `dognsalt`:** v0.2 sier «HMAC(IP, døgnsalt)», men ikke hvor saltet ligger. Tilfeldig salt i D1, slettet neste døgn.
2. **`reise.etapper` (JSON) og `reise.skjult`:** nettsiden har turer med flere strekninger. `transportmiddel` er strekningen med lengst distanse, og den brukes i dashbordet. `skjult` trengs for «admin kan skjule enkeltreiser».
3. **`trukket_tilbake` er et tidspunkt** (NULL = aktiv), ikke et flagg.
4. **`hendelseslogg.handling`** har også `opprett_prosjekt`.
5. **Hjemmekontor** sendes som `transportmiddel = 'home_office'`, `distanse_km` = unngått km, utslipp 0 (som `calculateHomeOffice`).
6. **«Caches»:** bare `Cache-Control: public, max-age=300` på dashbordet, ikke Cache API eller KV.
7. **`compatibility_date = 2026-08-01`:** test-runtime (workerd i vitest-pool-workers 0.23) støtter ikke nyere dato.
