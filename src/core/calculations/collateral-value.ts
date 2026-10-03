export type CollateralPercentage = 70 | 80;

export const DEFAULT_COLLATERAL_PERCENTAGE: CollateralPercentage = 70;

export function calculateAutomaticCollateralValue(input: {
  debtFreePrice: number;
  companyLoanShare: number;
  collateralPercentage: CollateralPercentage;
}): number {
  const debtFreePrice = Number.isFinite(input.debtFreePrice)
    ? Math.max(0, input.debtFreePrice)
    : 0;
  const companyLoanShare = Number.isFinite(input.companyLoanShare)
    ? Math.max(0, input.companyLoanShare)
    : 0;

  return Math.max(
    0,
    debtFreePrice * (input.collateralPercentage / 100) - companyLoanShare,
  );
}
