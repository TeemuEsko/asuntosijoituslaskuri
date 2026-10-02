export const NET_RENTAL_YIELD_THRESHOLDS = {
  poor: 5,
  moderate: 6.5,
  good: 8,
  excellent: 10,
} as const;

export type NetRentalYieldClassification =
  | "Heikko"
  | "Välttävä"
  | "Kohtalainen / alle tavoitetason"
  | "Hyvä"
  | "Erittäin hyvä";

export function classifyNetRentalYield(value: number): NetRentalYieldClassification | undefined {
  if (!Number.isFinite(value)) return undefined;
  if (value < NET_RENTAL_YIELD_THRESHOLDS.poor) return "Heikko";
  if (value < NET_RENTAL_YIELD_THRESHOLDS.moderate) return "Välttävä";
  if (value < NET_RENTAL_YIELD_THRESHOLDS.good) return "Kohtalainen / alle tavoitetason";
  if (value < NET_RENTAL_YIELD_THRESHOLDS.excellent) return "Hyvä";
  return "Erittäin hyvä";
}
