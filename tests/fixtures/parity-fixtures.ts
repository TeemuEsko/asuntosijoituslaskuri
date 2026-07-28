import type { InvestmentAnalysisInput } from "../../src/core/calculations/investment-analysis.ts";

export const baseInvestment: InvestmentAnalysisInput = { debtFreePrice: 120_000, salePrice: 100_000, companyLoanShare: 20_000, monthlyRent: 850, maintenanceFeeMonthly: 260, financingFeeMonthly: 120, vacancyMonths: 1, bankLoanAmount: 75_000, equity: 25_000, annualInterestRate: 4.5, loanTermYears: 20, repaymentType: "annuity", collateralValue: 84_000, renovationReserve: 5_000, maintenanceReserveMonthly: 50, transferTaxRate: 1.5, transactionCosts: 500, rentalDemand: 3, locationRisk: 3, resaleLiquidity: 3, repairRiskScore: 55, repairHistoryKnown: true };

export const parityFixtures = {
  apartmentWithCompanyLoan: baseInvestment,
  rowHouse: { ...baseInvestment, companyLoanShare: 0, financingFeeMonthly: 0, repairRiskScore: 65 },
  optionalLeasehold: { ...baseInvestment, otherCostsMonthly: 90 },
  missingLoan: { ...baseInvestment, bankLoanAmount: undefined, annualInterestRate: undefined, loanTermYears: undefined, repaymentType: undefined },
  lowYield: { ...baseInvestment, debtFreePrice: 200_000, salePrice: 180_000, monthlyRent: 750 },
  negativeCashFlow: { ...baseInvestment, monthlyRent: 600, bankLoanAmount: 95_000 },
  strongCashFlow: { ...baseInvestment, monthlyRent: 1_300, bankLoanAmount: 55_000 },
  missingRepairs: { ...baseInvestment, repairHistoryKnown: false, repairRiskScore: undefined },
} satisfies Record<string, InvestmentAnalysisInput>;
