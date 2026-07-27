import type { PropertyModel } from "../domain/property";
import type { RuleResult } from "../rules/types";

export type ExplanationRequest = {
  property: PropertyModel;
  ruleResults: RuleResult[];
};

export interface AnalysisExplainer {
  explain(request: ExplanationRequest): Promise<string>;
}
