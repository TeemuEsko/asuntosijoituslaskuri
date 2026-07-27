export const PRICE_TOLERANCE_EUR = 1;

export function expectedDebtFreePrice(
  salePrice: number,
  companyLoanShare: number,
): number {
  return salePrice + companyLoanShare;
}

export function pricesAreConsistent(
  debtFreePrice: number,
  salePrice: number,
  companyLoanShare: number,
): boolean {
  return (
    Math.abs(
      debtFreePrice - expectedDebtFreePrice(salePrice, companyLoanShare),
    ) <= PRICE_TOLERANCE_EUR
  );
}

export function effectiveFinancingFeeMonthly(
  companyLoanShare: number,
  reportedFinancingFeeMonthly: number,
): number {
  return companyLoanShare === 0 ? 0 : reportedFinancingFeeMonthly;
}
