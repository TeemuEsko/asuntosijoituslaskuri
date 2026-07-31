import type { RentCandidateContext } from "../rent-data/rent-candidate-parser.ts";
import type { RentValidationStatus, RentValidationWarning, RentValueSource } from "../rent-data/types.ts";

export const MIN_MONTHLY_RENT_EUR = 100;
export const MAX_MONTHLY_RENT_EUR = 10_000;
export const MIN_RENT_PER_SQUARE_METER = 2;
export const MAX_RENT_PER_SQUARE_METER = 50;
export const MAX_RENT_BENCHMARK_DEVIATION_PERCENT = 50;

export type RentValidationInput = {
  monthlyRent?: number | null;
  rentPerSquareMeter?: number | null;
  areaSqm?: number | null;
  benchmarkMonthlyRent?: number | null;
  benchmarkRentPerSquareMeter?: number | null;
  source: RentValueSource;
  context?: RentCandidateContext;
  unit?: "€/kk" | "€/m²/kk" | "unknown";
};

export type RentValidationResult = {
  valid: boolean;
  status: RentValidationStatus;
  monthlyRent: number | null;
  rentPerSquareMeter: number | null;
  expectedMonthlyRent: number | null;
  differencePercent: number | null;
  warnings: RentValidationWarning[];
};

function warning(id: RentValidationWarning["id"], message: string, input: RentValidationInput, expectedMonthlyRent: number | null = null, differencePercent: number | null = null): RentValidationWarning {
  return { id, message, source: input.source, candidateValue: input.monthlyRent ?? null, expectedValue: expectedMonthlyRent, differencePercent, context: input.context ?? "ambiguous", reason: id };
}

export function validateRentEstimate(input: RentValidationInput): RentValidationResult {
  const monthlyRent = typeof input.monthlyRent === "number" && Number.isFinite(input.monthlyRent) ? input.monthlyRent : null;
  const suppliedSquareRent = typeof input.rentPerSquareMeter === "number" && Number.isFinite(input.rentPerSquareMeter) ? input.rentPerSquareMeter : null;
  const calculatedSquareRent = monthlyRent !== null && typeof input.areaSqm === "number" && input.areaSqm > 0 ? monthlyRent / input.areaSqm : null;
  const rentPerSquareMeter = suppliedSquareRent ?? calculatedSquareRent;
  const expectedMonthlyRent = typeof input.benchmarkMonthlyRent === "number" && input.benchmarkMonthlyRent > 0
    ? input.benchmarkMonthlyRent
    : typeof input.benchmarkRentPerSquareMeter === "number" && input.benchmarkRentPerSquareMeter > 0 && typeof input.areaSqm === "number" && input.areaSqm > 0
      ? input.benchmarkRentPerSquareMeter * input.areaSqm
      : null;
  const warnings: RentValidationWarning[] = [];
  const differencePercent = monthlyRent !== null && expectedMonthlyRent ? Math.abs(monthlyRent - expectedMonthlyRent) / expectedMonthlyRent * 100 : null;

  if (monthlyRent === null || monthlyRent < MIN_MONTHLY_RENT_EUR || monthlyRent > MAX_MONTHLY_RENT_EUR) {
    warnings.push(warning("monthly_rent_out_of_bounds", `Kuukausivuokran on oltava ${MIN_MONTHLY_RENT_EUR}–${MAX_MONTHLY_RENT_EUR} euroa.`, input, expectedMonthlyRent, differencePercent));
    return { valid: false, status: "invalid", monthlyRent, rentPerSquareMeter, expectedMonthlyRent, differencePercent, warnings };
  }
  if (input.unit && input.unit !== "€/kk") {
    warnings.push(warning("invalid_rent_unit", "Kuukausivuokran ehdokkaalla ei ollut yksikköä €/kk.", input, expectedMonthlyRent));
    return { valid: false, status: "invalid", monthlyRent, rentPerSquareMeter, expectedMonthlyRent, differencePercent: null, warnings };
  }
  if (input.context === "separate_cost") {
    warnings.push(warning("separate_cost_not_rent", "Arvo kuuluu erillismaksuun eikä asunnon kuukausivuokraan.", input, expectedMonthlyRent));
    return { valid: false, status: "invalid", monthlyRent, rentPerSquareMeter, expectedMonthlyRent, differencePercent: null, warnings };
  }
  if (rentPerSquareMeter !== null && (rentPerSquareMeter < MIN_RENT_PER_SQUARE_METER || rentPerSquareMeter > MAX_RENT_PER_SQUARE_METER)) {
    warnings.push(warning("square_meter_rent_out_of_bounds", `Neliövuokran on oltava ${MIN_RENT_PER_SQUARE_METER}–${MAX_RENT_PER_SQUARE_METER} €/m²/kk.`, input, expectedMonthlyRent));
    return { valid: false, status: "invalid", monthlyRent, rentPerSquareMeter, expectedMonthlyRent, differencePercent: null, warnings };
  }

  if (differencePercent !== null && Math.abs(differencePercent) >= MAX_RENT_BENCHMARK_DEVIATION_PERCENT) {
    const strongContext = input.source === "user" || input.context === "lease" || input.context === "listing_explicit";
    warnings.push(warning("benchmark_deviation", `Vuokra poikkeaa alueellisesta vertailuarviosta ${Math.abs(differencePercent).toFixed(1)} %.`, input, expectedMonthlyRent, differencePercent));
    if (!strongContext) return { valid: false, status: "invalid", monthlyRent, rentPerSquareMeter, expectedMonthlyRent, differencePercent, warnings };
    return { valid: true, status: "warning", monthlyRent, rentPerSquareMeter, expectedMonthlyRent, differencePercent, warnings };
  }

  return { valid: true, status: "valid", monthlyRent, rentPerSquareMeter, expectedMonthlyRent, differencePercent, warnings };
}
