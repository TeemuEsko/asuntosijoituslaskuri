import { confidenceLabels } from "../i18n/display-values.ts";
import { formatEuro, formatMonthlyEuro, parseArea, parseFinnishNumber, parseFloor, parseMonthlyAmount, parseSquareMeterRate, parseTimeExpression, type TimeStatus } from "./normalization.ts";
import { criticalFields, excludedCompanyLoanLabels, fieldDisplayNames, fieldSynonyms, type NormalizedFieldKey } from "./synonyms.ts";

export const LISTING_PARSER_VERSION = "0.3.1";

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

export type RenovationComponent = "pipe_unspecified" | "line_unspecified" | "full_line" | "water_pipes" | "drains" | "drain_lining" | "electrical" | "bathrooms" | "facade" | "balconies" | "element_seams" | "roof_replacement" | "roof_coating" | "roof_unspecified" | "windows" | "doors" | "drainage" | "elevator" | "ventilation" | "heating" | "locks" | "yard" | "entry_phone" | "mailboxes" | "yard_lighting" | "painting" | "fire_safety" | "telecom" | "heating_exchanger" | "foundations" | "yard_deck" | "energy_project";
export type RenovationFinding = { component: RenovationComponent; status: TimeStatus; years: number[]; sourceExcerpt: string; supportingExcerpts: string[]; section: ListingSection; confidence: ConfidenceLevel; confidenceScore: number; confidenceReasons: string[] };

export type RejectedCandidate = { excerpt: string; field?: NormalizedFieldKey; fieldName?: string; rawValue?: string; normalizedValue?: number | string; source?: ListingSourceType; sourcePath?: string; sourceConfidence?: number; fieldMatchConfidence?: number; validationConfidence?: number; validationResult?: "accepted" | "rejected"; reason: string; rejectionReason?: string };
export type FieldDiagnostic = { fieldName: string; rawValue: string; normalizedValue?: number | string; source: ListingSourceType; sourcePath: string; sourceConfidence: number; fieldMatchConfidence: number; validationConfidence: number; finalConfidence: number; validationResult: "accepted" | "rejected"; rejectionReason?: string };
export type ParserDiagnostics = { parserVersion: string; site: ListingSourceType; sections: ListingSection[]; rawCandidateCount: number; rejectedCandidates: RejectedCandidate[]; fieldDiagnostics: FieldDiagnostic[]; mergedFindingCount: number; acceptedFields: number; rejectedFields: number; conflicts: string[]; missingEssentialFields: string[]; warnings: string[]; errors: string[]; acquisition?: Record<string, unknown> };
export type ListingParseResult = { source: ListingSourceType; findings: ListingFinding[]; renovations: RenovationFinding[]; missingCriticalFields: string[]; warnings: string[]; diagnostics: ParserDiagnostics };
export type StructuredListingValue = { field: NormalizedFieldKey; value: number | string; unit?: ListingFinding["unit"]; label: string; excerpt: string; sourcePath?: string };

type RawCandidate = { field: NormalizedFieldKey; label: string; originalValue: string; value: number | string; unit?: ListingFinding["unit"]; source: ListingSourceType; excerpt: string; semanticSource: SemanticSource; section: ListingSection; exactSynonym: boolean; hasUnit: boolean; ambiguous?: boolean; calculationBasis?: string; sourcePath?: string };

const sectionHeadings: ReadonlyArray<[ListingSection, RegExp]> = [
  ["basic", /^(perustiedot|kohteen perustiedot)$/i], ["prices", /^(hintatiedot|hinta)$/i], ["fees", /^(vastikkeet ja maksut|vastikkeet|maksut)$/i], ["apartment", /^(asunnon tiedot|huoneiston tiedot)$/i], ["housing_company", /^(taloyhtiön tiedot|taloyhtiö)$/i], ["building", /^(rakennuksen tiedot|rakennus)$/i], ["completed_renovations", /^(tehdyt remontit|toteutetut remontit|korjaushistoria)$/i], ["future_renovations", /^(tulevat remontit|suunnitellut remontit)$/i], ["maintenance_plan", /^(kunnossapitotarveselvitys|pts)$/i], ["plot", /^tontti$/i], ["energy", /^energialuokka$/i], ["description", /^(kuvaus|kohteen kuvaus)$/i], ["location", /^sijainti$/i], ["services", /^palvelut$/i], ["additional", /^lisätiedot$/i],
];
const moneyFields = new Set<NormalizedFieldKey>(["salePrice", "debtFreePrice", "companyLoanShare", "maintenanceFeeMonthly", "financingFeeMonthly", "plotFeeMonthly", "otherMonthlyFees"]);
const monthlyFields = new Set<NormalizedFieldKey>(["maintenanceFeeMonthly", "financingFeeMonthly", "plotFeeMonthly", "otherMonthlyFees"]);
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
    const preceding = lower[position - 1]; const following = lower[position + candidate.synonym.length];
    if ((preceding && /[a-zåäö]/i.test(preceding)) || (following && /[a-zåäö]/i.test(following))) continue;
    if (candidate.field === "companyLoanShare" && excludedCompanyLoanLabels.some((label) => lower.includes(label))) continue;
    const separatorPosition = line.search(/[:\t]/); const fallbackStart = position + candidate.synonym.length;
    return { field: candidate.field, synonym: candidate.synonym, label: line.slice(0, separatorPosition >= 0 ? separatorPosition : fallbackStart).trim(), valueText: line.slice(separatorPosition >= 0 ? separatorPosition + 1 : fallbackStart).trim().replace(/^(?:[–—]\s*|-\s+)/, ""), exactSynonym: candidate.index === 0 };
  }
  return null;
}

function normalizeFieldValue(field: NormalizedFieldKey, rawValue: string, fullLine: string): { value: number | string; unit?: ListingFinding["unit"] } | null {
  if (field === "areaSqm") { const value = parseArea(rawValue || fullLine); return value !== null && value >= 5 && value <= 1_000 ? { value, unit: "m²" } : null; }
  if (field === "constructionYear") { const value = parseFinnishNumber(rawValue); return value !== null && value >= 1800 && value <= new Date().getFullYear() + 2 ? { value, unit: "vuosi" } : null; }
  if (field === "apartmentCount") { const value = parseFinnishNumber(rawValue); return value !== null && value > 0 && Number.isInteger(value) ? { value } : null; }
  if (field === "floor") { const value = parseFloor(rawValue || fullLine); return value ? { value } : null; }
  if (moneyFields.has(field)) {
    const squareRate = monthlyFields.has(field) ? parseSquareMeterRate(rawValue || fullLine) : null;
    const value = squareRate ?? (monthlyFields.has(field) ? parseMonthlyAmount(rawValue || fullLine) : parseFinnishNumber(rawValue));
    return value !== null && value >= 0 ? { value, unit: squareRate !== null ? "€/m²/kk" : monthlyFields.has(field) ? "€/kk" : "€" } : null;
  }
  if (field === "landOwnership") { const value = normalizedText(`${rawValue} ${fullLine}`); if (/valinnainen|lunastettava|voi lunastaa/.test(value)) return { value: "optional_leasehold" }; if (/vuokra/.test(value)) return { value: "leased" }; if (/oma tontti|oma$/.test(value)) return { value: "owned" }; return null; }
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

const renovationTerms: ReadonlyArray<[RenovationComponent, RegExp]> = [["full_line", /täydellinen linjasaneeraus/i], ["water_pipes", /käyttövesi(?:putkien|johtojen)|käyttövesiputket/i], ["drain_lining", /viemärien sukitus|viemärit sukitettu/i], ["drains", /viemärisaneeraus|viemärit|viemärikuvaus/i], ["electrical", /sähköjärjestelm|sähköpääkesk|nousujoht/i], ["bathrooms", /kylpyhuone/i], ["line_unspecified", /linjasaneeraus|lvis-saneeraus/i], ["pipe_unspecified", /putkiremont|putkiston (?:kuvaus|kuntotutkimus)/i], ["balconies", /parveke(?:remontti|saneeraus|laatta|rakente)|parvekkeet/i], ["element_seams", /elementtisauma/i], ["facade", /julkisivu|rappaus|tiiliverhous/i], ["roof_coating", /katon pinnoitus|vesikaton pinnoitus|katto pinnoitettu/i], ["roof_replacement", /vesikaton uusiminen|vesikatto uusittu|aluskatteen uusiminen/i], ["roof_unspecified", /kattoremontti|kattosaneeraus|vesikaton kunnostus|yläpohjan laaja korjaus/i], ["windows", /ikkunat|ikkunoiden/i], ["doors", /ovet|ovien|parvekeov/i], ["drainage", /salaojat|salaojien|sadevesijärjestelm/i], ["elevator", /hissi(?:remontti|en|n uusiminen|n peruskorjaus|n modernisointi)/i], ["ventilation", /ilmanvaihto|lämmöntalteenotto/i], ["heating_exchanger", /lämmönvaihdin/i], ["heating", /lämmitysjärjestelmä|lämmitysmuodon|patteriverkosto/i], ["locks", /lukitus|lukkojen/i], ["entry_phone", /ovipuhelin/i], ["mailboxes", /postilaatiko/i], ["yard_lighting", /pihavalaist/i], ["painting", /maalaustyö|huoltomaalaus|porraskäytävän pintaremontti/i], ["fire_safety", /palovaroitt|turvavalaist/i], ["telecom", /antenni|tietoliikennejärjestelm/i], ["foundations", /perustusten vedeneristys|perusmuurin vedeneristys|sokkelien laaja korjaus/i], ["yard_deck", /pihakansi|autohallin rakente|maanvastai/i], ["energy_project", /aurinkosähkö|energiasaneeraus|lisälämmöneristys/i], ["yard", /piha-alueet|pihan|jätepiste|leikkiväline|aidan|asfaltointi/i]];
const actionExpression = /uusittu|saneerattu|remontoitu|korjattu|kunnostettu|pinnoitettu|sukitettu|vaihdettu|peruskorjattu|toteutettu|tehty|valmistunut|aloitettu|päätetty|suunniteltu|suunnitteilla|arvioitu|ehdotettu|tutkitaan|harkitaan|puhdistettu|huollettu|tarkastettu|kuntotutkimus|kuntoarvio|kartoitus|hankesuunnittelu|korjaussuunnitelma|kilpailutus|ei\s+(?:ole\s+)?tehty|ei tiedossa/i;

export function parseRenovations(text: string): RenovationFinding[] {
  let section: ListingSection = "unknown"; const raw: RenovationFinding[] = [];
  for (const line of text.split(/\r?\n/).map((part) => part.trim()).filter(Boolean)) {
    const heading = detectHeading(line); if (heading) { section = heading; continue; }
    const renovationSection = ["completed_renovations", "future_renovations", "maintenance_plan"].includes(section);
    if (!renovationSection && !actionExpression.test(line)) continue;
    const matched = renovationTerms.filter(([, pattern]) => pattern.test(line));
    if (!matched.length) continue;
    for (const [component] of matched) {
      const parsedTime = parseTimeExpression(line); const base = renovationSection ? 68 : 48; const actionBonus = actionExpression.test(line) ? 15 : 0; const yearBonus = parsedTime.years.length ? 7 : 0; const score = Math.min(100, base + actionBonus + yearBonus);
      raw.push({ component, ...parsedTime, sourceExcerpt: line, supportingExcerpts: [line], section, confidence: score >= 80 ? "high" : score >= 55 ? "medium" : "low", confidenceScore: score, confidenceReasons: [renovationSection ? "Tunnistettu remonttiosio" : "Toimenpideilmaus vapaassa tekstissä", ...(actionBonus ? ["Remonttiverbi tunnistettu"] : []), ...(yearBonus ? ["Ajankohta tunnistettu"] : [])] });
    }
  }
  const groups = new Map<string, RenovationFinding[]>();
  for (const item of raw) { const key = `${item.component}:${item.status}:${item.years.join("-")}`; groups.set(key, [...(groups.get(key) ?? []), item]); }
  return [...groups.values()].map((group) => ({ ...group[0]!, supportingExcerpts: [...new Set(group.flatMap((item) => item.supportingExcerpts))], confidenceScore: Math.min(100, group[0]!.confidenceScore + (group.length > 1 ? 8 : 0)), confidence: group[0]!.confidenceScore + (group.length > 1 ? 8 : 0) >= 80 ? "high" : group[0]!.confidenceScore >= 55 ? "medium" : "low", confidenceReasons: [...group[0]!.confidenceReasons, ...(group.length > 1 ? [`${group.length} lähdettä tukee havaintoa`] : [])] }));
}

export function parseListingText(text: string, source: ListingSourceType = "pasted_text", structuredValues: StructuredListingValue[] = []): ListingParseResult {
  const rejectedCandidates: RejectedCandidate[] = [];
  const candidates: RawCandidate[] = [];
  for (const item of structuredValues) {
    if (item.field === "housingCompanyName" && !isValidHousingCompanyName(String(item.value), "unknown", item.label)) {
      rejectedCandidates.push({ excerpt: item.excerpt, field: item.field, fieldName: fieldDisplayNames[item.field], rawValue: String(item.value), normalizedValue: item.value, source, sourcePath: item.sourcePath ?? "structured_data", sourceConfidence: 90, fieldMatchConfidence: 0, validationConfidence: 0, validationResult: "rejected", reason: "Value matches street address pattern", rejectionReason: "Value matches street address pattern" });
      continue;
    }
    candidates.push({ field: item.field, label: item.label, originalValue: String(item.value), value: item.value, unit: item.unit, source, excerpt: item.excerpt, semanticSource: "structured_data", section: "unknown", exactSynonym: true, hasUnit: Boolean(item.unit), sourcePath: item.sourcePath });
  }
  let section: ListingSection = "unknown";
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const heading = detectHeading(line); if (heading) { section = heading; continue; }
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
  const findings = mergeCandidates(candidates); addDuplicateValueConflicts(findings); addFinancingTotal(findings); addCalculationConflicts(findings);
  const addressValues = new Set(findings.filter((item) => item.field === "address" || item.field === "streetAddress" || item.field === "listingTitle").map((item) => normalizedText(String(item.normalizedValue))));
  for (const finding of findings.filter((item) => item.field === "housingCompanyName" && addressValues.has(normalizedText(String(item.normalizedValue))))) { finding.conflicts.push("Sama arvo tunnistettiin osoitteeksi tai ilmoituksen otsikoksi."); finding.autoAccepted = false; finding.validationResult = "rejected"; finding.validationConfidence = 0; finding.fieldMatchConfidence = 0; finding.confidence = "low"; finding.confidenceScore = 0; }
  for (const finding of findings) { if (finding.conflicts.length) { const recalculated = confidence({ field: finding.field, label: finding.originalLabel, originalValue: finding.originalValue, value: finding.normalizedValue, unit: finding.unit, source, excerpt: finding.sourceExcerpt, semanticSource: finding.supportingSources[0]?.semanticSource ?? "named_field", section: finding.section, exactSynonym: true, hasUnit: Boolean(finding.unit) || !moneyFields.has(finding.field) }, finding.supportingSources.length, finding.conflicts.length); finding.confidence = recalculated.level; finding.confidenceScore = recalculated.score; finding.confidenceReasons = recalculated.reasons; finding.sourceConfidence = recalculated.sourceConfidence; finding.fieldMatchConfidence = recalculated.fieldMatchConfidence; finding.validationConfidence = recalculated.validationConfidence; finding.autoAccepted = false; } }
  const renovations = parseRenovations(text);
  const foundKeys = new Set(findings.map((finding) => finding.field)); if (renovations.some((item) => item.status === "completed" || item.status === "ongoing")) foundKeys.add("completedRenovations" as NormalizedFieldKey); if (renovations.some((item) => ["decided", "planned", "estimated", "proposed", "under_investigation"].includes(item.status))) foundKeys.add("futureRenovations" as NormalizedFieldKey);
  const missingCriticalFields = criticalFields.filter((item) => !foundKeys.has(item.key as NormalizedFieldKey)).map((item) => item.label);
  const conflicts = [...new Set(findings.flatMap((finding) => finding.conflicts))];
  const warnings = findings.length < 3 ? ["Sivulta ei löytynyt riittävästi kohdetietoja. Liitä ilmoituksen teksti tai täydennä tiedot itse."] : [];
  const fieldDiagnostics: FieldDiagnostic[] = [
    ...findings.map((finding) => ({ fieldName: finding.field, rawValue: finding.originalValue, normalizedValue: finding.normalizedValue, source: finding.source, sourcePath: finding.supportingSources[0]?.semanticSource ?? "parser", sourceConfidence: finding.sourceConfidence, fieldMatchConfidence: finding.fieldMatchConfidence, validationConfidence: finding.validationConfidence, finalConfidence: finding.confidenceScore, validationResult: finding.validationResult })),
    ...rejectedCandidates.map((item) => ({ fieldName: item.field ?? "unknown", rawValue: item.rawValue ?? item.excerpt, normalizedValue: item.normalizedValue, source: item.source ?? source, sourcePath: item.sourcePath ?? "parser", sourceConfidence: item.sourceConfidence ?? 0, fieldMatchConfidence: item.fieldMatchConfidence ?? 0, validationConfidence: item.validationConfidence ?? 0, finalConfidence: 0, validationResult: "rejected" as const, rejectionReason: item.rejectionReason ?? item.reason })),
  ];
  return { source, findings, renovations, missingCriticalFields, warnings, diagnostics: { parserVersion: LISTING_PARSER_VERSION, site: source, sections: detectSections(text), rawCandidateCount: candidates.length + rejectedCandidates.length, rejectedCandidates, fieldDiagnostics, mergedFindingCount: findings.length, acceptedFields: findings.filter((item) => item.validationResult === "accepted").length, rejectedFields: rejectedCandidates.length + findings.filter((item) => item.validationResult === "rejected").length, conflicts, missingEssentialFields: missingCriticalFields, warnings, errors: [] } };
}

export function getListingSourceFromUrl(input: string): Exclude<ListingSourceType, "pasted_text"> | null {
  try { const url = new URL(input); if (!/^https?:$/.test(url.protocol)) return null; const host = url.hostname.toLocaleLowerCase("fi"); if (host === "etuovi.com" || host.endsWith(".etuovi.com")) return "etuovi"; if (host === "oikotie.fi" || host.endsWith(".oikotie.fi")) return "oikotie"; return null; } catch { return null; }
}
