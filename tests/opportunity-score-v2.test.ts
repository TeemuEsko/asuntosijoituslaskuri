import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateOpportunityScoreV2, interpolateScore, type OpportunityScoreV2Input } from "../src/core/scoring/opportunity-score-v2.ts";

const base: OpportunityScoreV2Input = {
  debtFreePrice: 120_000, renovationCost: 0, transferTax: 1_800, transactionCosts: 500,
  effectiveAnnualRent: 10_200, annualOperatingCosts: 3_600, monthlyCashFlowAfterDebtService: 100,
  bankLoanAmount: 70_000, companyLoanShare: 0, annualInterestRate: 4.5, loanTermYears: 20,
  repaymentType: "annuity", annualBankLoanPrincipal: 2_500, maintenanceFeeMonthly: 250,
  financingFeeMonthly: 0, otherCostsMonthly: 50, repairHistoryScore: 65, technicalConditionScore: 65,
  apartmentCount: 25, landOwnership: "owned", collateralValue: 84_000,
  collateralValueSource: "calculated", rentalDemand: 3, resaleLiquidity: 3, locationRisk: 3,
  vacancyMonths: 1, asOfYear: 2026,
};

const calibrationCases: Array<[string, OpportunityScoreV2Input, number]> = [
  ["halpa korkean tuoton korjausriskikohde", { ...base, debtFreePrice: 78_000, transferTax: 1_170, effectiveAnnualRent: 11_040, annualOperatingCosts: 3_000, monthlyCashFlowAfterDebtService: 180, bankLoanAmount: 52_000, repairHistoryScore: 20, technicalConditionScore: 30, apartmentCount: 12 }, 71],
  ["hyväkuntoinen matalariskinen kohde", { ...base, debtFreePrice: 155_000, transferTax: 2_325, effectiveAnnualRent: 12_650, annualOperatingCosts: 3_500, monthlyCashFlowAfterDebtService: 80, bankLoanAmount: 90_000, repairHistoryScore: 90, technicalConditionScore: 85, apartmentCount: 40, rentalDemand: 4, resaleLiquidity: 4, locationRisk: 2, vacancyMonths: 0.5 }, 64],
  ["vahvan vakuusaseman kohde", { ...base, debtFreePrice: 100_000, transferTax: 1_500, transactionCosts: 500, renovationCost: 5_000, effectiveAnnualRent: 11_400, annualOperatingCosts: 3_200, monthlyCashFlowAfterDebtService: 100, bankLoanAmount: 65_000, collateralValue: 85_000, collateralValueSource: "bank", rentalDemand: 4, resaleLiquidity: 4, locationRisk: 2, vacancyMonths: 0.5 }, 69],
  ["suuren remonttivaran kohde", { ...base, debtFreePrice: 100_000, transferTax: 1_500, transactionCosts: 500, renovationCost: 25_000, effectiveAnnualRent: 12_000, annualOperatingCosts: 3_500, monthlyCashFlowAfterDebtService: 50, bankLoanAmount: 80_000, collateralValue: 82_000, rentalDemand: 4, resaleLiquidity: 4, locationRisk: 2 }, 62],
  ["negatiivinen kassavirta ja vahva lyhennys", { ...base, debtFreePrice: 175_000, transferTax: 2_625, effectiveAnnualRent: 13_200, annualOperatingCosts: 3_900, monthlyCashFlowAfterDebtService: -80, bankLoanAmount: 125_000, annualBankLoanPrincipal: 7_500, repairHistoryScore: 85, technicalConditionScore: 80, rentalDemand: 4, resaleLiquidity: 4, locationRisk: 2, vacancyMonths: 0.5 }, 53],
  ["bullet-laina", { ...base, debtFreePrice: 145_000, transferTax: 2_175, effectiveAnnualRent: 12_600, annualOperatingCosts: 3_600, monthlyCashFlowAfterDebtService: 170, bankLoanAmount: 100_000, repaymentType: "bullet", loanTermYears: 3, annualBankLoanPrincipal: 0, repairHistoryScore: 75, technicalConditionScore: 75, rentalDemand: 4, resaleLiquidity: 4, locationRisk: 2, vacancyMonths: 0.5 }, 64],
  ["peruskohde", { ...base }, 60],
  ["neutraali vakuusasema", { ...base, debtFreePrice: 100_000, transferTax: 1_500, transactionCosts: 500, renovationCost: 5_000, collateralValue: 70_000, collateralValueSource: "calculated" }, 61],
];

test("kahdeksan Opportunity Score 2.0 -kalibrointikohdetta ovat deterministisiä", () => {
  for (const [name, input, expected] of calibrationCases) {
    const first = calculateOpportunityScoreV2(input);
    assert.equal(first.score, expected, name);
    assert.deepEqual(first, calculateOpportunityScoreV2(structuredClone(input)), name);
    assert.deepEqual(Object.keys(first.subScores), ["cashFlow", "riskAdjustedYield", "housingCompanyRisk", "valueCreation", "financing", "market"]);
  }
});

test("kuuden osa-alueen painot säilyvät 20/20/20/20/10/10", () => {
  const result = calculateOpportunityScoreV2(base);
  const expected = result.subScores.cashFlow * 0.2 + result.subScores.riskAdjustedYield * 0.2 + result.subScores.housingCompanyRisk * 0.2 + result.subScores.valueCreation * 0.2 + result.subScores.financing * 0.1 + result.subScores.market * 0.1;
  assert.ok(Math.abs(result.uncappedScore - expected) < 1e-12);
});

test("pistekäyrät ovat jatkuvia ankkuripisteiden ympärillä", () => {
  const anchors = [[-200, 0], [-100, 25], [0, 50], [100, 75], [200, 100]] as const;
  for (const [value] of anchors.slice(1, -1)) assert.ok(Math.abs(interpolateScore(value + 0.0001, anchors) - interpolateScore(value - 0.0001, anchors)) < 0.001);
});

test("taloyhtiöarvio käyttää jäljelle jääviä korjaus-, kunto-, velka-, koko- ja tonttitietoja", () => {
  const strong = calculateOpportunityScoreV2({ ...base, companyLoanShare: 0, repairHistoryScore: 90, technicalConditionScore: 90, apartmentCount: 50, landOwnership: "owned" });
  const weak = calculateOpportunityScoreV2({ ...base, companyLoanShare: 80_000, repairHistoryScore: 20, technicalConditionScore: 20, apartmentCount: 5, landOwnership: "leased", landLeaseEndDate: "2027-12-31" });
  assert.ok(strong.subScores.housingCompanyRisk > weak.subScores.housingCompanyRisk);
});

test("muuten identtinen omistustontti saa maltillisesti vuokratonttia paremman tonttiriskin", () => {
  const owned = calculateOpportunityScoreV2({ ...base, landOwnership: "owned" });
  const longLease = calculateOpportunityScoreV2({ ...base, landOwnership: "leased", landLeaseEndDate: "2066-12-31" });
  const shortLease = calculateOpportunityScoreV2({ ...base, landOwnership: "leased", landLeaseEndDate: "2030-12-31" });
  const increasedRent = calculateOpportunityScoreV2({ ...base, landOwnership: "leased", landLeaseEndDate: "2066-12-31", documentedLandRentIncrease: true });
  assert.ok(owned.subScores.housingCompanyRisk > longLease.subScores.housingCompanyRisk);
  assert.ok(longLease.subScores.housingCompanyRisk > shortLease.subScores.housingCompanyRisk);
  assert.ok(longLease.subScores.housingCompanyRisk > increasedRent.subScores.housingCompanyRisk);
  assert.equal(longLease.appliedCap, undefined);
  assert.equal(shortLease.appliedCap, undefined);
});

test("negatiiviseen kassavirtaan ei sovelleta vanhaa 54 pisteen automaattikattoa", () => {
  const result = calculateOpportunityScoreV2({ ...base, monthlyCashFlowAfterDebtService: -80, effectiveAnnualRent: 13_200, annualOperatingCosts: 3_900 });
  assert.equal(result.appliedCap, undefined);
  assert.equal(result.score, Math.round(result.uncappedScore));
});

test("vain kaksi todennettua vakavaa riskiä aktivoivat pistekatot", () => {
  const strong = { ...base, effectiveAnnualRent: 20_000, annualOperatingCosts: 1_000, monthlyCashFlowAfterDebtService: 300 };
  assert.equal(calculateOpportunityScoreV2({ ...strong, verifiedLongTermRentalProhibition: true }).score, 39);
  assert.equal(calculateOpportunityScoreV2({ ...strong, landLeaseEndDate: "2028-12-31", verifiedLandLeaseNonRenewal: true }).score, 49);
  assert.equal(calculateOpportunityScoreV2({ ...strong, landLeaseEndDate: "2028-12-31", verifiedLandLeaseNonRenewal: false }).appliedCap, undefined);
});

test("puuttuva vakuusarvo on neutraali eikä tee analyysistä alustavaa", () => {
  const result = calculateOpportunityScoreV2({ ...base, collateralValue: undefined, preliminary: false, missingData: [] });
  assert.equal(result.subScores.valueCreation, 50);
  assert.equal(result.reliability, "good");
});

test("poistetut kentät eivät näy käyttöliittymässä, analyysidatassa tai PDF:ssä", async () => {
  const files = await Promise.all([
    readFile(new URL("../src/components/property/assumptions-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/core/calculations/investment-analysis.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/investment-analysis-print-report.tsx", import.meta.url), "utf8"),
  ]);
  const combined = files.join("\n");
  for (const name of ["currentMarketValue", "postRenovationMarketValue", "futureRepairCost", "housingCompanyLiquidityMonths", "companyLoanAnnualInterestRate", "companyLoanRemainingTermYears", "companyLoanInterestOnlyEndYear", "projectedFinancingFeeMonthly"]) assert.doesNotMatch(combined, new RegExp(name));
  assert.doesNotMatch(files[0], /Arvonluonti ja taloyhtiön talous/);
  assert.match(files[0], /D\. Markkina-arviot/);
});

test("käyttöliittymä ja PDF eivät paljasta osa-alueiden pisteitä tai teknisiä pistekattoja", async () => {
  const [workspace, scoreCard, report] = await Promise.all([
    readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/investment-overall-score.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/investment-analysis-print-report.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(workspace, /const overallScore = adaptInvestmentScore\(scoreSource\)/);
  assert.match(scoreCard, /Vahvuudet/);
  assert.match(scoreCard, /Riskit/);
  assert.doesNotMatch(scoreCard + report, /subScores|appliedScoreCap|uncappedScore|Pisteiden muodostuminen|Opportunity Score 2\.0 – osa-alueet/);
});
