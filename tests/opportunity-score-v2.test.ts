import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  calculateOpportunityScoreV2,
  interpolateScore,
  type OpportunityScoreV2Input,
} from "../src/core/scoring/opportunity-score-v2.ts";

const base: OpportunityScoreV2Input = {
  debtFreePrice: 120_000,
  renovationCost: 0,
  transferTax: 1_800,
  transactionCosts: 500,
  effectiveAnnualRent: 10_200,
  annualOperatingCosts: 3_600,
  monthlyCashFlowAfterDebtService: 100,
  bankLoanAmount: 70_000,
  companyLoanShare: 0,
  annualInterestRate: 4.5,
  loanTermYears: 20,
  repaymentType: "annuity",
  annualBankLoanPrincipal: 2_500,
  maintenanceFeeMonthly: 250,
  financingFeeMonthly: 0,
  otherCostsMonthly: 50,
  repairHistoryScore: 65,
  technicalConditionScore: 65,
  apartmentCount: 25,
  landOwnership: "owned",
  collateralValue: 84_000,
  collateralValueSource: "calculated",
  rentalDemand: 3,
  resaleLiquidity: 3,
  locationRisk: 3,
  vacancyMonths: 1,
  asOfYear: 2026,
};

const calibrationCases: Array<[string, OpportunityScoreV2Input, number]> = [
  ["halpa korkean tuoton korjausriskikohde", { ...base, debtFreePrice: 78_000, transferTax: 1_170, effectiveAnnualRent: 11_040, annualOperatingCosts: 3_000, monthlyCashFlowAfterDebtService: 180, bankLoanAmount: 52_000, repairHistoryScore: 20, technicalConditionScore: 30, futureRepairCost: 18_000, apartmentCount: 12 }, 70],
  ["hyväkuntoinen matalariskinen kohde", { ...base, debtFreePrice: 155_000, transferTax: 2_325, effectiveAnnualRent: 12_650, annualOperatingCosts: 3_500, monthlyCashFlowAfterDebtService: 80, bankLoanAmount: 90_000, repairHistoryScore: 90, technicalConditionScore: 85, housingCompanyLiquidityMonths: 6, apartmentCount: 40, rentalDemand: 4, resaleLiquidity: 4, locationRisk: 2, vacancyMonths: 0.5 }, 64],
  ["alihintaan ostettava vakuuspotentiaalikohde", { ...base, debtFreePrice: 100_000, transferTax: 1_500, transactionCosts: 500, renovationCost: 5_000, effectiveAnnualRent: 11_400, annualOperatingCosts: 3_200, monthlyCashFlowAfterDebtService: 100, bankLoanAmount: 65_000, currentMarketValue: 145_000, currentMarketValueSource: "bank", collateralValue: 85_000, collateralValueSource: "bank", rentalDemand: 4, resaleLiquidity: 4, locationRisk: 2, vacancyMonths: 0.5 }, 73],
  ["remontilla arvonluontia tekevä kohde", { ...base, debtFreePrice: 100_000, transferTax: 1_500, transactionCosts: 500, renovationCost: 25_000, effectiveAnnualRent: 12_000, annualOperatingCosts: 3_500, monthlyCashFlowAfterDebtService: 50, bankLoanAmount: 80_000, currentMarketValue: 110_000, currentMarketValueSource: "validated", postRenovationMarketValue: 165_000, postRenovationMarketValueSource: "validated", collateralValue: 82_000, rentalDemand: 4, resaleLiquidity: 4, locationRisk: 2 }, 66],
  ["negatiivinen kassavirta ja vahva lyhennys", { ...base, debtFreePrice: 175_000, transferTax: 2_625, effectiveAnnualRent: 13_200, annualOperatingCosts: 3_900, monthlyCashFlowAfterDebtService: -80, bankLoanAmount: 125_000, annualBankLoanPrincipal: 7_500, repairHistoryScore: 85, technicalConditionScore: 80, rentalDemand: 4, resaleLiquidity: 4, locationRisk: 2, vacancyMonths: 0.5 }, 54],
  ["bullet-laina", { ...base, debtFreePrice: 145_000, transferTax: 2_175, effectiveAnnualRent: 12_600, annualOperatingCosts: 3_600, monthlyCashFlowAfterDebtService: 170, bankLoanAmount: 100_000, repaymentType: "bullet", loanTermYears: 3, annualBankLoanPrincipal: 0, repairHistoryScore: 75, technicalConditionScore: 75, rentalDemand: 4, resaleLiquidity: 4, locationRisk: 2, vacancyMonths: 0.5 }, 64],
  ["markkina-arvo puuttuu", { ...base }, 61],
  ["epärealistinen käyttäjän markkina-arvo", { ...base, debtFreePrice: 100_000, transferTax: 1_500, transactionCosts: 500, renovationCost: 5_000, currentMarketValue: 300_000, currentMarketValueSource: "user", collateralValue: 70_000, collateralValueSource: "calculated" }, 62],
];

test("kahdeksan Opportunity Score 2.0 -kalibrointikohdetta ovat deterministisiä", () => {
  for (const [name, input, expected] of calibrationCases) {
    const first = calculateOpportunityScoreV2(input);
    const second = calculateOpportunityScoreV2(structuredClone(input));
    assert.equal(first.score, expected, name);
    assert.deepEqual(first, second, name);
    assert.deepEqual(Object.keys(first.subScores), [
      "cashFlow",
      "riskAdjustedYield",
      "housingCompanyRisk",
      "valueCreation",
      "financing",
      "market",
    ]);
  }
});

test("pistekäyrät ovat jatkuvia ankkuripisteiden ympärillä", () => {
  const anchors = [[-200, 0], [-100, 25], [0, 50], [100, 75], [200, 100]] as const;
  for (const [value] of anchors.slice(1, -1)) {
    const below = interpolateScore(value - 0.0001, anchors);
    const above = interpolateScore(value + 0.0001, anchors);
    assert.ok(Math.abs(above - below) < 0.001);
  }
});

test("velkainen mutta hyvin rahoitettu yhtiö voi saada paremman taloyhtiöpisteen kuin velaton mutta heikko yhtiö", () => {
  const financed = calculateOpportunityScoreV2({
    ...base,
    companyLoanShare: 60_000,
    companyLoanAnnualInterestRate: 2.5,
    companyLoanRemainingTermYears: 25,
    projectedFinancingFeeMonthly: 300,
    financingFeeMonthly: 280,
    housingCompanyLiquidityMonths: 8,
    repairHistoryScore: 80,
    technicalConditionScore: 80,
  });
  const debtFreeWeak = calculateOpportunityScoreV2({
    ...base,
    companyLoanShare: 0,
    housingCompanyLiquidityMonths: 0,
    repairHistoryScore: 30,
    technicalConditionScore: 30,
  });
  assert.ok(financed.subScores.housingCompanyRisk > debtFreeWeak.subScores.housingCompanyRisk);
});

test("pelkkä remontin jälkeinen arvo tuottaa kokonaisarvonluonnin hankintakustannukseen nähden", () => {
  const result = calculateOpportunityScoreV2({
    ...base,
    debtFreePrice: 40_000,
    transferTax: 0,
    transactionCosts: 0,
    renovationCost: 10_000,
    postRenovationMarketValue: 70_000,
    postRenovationMarketValueSource: "user",
    currentMarketValue: undefined,
    bankLoanAmount: 30_000,
    collateralValue: 28_000,
  });
  assert.equal(result.totalInvestment, 50_000);
  assert.equal(result.totalValueCreation, 20_000);
  assert.equal(result.purchaseDiscount, undefined);
  assert.equal(result.renovationNetValue, undefined);
});

test("molemmat markkina-arvot erottelevat alihinnan ja remontin lisäarvon ilman kaksinkertaista pisteytystä", () => {
  const result = calculateOpportunityScoreV2({
    ...base,
    debtFreePrice: 40_000,
    transferTax: 0,
    transactionCosts: 0,
    renovationCost: 10_000,
    currentMarketValue: 50_000,
    currentMarketValueSource: "validated",
    postRenovationMarketValue: 70_000,
    postRenovationMarketValueSource: "validated",
  });
  assert.equal(result.purchaseDiscount, 10_000);
  assert.equal(result.renovationNetValue, 10_000);
  assert.equal(result.purchaseDiscount! + result.renovationNetValue!, 20_000);
});

test("käyttäjän vahvistamaton markkina-arvo saa vain rajatun vaikutuksen", () => {
  const user = calculateOpportunityScoreV2({ ...base, currentMarketValue: 1_000_000, currentMarketValueSource: "user" });
  const bank = calculateOpportunityScoreV2({ ...base, currentMarketValue: 1_000_000, currentMarketValueSource: "bank" });
  assert.ok(user.subScores.valueCreation < bank.subScores.valueCreation);
  assert.ok(
    user.subScores.valueCreation - 50 < bank.subScores.valueCreation - 50,
    "vahvistamattoman käyttäjäarvion poikkeama neutraalista pitää jäädä pankkiarviota pienemmäksi",
  );
});

test("negatiivinen kassavirta ja suuri remontti eivät aiheuta vanhoja pistekattoja", () => {
  const result = calculateOpportunityScoreV2({
    ...base,
    monthlyCashFlowAfterDebtService: -10,
    effectiveAnnualRent: 20_000,
    annualOperatingCosts: 2_000,
    futureRepairCost: 100_000,
    repairHistoryScore: 90,
  });
  assert.equal(result.appliedCap, undefined);
  assert.equal(result.score, Math.round(result.uncappedScore));
});

test("vain kaksi todennettua vakavaa riskiä aktivoivat pistekatot", () => {
  const strong = { ...base, effectiveAnnualRent: 20_000, annualOperatingCosts: 1_000, monthlyCashFlowAfterDebtService: 300, currentMarketValue: 180_000, currentMarketValueSource: "bank" as const };
  const rental = calculateOpportunityScoreV2({ ...strong, verifiedLongTermRentalProhibition: true });
  const land = calculateOpportunityScoreV2({ ...strong, landLeaseEndDate: "2028-12-31", verifiedLandLeaseNonRenewal: true });
  const both = calculateOpportunityScoreV2({ ...strong, landLeaseEndDate: "2028-12-31", verifiedLandLeaseNonRenewal: true, verifiedLongTermRentalProhibition: true });
  const unverified = calculateOpportunityScoreV2({ ...strong, landLeaseEndDate: "2028-12-31", verifiedLandLeaseNonRenewal: false });
  assert.equal(rental.score, 39);
  assert.equal(land.score, 49);
  assert.equal(both.score, 39);
  assert.equal(unverified.appliedCap, undefined);
});

test("puuttuvat arvonluontitiedot ovat neutraaleja eivätkä tee analyysistä alustavaa", () => {
  const result = calculateOpportunityScoreV2({ ...base, collateralValue: undefined, currentMarketValue: undefined, postRenovationMarketValue: undefined, preliminary: false, missingData: [] });
  assert.equal(result.subScores.valueCreation, 50);
  assert.equal(result.reliability, "good");
});

test("käyttöliittymä ja PDF käyttävät samaa kuuden osa-alueen analyysitulosta", async () => {
  const [workspace, scoreCard, report] = await Promise.all([
    readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/investment-overall-score.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/investment-analysis-print-report.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(workspace, /const overallScore = adaptInvestmentScore\(scoreSource\)/);
  assert.match(workspace, /<InvestmentOverallScore \{\.\.\.overallScore\} \/>/);
  assert.match(workspace, /analysis=\{overallScore\}/);
  for (const key of ["cashFlow", "yield", "housingCompanyRisk", "valueCreation", "financing", "market"]) {
    assert.match(scoreCard, new RegExp(key));
    assert.match(report, new RegExp(`subScores\\?\\.${key}`));
  }
  assert.doesNotMatch(report, /calculateOpportunityScoreV2|adaptInvestmentScore/);
});
