import { parseFinnishInputNumber } from "../parser/normalization.ts";

export const ANALYSIS_NUMERIC_INPUT_CONFIG = {
  annualInterestRate: { step: 0.1, min: 0, precision: 1, fallback: 0 },
  loanTermYears: { step: 1, min: 1, precision: 0, fallback: 1 },
  equity: { step: 1_000, min: 0, precision: 0, fallback: 0 },
  collateralValue: { step: 1_000, min: 0, precision: 0, fallback: 0 },
  monthlyRent: { step: 10, min: 0, precision: 0, fallback: 0 },
  maintenanceFeeMonthly: { step: 10, min: 0, precision: 0, fallback: 0 },
  financingFeeMonthly: { step: 10, min: 0, precision: 0, fallback: 0 },
  otherCostsMonthly: { step: 10, min: 0, precision: 0, fallback: 0 },
  vacancyMonths: { step: 0.5, min: 0, max: 12, precision: 1, fallback: 0 },
  debtFreePrice: { step: 1_000, min: 0, precision: 0, fallback: 0 },
  salePrice: { step: 1_000, min: 0, precision: 0, fallback: 0 },
  renovationReserve: { step: 1_000, min: 0, precision: 0, fallback: 0 },
  transactionCosts: { step: 100, min: 0, precision: 0, fallback: 0 },
  transferTaxRate: { step: 0.1, min: 0, precision: 1, fallback: 0 },
} as const;

export type AnalysisNumericInputKey = keyof typeof ANALYSIS_NUMERIC_INPUT_CONFIG;
export type NumericStepDirection = 1 | -1;

export function stepAnalysisNumericValue(
  key: AnalysisNumericInputKey,
  draft: string,
  direction: NumericStepDirection,
  currentValue?: number,
): number {
  const config = ANALYSIS_NUMERIC_INPUT_CONFIG[key];
  const parsed = parseFinnishInputNumber(draft);
  const base = parsed ?? (Number.isFinite(currentValue) ? currentValue! : config.fallback);
  const scale = 10 ** config.precision;
  const stepUnits = Math.round(config.step * scale);
  const minimumUnits = Math.round(config.min * scale);
  const maximumUnits = "max" in config ? Math.round(config.max * scale) : Number.POSITIVE_INFINITY;
  const baseUnits = Number.isFinite(base) ? Math.round(base * scale) : Math.round(config.fallback * scale);
  const nextUnits = Math.min(maximumUnits, Math.max(minimumUnits, baseUnits + direction * stepUnits));
  const nextValue = nextUnits / scale;

  return Number.isFinite(nextValue) ? nextValue : config.fallback;
}
