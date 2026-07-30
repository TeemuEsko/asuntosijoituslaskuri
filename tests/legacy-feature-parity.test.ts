import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateInvestmentAnalysis } from "../src/core/calculations/investment-analysis.ts";
import { simulateMaximumOfferPrice } from "../src/core/calculations/offer-price.ts";
import { buildAnalysisReportData } from "../src/core/reports/analysis-report.ts";
import { parityFixtures } from "./fixtures/parity-fixtures.ts";

test("uusi analyysitulos sisältää legacy-laskurin keskeiset rahoitusluvut", () => {
  const result = calculateInvestmentAnalysis(parityFixtures.apartmentWithCompanyLoan);
  for (const key of ["grossRentalYield", "netRentalYield", "cashFlowBeforeBankLoan", "cashFlowAfterBankLoan", "monthlyBankLoanPayment", "monthlyBankLoanInterest", "monthlyBankLoanPrincipal", "annualBankLoanPrincipal", "adjustedAcquisitionPrice", "actualEquityRequired", "collateralShortfall", "leverageRatio", "cashOnCashReturn", "returnOnEquity"] as const) assert.equal(typeof result[key], "number", `${key} puuttuu`);
});

test("oikaistu hankintahinta sisältää remonttivaran, veron ja kulut", () => {
  const result = calculateInvestmentAnalysis(parityFixtures.apartmentWithCompanyLoan);
  assert.equal(result.transferTax, 1_800);
  assert.equal(result.adjustedAcquisitionPrice, 127_300);
});

test("tarjoushintasimulaatio löytää korkeimman tavoitteet täyttävän hinnan", () => {
  const loose = simulateMaximumOfferPrice(parityFixtures.strongCashFlow, { monthlyCashFlow: 50, netRentalYield: 5 });
  const strict = simulateMaximumOfferPrice(parityFixtures.strongCashFlow, { monthlyCashFlow: 200, netRentalYield: 7 });
  assert.ok(loose.maximumDebtFreePrice !== undefined);
  assert.ok(strict.maximumDebtFreePrice === undefined || strict.maximumDebtFreePrice <= loose.maximumDebtFreePrice!);
});

test("keskitetty sääntömoottori tuottaa riskit, vahvuudet ja missingData-havainnot", () => {
  const negative = calculateInvestmentAnalysis(parityFixtures.negativeCashFlow);
  const strong = calculateInvestmentAnalysis(parityFixtures.strongCashFlow);
  const missing = calculateInvestmentAnalysis(parityFixtures.missingLoan);
  assert.ok(negative.observations.some((item) => item.id === "negative-cash-flow-after-loan" && item.type === "risk"));
  assert.ok(strong.observations.some((item) => item.id === "strong-positive-cash-flow" && item.type === "strength"));
  assert.ok(missing.observations.some((item) => item.id === "missing-bank-loan" && item.type === "missingData"));
});

test("raportti käyttää nykyistä canonical analyysitilaa", () => {
  const input = { ...parityFixtures.apartmentWithCompanyLoan, monthlyRent: 999 };
  const analysis = calculateInvestmentAnalysis(input);
  const report = buildAnalysisReportData(input, analysis, { userValues: ["monthlyRent"] });
  assert.equal(report.source, "current_canonical_state");
  assert.equal(report.input.monthlyRent, 999);
  assert.equal(report.analysis.cashFlowAfterBankLoan, analysis.cashFlowAfterBankLoan);
  assert.deepEqual(report.provenance.userValues, ["monthlyRent"]);
});

test("raportti ja tulostettava analyysitila käsittelevät nollan oman pääoman turvallisesti", () => {
  const input = { ...parityFixtures.apartmentWithCompanyLoan, equity: 0, equitySource: "default" as const, equityUserOverridden: false };
  const analysis = calculateInvestmentAnalysis(input);
  const report = buildAnalysisReportData(input, analysis);
  const serialized = JSON.stringify(report);
  assert.equal(report.input.equity, 0);
  assert.equal(report.input.equitySource, "default");
  assert.equal(report.analysis.cashOnCashReturn, null);
  assert.equal(report.analysis.returnOnEquity, null);
  assert.equal(report.summary.equity, "0 € (oletus)");
  assert.match(report.summary.cashOnCashReturn, /Ei laskettavissa/);
  assert.match(report.summary.returnOnEquity, /Ei laskettavissa/);
  assert.doesNotMatch(serialized, /NaN|Infinity/);
});

test("parity- ja parserirekisterit sisältävät statukset ja jatkotehtävien perustelut", async () => {
  const parity = await readFile(new URL("../docs/legacy-feature-parity.md", import.meta.url), "utf8");
  const parser = await readFile(new URL("../docs/parser-coverage.md", import.meta.url), "utf8");
  for (const status of ["COMPLETE", "PARTIAL", "MISSING", "BROKEN", "REPLACED", "NOT_APPLICABLE"]) assert.match(parity, new RegExp(status));
  assert.match(parity, /Perustellut jatkotehtävät/);
  assert.match(parser, /Etuovi-\/Oikotie-labelit/);
});
