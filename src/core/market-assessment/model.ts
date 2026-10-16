export type MarketAssessmentValue = 1 | 2 | 3 | 4 | 5;
export type AssessmentConfidence = "high" | "medium" | "low" | "unknown";
export type AssessmentSource = "automatic" | "default" | "user" | "unknown";
export type AssessmentFactorImpact = "positive" | "negative" | "neutral";
export type AssessmentFactorSource = "listing" | "statistics" | "portal" | "unknown";

export type AssessmentEvidence = {
  publisher: string;
  datasetId: string;
  datasetName: string;
  period: string;
  area: string;
  areaLevel: "postal_code" | "municipality" | "sub_region" | "region" | "comparison_area" | "country" | "unknown";
  license: string;
  fetchedAt?: string;
};

export type AssessmentFactor = {
  id: string;
  label: string;
  impact: AssessmentFactorImpact;
  description: string;
  source: AssessmentFactorSource;
  evidence?: AssessmentEvidence;
};

export type EstimatedChoice<T> = {
  automaticValue: T | null;
  effectiveValue: T | null;
  source: AssessmentSource;
  sourceName: string;
  confidence: AssessmentConfidence;
  factors: AssessmentFactor[];
  userOverridden: boolean;
  generatedAt: string | null;
};

export type MarketAssessmentSet = {
  rentalDemand: EstimatedChoice<MarketAssessmentValue>;
  locationRisk: EstimatedChoice<MarketAssessmentValue>;
  resaleLiquidity: EstimatedChoice<MarketAssessmentValue>;
};

export type OfficialAreaSignals = {
  populationChangePercent?: number;
  realisedTransactions?: number;
  netMigrationRate?: number;
  employmentRate?: number;
  unemploymentRate?: number;
  workplaceSelfSufficiency?: number;
  employerConcentration?: "low" | "medium" | "high";
  urbanisation?: "urban" | "semi_urban" | "rural";
  transactionVolumeTrendPercent?: number;
  populationEvidence?: AssessmentEvidence;
  transactionEvidence?: AssessmentEvidence;
};

/** Portaaliraja säilyy mahdollista luvallista datalähdettä varten. Ilmoitusdataa ei pisteytetä ilman validoitua mallia. */
export type PortalMarketSignals = {
  sourceName: string;
  permitted: boolean;
  comparableRentalListings?: number;
  comparableSaleListings?: number;
  housingCompanyListingHistoryCount?: number;
  estimatedRentalListingDays?: number;
  estimatedSaleListingDays?: number;
  fetchedAt?: string;
};

export type MarketAssessmentInput = {
  city?: string;
  district?: string;
  postalCode?: string;
  roomDescription?: string;
  areaSqm?: number;
  buildingType?: string;
  constructionYear?: number;
  elevator?: boolean;
  floor?: number;
  landOwnership?: string;
  apartmentCount?: number;
  statisticalRentAvailable?: boolean;
  rentEvidence?: AssessmentEvidence;
  official?: OfficialAreaSignals;
  portal?: PortalMarketSignals;
  generatedAt?: string;
};

export const MARKET_ASSESSMENT_DEFAULT_EXPLANATION = "Riittävää ajantasaista alueellista dataa ei löytynyt automaattiseen arvioon. Neutraali oletus, jota voit muuttaa.";

function evidenceFactor(id: string, label: string, description: string, evidence: AssessmentEvidence): AssessmentFactor {
  return { id, label, impact: "neutral", description, source: "statistics", evidence };
}

function defaultChoice(input: MarketAssessmentInput, factors: AssessmentFactor[]): EstimatedChoice<MarketAssessmentValue> {
  return {
    automaticValue: 3,
    effectiveValue: 3,
    source: "default",
    sourceName: MARKET_ASSESSMENT_DEFAULT_EXPLANATION,
    confidence: "unknown",
    factors: [...factors, { id: "neutral-default", label: "Arvion rajaus", impact: "neutral", description: MARKET_ASSESSMENT_DEFAULT_EXPLANATION, source: "unknown" }],
    userOverridden: false,
    generatedAt: input.generatedAt ?? null,
  };
}

export function resolveLocationRisk(input: MarketAssessmentInput): EstimatedChoice<MarketAssessmentValue> {
  const factors: AssessmentFactor[] = [];
  const population = input.official?.populationChangePercent;
  const evidence = input.official?.populationEvidence;
  if (typeof population === "number" && evidence) factors.push(evidenceFactor("population-change", "Väestökehitys", `Kuntatason väkiluvun muutos oli ${population.toLocaleString("fi-FI", { maximumFractionDigits: 1 })} %. Yksittäinen kuntatason signaali ei riitä sijaintiriskin 1–5-luokitukseen.`, evidence));
  if (input.city) factors.push({ id: "municipality-scope", label: "Alueellinen tarkkuus", impact: "neutral", description: `Saatavilla oleva aluekohdistus on kunta (${input.city}), ei kaupunginosa tai yksittäinen kiinteistö.`, source: "listing" });
  return defaultChoice(input, factors);
}

export function resolveRentalDemand(input: MarketAssessmentInput): EstimatedChoice<MarketAssessmentValue> {
  const factors: AssessmentFactor[] = [];
  if (input.statisticalRentAvailable && input.rentEvidence) factors.push(evidenceFactor("rent-statistics", "Alueellinen vuokratilasto", "Alueellinen vuokrataso on saatavilla, mutta vuokrataso ei yksin mittaa vuokrakysyntää tai vajaakäyttöä.", input.rentEvidence));
  factors.push({ id: "demand-data-limit", label: "Kysyntädatan rajaus", impact: "neutral", description: "Vuokra-asuntojen vajaakäyttöä, vuokrausaikaa tai riittävää usean riippumattoman kysyntäsignaalin aineistoa ei ollut saatavilla.", source: "unknown" });
  return defaultChoice(input, factors);
}

export function resolveResaleLiquidity(input: MarketAssessmentInput): EstimatedChoice<MarketAssessmentValue> {
  const factors: AssessmentFactor[] = [];
  const transactions = input.official?.realisedTransactions;
  const evidence = input.official?.transactionEvidence;
  if (typeof transactions === "number" && evidence) factors.push(evidenceFactor("realised-transactions", "Toteutuneet asuntokaupat", `Tilastossa on ${transactions.toLocaleString("fi-FI")} toteutunutta kauppaa valitussa kunta- ja talotyyppiluokassa. Kauppamäärä ilman vertailukelpoista markkinakokoa tai toteutunutta myyntiaikaa ei riitä 1–5-luokitukseen.`, evidence));
  factors.push({ id: "sale-time-unavailable", label: "Myyntiaika", impact: "neutral", description: "Soveltuvaa toteutuneiden myyntiaikojen avointa aineistoa ei ollut käytettävissä, joten myyntipäivien arviota ei esitetä.", source: "unknown" });
  return defaultChoice(input, factors);
}

export function resolveMarketAssessments(input: MarketAssessmentInput): MarketAssessmentSet {
  return { rentalDemand: resolveRentalDemand(input), locationRisk: resolveLocationRisk(input), resaleLiquidity: resolveResaleLiquidity(input) };
}

export function overrideEstimatedChoice<T>(choice: EstimatedChoice<T>, value: T): EstimatedChoice<T> {
  return { ...choice, effectiveValue: value, source: "user", userOverridden: true };
}

export function restoreAutomaticChoice<T>(choice: EstimatedChoice<T>): EstimatedChoice<T> {
  return { ...choice, effectiveValue: choice.automaticValue, source: choice.automaticValue === null ? "unknown" : "default", userOverridden: false };
}

export function assessmentConfidenceWeight(choice: Pick<EstimatedChoice<unknown>, "source" | "confidence"> | undefined): number {
  if (!choice || choice.source === "unknown" || choice.source === "default") return 0;
  if (choice.source === "user") return 1;
  if (choice.confidence === "unknown") return 0;
  if (choice.confidence === "high") return 1;
  if (choice.confidence === "medium") return 0.75;
  return 0.45;
}
