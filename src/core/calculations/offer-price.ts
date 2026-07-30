import { calculateInvestmentAnalysis, type InvestmentAnalysisInput } from "./investment-analysis.ts";

export type OfferPriceTargets = { monthlyCashFlow?: number; netRentalYield?: number; cashOnCashReturn?: number };
export type OfferPriceResult = { maximumDebtFreePrice?: number; cashFlowAfterLoan?: number; netRentalYield?: number; cashOnCashReturn?: number; evaluatedScenarios: number };

export function simulateMaximumOfferPrice(input: InvestmentAnalysisInput, targets: OfferPriceTargets): OfferPriceResult {
  if (!input.debtFreePrice || input.debtFreePrice <= 0) return { evaluatedScenarios: 0 };
  const minimum = Math.max(10_000, Math.floor(input.debtFreePrice * .35 / 500) * 500);
  const maximum = Math.ceil(input.debtFreePrice * 1.15 / 500) * 500;
  let best: ReturnType<typeof calculateInvestmentAnalysis> | undefined;
  let bestPrice: number | undefined;
  let evaluatedScenarios = 0;
  for (let price = minimum; price <= maximum; price += 500) {
    const companyLoan = input.companyLoanShare ?? 0;
    const salePrice = Math.max(0, price - companyLoan);
    const bankLoanAmount = input.equity === undefined ? input.bankLoanAmount : Math.max(0, salePrice - input.equity);
    const result = calculateInvestmentAnalysis({ ...input, debtFreePrice: price, salePrice, bankLoanAmount });
    evaluatedScenarios += 1;
    if (targets.monthlyCashFlow !== undefined && (result.cashFlowAfterBankLoan === undefined || result.cashFlowAfterBankLoan < targets.monthlyCashFlow)) continue;
    if (targets.netRentalYield !== undefined && (result.netRentalYield === undefined || result.netRentalYield < targets.netRentalYield)) continue;
    if (targets.cashOnCashReturn !== undefined && (result.cashOnCashReturn == null || result.cashOnCashReturn < targets.cashOnCashReturn)) continue;
    best = result; bestPrice = price;
  }
  return { maximumDebtFreePrice: bestPrice, cashFlowAfterLoan: best?.cashFlowAfterBankLoan, netRentalYield: best?.netRentalYield, cashOnCashReturn: best?.cashOnCashReturn ?? undefined, evaluatedScenarios };
}
