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
npm test                              # vitest i workerd (@cloudflare/vitest-plugin), D1 i minnet
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
| `POST /api/lenke` `{token}` | offentlig | Sjekker lenken og gir prosjektets id, navn og om dashbordet er offentlig. Ukjent, utløpt og trukket lenke gir identisk 404. Samme IP-teller som registrering |
| `POST /api/reiser` | offentlig (token i body) | Registrerer én jobbreise. Serveren regner CO₂ med `calc` |
| `GET /api/dashbord/:prosjektId` | offentlig | Bare summer. Under 10 registrerte reiser: ingen tall. Skjult dashbord gir samme 404 som ukjent prosjekt |
| `GET/POST /api/admin/prosjekter` | admin | Lister eller oppretter prosjekt. POST tar `navn`, valgfritt `utloper_maaneder` (3, 6 eller 12, forvalgt 12) og `offentlig` (boolean, forvalgt true), og lager første delelenke i samme svar |
| `GET/POST /api/admin/prosjekter/:id/lenker` | admin | Lister lenker (bare prefiks) eller lager ny (valgfritt `utloper_maaneder`). Tokenet vises én gang |
| `POST /api/admin/lenker/:id/trekk-tilbake` | admin | Trekker lenken tilbake, gjelder straks |
| `POST /api/admin/lenker/:id/forny` | admin | Trekker tilbake og lager ny i én D1-batch (transaksjon) |
| `POST /api/admin/prosjekter/:id/arkiver` | admin | Arkiverer prosjektet og trekker tilbake alle aktive lenker for godt i samme batch (begge logges). Lenkene gir da samme 404 som ukjent lenke, ny lenke og fornying gir 409. Ingenting slettes. Idempotent |
| `POST /api/admin/prosjekter/:id/gjenopprett` | admin | Setter prosjektet aktivt igjen (logges). Gamle lenker forblir trukket tilbake; admin lager ny lenke. Idempotent |
| `GET /api/admin/prosjekter/:id/reiser` | admin | De 200 nyeste reisene (dato, transportmiddel, km, tur-retur, kg, skjult) pluss `totalt` og `skjulte`. Ingen lenke-id, tokenprefiks eller innsendingstidspunkt |
| `POST /api/admin/reiser/:id/skjul` | admin | Skjuler én reise (logges). Skjulte reiser telles ikke i dashbord eller summer. Idempotent |
| `POST /api/admin/reiser/:id/vis` | admin | Viser en skjult reise igjen (logges som `vis_reise`). Idempotent |

Body for `POST /api/reiser`:
`{ token, formaal: "jobb", dato: "YYYY-MM-DD", type: "reise", etapper: [{ transportmiddel, distanse_km }], tur_retur, nettside: "" }`
eller `{ …, type: "hjemmekontor", pendling_km, tur_retur }`. Tall fra klienten (utslipp osv.) ignoreres.

## Sikkerhet og personvern (slik det er bygget)

- **Token:** 32 byte fra `crypto.getRandomValues`, base64url. Bare SHA-256 (hex) og de 6 første tegnene lagres.
- **Samme 404** for ukjent, utløpt, trukket og misdannet token, og for arkivert prosjekt. Status, body og header er like.
- **Bare jobb:** `formaal` må være `"jobb"`. Det sjekkes før tokenoppslaget, og D1 har i tillegg `CHECK (formaal = 'jobb')`.
- **Ratebegrensning:** 10 per time per IP-HMAC, felles for `POST /api/reiser` og `POST /api/lenke` og for alle forsøk (også ugyldige token), og 500 per døgn per lenke. Ved brudd svarer serveren 429. IPv4 telles per adresse og IPv6 per /64 (normalisert prefiks, se `ipGrunnlag`). IPv4-tilordnet IPv6 telles som IPv4. Uten `cf-connecting-ip` deler alle én «ukjent»-teller.
- **IP:** lagres aldri. Nøkkelen er `HMAC-SHA256(IP, døgnsalt)`, der døgnsaltet er 32 tilfeldige byte per UTC-døgn i tabellen `dognsalt`. Salt fra tidligere døgn og tellere eldre enn 24 t slettes (cron hver time og tilfeldig ved registrering).
- **Rimelighetssjekk:** 0,1–2 000 km per strekning og samlet, dato ikke fram i tid og ikke over 31 dager tilbake, bare transportmidler med dokumentert faktor. Honningfelt `nettside` gir 201 uten lagring.
- **CORS:** bare `https://carboncut.no` (`wrangler.toml`), og localhost bare via `DEV_ORIGINS` i `.dev.vars`. Andre opphav får 403 uten CORS-hoder. Kall **uten** `Origin` godtas (Tech Lead/CTO 14.11): admin bruker Bearer-nøkkel og ikke cookies, så CSRF er ikke aktuelt, og de offentlige rutene er ratebegrenset.
- **Dashbord:** se `src/dashbord.ts`. Celler under 5 går til «annet». Får «annet» 1–4, flyttes også minste synlige celle dit (sekundær undertrykking), slik at små tall ikke kan regnes ut ved å trekke fra. Fordelingen per transportmiddel summeres bare fra publiserte celler. Det finnes ingen dagsoppløsning, enkeltreiser eller ID-er, og teksten sier «registrerte reiser», aldri personer.

## Avvik fra v0.2 (til Tech Lead)

1. **Ny tabell `dognsalt`:** v0.2 sier «HMAC(IP, døgnsalt)», men ikke hvor saltet ligger. Tilfeldig salt i D1, slettet neste døgn.
2. **`reise.etapper` (JSON) og `reise.skjult`:** nettsiden har turer med flere strekninger. `transportmiddel` er strekningen med lengst distanse, og den brukes i dashbordet. `skjult` trengs for «admin kan skjule enkeltreiser».
3. **`trukket_tilbake` er et tidspunkt** (NULL = aktiv), ikke et flagg.
4. **`hendelseslogg.handling`** har også `opprett_prosjekt`.
5. **Hjemmekontor** sendes som `transportmiddel = 'home_office'`, `distanse_km` = unngått km, utslipp 0 (som `calculateHomeOffice`).
6. **«Caches»:** bare `Cache-Control: public, max-age=300` på dashbordet, ikke Cache API eller KV.
7. **`prosjekt.offentlig` (migrering 0002):** 1 = åpent dashbord, 0 = skjult. Skjult gir samme 404 som ukjent id. Forvalgt 1.
8. **Valgbart utløp:** lenker kan vare 3, 6 eller 12 måneder (forvalgt 12). Andre verdier avvises med 422.
9. **Arkivering (migrering 0003_arkivering_og_vis_reise, ikke med i 16.11):** `prosjekt.status` (aktiv|arkivert) fantes fra 0001. 0003 utvider bare `hendelseslogg.handling` med `arkiver_prosjekt`, `gjenopprett_prosjekt` og `vis_reise` (tabellen bygges på nytt én gang, radene kopieres; tidligere 0003 og 0004 er slått sammen, CTO 14.11). Testet på fiktive rader i `test/migrering.test.ts`. Arkivering trekker tilbake alle aktive lenker for godt (samme mekanisme og logg som «Trekk tilbake»), og gjenoppretting gjør dem ikke gyldige igjen; admin lager ny lenke og QR-kode (CTO 14.11). Reiser og lenkerader slettes ikke. Offentlig dashbord for et arkivert prosjekt vises fortsatt, med `status: "arkivert"`; skjult dashbord og grensen på 10 reiser gjelder som før (CTO 14.11). Før 0003 går ut, tester Tester den med `migrations apply --local` på en database med fiktive rader.
10. **Skjul reiser (etter 16.11):** `reise.skjult` og `skjul_reise` fantes fra 0001; `vis_reise` kommer med 0003. Admin-lista over reiser viser bare ISO-uke (ikke dag), transportmiddel, eksakt km, tur-retur og kg (CTO 14.11), og er begrenset til de 200 nyeste. Dashbordet caches i 5 minutter, så en skjult reise kan vises så lenge.

## Avhengigheter og npm audit (14.11.2026)

**Utgangspunkt (`3a60b9b`):** `npm audit` i `server/` ga 6 «high», 0 «critical». Alle kom fra test-pakken `@cloudflare/vitest-pool-workers@0.23.0` (utfaset, omdøpt til `@cloudflare/vitest-plugin`), som tok med seg egne, eldre kopier av wrangler og miniflare:

| Pakke (sårbar versjon) | Kjede | Råd (fra audit) | Bare dev? |
|---|---|---|---|
| `@cloudflare/vitest-pool-workers` 0.23.0 | direkte devDependency | arver fra miniflare, wrangler, zod | ja |
| `wrangler` 4.124.0 (egen kopi; vår direkte wrangler 4.162.0 var ikke berørt) | vitest-pool-workers → wrangler | arver fra miniflare | ja |
| `miniflare` 5.20260815.0-alpha | vitest-pool-workers → miniflare (og → wrangler 4.124.0 → miniflare) | arver fra sharp og undici | ja |
| `undici` 7.29.0 | … → miniflare → undici | 18 råd, blant annet GHSA-2m5v-pch6-74hx og GHSA-4w7w-5xrc-9h26 (rettet i ≥7.30.1) | ja |
| `sharp` 0.35.2 | … → miniflare → sharp | GHSA-rgj7-g3m4-5g8c (libheif) og GHSA-wq5f-xc86-pv6w (librsvg) | ja |
| `zod` 4.4.3 | vitest-pool-workers → zod | GHSA-mrhx-c7xc-m3w5 (minnebruk ved store samlinger) | ja |

Audit foreslo `@cloudflare/vitest-pool-workers@0.12.21` (major-nedgradering). Det ble ikke gjort.

**Tiltak:** byttet til etterfølgeren `@cloudflare/vitest-plugin@1.8.2`. Den bruker wrangler 4.162.0, miniflare 5.20261113.0-beta (med undici 7.30.1 og sharp 0.35.5) og zod 4.6.6. Etter byttet gir `npm audit`: **0 sårbarheter**. Alle tester består, og `compatibility_date` kunne settes tilbake til 2026-11-01.

**Worker-bundelen:** `npx wrangler deploy --dry-run --outdir dist-sjekk` (ingen innlogging, ingen utrulling) gir én fil der kildekartet bare inneholder `calc/src/calc.ts`, `calc/src/factors.ts` og `server/src/*.ts`. **Ingen npm-pakker havner i Worker-bundelen**, heller ikke undici, sharp, zod, miniflare eller wrangler. Bindingene i dry-run er bare `DB` og `ALLOWED_ORIGINS`, så `.dev.vars` er ikke med. CI (`.github/workflows/ci.yml`) bygger bundelen på samme måte og sjekker at testnøkkelen ikke er med.

Merk: npm 11 kjører ikke installasjonsskript uten godkjenning (`workerd`, `esbuild`). Lokalt virket alt likevel. CI bruker Node 22 med npm 10, som kjører dem.
