import assert from "node:assert/strict";
import test from "node:test";
import { calculateInvestmentAnalysis } from "../src/core/calculations/investment-analysis.ts";
import {
  assessmentConfidenceWeight,
  MARKET_ASSESSMENT_DEFAULT_EXPLANATION,
  overrideEstimatedChoice,
  resolveLocationRisk,
  resolveMarketAssessments,
  resolveRentalDemand,
  resolveResaleLiquidity,
  restoreAutomaticChoice,
  type AssessmentEvidence,
} from "../src/core/market-assessment/model.ts";

const generatedAt = "2026-10-16T10:00:00.000Z";
const evidence: AssessmentEvidence = { publisher: "Tilastokeskus / StatFin", datasetId: "11ra", datasetName: "Tunnuslukuja väestöstä", period: "2025", area: "Vaasa", areaLevel: "municipality", license: "CC BY 4.0" };

test("dataa vailla oleva arvio on 3/5-oletus eikä automaattinen arvio", () => {
  for (const choice of Object.values(resolveMarketAssessments({ city: "Vaasa", generatedAt }))) {
    assert.equal(choice.effectiveValue, 3);
    assert.equal(choice.automaticValue, 3);
    assert.equal(choice.source, "default");
    assert.equal(choice.confidence, "unknown");
    assert.equal(choice.sourceName, MARKET_ASSESSMENT_DEFAULT_EXPLANATION);
  }
});

test("vuokratilasto näkyy vain kontekstina eikä muutu kysyntäluokitukseksi", () => {
  const choice = resolveRentalDemand({ city: "Vaasa", statisticalRentAvailable: true, rentEvidence: { ...evidence, datasetId: "15fa", datasetName: "Keskineliövuokrat", period: "2026Q2" }, generatedAt });
  assert.equal(choice.source, "default");
  assert.equal(choice.effectiveValue, 3);
  assert.equal(choice.confidence, "unknown");
  assert.ok(choice.factors.some((factor) => factor.evidence?.datasetId === "15fa"));
});

test("kuntatason väestömuutos ei yksin muuta sijaintiriskiä", () => {
  const positive = resolveLocationRisk({ city: "Vaasa", official: { populationChangePercent: 2, populationEvidence: evidence }, generatedAt });
  const negative = resolveLocationRisk({ city: "Vaasa", official: { populationChangePercent: -2, populationEvidence: evidence }, generatedAt });
  assert.equal(positive.effectiveValue, 3);
  assert.equal(negative.effectiveValue, 3);
  assert.equal(positive.source, "default");
  assert.match(positive.factors[0]!.description, /ei riitä/);
});

test("toteutunut kauppamäärä näytetään lähteineen mutta myyntiaikaa ei keksitä", () => {
  const choice = resolveResaleLiquidity({ city: "Vaasa", official: { realisedTransactions: 150, transactionEvidence: { ...evidence, datasetId: "13mx", datasetName: "Vanhojen osakeasuntojen kauppojen lukumäärät" } }, generatedAt });
  assert.equal(choice.effectiveValue, 3);
  assert.equal(choice.source, "default");
  assert.ok(choice.factors.some((factor) => factor.evidence?.datasetId === "13mx"));
  assert.ok(choice.factors.some((factor) => factor.id === "sale-time-unavailable"));
  assert.doesNotMatch(choice.factors.map((factor) => factor.description).join(" "), /\d+–\d+ päivää/);
});

test("käyttäjän valinta ohittaa oletuksen ja palautus palauttaa neutraalin oletuksen", () => {
  const fallback = resolveRentalDemand({ city: "Vaasa", generatedAt });
  const overridden = overrideEstimatedChoice(fallback, 1);
  assert.equal(overridden.effectiveValue, 1);
  assert.equal(overridden.source, "user");
  assert.equal(assessmentConfidenceWeight(overridden), 1);
  const restored = restoreAutomaticChoice(overridden);
  assert.equal(restored.effectiveValue, 3);
  assert.equal(restored.source, "default");
  assert.equal(assessmentConfidenceWeight(restored), 0);
});

test("oletus ei lisää markkina-arvioiden painoa sijoituspisteisiin", () => {
  const input = { debtFreePrice: 120_000, salePrice: 120_000, monthlyRent: 900, maintenanceFeeMonthly: 300, financingFeeMonthly: 0, vacancyMonths: 1, bankLoanAmount: 90_000, annualInterestRate: 4, loanTermYears: 20, repaymentType: "annuity" as const, repairHistoryKnown: true, repairRiskScore: 60 };
  const defaults = resolveMarketAssessments({ city: "Vaasa", generatedAt });
  const user = { ...defaults, locationRisk: overrideEstimatedChoice(defaults.locationRisk, 5) };
  const defaultScore = calculateInvestmentAnalysis({ ...input, marketAssessments: defaults }).score;
  const userScore = calculateInvestmentAnalysis({ ...input, marketAssessments: user }).score;
  assert.ok(userScore <= defaultScore);
});
