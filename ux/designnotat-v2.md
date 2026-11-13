# Designnotat v2 – Carboncut (U-26-01)

**Fra:** UX/UI-designer · **Dato:** 05.11.2026 (Europe/Oslo) · **Status:** utkast til review – ingenting er bygget eller publisert

**Prototype:** `ux/skisser-v2.html` (én fil, ingen eksterne kall, åpnes rett i nettleser)
**Skjermbilder:** `ux/skjerm-v2-<navn>-lys.png` og `ux/skjerm-v2-<navn>-mork.png` (390 × 844, 2x). Bildene er av prototypen, ikke av carboncut.no.
**v1 er uendret:** `skisser-v1.html`, `designnotat-v1.md`, v1-skjermbildene og `build/template.html` ligger som før.

## 1. Bakgrunn
Eier la til tre krav etter v1:

- Det skal være innloggingsmuligheter.
- Løsningen er først og fremst for bedrifter, men enkeltpersoner skal også kunne bruke den.
- Den må kunne skille mellom jobbrelaterte og private reiser.

v2 legger dette inn som en klikkbar skisse. Alt fra v1 er beholdt: mobil først, lys/mørk, NB/EN, banneret «Testversjon – estimerte tall, faktorversjon 1», «estimert kg CO₂e», «mangler kilde» og ingen felt for passasjerer.

## 2. Hva er nytt fra v1

| Område | v1 | v2 |
|---|---|---|
| Innlogging | Finnes ikke | Skisse av `/login` og `/register`. Tydelig merket «SKISSE». Clerk kommer senere, og ingenting sendes eller lagres. |
| Kontotype | Finnes ikke | **Bedrift** (opprett firma, eller bli med via invitasjonskode og vent på godkjenning) eller **Privatperson** (egen konto uten firma). |
| Formål per tur | Finnes ikke | Nytt **steg 1: Jobb eller Privat**, to store knapper (minst 48 px, i prototypen ca. 130 px høye). Registreringen er nå fire steg. |
| Forhåndsvalg | – | Jobb for bedriftsbruker, Privat for privatperson. Brukeren kan endre per tur. |
| Personvern | – | Egen boks på formålssteget: «Private turer vises bare for deg. De inngår aldri i firmaets tall, toppliste eller eksport.» Den står også på kontosiden og på resultatet. |
| Forside | Én samlet oversikt | **Jobb** og **Privat** hver for seg, med egen sum, besparelse og antall. Gamle turer uten formål ligger under **Ikke oppgitt**, med knappene «Jobb» og «Privat» på hver tur. |
| Resultat | – | Merke Jobb/Privat på resultatet. «Tilbake» fra resultatet går via reisemåte og avstand til formål. Etter lagring vises «Tur lagret som Jobb/Privat». |
| Konto | – | Ny fane «Konto» (tre faner: Oversikt, Metode, Konto). Viser kontotype, firma, rolle, status og «Logg ut». En privatperson kan sende forespørsel om å bli med i et firma og beholde turene sine. |
| Hjemmekontor | Egen flis | Vises bare når turen er Jobb. Hjemmekontor er ikke en privat tur. |
| Metode | – | Ny linje: «Faktorversjon 1 = godkjent faktorliste v2 (utslippsfaktorer_YTM.csv)» (og en engelsk versjon). |

**Demo-snarveier.** Siden det ikke finnes ekte innlogging, har innloggingsskjermen to knapper: «Demo som bedriftsbruker» og «Demo som privatperson». Skjemaene i `/login` og `/register` validerer ingenting. De står der for å vise oppbyggingen.

## 3. Hvordan flyten fungerer

1. **Logg inn / opprett konto.** Eier velger kontotype.
   - *Bedrift – opprett firma:* firmanavn, navn, e-post, passord. Den som oppretter blir administrator (forslag).
   - *Bedrift – bli med:* invitasjonskode fra firmaets administrator. Brukeren får skjermen «Venter på godkjenning» og har ikke tilgang før den er godkjent.
   - *Privatperson:* navn, e-post, passord. Ingen firma. Senere kan brukeren bli med i et firma og beholde turene sine.
2. **Forside.** Jobb og Privat vises hver for seg. En privatperson ser «Du er ikke med i noe firma. Ingen andre ser turene dine.»
3. **Registrer tur, steg 1 – Formål.** Jobb eller Privat, med forhåndsvalg etter kontotype. Pendling er markert som åpent spørsmål.
4. **Steg 2–4.** Reisemåte, avstand og resultat som i v1. Hjemmekontor tilbys bare for Jobb.
5. **Lagre.** Turen lagres med formål. På forsiden havner den under riktig gruppe.

## 4. Tall og kilder
Ingen nye tall. Prototypen bruker samme `build/factors.json` (faktorversjon 1, dumpet fra `calc/src/factors.ts`) og samme regler som v1: utslipp = Σ km × (tur-retur ? 2 : 1) × faktor, referanse = km × 0,25691, ingen avrunding i beregningen. Eksempelturene er i hovedsak de samme som i v1, nå med formål. Den eldre turen uten formål er bybuss 13 km + elektrisk tog 40 km = 1,631 estimert kg CO₂e (håndsjekket i v1). Jobb- og privatsummene på forsiden regnes ut fra eksemplene og er merket «Eksempeldata i prototypen». Sjekk: privat-eksempelet bybuss 6 km gir 0,664 estimert kg CO₂e med de samme faktorene.

## 5. Tilgjengelighet (WCAG AA) og verifisering
Headless Chrome (Playwright) klikket gjennom alle flyter i lys og mørk modus på 390 og 360 px: innlogging, registrering (opprett firma, invitasjonskode, privatperson), venter på godkjenning, forside for begge kontotyper, formålssteg med begge valg, registrering med delstrekninger og tur-retur, «mangler kilde» (hybrid), fly med negativt resultat, hjemmekontor, merking av «Ikke oppgitt»-tur, konto, forespørsel om å bli med i firma, Metode (NB og EN, med den nye linjen) og språkbytte.

- Ingen konsoll- eller sidefeil, ingen advarsler.
- Ingen eksterne forespørsler.
- Ingen horisontal overflow på 360 og 390 px.
- Ingen trykkbare elementer under 48 px (kontrollert på hver skjerm).
- Kontrast kontrollert på all synlig tekst, mot faktisk bakgrunn, i lys og mørk modus: ingen under 4,5:1 (3:1 for stor tekst). Laveste målte verdi var 6,5:1.
- Status vises med ikon og tekst, ikke farge alene (Jobb/Privat/Ikke oppgitt har eget ikon og tekstmerke).

Dette er en automatisk sjekk. Det er ikke en brukertest, ikke testet med skjermleser på ekte enhet, og ikke testet i sol eller med hansker.

## 6. Åpne spørsmål
1. **Pendling (hjem–jobb).** Jobb, Privat eller en egen kategori? Ikke avgjort. Prototypen lar brukeren velge selv og viser spørsmålet som åpent. Svaret påvirker firmaets tall, for pendling er ofte en stor post.
2. **Innloggingsmetode.** Microsoft-konto (Entra ID) for bedrift, BankID, e-post + passord, eller flere? Det styrer hvilke knapper skjermen skal ha og hva Clerk må settes opp med. Skissen har bare e-post og passord som plassholder.
3. **Databehandleravtale.** Når firmaer legger inn ansattes reiser, er firmaet behandlingsansvarlig og vi (og Clerk, som underleverandør) databehandler. Trenger vi avtale, og hvem skriver og godkjenner den? Dette må avklares før ekte brukere.
4. **Ikke oppgitt.** Skisse: gamle turer uten formål teller ikke med i firmaets tall før brukeren har merket dem. Er det riktig, eller skal de telle som Jobb?
5. **Hva ser firmaet?** Aggregert eller per ansatt (navn)? Toppliste og eksport er nevnt som mulige, men er ikke tegnet. Teksten «bare for deg» er bare riktig hvis vi faktisk bygger det slik.
6. **Overgang privat → firma.** Skal turene en privatperson allerede har registrert som Jobb flyttes med til firmaet, eller bare nye? Skissen sier at turene beholdes, og at private turer aldri deles.
7. **Venter på godkjenning.** Kan en bruker i ventestatus registrere turer for seg selv i mellomtiden? Skissen sier nei.
8. **Administratorrolle.** Den som oppretter firmaet blir administrator. Hvem kan invitere, godkjenne og fjerne? Og hva skjer med turene når en ansatt slutter?
9. **Hjemmekontor under Privat.** Skjult i skissen, fordi hjemmekontor bare gir mening som jobbrelatert. Er det riktig?
10. **Spørsmål fra v1 som fortsatt står:** navn på bussene, dato per tur, full turhistorikk, tekst for «mangler kilde», eksempeldata for nye brukere, engelsk i metodetabell og hurtigknapper for km.

## 7. Kostnad (anslag, ikke bekreftet av Fullstack)
**Design:** prototype, notat og skjermbilder v2 er laget som intern tid. Ingen annen kostnad.

**Konsekvens for bygging.** Dette er tillegg til v1-anslaget på 3–3,5 dager.

- **Formålsteg og Jobb/Privat-visning på forsiden** (frontend og datamodell med formål per tur, «ikke oppgitt» for gamle turer): 1 dag.
- **Kontoside, venteskjerm og skjemaer** (frontend uten ekte innlogging): 0,5–1 dag.
- **Ekte innlogging med Clerk** (kontotyper, firma, invitasjonskoder, godkjenning, roller, beskyttede ruter, kobling mellom bruker og turer i databasen): Fullstack har pekt på at dette trolig ikke ryker inn i første runde, og tar sannsynligvis runde 2. Anslag 3–5 dager, avhengig av svar på åpne spørsmål 2, 5 og 8. Dette er et grovt gjett og må bekreftes av Fullstack.
- **Server-side regler for personvern** (private turer filtreres bort fra firma-spørringer og eksport, med tester): 1 dag, og kan ikke utsettes når innloggingen kommer.
- **Clerk:** sannsynligvis en gratis eller billig plan i starten, men prisen må sjekkes mot antall brukere før vi bestemmer. Jeg har ikke sjekket den.

**Konsekvens for første runde.** Hvis innlogging tas i runde 2, kan første runde bygges med bare formålssteget og Jobb/Privat-visningen lokalt (turer lagret i nettleseren som før). Da vises ingen firmatall, og personvernteksten om firmaet må vente eller omformuleres, fordi ingen firma ser noe ennå.

## 8. Risiko
- **Private data synlig for arbeidsgiver.** Det viktigste. Hvis et privat valg lekker til firmaets tall, toppliste eller eksport, mister vi tillit hos ansatte og kan få et personvernproblem (GDPR). Tiltak:
  - Filtrer på serversiden, ikke bare i visningen.
  - Test at private turer aldri vises i firma-spørringer, API og eksport.
  - Bruk kort, ærlig tekst på formålssteget (finnes i v2).
  - Avklar hva firmaet faktisk ser per ansatt (åpent spørsmål 5).
- **Feil forhåndsvalg.** Jobb som standard for bedriftsbruker kan gi at private turer registreres som Jobb ved uoppmerksomhet. Det rammer firmatallene, og gjør også at en privat tur kan bli synlig. De to store knappene og merket på resultatet reduserer risikoen, men standard bør testes med ekte brukere.
- **Pendling uten avklaring** gir ulike tall mellom brukere.
- **Innlogging i runde 2** betyr at v1/v2 uten login ikke kan brukes av flere i samme firma i første runde.
- **Databehandleravtale og GDPR** er ikke avklart (åpent spørsmål 3).
- **Prototypen er ikke produksjonskode.** Innlogging er bare en skisse, og ingenting lagres mellom besøk.
- **Kontrast og treffbarhet** er målt som tall, ikke prøvd i virkeligheten.

## 9. Neste steg
1. **Product Manager** svarer på de åpne spørsmålene i punkt 6, særlig pendling, innloggingsmetode og hva firmaet ser.
2. **Eier/ledelse** avklarer databehandleravtale og hvem som eier den.
3. **Fullstack** bekrefter anslaget for Clerk og avgjør om innlogging tas i runde 2.
4. **Tester** går gjennom `skisser-v2.html` mot kravene (48 px, WCAG AA, skillet mellom Jobb og Privat, «ikke oppgitt», Metode-linjen).
5. UX retter prototypen etter tilbakemeldingene (v3), og tegner vid skjerm for admin/firmaoversikt hvis den skal være med.
6. **Fullstack/Frontend bygger først etter at Tester og Product Manager har godkjent.**
7. Kort test med 2–3 personer, gjerne både en bedriftsbruker og en privatperson, før publisering.

## Filer
- `ux/skisser-v2.html` – klikkbar prototype v2
- `ux/designnotat-v2.md` – dette notatet
- `ux/skjerm-v2-<navn>-lys.png` / `-mork.png` – skjermbilder (login, login-en, register-tom, register-bedrift-opprett, register-bedrift-kode, register-privat, venter-godkjenning, forside-bedrift, forside-bedrift-en, forside-bedrift-etter-lagring, forside-privatperson, formaal-bedrift, formaal-bedrift-en, formaal-privatperson, reisemaate-privat, reisemaate-mangler-kilde, delstrekninger, resultat-jobb, resultat-privat, resultat-negativ, konto-bedrift, konto-privat, konto-privat-venter, metode, metode-en)
- `ux/build/template-v2.html` og `ux/build/build-v2.py` – mal og byggescript (`python3 build/build-v2.py`). `factors.json` er felles med v1.
