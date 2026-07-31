import { automaticValues, missingAnalysisFields } from "./requirements.ts";
import { housingCompanyLoanStatus } from "./housing-company-loan.ts";
import type { AnalysisPreparationStatus } from "./preparation-types.ts";
import type { ListingParseResult } from "../parser/listing-parser.ts";
import { addAutomaticRentEstimate, type RentEnrichmentOptions } from "../rent-data/enrich-listing-rent.ts";

const completedPreparationStages: AnalysisPreparationStatus[] = [
  "parsing_listing",
  "normalizing_data",
  "resolving_location",
  "estimating_rent",
  "analysing_listing_images",
  "running_enrichments",
  "validating_inputs",
];

export async function prepareListingAnalysis(parsed: ListingParseResult, options: RentEnrichmentOptions = {}): Promise<ListingParseResult> {
  const enriched = await addAutomaticRentEstimate(parsed, options);
  const values = automaticValues(enriched);
  const missingCriticalFields = missingAnalysisFields(values, enriched.rentEstimate);
  const needsUserInput = missingCriticalFields.length > 0 || housingCompanyLoanStatus(enriched.housingCompanyLoan) === "unknown";
  return {
    ...enriched,
    preparation: {
      status: needsUserInput ? "needs_user_input" : "ready",
      allAutomaticEnrichmentsCompleted: true,
      completedStages: completedPreparationStages,
      missingCriticalFields,
      nextStep: needsUserInput ? "missing_data" : "analysis",
    },
  };
}
