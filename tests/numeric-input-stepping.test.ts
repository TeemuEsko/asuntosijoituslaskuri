import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ANALYSIS_NUMERIC_INPUT_CONFIG,
  stepAnalysisNumericValue,
  type AnalysisNumericInputKey,
} from "../src/core/analysis/numeric-input-stepping.ts";
import { calculateInvestmentAnalysis } from "../src/core/calculations/investment-analysis.ts";
import { formatFinnishInputNumber, parseFinnishInputNumber } from "../src/core/parser/normalization.ts";

const step = (key: AnalysisNumericInputKey, value: string, direction: 1 | -1, currentValue?: number) =>
  stepAnalysisNumericValue(key, value, direction, currentValue);

test("numeeristen analyysikenttien askeleet ja rajat ovat keskitetysti määritelty", () => {
  assert.deepEqual(ANALYSIS_NUMERIC_INPUT_CONFIG, {
    annualInterestRate: { step: 0.1, min: 0, precision: 1, fallback: 0 },
    loanTermYears: { step: 1, min: 1, precision: 0, fallback: 1 },
    equity: { step: 1_000, min: 0, precision: 0, fallback: 0 },
    collateralValue: { step: 1_000, min: 0, precision: 0, fallback: 0 },
    monthlyRent: { step: 10, min: 0, precision: 0, fallback: 0 },
    maintenanceFeeMonthly: { step: 10, min: 0, precision: 0, fallback: 0 },
    financingFeeMonthly: { step: 10, min: 0, precision: 0, fallback: 0 },
    otherCostsMonthly: { step: 10, min: 0, precision: 0, fallback: 0 },
    vacancyMonths: { step: 0.5, min: 0, max: 12, precision: 1, fallback: 0 },
    debtFreePrice: { step: 1_000, min: 0, precision: 0, fallback: 0 },
    salePrice: { step: 1_000, min: 0, precision: 0, fallback: 0 },
    renovationReserve: { step: 1_000, min: 0, precision: 0, fallback: 0 },
    transactionCosts: { step: 100, min: 0, precision: 0, fallback: 0 },
    transferTaxRate: { step: 0.1, min: 0, precision: 1, fallback: 0 },
  });
});

test("korko ja varainsiirtovero askeltavat desimaalipilkulla ilman liukulukuartefakteja", () => {
  assert.equal(step("annualInterestRate", "4,5", 1), 4.6);
  assert.equal(step("annualInterestRate", "4,5", -1), 4.4);
  assert.equal(step("transferTaxRate", "1,5", 1), 1.6);
  assert.equal(formatFinnishInputNumber(step("annualInterestRate", "4,5", 1), 1), "4,6");
  assert.equal(parseFinnishInputNumber("4,5"), 4.5);
  assert.doesNotMatch(String(step("annualInterestRate", "4,5", 1)), /000000000|999999999/);
});

test("laina-aika, oma pääoma, vakuusarvo ja kuukausivuokra käyttävät kenttäkohtaisia askelia", () => {
  assert.equal(step("loanTermYears", "20", 1), 21);
  assert.equal(step("loanTermYears", "20", -1), 19);
  assert.equal(step("equity", "0", -1), 0);
  assert.equal(step("equity", "0", 1), 1_000);
  assert.equal(step("collateralValue", "36 400", 1), 37_400);
  assert.equal(step("collateralValue", "37 400", -1), 36_400);
  assert.equal(step("monthlyRent", "970", 1), 980);
  assert.equal(step("monthlyRent", "970", -1), 960);
});

test("tyhjäkäynti askeltaa puolella kuukaudella ja pysyy sallituissa rajoissa", () => {
  assert.equal(step("vacancyMonths", "1", 1), 1.5);
  assert.equal(step("vacancyMonths", "1", -1), 0.5);
  assert.equal(step("vacancyMonths", "12", 1), 12);
  assert.equal(step("vacancyMonths", "0", -1), 0);
  assert.equal(step("loanTermYears", "1", -1), 1);
});

test("tyhjä tai virheellinen luonnos käyttää turvallista nyky- tai oletusarvoa", () => {
  assert.equal(step("annualInterestRate", "", 1, 4.5), 4.6);
  assert.equal(step("monthlyRent", "ei luku", 1), 10);
  assert.equal(step("loanTermYears", "", -1), 1);
  for (const value of [
    step("annualInterestRate", "", 1),
    step("monthlyRent", "ei luku", -1),
    step("vacancyMonths", "", 1),
  ]) assert.ok(Number.isFinite(value));
});

test("askellettu arvo päivittää normaalin analyysin tuotot, kassavirran, rahoituksen ja scoren", () => {
  const input = {
    debtFreePrice: 120_000,
    salePrice: 120_000,
    monthlyRent: 970,
    maintenanceFeeMonthly: 300,
    financingFeeMonthly: 0,
    otherCostsMonthly: 50,
    vacancyMonths: 1,
    bankLoanAmount: 80_000,
    annualInterestRate: 4.5,
    loanTermYears: 20,
    repaymentType: "annuity" as const,
    collateralValue: 70_000,
    repairRiskScore: 60,
    repairHistoryKnown: true,
  };
  const baseline = calculateInvestmentAnalysis(input);
  const rentChanged = calculateInvestmentAnalysis({
    ...input,
    monthlyRent: step("monthlyRent", "970", 1),
  });
  const financingChanged = calculateInvestmentAnalysis({
    ...input,
    annualInterestRate: step("annualInterestRate", "4,5", 1),
  });

  assert.ok(rentChanged.grossRentalYield! > baseline.grossRentalYield!);
  assert.notEqual(rentChanged.cashFlowAfterBankLoan, baseline.cashFlowAfterBankLoan);
  assert.notEqual(rentChanged.score, baseline.score);
  assert.ok(financingChanged.monthlyBankLoanPayment! > baseline.monthlyBankLoanPayment!);
});

test("kaikki nimetyt muokattavat kentät käyttävät yhteistä näppäinkäsittelyä ja normaalia päivityspolkua", async () => {
  const [field, purchase, assumptions, workspace] = await Promise.all([
    readFile(new URL("../src/components/property/localized-number-field.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/purchase-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/assumptions-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8"),
  ]);
  const combinedInputs = `${purchase}\n${assumptions}`;
  for (const key of Object.keys(ANALYSIS_NUMERIC_INPUT_CONFIG)) {
    assert.match(combinedInputs, new RegExp(`numericInputKey=["']${key}["']`), `${key} ei käytä yhteistä numerokenttää`);
  }
  assert.match(field, /event\.key === "ArrowUp" \|\| event\.key === "ArrowDown"/);
  assert.match(field, /event\.preventDefault\(\)/);
  assert.match(field, /stepAnalysisNumericValue\(/);
  assert.match(field, /onValueChange\?\.\(nextValue\)/);
  assert.match(field, /type="text"/);
  assert.match(field, /onChange=\{\(event\) => updateDraft\(event\.currentTarget\.value\)\}/);
  assert.match(field, /onBlur=\{commit\}/);
  assert.match(workspace, /setAssumptionStatuses\(\(current\) => \(\{ \.\.\.current, \[key\]: "user" \}\)\)/);
  assert.match(workspace, /setStatuses\(\(current\) => \(\{ \.\.\.current, \[key\]: "user"/);
});
