import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  NET_RENTAL_YIELD_THRESHOLDS,
  classifyNetRentalYield,
  type NetRentalYieldClassification,
} from "../src/core/analysis/net-rental-yield.ts";
import {
  metricCardState,
  type MetricCardStatus,
} from "../src/core/analysis/metric-card-status.ts";
import {
  calculateInvestmentAnalysis,
  netYieldScore,
} from "../src/core/calculations/investment-analysis.ts";
import { buildAnalysisReportData } from "../src/core/reports/analysis-report.ts";
import { evaluateInvestmentObservations } from "../src/core/rules/investment-observations.ts";
import { formatFinnishNumber } from "../src/core/parser/normalization.ts";

const boundaries: ReadonlyArray<
  readonly [number, NetRentalYieldClassification, MetricCardStatus]
> = [
  [4.99, "Heikko", "negative"],
  [5, "Välttävä", "warning"],
  [6.49, "Välttävä", "warning"],
  [6.5, "Kohtalainen / alle tavoitetason", "warning"],
  [7.99, "Kohtalainen / alle tavoitetason", "warning"],
  [8, "Hyvä", "positive"],
  [9.99, "Hyvä", "positive"],
  [10, "Erittäin hyvä", "positive"],
];

const analysisInput = (monthlyRent: number) => ({
  debtFreePrice: 120_000,
  salePrice: 120_000,
  monthlyRent,
  maintenanceFeeMonthly: 0,
  financingFeeMonthly: 0,
  otherCostsMonthly: 0,
  vacancyMonths: 0,
  bankLoanAmount: 0,
  annualInterestRate: 4.5,
  loanTermYears: 20,
  repaymentType: "annuity" as const,
  collateralValue: 120_000,
  repairRiskScore: 60,
  repairHistoryKnown: true,
});

const yieldObservations = (netYield: number) =>
  evaluateInvestmentObservations({
    netYield,
    vacancyMonths: 0,
    repairHistoryKnown: true,
    loanKnown: true,
  });

test("nettovuokratuoton rajat ja luokittelu ovat keskitettyjä", () => {
  assert.deepEqual(NET_RENTAL_YIELD_THRESHOLDS, {
    poor: 5,
    moderate: 6.5,
    good: 8,
    excellent: 10,
  });
  for (const [value, classification, status] of boundaries) {
    assert.equal(
      classifyNetRentalYield(value),
      classification,
      `${value} % luokittelu`,
    );
    assert.equal(
      metricCardState("netRentalYield", value).statusLabel,
      classification,
      `${value} % web-label`,
    );
    assert.equal(
      metricCardState("netRentalYield", value).status,
      status,
      `${value} % väritila`,
    );
  }
  assert.equal(classifyNetRentalYield(Number.NaN), undefined);
  assert.equal(classifyNetRentalYield(Number.POSITIVE_INFINITY), undefined);
  assert.equal(formatFinnishNumber(7.99, 2), "7,99");
});

test("nettovuokratuoton score nousee asteittain ilman 8 prosentin rajahyppyä", () => {
  assert.equal(netYieldScore(5), 40);
  assert.equal(netYieldScore(6.5), 60);
  assert.equal(netYieldScore(8), 80);
  assert.equal(netYieldScore(10), 100);
  const values = boundaries.map(([value]) => netYieldScore(value));
  for (let index = 1; index < values.length; index += 1)
    assert.ok(values[index]! >= values[index - 1]!);
  assert.ok(netYieldScore(8) - netYieldScore(7.99) < 0.25);
});

test("alle 8 prosentin tuotto ei ole vahvuus, mutta hyvä ja erittäin hyvä tuotto ovat", () => {
  const weak = yieldObservations(4.99);
  const acceptable = yieldObservations(5);
  const belowTarget = yieldObservations(7.99);
  const good = yieldObservations(8);
  const nearlyExcellent = yieldObservations(9.99);
  const excellent = yieldObservations(10);

  assert.ok(
    weak.some((item) => item.id === "low-net-yield" && item.type === "risk"),
  );
  assert.ok(!acceptable.some((item) => item.id === "low-net-yield"));
  assert.ok(
    !belowTarget.some(
      (item) => item.category === "yield" && item.type === "strength",
    ),
  );
  assert.ok(
    !belowTarget.some((item) => /Hyvä nettovuokratuotto/.test(item.title)),
  );
  assert.ok(
    good.some(
      (item) =>
        item.id === "good-net-yield" &&
        item.title === "Hyvä nettovuokratuotto" &&
        item.scoreImpact === 0,
    ),
  );
  assert.ok(
    nearlyExcellent.some(
      (item) =>
        item.id === "good-net-yield" && item.title === "Hyvä nettovuokratuotto",
    ),
  );
  assert.ok(
    excellent.some(
      (item) =>
        item.id === "excellent-net-yield" &&
        item.title === "Erittäin hyvä nettovuokratuotto" &&
        item.scoreImpact === 0,
    ),
  );
});

test("canonical analyysi säilyttää laskentakaavan ja käyttää uutta luokitusta ilman score-hyppyä", () => {
  const belowTarget = calculateInvestmentAnalysis(analysisInput(799));
  const good = calculateInvestmentAnalysis(analysisInput(800));
  const excellent = calculateInvestmentAnalysis(analysisInput(1_000));

  assert.equal(belowTarget.netRentalYield, 7.99);
  assert.equal(good.netRentalYield, 8);
  assert.equal(excellent.netRentalYield, 10);
  assert.equal(
    belowTarget.netRentalYieldClassification,
    "Kohtalainen / alle tavoitetason",
  );
  assert.equal(good.netRentalYieldClassification, "Hyvä");
  assert.equal(excellent.netRentalYieldClassification, "Erittäin hyvä");
  assert.ok(
    !(belowTarget.positiveFactors ?? []).some((item) =>
      /Hyvä nettovuokratuotto/.test(item),
    ),
  );
  assert.ok(
    (good.positiveFactors ?? []).some((item) =>
      /Hyvä nettovuokratuotto/.test(item),
    ),
  );
  assert.ok(
    (excellent.positiveFactors ?? []).some((item) =>
      /Erittäin hyvä nettovuokratuotto/.test(item),
    ),
  );
  assert.ok(Math.abs(good.score - belowTarget.score) <= 1);

  const formulaCheck = calculateInvestmentAnalysis({
    ...analysisInput(1_000),
    maintenanceFeeMonthly: 300,
    financingFeeMonthly: 100,
    otherCostsMonthly: 50,
    vacancyMonths: 1,
  });
  assert.equal(formulaCheck.effectiveAnnualRent, 11_000);
  assert.ok(
    Math.abs(formulaCheck.netRentalYield! - (5_600 / 120_000) * 100) < 1e-12,
  );
});

test("heikko nettovuokratuotto säilyttää sijoitusscoren turvarajan", () => {
  const weak = calculateInvestmentAnalysis({
    ...analysisInput(1_200),
    debtFreePrice: 300_000,
    salePrice: 300_000,
    maintenanceFeeMonthly: 100,
    collateralValue: 300_000,
    repairRiskScore: 100,
    rentalDemand: 5,
    locationRisk: 1,
    resaleLiquidity: 5,
  });
  assert.equal(weak.netRentalYieldClassification, "Heikko");
  assert.ok(weak.score <= 59);
});

test("nykyinen raportti ja analyysidata käyttävät samaa canonical luokitusta kuin web-analyysi", async () => {
  for (const [monthlyRent, expectedClassification] of [
    [799, "Kohtalainen / alle tavoitetason"],
    [800, "Hyvä"],
    [1_000, "Erittäin hyvä"],
  ] as const) {
    const input = analysisInput(monthlyRent);
    const analysis = calculateInvestmentAnalysis(input);
    const report = buildAnalysisReportData(input, analysis);
    assert.deepEqual(report.analysis, analysis);
    assert.equal(
      report.analysis.netRentalYieldClassification,
      expectedClassification,
    );
    assert.equal(
      report.analysis.netRentalYieldClassification,
      metricCardState("netRentalYield", report.analysis.netRentalYield)
        .statusLabel,
    );
  }

  const [workspace, reports, offerPrice] = await Promise.all([
    readFile(
      new URL(
        "../src/components/property/property-workspace.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../src/components/property/reports-card.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../src/components/property/offer-price-card.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  assert.match(workspace, /<KeyMetrics analysis=\{overallScore\}/);
  assert.match(workspace, /<ReportsCard/);
  assert.match(reports, /window\.print\(\)/);
  assert.match(reports, /Tulosta tai tallenna PDF/);
  assert.doesNotMatch(reports, /Lataa analyysidata/);
  assert.equal(reports.match(/Tulosta tai tallenna PDF/g)?.length, 1);
  assert.equal(reports.match(/Lataa analyysidata/g)?.length, undefined);
  assert.match(
    offerPrice,
    /useState<number>\(NET_RENTAL_YIELD_THRESHOLDS\.good\)/,
  );
  const summary = await readFile(
    new URL("../src/components/property/analysis-summary.tsx", import.meta.url),
    "utf8",
  );
  assert.match(summary, /percent\(analysis\.netRentalYield, 2\)/);
});
