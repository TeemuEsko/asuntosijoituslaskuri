import assert from "node:assert/strict";
import test from "node:test";
import { calculateInvestmentAnalysis } from "../src/core/calculations/investment-analysis.ts";
import {
  assessmentConfidenceWeight,
  overrideEstimatedChoice,
  resolveLocationRisk,
  resolveMarketAssessments,
  resolveRentalDemand,
  resolveResaleLiquidity,
  restoreAutomaticChoice,
} from "../src/core/market-assessment/model.ts";

const generatedAt = "2026-07-31T10:00:00.000Z";

test("vuokrakysyntä muodostaa automaattisen arvon ja säilyttää lähteen sekä luotettavuuden", () => {
  const choice = resolveRentalDemand({ city: "Esimerkkikunta", postalCode: "00100", roomDescription: "2h+k", areaSqm: 48, statisticalRentAvailable: true, generatedAt });
  assert.equal(choice.source, "automatic");
  assert.equal(choice.userOverridden, false);
  assert.ok(choice.automaticValue !== null);
  assert.equal(choice.effectiveValue, choice.automaticValue);
  assert.notEqual(choice.confidence, "unknown");
  assert.match(choice.sourceName, /Tilastolliset kysyntätekijät/);
  assert.ok(choice.factors.some((factor) => factor.source === "statistics"));
});

test("käyttäjän valinta yliajaa arvon ja automaattinen arvio voidaan palauttaa", () => {
  const automatic = resolveRentalDemand({ city: "Esimerkkikunta", roomDescription: "1h+kk", areaSqm: 31, generatedAt });
  const overridden = overrideEstimatedChoice(automatic, 1);
  assert.equal(overridden.automaticValue, automatic.automaticValue);
  assert.equal(overridden.effectiveValue, 1);
  assert.equal(overridden.source, "user");
  assert.equal(overridden.userOverridden, true);
  const restored = restoreAutomaticChoice(overridden);
  assert.equal(restored.effectiveValue, automatic.automaticValue);
  assert.equal(restored.source, "automatic");
  assert.equal(restored.userOverridden, false);
  assert.equal(assessmentConfidenceWeight({ ...overridden, confidence: "unknown" }), 1);
});

test("väestö- ja työllisyystekijät muuttavat sijaintiriskiä", () => {
  const strong = resolveLocationRisk({ city: "Esimerkkikunta", official: { populationChangePercent: 2, netMigrationRate: 1, employmentRate: 75, unemploymentRate: 6, employerConcentration: "low" }, generatedAt });
  const weak = resolveLocationRisk({ city: "Esimerkkikunta", official: { populationChangePercent: -2, netMigrationRate: -1, employmentRate: 60, unemploymentRate: 15, employerConcentration: "high" }, generatedAt });
  assert.ok(strong.effectiveValue! < weak.effectiveValue!);
  assert.equal(strong.confidence, "medium");
  assert.equal(weak.confidence, "medium");
});

test("puuttuva työnantajadata ei kaada arviota ja laskee luotettavuutta", () => {
  const choice = resolveLocationRisk({ city: "Esimerkkikunta", generatedAt });
  assert.equal(choice.effectiveValue, 3);
  assert.equal(choice.confidence, "low");
  assert.ok(choice.factors.some((factor) => factor.id === "employer-data-missing"));
});

test("toteutuneet kaupat vaikuttavat jälleenmyytävyyteen ja portaali pysyy ilmoitussignaalina", () => {
  const statistical = resolveResaleLiquidity({ city: "Esimerkkikunta", roomDescription: "2h+k", areaSqm: 50, buildingType: "Kerrostalo", official: { realisedTransactions: 150, transactionVolumeTrendPercent: 4 }, generatedAt });
  const portal = resolveResaleLiquidity({ city: "Esimerkkikunta", roomDescription: "2h+k", areaSqm: 50, portal: { sourceName: "Sallittu ilmoitusrajapinta", permitted: true, comparableSaleListings: 12, estimatedSaleListingDays: 35, housingCompanyListingHistoryCount: 4 }, generatedAt });
  assert.ok(statistical.effectiveValue! >= 4);
  assert.ok(statistical.factors.some((factor) => factor.id === "realised-transactions"));
  assert.ok(portal.factors.some((factor) => factor.description.includes("ei toteutunutta kauppaa")));
});

test("puuttuva taloyhtiöhistoria ei estä jälleenmyytävyysarviota", () => {
  const choice = resolveResaleLiquidity({ buildingType: "Rivitalo", roomDescription: "3h+k", areaSqm: 74, generatedAt });
  assert.ok(choice.automaticValue !== null);
  assert.ok(choice.factors.some((factor) => factor.id === "housing-company-history-missing"));
});

test("heikon luotettavuuden automaattiarvio vaikuttaa scoreen käyttäjän valintaa vähemmän", () => {
  const input = { debtFreePrice: 120_000, salePrice: 120_000, monthlyRent: 900, maintenanceFeeMonthly: 300, financingFeeMonthly: 0, vacancyMonths: 1, bankLoanAmount: 90_000, annualInterestRate: 4, loanTermYears: 20, repaymentType: "annuity" as const, repairHistoryKnown: true, repairRiskScore: 60 };
  const base = resolveMarketAssessments({ city: "Esimerkkikunta", generatedAt });
  const lowAutomatic = { ...base, rentalDemand: { ...base.rentalDemand, automaticValue: 5 as const, effectiveValue: 5 as const, confidence: "low" as const } };
  const userConfirmed = { ...lowAutomatic, rentalDemand: overrideEstimatedChoice(lowAutomatic.rentalDemand, 5) };
  const lowScore = calculateInvestmentAnalysis({ ...input, rentalDemand: 5, marketAssessments: lowAutomatic }).score;
  const userScore = calculateInvestmentAnalysis({ ...input, rentalDemand: 5, marketAssessments: userConfirmed }).score;
  assert.ok(userScore >= lowScore);
});
