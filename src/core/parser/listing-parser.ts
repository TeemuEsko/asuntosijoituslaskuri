import { confidenceLabels } from "../i18n/display-values.ts";
import { normalizeHeatingType } from "../domain/heating.ts";
import { formatEuro, formatMonthlyEuro, parseArea, parseBuildingType, parseFinnishNumber, parseFloor, parseMonthlyAmount, parseRoomConfiguration, parseSquareMeterRate, parseTimeExpression, type TimeStatus } from "./normalization.ts";
import type { RentEstimate } from "../rent-data/types.ts";
import { classifyRentCandidateContext, parseStrictMonthlyRentCandidate } from "../rent-data/rent-candidate-parser.ts";
import type { AnalysisPreparation } from "../analysis/preparation-types.ts";
import type { ListingImageAnalysisStatus } from "../listing-images/types.ts";
import type { VisualConditionAnalysis } from "../visual-condition/types.ts";
import {
  HOUSING_COMPANY_LOAN_FEE_CONFLICT,
  resolveHousingCompanyLoan,
  type HousingCompanyLoanResolution,
} from "../analysis/housing-company-loan.ts";
import { ANALYSIS_FIELD_REGISTRY, excludedCompanyLoanLabels, fieldDisplayNames, fieldSynonyms, type NormalizedFieldKey } from "./synonyms.ts";

export const LISTING_PARSER_VERSION = "0.3.4-rc";

export type ConfidenceLevel = keyof typeof confidenceLabels;
export type ListingSourceType = "etuovi" | "oikotie" | "pasted_text";
export type FindingDecision = "pending" | "accepted" | "corrected" | "ignored";
export type ListingSection = "basic" | "prices" | "fees" | "apartment" | "housing_company" | "building" | "completed_renovations" | "future_renovations" | "maintenance_plan" | "plot" | "energy" | "description" | "location" | "services" | "additional" | "unknown";
export type SemanticSource = "structured_data" | "named_field" | "section_content" | "free_text" | "calculation";

export type SupportingSource = { semanticSource: SemanticSource; section: ListingSection; excerpt: string; originalValue: string };
export type FinancingFeePart = { label: string; value: number; excerpt: string };

export type ListingFinding = {
  id: string;
  field: NormalizedFieldKey;
  fieldName: string;
  originalLabel: string;
  originalValue: string;
  normalizedValue: number | string;
  unit?: "€" | "€/kk" | "€/m²/kk" | "m²" | "vuosi";
  source: ListingSourceType;
  sourceExcerpt: string;
  supportingSources: SupportingSource[];
  section: ListingSection;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  confidenceReasons: string[];
  sourceConfidence: number;
  fieldMatchConfidence: number;
  validationConfidence: number;
  validationResult: "accepted" | "rejected";
  conflicts: string[];
  breakdown?: FinancingFeePart[];
  calculationBasis?: string;
  aggregate?: boolean;
  autoAccepted: boolean;
};

export type RenovationComponent = "pipe_unspecified" | "line_unspecified" | "full_line" | "water_pipes" | "plot_water_line" | "drains" | "drain_lining" | "electrical" | "bathrooms" | "facade" | "facade_painting" | "balconies" | "element_seams" | "roof_replacement" | "roof_coating" | "roof_unspecified" | "windows" | "doors" | "exterior_doors" | "drainage" | "elevator" | "ventilation" | "heating" | "locks" | "yard" | "entry_phone" | "mailboxes" | "yard_lighting" | "painting" | "fire_safety" | "telecom" | "fiber_connection" | "heating_exchanger" | "foundations" | "yard_deck" | "energy_project" | "other";
export type RenovationSource = "listing" | "document" | "user" | "calculation" | "unknown";
export type RenovationMethod = "lining" | "replacement" | "repair" | "painting" | "installation" | "inspection" | "maintenance" | "unknown";
export type RenovationTimeHorizon = "next_five_years" | "one_to_five_years" | "near_future";
export type RenovationSourceRecord = { source: RenovationSource; sourceName: string; rawText: string; confidence: ConfidenceLevel };
export type RenovationConflict = { code: "renovation_source_conflict"; message: string; incomingSource: RenovationSource; incomingRawText: string };
export type HousingCompanyRenovationTexts = { completedRawText: string | null; plannedRawText: string | null };
export type RenovationFinding = {
  id: string;
  title: string;
  description: string;
  component: RenovationComponent;
  method?: RenovationMethod;
  status: TimeStatus;
  year: number | null;
  yearFrom: number | null;
  yearTo: number | null;
  years: number[];
  timeHorizon?: RenovationTimeHorizon;
  source: RenovationSource;
  sourceName: string;
  rawText: string;
  verifiedByDocuments: boolean;
  sourceHistory: RenovationSourceRecord[];
  conflicts: RenovationConflict[];
  sourceExcerpt: string;
  supportingExcerpts: string[];
  section: ListingSection;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  confidenceReasons: string[];
};

export type RejectedCandidate = { excerpt: string; field?: NormalizedFieldKey; fieldName?: string; rawValue?: string; normalizedValue?: number | string; source?: ListingSourceType; sourcePath?: string; sourceConfidence?: number; fieldMatchConfidence?: number; validationConfidence?: number; validationResult?: "accepted" | "rejected"; reason: string; rejectionReason?: string };
export type FieldDiagnostic = { fieldName: string; rawValue: string; normalizedValue?: number | string; source: ListingSourceType; sourcePath: string; sourceConfidence: number; fieldMatchConfidence: number; validationConfidence: number; finalConfidence: number; validationResult: "accepted" | "rejected"; rejectionReason?: string };
export type ParserDiagnostics = { parserVersion: string; site: ListingSourceType; sections: ListingSection[]; rawCandidateCount: number; rejectedCandidates: RejectedCandidate[]; fieldDiagnostics: FieldDiagnostic[]; mergedFindingCount: number; acceptedFields: number; rejectedFields: number; conflicts: string[]; missingEssentialFields: string[]; warnings: string[]; errors: string[]; acquisition?: Record<string, unknown> };
export type ListingParseResult = { source: ListingSourceType; findings: ListingFinding[]; renovations: RenovationFinding[]; housingCompanyRenovations: HousingCompanyRenovationTexts; housingCompanyLoan: HousingCompanyLoanResolution; missingCriticalFields: string[]; warnings: string[]; diagnostics: ParserDiagnostics; rentEstimate?: RentEstimate; preparation?: AnalysisPreparation; listingImageAnalysis?: ListingImageAnalysisStatus; visualCondition?: VisualConditionAnalysis };
export type StructuredListingValue = { field: NormalizedFieldKey; value: number | string; unit?: ListingFinding["unit"]; label: string; excerpt: string; sourcePath?: string; matchQuality?: "exact" | "general" };

type RawCandidate = { field: NormalizedFieldKey; label: string; originalValue: string; value: number | string; unit?: ListingFinding["unit"]; source: ListingSourceType; excerpt: string; semanticSource: SemanticSource; section: ListingSection; exactSynonym: boolean; hasUnit: boolean; ambiguous?: boolean; calculationBasis?: string; sourcePath?: string };

const sectionHeadings: ReadonlyArray<[ListingSection, RegExp]> = [
  ["basic", /^(perustiedot|kohteen perustiedot)$/i], ["prices", /^(hintatiedot|hinta)$/i], ["fees", /^(vastikkeet ja maksut|vastikkeet|maksut)$/i], ["apartment", /^(asunnon tiedot|huoneiston tiedot)$/i], ["housing_company", /^(taloyhtiön tiedot|taloyhtiö)$/i], ["building", /^(rakennuksen tiedot|rakennus)$/i], ["completed_renovations", /^(tehdyt remontit|tehdyt korjaukset|toteutetut remontit|korjaushistoria|taloyhtiössä tehdyt remontit|taloyhtiön tehdyt remontit|korjaukset ja remontit|taloyhtiön remontit|peruskorjaukset|suoritetut korjaukset|kunnossapito ja korjaukset)$/i], ["future_renovations", /^(tulevat remontit|suunnitellut remontit|tulevat korjaukset|suunnitellut korjaukset|kunnossapitotarpeet|seuraavan viiden vuoden korjaukset|tulevat peruskorjaukset|arvio tulevista korjauksista|seuraavien vuosien korjaukset)$/i], ["maintenance_plan", /^(kunnossapitotarveselvitys|pts|kunnossapitotarveselvitys 5 vuotta|kunnossapitotarveselvitys viidelle vuodelle)$/i], ["plot", /^tontti$/i], ["energy", /^energialuokka$/i], ["description", /^(kuvaus|kohteen kuvaus)$/i], ["location", /^sijainti$/i], ["services", /^palvelut$/i], ["additional", /^lisätiedot$/i],
];
const moneyFields = new Set<NormalizedFieldKey>(["salePrice", "debtFreePrice", "companyLoanShare", "maintenanceFeeMonthly", "financingFeeMonthly", "plotFeeMonthly", "otherMonthlyFees", "currentRentMonthly", "totalHousingCharge", "waterFeeMonthly", "parkingFeeMonthly", "saunaFeeMonthly", "wasteFeeMonthly", "landRentAnnual", "plotShareRedemptionPrice"]);
const monthlyFields = new Set<NormalizedFieldKey>(["maintenanceFeeMonthly", "financingFeeMonthly", "plotFeeMonthly", "otherMonthlyFees", "currentRentMonthly", "totalHousingCharge", "waterFeeMonthly", "parkingFeeMonthly", "saunaFeeMonthly", "wasteFeeMonthly"]);
const expectedSections: Partial<Record<NormalizedFieldKey, ListingSection[]>> = { salePrice: ["prices"], debtFreePrice: ["prices"], companyLoanShare: ["prices"], maintenanceFeeMonthly: ["fees"], financingFeeMonthly: ["fees"], plotFeeMonthly: ["fees", "plot"], areaSqm: ["basic", "apartment"], housingCompanyName: ["housing_company"], landOwnership: ["plot", "housing_company"] };

const streetAddressPattern = /^(?:[\p{L}.'-]+\s+){0,5}[\p{L}.'-]*(?:katu|tie|kuja|polku|väylä|kaari|rinne|ranta|aukio|tori|puisto|raitti|portti|mäki|penger|piha|kallio|harju|niitty|metsä|lehto|salmi|lahdentie|laita)\s+\d+[a-zA-Z]?(?:\s+[A-Z](?:\s*\d+)?)?$/iu;
const postalCityPattern = /^\d{5}\s+[\p{L}.'-]+(?:\s+[\p{L}.'-]+)*$/u;
const companyMarkerPattern = /\b(?:asunto\s+oy|asunto\s*(?:osake)?yhtiö|as\.?\s*oy|kiinteistö\s*oy|keskinäinen\s+kiinteistö\s*oy|bostads\s*ab|bostadsaktiebolag|fastighets\s*ab)\b/i;

export function looksLikeStreetAddress(value: string): boolean { return streetAddressPattern.test(value.trim()) || postalCityPattern.test(value.trim()); }
export function isValidHousingCompanyName(value: string, section: ListingSection = "unknown", label = ""): boolean {
  const clean = value.trim();
  if (!clean) return false;
  if (companyMarkerPattern.test(clean)) return true;
  if (looksLikeStreetAddress(clean)) return false;
  return /\boy\b/i.test(clean) && section === "housing_company" && /taloyhtiö|yhtiön nimi|asunto-osakeyhtiö/i.test(label);
}

function normalizedText(value: string): string { return value.toLocaleLowerCase("fi").replace(/[–—]/g, "-").replace(/[^a-z0-9åäö€²/., -]/gi, " ").replace(/\s+/g, " ").trim(); }
function detectHeading(line: string): ListingSection | null { const clean = line.replace(/[:\s]+$/, "").trim(); return sectionHeadings.find(([, pattern]) => pattern.test(clean))?.[0] ?? null; }

export function detectSections(text: string): ListingSection[] {
  const sections = text.split(/\r?\n/).map(detectHeading).filter((value): value is ListingSection => value !== null);
  return [...new Set(sections)];
}

function findField(line: string): { field: NormalizedFieldKey; synonym: string; label: string; valueText: string; exactSynonym: boolean } | null {
  const lower = normalizedText(line);
  const candidates = (Object.entries(fieldSynonyms) as Array<[NormalizedFieldKey, readonly string[]]>).flatMap(([field, synonyms]) => synonyms.map((synonym, index) => ({ field, synonym, index }))).sort((left, right) => right.synonym.length - left.synonym.length);
  for (const candidate of candidates) {
    const position = lower.indexOf(candidate.synonym);
    if (position < 0 || position > 12) continue;
    const separatorPosition = line.search(/[:\t]/);
    if (separatorPosition >= 0 && separatorPosition < position) continue;
    const preceding = lower[position - 1]; const following = lower[position + candidate.synonym.length];
    if ((preceding && /[a-zåäö]/i.test(preceding)) || (following && /[a-zåäö]/i.test(following))) continue;
    if (candidate.field === "companyLoanShare" && excludedCompanyLoanLabels.some((label) => lower.includes(label))) continue;
    const fallbackStart = position + candidate.synonym.length;
    return { field: candidate.field, synonym: candidate.synonym, label: line.slice(0, separatorPosition >= 0 ? separatorPosition : fallbackStart).trim(), valueText: line.slice(separatorPosition >= 0 ? separatorPosition + 1 : fallbackStart).trim().replace(/^(?:[–—]\s*|-\s+)/, ""), exactSynonym: candidate.index === 0 };
  }
  return null;
}

function normalizeFieldValue(field: NormalizedFieldKey, rawValue: string, fullLine: string): { value: number | string; unit?: ListingFinding["unit"] } | null {
  if (field === "areaSqm") { const value = parseArea(rawValue || fullLine); return value !== null && value >= 5 && value <= 1_000 ? { value, unit: "m²" } : null; }
  if (field === "constructionYear") { const value = parseFinnishNumber(rawValue); return value !== null && value >= 1800 && value <= new Date().getFullYear() + 2 ? { value, unit: "vuosi" } : null; }
  if (field === "apartmentCount" || field === "floorCount") { const value = parseFinnishNumber(rawValue); return value !== null && value > 0 && Number.isInteger(value) ? { value } : null; }
  if (field === "floor") { const value = parseFloor(rawValue || fullLine); return value ? { value } : null; }
  if (field === "roomDescription") { const value = parseRoomConfiguration(rawValue || fullLine); return value ? { value } : rawValue ? { value: rawValue.trim() } : null; }
  if (field === "buildingType") { const value = parseBuildingType(rawValue || fullLine); return value ? { value } : rawValue ? { value: rawValue.trim() } : null; }
  if (field === "heatingType") { const value = normalizeHeatingType(rawValue || fullLine); return value ? { value } : null; }
  if (field === "currentRentMonthly") {
    const candidate = parseStrictMonthlyRentCandidate(fullLine);
    return candidate ? { value: candidate.monthlyRent, unit: "€/kk" } : null;
  }
  if (moneyFields.has(field)) {
    const squareRate = monthlyFields.has(field) ? parseSquareMeterRate(rawValue || fullLine) : null;
    const value = squareRate ?? (monthlyFields.has(field) ? parseMonthlyAmount(rawValue || fullLine) : parseFinnishNumber(rawValue));
    return value !== null && value >= 0 ? { value, unit: squareRate !== null ? "€/m²/kk" : monthlyFields.has(field) ? "€/kk" : "€" } : null;
  }
  if (field === "landOwnership") { const value = normalizedText(`${rawValue} ${fullLine}`); if (/valinnainen|lunastettava|voi lunastaa/.test(value)) return { value: "optional_leasehold" }; if (/osittain oma/.test(value)) return { value: "partial_ownership" }; if (/vuokra/.test(value)) return { value: "leased" }; if (/oma tontti|oma$/.test(value)) return { value: "owned" }; if (/muu/.test(value)) return { value: "other" }; return null; }
  if (field === "elevator") { const value = normalizedText(rawValue); if (/^(kyllä|on)$|hissi on/.test(value)) return { value: "Kyllä" }; if (/^(ei|ei ole)$|ei hissiä/.test(value)) return { value: "Ei" }; return null; }
  return rawValue ? { value: rawValue.trim() } : null;
}

function confidence(candidate: RawCandidate, supportingCount: number, conflicts: number): { score: number; level: ConfidenceLevel; reasons: string[]; sourceConfidence: number; fieldMatchConfidence: number; validationConfidence: number } {
  const sourceConfidence = candidate.semanticSource === "structured_data" ? 90 : candidate.semanticSource === "named_field" ? 88 : candidate.semanticSource === "section_content" ? 68 : 45;
  let fieldMatchConfidence = candidate.exactSynonym ? 90 : expectedSections[candidate.field]?.includes(candidate.section) ? 78 : 60;
  const validationConfidence = candidate.field === "housingCompanyName" ? (isValidHousingCompanyName(String(candidate.value), candidate.section, candidate.label) ? 100 : 0) : 100;
  let score = Math.round(sourceConfidence * 0.35 + fieldMatchConfidence * 0.3 + validationConfidence * 0.35);
  const reasons = [candidate.semanticSource === "structured_data" ? "Rakenteinen tieto" : candidate.semanticSource === "named_field" ? "Nimetty kenttä ja arvo" : candidate.semanticSource === "section_content" ? "Tunnistetun osion sisältö" : "Vapaamuotoinen teksti"];
  if (candidate.exactSynonym) { score += 4; reasons.push("Tarkka kenttänimiosuma"); }
  if (candidate.hasUnit || !moneyFields.has(candidate.field)) { score += 5; reasons.push("Arvo ja yksikkö löytyivät yhdessä"); } else { score -= 15; reasons.push("Yksikkö puuttuu"); }
  if (expectedSections[candidate.field]?.includes(candidate.section)) { score += 4; reasons.push("Tieto löytyi oikeasta osiosta"); }
  if (supportingCount > 1) { score += Math.min(12, (supportingCount - 1) * 6); reasons.push(`${supportingCount} lähdettä tukee samaa arvoa`); }
  if (candidate.ambiguous) { score -= 18; reasons.push("Termillä on useita mahdollisia merkityksiä"); }
  if (conflicts > 0) { score -= 25; reasons.push("Lähteissä on ristiriita"); }
  if (!validationConfidence) { score = 0; fieldMatchConfidence = 0; reasons.push("Arvo ei läpäissyt kenttäkohtaista validointia"); }
  score = Math.max(0, Math.min(100, score));
  return { score, level: score >= 80 ? "high" : score >= 55 ? "medium" : "low", reasons, sourceConfidence, fieldMatchConfidence, validationConfidence };
}

function companyIdentity(value: string): string { return normalizedText(value).replace(/^(asunto oy(?: n)?|as oy|asunto osakeyhtiö|kiinteistö oy)\s+/, "").replace(/\b(asunto oy|as oy|asunto osakeyhtiö|kiinteistö oy)\b/g, "").replace(/[^a-z0-9åäö]/g, ""); }
function valueIdentity(candidate: RawCandidate): string { if (candidate.field === "housingCompanyName" && typeof candidate.value === "string") return companyIdentity(candidate.value); return `${typeof candidate.value === "number" ? candidate.value.toFixed(4) : normalizedText(candidate.value)}:${candidate.unit ?? ""}`; }
function sourcePriority(candidate: RawCandidate): number { if (candidate.field === "housingCompanyName") return candidate.semanticSource === "named_field" ? 5 : candidate.semanticSource === "structured_data" ? 4 : candidate.section === "housing_company" ? 3 : 1; return candidate.semanticSource === "named_field" ? 5 : candidate.semanticSource === "structured_data" ? 4 : candidate.semanticSource === "section_content" ? 3 : 1; }

function mergeCandidates(candidates: RawCandidate[]): ListingFinding[] {
  const groups = new Map<string, RawCandidate[]>();
  for (const candidate of candidates) {
    const componentKey = candidate.field === "financingFeeMonthly" ? normalizedText(candidate.label).replace(/\s+/g, "") : "";
    const key = `${candidate.field}:${valueIdentity(candidate)}:${componentKey}`;
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  return [...groups.values()].map((group, index) => {
    const selected = [...group].sort((left, right) => {
      if (left.field === "housingCompanyName") { const leftForm = /asunto|as oy|kiinteistö oy/i.test(String(left.value)) ? 1 : 0; const rightForm = /asunto|as oy|kiinteistö oy/i.test(String(right.value)) ? 1 : 0; if (leftForm !== rightForm) return rightForm - leftForm; }
      return sourcePriority(right) - sourcePriority(left);
    })[0]!;
    const sameFieldValues = new Set(candidates.filter((candidate) => candidate.field === selected.field && candidate.field !== "financingFeeMonthly").map(valueIdentity));
    const confidenceResult = confidence(selected, group.length, sameFieldValues.size > 1 ? 1 : 0);
    return { id: `${selected.field}-${index}`, field: selected.field, fieldName: fieldDisplayNames[selected.field], originalLabel: selected.label, originalValue: selected.originalValue, normalizedValue: selected.value, unit: selected.unit, source: selected.source, sourceExcerpt: selected.excerpt, supportingSources: group.map((candidate) => ({ semanticSource: candidate.semanticSource, section: candidate.section, excerpt: candidate.excerpt, originalValue: candidate.originalValue })), section: selected.section, confidence: confidenceResult.level, confidenceScore: confidenceResult.score, confidenceReasons: confidenceResult.reasons, sourceConfidence: confidenceResult.sourceConfidence, fieldMatchConfidence: confidenceResult.fieldMatchConfidence, validationConfidence: confidenceResult.validationConfidence, validationResult: "accepted", conflicts: [], calculationBasis: selected.calculationBasis, autoAccepted: confidenceResult.level === "high" && confidenceResult.validationConfidence === 100 } satisfies ListingFinding;
  });
}

function addDuplicateValueConflicts(findings: ListingFinding[]): void {
  const byField = new Map<NormalizedFieldKey, ListingFinding[]>();
  for (const finding of findings.filter((item) => !item.aggregate)) byField.set(finding.field, [...(byField.get(finding.field) ?? []), finding]);
  for (const [field, fieldFindings] of byField) {
    if (field === "financingFeeMonthly" || fieldFindings.length < 2) continue;
    if (field === "roomDescription" && fieldFindings.some((finding) => /huoneistoselitelmä/i.test(finding.originalLabel))) continue;
    const message = "Samalle kentälle löytyi useita eri arvoja. Valitse oikea arvo.";
    for (const finding of fieldFindings) { finding.conflicts.push(message); finding.autoAccepted = false; }
  }
}

function addFinancingTotal(findings: ListingFinding[]): void {
  const parts = findings.filter((finding) => finding.field === "financingFeeMonthly" && !finding.aggregate && typeof finding.normalizedValue === "number" && finding.unit === "€/kk");
  if (parts.length < 2) return;
  const breakdown = parts.map((part) => ({ label: part.originalLabel, value: part.normalizedValue as number, excerpt: part.sourceExcerpt }));
  findings.push({ id: "financingFeeMonthly-total", field: "financingFeeMonthly", fieldName: "Rahoitusvastikkeet yhteensä", originalLabel: "Rahoitusvastikkeiden erittely", originalValue: breakdown.map((part) => `${part.label}: ${part.value}`).join(" + "), normalizedValue: breakdown.reduce((sum, part) => sum + part.value, 0), unit: "€/kk", source: parts[0]!.source, sourceExcerpt: breakdown.map((part) => part.excerpt).join(" | "), supportingSources: parts.flatMap((part) => part.supportingSources), section: "fees", confidence: "high", confidenceScore: 95, confidenceReasons: ["Yhteissumma laskettiin näkyvistä erittelyistä"], sourceConfidence: 100, fieldMatchConfidence: 100, validationConfidence: 100, validationResult: "accepted", conflicts: [], breakdown, calculationBasis: breakdown.map((part) => `${formatMonthlyEuro(part.value)} (${part.label})`).join(" + "), aggregate: true, autoAccepted: true });
}

function singleNumericFinding(findings: ListingFinding[], field: NormalizedFieldKey): ListingFinding | undefined {
  const candidates = findings.filter((finding) => finding.field === field && typeof finding.normalizedValue === "number" && finding.validationResult === "accepted" && finding.conflicts.length === 0);
  if (field === "financingFeeMonthly") return candidates.find((finding) => finding.aggregate) ?? (candidates.length === 1 ? candidates[0] : undefined);
  return candidates.length === 1 ? candidates[0] : undefined;
}

function addResolvedHousingCompanyLoan(
  findings: ListingFinding[],
  text: string,
  source: ListingSourceType,
): HousingCompanyLoanResolution {
  const direct = singleNumericFinding(findings, "companyLoanShare");
  const debtFree = singleNumericFinding(findings, "debtFreePrice");
  const sale = singleNumericFinding(findings, "salePrice");
  const fee = singleNumericFinding(findings, "financingFeeMonthly");
  const explicitNoDebt = /(?:yhtiölainaosuus|huoneistokohtainen velkaosuus)[ \t]*:?[ \t]*(?:ei(?:[ \t]+ole)?|0[ \t]*€)(?=[ \t]*(?:$|[\r\n.;]))|(?:ei[ \t]+ole|ei)[ \t]+(?:yhtiölainaosuutta|huoneistokohtaista velkaosuutta|yhtiölainaa)/im.test(text);
  const resolution = resolveHousingCompanyLoan({
    directDebtShare: direct?.normalizedValue as number | undefined,
    explicitHasDebtShare: explicitNoDebt ? false : undefined,
    debtFreePrice: debtFree?.normalizedValue as number | undefined,
    salePrice: sale?.normalizedValue as number | undefined,
    financingFeeMonthly: fee?.normalizedValue as number | undefined,
  });

  if (resolution.source === "calculated" && resolution.debtShare !== null) {
    const priceSources = [debtFree, sale].filter((finding): finding is ListingFinding => Boolean(finding));
    findings.push({
      id: "companyLoanShare-calculated",
      field: "companyLoanShare",
      fieldName: fieldDisplayNames.companyLoanShare,
      originalLabel: "Päätelty hinnoista",
      originalValue: String(resolution.debtShare),
      normalizedValue: resolution.debtShare,
      unit: "€",
      source,
      sourceExcerpt: resolution.sourceDescription,
      supportingSources: priceSources.flatMap((finding) => finding.supportingSources),
      section: "prices",
      confidence: resolution.confidence === "high" ? "high" : "medium",
      confidenceScore: resolution.confidence === "high" ? 95 : 75,
      confidenceReasons: ["Yhtiölainaosuus pääteltiin velattoman hinnan ja myyntihinnan erotuksesta", "Hintojen vertailutoleranssi on 1 €"],
      sourceConfidence: 95,
      fieldMatchConfidence: 100,
      validationConfidence: 100,
      validationResult: "accepted",
      conflicts: [],
      calculationBasis: resolution.sourceDescription,
      autoAccepted: resolution.confidence === "high",
    });
  }

  if (resolution.conflicts.length) {
    const feeConflicts = resolution.conflicts.filter((conflict) => conflict === HOUSING_COMPANY_LOAN_FEE_CONFLICT);
    const conflictTargets = feeConflicts.length
      ? [direct, fee].filter((finding): finding is ListingFinding => Boolean(finding))
      : direct
        ? []
        : [debtFree, sale].filter((finding): finding is ListingFinding => Boolean(finding));
    for (const target of conflictTargets) {
      for (const conflict of feeConflicts.length ? feeConflicts : resolution.conflicts) if (!target.conflicts.includes(conflict)) target.conflicts.push(conflict);
      target.autoAccepted = false;
    }
  }
  return resolution;
}

function addCalculationConflicts(findings: ListingFinding[]): void {
  const one = (field: NormalizedFieldKey) => findings.find((finding) => finding.field === field && typeof finding.normalizedValue === "number" && (field !== "financingFeeMonthly" || finding.aggregate || findings.filter((item) => item.field === field).length === 1));
  const sale = one("salePrice"); const loan = one("companyLoanShare"); const debtFree = one("debtFreePrice");
  if (sale && loan && debtFree) {
    const calculated = (sale.normalizedValue as number) + (loan.normalizedValue as number);
    if (Math.abs(calculated - (debtFree.normalizedValue as number)) > 1) { const message = `Hintatiedot eivät täsmää. Myyntihinta ${formatEuro(sale.normalizedValue as number)} + yhtiölainaosuus ${formatEuro(loan.normalizedValue as number)} = ${formatEuro(calculated)}, mutta ilmoitettu velaton hinta on ${formatEuro(debtFree.normalizedValue as number)}.`; for (const item of [sale, loan, debtFree]) { item.conflicts.push(message); item.autoAccepted = false; } }
    if ((debtFree.normalizedValue as number) < (sale.normalizedValue as number)) { const message = "Velaton hinta on myyntihintaa pienempi. Tarkista hintatiedot."; for (const item of [sale, debtFree]) { item.conflicts.push(message); item.autoAccepted = false; } }
  }
  const fee = one("financingFeeMonthly");
  if (loan?.normalizedValue === 0 && fee && (fee.normalizedValue as number) > 0) { const message = `Yhtiölainaosuus on 0 €, mutta rahoitusvastike on ${formatMonthlyEuro(fee.normalizedValue as number)}. Arvoja ei muutettu automaattisesti.`; for (const item of [loan, fee]) { item.conflicts.push(message); item.autoAccepted = false; } }
}

const renovationTerms: ReadonlyArray<[RenovationComponent, RegExp]> = [
  ["full_line", /täydellinen linjasaneeraus/i],
  ["plot_water_line", /tonttivesijoht|tontin vesijoht/i],
  ["water_pipes", /käyttövesi(?:putkien|johtojen)|käyttövesiputket/i],
  ["drain_lining", /viemärien sukitus|viemärit sukitettu/i],
  ["drains", /viemärisaneeraus|viemärit|viemärikuvaus/i],
  ["electrical", /sähköjärjestelm|sähköpääkesk|nousujoht/i],
  ["bathrooms", /kylpyhuone|märkätila/i],
  ["line_unspecified", /linjasaneeraus|lvis-saneeraus/i],
  ["pipe_unspecified", /putkiremont|putkiston (?:kuvaus|kuntotutkimus)/i],
  ["balconies", /parveke(?:remontti|saneeraus|laatta|rakente)|parvekkeet/i],
  ["element_seams", /elementtisauma/i],
  ["facade_painting", /(?:talon|julkisivun|ulkoseinien) ulkomaalaus|julkisivu(?:jen)? maalaus/i],
  ["facade", /julkisivu|rappaus|tiiliverhous/i],
  ["roof_coating", /katon pinnoitus|vesikaton pinnoitus|katto pinnoitettu/i],
  ["roof_replacement", /vesikaton uusiminen|vesikatto uusittu|aluskatteen uusiminen/i],
  ["roof_unspecified", /kattoremontti|kattosaneeraus|katon (?:maalaus|korjaus|uusiminen)|vesikaton kunnostus|yläpohjan laaja korjaus/i],
  ["windows", /ikkuna(?:t|n|remont|-|\b)/i],
  ["exterior_doors", /ulko-ov|ulko ov/i],
  ["doors", /ovet|ovien|parvekeov/i],
  ["drainage", /salaoja(?:t|n|remont|-)|sadevesijärjestelm/i],
  ["elevator", /hissi(?:remontti|en|n uusiminen|n peruskorjaus|n modernisointi)/i],
  ["ventilation", /ilmanvaihto|lämmöntalteenotto/i],
  ["heating_exchanger", /lämmönvaihdin/i],
  ["heating", /lämmitysjärjestelmä|lämmitysmuodon|patteriverkosto/i],
  ["locks", /lukitus|lukkojen/i],
  ["entry_phone", /ovipuhelin/i],
  ["mailboxes", /postilaatiko/i],
  ["yard_lighting", /pihavalaist/i],
  ["painting", /maalaustyö|huoltomaalaus|porraskäytävän pintaremontti/i],
  ["fire_safety", /palovaroitt|turvavalaist/i],
  ["fiber_connection", /valokuitu(?:liittymä)?|kuituliittymä/i],
  ["telecom", /antenni|tietoliikennejärjestelm/i],
  ["foundations", /perustusten vedeneristys|perusmuurin vedeneristys|sokkelien laaja korjaus/i],
  ["yard_deck", /pihakansi|autohallin rakente|maanvastai/i],
  ["energy_project", /aurinkosähkö|energiasaneeraus|lisälämmöneristys/i],
  ["yard", /piha-alueet|pihan|jätepiste|leikkiväline|aidan|asfaltointi/i],
];
const actionExpression = /uusittu|uusiminen|saneerattu|remontoitu|korjattu|korjaus|kunnostettu|pinnoitettu|sukitettu|vaihdettu|peruskorjattu|toteutettu|toteutetaan|tehty|valmistunut|aloitettu|käynnissä|käynnistyy|päätetty|päättänyt|suunniteltu|suunnitteilla|suunnitelmissa|arvioitu|ehdotettu|tutkitaan|selvitetään|tarkastellaan|harkitaan|puhdistettu|huollettu|tarkastettu|kuntotutkimus|kuntoarvio|kartoitus|hankesuunnittelu|korjaussuunnitelma|kilpailutus|kilpailutettu|kunnossapitotarve|ei\s+(?:ole\s+)?tehty|ei tiedossa/i;

const renovationTitles: Record<RenovationComponent, string> = {
  pipe_unspecified: "Putkiremontti", line_unspecified: "Linjasaneeraus", full_line: "Täydellinen linjasaneeraus", water_pipes: "Käyttövesiputket", plot_water_line: "Tonttivesijohto", drains: "Viemärit", drain_lining: "Viemärien sukitus", electrical: "Sähköjärjestelmät", bathrooms: "Märkätilat", facade: "Julkisivu", facade_painting: "Julkisivun maalaus", balconies: "Parvekkeet", element_seams: "Elementtisaumat", roof_replacement: "Vesikaton uusiminen", roof_coating: "Katon pinnoitus", roof_unspecified: "Kattoremontti", windows: "Ikkunat", doors: "Ovet", exterior_doors: "Ulko-ovet", drainage: "Salaojat", elevator: "Hissi", ventilation: "Ilmanvaihto", heating: "Lämmitysjärjestelmä", locks: "Lukitus", yard: "Piha-alueet", entry_phone: "Ovipuhelinjärjestelmä", mailboxes: "Postilaatikot", yard_lighting: "Pihavalaistus", painting: "Maalaustyöt", fire_safety: "Palo- ja turvajärjestelmät", telecom: "Tietoliikennejärjestelmät", fiber_connection: "Valokuituliittymä", heating_exchanger: "Lämmönvaihdin", foundations: "Perustukset", yard_deck: "Pihakansi", energy_project: "Energiatehokkuushanke", other: "Muu remontti",
};

type RawRenovationSection = { section: "completed_renovations" | "future_renovations" | "maintenance_plan"; rawText: string };

function renovationLabel(line: string): { section: RawRenovationSection["section"]; inlineValue: string } | null {
  const clean = line.trim();
  for (const [section, pattern] of sectionHeadings) {
    if (!["completed_renovations", "future_renovations", "maintenance_plan"].includes(section)) continue;
    if (pattern.test(clean.replace(/[:\s]+$/, ""))) return { section: section as RawRenovationSection["section"], inlineValue: "" };
    const separator = clean.search(/[:\t]/);
    if (separator > 0 && pattern.test(clean.slice(0, separator).trim())) return { section: section as RawRenovationSection["section"], inlineValue: clean.slice(separator + 1).trim() };
  }
  return null;
}

export function extractHousingCompanyRenovations(text: string): { sections: RawRenovationSection[]; rawTexts: HousingCompanyRenovationTexts } {
  const sections: RawRenovationSection[] = [];
  let active: RawRenovationSection | null = null;
  const save = () => { if (active?.rawText.trim()) sections.push({ ...active, rawText: active.rawText.trim() }); };
  for (const line of text.split(/\r?\n/).map((part) => part.trim()).filter(Boolean)) {
    const label = renovationLabel(line);
    if (label) { save(); active = { section: label.section, rawText: label.inlineValue }; continue; }
    const heading = detectHeading(line);
    if (heading || (active && findField(line))) { save(); active = null; }
    if (active) active.rawText = [active.rawText, line].filter(Boolean).join("\n");
  }
  save();
  const completed = sections.filter((item) => item.section === "completed_renovations").map((item) => item.rawText);
  const planned = sections.filter((item) => item.section !== "completed_renovations").map((item) => item.rawText);
  return { sections, rawTexts: { completedRawText: completed.length ? [...new Set(completed)].join("\n") : null, plannedRawText: planned.length ? [...new Set(planned)].join("\n") : null } };
}

function renovationMethod(component: RenovationComponent, text: string): RenovationMethod | undefined {
  if (component === "drain_lining") return "lining";
  if (/maalaus\s*\/\s*korjaus\s*\/\s*uusiminen/.test(text)) return undefined;
  if (component === "facade_painting" || ((component === "roof_coating" || component === "roof_unspecified") && /maalau|maalattu/.test(text))) return "painting";
  if (component === "fiber_connection") return "installation";
  if (/uusittu|uusiminen|vaihdettu/.test(text)) return "replacement";
  if (/asennettu|liittymä/.test(text)) return "installation";
  if (/tutkimus|arvio|kuvaus|kartoitus/.test(text)) return "inspection";
  if (/huollettu|puhdistettu|tarkastettu/.test(text)) return "maintenance";
  if (/korjattu|korjaus|kunnostettu|saneerattu|remontoitu/.test(text)) return "repair";
  return undefined;
}

function renovationContext(component: RenovationComponent, text: string): string {
  const pattern = renovationTerms.find(([candidate]) => candidate === component)?.[1];
  const match = pattern?.exec(text);
  if (!match || match.index === undefined) return text;
  const before = Math.max(text.lastIndexOf(",", match.index), text.lastIndexOf(".", match.index), text.lastIndexOf(";", match.index));
  const afterCandidates = [text.indexOf(",", match.index), text.indexOf(".", match.index), text.indexOf(";", match.index)].filter((position) => position >= 0);
  const after = afterCandidates.length ? Math.min(...afterCandidates) : text.length;
  return text.slice(before + 1, after).trim();
}

function renovationTiming(text: string, section: ListingSection) {
  const parsed = parseTimeExpression(text);
  const range = text.match(/\b((?:19|20)\d{2})\s*(?:-|–|—)\s*((?:19|20)\d{2})\b/);
  const explicitUnknown = /ei tiedossa|ei mainintaa|ei(?:\s+ole)?\s+suunnitteilla|ei(?:\s+ole)?\s+päätetty/i.test(text);
  const status: TimeStatus = parsed.status === "unknown" && !explicitUnknown ? section === "completed_renovations" ? "completed" : ["future_renovations", "maintenance_plan"].includes(section) ? "planned" : "unknown" : parsed.status;
  const timeHorizon: RenovationTimeHorizon | undefined = /seuraavan viiden vuoden/i.test(text) ? "next_five_years" : /1\s*(?:-|–|—)\s*5 vuoden/i.test(text) ? "one_to_five_years" : /lähivuosina/i.test(text) ? "near_future" : undefined;
  return { ...parsed, status, year: parsed.years.length === 1 ? parsed.years[0]! : null, yearFrom: range ? Number(range[1]) : null, yearTo: range ? Number(range[2]) : null, timeHorizon };
}

function createRenovation(component: RenovationComponent, line: string, section: ListingSection, index: number): RenovationFinding {
  const timing = renovationTiming(line, section);
  const context = renovationContext(component, line);
  const vagueFuture = timing.status === "proposed" || timing.timeHorizon !== undefined || (["future_renovations", "maintenance_plan"].includes(section) && !timing.years.length);
  const score = vagueFuture ? 48 : Math.min(79, (["completed_renovations", "future_renovations", "maintenance_plan"].includes(section) ? 62 : 45) + (actionExpression.test(line) ? 9 : 0) + (timing.years.length ? 7 : 0));
  const confidence: ConfidenceLevel = score >= 55 ? "medium" : "low";
  const sourceHistory: RenovationSourceRecord[] = [{ source: "listing", sourceName: "Myynti-ilmoitus", rawText: line, confidence }];
  return { id: `listing-renovation-${component}-${timing.status}-${index}`, title: renovationTitles[component], description: context, component, method: renovationMethod(component, context.toLocaleLowerCase("fi")), ...timing, source: "listing", sourceName: "Myynti-ilmoitus", rawText: line, verifiedByDocuments: false, sourceHistory, conflicts: [], sourceExcerpt: line, supportingExcerpts: [line], section, confidence, confidenceScore: score, confidenceReasons: [["completed_renovations", "future_renovations", "maintenance_plan"].includes(section) ? "Tunnistettu taloyhtiön remonttiosio" : "Toimenpideilmaus vapaassa tekstissä", "Lähteenä myynti-ilmoitus", ...(actionExpression.test(line) ? ["Remonttiverbi tunnistettu"] : []), ...(timing.years.length ? ["Ajankohta tunnistettu"] : []), ...(vagueFuture ? ["Tulevan hankkeen ajankohta tai toteutus on epävarma"] : [])] };
}

export function parseRenovations(text: string): RenovationFinding[] {
  const extracted = extractHousingCompanyRenovations(text);
  const candidates: Array<{ line: string; section: ListingSection }> = extracted.sections.map((item) => ({ line: item.rawText, section: item.section }));
  let section: ListingSection = "unknown";
  for (const line of text.split(/\r?\n/).map((part) => part.trim()).filter(Boolean)) {
    const heading = detectHeading(line); if (heading) { section = heading; continue; }
    if (candidates.some((item) => item.line === line)) continue;
    if (actionExpression.test(line)) candidates.push({ line, section });
  }
  const raw = candidates.flatMap(({ line, section: candidateSection }, candidateIndex) => {
    const matched = renovationTerms.filter(([, pattern]) => pattern.test(line));
    const filtered = matched.length ? matched.filter(([component]) => !(component === "drains" && matched.some(([candidate]) => candidate === "drain_lining"))) : ["completed_renovations", "future_renovations", "maintenance_plan"].includes(candidateSection) ? [["other", /./] as [RenovationComponent, RegExp]] : [];
    return filtered.map(([component], componentIndex) => createRenovation(component, line, candidateSection, candidateIndex * 100 + componentIndex));
  });
  const groups = new Map<string, RenovationFinding[]>();
  for (const item of raw) { const key = `${item.component}:${item.method ?? ""}:${item.status}:${item.yearFrom ?? item.year ?? ""}:${item.yearTo ?? ""}`; groups.set(key, [...(groups.get(key) ?? []), item]); }
  return [...groups.values()].map((group, index) => {
    const first = group[0]!;
    const score = Math.min(79, first.confidenceScore + (group.length > 1 ? 5 : 0));
    return { ...first, id: `listing-renovation-${first.component}-${first.status}-${index}`, supportingExcerpts: [...new Set(group.flatMap((item) => item.supportingExcerpts))], sourceHistory: group.flatMap((item) => item.sourceHistory), confidenceScore: score, confidence: score >= 55 ? "medium" : "low", confidenceReasons: [...new Set([...first.confidenceReasons, ...(group.length > 1 ? [`${group.length} ilmoitustekstin kohtaa tukee havaintoa`] : [])])] };
  });
}

export function parseListingText(text: string, source: ListingSourceType = "pasted_text", structuredValues: StructuredListingValue[] = []): ListingParseResult {
  const rejectedCandidates: RejectedCandidate[] = [];
  const candidates: RawCandidate[] = [];
  for (const item of structuredValues) {
    if (item.field === "housingCompanyName" && !isValidHousingCompanyName(String(item.value), "unknown", item.label)) {
      rejectedCandidates.push({ excerpt: item.excerpt, field: item.field, fieldName: fieldDisplayNames[item.field], rawValue: String(item.value), normalizedValue: item.value, source, sourcePath: item.sourcePath ?? "structured_data", sourceConfidence: 90, fieldMatchConfidence: 0, validationConfidence: 0, validationResult: "rejected", reason: "Value matches street address pattern", rejectionReason: "Value matches street address pattern" });
      continue;
    }
    if (item.field === "currentRentMonthly") {
      const rentContextText = `${item.label} ${item.excerpt}`;
      const context = parseStrictMonthlyRentCandidate(rentContextText)?.context ?? classifyRentCandidateContext(rentContextText);
      if (typeof item.value !== "number" || item.unit !== "€/kk" || !["lease", "listing_explicit"].includes(context)) {
        rejectedCandidates.push({ excerpt: item.excerpt, field: item.field, fieldName: fieldDisplayNames[item.field], rawValue: String(item.value), normalizedValue: item.value, source, sourcePath: item.sourcePath ?? "structured_data", sourceConfidence: 90, fieldMatchConfidence: 0, validationConfidence: 0, validationResult: "rejected", reason: "Vuokra-arvo ei ollut yksiselitteinen asunnon kuukausivuokra", rejectionReason: "Vuokra-arvo ei ollut yksiselitteinen asunnon kuukausivuokra" });
        continue;
      }
    }
    const structuredValue = item.field === "heatingType" ? normalizeHeatingType(String(item.value)) : item.value;
    if (structuredValue === null) {
      rejectedCandidates.push({ excerpt: item.excerpt, field: item.field, fieldName: fieldDisplayNames[item.field], rawValue: String(item.value), source, sourcePath: item.sourcePath ?? "structured_data", sourceConfidence: 90, fieldMatchConfidence: 0, validationConfidence: 0, validationResult: "rejected", reason: "Lämmitysmuoto ei vastaa hyväksyttyä canonical arvoa", rejectionReason: "Lämmitysmuoto ei vastaa hyväksyttyä canonical arvoa" });
      continue;
    }
    candidates.push({ field: item.field, label: item.label, originalValue: String(item.value), value: structuredValue, unit: item.unit, source, excerpt: item.excerpt, semanticSource: "structured_data", section: "unknown", exactSynonym: item.matchQuality !== "general", hasUnit: Boolean(item.unit), ambiguous: item.matchQuality === "general", sourcePath: item.sourcePath });
  }
  for (const title of structuredValues.filter((item) => item.field === "listingTitle" && typeof item.value === "string")) {
    const room = parseRoomConfiguration(String(title.value)); const building = parseBuildingType(String(title.value));
    if (room && !structuredValues.some((item) => item.field === "roomDescription")) candidates.push({ field: "roomDescription", label: "Ilmoituksen otsikko", originalValue: String(title.value), value: room, source, excerpt: title.excerpt, semanticSource: "structured_data", section: "basic", exactSynonym: false, hasUnit: true, sourcePath: title.sourcePath });
    if (building && !structuredValues.some((item) => item.field === "buildingType")) candidates.push({ field: "buildingType", label: "Ilmoituksen otsikko", originalValue: String(title.value), value: building, source, excerpt: title.excerpt, semanticSource: "structured_data", section: "basic", exactSynonym: false, hasUnit: true, sourcePath: title.sourcePath });
  }
  let section: ListingSection = "unknown";
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const heading = detectHeading(line); if (heading) { section = heading; continue; }
    const contextualRent = parseStrictMonthlyRentCandidate(line);
    if (contextualRent) candidates.push({ field: "currentRentMonthly", label: contextualRent.context === "lease" ? "Vuokrasopimuksen mukainen vuokra" : "Nykyinen vuokra", originalValue: String(contextualRent.monthlyRent), value: contextualRent.monthlyRent, unit: "€/kk", source, excerpt: line, semanticSource: "section_content", section, exactSynonym: true, hasUnit: true });
    const match = findField(line); if (!match) continue;
    if (match.field === "companyLoanShare" && ["housing_company", "building"].includes(section) && !/huoneisto|osakkeisiin kohdistuva|lainaosuus|velkaosuus/i.test(match.label)) { rejectedCandidates.push({ excerpt: line, field: match.field, reason: "Taloyhtiön kokonaislaina ei ole huoneistokohtainen lainaosuus" }); continue; }
    const normalized = normalizeFieldValue(match.field, match.valueText, line);
    if (!normalized) { rejectedCandidates.push({ excerpt: line, field: match.field, reason: "Arvo puuttui, oli epärealistinen tai yksikköä ei voitu tulkita" }); continue; }
    if (match.field === "housingCompanyName" && !isValidHousingCompanyName(String(normalized.value), section, match.label)) {
      rejectedCandidates.push({ excerpt: line, field: match.field, fieldName: fieldDisplayNames[match.field], rawValue: match.valueText, normalizedValue: normalized.value, source, sourcePath: `text:${match.label}`, sourceConfidence: 88, fieldMatchConfidence: 0, validationConfidence: 0, validationResult: "rejected", reason: "Value matches street address pattern", rejectionReason: "Value matches street address pattern" });
      continue;
    }
    candidates.push({ field: match.field, label: match.label || match.synonym, originalValue: match.valueText, value: normalized.value, unit: normalized.unit, source, excerpt: line, semanticSource: "named_field", section, exactSynonym: match.exactSynonym, hasUnit: Boolean(normalized.unit) || !moneyFields.has(match.field), ambiguous: match.field === "companyLoanShare" && section === "unknown" && !/huoneisto|osakkeisiin kohdistuva|yhtiölainaosuus/i.test(match.label) });
  }
  const areaCandidate = candidates.find((item) => item.field === "areaSqm" && item.semanticSource !== "free_text");
  for (const candidate of candidates.filter((item) => monthlyFields.has(item.field) && item.unit === "€/m²/kk")) {
    if (areaCandidate && typeof areaCandidate.value === "number" && sourcePriority(areaCandidate) >= 4) { const rate = candidate.value as number; candidate.value = Math.round((rate * areaCandidate.value + Number.EPSILON) * 100) / 100; candidate.unit = "€/kk"; candidate.calculationBasis = `${rate.toLocaleString("fi-FI")} €/m²/kk × ${areaCandidate.value.toLocaleString("fi-FI")} m² = ${formatMonthlyEuro(candidate.value)}`; }
  }
  const findings = mergeCandidates(candidates); addDuplicateValueConflicts(findings); addFinancingTotal(findings);
  const housingCompanyLoan = addResolvedHousingCompanyLoan(findings, text, source);
  addCalculationConflicts(findings);
  const addressValues = new Set(findings.filter((item) => item.field === "address" || item.field === "streetAddress" || item.field === "listingTitle").map((item) => normalizedText(String(item.normalizedValue))));
  for (const finding of findings.filter((item) => item.field === "housingCompanyName" && addressValues.has(normalizedText(String(item.normalizedValue))))) { finding.conflicts.push("Sama arvo tunnistettiin osoitteeksi tai ilmoituksen otsikoksi."); finding.autoAccepted = false; finding.validationResult = "rejected"; finding.validationConfidence = 0; finding.fieldMatchConfidence = 0; finding.confidence = "low"; finding.confidenceScore = 0; }
  for (const finding of findings) { if (finding.conflicts.length) { const recalculated = confidence({ field: finding.field, label: finding.originalLabel, originalValue: finding.originalValue, value: finding.normalizedValue, unit: finding.unit, source, excerpt: finding.sourceExcerpt, semanticSource: finding.supportingSources[0]?.semanticSource ?? "named_field", section: finding.section, exactSynonym: true, hasUnit: Boolean(finding.unit) || !moneyFields.has(finding.field) }, finding.supportingSources.length, finding.conflicts.length); finding.confidence = recalculated.level; finding.confidenceScore = recalculated.score; finding.confidenceReasons = recalculated.reasons; finding.sourceConfidence = recalculated.sourceConfidence; finding.fieldMatchConfidence = recalculated.fieldMatchConfidence; finding.validationConfidence = recalculated.validationConfidence; finding.autoAccepted = false; } }
  const renovations = parseRenovations(text);
  const housingCompanyRenovations = extractHousingCompanyRenovations(text).rawTexts;
  const foundKeys = new Set(findings.map((finding) => finding.field)); if (renovations.some((item) => item.status === "completed" || item.status === "ongoing")) foundKeys.add("completedRenovations" as NormalizedFieldKey); if (renovations.some((item) => ["decided", "planned", "estimated", "proposed", "under_investigation"].includes(item.status))) foundKeys.add("futureRenovations" as NormalizedFieldKey);
  const missingCriticalFields = ANALYSIS_FIELD_REGISTRY.filter((item) => !foundKeys.has(item.key as NormalizedFieldKey)).map((item) => item.label);
  const conflicts = [...new Set(findings.flatMap((finding) => finding.conflicts))];
  const warnings = [
    ...(findings.length < 3 ? ["Sivulta ei löytynyt riittävästi kohdetietoja. Liitä ilmoituksen teksti tai täydennä tiedot itse."] : []),
    ...housingCompanyLoan.conflicts,
  ];
  const fieldDiagnostics: FieldDiagnostic[] = [
    ...findings.map((finding) => ({ fieldName: finding.field, rawValue: finding.originalValue, normalizedValue: finding.normalizedValue, source: finding.source, sourcePath: finding.supportingSources[0]?.semanticSource ?? "parser", sourceConfidence: finding.sourceConfidence, fieldMatchConfidence: finding.fieldMatchConfidence, validationConfidence: finding.validationConfidence, finalConfidence: finding.confidenceScore, validationResult: finding.validationResult })),
    ...rejectedCandidates.map((item) => ({ fieldName: item.field ?? "unknown", rawValue: item.rawValue ?? item.excerpt, normalizedValue: item.normalizedValue, source: item.source ?? source, sourcePath: item.sourcePath ?? "parser", sourceConfidence: item.sourceConfidence ?? 0, fieldMatchConfidence: item.fieldMatchConfidence ?? 0, validationConfidence: item.validationConfidence ?? 0, finalConfidence: 0, validationResult: "rejected" as const, rejectionReason: item.rejectionReason ?? item.reason })),
  ];
  return { source, findings, renovations, housingCompanyRenovations, housingCompanyLoan, missingCriticalFields, warnings, diagnostics: { parserVersion: LISTING_PARSER_VERSION, site: source, sections: detectSections(text), rawCandidateCount: candidates.length + rejectedCandidates.length, rejectedCandidates, fieldDiagnostics, mergedFindingCount: findings.length, acceptedFields: findings.filter((item) => item.validationResult === "accepted").length, rejectedFields: rejectedCandidates.length + findings.filter((item) => item.validationResult === "rejected").length, conflicts, missingEssentialFields: missingCriticalFields, warnings, errors: [] } };
}

export function getListingSourceFromUrl(input: string): Exclude<ListingSourceType, "pasted_text"> | null {
  try { const url = new URL(input); if (!/^https?:$/.test(url.protocol)) return null; const host = url.hostname.toLocaleLowerCase("fi"); if (host === "etuovi.com" || host.endsWith(".etuovi.com")) return "etuovi"; if (host === "oikotie.fi" || host.endsWith(".oikotie.fi")) return "oikotie"; return null; } catch { return null; }
}
