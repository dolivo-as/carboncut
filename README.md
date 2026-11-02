# Carboncut – testversjon

Enkel statisk testside som estimerer utslipp (kg CO₂e) fra reiser, sammenlignet med en referansebil (bensinbil, 1 person), og hva hjemmekontor sparer i unngått pendling.

> **Testversjon – estimerte tall, faktorversjon 1.** Tallene er estimater basert på kilder oppgitt i faktorlisten, og er ikke verifisert. Siden gir ingen garanti for faktisk miljøeffekt.

## Innhold

- `calc/` – beregningsmodulen (TypeScript): utslippsfaktorer (`src/factors.ts`), beregning (`src/calc.ts`) og tester. Faktorlisten ligger i `utslippsfaktorer_YTM.csv` / `.md` (v2, godkjent av CTO).
- `web/` – Vite + React + TypeScript + Tailwind. Importerer `calc/src` direkte (ingen kopi av logikken).
- `.github/workflows/pages.yml` – bygger og publiserer `web/dist` til GitHub Pages (kun filen; aktiveres først når den ligger i repoet og Pages er slått på).

## Kjøre lokalt

Krever Node.js 20.19 eller nyere (eller 22.12+). Testet med Node 20.19.2.

```bash
# Test beregningsmodulen
cd calc
npm install
npm run typecheck
npm test

# Kjør nettsiden
cd ../web
npm install
npm run dev          # utviklingsserver
npm run build        # bygger til web/dist
npm run preview      # forhåndsvis bygget (http://localhost:4173)
```

## Regler i beregningen

- Utslipp = distanse × faktor per etappe. Tur-retur dobler distansen. Avrunding skjer bare ved visning.
- Referanse = total distanse × bensinbil (0,25691 kg CO₂e per kjøretøy-km, 1 person). Besparelse = referanse − utslipp, og kan være negativ.
- Bil regnes med 1 person (per kjøretøy-km).
- Hjemmekontor = referansebilen over pendleavstanden (én vei eller tur-retur).
- Alle tall er livsløp, unntatt ferje («bare direkte utslipp»).
- Fly er regnet med høydeeffekt.
- Hybridbil og «annet» mangler kilde i faktorversjon 1 og kan ikke velges.
- Hver lagrede tur tar vare på en kopi (snapshot) av faktorene som ble brukt, med faktorversjon, kilde, utgave, dato og CSV-rad, slik at historikk ikke endres av senere faktorversjoner.

## Personvern

Ingen innlogging, ingen backend, ingen eksterne kall og ingen analytics. Turer lagres kun i nettleserens `localStorage` og kan slettes i siden.

## Kilder

Se «Metode og kilder» i siden og `calc/utslippsfaktorer_YTM.md`. Kort fortalt: Statens vegvesen VegLCA v6.03 (bil, buss, tog, fly, belegg), og Ruter for ferje (bare direkte utslipp). Elsparkesykkel (S1) er 0,061 kg CO₂e/pkm. Faktorverdier og kildedetaljer pr. rad står i CSV-filen.

Rå kildefiler (PDF/XLSX) og arbeidsskript ligger i `kilder/` lokalt, men er ikke med i git (`.gitignore`).

## Publisering

Siden skal ligge på `carboncut.no` (egendomene, `base: '/'`). `web/public/CNAME` kopieres til `dist` ved bygg. Repoet er foreløpig bare lokalt; ingen remote er satt.
