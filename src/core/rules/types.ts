import type { PropertyModel } from "../domain/property";

export type RuleStatus =
  | "not_detected"
  | "detected"
  | "unchecked"
  | "not_applicable"
  | "data_conflict";

export type RuleSeverity = "info" | "low" | "medium" | "high" | "critical";

export type RuleEvidence = {
  fieldPath?: string;
  sourceLabel?: string;
  detail?: string;
};

export type RuleResult = {
  ruleId: string;
  status: RuleStatus;
  severity: RuleSeverity;
  title: string;
  message: string;
  evidence: RuleEvidence[];
};

export type PropertyRule = {
  id: string;
  evaluate(property: PropertyModel): RuleResult;
};
