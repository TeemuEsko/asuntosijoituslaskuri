import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { missingCriticalAnalysisFields } from "../src/core/analysis/analysis-entry.ts";

const complete = { debtFreePrice: 120_000, maintenanceFeeMonthly: 280, monthlyRent: 850, annualInterestRate: 4.5, loanTermYears: 20, vacancyMonths: 1, companyLoanShare: 0, financingFeeKnown: true };

test("puuttuvien kriittisten tietojen lista muodostuu vain unknown-arvoista", () => {
  assert.deepEqual(missingCriticalAnalysisFields(complete), []);
  assert.deepEqual(missingCriticalAnalysisFields({ ...complete, monthlyRent: undefined, annualInterestRate: undefined }), ["Kuukausivuokra", "Pankkilainan korko"]);
  assert.deepEqual(missingCriticalAnalysisFields({ ...complete, companyLoanShare: 20_000, financingFeeKnown: false }), ["Rahoitusvastike"]);
});

test("parseriyhteenveto edeltää scorea ja score on readiness-ehdon takana", async () => {
  const workspace = await readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8");
  const summary = await readFile(new URL("../src/components/property/parser-analysis-summary.tsx", import.meta.url), "utf8");
  assert.ok(workspace.indexOf("<ParserAnalysisSummary") < workspace.indexOf("<InvestmentOverallScore"));
  assert.match(workspace, /analysisReady \? <><InvestmentOverallScore/);
  assert.match(summary, /missingFields\.map/);
  assert.ok(summary.includes("Löysimme") && summary.includes("found") && summary.includes("criticalFields.length"));
  assert.match(summary, /Parserin luotettavuus/);
});
