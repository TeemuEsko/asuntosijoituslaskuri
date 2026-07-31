import { PRICE_TOLERANCE_EUR } from "../calculations/purchase-price.ts";

export type HousingCompanyLoanSource =
  | "user"
  | "direct"
  | "explicit_no_debt"
  | "calculated"
  | "financing_fee"
  | "unknown";

export type HousingCompanyLoanConfidence = "high" | "medium" | "low" | "unknown";

export type HousingCompanyLoanResolution = {
  debtShare: number | null;
  hasDebtShare: boolean | null;
  source: HousingCompanyLoanSource;
  sourceDescription: string;
  confidence: HousingCompanyLoanConfidence;
  userOverridden: boolean;
  conflicts: string[];
};

export type HousingCompanyLoanInput = {
  userOverride?: number | null;
  directDebtShare?: number | null;
  explicitHasDebtShare?: boolean | null;
  debtFreePrice?: number | null;
  salePrice?: number | null;
  financingFeeMonthly?: number | null;
};

export const HOUSING_COMPANY_LOAN_FEE_CONFLICT =
  "Velaton hinta ja myyntihinta viittaavat siihen, ettei yhtiölainaosuutta ole, mutta ilmoituksessa on positiivinen rahoitusvastike. Tarkista, mihin vastike perustuu.";

function validNonNegative(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function roundedCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function priceConflict(input: HousingCompanyLoanInput, debtShare: number): string[] {
  if (!validNonNegative(input.debtFreePrice) || !validNonNegative(input.salePrice)) return [];
  const difference = input.debtFreePrice - input.salePrice;
  return Math.abs(difference - debtShare) <= PRICE_TOLERANCE_EUR
    ? []
    : ["Ilmoitettu yhtiölainaosuus ei vastaa velattoman hinnan ja myyntihinnan erotusta."];
}

/**
 * Ratkaisee huoneistokohtaisen yhtiölainaosuuden yhdellä priorisoidulla säännöstöllä.
 * Nolla on tunnettu arvo eikä puuttuva tieto.
 */
export function resolveHousingCompanyLoan(input: HousingCompanyLoanInput): HousingCompanyLoanResolution {
  if (validNonNegative(input.userOverride)) {
    return {
      debtShare: roundedCurrency(input.userOverride),
      hasDebtShare: input.userOverride > 0,
      source: "user",
      sourceDescription: "Käyttäjän antama arvo",
      confidence: "high",
      userOverridden: true,
      conflicts: priceConflict(input, input.userOverride),
    };
  }

  if (validNonNegative(input.directDebtShare)) {
    const conflicts = priceConflict(input, input.directDebtShare);
    if (input.directDebtShare === 0 && validNonNegative(input.financingFeeMonthly) && input.financingFeeMonthly > 0) {
      conflicts.push(HOUSING_COMPANY_LOAN_FEE_CONFLICT);
    }
    return {
      debtShare: roundedCurrency(input.directDebtShare),
      hasDebtShare: input.directDebtShare > 0,
      source: "direct",
      sourceDescription: "Ilmoituksessa annettu huoneistokohtainen yhtiölainaosuus",
      confidence: conflicts.length ? "medium" : "high",
      userOverridden: false,
      conflicts,
    };
  }

  if (input.explicitHasDebtShare === false) {
    const conflicts = [
      ...priceConflict(input, 0),
      ...(validNonNegative(input.financingFeeMonthly) && input.financingFeeMonthly > 0
        ? [HOUSING_COMPANY_LOAN_FEE_CONFLICT]
        : []),
    ];
    return {
      debtShare: conflicts.length ? null : 0,
      hasDebtShare: conflicts.length ? null : false,
      source: "explicit_no_debt",
      sourceDescription: "Ilmoituksessa kerrotaan, ettei huoneistolla ole yhtiölainaosuutta",
      confidence: conflicts.length ? "low" : "high",
      userOverridden: false,
      conflicts,
    };
  }

  if (validNonNegative(input.debtFreePrice) && validNonNegative(input.salePrice)) {
    const difference = input.debtFreePrice - input.salePrice;
    if (difference < -PRICE_TOLERANCE_EUR) {
      return {
        debtShare: null,
        hasDebtShare: null,
        source: "calculated",
        sourceDescription: "Velaton hinta on myyntihintaa pienempi",
        confidence: "low",
        userOverridden: false,
        conflicts: ["Velaton hinta on myyntihintaa pienempi. Yhtiölainaosuutta ei voitu päätellä."],
      };
    }
    if (Math.abs(difference) <= PRICE_TOLERANCE_EUR) {
      if (validNonNegative(input.financingFeeMonthly) && input.financingFeeMonthly > 0) {
        return {
          debtShare: null,
          hasDebtShare: null,
          source: "calculated",
          sourceDescription: "Hintojen erotus on enintään 1 €, mutta rahoitusvastike on positiivinen",
          confidence: "low",
          userOverridden: false,
          conflicts: [HOUSING_COMPANY_LOAN_FEE_CONFLICT],
        };
      }
      const sourceDescription = difference === 0
        ? "Velaton hinta − myyntihinta = 0 € (hintojen erotus enintään 1 €)"
        : `Hintojen erotus ${roundedCurrency(difference).toLocaleString("fi-FI")} € on enintään 1 € ja tulkitaan yhtiölainaosuudeksi 0 €`;
      return {
        debtShare: 0,
        hasDebtShare: false,
        source: "calculated",
        sourceDescription,
        confidence: "high",
        userOverridden: false,
        conflicts: [],
      };
    }
    return {
      debtShare: roundedCurrency(difference),
      hasDebtShare: true,
      source: "calculated",
      sourceDescription: `Velaton hinta − myyntihinta = ${roundedCurrency(difference).toLocaleString("fi-FI")} €`,
      confidence: "high",
      userOverridden: false,
      conflicts: [],
    };
  }

  if (validNonNegative(input.financingFeeMonthly) && input.financingFeeMonthly > 0) {
    return {
      debtShare: null,
      hasDebtShare: true,
      source: "financing_fee",
      sourceDescription: "Positiivinen rahoitusvastike viittaa yhtiölainaan, mutta lainaosuuden määrä puuttuu",
      confidence: "medium",
      userOverridden: false,
      conflicts: [],
    };
  }

  return {
    debtShare: null,
    hasDebtShare: null,
    source: "unknown",
    sourceDescription: "Yhtiölainaosuutta ei voitu päätellä käytettävissä olevista tiedoista",
    confidence: "unknown",
    userOverridden: false,
    conflicts: [],
  };
}

export function housingCompanyLoanStatus(resolution: HousingCompanyLoanResolution): "yes" | "no" | "unknown" {
  if (resolution.conflicts.length || resolution.hasDebtShare === null) return "unknown";
  return resolution.hasDebtShare ? "yes" : "no";
}
