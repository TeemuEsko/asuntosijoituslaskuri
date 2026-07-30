import test from "node:test";
import assert from "node:assert/strict";
import { METRIC_CARD_ORDER, metricCardState } from "../src/core/analysis/metric-card-status.ts";

test("tunnuslukukorttien järjestys painottaa päätöksenteon tärkeimpiä lukuja", () => {
  assert.deepEqual(METRIC_CARD_ORDER, [
    "cashFlowAfterBankLoan",
    "netRentalYield",
    "grossRentalYield",
    "equity",
    "returnOnEquity",
    "cashOnCashReturn",
    "monthlyBankLoanPrincipal",
    "collateralPosition",
    "annualCashFlowAfterBankLoan",
    "adjustedAcquisitionPrice",
  ]);
});

test("kassavirran tilat erottavat tappion, nollan, pienen puskurin ja vahvan puskurin", () => {
  assert.equal(metricCardState("cashFlowAfterBankLoan", -424.24).status, "negative");
  assert.equal(metricCardState("cashFlowAfterBankLoan", 0).status, "warning");
  assert.equal(metricCardState("cashFlowAfterBankLoan", 25).status, "warning");
  assert.equal(metricCardState("cashFlowAfterBankLoan", 150).status, "positive");
  assert.equal(metricCardState("annualCashFlowAfterBankLoan", 1_800, { monthlyCashFlow: 150 }).status, "positive");
});

test("brutto- ja nettotuottojen tilat käyttävät sovittuja pisteytysrajoja", () => {
  assert.equal(metricCardState("grossRentalYield", 4.4).status, "negative");
  assert.equal(metricCardState("grossRentalYield", 4.5).status, "warning");
  assert.equal(metricCardState("grossRentalYield", 6).status, "warning");
  assert.equal(metricCardState("grossRentalYield", 7.4).status, "positive");
  assert.equal(metricCardState("grossRentalYield", 8).status, "positive");
  assert.notEqual(metricCardState("netRentalYield", 2.7).status, "positive");
  assert.equal(metricCardState("netRentalYield", 6).status, "positive");
});

test("oman pääoman tuottojen ja lainan lyhenemisen tilat käsittelevät puuttuvan tiedon", () => {
  assert.equal(metricCardState("cashOnCashReturn", null).status, "unknown");
  assert.equal(metricCardState("returnOnEquity", undefined).status, "unknown");
  assert.equal(metricCardState("cashOnCashReturn", -1).status, "negative");
  assert.equal(metricCardState("cashOnCashReturn", 3).status, "warning");
  assert.equal(metricCardState("cashOnCashReturn", 6).status, "positive");
  assert.equal(metricCardState("returnOnEquity", 10).status, "positive");
  assert.equal(metricCardState("monthlyBankLoanPrincipal", 0).status, "neutral");
  assert.equal(metricCardState("monthlyBankLoanPrincipal", 250).status, "positive");
});

test("vakuusasema erottaa vajeen, puskurin, tasapainon ja puuttuvan tiedon", () => {
  assert.equal(metricCardState("collateralPosition", -20_000, { bankLoanAmount: 100_000 }).status, "negative");
  assert.equal(metricCardState("collateralPosition", -5_000, { bankLoanAmount: 100_000 }).status, "warning");
  assert.equal(metricCardState("collateralPosition", 10_000, { bankLoanAmount: 100_000 }).status, "positive");
  assert.equal(metricCardState("collateralPosition", 0, { bankLoanAmount: 100_000 }).status, "neutral");
  assert.equal(metricCardState("collateralPosition", undefined).status, "unknown");
  assert.equal(metricCardState("equity", 0, { equitySource: "default" }).statusLabel, "Oletus");
  assert.equal(metricCardState("adjustedAcquisitionPrice", 120_000).status, "neutral");
});
