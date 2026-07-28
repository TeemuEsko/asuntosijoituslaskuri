import type { ListingFinding, ListingParseResult } from "../parser/listing-parser.ts";
import type { NormalizedFieldKey } from "../parser/synonyms.ts";

export const analysisBlockingFields = ["debtFreePrice", "maintenanceFeeMonthly", "areaSqm", "constructionYear", "buildingType", "heatingType", "currentRentMonthly"] as const satisfies readonly NormalizedFieldKey[];
export const optionalRiskFields = ["companyLoanShare", "financingFeeMonthly", "landOwnership"] as const satisfies readonly NormalizedFieldKey[];
export const metadataFields = ["housingCompanyName", "address", "streetAddress", "postalCode", "city", "district", "floor", "elevator", "energyClass", "listingTitle", "listingId"] as const satisfies readonly NormalizedFieldKey[];
export const userFinancingFields = ["ownCapital", "interestRate", "loanYears", "repaymentType", "collateralValuePct"] as const;

export type AnalysisReliability = "high" | "moderate" | "preliminary";

export function canUseFindingAutomatically(finding: ListingFinding): boolean {
  return finding.confidenceScore >= 70 && finding.validationResult === "accepted" && finding.conflicts.length === 0;
}

export function automaticValues(result: ListingParseResult): Partial<Record<NormalizedFieldKey, number | string>> {
  const values: Partial<Record<NormalizedFieldKey, number | string>> = {};
  for (const finding of result.findings) {
    if (!canUseFindingAutomatically(finding)) continue;
    if (values[finding.field] === undefined || finding.confidenceScore > (result.findings.find((item) => item.field === finding.field && item.normalizedValue === values[finding.field])?.confidenceScore ?? -1)) values[finding.field] = finding.normalizedValue;
  }
  return values;
}

export function missingAnalysisFields(values: Partial<Record<NormalizedFieldKey, number | string>>): NormalizedFieldKey[] {
  return analysisBlockingFields.filter((field) => values[field] === undefined || values[field] === "");
}

export function analysisReliability(result: ListingParseResult, values: Partial<Record<NormalizedFieldKey, number | string>>, userCompletedFields: readonly NormalizedFieldKey[] = []): AnalysisReliability {
  const missing = missingAnalysisFields(values);
  const criticalFindings = result.findings.filter((finding) => analysisBlockingFields.includes(finding.field as typeof analysisBlockingFields[number]));
  if (!missing.length && !userCompletedFields.length && criticalFindings.length >= analysisBlockingFields.length && criticalFindings.every((finding) => finding.confidence === "high" && !finding.conflicts.length)) return "high";
  if (!missing.length) return "moderate";
  return "preliminary";
}

export function debtShareStatus(values: Partial<Record<NormalizedFieldKey, number | string>>): "yes" | "no" | "unknown" {
  const debt = values.companyLoanShare; const fee = values.financingFeeMonthly;
  if ((typeof debt === "number" && debt > 0) || (typeof fee === "number" && fee > 0)) return "yes";
  if (debt === 0 && (fee === 0 || fee === undefined)) return "no";
  return "unknown";
}
