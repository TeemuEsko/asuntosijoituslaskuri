import {
  calculateAcquisitionFinancing,
  calculateInvestmentAnalysis,
  type InvestmentAnalysisInput,
  type InvestmentAnalysisResult,
} from "./investment-analysis.ts";

export type OfferPriceMode = "monthly_cash_flow" | "net_rental_yield";

export type OfferPriceTarget = {
  mode: OfferPriceMode;
  value: number;
};

export type OfferPriceResult = {
  status: "success" | "insufficient_data" | "unattainable" | "unbounded";
  reason?: string;
  maximumSalePrice?: number;
  simulatedDebtFreePrice?: number;
  currentSalePrice?: number;
  differenceEuro?: number;
  differencePercent?: number;
  cashFlowAfterLoan?: number;
  netRentalYield?: number;
  bankLoanAmount?: number;
  financingGap?: number;
  evaluatedScenarios: number;
  verified: boolean;
};

type Scenario = {
  salePrice: number;
  analysis: InvestmentAnalysisResult;
  metric?: number;
};

const OFFER_PRICE_STEP = 100;
const ABSOLUTE_SEARCH_LIMIT = 50_000_000;

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function metricFor(analysis: InvestmentAnalysisResult, mode: OfferPriceMode) {
  return mode === "monthly_cash_flow"
    ? analysis.cashFlowAfterBankLoan
    : analysis.netRentalYield;
}

function resultFromScenario(
  scenario: Scenario,
  input: InvestmentAnalysisInput,
  evaluatedScenarios: number,
  verified: boolean,
): OfferPriceResult {
  const currentSalePrice = input.salePrice!;
  const differenceEuro = scenario.salePrice - currentSalePrice;
  return {
    status: "success",
    maximumSalePrice: scenario.salePrice,
    simulatedDebtFreePrice: scenario.salePrice + (input.companyLoanShare ?? 0),
    currentSalePrice,
    differenceEuro,
    differencePercent:
      currentSalePrice > 0 ? (differenceEuro / currentSalePrice) * 100 : undefined,
    cashFlowAfterLoan: scenario.analysis.cashFlowAfterBankLoan,
    netRentalYield: scenario.analysis.netRentalYield,
    bankLoanAmount: scenario.analysis.bankLoanAmount,
    financingGap: scenario.analysis.financingGap,
    evaluatedScenarios,
    verified,
  };
}

/** Finds the highest sale price that reaches one target using the canonical engine. */
export function simulateMaximumOfferPrice(
  input: InvestmentAnalysisInput,
  target: OfferPriceTarget,
): OfferPriceResult {
  if (
    !isNonNegativeFinite(input.salePrice) ||
    !isNonNegativeFinite(input.companyLoanShare) ||
    !isNonNegativeFinite(input.equity) ||
    !Number.isFinite(target.value) ||
    (target.mode === "net_rental_yield" && target.value < 0)
  ) {
    return {
      status: "insufficient_data",
      reason:
        "Tarjoushinnan laskeminen vaatii myyntihinnan, yhtiölainaosuuden, oman pääoman ja kelvollisen tavoitteen.",
      evaluatedScenarios: 0,
      verified: false,
    };
  }

  let evaluatedScenarios = 0;
  const evaluate = (salePrice: number): Scenario => {
    const safeSalePrice = Math.max(0, salePrice);
    const debtFreePrice = safeSalePrice + input.companyLoanShare!;
    const transferTax =
      (debtFreePrice * Math.max(0, input.transferTaxRate ?? 0)) / 100;
    const acquisitionCashCosts =
      Math.max(0, input.renovationReserve ?? 0) +
      Math.max(0, input.transactionCosts ?? 0) +
      transferTax;
    const financing = calculateAcquisitionFinancing(
      safeSalePrice,
      input.equity!,
      acquisitionCashCosts,
    );
    const analysis = calculateInvestmentAnalysis({
      ...input,
      salePrice: safeSalePrice,
      debtFreePrice,
      bankLoanAmount: financing.bankLoanAmount,
    });
    evaluatedScenarios += 1;
    return {
      salePrice: safeSalePrice,
      analysis,
      metric: metricFor(analysis, target.mode),
    };
  };
  const meetsTarget = (scenario: Scenario) =>
    scenario.metric !== undefined &&
    Number.isFinite(scenario.metric) &&
    scenario.metric >= target.value;

  const minimumSalePrice = input.companyLoanShare > 0 ? 0 : 1;
  let lower = evaluate(minimumSalePrice);
  if (lower.metric === undefined) {
    return {
      status: "insufficient_data",
      reason:
        target.mode === "monthly_cash_flow"
          ? "Kassavirtaa ei voida laskea nykyisillä vuokra-, kulu- ja lainatiedoilla."
          : "Nettovuokratuottoa ei voida laskea nykyisillä vuokra- ja kulutiedoilla.",
      evaluatedScenarios,
      verified: false,
    };
  }
  if (!meetsTarget(lower)) {
    return {
      status: "unattainable",
      reason: "Tavoite ei täyty edes pienimmällä mahdollisella myyntihinnalla.",
      evaluatedScenarios,
      verified: true,
    };
  }

  let upperPrice = Math.max(
    100_000,
    input.salePrice * 1.5,
    input.salePrice + 50_000,
  );
  let upper = evaluate(upperPrice);
  while (meetsTarget(upper) && upperPrice < ABSOLUTE_SEARCH_LIMIT) {
    lower = upper;
    upperPrice = Math.min(ABSOLUTE_SEARCH_LIMIT, upperPrice * 2);
    upper = evaluate(upperPrice);
  }
  if (meetsTarget(upper)) {
    return {
      status: "unbounded",
      reason:
        "Nykyisellä velanhoitomallilla tavoitteelle ei muodostu rajallista enimmäishintaa.",
      evaluatedScenarios,
      verified: true,
    };
  }

  const monotonicSamples = [0.25, 0.5, 0.75].map((position) =>
    evaluate(lower.salePrice + (upper.salePrice - lower.salePrice) * position),
  );
  const monotonicSequence = [lower, ...monotonicSamples, upper];
  const monotonic = monotonicSequence.every(
    (scenario, index) =>
      index === 0 ||
      scenario.metric! <= monotonicSequence[index - 1]!.metric! + 1e-7,
  );
  if (!monotonic) {
    return {
      status: "insufficient_data",
      reason:
        "Enimmäishintaa ei voitu varmistaa luotettavasti nykyisillä lähtötiedoilla.",
      evaluatedScenarios,
      verified: false,
    };
  }

  let lowPrice = lower.salePrice;
  let highPrice = upper.salePrice;
  for (
    let iteration = 0;
    iteration < 60 && highPrice - lowPrice > 0.01;
    iteration += 1
  ) {
    const middle = (lowPrice + highPrice) / 2;
    if (meetsTarget(evaluate(middle))) lowPrice = middle;
    else highPrice = middle;
  }

  let safePrice = Math.max(
    0,
    Math.floor(lowPrice / OFFER_PRICE_STEP) * OFFER_PRICE_STEP,
  );
  let safeScenario = evaluate(safePrice);
  while (safePrice > 0 && !meetsTarget(safeScenario)) {
    safePrice = Math.max(0, safePrice - OFFER_PRICE_STEP);
    safeScenario = evaluate(safePrice);
  }
  const nextScenario = evaluate(safePrice + OFFER_PRICE_STEP);
  const verified = meetsTarget(safeScenario) && !meetsTarget(nextScenario);
  if (!meetsTarget(safeScenario)) {
    return {
      status: "unattainable",
      reason: "Tavoitteelle ei löytynyt turvallisesti pyöristettyä tarjoushintaa.",
      evaluatedScenarios,
      verified: false,
    };
  }
  return resultFromScenario(
    safeScenario,
    input,
    evaluatedScenarios,
    verified,
  );
}
