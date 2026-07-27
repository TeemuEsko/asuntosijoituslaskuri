export const PRICE_TOLERANCE_EUR = 1;
export const CURRENCY_DECIMAL_PLACES = 2;

export type CalculationDefinition = {
  id: string;
  name: string;
  formula: string;
  inputs: ReadonlyArray<{ field: string; name: string; unit: string }>;
  includes: string;
  excludes: string;
  unit: string;
  rounding: string;
  missingData: string;
};

export const purchaseCalculationDefinitions: ReadonlyArray<CalculationDefinition> = [
  {
    id: "expected_debt_free_price",
    name: "Laskennallinen velaton hinta",
    formula: "myyntihinta + yhtiölainaosuus",
    inputs: [
      { field: "purchase.salePrice", name: "Myyntihinta", unit: "€" },
      { field: "purchase.companyLoanShare", name: "Yhtiölainaosuus", unit: "€" },
    ],
    includes: "Myyntihinnan ja huoneistokohtaisen yhtiölainaosuuden.",
    excludes: "Varainsiirtoveron, remonttivaran ja muut hankintakulut.",
    unit: "€",
    rounding: "Lasketaan sentin tarkkuudella (2 desimaalia). Hintojen vertailutoleranssi on 1 €.",
    missingData: "Jos myyntihinta tai yhtiölainaosuus puuttuu, lukua ei lasketa.",
  },
  {
    id: "effective_financing_fee_monthly",
    name: "Laskennallinen rahoitusvastike",
    formula: "jos yhtiölainaosuus = 0 €, arvo on 0 €; muutoin raportoitu rahoitusvastike",
    inputs: [
      { field: "purchase.companyLoanShare", name: "Yhtiölainaosuus", unit: "€" },
      { field: "housingCompany.financingFeeMonthly", name: "Raportoitu rahoitusvastike", unit: "€/kk" },
    ],
    includes: "Raportoidun kuukausittaisen rahoitusvastikkeen silloin, kun yhtiölainaa on.",
    excludes: "Hoitovastikkeen, pankkilainan lyhennyksen ja muut kuukausikulut.",
    unit: "€/kk",
    rounding: "Lasketaan sentin tarkkuudella (2 desimaalia).",
    missingData: "Jos yhtiölainaosuus puuttuu, lukua ei lasketa. Positiivinen raportoitu vastike säilytetään ristiriitaevidenssinä, vaikka laskennallinen arvo on 0 €.",
  },
];

function roundCurrency(value: number): number {
  const factor = 10 ** CURRENCY_DECIMAL_PLACES;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function expectedDebtFreePrice(
  salePrice: number,
  companyLoanShare: number,
): number {
  return roundCurrency(salePrice + companyLoanShare);
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
  return companyLoanShare === 0 ? 0 : roundCurrency(reportedFinancingFeeMonthly);
}

export function expectedDebtFreePriceOrNull(
  salePrice: number | null,
  companyLoanShare: number | null,
): number | null {
  return salePrice === null || companyLoanShare === null
    ? null
    : expectedDebtFreePrice(salePrice, companyLoanShare);
}

export function effectiveFinancingFeeMonthlyOrNull(
  companyLoanShare: number | null,
  reportedFinancingFeeMonthly: number | null,
): number | null {
  if (companyLoanShare === null) return null;
  if (companyLoanShare === 0) return 0;
  return reportedFinancingFeeMonthly === null
    ? null
    : effectiveFinancingFeeMonthly(companyLoanShare, reportedFinancingFeeMonthly);
}
