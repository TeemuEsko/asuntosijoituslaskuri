export type DataConflict = {
  code: "company_loan_fee_conflict" | "purchase_price_conflict";
  fieldPaths: ReadonlyArray<string>;
  message: string;
  sourceValues: Readonly<Record<string, number>>;
};

export type PurchaseValidationInput = {
  debtFreePrice: number;
  salePrice: number;
  companyLoanShare: number;
  reportedFinancingFeeMonthly: number;
};

export function validatePurchaseData(
  input: PurchaseValidationInput,
  priceToleranceEur = 1,
): DataConflict[] {
  const conflicts: DataConflict[] = [];
  const expectedPrice = input.salePrice + input.companyLoanShare;

  if (Math.abs(input.debtFreePrice - expectedPrice) > priceToleranceEur) {
    conflicts.push({
      code: "purchase_price_conflict",
      fieldPaths: ["purchase.debtFreePrice", "purchase.salePrice", "purchase.companyLoanShare"],
      message: "Velaton hinta ei vastaa myyntihinnan ja yhtiölainaosuuden summaa.",
      sourceValues: {
        debtFreePrice: input.debtFreePrice,
        salePrice: input.salePrice,
        companyLoanShare: input.companyLoanShare,
      },
    });
  }

  if (input.companyLoanShare === 0 && input.reportedFinancingFeeMonthly > 0) {
    conflicts.push({
      code: "company_loan_fee_conflict",
      fieldPaths: ["purchase.companyLoanShare", "housingCompany.financingFeeMonthly"],
      message: "Yhtiölainaosuus on 0 €, mutta raportoitu rahoitusvastike on suurempi kuin 0 €/kk. Tarkista vastikkeen peruste.",
      sourceValues: {
        companyLoanShare: input.companyLoanShare,
        reportedFinancingFeeMonthly: input.reportedFinancingFeeMonthly,
      },
    });
  }

  return conflicts;
}
