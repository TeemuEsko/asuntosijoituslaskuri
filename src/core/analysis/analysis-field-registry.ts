import type { ListingParseResult } from "../parser/listing-parser.ts";
import { ANALYSIS_FIELD_REGISTRY, type NormalizedFieldKey } from "../parser/synonyms.ts";

export type AnalysisFieldId = (typeof ANALYSIS_FIELD_REGISTRY)[number]["key"];
export type AnalysisFieldCount = {
  found: number;
  total: number;
  foundIds: Set<AnalysisFieldId>;
  relevantIds: Set<AnalysisFieldId>;
};

function acceptedCanonicalValues(result: ListingParseResult): Map<NormalizedFieldKey, number | string> {
  const values = new Map<NormalizedFieldKey, number | string>();
  for (const finding of result.findings) {
    if (finding.validationResult !== "accepted" || finding.conflicts.length > 0) continue;
    if (!values.has(finding.field)) values.set(finding.field, finding.normalizedValue);
  }
  return values;
}

function isRelevant(
  id: AnalysisFieldId,
  values: ReadonlyMap<NormalizedFieldKey, number | string>,
  result: ListingParseResult,
): boolean {
  const buildingType = values.get("buildingType");
  const landOwnership = values.get("landOwnership");
  if (id === "financingFeeMonthly") return result.housingCompanyLoan?.hasDebtShare !== false;
  if (id === "plotFeeMonthly") return landOwnership !== "owned";
  if (id === "floor" || id === "elevator") {
    return buildingType !== "terraced" && buildingType !== "semi_detached" && buildingType !== "detached";
  }
  return true;
}

export function assertAnalysisFieldCountInvariant(
  foundIds: ReadonlySet<AnalysisFieldId>,
  relevantIds: ReadonlySet<AnalysisFieldId>,
  environment = process.env.NODE_ENV,
): boolean {
  const valid = foundIds.size <= relevantIds.size && [...foundIds].every((id) => relevantIds.has(id));
  if (!valid && environment === "development") throw new Error("Analysis field count invariant violated");
  return valid;
}

/** Löydettyjen ja kaikkien kenttien määrä muodostetaan aina samasta rekisteristä. */
export function countAnalysisFields(result: ListingParseResult): AnalysisFieldCount {
  const values = acceptedCanonicalValues(result);
  const relevantIds = new Set<AnalysisFieldId>(
    ANALYSIS_FIELD_REGISTRY
      .filter((field) => isRelevant(field.key, values, result))
      .map((field) => field.key),
  );
  const foundIds = new Set<AnalysisFieldId>();

  for (const field of ANALYSIS_FIELD_REGISTRY) {
    if (!relevantIds.has(field.key)) continue;
    if (field.key === "completedRenovations") {
      if (result.renovations.some((renovation) => renovation.status === "completed" || renovation.status === "ongoing")) foundIds.add(field.key);
      continue;
    }
    if (field.key === "futureRenovations") {
      if (result.renovations.some((renovation) => ["decided", "planned", "estimated", "proposed", "under_investigation"].includes(renovation.status))) foundIds.add(field.key);
      continue;
    }
    if (values.has(field.key)) foundIds.add(field.key);
  }

  assertAnalysisFieldCountInvariant(foundIds, relevantIds);
  return { found: foundIds.size, total: relevantIds.size, foundIds, relevantIds };
}
