# Designnotat v1 – Carboncut (U-26-01)

**Fra:** UX/UI-designer · **Dato:** 04.11.2026 (Europe/Oslo) · **Status:** utkast til review – ingenting er bygget eller publisert

**Prototype:** `ux/skisser-v1.html` (én fil, ingen eksterne kall, åpnes rett i nettleser)
**Skjermbilder:** `ux/skjerm-*-lys.png` og `ux/skjerm-*-mork.png` (390 × 844, 2x). Bildene er av prototypen, ikke av carboncut.no.

## 1. Bakgrunn
Eier mener testsiden har «fryktelig dårlig design og litt lite brukervennlig». Jeg har gått gjennom koden i `web/src` og fant dette:

- Reisemåte velges i nedtrekksliste.
- Feltene er små (`px-2 py-1.5`), langt under 48 px.
- Dato og beskrivelse kommer før selve registreringen.
- Resultatet er fire små tallbokser.
- Metode-tabellen har 10 kolonner og krever sideveis rulling på mobil.
- Det finnes verken mørk modus eller språkvalg.

Alt dette passer dårlig for en bruker som står på en holdeplass i sol, kanskje med hansker.

## 2. Hovedgrep
1. **Mobil først (360–390 px).** Alle knapper, felt og faner er minst 48 × 48 px. Teksten er 17 px eller større, og kontrastene er valgt for sollys.
2. **Én hovedhandling på forsiden:** «Registrer tur». Under den ligger en enkel oversikt: estimert utslipp, estimert besparelse, antall turer og siste turer.
3. **Registrering i tre steg** (Reisemåte → Avstand → Resultat) med synlig fremdrift.
   - **Steg 1:** store fliser i stedet for nedtrekksliste, gruppert som «Til fots og lett», «Bil», «Kollektivt», «Fly og annet» og «Ikke en reise». Valg av flis går direkte til neste steg.
   - **Steg 2:** kilometer, flere delstrekninger («+ Legg til delstrekning»), tur-retur og hjemmekontor som eget valg. Hjemmekontor er ikke en reise, så det har et eget løp: unngått pendling × bensinbil, med utslipp 0.
   - **Steg 3:** ett stort tall med «estimert kg CO₂e». Under det står en stolpe som sammenligner turen med bensinbil, 1 person, 0,25691 kg/km. Til slutt kommer regnestykket linje for linje.
4. **Ærlig om data.**
   - Bybuss og Regional-/ekspressbuss er to separate fliser.
   - Ferje har merket «Bare direkte utslipp».
   - Hybridbil og Annet vises som «Mangler kilde», med stiplet ramme og tekst. De kan trykkes for en forklaring, men ikke velges til beregning.
   - Status vises med ikon og tekst, aldri med farge alene.
5. **Negativ besparelse vises tydelig, ikke skjules.** Fly 400 km gir −8,528 estimert kg CO₂e. Teksten sier «Turen gir høyere estimert utslipp enn bensinbilen», med rød farge, ▼ og minustegn.
6. **Alle tall er merket «estimert kg CO₂e».** Banneret «Testversjon – estimerte tall, faktorversjon 1» ligger alltid øverst. Ingen felt for antall passasjerer (runde 2).
7. **Metode-fane** (egen fane i bunnmenyen). Den har kort forklaring, formel, referansebil og en kildetabell for faktorversjon 1. Tabellen er en vanlig semantisk tabell på bred skjerm og blir kort per transportform under 700 px.
8. **Mørk/lys-bryter og NB/EN-bryter** i toppen på alle skjermer. Valgene huskes ikke i prototypen. Det er en byggeoppgave.
9. **Tailwind/shadcn-uttrykk:** rolig slate-/emerald-palett, 12 px radius, kort (card), badges, segmentert bryter og tydelig fokusring. Fargene er CSS-variabler, så de kan flyttes rett over til Tailwind-tema eller shadcn-tokens.

## 3. Tall og kilder
Faktorene i prototypen er ikke skrevet for hånd. De er dumpet fra `calc/src/factors.ts` (faktorversjon 1, `utslippsfaktorer_YTM` v2, 02.11.2026) til `ux/build/factors.json`, og beregningen følger `calc/src/calc.ts`. Disse reglene er med:

- Utslipp = Σ km × (tur-retur ? 2 : 1) × faktor.
- Referanse = total km × 0,25691.
- Besparelse = referanse − utslipp, som kan bli negativ.
- Hjemmekontor gir utslipp 0 og unngått pendling × 0,25691.
- Ingen avrunding i beregningen, bare i visningen (2–3 desimaler).
- Bilfaktorene gjelder per kjøretøy-km med 1 person.

Eksemplene på forsiden og i resultatet er regnet ut med disse faktorene og merket «Eksempel». Håndsjekk:

| Eksempel | Regnestykke | Resultat |
|---|---|---|
| Bybuss 13 km + elektrisk tog 40 km | 1,439 + 0,192 | 1,631 estimert kg CO₂e |
| Referanse for samme tur | 53 km × 0,25691 | 13,616 estimert kg CO₂e |
| Fly 400 km | 400 × 0,27823 | 111,292 mot 102,764, altså −8,528 |

## 4. Hva er endret fra dagens testside, og hvorfor

| Dagens testside | Prototype v1 | Hvorfor |
|---|---|---|
| Nedtrekksliste for reisemåte | Store fliser gruppert etter type | Treffbart med hansker, og alle valg er synlige uten å åpne noe. |
| Små felt, ca. 36 px høye | Minst 48 px på alt som kan trykkes | Krav fra CTO. |
| Dato og beskrivelse først | Reisemåte først. Beskrivelse er valgfri og kommer til slutt. | Færre felt før første resultat. |
| Radio «Reise/Hjemmekontor» | Hjemmekontor er egen flis med eget løp | Hjemmekontor er ikke en transportform. |
| Én strekning per tur | Flere delstrekninger | Buss + tog er vanlig. |
| Fire små tallbokser som resultat | Ett stort tall, en stolpe og et regnestykke | Lettere å lese og å etterprøve. |
| 10 kolonner i metodetabell | Kort per transportform under 700 px | Ingen sideveis rulling. |
| Ingen mørk modus og ett språk | Lys/mørk og NB/EN | Krav fra CTO. |
| Mangler-kilde kjent bare i data | Synlig status med ikon og tekst, ikke valgbar | Vi viser ikke tall vi ikke har kilde til. |

## 5. Tilgjengelighet (WCAG AA)
- **Kontrast:** alle token-par er regnet ut for lys og mørk modus.
  - Brødtekst har 7,2:1 eller mer, og de fleste par ligger over 8:1.
  - UI-kanter har minst 4,5:1 (krav 3:1).
  - Svakeste tekstpar er varselkanten i lys modus (4,5:1) og i mørk modus (4,3:1). Begge er kantlinjer, ikke tekst, og kravet for dem er 3:1.
- **Fokus:** 3 px fokusring på alle elementer.
- **Skjermleser og tastatur:** semantiske knapper, `aria-pressed`, `aria-disabled`, `aria-live`-hint og fokusflytt til overskriften ved stegbytte.
- **Språk:** `lang` settes per språkknapp.
- **Mobil:** ingen horisontal rulling på 360 og 390 px.

## 6. Verifisering som er gjort
Headless Chrome (Playwright) klikket gjennom alle flyter i lys og mørk modus. Flytene var registrering med buss + tog + tur-retur, fly med negativt resultat, ferje, hybrid «mangler kilde», hjemmekontor → lagre, Metode og EN.

- Ingen konsoll- eller sidefeil.
- Ingen eksterne forespørsler.
- Ingen horisontal overflow på 360 og 390 px.
- Ingen trykkbare elementer under 48 px.

Dette er en automatisk sjekk. Det er ikke en brukertest, og ikke testet på ekte enhet, i sol eller med hansker.

## 7. Åpne spørsmål
1. **Auto-videre ved trykk på flis.** Er det greit at valg av reisemåte går rett til neste steg? Det er raskt, men gir en ekstra «Tilbake» ved feilvalg.
2. **Navn på bussene.** Prototypen bruker «Bybuss» og «Regional-/ekspressbuss». `factors.ts` har «Buss (by)» og «Buss (region/express)». Hvilke navn skal gjelde?
3. **Dato og beskrivelse.** Dato er tatt ut av flyten (turen får dagens dato), og beskrivelse er valgfri til slutt. Trenger Product Manager dato på hver tur, for eksempel for å registrere tidligere reiser?
4. **Historikk og lagring.** Slett per tur, «Slett alle» og lagring i localStorage finnes på dagens side. Prototypen viser bare «Slett alle» med bekreftelse. Skjerm for full turhistorikk er ikke tegnet.
5. **Tekst for «mangler kilde».** Er «Hybridbil mangler kilde i faktorversjon 1 og kan ikke brukes i beregningen» riktig formulering, og skal det vises noe om når kilden kan komme?
6. **Eksempeldata på forsiden.** Skal en ny bruker se «Eksempel»-turer, eller et tomt oversiktsbilde med bare «Registrer tur»?
7. **Engelsk.** Kildetekstene i metodetabellen er på norsk også i EN-visning. Skal de oversettes, eller er det greit i testversjonen?
8. **Hurtigknapper for km** (+1/+5/+10) er bare hjelp i grensesnittet og lagrer ingen data. Skal de være med?

## 8. Kostnad (anslag for Fullstack/Frontend, ikke bekreftet)
- **Mobil-first rammeverk og tema** (Tailwind-tokens, lys/mørk, NB/EN): 0,5 dag.
- **Registreringsflyt i tre steg** med fliser, delstrekninger og hjemmekontor: 1–1,5 dag.
- **Resultatvisning og forside:** 0,5 dag.
- **Metode-fane** med responsiv kildetabell: 0,5 dag.
- **Tilgjengelighet, test på enhet og småfiks:** 0,5 dag.

Totalt ca. 3–3,5 dagers arbeid. Det er mer enn CTOs tidligere anslag på 1–2 dager, fordi det er en ny flyt og ikke bare en omstyling. Det er ingen annen kostnad enn intern tid, og ingen nye avhengigheter. Beregningskjernen (`calc/`) røres ikke.

## 9. Risiko
- **Tilleggsarbeid:** ny flyt og endrede komponenter i `web/` kan gi regresjoner i eksisterende tester. Beregningslogikken er uendret, men visningen er bygget om.
- **Treffbarhet:** auto-videre på flis kan gi feiltrykk. Tilbake-knappen og en tydelig angre-mulighet må testes.
- **Misforståelse av tallene:** negativt resultat og «bare direkte utslipp» (ferje) må leses riktig. De bør testes med ekte brukere.
- **Prototypen er ikke produksjonskode.** Den har ingen lagring mellom besøk, og språk og tema huskes ikke.
- **Mørk kontrast og sollys** er målt som tall, ikke sett i virkeligheten.

## 10. Neste steg
1. **Tester** går gjennom prototypen (`ux/skisser-v1.html`) mot kravene: 48 px, WCAG AA, mangler-kilde-regler og negativ besparelse.
2. **Product Manager** svarer på de åpne spørsmålene i punkt 7 og godkjenner flyten og tekstene.
3. UX retter prototypen etter tilbakemeldingene (v2).
4. **Fullstack/Frontend bygger først etter at Tester og Product Manager har godkjent.**
5. Kort test med 2–3 personer utendørs (sol, hansker) før publisering.

## Filer
- `ux/skisser-v1.html` – klikkbar prototype
- `ux/designnotat-v1.md` – dette notatet
- `ux/skjerm-*-lys.png` / `*-mork.png` – skjermbilder
- `ux/build/` – mal, faktordump og byggescript (`python3 build/build.py`)
