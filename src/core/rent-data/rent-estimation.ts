import { validateRentEstimate } from "../financial-sanity-checks/rent.ts";
import type { RentCandidateContext } from "./rent-candidate-parser.ts";
import type { EffectiveRent, RentConfidence, RentEstimate, RentRoomCategory, RentValidationWarning, RentValueSource } from "./types.ts";

export const MINIMUM_AUTOMATIC_RENT_CONFIDENCE: RentConfidence = "low";
const confidenceRank: Record<RentConfidence, number> = { unknown: 0, low: 1, medium: 2, high: 3 };
const rejectedListingMessage = "Ilmoituksesta löydetty vuokra-arvo ei ollut yksiselitteinen, joten analyysissä käytetään alueellista markkinavuokra-arviota.";

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
  if (!estimate || estimate.validationStatus === "invalid" || confidenceRank[estimate.confidence] < confidenceRank[minimum]) return false;
  return validateRentEstimate({
    monthlyRent: estimate.effectiveMonthlyRent,
    rentPerSquareMeter: estimate.rentPerSquareMeter,
    areaSqm: estimate.livingArea,
    source: estimate.source,
    context: estimate.source === "lease" ? "lease" : "listing_explicit",
    unit: "€/kk",
  }).valid;
}

type ResolveEffectiveRentInput = {
  userRent?: number | null;
  userOverridden?: boolean;
  leaseRent?: number | null;
  listingRent?: number | null;
  listingRentContext?: RentCandidateContext;
  listingRentUnit?: "€/kk" | "€/m²/kk" | "unknown";
  areaSqm?: number | null;
  statisticsEstimate?: RentEstimate | null;
  marketEstimate?: RentEstimate | null;
};

function mergeWarningText(...messages: Array<string | null | undefined>): string | null {
  const unique = [...new Set(messages.filter((message): message is string => Boolean(message)))];
  return unique.length ? unique.join(" ") : null;
}

function benchmarkValues(statisticsEstimate?: RentEstimate | null, marketEstimate?: RentEstimate | null) {
  const benchmark = isAutomaticEstimateAccepted(statisticsEstimate) ? statisticsEstimate! : isAutomaticEstimateAccepted(marketEstimate) ? marketEstimate! : null;
  return {
    benchmark,
    monthly: benchmark?.effectiveMonthlyRent ?? null,
    perSquareMeter: benchmark?.benchmarkRentPerSquareMeter ?? benchmark?.rentPerSquareMeter ?? null,
  };
}

function candidateEstimate(
  monthlyRent: number | null | undefined,
  source: Extract<RentValueSource, "lease" | "listing">,
  context: RentCandidateContext,
  unit: "€/kk" | "€/m²/kk" | "unknown",
  areaSqm: number | null | undefined,
  benchmarkMonthlyRent: number | null,
  benchmarkRentPerSquareMeter: number | null,
  listingMonthlyRent: number | null,
): { estimate: RentEstimate | null; warnings: RentValidationWarning[] } {
  if (typeof monthlyRent !== "number") return { estimate: null, warnings: [] };
  const validation = validateRentEstimate({ monthlyRent, areaSqm, benchmarkMonthlyRent, benchmarkRentPerSquareMeter, source, context, unit });
  if (!validation.valid) return { estimate: null, warnings: validation.warnings };
  const warning = validation.status === "warning" ? validation.warnings.map((item) => item.message).join(" ") : null;
  return {
    estimate: {
      effectiveMonthlyRent: monthlyRent,
      listingMonthlyRent,
      automaticMonthlyRentEstimate: benchmarkMonthlyRent,
      benchmarkRentPerSquareMeter,
      source,
      confidence: "high",
      sourceName: source === "lease" ? "Vuokrasopimus" : "Myynti-ilmoitus",
      userOverridden: false,
      resolutionStatus: "resolved",
      attemptedSources: source === "lease" ? ["lease"] : ["listing", "statistics_finland"],
      validationStatus: validation.status,
      validationWarnings: validation.warnings,
      warning,
    },
    warnings: validation.warnings,
  };
}

export function resolveEffectiveRent({
  userRent,
  userOverridden = false,
  leaseRent,
  listingRent,
  listingRentContext = "listing_explicit",
  listingRentUnit = "€/kk",
  areaSqm,
  statisticsEstimate,
  marketEstimate,
}: ResolveEffectiveRentInput): EffectiveRent {
  const benchmarkData = benchmarkValues(statisticsEstimate, marketEstimate);
  const listingMonthlyRent = typeof listingRent === "number" ? listingRent : null;
  const lease = candidateEstimate(leaseRent, "lease", "lease", "€/kk", areaSqm, benchmarkData.monthly, benchmarkData.perSquareMeter, listingMonthlyRent);
  const listing = candidateEstimate(listingRent, "listing", listingRentContext, listingRentUnit, areaSqm, benchmarkData.monthly, benchmarkData.perSquareMeter, listingMonthlyRent);
  const acceptedListingMonthlyRent = lease.estimate || listing.estimate ? listingMonthlyRent : null;
  const sourceEstimate = lease.estimate ?? listing.estimate ?? benchmarkData.benchmark;
  const automaticEstimate = sourceEstimate?.source === "lease" || sourceEstimate?.source === "listing" ? benchmarkData.benchmark ?? sourceEstimate : sourceEstimate;

  if (userOverridden && typeof userRent === "number") {
    const validation = validateRentEstimate({ monthlyRent: userRent, areaSqm, benchmarkMonthlyRent: benchmarkData.monthly, benchmarkRentPerSquareMeter: benchmarkData.perSquareMeter, source: "user", context: "listing_explicit", unit: "€/kk" });
    if (validation.valid) {
      const estimate: RentEstimate = {
        effectiveMonthlyRent: userRent,
        listingMonthlyRent: acceptedListingMonthlyRent,
        automaticMonthlyRentEstimate: automaticEstimate?.effectiveMonthlyRent ?? null,
        benchmarkRentPerSquareMeter: benchmarkData.perSquareMeter,
        source: "user",
        confidence: "high",
        sourceName: "Käyttäjän määrittämä vuokra",
        userOverridden: true,
        previousAutomaticEstimate: sourceEstimate?.effectiveMonthlyRent ?? null,
        benchmark: benchmarkData.benchmark,
        resolutionStatus: "resolved",
        attemptedSources: ["user"],
        validationStatus: validation.status,
        validationWarnings: validation.warnings,
        warning: validation.status === "warning" ? validation.warnings.map((item) => item.message).join(" ") : null,
      };
      return { effectiveRent: userRent, automaticEstimate, estimate, warning: estimate.warning ?? undefined };
    }
  }

  const rejectedListingWarnings = listingRent !== null && !listing.estimate ? listing.warnings : [];
  const rejectedLeaseWarnings = typeof leaseRent === "number" && !lease.estimate ? lease.warnings : [];
  const rejectedWarnings = [...rejectedLeaseWarnings, ...rejectedListingWarnings];
  if (sourceEstimate) {
    const usesListingOrLease = sourceEstimate.source === "lease" || sourceEstimate.source === "listing";
    const invalidListingWarning: RentValidationWarning[] = rejectedListingWarnings.length ? [{ id: "invalid-listing-rent", message: rejectedListingMessage, source: "listing", candidateValue: listingMonthlyRent, expectedValue: benchmarkData.monthly, differencePercent: rejectedListingWarnings.find((item) => item.differencePercent !== null)?.differencePercent ?? null, context: listingRentContext, reason: "implausible_monthly_rent", fallbackUsed: sourceEstimate.source }] : [];
    const validationWarnings = [...(sourceEstimate.validationWarnings ?? []), ...rejectedWarnings, ...invalidListingWarning];
    const warning = mergeWarningText(rejectedListingWarnings.length ? rejectedListingMessage : null, sourceEstimate.warning, usesListingOrLease && sourceEstimate.validationStatus === "warning" ? sourceEstimate.warning : null);
    const estimate: RentEstimate = {
      ...sourceEstimate,
      effectiveMonthlyRent: sourceEstimate.effectiveMonthlyRent,
      listingMonthlyRent: acceptedListingMonthlyRent,
      automaticMonthlyRentEstimate: benchmarkData.monthly ?? sourceEstimate.effectiveMonthlyRent,
      benchmarkRentPerSquareMeter: benchmarkData.perSquareMeter,
      previousAutomaticEstimate: usesListingOrLease ? benchmarkData.monthly : sourceEstimate.previousAutomaticEstimate,
      benchmark: usesListingOrLease ? benchmarkData.benchmark : sourceEstimate.benchmark,
      userOverridden: false,
      resolutionStatus: "resolved",
      validationStatus: validationWarnings.length ? "warning" : sourceEstimate.validationStatus ?? "valid",
      validationWarnings,
      warning,
    };
    return { effectiveRent: estimate.effectiveMonthlyRent, automaticEstimate, estimate, warning: warning ?? undefined };
  }

  const failedEstimate = statisticsEstimate ?? marketEstimate;
  const warning = mergeWarningText(rejectedListingWarnings.length ? rejectedListingMessage : null, failedEstimate?.warning, "Vuokra-arviota ei voitu muodostaa luotettavasti.");
  return {
    effectiveRent: null,
    automaticEstimate: null,
    estimate: {
      effectiveMonthlyRent: null,
      automaticMonthlyRentEstimate: null,
      listingMonthlyRent: null,
      benchmarkRentPerSquareMeter: benchmarkData.perSquareMeter,
      source: "unknown",
      confidence: "unknown",
      userOverridden: false,
      resolutionStatus: "unavailable",
      attemptedSources: failedEstimate?.attemptedSources ?? ["statistics_finland", "market_data"],
      issues: failedEstimate?.issues,
      warning,
      validationStatus: rejectedWarnings.length ? "invalid" : "unknown",
      validationWarnings: rejectedWarnings,
    },
    warning: warning ?? undefined,
  };
}

export function restoreAutomaticRent(current: RentEstimate, automatic: RentEstimate | null): RentEstimate {
  return automatic ? { ...automatic, userOverridden: false } : { ...current, effectiveMonthlyRent: null, source: "unknown", confidence: "unknown", userOverridden: false, resolutionStatus: "unavailable" };
}
