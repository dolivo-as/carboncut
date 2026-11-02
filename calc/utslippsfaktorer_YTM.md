# Utslippsfaktorer YTM – norske kilder, livsløp som grunnlag (U-26-01 Carboncut)

**Versjon v2 – 02.11.2026 kl. 20:25 (Europe/Oslo).** Utarbeidet av Grok Bot for CTO. **Status: forslag – CTO godkjenner før noe legges inn. `factors.ts` er ikke endret.**
Alle faktorer: kg CO2e per personkilometer (pkm) med mindre annet er oppgitt. Fullstendig tabell med lenker, utgave, dato, lenkesjekk, belegg og endringsmerking: `utslippsfaktorer_YTM.csv` (semikolon, UTF-8).

## 0. Versjonslogg

| Versjon | Tidspunkt (Europe/Oslo) | Innhold |
|---|---|---|
| v0 | 02.11.2026 (utkast, ikke levert som svar) | DESNZ-sentrert utkast: `kilder/utslippsfaktorer_YTM_v0_desnz_utkast.csv` |
| v1 | 02.11.2026 ca. kl. 20:13 | Norsk førsteutgave (14 modus + referansebil, VegLCA v6.03 som kilde). Arkivkopi: `kilder/utslippsfaktorer_YTM_v1_20261102.csv` og `.md` |
| **v2** | 02.11.2026 kl. 20:25 | CTO-beslutninger: (1) hybrid = «mangler kilde», britisk seksjon beholdt og merket AVVIST; (2) belegg-tabell (§3); (3) livsløp som grunnlag for alle modus, nye livsløpsrader for bensin-/dieselbil, hybrid-kandidater, tog ukjent, ferje (§2, §4); (4) dobbelttellingsundersøkelse for elbil (§5; verdi uendret). **Nye rader:** E4, E5, G3 (var «mangler»), G4, R3, R4, D2 (var «mangler»), D3, D4, H3, H4, H5, S3, SY3, TU2 (var «mangler»), F4. **ID-endringer:** sykkel B1/B2 → SY1/SY2 (kollisjon med buss), buss B1–B7 → BU1–BU7. **Rettet:** belegg-kilde for tog (arket oppgir ingen kilde for rad 74/75; v1 sa «Vy»). Endringer pr rad: CSV-kolonne `endring_v2`. |

## 1. Viktige merknader

- **Livsløp er grunnlaget for alle modus** (CTO v2). Direkte (TTW) tall står som referanse/fallback der livsløp mangler.
- **Belegg (CTO v2): bil = 1 person; øvrige modus = kildens eget belegg.** Se tabell i §3.
- **Biler er oppgitt per kjøretøykilometer (vkm) med 1 person i bilen.** Da er kg CO2e/vkm = kg CO2e/pkm.
- **Statens vegvesen VegLCA v6.03 (11.02.2026)**, hentet 02.11.2026 (serverens «sist endret»: 15.04.2026). Fanen «Persontransport» inneholder energiforbruk pr pkm og «slitasje pr pkm» (ecoinvent), ikke ferdige kg CO2e/pkm. Tallene merket «beregnet» er regnet etter VegLCAs egen formel: forbruk × (drivstoff-/strømfaktor) + slitasje (livsløp), forbruk × forbrenningsfaktor (direkte). Regnearket er laget for persontransport til/fra anlegg, ikke som generell faktortabell. Dokumentasjonen (v6.01) beskriver ikke persontransport-fanen.
- **Biodrivstoff/oppstrøm:** VegLCAs drivstofffaktorer inkluderer omsetningskravets biodrivstoffandel (B20 diesel, E10 bensin; GWP fossil).
- **Ingen britiske tall brukes som verdi.** DESNZ-forslag står i §10 og er merket AVVIST for hybrid.
- **Strøm:** VegLCA 0,0241 kg CO2e/kWh (2025). NVE 9,4 g/kWh (2025, fysisk), Entur 0,035 kg/kWh (forbruksmiks). Effekten på el-tallene er liten (≤0,002 kg/vkm for elbil).
- **Fly, høydeeffekt:** multiplikator 1,8 (CICERO 2016-05 middel; spenn 0,8–2,5; NOU 2019:22: 1,8–1,9; Jernbanedirektoratet/Norconsult 2020: 1,7; Klimakost: 2,0).

## 2. Oppsummering – livsløp som grunnlag (til godkjenning)

| Modus (factors.ts) | **Livsløp (grunnlag)** | Kilde / status | Direkte (referanse) | Belegg |
|---|---|---|---|---|
| walking | 0 (modellert) | VegLCA v6.03 – modellantakelse, ikke full LCA | 0 | – |
| bicycle | 0 (modellert) | VegLCA v6.03. Kandidat: Entur/SINTEF 0,0196 (SY3, omfang udokumentert) | 0 | – |
| e_scooter | 0,061 | TØI Tiltakskatalog (rev. 2026) / ITF 2024; usikker. Entur/SINTEF 0,2061 (S3) som krysskontroll | ingen norsk kilde | per pkm |
| electric_car (per vkm) | **0,0773** (uendret) | VegLCA v6.03, beregnet. **Ingen dobbelttelling funnet (§5).** Krysskontroll Entur/SINTEF 0,0597; Vestforsk 2010 0,0366 | 0 | 1 person |
| hybrid_car | **mangler kilde** | DESNZ avvist (CTO). Kandidat, IKKE foreslått: Vestforsk 2010 hybrid bensin 0,1672 / diesel 0,1519 (H4/H5) | mangler kilde | – |
| gasoline_car (per vkm) | **0,2569** | Beregnet av 3 norske kilder (G3, §4); krever godkjenning. Kildefast, gammel alternativ: Vestforsk 2010 0,1962 (G4) | 0,141 (Miljødirektoratet 2023, kun CO2) | 1 person |
| diesel_car (per vkm) | **0,2758** | Beregnet (D2, §4); krever godkjenning. Alternativer: Vestforsk 2010 0,1805 (D3); Entur/SINTEF-kjøring 0,2114 (D4) | 0,146 | 1 person |
| **Referansebil (bensin)** per vkm | **0,2569** | Som gasoline_car (R3). Nedre alternativ 0,1962 (R4) | 0,141 | 1 person |
| bus (by / region) | 0,1107 / 0,0415 | VegLCA v6.03, beregnet | 0,0814 / 0,0294 (VegLCA); Ruter 0,043; SSB 0,059 | 25 % / 50 % |
| electric_train | 0,0048 | VegLCA v6.03, beregnet (lav presisjon) | 0 | 31,8 % |
| diesel_train | 0,0877 | VegLCA v6.03, beregnet | 0,0683 (VegLCA); KVU 0,067; Norconsult 0,080 | 35,5 % |
| train_unknown | **0,0118** (beregnet, kandidat) | Vektet VegLCA el/diesel med utledet dieselandel 0,0849 (SSB 0,0058 / VegLCA diesel direkte 0,0683). Krever godkjenning; intervall 0,0048–0,0877 | 0,0058 (SSB 2019) | 31,8 / 35,5 % |
| airplane | **0,2782** med høydeeffekt ×1,8 på forbrenningsdelen; 0,1682 uten | VegLCA v6.03 + CICERO 2016 (beregnet) | 0,1811 (SSB 2019, uten høydeeffekt) | 70 % |
| ferry | **mangler** (ingen norsk kilde) | Entur-kjøring 0,507 (F4) er ikke brukbar. Fallback direkte: Ruter båt 0,111 (kun Oslo-kollektivbåt) | 0,111 (Ruter 2025) | ikke oppgitt |
| other | ingen norsk kilde | – | – | – |
| home_office | ingen faktor (som i factors.ts) | – | – | – |

## 3. Belegg – hva hver kilde/faktor bruker

Regel (CTO): bil 1 person; øvrige modus kildens belegg. «Ikke oppgitt» = kilden oppgir ikke belegget i teksten jeg har lest; verdien brukes som publisert (pkm i kildens grunnlag). Belegg pr rad: kolonnene `belegg` og `belegg_kilde` i CSV.

| Kilde / faktor | Rader | Belegg brukt | Hvor belegget står |
|---|---|---|---|
| Miljødirektoratet omregningsfaktorer (bensin/diesel, g per km kjøretøy) | G1, D1, R1 | 1 person (CTO); verdien er per vkm | Miljødirektoratet oppgir per km kjøretøy, ikke belegg |
| VegLCA «Bil (standard)» / «Bil (elbil)» | G2, E1, E2 | 1 person pr bil | Fane Persontransport H76/J76 og H77/J77, «person pr bil»; kilde «Vy miljøkalkulator» (rad 60–61) |
| VegLCA buss by | BU1, BU2, T4 (T-bane/trikk) | buss 25,2 % (J70); T-bane 11,2 % (J72); trikk 27,2 % (J73) | VegLCA J70/J72/J73; kolonne B: «Ruter» |
| VegLCA buss region/ekspress | BU3, BU4 | 50 % (J71) | VegLCA J71; kolonne B: «Vy årsrapport» |
| VegLCA tog el / tog diesel | T2, DT1, DT2, TU2 | el 31,8 % (J74); diesel 35,5 % (J75) | VegLCA J74/J75; **arket oppgir ingen kilde** (v1 skrev «Vy» – rettet) |
| VegLCA fly | A3, A4, A5 | 70 % (J78) | VegLCA J78/M62; kilde «Vy miljøkalkulator» |
| VegLCA gå/sykkel | W1, SY1 | ikke relevant (0) | VegLCA rad «Gå sykkel» |
| Vestlandsforsking 2/2010 tab. 21 (bil, hybrid) | E5, G4, R4, D3, H3–H5 | per vogn-km = 1 person pr bil (CTO) | Tabellen er «pr vogn-km». Kildens pkm-tabeller (22/23) bruker belegg 1,3 (kort), 2 (lang), 1,73 (snitt, SSB 2008) – ikke brukt |
| Entur Emissions Calculator API (SINTEF) | E4, D4, SY3, S3, F4 | bil: 1 kjøretøy/1 passasjer, verdi per vkm; sykkel/sparkesykkel: per pkm; ferje: 100 passasjerer (utledet) | API-kall `numberOfPassengers=1`; ferje: 155 258 g for 1 passasjer av 15,53 t |
| SSB 08.12.2020 (buss, tog, fly) | BU6, TU1, A1, A2 | ikke oppgitt (SSBs egne pkm) | SSB-artikkelen oppgir ikke belegg |
| Jernbanedirektoratet/Norconsult 2020 tab. 3-1 | R2, DT4 | bil: «0,1 passasjerer per bil» (uklart om tillegg til sjåfør); tog: NSB pkm | Tab. 3-1 fotnote 1. Samme rapport (Vy-kalkulator 2018): 32 % tog, 51 % buss, 67 % fly, 0,55 passasjerer/bil under 200 km (RVU: 1,6 over 200 km) |
| KVU GREEN | DT3 | ikke oppgitt | – |
| Ruter årsrapport 2025 E1 | BU5, T3, F1 | ikke oppgitt (Ruters pkm) | – |
| Vy årsrapport 2025 | BU7 | per **setekm**; belegg ikke oppgitt (ikke omregnet) | – |
| TØI Tiltakskatalog / ITF 2024 (e-sparkesykkel) | S1 | per pkm, 1 person pr sparkesykkel; belegg-antakelse ikke oppgitt | – |
| TØI 1427/2015 (båt 2014) | F2 | ikke oppgitt | – |

Til orientering (ikke brukt som verdier): TØI «Transportytelser i Norge 1946–2022» (2003/2023) oppgir personbilbelegg 1,46 (RVU 2018/19; tidligere 1,7); TØI 1427/2015 bruker buss-belegg 15 (bybuss) og 12 (langdistanse). Disse viser at øvrige modus (buss 25–50 %, fly 70 %) og bil (1 person) ikke har samme belegg-konvensjon.

## 4. Livsløp for referansebil (bensin), dieselbil, tog ukjent og ferje

### 4.1 Kan VegLCA «Bil (standard)» brukes? – Nei (dokumentasjon)

VegLCA v6.03, fane «Persontransport», rad 60 og 76 (kilde i arket: «Vy miljøkalkulator»):

| Spørsmål | Funn |
|---|---|
| Flate / drivstoffmiks | Blandet bilpark: **0,018 l veidiesel (B20) + 0,028 l bensin (E10) + 0,002 kWh strøm pr vkm** (≈ 39 % diesel / 61 % bensin av volum; strømandelen kan representere el-/ladbar-innslag – ikke dokumentert) |
| Belegg | «1 person pr bil» (H76/J76) |
| Forbruk | 0,046 l/vkm = 4,6 l/100 km. Direkte 0,09943 kg CO2e/vkm (= 0,018×2,136 + 0,028×2,178). Miljødirektoratets flåtesnitt 2023 er 0,141 (bensin) / 0,146 (diesel): VegLCA ligger **29–32 % lavere** |
| Livsløp | 0,018×2,84802 + 0,028×2,716 + 0,002×0,0241475 + 0,081085 = **0,20845** |
| Hva inngår i slitasje (0,081085 kg CO2e/vkm) | ecoinvent «transport, passenger car, medium size, diesel, EURO 5 {RER} … Cut-off, U **– kun bil**». Suffikset «kun bil» tyder på at drivstoff/eksos er fjernet og bare kjøretøy (produksjon, vedlikehold, trolig avhending) er med; veiinfrastruktur ikke. Arket dokumenterer ikke grensen. Akkumulert energi 1,148 MJ/vkm. Samme slitasje brukes for hele bilparken (også bensin, og andelen strøm) |
| Uavhengig kontroll av slitasjen | Entur/SINTEF-kjøring, dieselbil: produksjon 0,0738 + vedlikehold 0,0092 = **0,0830** vs VegLCA 0,0811 → rimelig |
| Konklusjon | **Ikke egnet som bensinreferanse ved 1 person:** (a) blanding diesel/bensin/strøm, ikke ren bensin; (b) drivstofforbruket er ca. 30 % under norsk flåtesnitt; (c) ukjent flatebasis (ny/gjennomsnittsbil, år). Delen «slitasje» 0,0811 (kjøretøyets produksjon/vedlikehold) er derimot kryss-validert og brukes i beregningene under. |

### 4.2 Kandidater for bensin-/dieselbil livsløp (kg CO2e/vkm, 1 person) – krever CTO-godkjenning

| Kandidat | Bensin | Diesel | Metode og kilde | Vurdering |
|---|---|---|---|---|
| **A. Beregnet (G3/R3, D2)** | **0,25691** | **0,27575** | Miljødirektoratet direkte 2023 (0,141 / 0,146) + oppstrøm (× VegLCA-forholdet totalt/forbrenning: bensin E10 2,716/2,178 → +0,03483; diesel B20 2,84802/2,136 → +0,04867) + kjøretøy 0,081085 (VegLCA/ecoinvent «kun bil») | Nyeste direkte-grunnlag (konsistent med R1/D1). Antakelser: oppstrøm-forholdet overføres til Miljødirektoratets tall (usikkerhet ca. ±0,002); samme kjøretøydel for bensin og diesel; ingen veiinfrastruktur. Egen sammensetning av tre kilder |
| B. Vestlandsforsking 2/2010 (G4/R4, D3) | 0,1962 | 0,1805 | Tab. 21, Norge 2010, pr vogn-km: direkte 138,8 / 123,1 + infrastruktur 3,4 + transportmiddel 30,5 + energikjede 23,5 | Én samlet, norsk, kildefast kilde. Gammel (2010), Golf-klasse NEDC-simulering; kjøretøydel 0,0305 (under halvparten av VegLCA); inkluderer veiinfrastruktur 0,0034. Direkte 0,1388 ≈ Miljødirektoratet 0,141 |
| C. Entur/SINTEF-kjøring (D4) | (ingen bensinmodus i API) | 0,2114 | eksos 0,0966 + produksjon 0,0738 + vedlikehold 0,0092 + drivstoffproduksjon 0,0318; langkjøring 459,6 km, 4,47 l/100 km | Modellkjøring, ikke publisert faktor; lavt forbruk |
| D. VegLCA «Bil (standard)» (G2) | 0,20845 | – | blanding | Ikke bensin (se 4.1) |

**Anbefaling for beslutning:** bruk A (G3/R3 bensin 0,2569; D2 diesel 0,2758) som primærtall og B som nedre grense/dokumentert alternativ. Spennet er stort (bensin 0,196–0,257; diesel 0,181–0,276). Ingen offisiell norsk livsløpsfaktor for bensin-/dieselbil per km fra TØI, Miljødirektoratet, Klimakost, NTP eller Vegvesenet er funnet (Rousseau et al. 2025 oppgir bare et snitt for nyregistrerte biler 2023 på ≈ 0,144 kg CO2e/vkm livsløp (inkl. høy elbilandel), ikke per drivstoff; brukes ikke).

### 4.3 Hybrid
Står som **«mangler kilde»** (CTO). VegLCA, Miljødirektoratet og Klimakost har ingen hybrid. Eneste norske tall funnet er Vestforsking 2/2010 (hybrid bensin 1,3 l: direkte 0,1140, livsløp 0,1672; hybrid diesel 1,6 l: livsløp 0,1519; rader H3–H5) – gammelt, Prius-klasse, ikke plug-in; **ikke foreslått**, bare opplyst.

### 4.4 Tog ukjent
Ingen kilde oppgir dieselandelen av pkm. Utledet kandidat TU2 = 0,01184 (formel: (1−s)×0,0048016 + s×0,0876857, s = 0,08491 = SSB 0,0058 / VegLCA diesel direkte 0,06830). Med KVU 0,067 i stedet for VegLCA: ca. 0,0122. Krever godkjenning; ellers «ingen norsk kilde».

### 4.5 Ferje
Ingen norsk statisk livsløp per pkm funnet (Klimakost, TØI, Vestforsk 2010 og Miljødirektoratet har ingen). Entur-API gir et modellresultat for fergen M/S Romsdalsfjord (306 km, eksos 11,68 t + drivstoffproduksjon 3,84 t + produksjon 0,0015 t = 15,53 t; ÷ 100 passasjerer = 0,5072 kg/pkm) – urealistisk rute og kapasitet, **ikke brukbar**. Fallback er Ruter båt 0,111 (direkte, Oslo-kollektivbåt).

## 5. Elbil livsløp 0,0773 – dobbelttelling av strøm?

**Konklusjon: Nei, ingen dobbelttelling funnet. Verdien 0,07727 er uendret.** Restusikkerhet: VegLCA dokumenterer ikke systemgrense og ecoinvent-versjon for posten, så beviset er størrelsesorden og uavhengige kontroller, ikke arkets dokumentasjon.

| Ledd | kg CO2e/vkm | Kilde |
|---|---|---|
| VegLCA «slitasje elbil» (ecoinvent «transport, passenger car, electric {GLO}», E120) | 0,072441 | VegLCA v6.03 fane Persontransport rad 120 |
| + strøm: 0,2 kWh/vkm × 0,0241475 | 0,004830 | VegLCA H77, Utslippsfaktorer E103 |
| = VegLCA livsløp elbil | **0,077271** | beregnet |
| ecoinvent-posten totalt (Del Duce, Gauch, Althaus 2014, tab. 6, ecoinvent v3.01, GLO) | 0,239 | Int. J. LCA 19: 1884–1900, DOI 10.1007/s11367-014-0792-4 |
| – derav strøm: 0,199 kWh/vkm (global lavspent) | 0,158 | samme |
| – derav kjøretøy (batteri 0,0163 + vedlikehold 0,0081 + kjøretøy 0,0502) | 0,0746 | samme |
| – derav vei | 0,0057 | samme |
| Entur/SINTEF elbil (modellkjøring): produksjon 0,0477 + vedlikehold 0,0061 + strøm 0,0059 (0,168 kWh/km × 0,035) | 0,0597 | Entur-API, 02.11.2026 |

Argumentasjon:
1. VegLCAs 0,0724 ≈ Del Duce «kun kjøretøy» 0,0746 (−3 %); posten inkludert strøm ville vært 0,239 (+0,0048 fra VegLCAs strøm ≈ 0,244, tre ganger så høyt). Strømleddet er altså ikke med i slitasjen.
2. Akkumulert energibruk i VegLCA-posten er 1,057 MJ/vkm, nesten lik dieselbilens «kun bil»-post (1,148 MJ/vkm). Strøm på 0,199 kWh/vkm ville alene gitt klart høyere primærenergi enn en ren kjøretøy-post.
3. Uavhengig kontroll: Entur/SINTEF kjøretøydel 0,0538 (VegLCA 0,0724 er 35 % høyere, ikke 3–4 ganger); strømdel 0,0059 mot VegLCAs 0,0048.
4. Vestforsking 2010: hele livsløpet elbil 0,0366 (norsk strøm, 2010, lite bil).
5. Merk: posten heter ikke «– kun bil» slik dieselposten gjør. Det kunne tyde på at strøm er med, men tallets størrelse (punkt 1–2) viser at det ikke er tilfelle.

Hva som likevel er usikkert: ecoinvent-versjon i VegLCA er ukjent (tallet i v3.01 er 0,0746; senere versjoner kan avvike); VegLCA bruker global batteri-/kjøretøymiks og ikke norsk; strømfaktor 0,0241 (anlegg) vs 0,035 (Entur) vs 0,0094 (NVE fysisk) påvirker ≤0,002. Anbefaling: behold 0,0773; angi spenn 0,060–0,077 (Entur–VegLCA) i kommunikasjon.

## 6. Fullstendig liste (alle kandidater)

| ID | Modus | Verdi | Enhet | Omfang | Status | Kilde | Utgave / dato | Belegg | Rolle | Endring v2 |
|---|---|---|---|---|---|---|---|---|---|---|
| W1 | walking | 0 | kg CO2e/pkm | livsløp (VegLCA-modell; 0 modellert) | usikker | Statens vegvesen VegLCA, rad «Gå sykkel» (E112–E121, H53) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | ikke relevant (1 person) | anbefalt (krever CTO-godkjenning) | uendret |
| W2 | walking | ingen norsk kilde | kg CO2e/pkm | livsløp (LCA, produksjon av sykkel) | ingen norsk kilde | – | –; – | – | mangler | uendret |
| SY1 | bicycle | 0 | kg CO2e/pkm | livsløp (VegLCA-modell; 0 modellert) | usikker | Statens vegvesen VegLCA, rad «Gå sykkel» (E112–E121, H53) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | ikke relevant (1 person) | anbefalt (krever CTO-godkjenning) | ENDRET: ID endret fra B1 |
| SY2 | bicycle | ingen norsk kilde | kg CO2e/pkm | livsløp (LCA, produksjon av sykkel) | ingen norsk kilde | – | –; – | – | mangler | ENDRET: ID endret fra B2 |
| SY3 | bicycle | 0.0196 | kg CO2e/pkm | livsløp antatt (omfang ikke dokumentert av Entur) | usikker (norsk modell, omfang udokumentert) | Entur Emissions Calculator API (SINTEF-faste faktorer): BIKE 196 g per 10 km, hentet via API 02.11.2026 | Entur API v1 (SINTEF), kjøring 02.11.2026; 2026-11-02 (kjøring) | per pkm, 1 person | kandidat (krever CTO-godkjenning) | NY |
| S1 | e_scooter | 0.061 | kg CO2e/pkm | livsløp (LCA) | usikker (norsk sekundærkilde, utenlandsk primærkilde) | TØI Tiltakskatalog «Delte elsparkesykler» (rev. 2026) som siterer ITF/OECD 2024: delte el-sparkesykler, nyeste generasjon, sentralt anslag, delt sparkesykkel | Tiltakskatalogen, rev. 2026; ITF/OECD «Greener micromobility» 2024; 2024 (ITF); rev. 2026 (TØI) | per pkm; belegg ikke oppgitt (1 person pr sparkesykkel) | anbefalt (livsløp) | ENDRET: rolle |
| S2 | e_scooter | ingen norsk kilde | kg CO2e/pkm | direkte (TTW) | ingen norsk kilde | – | –; – | – | mangler | uendret |
| S3 | e_scooter | 0.2061 | kg CO2e/pkm | livsløp antatt (omfang ikke dokumentert av Entur) | usikker (3,4× TØI/ITF; omfang udokumentert) | Entur Emissions Calculator API (SINTEF-faste faktorer): ELECTRICAL_SCOOTER 2061 g per 10 km, kjørt 02.11.2026 | Entur API v1 (SINTEF), kjøring 02.11.2026; 2026-11-02 (kjøring) | per pkm, 1 person | krysskontroll | NY |
| E1 | electric_car | 0 | kg CO2e/vkm (=pkm ved 1 person) | direkte (TTW) | dokumentert | Statens vegvesen VegLCA (kol. R «direkte» = 0 for el-bil); SSB (2019: elektrisk = 0); Jernbanedirektoratet/Norconsult 2020 tab. 3-1 (personbil elektrisk 0) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 1 person pr bil (CTO) | anbefalt | uendret |
| E2 | electric_car | 0.07727 | kg CO2e/vkm (=pkm ved 1 person) | livsløp (strøm + «slitasje kjøretøy») | usikker (beregnet; ingen dobbelttelling funnet) | Statens vegvesen VegLCA | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 1 person pr bil (CTO) | anbefalt (livsløp) | ENDRET: kommentar (dobbelttelling undersøkt; verdi uendret) |
| E3 | electric_car | 0.00179 | kg CO2e/vkm (=pkm ved 1 person) | kun bruksfase strøm (beregnet) | usikker (beregnet) | Beregnet: 0,19 kWh/km (Avinor/Asplan Viak 2020, inkl. 4 % ladetap) × 9,4 g CO2e/kWh (NVE 2025, fysisk levert strøm) | Asplan Viak 28.09.2020; NVE/NTB 03.07.2026; 2020 / 2026-07-03 | 1 person pr bil (CTO) | krysskontroll | uendret |
| E4 | electric_car | 0.05967 | kg CO2e/vkm (=pkm ved 1 person) | livsløp (produksjon + vedlikehold + strøm), modellkjøring | usikker (modellkjøring, ikke publisert faktor) | Entur Emissions Calculator API (SINTEF), ELECTRICAL_CAR, rute 459,6 km, 1 passasjer: produksjon 0,0477 + vedlikehold 0,00609 + drivstoff/strøm 0,00588 = 0,05967 kg/vkm (0,168 kWh/km × 0,035 kg/kWh) | Entur API v1 (SINTEF), kjøring 02.11.2026; 2026-11-02 (kjøring) | 1 person pr bil (CTO) | krysskontroll | NY |
| E5 | electric_car | 0.0366 | kg CO2e/vkm (=pkm ved 1 person) | livsløp (2010, norsk strøm) | dokumentert, men gammel (2010) | Vestlandsforsking-rapport 2/2010 (Simonsen), tabell 21: elektrisk personbil, pr vogn-km, Norge 2010: infrastruktur 3,4 + transportmiddel 30,5 + energikjede 2,7 g | Rapport 2/2010, ISBN 978-82-428-0297-2; 2010 | per vogn-km = 1 person pr bil (CTO) | krysskontroll | NY |
| G1 | gasoline_car | 0.141 | kg CO2/vkm (=pkm ved 1 person) | direkte (TTW), kun fossil CO2 | dokumentert | Miljødirektoratet, Omregningsfaktorer – «Utslipp fra kjøretøy, per km», personbiler (bensin), gjennomsnitt 2023 (kilde National Inventory Document 2025) | Gjennomsnitt 2023; NIR 2025; 2025 (NIR) | 1 person pr bil (CTO) | referanse (direkte) | ENDRET: rolle (direkte → referanse) |
| G2 | gasoline_car | 0.20845 | kg CO2e/vkm (=pkm ved 1 person) | livsløp (drivstoff + slitasje), BLANDET bilpark – ikke bensin-spesifikk | usikker (ikke bensin-spesifikk) | Statens vegvesen VegLCA «Bil (standard)» | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 1 person pr bil | ikke anbefalt (blandet flåte) | ENDRET: rolle (ikke anbefalt) + dokumentasjon |
| G3 | gasoline_car | 0.25691 | kg CO2e/vkm (=pkm ved 1 person) | livsløp (beregnet): fossil direkte + oppstrøm + kjøretøy | usikker (beregnet av tre kilder) | Beregnet: Miljødirektoratet 0,141 (direkte, 2023) × (1 + (2,716−2,178)/2,178) [VegLCA bensin E10: totalt/forbrenning] + 0,081085 (VegLCA slitasje bil, ecoinvent dieselbil EURO 5 medium, «kun bil») | Miljødirektoratet 2023/NIR 2025; VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2025 / 2026-02-11 | 1 person pr bil (CTO) | anbefalt (krever CTO-godkjenning) | NY |
| G4 | gasoline_car | 0.1962 | kg CO2e/vkm (=pkm ved 1 person) | livsløp (direkte 138,8 + infrastruktur 3,4 + transportmiddel 30,5 + energikjede 23,5 g) | dokumentert, men gammel (2010) | Vestlandsforsking-rapport 2/2010 (Simonsen), tabell 21: bensin, pr vogn-km, Norge 2010 | Rapport 2/2010, ISBN 978-82-428-0297-2; 2010 | per vogn-km = 1 person pr bil (CTO) | alternativ (kildefast, gammel) | NY |
| R1 | reference_car (bensinbil) | 0.141 | kg CO2/vkm (=pkm ved 1 person) | direkte (TTW), kun fossil CO2 | dokumentert | Samme som G1 (Miljødirektoratet 2023, personbiler bensin) | Gjennomsnitt 2023; NIR 2025; 2025 (NIR) | 1 person pr bil (CTO) | referanse (direkte) | ENDRET: rolle (direkte → referanse) |
| R3 | reference_car (bensinbil) | 0.25691 | kg CO2e/vkm (=pkm ved 1 person) | livsløp (beregnet) – samme som G3 | usikker (beregnet av tre kilder) | Samme som G3 | Se G3; 2025 / 2026-02-11 | 1 person pr bil (CTO) | anbefalt (krever CTO-godkjenning) | NY |
| R4 | reference_car (bensinbil) | 0.1962 | kg CO2e/vkm (=pkm ved 1 person) | livsløp (2010) – samme som G4 | dokumentert, men gammel (2010) | Samme som G4 (Vestlandsforsking 2/2010) | Rapport 2/2010; 2010 | per vogn-km = 1 person pr bil (CTO) | alternativ (kildefast, gammel) | NY |
| R2 | reference_car (bensinbil) | 0.155 | kg CO2/pkm | direkte, fossil CO2 | usikker (gammel, belegg uklart) | Jernbanedirektoratet/Norconsult «Jernbanens klimafortrinn» tab. 3-1, personbil fossil (TØI-rapport 1307/2014 rev. 2016) | 20.03.2020; 2020-03-20 | 0,1 passasjerer per bil (fotnote 1) – uklart om tillegg til sjåfør | krysskontroll | uendret |
| D1 | diesel_car | 0.146 | kg CO2/vkm (=pkm ved 1 person) | direkte (TTW), kun fossil CO2 | dokumentert | Miljødirektoratet, Omregningsfaktorer, personbiler (diesel), gjennomsnitt 2023 (NIR 2025) | Gjennomsnitt 2023; NIR 2025; 2025 (NIR) | 1 person pr bil (CTO) | referanse (direkte) | ENDRET: rolle (direkte → referanse) |
| D2 | diesel_car | 0.27575 | kg CO2e/vkm (=pkm ved 1 person) | livsløp (beregnet): fossil direkte + oppstrøm + kjøretøy | usikker (beregnet av tre kilder) | Beregnet: Miljødirektoratet 0,146 (diesel, 2023) × (1 + (2,84802−2,136)/2,136) [VegLCA veidiesel B20] + 0,081085 (VegLCA slitasje bil) | Miljødirektoratet 2023/NIR 2025; VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2025 / 2026-02-11 | 1 person pr bil (CTO) | anbefalt (krever CTO-godkjenning) | NY |
| D3 | diesel_car | 0.1805 | kg CO2e/vkm (=pkm ved 1 person) | livsløp (direkte 123,1 + infrastruktur 3,4 + transportmiddel 30,5 + energikjede 23,5 g) | dokumentert, men gammel (2010) | Vestlandsforsking-rapport 2/2010 (Simonsen), tabell 21: diesel, pr vogn-km, Norge 2010 | Rapport 2/2010, ISBN 978-82-428-0297-2; 2010 | per vogn-km = 1 person pr bil (CTO) | alternativ (kildefast, gammel) | NY |
| D4 | diesel_car | 0.21142 | kg CO2e/vkm (=pkm ved 1 person) | livsløp (modellkjøring): eksos 0,0966 + produksjon 0,0738 + vedlikehold 0,0092 + drivstoffproduksjon 0,0318 | usikker (modellkjøring, ikke publisert faktor) | Entur Emissions Calculator API (SINTEF), DIESEL_CAR, rute 459,6 km, 1 passasjer, diesel m/19 % biodiesel, 4,47 l/100 km | Entur API v1 (SINTEF), kjøring 02.11.2026; 2026-11-02 (kjøring) | 1 person pr bil (CTO) | krysskontroll | NY |
| H1 | hybrid_car | mangler kilde | kg CO2e/vkm | direkte (TTW) | mangler kilde (CTO: DESNZ avvist) | – | –; – | – | mangler kilde | ENDRET: status: mangler kilde |
| H2 | hybrid_car | mangler kilde | kg CO2e/vkm | livsløp | mangler kilde (CTO: DESNZ avvist) | – | –; – | – | mangler kilde | ENDRET: status: mangler kilde |
| H3 | hybrid_car | 0.114 | kg CO2e/vkm (=pkm ved 1 person) | direkte energibruk, hybrid bensin 1,3 l (2010) | dokumentert, men gammel (2010) | Vestlandsforsking-rapport 2/2010 (Simonsen), tabell 21: «Hybrid bensin 1,3 l», direkte energibruk 114,0 g/vogn-km | Rapport 2/2010, ISBN 978-82-428-0297-2; 2010 | per vogn-km = 1 person pr bil | kandidat (krever CTO-godkjenning; ikke foreslått) | NY |
| H4 | hybrid_car | 0.1672 | kg CO2e/vkm (=pkm ved 1 person) | livsløp, hybrid bensin 1,3 l (2010) | dokumentert, men gammel (2010) | Vestlandsforsking-rapport 2/2010, tabell 21: Hybrid bensin 1,3 l (114,0 + 3,4 + 30,5 + 19,3) | Rapport 2/2010; 2010 | per vogn-km = 1 person pr bil | kandidat (krever CTO-godkjenning; ikke foreslått) | NY |
| H5 | hybrid_car | 0.1519 | kg CO2e/vkm (=pkm ved 1 person) | livsløp, hybrid diesel 1,6 l (2010) | dokumentert, men gammel (2010) | Vestlandsforsking-rapport 2/2010, tabell 21: Hybrid diesel 1,6 l (99,1 + 3,4 + 30,5 + 18,9) | Rapport 2/2010; 2010 | per vogn-km = 1 person pr bil | kandidat (krever CTO-godkjenning; ikke foreslått) | NY |
| BU1 | bus | 0.08136 | kg CO2e/pkm | direkte (TTW), fossilt (GWP fossil) | dokumentert (modell) | Statens vegvesen VegLCA, Buss (lokal/by) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 25,2 % (J70) | alternativ | ENDRET: ID endret fra B1 |
| BU2 | bus | 0.1107 | kg CO2e/pkm | livsløp (drivstoff + slitasje) | dokumentert (modell) | Statens vegvesen VegLCA, Buss (lokal/by) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 25,2 % (J70) | anbefalt (by) | ENDRET: ID endret fra B2 |
| BU3 | bus | 0.02943 | kg CO2e/pkm | direkte (TTW), fossilt | dokumentert (modell) | Statens vegvesen VegLCA, Buss (region/ekspress) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 50 % (J71) | alternativ | ENDRET: ID endret fra B3 |
| BU4 | bus | 0.04146 | kg CO2e/pkm | livsløp (drivstoff + slitasje) | dokumentert (modell) | Statens vegvesen VegLCA, Buss (region/ekspress) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 50 % (J71) | anbefalt (region) | ENDRET: ID endret fra B4 |
| BU5 | bus | 0.043 | kg fossilt CO2e/pkm | direkte (TtW) | dokumentert | Ruter årsrapport 2025, E1 Klimaendringer: buss, gjennomsnitt alle regioner | Årsrapport 2025; 2026 (årsrapport 2025) | ikke oppgitt (Ruters pkm) | krysskontroll | ENDRET: ID endret fra B5 |
| BU6 | bus | 0.059 | kg CO2/pkm | direkte, kun CO2 | dokumentert (2019-data) | SSB «Mindre utslipp fra veitrafikk, fly og tog», buss (ekskl. turbuss), 2019 | Publisert 08.12.2020; data 2019; 2020-12-08 | ikke oppgitt (SSBs pkm) | krysskontroll | ENDRET: ID endret fra B6 |
| BU7 | bus | 0.02 | kg CO2e/setekm | direkte | dokumentert, men PER SETEKM | Vy Års- og bærekraftsrapport 2025: direkte klimagassutslipp buss 20 g CO2e/setekm (2025, mål 26,9) | Årsrapport 2025; 2026 | per setekm – belegg ikke oppgitt | krysskontroll | ENDRET: ID endret fra B7 |
| T1 | electric_train | 0 | kg CO2e/pkm | direkte (TTW) | dokumentert | Statens vegvesen VegLCA (kol. R = 0); SSB 2019 (el-tog = 0); Jernbanedirektoratet/Norconsult 2020 (tog elektrisk 0) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | ikke relevant (0) | anbefalt | uendret |
| T2 | electric_train | 0.0048 | kg CO2e/pkm | livsløp (strøm + slitasje) | dokumentert (modell), lav presisjon | Statens vegvesen VegLCA, Tog (el) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 31,8 % (J74) | anbefalt | ENDRET: belegg-kilde rettet |
| T3 | electric_train | 0.002 | kg fossilt CO2e/pkm | direkte (TtW, lokasjonsbasert strøm) | dokumentert | Ruter årsrapport 2025: T-bane 0,002; trikk 0,003 | Årsrapport 2025; 2026 | ikke oppgitt (Ruters pkm) | krysskontroll | uendret |
| T4 | electric_train | 0.00583 | kg CO2e/pkm | livsløp | dokumentert (modell) | VegLCA T-bane (trikk: 0.00472) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | T-bane 11,2 % (J72); trikk 27,2 % (J73) | alternativ | uendret |
| DT1 | diesel_train | 0.0683 | kg CO2e/pkm | direkte (TTW) | dokumentert (modell) | Statens vegvesen VegLCA, Tog (diesel) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 35,5 % (J75) | anbefalt | ENDRET: belegg-kilde rettet |
| DT2 | diesel_train | 0.08769 | kg CO2e/pkm | livsløp | dokumentert (modell) | Statens vegvesen VegLCA, Tog (diesel) | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 35,5 % (J75) | anbefalt | uendret |
| DT3 | diesel_train | 0.067 | kg CO2/pkm | direkte, kun CO2 | dokumentert | KVU GREEN: dieseltog på ikke-elektrifiserte baner, snitt (2019-data); spenn Nordlandsbanen 0,041 – Rauma 0,134 | KVU GREEN hovedrapport v.2; vedlegg 2 datert 20.01.2023; 2023-01-20 | ikke oppgitt (KVUs pkm) | krysskontroll | uendret |
| DT4 | diesel_train | 0.08 | kg CO2/pkm | direkte, kun CO2, uten biodrivstoff | dokumentert (gammel) | Jernbanedirektoratet/Norconsult 2020 tab. 3-1: persontog diesel (NSB årsmelding 2017) | 20.03.2020; 2020-03-20 | ikke oppgitt (NSB pkm) | krysskontroll | uendret |
| TU1 | train_unknown | 0.0058 | kg CO2/pkm | direkte, kun CO2 | dokumentert (2019-data) | SSB 2019: jernbane totalt (kun diesel regnet, el = 0) | Publisert 08.12.2020; data 2019; 2020-12-08 | ikke oppgitt (SSBs pkm) | fallback (kun direkte) | ENDRET: rolle (fallback) |
| TU2 | train_unknown | 0.01184 | kg CO2e/pkm | livsløp (beregnet): vektet VegLCA el-/diesel-tog | usikker (beregnet; dieselandel utledet) | Beregnet: (1−s)×VegLCA tog el 0,0048016 + s×VegLCA tog diesel 0,0876857, der s = SSB 2019 jernbane 0,0058 / VegLCA diesel direkte 0,06830 = 0.0849 | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); SSB 08.12.2020; 2026-02-11 / 2020-12-08 | el 31,8 % (J74) / diesel 35,5 % (J75) | kandidat (krever CTO-godkjenning) | NY |
| A1 | airplane | 0.1811 | kg CO2/pkm | direkte, kun CO2, UTEN høydeeffekt | dokumentert (2019-data) | SSB 2019: innenriks fly 181,1 g CO2/pkm | Publisert 08.12.2020; data 2019; 2020-12-08 | ikke oppgitt (SSBs pkm) | referanse (direkte) | ENDRET: rolle (referanse) |
| A2 | airplane | 0.32598 | kg CO2e/pkm | direkte × høydeeffekt (beregnet) | usikker (beregnet; multiplikator omstridt) | Beregnet: 0,1811 (SSB) × 1,8 (CICERO 2016) | SSB 2020; CICERO Report 2016-05; – | ikke oppgitt (SSBs pkm) | alternativ (direkte × høydeeffekt, ikke livsløp) | ENDRET: rolle (alternativ) |
| A3 | airplane | 0.13759 | kg CO2e/pkm | direkte (TTW), uten høydeeffekt | dokumentert (modell) | Statens vegvesen VegLCA, Fly | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 70 % (J78) | alternativ | uendret |
| A4 | airplane | 0.16816 | kg CO2e/pkm | livsløp (drivstoff + slitasje), uten høydeeffekt | dokumentert (modell) | Statens vegvesen VegLCA, Fly | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); 2026-02-11 | 70 % (J78) | anbefalt (livsløp uten høydeeffekt) | ENDRET: rolle (anbefalt uten høydeeffekt) |
| A5 | airplane | 0.27823 | kg CO2e/pkm | livsløp × høydeeffekt på direkte del (beregnet) | usikker (beregnet) | Beregnet: VegLCA livsløp + (1,8−1) × VegLCA direkte | VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no); CICERO 2016-05; – | 70 % (J78) | anbefalt (livsløp med høydeeffekt, krever CTO-godkjenning) | ENDRET: rolle (anbefalt med høydeeffekt) |
| F1 | ferry | 0.111 | kg fossilt CO2e/pkm | direkte (TtW) | dokumentert, men Oslo-kollektivbåt (ikke bilferge) | Ruter årsrapport 2025, E1: båt | Årsrapport 2025; 2026 | ikke oppgitt (Ruters pkm) | fallback (kun direkte; usikker dekning) | ENDRET: rolle (fallback) |
| F2 | ferry | 0.472 | kg CO2/pkm | direkte, kun CO2 (2014) | usikker (gammel, typen uklar) | TØI-rapport 1427/2015, tab. S.1: «Båt» 2014 (overtatt fra Klimakur 2010; trolig hurtigbåt) | TØI 1427/2015; 2015 | ikke oppgitt | krysskontroll | uendret |
| F3 | ferry | ingen norsk kilde | kg CO2e/pkm | livsløp | ingen norsk kilde | – | –; – | – | mangler | uendret |
| F4 | ferry | 0.50719 | kg CO2e/pkm | livsløp (modellkjøring): eksos + drivstoffproduksjon + produksjon | IKKE brukbar (urealistisk rute/kapasitet) | Entur Emissions Calculator API (SINTEF), FERRY, kjøretøy web:ms-romsdalsfjord, 306,1 km, 1 passasjer | Entur API v1 (SINTEF), kjøring 02.11.2026; 2026-11-02 (kjøring) | 100 passasjerer (utledet fra output) | ikke anbefalt | NY |
| O1 | other | ingen norsk kilde | kg CO2e/pkm | – | ingen norsk kilde | – | –; – | – | mangler | uendret |

Lenker, konvertering/belegg og kommentar pr rad: se CSV (kolonnene `lenke`, `konvertering_belegg`, `kommentar`, `lenkesjekk`, `belegg`, `belegg_kilde`). Lenker kontrollert 02.11.2026. Unntak: Ruters live-side er blokkert fra vår maskin (lest via Web Archive); Springer-DOI for Del Duce et al. svarte HTTP 500 til curl (artikkelen ble lest via WebFetch/forfatterkopi – bekreft lenken før sitering).

## 7. VegLCA – detaljer for beregnede tall

Kilde: Statens vegvesen, VegLCA v6.03, 11.02.2026, fane «Persontransport». Lenke: https://www.vegvesen.no/globalassets/fag/fokusomrader/klima-miljo-og-omgivelser/klima/veglca-v6.03.xlsx?v=49793f (fra https://www.vegvesen.no/fag/fokusomrader/klima-miljo-og-omgivelser/utslipp-av-klimagasser/bruk-av-veglca/). Faktorer (kg CO2e pr enhet): veidiesel B20 totalt 2,84802 / forbrenning 2,136 pr l; bensin E10 2,716 / 2,178; flybensin 3,1 / 2,54; anleggsdiesel B11 2,99052 / 2,3763; strøm 0,0241475 pr kWh. Slitasje (kg CO2e/pkm): buss 0,0022202, tog/T-bane 0,0017261, trikk 0,0018203, bil (dieselbil EURO 5, ecoinvent) 0,0810853, elbil 0,0724409, fly 0,0002361.

| Modus | Forbruk | Direkte | Livsløp |
|---|---|---|---|
| Buss by | 0,03809 l/pkm | 0,0814 | 0,1107 |
| Buss region | 0,013777 l/pkm | 0,0294 | 0,0415 |
| T-bane | 0,17 kWh/pkm | 0 | 0,0058 |
| Trikk | 0,12 kWh/pkm | 0 | 0,0047 |
| Tog el | 0,12736 kWh/pkm | 0 | 0,0048 |
| Tog diesel | 0,028744 l/pkm (anleggsdiesel) | 0,0683 | 0,0877 |
| Bil standard (blanding) | 0,018 l diesel + 0,028 l bensin + 0,002 kWh /vkm | 0,0994 | 0,2084 |
| Elbil | 0,2 kWh/vkm | 0 | 0,0773 |
| Fly | 0,054169 l/pkm | 0,1376 | 0,1682 |

## 8. Mangler kilde / usikkert (etter v2)

**Mangler kilde / ingen norsk kilde:** hybrid_car (direkte og livsløp – kun gammel Vestforsk-kandidat, ikke foreslått), ferry livsløp, e_scooter direkte, walking/bicycle (ekte LCA – kun VegLCA-modell 0 og Entur-kandidat 0,0196), other.
**Krever godkjenning (beregnet):** bensin-/dieselbil livsløp (G3/R3/D2), train_unknown (TU2), fly med høydeeffekt (A5).
**Usikkert:**
- Bil-livsløp: spenn bensin 0,196–0,257 / diesel 0,181–0,276; metode A blander tre kilder og overfører VegLCAs oppstrømsforhold og dieselbilens kjøretøydel; metode B er fra 2010.
- VegLCA dokumenterer ikke systemgrenser (ecoinvent-versjon, «kun bil», elbil). Elbil 0,0773: ingen dobbelttelling funnet, men ikke bekreftet av VegLCA-dokumentasjon.
- «Bil (standard)» i VegLCA: lavt forbruk og blandet flåte; brukes ikke som referanse.
- Miljødirektoratets bilfaktorer: kun fossil CO2, biodrivstoff ikke trukket fra, gjennomsnittsbil 2023.
- Belegg i VegLCA: tog (rad 74/75) uten kilde i arket; SSB, KVU, Ruter oppgir ikke belegg.
- Fly: multiplikator 1,8 er en forutsetning (spenn 0,8–2,5).
- Ferje: ingen norsk livsløpsfaktor; Ruter-tallet gjelder Oslos kollektivbåter.
- E-sparkesykkel: TØI siterer utenlandsk primærkilde; Entur/SINTEF 0,2061 er 3,4 ganger høyere (omfang udokumentert).
- Gange/sykkel = 0 er VegLCA-modellantakelse; Entur/SINTEF 0,0196 har udokumentert omfang.
- Entur/SINTEF-kjøringer er modellresultater for en bestemt rute (459,6 km), ikke publiserte faktorer.

## 9. Designmerknad til CTO

`calc.ts` regner referansebil som faktor pr km × personens distanse, dvs. implisitt belegg 1. Bilfaktorene (per vkm, 1 person) passer med det. Øvrige modus er pkm ved kildens belegg (buss 25 %/50 %, fly 70 %). Dette er en annen konvensjon og bør avklares (CTO har godkjent denne praksisen, v2).

## 10. Britiske forslag – AVVIST der DESNZ var eneste kilde; krever godkjenning for øvrig (IKKE verdier)

**CTO-beslutning 02.11.2026: DESNZ-forslaget for hybrid er AVVIST; hybrid står som «mangler kilde». Seksjonen er beholdt til orientering.**

Opprinnelig forslag `kilder/faktorforslag-v1.md` (verdier er direkte utslipp uten oppstrøm, per vkm for bil) (DESNZ/DEFRA 2026, publisert 11.06.2026, https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026):

| Modus | Britisk forslag (kg CO2e) | Merknad |
|---|---|---|
| hybrid_car | ~~0,12961 pr vkm~~ | **AVVIST av CTO (02.11.2026)** – står som «mangler kilde» |
| (til sammenligning) bensinbil | 0,16152 | UK, ikke norsk, ikke brukt |
| (til sammenligning) dieselbil | 0,17265 | UK, ikke norsk, ikke brukt |
| elbil | 0,02951 | UK-strømmiks, ikke brukt |
| buss | 0,10151 | UK, ikke brukt |
| tog | 0,03092 | UK, ikke brukt |
| fly (med RF) | 0,22928 | UK, ikke brukt |
| ferje | 0,1127 | UK, ikke brukt |
| referansebil | 0,16591 | UK, ikke brukt |

Ikke i DESNZ-forslaget: electric_train, diesel_train, e_scooter, other. Øvrige internasjonale tall (ITF/OECD 2024: privat sykkel 0,015 kg CO2e/pkm) er ikke norske og ikke brukt som verdi.

## 11. Kilder (lenker i CSV)

Statens vegvesen VegLCA v6.03 (11.02.2026); Miljødirektoratet omregningsfaktorer (2023-snitt, NIR 2025); SSB 08.12.2020; Jernbanedirektoratet/Norconsult 20.03.2020; KVU GREEN (2023); Ruter årsrapport 2025; Vy årsrapport 2025; TØI 1427/2015; TØI «Transportytelser i Norge 1946–2022» (2003/2023, kun belegg-kontekst); TØI Tiltakskatalog (rev. 2026); Avinor/Asplan Viak 28.09.2020; CICERO 2016-05; NOU 2019:22; NVE (NTB 03.07.2026); Entur Miljøkalkulator og Emissions Calculator API (https://developer.entur.no/apis/emissions-calculator/emissions; SINTEF-modell; kjøringer 02.11.2026); Vestlandsforsking-rapport 2/2010, Simonsen, https://www.vestforsk.no/sites/default/files/migrate_files/sluttrapport-transport-energi-miljo.pdf (ISBN 978-82-428-0297-2); Del Duce, Gauch, Althaus (2014), Int. J. Life Cycle Assess., https://link.springer.com/article/10.1007/s11367-014-0792-4; Rousseau et al. 2025, Environ. Res. Lett. 20 084053 (kontekst, ikke brukt som verdi).
