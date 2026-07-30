import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateInvestmentAnalysis } from "../src/core/calculations/investment-analysis.ts";
import { buildAnalysisReportData } from "../src/core/reports/analysis-report.ts";
import { aggregateVisualCondition, confirmVisualCondition, visualConditionScoreImpact } from "../src/core/visual-condition/analysis.ts";
import { REPORT_VISUAL_CONDITION_DISCLAIMER } from "../src/core/visual-condition/types.ts";
import { baseInvestment } from "./fixtures/parity-fixtures.ts";
import { visualConditionScenarios } from "./fixtures/visual-condition-fixtures.ts";

test("vahvistettu visuaalinen arvio vaikuttaa pisteeseen rajatusti mutta ei taloyhtiöriskin osapisteeseen", () => {
  const visual = confirmVisualCondition(aggregateVisualCondition({ ...visualConditionScenarios.bathroomRisk, images: [...visualConditionScenarios.bathroomRisk.images], observations: [...visualConditionScenarios.bathroomRisk.observations], imageCount: 1, areaSqm: 60, expectedRooms: 1, sourceDisclaimerAccepted: true }));
  const baseline = calculateInvestmentAnalysis(baseInvestment);
  const withVisual = calculateInvestmentAnalysis({ ...baseInvestment, renovationReserve: visual.estimatedRenovationCostRange?.recommendedReserve, visualConditionScoreImpact: visualConditionScoreImpact(visual), visualConditionConfirmed: true, visualConditionConfidence: visual.overallConfidence, visualConditionRating: visual.overallRating });
  assert.ok(Math.abs(withVisual.score - baseline.score) <= 4); assert.ok(withVisual.subScores?.housingCompanyRisk && baseline.subScores?.housingCompanyRisk); assert.equal(withVisual.subScores!.housingCompanyRisk!.score, baseline.subScores!.housingCompanyRisk!.score); assert.ok(withVisual.observations.some((item) => item.category === "apartmentCondition"));
});

test("raportti sisältää vahvistetut kuvahavainnot, lähdehistorian ja raportin vastuuvapautuksen ilman kuvatiedostoja", () => {
  const visual = confirmVisualCondition(aggregateVisualCondition({ ...visualConditionScenarios.multipleRooms, images: [...visualConditionScenarios.multipleRooms.images], observations: [...visualConditionScenarios.multipleRooms.observations], imageCount: 3, areaSqm: 60, expectedRooms: 3, sourceDisclaimerAccepted: true }));
  const analysis = calculateInvestmentAnalysis(baseInvestment); const report = buildAnalysisReportData(baseInvestment, analysis, {}, undefined, visual);
  assert.equal(report.visualCondition?.disclaimer, REPORT_VISUAL_CONDITION_DISCLAIMER); assert.equal(report.visualCondition?.analysis.observations.length, 2); assert.match(JSON.stringify(report), /sourceHistory/); assert.doesNotMatch(JSON.stringify(report), /data:image|previewUrl|image\/jpeg/);
});

test("käyttöliittymä sisältää valinnan, rajaukset, etenemisen, muokkauksen ja virhetilat", async () => {
  const [component, workspace, route, docs, types] = await Promise.all([
    readFile(new URL("../src/components/property/visual-condition-card.tsx", import.meta.url), "utf8"), readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8"), readFile(new URL("../src/app/api/visual-condition/route.ts", import.meta.url), "utf8"), readFile(new URL("../docs/visual-condition-analysis.md", import.meta.url), "utf8"), readFile(new URL("../src/core/visual-condition/types.ts", import.meta.url), "utf8")
  ]);
  for (const text of ["Valokuvien perusteella arvioitu kunto", "Kuvia ei tallenneta", "Analysoidaan kuvia", "Hyväksy havainnot analyysiin", "Lisää oma havainto", "Kuvakohtainen yhteenveto", "Yritä uudelleen"]) assert.ok(component.includes(text));
  assert.ok(types.includes("Arvio ei korvaa kuntotarkastusta")); assert.match(component, /UI_VISUAL_CONDITION_DISCLAIMER/);
  for (const code of ["NO_IMAGES", "IMAGE_ACCESS_DENIED", "UNSUPPORTED_FORMAT", "IMAGE_TOO_LARGE", "IMAGE_TOO_SMALL", "IMAGE_ANALYSIS_FAILED", "LOW_IMAGE_QUALITY", "NO_ANALYSABLE_CONTENT", "SAFETY_FILTERED", "TIMEOUT"]) assert.ok((component + route + docs + types).includes(code));
  assert.match(workspace, /visualConditionScoreImpact/); assert.match(workspace, /renovationReserveUserEdited/); assert.doesNotMatch(route, /listingUrl|imageUrl|fetch\([^"']*etuovi|oikotie/i); assert.match(docs, /housingCompanyTechnicalCondition/);
});
