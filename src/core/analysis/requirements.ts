import type { ListingFinding, ListingParseResult } from "../parser/listing-parser.ts";
import type { NormalizedFieldKey } from "../parser/synonyms.ts";
import type { RentEstimate } from "../rent-data/types.ts";
import { isHeatingType } from "../domain/heating.ts";
import { resolveHousingCompanyLoan } from "./housing-company-loan.ts";

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
  if (result.rentEstimate) {
    if (typeof result.rentEstimate.effectiveMonthlyRent === "number") values.currentRentMonthly = result.rentEstimate.effectiveMonthlyRent;
    else delete values.currentRentMonthly;
  }
  return values;
}

export function hasEffectiveMonthlyRent(rent?: RentEstimate | null): boolean {
  return typeof rent?.effectiveMonthlyRent === "number" && Number.isFinite(rent.effectiveMonthlyRent) && rent.effectiveMonthlyRent > 0 && rent.confidence !== "unknown" && rent.resolutionStatus !== "pending";
}

export function missingAnalysisFields(values: Partial<Record<NormalizedFieldKey, number | string>>, rent?: RentEstimate | null): NormalizedFieldKey[] {
  return analysisBlockingFields.filter((field) => {
    if (field === "currentRentMonthly") return !hasEffectiveMonthlyRent(rent) && !(typeof values[field] === "number" && Number.isFinite(values[field]) && values[field] > 0);
    if (field === "heatingType") return !isHeatingType(values[field]);
    return values[field] === undefined || values[field] === "";
  });
}

export function analysisReliability(result: ListingParseResult, values: Partial<Record<NormalizedFieldKey, number | string>>, userCompletedFields: readonly NormalizedFieldKey[] = []): AnalysisReliability {
  const missing = missingAnalysisFields(values);
  const criticalFindings = result.findings.filter((finding) => analysisBlockingFields.includes(finding.field as typeof analysisBlockingFields[number]));
  if (!missing.length && !userCompletedFields.length && criticalFindings.length >= analysisBlockingFields.length && criticalFindings.every((finding) => finding.confidence === "high" && !finding.conflicts.length)) return "high";
  if (!missing.length) return "moderate";
  return "preliminary";
}

export function debtShareStatus(values: Partial<Record<NormalizedFieldKey, number | string>>): "yes" | "no" | "unknown" {
  const resolution = resolveHousingCompanyLoan({
    directDebtShare: typeof values.companyLoanShare === "number" ? values.companyLoanShare : undefined,
    debtFreePrice: typeof values.debtFreePrice === "number" ? values.debtFreePrice : undefined,
    salePrice: typeof values.salePrice === "number" ? values.salePrice : undefined,
    financingFeeMonthly: typeof values.financingFeeMonthly === "number" ? values.financingFeeMonthly : undefined,
  });
  if (resolution.conflicts.length || resolution.hasDebtShare === null) return "unknown";
  return resolution.hasDebtShare ? "yes" : "no";
}

export function monthlyHousingCharges(values: Partial<Record<NormalizedFieldKey, number | string>>): number | null {
  const maintenance = values.maintenanceFeeMonthly; const financing = values.financingFeeMonthly;
  if (typeof maintenance === "number" || typeof financing === "number") return (typeof maintenance === "number" ? maintenance : 0) + (typeof financing === "number" ? financing : 0);
  return typeof values.totalHousingCharge === "number" ? values.totalHousingCharge : null;
}
