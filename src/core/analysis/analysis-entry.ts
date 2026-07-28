export type AnalysisEntryInput = { debtFreePrice?: number; maintenanceFeeMonthly?: number; monthlyRent?: number; annualInterestRate?: number; loanTermYears?: number; vacancyMonths?: number; companyLoanShare?: number; companyLoanKnown: boolean; financingFeeKnown: boolean; bankLoanAmount?: number; repaymentType?: string };

export function missingCriticalAnalysisFields(input: AnalysisEntryInput): string[] {
  return [
    !(typeof input.debtFreePrice === "number" && input.debtFreePrice > 0) ? "Velaton hinta" : null,
    !(typeof input.maintenanceFeeMonthly === "number" && input.maintenanceFeeMonthly > 0) ? "Hoitovastike" : null,
    !(typeof input.monthlyRent === "number" && input.monthlyRent > 0) ? "Kuukausivuokra" : null,
    !Number.isFinite(input.annualInterestRate) ? "Pankkilainan korko" : null,
    !(typeof input.loanTermYears === "number" && input.loanTermYears > 0) ? "Laina-aika" : null,
    !Number.isFinite(input.vacancyMonths) ? "Tyhjäkäyntikuukaudet" : null,
    !input.companyLoanKnown ? "Yhtiölainaosuus tai tieto, ettei sitä ole" : null,
    (input.companyLoanShare ?? 0) > 0 && !input.financingFeeKnown ? "Rahoitusvastike" : null,
    !(typeof input.bankLoanAmount === "number" && input.bankLoanAmount >= 0) ? "Pankkilainan määrä" : null,
    !input.repaymentType ? "Lyhennystapa" : null,
  ].filter((field): field is string => field !== null);
}
