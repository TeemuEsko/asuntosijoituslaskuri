import type { EffectiveRent, RentConfidence, RentEstimate, RentRoomCategory } from "./types.ts";

export const MINIMUM_AUTOMATIC_RENT_CONFIDENCE: RentConfidence = "low";
const confidenceRank: Record<RentConfidence, number> = { unknown: 0, low: 1, medium: 2, high: 3 };

export function normalizeRoomCategory(roomDescription?: string | null, areaSqm?: number | null): RentRoomCategory {
  const value = (roomDescription ?? "").toLocaleLowerCase("fi");
  if (/yksiö|\b1\s*h\b/.test(value)) return "ONE_ROOM";
  if (/kaksio|\b2\s*h\b/.test(value)) return "TWO_ROOMS";
  if (/kolmio|\b[3-9]\d?\s*h\b/.test(value)) return "THREE_PLUS_ROOMS";
  if (typeof areaSqm === "number" && areaSqm > 0) return areaSqm < 35 ? "ONE_ROOM" : areaSqm < 60 ? "TWO_ROOMS" : "THREE_PLUS_ROOMS";
  return "UNKNOWN";
}

export function roundRentToNearestFive(value: number): number { return Math.round(value / 5) * 5; }
export function calculateEstimatedRent(rentPerSquareMeter: number, areaSqm: number): { exact: number; rounded: number } {
  const exact = rentPerSquareMeter * areaSqm;
  return { exact, rounded: roundRentToNearestFive(exact) };
}

export function rentDifference(effective: number, benchmark: number): { euros: number; percent: number } {
  return { euros: effective - benchmark, percent: benchmark ? (effective - benchmark) / benchmark * 100 : 0 };
}

export function isAutomaticEstimateAccepted(estimate?: RentEstimate | null, minimum: RentConfidence = MINIMUM_AUTOMATIC_RENT_CONFIDENCE): boolean {
  return Boolean(estimate?.monthlyRent && estimate.monthlyRent > 0 && confidenceRank[estimate.confidence] >= confidenceRank[minimum]);
}

export function resolveEffectiveRent({ userRent, userOverridden = false, leaseRent, listingRent, statisticsEstimate, marketEstimate }: { userRent?: number | null; userOverridden?: boolean; leaseRent?: number | null; listingRent?: number | null; statisticsEstimate?: RentEstimate | null; marketEstimate?: RentEstimate | null }): EffectiveRent {
  const automatic = leaseRent && leaseRent > 0 ? { monthlyRent: leaseRent, source: "lease" as const, confidence: "high" as const, sourceName: "Vuokrasopimus", userOverridden: false } : listingRent && listingRent > 0 ? { monthlyRent: listingRent, source: "listing" as const, confidence: "high" as const, sourceName: "Myynti-ilmoitus", userOverridden: false } : isAutomaticEstimateAccepted(statisticsEstimate) ? statisticsEstimate! : isAutomaticEstimateAccepted(marketEstimate) ? marketEstimate! : null;
  if (userOverridden && userRent && userRent > 0) return { effectiveRent: userRent, automaticEstimate: automatic, estimate: { monthlyRent: userRent, source: "user", confidence: "high", sourceName: "Käyttäjän määrittämä vuokra", userOverridden: true, previousAutomaticEstimate: automatic?.monthlyRent ?? null } };
  if (automatic?.source === "lease" || automatic?.source === "listing") return { effectiveRent: automatic.monthlyRent, automaticEstimate: statisticsEstimate ?? automatic, estimate: { ...automatic, userOverridden: false, previousAutomaticEstimate: statisticsEstimate?.monthlyRent ?? null } };
  if (automatic) return { effectiveRent: automatic.monthlyRent, automaticEstimate: automatic, estimate: { ...automatic, userOverridden: false } };
  return { effectiveRent: null, automaticEstimate: null, estimate: { monthlyRent: null, source: "unknown", confidence: "unknown", userOverridden: false, warning: "Vuokra-arviota ei voitu muodostaa luotettavasti." }, warning: "Vuokra-arviota ei voitu muodostaa luotettavasti." };
}

export function restoreAutomaticRent(current: RentEstimate, automatic: RentEstimate | null): RentEstimate {
  return automatic ? { ...automatic, userOverridden: false } : { ...current, monthlyRent: null, source: "unknown", confidence: "unknown", userOverridden: false };
}
