import type { NormalizedFieldKey } from "../parser/synonyms.ts";

export type AnalysisPreparationStatus =
  | "parsing_listing"
  | "normalizing_data"
  | "resolving_location"
  | "estimating_rent"
  | "running_enrichments"
  | "validating_inputs"
  | "ready"
  | "needs_user_input"
  | "failed";

export type AnalysisPreparation = {
  status: Extract<AnalysisPreparationStatus, "ready" | "needs_user_input" | "failed">;
  allAutomaticEnrichmentsCompleted: boolean;
  completedStages: AnalysisPreparationStatus[];
  missingCriticalFields: NormalizedFieldKey[];
  nextStep: "analysis" | "missing_data" | "error";
};

export function canDeterminePreparationNextStep(preparation?: AnalysisPreparation): boolean {
  return preparation?.allAutomaticEnrichmentsCompleted === true && ["ready", "needs_user_input", "failed"].includes(preparation.status);
}
