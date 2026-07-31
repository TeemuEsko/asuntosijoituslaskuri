import type { EquitySource } from "./equity-assumption.ts";

export type MetricCardStatus = "positive" | "warning" | "negative" | "neutral" | "unknown";
export type MetricStatusIcon = "check" | "warning" | "error" | "info" | "unknown";
export type MetricCardKey =
  | "cashFlowAfterBankLoan"
  | "netRentalYield"
  | "grossRentalYield"
  | "equity"
  | "returnOnEquity"
  | "cashOnCashReturn"
  | "monthlyBankLoanPrincipal"
  | "collateralPosition"
  | "annualCashFlowAfterBankLoan"
  | "adjustedAcquisitionPrice";

export type MetricCardState = {
  status: MetricCardStatus;
  statusLabel: string;
  icon: MetricStatusIcon;
};

export type MetricCardContext = {
  monthlyCashFlow?: number | null;
  bankLoanAmount?: number | null;
  equitySource?: EquitySource;
};

export const METRIC_CARD_ORDER: readonly MetricCardKey[] = [
  "cashFlowAfterBankLoan",
  "netRentalYield",
  "grossRentalYield",
  "equity",
  "returnOnEquity",
  "cashOnCashReturn",
  "monthlyBankLoanPrincipal",
  "collateralPosition",
  "annualCashFlowAfterBankLoan",
  "adjustedAcquisitionPrice",
] as const;

export const METRIC_THRESHOLDS = {
  cashFlow: { positive: 100 },
  grossRentalYield: { poor: 4.5, low: 5.5, good: 6.5, strong: 8 },
  netRentalYield: { poor: 3.5, good: 6 },
  cashOnCashReturn: { good: 5 },
  returnOnEquity: { good: 8 },
  collateralShortfall: { negativeRatio: 0.1 },
} as const;

export const METRIC_CARD_STATUS_CLASSES: Record<MetricCardStatus, string> = {
  positive: "border-success/30 bg-success-soft/65",
  warning: "border-warning/30 bg-warning-soft/65",
  negative: "border-danger/25 bg-danger-soft/70",
  neutral: "border-border bg-muted/25",
  unknown: "border-border bg-muted/40",
};

export const SECONDARY_METRIC_CARD_STATUS_CLASSES: Record<MetricCardStatus, string> = {
  positive: "border-success/25 bg-success-soft/35",
  warning: "border-warning/25 bg-warning-soft/35",
  negative: "border-danger/20 bg-danger-soft/40",
  neutral: "border-border bg-muted/15",
  unknown: "border-border bg-muted/25",
};

export const METRIC_CARD_STATUS_TEXT_CLASSES: Record<MetricCardStatus, string> = {
  positive: "text-success",
  warning: "text-warning",
  negative: "text-danger",
  neutral: "text-muted-foreground",
  unknown: "text-muted-foreground",
};

const state = (status: MetricCardStatus, statusLabel: string, icon: MetricStatusIcon): MetricCardState => ({ status, statusLabel, icon });
const unknown = () => state("unknown", "Ei laskettavissa", "unknown");
const isKnown = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value);

function cashFlowState(value: number | null | undefined): MetricCardState {
  if (!isKnown(value)) return unknown();
  if (value < 0) return state("negative", "Negatiivinen", "error");
  if (value === 0) return state("warning", "Nollatasolla", "warning");
  if (value < METRIC_THRESHOLDS.cashFlow.positive) return state("warning", value < 50 ? "Pieni puskuri" : "Kohtalainen puskuri", "warning");
  return state("positive", "Vahva puskuri", "check");
}

export function metricCardState(key: MetricCardKey, value: number | null | undefined, context: MetricCardContext = {}): MetricCardState {
  if (key === "cashFlowAfterBankLoan") return cashFlowState(value);
  if (key === "annualCashFlowAfterBankLoan") return cashFlowState(context.monthlyCashFlow ?? value);
  if (key === "equity") return state("neutral", context.equitySource === "user" ? "Käyttäjän tieto" : "Oletus", "info");
  if (key === "adjustedAcquisitionPrice") return isKnown(value) ? state("neutral", "Laskettu", "info") : unknown();
  if (!isKnown(value)) return unknown();

  if (key === "grossRentalYield") {
    if (value < METRIC_THRESHOLDS.grossRentalYield.poor) return state("negative", "Heikko", "error");
    if (value < METRIC_THRESHOLDS.grossRentalYield.low) return state("warning", "Matala", "warning");
    if (value < METRIC_THRESHOLDS.grossRentalYield.good) return state("warning", "Kohtalainen", "warning");
    return state("positive", value >= METRIC_THRESHOLDS.grossRentalYield.strong ? "Vahva" : "Hyvä", "check");
  }

  if (key === "netRentalYield") {
    if (value < METRIC_THRESHOLDS.netRentalYield.poor) return state("negative", "Heikko", "error");
    if (value < METRIC_THRESHOLDS.netRentalYield.good) return state("warning", "Alle vahvan tason", "warning");
    return state("positive", "Vahva", "check");
  }

  if (key === "cashOnCashReturn" || key === "returnOnEquity") {
    if (value < 0) return state("negative", "Negatiivinen", "error");
    const target = key === "cashOnCashReturn" ? METRIC_THRESHOLDS.cashOnCashReturn.good : METRIC_THRESHOLDS.returnOnEquity.good;
    if (value < target) return state("warning", "Matala", "warning");
    return state("positive", "Vahva", "check");
  }

  if (key === "monthlyBankLoanPrincipal") {
    return value > 0 ? state("positive", "Laina lyhenee", "check") : state("neutral", "Ei kuukausilyhennystä", "info");
  }

  if (key === "collateralPosition") {
    if (value > 0) return state("positive", "Vakuuspuskuri", "check");
    if (value === 0) return state("neutral", "Tasapainossa", "info");
    const loanAmount = context.bankLoanAmount;
    const shortfallRatio = isKnown(loanAmount) && loanAmount > 0 ? Math.abs(value) / loanAmount : 1;
    return shortfallRatio >= METRIC_THRESHOLDS.collateralShortfall.negativeRatio
      ? state("negative", "Merkittävä vakuusvaje", "error")
      : state("warning", "Vakuusvaje", "warning");
  }

  return unknown();
}
