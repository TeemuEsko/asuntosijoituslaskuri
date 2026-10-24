import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateAcquisitionFinancing,
  calculateInvestmentAnalysis,
  type InvestmentAnalysisInput,
} from "../src/core/calculations/investment-analysis.ts";
import { simulateMaximumOfferPrice } from "../src/core/calculations/offer-price.ts";

const baseInput: InvestmentAnalysisInput = {
  debtFreePrice: 150_000,
  salePrice: 120_000,
  companyLoanShare: 30_000,
  monthlyRent: 1_150,
  maintenanceFeeMonthly: 260,
  financingFeeMonthly: 120,
  otherCostsMonthly: 40,
  vacancyMonths: 1,
  bankLoanAmount: 90_000,
  equity: 30_000,
  annualInterestRate: 4.5,
  loanTermYears: 20,
  repaymentType: "annuity",
  renovationReserve: 5_000,
  transferTaxRate: 1.5,
  transactionCosts: 500,
};

function calculateAtSalePrice(
  input: InvestmentAnalysisInput,
  salePrice: number,
) {
  const debtFreePrice = salePrice + input.companyLoanShare!;
  const cashCosts =
    (input.renovationReserve ?? 0) +
    (input.transactionCosts ?? 0) +
    (debtFreePrice * (input.transferTaxRate ?? 0)) / 100;
  const financing = calculateAcquisitionFinancing(
    salePrice,
    input.equity!,
    cashCosts,
  );
  return calculateInvestmentAnalysis({
    ...input,
    salePrice,
    debtFreePrice,
    bankLoanAmount: financing.bankLoanAmount,
  });
}

test("kassavirtatavoite ratkaistaan myyntihinnasta ja pyöristetään turvallisesti", () => {
  const target = 100;
  const result = simulateMaximumOfferPrice(baseInput, {
    mode: "monthly_cash_flow",
    value: target,
  });
  assert.equal(result.status, "success");
  assert.equal(result.maximumSalePrice! % 100, 0);
  assert.equal(
    result.simulatedDebtFreePrice,
    result.maximumSalePrice! + baseInput.companyLoanShare!,
  );
  assert.ok(calculateAtSalePrice(baseInput, result.maximumSalePrice!).cashFlowAfterBankLoan! >= target);
  assert.ok(calculateAtSalePrice(baseInput, result.maximumSalePrice! + 100).cashFlowAfterBankLoan! < target);
  assert.equal(result.verified, true);
});

test("nettovuokratuottotavoite käyttää samaa canonical-laskentaa", () => {
  const target = 6;
  const result = simulateMaximumOfferPrice(baseInput, {
    mode: "net_rental_yield",
    value: target,
  });
  assert.equal(result.status, "success");
  assert.ok(calculateAtSalePrice(baseInput, result.maximumSalePrice!).netRentalYield! >= target);
  assert.ok(calculateAtSalePrice(baseInput, result.maximumSalePrice! + 100).netRentalYield! < target);
});

test("yhtiölaina pysyy kiinteänä eikä sitä vähennetä kahdesti", () => {
  const input = {
    ...baseInput,
    debtFreePrice: 210_000,
    salePrice: 60_000,
    companyLoanShare: 150_000,
  };
  const result = simulateMaximumOfferPrice(input, {
    mode: "monthly_cash_flow",
    value: 0,
  });
  assert.equal(result.status, "success");
  assert.ok(result.maximumSalePrice! >= 0);
  assert.equal(
    result.simulatedDebtFreePrice,
    result.maximumSalePrice! + 150_000,
  );
});

test("pankkilaina lasketaan uudelleen omasta pääomasta ja rahoitusvaje näytetään", () => {
  const result = simulateMaximumOfferPrice(
    { ...baseInput, equity: 10_000, transactionCosts: 4_000 },
    { mode: "monthly_cash_flow", value: 0 },
  );
  assert.equal(result.status, "success");
  assert.equal(
    result.bankLoanAmount,
    Math.max(0, result.maximumSalePrice! - 10_000),
  );
  assert.ok(result.financingGap! > 0);
  assert.equal(
    result.financingGap,
    calculateAtSalePrice(
      { ...baseInput, equity: 10_000, transactionCosts: 4_000 },
      result.maximumSalePrice!,
    ).financingGap,
  );
});

test("käteisosto säilyy lainattomana oman pääoman kattamalla hintatasolla", () => {
  const input = {
    ...baseInput,
    salePrice: 80_000,
    companyLoanShare: 0,
    debtFreePrice: 80_000,
    equity: 500_000,
  };
  const result = simulateMaximumOfferPrice(input, {
    mode: "net_rental_yield",
    value: 5,
  });
  assert.equal(result.status, "success");
  assert.ok(result.maximumSalePrice! < 500_000);
  assert.equal(result.bankLoanAmount, 0);
});

test("nykyhinnan täyttävä tavoite voi antaa nykyhintaa suuremman enimmäistarjouksen", () => {
  const current = calculateAtSalePrice(baseInput, baseInput.salePrice!);
  const result = simulateMaximumOfferPrice(baseInput, {
    mode: "monthly_cash_flow",
    value: current.cashFlowAfterBankLoan! - 50,
  });
  assert.equal(result.status, "success");
  assert.ok(result.maximumSalePrice! > baseInput.salePrice!);
  assert.ok(result.differenceEuro! > 0);
});

test("tiukka tavoite voi laskea tarjouksen nykyhintaa alemmaksi", () => {
  const current = calculateAtSalePrice(baseInput, baseInput.salePrice!);
  const result = simulateMaximumOfferPrice(baseInput, {
    mode: "monthly_cash_flow",
    value: current.cashFlowAfterBankLoan! + 50,
  });
  assert.equal(result.status, "success");
  assert.ok(result.maximumSalePrice! < baseInput.salePrice!);
  assert.ok(result.differenceEuro! < 0);
});

test("mahdoton tavoite ja puuttuvat tiedot palauttavat hallitun tilan", () => {
  const impossible = simulateMaximumOfferPrice(baseInput, {
    mode: "monthly_cash_flow",
    value: 100_000,
  });
  const missing = simulateMaximumOfferPrice(
    { ...baseInput, monthlyRent: undefined },
    { mode: "net_rental_yield", value: 8 },
  );
  assert.equal(impossible.status, "unattainable");
  assert.equal(missing.status, "insufficient_data");
  assert.equal(impossible.maximumSalePrice, undefined);
  assert.equal(missing.maximumSalePrice, undefined);
});

test("negatiivinen kassavirta ja nettovuokratuotto eivät tuota keksittyä hintaa", () => {
  const structurallyNegative = {
    ...baseInput,
    monthlyRent: 100,
    maintenanceFeeMonthly: 500,
    financingFeeMonthly: 200,
  };
  const cashFlow = simulateMaximumOfferPrice(structurallyNegative, {
    mode: "monthly_cash_flow",
    value: 0,
  });
  const netYield = simulateMaximumOfferPrice(structurallyNegative, {
    mode: "net_rental_yield",
    value: 0,
  });
  assert.equal(cashFlow.status, "unattainable");
  assert.equal(netYield.status, "unattainable");
});

test("nollakorkoinen bullet-laina raportoidaan rajattomaksi eikä tekaistuksi maksimiksi", () => {
  const result = simulateMaximumOfferPrice(
    {
      ...baseInput,
      annualInterestRate: 0,
      repaymentType: "bullet",
      equity: 0,
    },
    { mode: "monthly_cash_flow", value: 0 },
  );
  assert.equal(result.status, "unbounded");
  assert.equal(result.maximumSalePrice, undefined);
});

test("lyhennystavat ja nollakorkoinen annuiteetti voidaan simuloida", () => {
  for (const repaymentType of ["interest_only", "bullet", "annuity"] as const) {
    const result = simulateMaximumOfferPrice(
      {
        ...baseInput,
        repaymentType,
        annualInterestRate: repaymentType === "annuity" ? 0 : 4.5,
      },
      { mode: "monthly_cash_flow", value: 0 },
    );
    assert.equal(result.status, "success", repaymentType);
  }
});

test("simulaattori ei muuta pääanalyysiä ennen erillistä käyttöönottoa", async () => {
  const [workspace, component] = await Promise.all([
    readFile(
      new URL("../src/components/property/property-workspace.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/property/offer-price-card.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(component, /onClick=\{\(\) => onApply\(result\.maximumSalePrice!\)\}/);
  assert.match(workspace, /function applyOfferPrice\(salePrice: number\)/);
  assert.match(workspace, /function restoreOriginalListingPrice\(\)/);
  assert.match(workspace, /debtFreePrice: safeSalePrice \+ purchase\.companyLoanShare/);
  assert.match(
    workspace,
    /<InvestmentAnalysisPrintReport[\s\S]*purchase=\{purchase\}/,
  );
  assert.doesNotMatch(component, /setPurchase|setData/);
});
