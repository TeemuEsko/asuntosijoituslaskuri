import { synchronizePrices, type PrimaryPriceField, type SynchronizedPrices } from "../calculations/purchase-price.ts";
import type { FieldStatus } from "../domain/field.ts";
import type { NormalizedFieldKey } from "../parser/synonyms.ts";
import { mergeDocumentAnalysis, validateDocumentCanonicalConsistency } from "./merge.ts";
import type { DocumentAnalysisResult, DocumentCanonicalState, DocumentFieldProvenance } from "./types.ts";

export type DocumentWorkspacePurchase = SynchronizedPrices & {
  financingFeeMonthly: number;
  renovationReserve: number;
};

export type DocumentWorkspacePurchaseStatuses = Record<
  "debtFreePrice" | "salePrice" | "companyLoanShare" | "financingFeeMonthly" | "renovationReserve",
  FieldStatus
>;

export type DocumentWorkspaceFinancialState = {
  canonical: DocumentCanonicalState;
  purchase: DocumentWorkspacePurchase;
  purchaseStatuses: DocumentWorkspacePurchaseStatuses;
  maintenanceFeeMonthly: number;
  maintenanceFeeStatus: FieldStatus;
  otherCostsMonthly: number;
  otherCostsStatus: FieldStatus;
  otherCostsUserOverride: boolean;
  lastEditedPriceField: PrimaryPriceField;
};

function calculatedProvenance(): DocumentFieldProvenance {
  return {
    source: { kind: "calculation", label: "Automaattinen arvio" },
    status: "inferred",
    sourceLabel: "Automaattinen arvio",
  };
}

export function documentOtherCostsMonthly(
  values: DocumentCanonicalState["values"],
): number {
  const otherMonthlyFees = typeof values.otherMonthlyFees === "number" ? values.otherMonthlyFees : 0;
  const plotFeeMonthly = typeof values.plotFeeMonthly === "number" ? values.plotFeeMonthly : 0;
  return otherMonthlyFees + plotFeeMonthly;
}

/**
 * Ristiriidan vuoksi tarkistettavaksi merkitty asiakirja-arvo kuuluu edelleen
 * canonical-tilaan. Vain aidosti lähteetön puuttuva arvo jätetään pois.
 */
export function shouldOmitCanonicalFinancialValue(
  status: FieldStatus,
  provenance?: DocumentFieldProvenance,
): boolean {
  return (status === "missing" || status === "unknown") && provenance === undefined;
}

/**
 * Sama puhdas tilamuunnos palvelee käyttöliittymää ja integraatiotestejä.
 * Laskentamoottoria ei kopioida tänne; tulos päivittää ainoastaan sen canonical
 * lähtötiedot ja lähdestatukset.
 */
export function applyDocumentAnalysisToWorkspaceState(
  current: DocumentWorkspaceFinancialState,
  analysis: DocumentAnalysisResult,
): DocumentWorkspaceFinancialState & {
  appliedFields: NormalizedFieldKey[];
  consistencyWarnings: string[];
} {
  const consistency = validateDocumentCanonicalConsistency(
    mergeDocumentAnalysis(current.canonical, analysis),
  );
  const merged = consistency.state;
  const activeFromDocument = (field: NormalizedFieldKey) =>
    merged.provenance[field]?.source.documentId === analysis.documentId;
  const maintenanceWasApplied = activeFromDocument("maintenanceFeeMonthly") && typeof merged.values.maintenanceFeeMonthly === "number";
  const financingWasApplied = activeFromDocument("financingFeeMonthly") && typeof merged.values.financingFeeMonthly === "number";
  const companyLoanWasApplied = activeFromDocument("companyLoanShare") && typeof merged.values.companyLoanShare === "number";
  const otherCostsWereApplied = (activeFromDocument("otherMonthlyFees") && typeof merged.values.otherMonthlyFees === "number") || (activeFromDocument("plotFeeMonthly") && typeof merged.values.plotFeeMonthly === "number");

  const synchronizedPurchase = companyLoanWasApplied
    ? {
        ...current.purchase,
        ...synchronizePrices(
          current.purchase,
          "companyLoanShare",
          merged.values.companyLoanShare as number,
          current.lastEditedPriceField,
        ),
      }
    : current.purchase;
  const purchase = financingWasApplied
    ? { ...synchronizedPurchase, financingFeeMonthly: merged.values.financingFeeMonthly as number }
    : synchronizedPurchase;
  const provenance = { ...merged.provenance };
  const purchaseStatuses = { ...current.purchaseStatuses };

  if (companyLoanWasApplied) {
    const synchronizedField: "debtFreePrice" | "salePrice" = current.lastEditedPriceField === "debtFreePrice" ? "salePrice" : "debtFreePrice";
    provenance[synchronizedField] = calculatedProvenance();
    purchaseStatuses.companyLoanShare = consistency.fieldsNeedingReview.includes("companyLoanShare") ? "unknown" : "document";
    purchaseStatuses[synchronizedField] = "inferred";
  }
  if (financingWasApplied) purchaseStatuses.financingFeeMonthly = "document";

  const appliedFields = analysis.fields
    .map((field) => field.field)
    .filter((field) => activeFromDocument(field));
  const canonical = { ...merged, provenance };
  const mayUpdateOtherCosts = otherCostsWereApplied && !current.otherCostsUserOverride;

  return {
    canonical,
    purchase,
    purchaseStatuses,
    maintenanceFeeMonthly: maintenanceWasApplied ? merged.values.maintenanceFeeMonthly as number : current.maintenanceFeeMonthly,
    maintenanceFeeStatus: maintenanceWasApplied ? "document" : current.maintenanceFeeStatus,
    otherCostsMonthly: mayUpdateOtherCosts ? documentOtherCostsMonthly(merged.values) : current.otherCostsMonthly,
    otherCostsStatus: mayUpdateOtherCosts && current.otherCostsStatus !== "user" ? "document" : current.otherCostsStatus,
    otherCostsUserOverride: current.otherCostsUserOverride,
    lastEditedPriceField: current.lastEditedPriceField,
    appliedFields,
    consistencyWarnings: consistency.warnings,
  };
}
