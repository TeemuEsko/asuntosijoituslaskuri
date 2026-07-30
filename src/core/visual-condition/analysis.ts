import type { RenovationCostRange, RenovationScope, VisualConditionAnalysis, VisualConditionConfidence, VisualConditionImageAssessment, VisualConditionObservation, VisualConditionRating, VisualConditionRoom, VisualConditionSource, VisualConditionSummary } from "./types";

const BUILDING_ROOMS = new Set<VisualConditionRoom>(["facade", "yard", "garage", "basement", "technical_room"]);
const confidenceWeight: Record<VisualConditionConfidence, number> = { high: 1, medium: .72, low: .35, unknown: .15 };
const severityPenalty = { info: 0, low: 5, medium: 13, high: 25 } as const;
const roomAliases: Record<string, VisualConditionRoom> = { olohuone: "living_room", livingroom: "living_room", "living room": "living_room", makuuhuone: "bedroom", bedroom: "bedroom", keittiö: "kitchen", keittio: "kitchen", kitchen: "kitchen", kylpyhuone: "bathroom", bathroom: "bathroom", wc: "toilet", toilet: "toilet", sauna: "sauna", eteinen: "entry", entry: "entry", kodinhoitohuone: "utility_room", parveke: "balcony", balcony: "balcony", terassi: "terrace", piha: "yard", julkisivu: "facade", facade: "facade", autokatos: "garage", autotalli: "garage", garage: "garage", kellari: "basement", basement: "basement", varasto: "storage", storage: "storage", "tekninen tila": "technical_room" };

function clamp(value: number, min = 0, max = 100) { return Math.min(max, Math.max(min, value)); }
function roundTo(value: number, precision: number) { return Math.round(value / precision) * precision; }

export function normalizeVisualRoom(value: unknown): VisualConditionRoom {
  if (typeof value !== "string") return "unknown";
  const normalized = value.toLocaleLowerCase("fi").trim().replace(/[_-]+/g, " ");
  const canonical = normalized.replace(/\s+/g, "_") as VisualConditionRoom;
  const known: VisualConditionRoom[] = ["living_room", "bedroom", "kitchen", "bathroom", "toilet", "sauna", "entry", "utility_room", "balcony", "terrace", "yard", "facade", "garage", "basement", "storage", "technical_room", "other", "unknown"];
  return known.includes(canonical) ? canonical : roomAliases[normalized] ?? "unknown";
}

export function sanitizeVisualObservationText(value: string, type?: VisualConditionObservation["type"]): string {
  const compact = value.replace(/\s+/g, " ").trim().slice(0, 600);
  if (type === "possible_moisture_indicator" || /kosteusvaurio|homevaurio|vesivahinko|rakenteissa on kosteutta/i.test(compact)) {
    return "Kuvassa näkyy värimuutos, joka voi liittyä kosteuteen tai pintavaurioon. Syytä ei voida varmistaa kuvasta, joten kohta on tarkistettava paikan päällä.";
  }
  return compact;
}

export function renovationScopeFromObservations(observations: VisualConditionObservation[]): RenovationScope {
  const active = observations.filter((item) => item.status !== "rejected" && item.type !== "unassessable" && item.type !== "positive_condition");
  const high = active.filter((item) => item.severity === "high").length;
  const medium = active.filter((item) => item.severity === "medium").length;
  const low = active.filter((item) => item.severity === "low").length;
  const affectedRooms = new Set(active.map((item) => item.room)).size;
  if (!active.length) return "none";
  if (high >= 3 || (high >= 2 && affectedRooms >= 3)) return "extensive";
  if (high >= 1 || medium >= 3 || affectedRooms >= 5) return "major";
  if (medium >= 1 || low >= 4 || affectedRooms >= 3) return "moderate";
  return "minor";
}

export function estimateVisualRenovationCost(scope: RenovationScope, areaSqm: number | undefined, confidence: VisualConditionConfidence): RenovationCostRange | null {
  if (scope === "unknown") return null;
  if (scope === "none") return { min: 0, max: 0, currency: "EUR", recommendedReserve: 0, confidence, assumptions: ["Kuvissa ei havaittu aktiivista näkyvää korjaustarvetta.", "Kuvien ulkopuolisia pintoja tai rakenteita ei ole arvioitu."] };
  const safeArea = Number.isFinite(areaSqm) && areaSqm! > 0 ? areaSqm! : 50;
  const config: Record<Exclude<RenovationScope, "none" | "unknown">, { rates: [number, number]; limits: [number, number] }> = {
    minor: { rates: [40, 90], limits: [2_000, 8_000] }, moderate: { rates: [150, 350], limits: [8_000, 30_000] }, major: { rates: [400, 900], limits: [20_000, 70_000] }, extensive: { rates: [700, 1_400], limits: [40_000, 120_000] }
  };
  const selected = config[scope];
  const min = roundTo(clamp(safeArea * selected.rates[0], selected.limits[0], selected.limits[1]), 500);
  const max = roundTo(clamp(safeArea * selected.rates[1], selected.limits[0], selected.limits[1]), 500);
  return { min, max: Math.max(min, max), currency: "EUR", recommendedReserve: roundTo((min + Math.max(min, max)) / 2, 500), confidence, assumptions: ["Haarukka perustuu huoneiston pinta-alaan sekä hyväksyttyjen näkyvien havaintojen määrään ja vakavuuteen.", "Arvio ei sisällä piileviä vaurioita, rakenteiden tutkimista, alueellista urakkahinnoittelua tai tarjouskohtaista työn laajuutta.", "Pelkkä vanha ilme ei automaattisesti tarkoita märkätiläremonttia."] };
}

function ratingFromScore(score: number): VisualConditionRating { return score >= 88 ? "excellent" : score >= 72 ? "good" : score >= 52 ? "fair" : score >= 32 ? "poor" : "very_poor"; }
function confidenceFrom(coverage: number, quality: number): VisualConditionConfidence { const combined = coverage * .55 + quality * 100 * .45; return combined >= 76 ? "high" : combined >= 52 ? "medium" : combined >= 25 ? "low" : "unknown"; }

function summarize(kind: "apartment" | "building", rating: VisualConditionRating, observations: VisualConditionObservation[], coverage: number): string {
  const label = kind === "apartment" ? "Huoneiston" : "Rakennuksen näkyvien osien";
  if (!observations.length) return `${label} kunnosta ei voitu tehdä riittävää kuvahavaintoa.`;
  const material = observations.filter((item) => item.type !== "positive_condition" && item.type !== "unassessable");
  if (!material.length) return `${label} kuvissa ei havaittu selvää näkyvää korjaustarvetta. Kattavuus on ${coverage} %.`;
  return `${label} kuvissa tunnistettiin ${material.length} tarkistettavaa havaintoa. Arvio koskee vain kuvissa näkyviä pintoja.`;
}

function buildSummary(kind: "apartment" | "building", observations: VisualConditionObservation[], images: VisualConditionImageAssessment[], totalImages: number, expectedRooms?: number): VisualConditionSummary {
  const relevantImages = images.filter((image) => kind === "building" ? BUILDING_ROOMS.has(image.room) : !BUILDING_ROOMS.has(image.room));
  const relevantObservations = observations.filter((item) => kind === "building" ? BUILDING_ROOMS.has(item.room) : !BUILDING_ROOMS.has(item.room));
  const assessable = relevantImages.filter((image) => image.assessability !== "not_assessable");
  const rooms = [...new Set(assessable.map((image) => image.room).filter((room) => room !== "unknown"))];
  const expected = kind === "apartment" ? Math.max(1, expectedRooms ?? 4) : Math.max(1, relevantImages.length || 1);
  const imageCoverage = totalImages ? assessable.length / totalImages : 0;
  const roomCoverage = Math.min(1, rooms.length / expected);
  const coverage = Math.round(clamp((imageCoverage * .45 + roomCoverage * .55) * 100));
  const quality = relevantImages.length ? relevantImages.reduce((sum, image) => sum + confidenceWeight[image.imageQuality], 0) / relevantImages.length : 0;
  let confidence = confidenceFrom(coverage, quality);
  if (relevantImages.length && relevantImages.every((image) => image.imageQuality === "low" || image.imageQuality === "unknown" || image.assessability !== "good")) confidence = "low";
  const active = relevantObservations.filter((item) => item.status !== "rejected");
  const score = assessable.length ? Math.round(clamp(86 - active.reduce((sum, item) => sum + severityPenalty[item.severity] * confidenceWeight[item.confidence], 0) + active.filter((item) => item.type === "positive_condition").length * 2)) : null;
  const rating = score === null ? "unknown" : ratingFromScore(score);
  return { overallRating: rating, visualConditionScore: score, coverage, confidence, assessedRooms: rooms, unassessedAreas: relevantImages.filter((image) => image.assessability === "not_assessable").map((image) => image.fileName), summary: summarize(kind, rating, active, coverage) };
}

export function aggregateVisualCondition(input: { id?: string; source?: VisualConditionSource; observations: VisualConditionObservation[]; images: VisualConditionImageAssessment[]; imageCount: number; failedImageCount?: number; areaSqm?: number; expectedRooms?: number; sourceDisclaimerAccepted: boolean; confirmationStatus?: "pending" | "automatic" | "confirmed"; generatedAt?: string; renovationScope?: RenovationScope; renovationScopeSource?: "calculation" | "user"; estimatedRenovationCostRange?: RenovationCostRange | null; renovationReserveSource?: "calculation" | "user"; listingConditionComparison?: VisualConditionAnalysis["listingConditionComparison"] }): VisualConditionAnalysis {
  const apartment = buildSummary("apartment", input.observations, input.images, input.imageCount, input.expectedRooms);
  const building = buildSummary("building", input.observations, input.images, input.imageCount);
  const primary = apartment.visualConditionScore !== null ? apartment : building;
  const active = input.observations.filter((item) => item.status !== "rejected");
  const calculatedScope = renovationScopeFromObservations(active);
  const scope = input.renovationScopeSource === "user" && input.renovationScope ? input.renovationScope : calculatedScope;
  const calculatedCost = estimateVisualRenovationCost(scope, input.areaSqm, primary.confidence);
  const estimatedRenovationCostRange = input.renovationReserveSource === "user" && input.estimatedRenovationCostRange && calculatedCost ? { ...calculatedCost, recommendedReserve: Math.max(0, input.estimatedRenovationCostRange.recommendedReserve) } : calculatedCost;
  const failed = input.failedImageCount ?? Math.max(0, input.imageCount - input.images.length);
  const analysableImageCount = input.images.filter((image) => image.assessability !== "not_assessable").length;
  const hasLimitedImages = input.images.some((image) => image.assessability !== "good");
  return {
    id: input.id ?? `visual-${Date.now()}`, source: input.source ?? "user_upload", status: failed && input.images.length || hasLimitedImages ? "partial" : input.images.length ? "completed" : "failed", confirmationStatus: input.confirmationStatus ?? "pending",
    apartmentVisualCondition: apartment, buildingVisualCondition: building, overallRating: primary.overallRating, overallConfidence: primary.confidence, visualConditionScore: primary.visualConditionScore, coverage: primary.coverage,
    observations: input.observations, images: input.images, renovationScope: scope, renovationScopeSource: input.renovationScopeSource === "user" ? "user" : "calculation", estimatedRenovationCostRange, renovationReserveSource: input.renovationReserveSource === "user" ? "user" : "calculation", imageCount: input.imageCount, analyzedImageCount: input.images.length, analysableImageCount, failedImageCount: failed,
    sourceDisclaimerAccepted: input.sourceDisclaimerAccepted, errorCodes: failed ? ["IMAGE_ANALYSIS_FAILED"] : [], generatedAt: input.generatedAt ?? new Date().toISOString(), listingConditionComparison: input.listingConditionComparison
  };
}

export function visualConditionScoreImpact(analysis?: VisualConditionAnalysis): number {
  if (!analysis || analysis.confirmationStatus === "pending" || analysis.overallConfidence === "low" || analysis.overallConfidence === "unknown") return 0;
  const impacts: Record<VisualConditionRating, number> = { excellent: 1, good: 1, fair: -1, poor: -3, very_poor: -4, unknown: 0 };
  return impacts[analysis.overallRating];
}

export function compareVisualConditionWithListing(listingCondition: string | undefined, analysis: Pick<VisualConditionAnalysis, "overallRating" | "overallConfidence">): VisualConditionAnalysis["listingConditionComparison"] {
  const value = listingCondition?.trim(); if (!value) return undefined;
  const listing = /erinomainen|erittäin hyvä|hyvä|uudenveroinen/i.test(value) ? "good" : /tyydyttävä|kohtalainen|välttävä/i.test(value) ? "fair" : /huono|remontoitava|peruskorjattava/i.test(value) ? "poor" : "unknown";
  const visual = analysis.overallRating === "excellent" || analysis.overallRating === "good" ? "good" : analysis.overallRating === "fair" ? "fair" : analysis.overallRating === "poor" || analysis.overallRating === "very_poor" ? "poor" : "unknown";
  if (listing === "unknown" || visual === "unknown" || analysis.overallConfidence === "low" || analysis.overallConfidence === "unknown") return { listingValue: value, status: "not_comparable", message: `Ilmoituksessa kohteen kunto on merkitty: “${value}”. Kuvien rajallinen varmuus ei riitä kuntoluokituksen vertaamiseen.` };
  if (listing === visual) return { listingValue: value, status: "supports", message: "Kuvien perusteella ilmoituksen kuntoluokitus vaikuttaa uskottavalta. Arvio koskee vain kuvissa näkyviä pintoja." };
  return { listingValue: value, status: "conflict", message: `Ilmoituksessa kohteen kunto on merkitty: “${value}”, mutta kuvissa näkyvä yleiskunto poikkeaa tästä. Kuvista ei voida arvioida teknistä kuntoa, joten ristiriita on tarkistettava paikan päällä.` };
}

export function updateVisualObservation(analysis: VisualConditionAnalysis, id: string, changes: Partial<Pick<VisualConditionObservation, "room" | "area" | "severity" | "summary" | "details" | "requiresProfessionalInspection">>, areaSqm?: number): VisualConditionAnalysis {
  const now = new Date().toISOString();
  const observations = analysis.observations.map((item) => item.id !== id ? item : { ...item, ...changes, summary: changes.summary === undefined ? item.summary : sanitizeVisualObservationText(changes.summary, item.type), details: changes.details === undefined ? item.details : sanitizeVisualObservationText(changes.details, item.type), status: "edited" as const, source: "user_confirmed" as const, userConfirmed: true, userEdited: true, sourceHistory: [...item.sourceHistory, { source: "user" as const, value: changes.details ?? changes.summary ?? item.details, recordedAt: now }] });
  return aggregateVisualCondition({ ...analysis, observations, areaSqm, sourceDisclaimerAccepted: analysis.sourceDisclaimerAccepted, confirmationStatus: "confirmed", generatedAt: now });
}

export function setVisualObservationStatus(analysis: VisualConditionAnalysis, id: string, status: "accepted" | "rejected", areaSqm?: number): VisualConditionAnalysis {
  const observations = analysis.observations.map((item) => item.id === id ? { ...item, status, userConfirmed: status === "accepted", source: status === "accepted" ? "user_confirmed" as const : item.source } : item);
  return aggregateVisualCondition({ ...analysis, observations, areaSqm, sourceDisclaimerAccepted: analysis.sourceDisclaimerAccepted, confirmationStatus: status === "accepted" ? "confirmed" : analysis.confirmationStatus });
}

export function confirmVisualCondition(analysis: VisualConditionAnalysis, areaSqm?: number): VisualConditionAnalysis {
  return aggregateVisualCondition({ ...analysis, observations: analysis.observations.map((item) => item.status === "proposed" ? { ...item, status: "accepted" as const, source: "user_confirmed" as const, userConfirmed: true } : item), areaSqm, sourceDisclaimerAccepted: analysis.sourceDisclaimerAccepted, confirmationStatus: "confirmed" });
}
