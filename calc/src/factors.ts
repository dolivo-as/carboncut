// U-26-01 Carboncut – transportformer og utslippsfaktorer.
// Faktorversjon 1 = CTO-godkjent utslippsfaktorer_YTM.csv (v2, 02.11.2026). Kun verdier fra CSV-en.
// Alle tall er livsløp (lifecycle=true) unntatt ferje (bare direkte utslipp).
// Biler er oppgitt per KJØRETØY-km med 1 person i bilen (CTO-beslutning); øvrige modus per pkm (kildens belegg).
// Modus uten godkjent verdi står som "mangler_kilde" med null-verdi og blokkerer beregning.

export const TRANSPORT_MODES = [
  "walking","bicycle","e_scooter","electric_car","hybrid_car","gasoline_car","diesel_car",
  "city_bus","regional_bus","electric_train","diesel_train","train_unknown","airplane","ferry","other","home_office",
] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const MODE_LABELS: Record<TransportMode, { nb: string; en: string }> = {
  walking:{nb:"Gange",en:"Walking"}, bicycle:{nb:"Sykkel",en:"Bicycle"},
  e_scooter:{nb:"Elsparkesykkel",en:"E-scooter"}, electric_car:{nb:"Elbil",en:"Electric car"},
  hybrid_car:{nb:"Hybridbil",en:"Hybrid car"}, gasoline_car:{nb:"Bensinbil",en:"Gasoline car"},
  diesel_car:{nb:"Dieselbil",en:"Diesel car"},
  city_bus:{nb:"Buss (by)",en:"Bus (city)"}, regional_bus:{nb:"Buss (region/ekspress)",en:"Bus (regional/express)"},
  electric_train:{nb:"Elektrisk tog",en:"Electric train"}, diesel_train:{nb:"Dieseltog",en:"Diesel train"},
  train_unknown:{nb:"Tog (ukjent type)",en:"Train (unknown type)"}, airplane:{nb:"Fly",en:"Airplane"},
  ferry:{nb:"Ferje/båt",en:"Ferry or boat"}, other:{nb:"Annet",en:"Other"},
  home_office:{nb:"Hjemmekontor",en:"Home office"},
};

export const FACTOR_VERSION = 1;

export type FactorStatus = "dokumentert" | "mangler_kilde";
export type FactorUnit = "kg_co2e_per_pkm" | "kg_co2e_per_vkm";

export interface EmissionFactor {
  mode: Exclude<TransportMode, "home_office">;
  /** Faktorversjon (1 = CTO-godkjent YTM v2). */
  factorVersion: number;
  /** Verdi i enheten `unit`. null når status = mangler_kilde. */
  value: number | null;
  /** Bil: per kjøretøy-km (vkm). Øvrige: per personkilometer (pkm). */
  unit: FactorUnit;
  /** Personer i kjøretøyet som verdien gjelder for. Kreves for per_vkm (bil = 1, CTO). */
  vehicleOccupancy: number | null;
  /** Belegg slik CSV-en oppgir det (f.eks. «1 person pr bil (CTO)», «25,2 % (J70)»). */
  occupancyBasis: string | null;
  source: string | null;
  /** Utgave/versjon av kilden. */
  edition: string | null;
  /** Kildens publiseringsdato slik den står i CSV-en (fritekst: dato, år eller flere kilder). */
  sourceDate: string | null;
  /** Dato tallet ble hentet (fra CSV `hentet_dato`). */
  retrievedDate: string | null;
  /** true = livsløp; false = bare direkte utslipp; null = ingen verdi. */
  lifecycle: boolean | null;
  note: string | null;
  status: FactorStatus;
  /** Rad-ID i utslippsfaktorer_YTM.csv (v2). */
  csvId: string | null;
}

const VEGLCA = "Statens vegvesen VegLCA, fane «Persontransport» (beregnet etter VegLCAs formel)";
const VEGLCA_ED = "VegLCA v6.03 (11.02.2026; filen sist endret 15.04.2026 på vegvesen.no)";
const RETRIEVED = "2026-11-02";

type Row = Pick<EmissionFactor, "mode" | "value" | "csvId"> & Partial<EmissionFactor>;

function documented(r: Row & { source: string; edition: string; sourceDate: string }): EmissionFactor {
  const vkm = r.unit === "kg_co2e_per_vkm";
  return {
    factorVersion: FACTOR_VERSION, unit: "kg_co2e_per_pkm", vehicleOccupancy: vkm ? 1 : null,
    retrievedDate: RETRIEVED, lifecycle: true, note: null, status: "dokumentert", occupancyBasis: null, ...r,
  } as EmissionFactor;
}
function missing(mode: EmissionFactor["mode"], unit: FactorUnit, csvId: string | null, note: string): EmissionFactor {
  return { mode, factorVersion: FACTOR_VERSION, value: null, unit, vehicleOccupancy: null, occupancyBasis: null, source: null, edition: null,
    sourceDate: null, retrievedDate: null, lifecycle: null, note, status: "mangler_kilde", csvId };
}

export const FACTORS: EmissionFactor[] = [
  documented({ mode: "walking", value: 0, csvId: "W1", occupancyBasis: "ikke relevant (1 person)", source: "Statens vegvesen VegLCA, rad «Gå sykkel»", edition: VEGLCA_ED, sourceDate: "2026-02-11",
    note: "0 er en modellantakelse i VegLCA, ikke en full LCA (CSV: usikker)" }),
  documented({ mode: "bicycle", value: 0, csvId: "SY1", occupancyBasis: "ikke relevant (1 person)", source: "Statens vegvesen VegLCA, rad «Gå sykkel»", edition: VEGLCA_ED, sourceDate: "2026-02-11",
    note: "0 er en modellantakelse i VegLCA, ikke en full LCA (CSV: usikker)" }),
  documented({ mode: "e_scooter", value: 0.061, csvId: "S1", occupancyBasis: "per pkm; belegg ikke oppgitt (1 person pr sparkesykkel)", source: "TØI Tiltakskatalog «Delte elsparkesykler» (siterer ITF/OECD 2024), delt sparkesykkel, sentralt anslag",
    edition: "Tiltakskatalogen rev. 2026; ITF/OECD «Greener micromobility» 2024", sourceDate: "2026-11-02",
    note: "Usikker: norsk sekundærkilde, utenlandsk primærkilde" }),
  documented({ mode: "electric_car", value: 0.07727, unit: "kg_co2e_per_vkm", csvId: "E2", occupancyBasis: "1 person pr bil (CTO)", source: VEGLCA + ", Bil (elbil)", edition: VEGLCA_ED, sourceDate: "2026-02-11",
    note: "Per kjøretøy-km, 1 person i bilen" }),
  missing("hybrid_car", "kg_co2e_per_vkm", "H1/H2", "Ingen godkjent kilde (DESNZ avvist av CTO). Vestforsk 2010-kandidater er ikke godkjent."),
  documented({ mode: "gasoline_car", value: 0.25691, unit: "kg_co2e_per_vkm", csvId: "G3", occupancyBasis: "1 person pr bil (CTO)",
    source: "Beregnet: Miljødirektoratet 0,141 kg/vkm (direkte, 2023) + oppstrøm (VegLCA E10) + bilens slitasje (VegLCA/ecoinvent)",
    edition: "Miljødirektoratet 2023/NIR 2025; VegLCA v6.03 (11.02.2026)", sourceDate: "2025 / 2026-02-11", note: "Per kjøretøy-km, 1 person i bilen" }),
  documented({ mode: "diesel_car", value: 0.27575, unit: "kg_co2e_per_vkm", csvId: "D2", occupancyBasis: "1 person pr bil (CTO)",
    source: "Beregnet: Miljødirektoratet 0,146 kg/vkm (direkte, 2023) + oppstrøm (VegLCA veidiesel B20) + bilens slitasje (VegLCA/ecoinvent)",
    edition: "Miljødirektoratet 2023/NIR 2025; VegLCA v6.03 (11.02.2026)", sourceDate: "2025 / 2026-02-11", note: "Per kjøretøy-km, 1 person i bilen" }),
  documented({ mode: "city_bus", value: 0.1107, csvId: "BU2", occupancyBasis: "25,2 % (J70)", source: VEGLCA + ", Buss (lokal/by)", edition: VEGLCA_ED, sourceDate: "2026-02-11",
    note: "Livsløp (drivstoff + slitasje); belegg 25,2 % (J70, kilde Ruter)" }),
  documented({ mode: "regional_bus", value: 0.04146, csvId: "BU4", occupancyBasis: "50 % (J71)", source: VEGLCA + ", Buss (region/ekspress)", edition: VEGLCA_ED, sourceDate: "2026-02-11",
    note: "Livsløp (drivstoff + slitasje); belegg 50 % (J71, kilde Vy årsrapport)" }),
  documented({ mode: "electric_train", value: 0.0048, csvId: "T2", occupancyBasis: "31,8 % (J74)", source: VEGLCA + ", Tog (el)", edition: VEGLCA_ED, sourceDate: "2026-02-11",
    note: "Lav presisjon; belegg 31,8 % (J74)" }),
  documented({ mode: "diesel_train", value: 0.08769, csvId: "DT2", occupancyBasis: "35,5 % (J75)", source: VEGLCA + ", Tog (diesel)", edition: VEGLCA_ED, sourceDate: "2026-02-11",
    note: "Belegg 35,5 % (J75)" }),
  documented({ mode: "train_unknown", value: 0.01184, csvId: "TU2", occupancyBasis: "el 31,8 % (J74) / diesel 35,5 % (J75)",
    source: "Beregnet: vektet VegLCA el-/diesel-tog med dieselandel 0,0849 utledet fra SSB 2019 (0,0058)",
    edition: "VegLCA v6.03 (11.02.2026); SSB 08.12.2020", sourceDate: "2026-02-11 / 2020-12-08", note: "Beregnet; dieselandel er utledet, ikke publisert" }),
  documented({ mode: "airplane", value: 0.27823, csvId: "A5", occupancyBasis: "70 % (J78)",
    source: "Beregnet: VegLCA fly livsløp + (1,8 − 1) × VegLCA direkte (høydeeffekt ×1,8, CICERO 2016-05)",
    edition: "VegLCA v6.03 (11.02.2026); CICERO Report 2016-05", sourceDate: "2026-02-11 / 2016-05",
    note: "Livsløp med høydeeffekt ×1,8 på forbrenningsdelen; belegg 70 % (J78)" }),
  documented({ mode: "ferry", value: 0.111, lifecycle: false, csvId: "F1", occupancyBasis: "ikke oppgitt (Ruters pkm)", source: "Ruter årsrapport 2025, E1 Klimaendringer: båt (kg fossilt CO2e/pkm)",
    edition: "Årsrapport 2025", sourceDate: "2026", note: "bare direkte utslipp. Gjelder Ruters kollektivbåter i Oslofjorden, ikke bilferge/hurtigbåt." }),
  missing("other", "kg_co2e_per_pkm", "O1", "Udefinert kategori; ingen norsk kilde."),
];

/** Referansebil = bensinbil, livsløp, per kjøretøy-km med 1 person (CTO). Samme tall som gasoline_car (CSV: R3/G3). */
export interface Baseline {
  kgCo2ePerKm: number | null; // per kjøretøy-km
  vehicleOccupancy: number | null;
  occupancyBasis: string | null;
  source: string | null;
  edition: string | null;
  sourceDate: string | null;
  retrievedDate: string | null;
  lifecycle: boolean | null;
  factorVersion: number;
  status: FactorStatus;
  csvId: string | null;
}
export const REFERENCE_CAR: Baseline = {
  kgCo2ePerKm: 0.25691, vehicleOccupancy: 1, occupancyBasis: "1 person pr bil (CTO)",
  source: "Referansebil bensin: beregnet av Miljødirektoratet 2023 + VegLCA (samme som gasoline_car)",
  edition: "Miljødirektoratet 2023/NIR 2025; VegLCA v6.03 (11.02.2026)", sourceDate: "2025 / 2026-02-11", retrievedDate: RETRIEVED,
  lifecycle: true, factorVersion: FACTOR_VERSION, status: "dokumentert", csvId: "R3",
};
