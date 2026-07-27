import { confidenceLabels } from "../i18n/display-values.ts";
import { formatEuro, formatMonthlyEuro, parseArea, parseFinnishNumber, parseMonthlyAmount, parseTimeExpression, type TimeStatus } from "./normalization.ts";
import { excludedCompanyLoanLabels, fieldDisplayNames, fieldSynonyms, type NormalizedFieldKey } from "./synonyms.ts";

export type ConfidenceLevel = keyof typeof confidenceLabels;
export type ListingSourceType = "etuovi" | "oikotie" | "pasted_text";
export type FindingDecision = "pending" | "accepted" | "corrected" | "ignored";

export type FinancingFeePart = { label: string; value: number; excerpt: string };

export type ListingFinding = {
  id: string;
  field: NormalizedFieldKey;
  fieldName: string;
  originalLabel: string;
  originalValue: string;
  normalizedValue: number | string;
  unit?: "€" | "€/kk" | "m²" | "vuosi";
  source: ListingSourceType;
  sourceExcerpt: string;
  confidence: ConfidenceLevel;
  conflicts: string[];
  breakdown?: FinancingFeePart[];
  aggregate?: boolean;
};

export type RenovationComponent = "pipe_unspecified" | "line_unspecified" | "water_pipes" | "drains" | "electrical" | "bathrooms" | "facade" | "balconies" | "element_seams" | "roof_replacement" | "roof_coating" | "roof_unspecified";

export type RenovationFinding = {
  component: RenovationComponent;
  status: TimeStatus;
  years: number[];
  sourceExcerpt: string;
  confidence: ConfidenceLevel;
};

export type ListingParseResult = {
  source: ListingSourceType;
  findings: ListingFinding[];
  renovations: RenovationFinding[];
  warnings: string[];
};

const moneyFields = new Set<NormalizedFieldKey>(["salePrice", "debtFreePrice", "companyLoanShare", "maintenanceFeeMonthly", "financingFeeMonthly", "plotFeeMonthly"]);
const monthlyFields = new Set<NormalizedFieldKey>(["maintenanceFeeMonthly", "financingFeeMonthly", "plotFeeMonthly"]);

function normalizedText(value: string): string {
  return value.toLocaleLowerCase("fi").replace(/\s+/g, " ").trim();
}

function findField(line: string): { field: NormalizedFieldKey; synonym: string; label: string; valueText: string; confidence: ConfidenceLevel } | null {
  const lower = normalizedText(line);
  const candidates = (Object.entries(fieldSynonyms) as Array<[NormalizedFieldKey, readonly string[]]>)
    .flatMap(([field, synonyms]) => synonyms.map((synonym, index) => ({ field, synonym, index })))
    .sort((left, right) => right.synonym.length - left.synonym.length);

  for (const candidate of candidates) {
    const position = lower.indexOf(candidate.synonym);
    if (position < 0 || position > 12) continue;
    const preceding = lower[position - 1];
    const following = lower[position + candidate.synonym.length];
    if ((preceding && /[a-zåäö]/i.test(preceding)) || (following && /[a-zåäö]/i.test(following))) continue;
    if (candidate.field === "companyLoanShare" && excludedCompanyLoanLabels.some((label) => lower.includes(label))) continue;
    const separatorPosition = line.search(/[:\t]/);
    const fallbackStart = position + candidate.synonym.length;
    const valueText = line.slice(separatorPosition >= 0 ? separatorPosition + 1 : fallbackStart).trim().replace(/^[-–—]\s*/, "");
    return { field: candidate.field, synonym: candidate.synonym, label: line.slice(0, separatorPosition >= 0 ? separatorPosition : fallbackStart).trim(), valueText, confidence: candidate.index === 0 ? "high" : "medium" };
  }
  return null;
}

function normalizeFieldValue(field: NormalizedFieldKey, rawValue: string, fullLine: string): { value: number | string; unit?: ListingFinding["unit"] } | null {
  if (field === "areaSqm") {
    const value = parseArea(rawValue || fullLine);
    return value === null ? null : { value, unit: "m²" };
  }
  if (field === "constructionYear" || field === "apartmentCount") {
    const value = parseFinnishNumber(rawValue);
    return value === null ? null : { value, unit: field === "constructionYear" ? "vuosi" : undefined };
  }
  if (moneyFields.has(field)) {
    const value = monthlyFields.has(field) ? parseMonthlyAmount(rawValue || fullLine) : parseFinnishNumber(rawValue);
    return value === null ? null : { value, unit: monthlyFields.has(field) ? "€/kk" : "€" };
  }
  if (field === "landOwnership") {
    const value = normalizedText(`${rawValue} ${fullLine}`);
    if (/valinnainen|lunastettava|voi lunastaa/.test(value)) return { value: "optional_leasehold" };
    if (/vuokra/.test(value)) return { value: "leased" };
    if (/oma tontti|oma$/.test(value)) return { value: "owned" };
    return null;
  }
  return rawValue ? { value: rawValue } : null;
}

function addConflicts(findings: ListingFinding[]): void {
  const byField = new Map<NormalizedFieldKey, ListingFinding[]>();
  for (const finding of findings.filter((item) => !item.aggregate)) {
    byField.set(finding.field, [...(byField.get(finding.field) ?? []), finding]);
  }
  for (const fieldFindings of byField.values()) {
    const values = new Set(fieldFindings.map((item) => JSON.stringify(item.normalizedValue)));
    if (values.size < 2 || fieldFindings[0]?.field === "financingFeeMonthly") continue;
    for (const finding of fieldFindings) finding.conflicts.push("Samalle kentälle löytyi useita eri arvoja. Valitse oikea arvo.");
  }
}

function addCalculationConflicts(findings: ListingFinding[]): void {
  const numberFinding = (field: NormalizedFieldKey) => findings.find((finding) => finding.field === field && typeof finding.normalizedValue === "number" && (field !== "financingFeeMonthly" || finding.aggregate || findings.filter((item) => item.field === field).length === 1));
  const salePrice = numberFinding("salePrice");
  const companyLoan = numberFinding("companyLoanShare");
  const debtFreePrice = numberFinding("debtFreePrice");
  if (salePrice && companyLoan && debtFreePrice) {
    const calculated = (salePrice.normalizedValue as number) + (companyLoan.normalizedValue as number);
    if (Math.abs(calculated - (debtFreePrice.normalizedValue as number)) > 1) {
      const message = `Hintatiedot eivät täsmää. Myyntihinta ${formatEuro(salePrice.normalizedValue as number)} + yhtiölainaosuus ${formatEuro(companyLoan.normalizedValue as number)} = ${formatEuro(calculated)}, mutta ilmoitettu velaton hinta on ${formatEuro(debtFreePrice.normalizedValue as number)}.`;
      for (const finding of [salePrice, companyLoan, debtFreePrice]) finding.conflicts.push(message);
    }
  }
  const financingFee = numberFinding("financingFeeMonthly");
  if (companyLoan?.normalizedValue === 0 && financingFee && (financingFee.normalizedValue as number) > 0) {
    const message = `Yhtiölainaosuus on 0 €, mutta rahoitusvastike on ${formatMonthlyEuro(financingFee.normalizedValue as number)}. Arvoja ei muutettu automaattisesti.`;
    companyLoan.conflicts.push(message);
    financingFee.conflicts.push(message);
  }
}

const renovationTerms: ReadonlyArray<[RenovationComponent, RegExp]> = [
  ["water_pipes", /käyttövesi(?:putkien|johtojen).*uusim|käyttövesiputket/i],
  ["drains", /viemäri(?:saneeraus|en sukitus|t)/i],
  ["electrical", /sähköjärjestelm/i],
  ["bathrooms", /kylpyhuone/i],
  ["line_unspecified", /linjasaneeraus|lvis-saneeraus/i],
  ["pipe_unspecified", /putkiremontti/i],
  ["balconies", /parvekeremontti/i],
  ["element_seams", /elementtisaumaus/i],
  ["facade", /julkisivu(?:remontti|saneeraus|n kunnostus)/i],
  ["roof_coating", /katon pinnoitus/i],
  ["roof_replacement", /vesikaton uusiminen/i],
  ["roof_unspecified", /kattoremontti|kattosaneeraus|vesikaton kunnostus/i],
];

export function parseRenovations(text: string): RenovationFinding[] {
  const excerpts = text.split(/\r?\n|(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  return excerpts.flatMap((excerpt) =>
    renovationTerms
      .filter(([, pattern]) => pattern.test(excerpt))
      .map(([component]) => ({ component, ...parseTimeExpression(excerpt), sourceExcerpt: excerpt, confidence: "low" as const })),
  )
    .filter((finding, index, all) => all.findIndex((candidate) => candidate.component === finding.component && candidate.sourceExcerpt === finding.sourceExcerpt) === index);
}

export function parseListingText(text: string, source: ListingSourceType = "pasted_text"): ListingParseResult {
  const findings: ListingFinding[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const [index, line] of lines.entries()) {
    const match = findField(line);
    if (!match) continue;
    const normalized = normalizeFieldValue(match.field, match.valueText, line);
    if (!normalized) continue;
    findings.push({ id: `${match.field}-${index}`, field: match.field, fieldName: fieldDisplayNames[match.field], originalLabel: match.label || match.synonym, originalValue: match.valueText, normalizedValue: normalized.value, unit: normalized.unit, source, sourceExcerpt: line, confidence: match.confidence, conflicts: [] });
  }

  const financingParts = findings.filter((finding) => finding.field === "financingFeeMonthly" && typeof finding.normalizedValue === "number");
  if (financingParts.length > 1) {
    const breakdown = financingParts.map((part) => ({ label: part.originalLabel, value: part.normalizedValue as number, excerpt: part.sourceExcerpt }));
    findings.push({ id: "financingFeeMonthly-total", field: "financingFeeMonthly", fieldName: "Rahoitusvastikkeet yhteensä", originalLabel: "Rahoitusvastikkeiden erittely", originalValue: breakdown.map((part) => `${part.label}: ${part.value}`).join(" + "), normalizedValue: breakdown.reduce((sum, part) => sum + part.value, 0), unit: "€/kk", source, sourceExcerpt: breakdown.map((part) => part.excerpt).join(" | "), confidence: "high", conflicts: [], breakdown, aggregate: true });
  }
  addConflicts(findings);
  addCalculationConflicts(findings);
  return { source, findings, renovations: parseRenovations(text), warnings: findings.length === 0 ? ["Myynti-ilmoituksesta ei löytynyt tuettuja kenttiä."] : [] };
}

export function getListingSourceFromUrl(input: string): Exclude<ListingSourceType, "pasted_text"> | null {
  try {
    const url = new URL(input);
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = url.hostname.toLocaleLowerCase("fi");
    if (host === "etuovi.com" || host.endsWith(".etuovi.com")) return "etuovi";
    if (host === "oikotie.fi" || host.endsWith(".oikotie.fi")) return "oikotie";
    return null;
  } catch {
    return null;
  }
}
