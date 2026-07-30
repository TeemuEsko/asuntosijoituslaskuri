import type { EffectiveRent, RentConfidence, RentEstimate, RentRoomCategory } from "./types.ts";

export const MINIMUM_AUTOMATIC_RENT_CONFIDENCE: RentConfidence = "low";
const confidenceRank: Record<RentConfidence, number> = { unknown: 0, low: 1, medium: 2, high: 3 };

export function normalizeRoomCategory(roomDescription?: string | null, areaSqm?: number | null): RentRoomCategory {
  const value = (roomDescription ?? "").toLocaleLowerCase("fi");
  if (/yksiö|\b1\s*h\b/.test(value)) return "ONE_ROOM";
  if (/kaksio|\b2\s*h\b/.test(value)) return "TWO_ROOMS";
  if (/kolmio|\b[3-9]\d?\s*h\b|\b(?:[3-9]\d?)\s+huonetta\b/.test(value)) return "THREE_PLUS_ROOMS";
  if (typeof areaSqm === "number" && areaSqm > 0) return areaSqm < 35 ? "ONE_ROOM" : areaSqm < 60 ? "TWO_ROOMS" : "THREE_PLUS_ROOMS";
  return "UNKNOWN";
}

export function roundRentToNearestFive(value: number): number { return Math.round(value / 5) * 5; }
export function calculateEstimatedRent(rentPerSquareMeter: number, areaSqm: number): { exact: number; rounded: number } {
  const exact = Math.round((rentPerSquareMeter * areaSqm + Number.EPSILON) * 1_000) / 1_000;
  return { exact, rounded: roundRentToNearestFive(exact) };
}

export function rentDifference(effective: number, benchmark: number): { euros: number; percent: number } {
  return { euros: effective - benchmark, percent: benchmark ? (effective - benchmark) / benchmark * 100 : 0 };
}

export function isAutomaticEstimateAccepted(estimate?: RentEstimate | null, minimum: RentConfidence = MINIMUM_AUTOMATIC_RENT_CONFIDENCE): boolean {
  return Boolean(estimate?.effectiveMonthlyRent && estimate.effectiveMonthlyRent > 0 && confidenceRank[estimate.confidence] >= confidenceRank[minimum]);
}

export function resolveEffectiveRent({ userRent, userOverridden = false, leaseRent, listingRent, statisticsEstimate, marketEstimate }: { userRent?: number | null; userOverridden?: boolean; leaseRent?: number | null; listingRent?: number | null; statisticsEstimate?: RentEstimate | null; marketEstimate?: RentEstimate | null }): EffectiveRent {
  const automatic: RentEstimate | null = leaseRent && leaseRent > 0 ? { effectiveMonthlyRent: leaseRent, source: "lease", confidence: "high", sourceName: "Vuokrasopimus", userOverridden: false, resolutionStatus: "resolved", attemptedSources: ["lease"] } : listingRent && listingRent > 0 ? { effectiveMonthlyRent: listingRent, source: "listing", confidence: "high", sourceName: "Myynti-ilmoitus", userOverridden: false, resolutionStatus: "resolved", attemptedSources: ["listing", "statistics_finland"] } : isAutomaticEstimateAccepted(statisticsEstimate) ? statisticsEstimate! : isAutomaticEstimateAccepted(marketEstimate) ? marketEstimate! : null;
  if (userOverridden && userRent && userRent > 0) return { effectiveRent: userRent, automaticEstimate: automatic, estimate: { effectiveMonthlyRent: userRent, source: "user", confidence: "high", sourceName: "Käyttäjän määrittämä vuokra", userOverridden: true, previousAutomaticEstimate: automatic?.effectiveMonthlyRent ?? null, resolutionStatus: "resolved", attemptedSources: ["user"] } };
  if (automatic?.source === "lease" || automatic?.source === "listing") return { effectiveRent: automatic.effectiveMonthlyRent, automaticEstimate: statisticsEstimate ?? automatic, estimate: { ...automatic, userOverridden: false, previousAutomaticEstimate: statisticsEstimate?.effectiveMonthlyRent ?? null, benchmark: statisticsEstimate ?? null } };
  if (automatic) return { effectiveRent: automatic.effectiveMonthlyRent, automaticEstimate: automatic, estimate: { ...automatic, userOverridden: false, resolutionStatus: "resolved" } };
  const failedEstimate = statisticsEstimate ?? marketEstimate;
  return { effectiveRent: null, automaticEstimate: null, estimate: { effectiveMonthlyRent: null, source: "unknown", confidence: "unknown", userOverridden: false, resolutionStatus: "unavailable", attemptedSources: failedEstimate?.attemptedSources ?? ["statistics_finland", "market_data"], issues: failedEstimate?.issues, warning: failedEstimate?.warning ?? "Vuokra-arviota ei voitu muodostaa luotettavasti." }, warning: failedEstimate?.warning ?? "Vuokra-arviota ei voitu muodostaa luotettavasti." };
}

export function restoreAutomaticRent(current: RentEstimate, automatic: RentEstimate | null): RentEstimate {
  return automatic ? { ...automatic, userOverridden: false } : { ...current, effectiveMonthlyRent: null, source: "unknown", confidence: "unknown", userOverridden: false, resolutionStatus: "unavailable" };
}
