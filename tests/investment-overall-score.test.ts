import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { adaptInvestmentScore } from "../src/core/analysis/investment-score-adapter.ts";
import { clampInvestmentScore, gaugePoint, getInvestmentRating } from "../src/core/analysis/investment-overall-score.ts";

test("pisterajat mapitetaan arvosanoihin", () => {
  const cases = [[100, "A+"], [90, "A+"], [89, "A"], [80, "A"], [79, "B"], [70, "B"], [69, "C"], [60, "C"], [59, "D"], [45, "D"], [44, "E"], [0, "E"]] as const;
  for (const [score, grade] of cases) assert.equal(getInvestmentRating(score).grade, grade);
});

test("virheelliset pisteet clampataan turvallisesti", () => {
  assert.equal(clampInvestmentScore(-10), 0);
  assert.equal(clampInvestmentScore(125), 100);
  assert.equal(clampInvestmentScore(Number.NaN), 0);
  assert.equal(clampInvestmentScore(undefined), 0);
});

test("markeri liikkuu jatkuvasti kaarella ja pysyy viewBoxissa", () => {
  const points = [gaugePoint(0), gaugePoint(50), gaugePoint(82), gaugePoint(100)];
  assert.equal(new Set(points.map(({ x, y }) => `${x},${y}`)).size, 4);
  for (const point of points) {
    assert.ok(point.x >= 0 && point.x <= 220);
    assert.ok(point.y >= 0 && point.y <= 162);
  }
});

test("adapteri käyttää nykyisiä analyysitietoja ja tuottaa neljä osa-arviota", () => {
  const strong = adaptInvestmentScore({ debtFreePrice: 100_000, currentRentMonthly: 750, maintenanceFeeMonthly: 200, financingFeeMonthly: 0, companyLoanShare: 0 });
  const weak = adaptInvestmentScore({ debtFreePrice: 200_000, currentRentMonthly: 500, maintenanceFeeMonthly: 350, financingFeeMonthly: 200, companyLoanShare: 120_000 });
  assert.ok(strong.score > weak.score);
  assert.deepEqual(Object.keys(strong.subScores ?? {}), ["yield", "cashFlow", "housingCompanyRisk", "financing"]);
});

test("komponentin sisältö, saavutettavuus ja responsiivisuus säilyvät", async () => {
  const component = await readFile(new URL("../src/components/property/investment-overall-score.tsx", import.meta.url), "utf8");
  for (const text of ["Kohteen kokonaisarvio", "Näytä, mistä arvio muodostuu", "Arviota parantavat tekijät", "Huomioitavat riskit", "Tuotto", "Kassavirta", "Taloyhtiö ja remonttiriskit", "Rahoitus ja vakuudet"]) assert.ok(component.includes(text));
  assert.match(component, /aria-label=.*pistettä sadasta/);
  assert.match(component, /viewBox="0 0 220 162"/);
  assert.match(component, /max-w-full/);
  assert.match(component, /grid-cols-1/);
  assert.match(component, /md:grid-cols-2/);
  assert.doesNotMatch(component, /PropertyOS|Alma Risk Rating|liikennevalorating/);
});

test("puuttuvat osa-arviot ja tyhjät seliteosiot jätetään renderöimättä", async () => {
  const component = await readFile(new URL("../src/components/property/investment-overall-score.tsx", import.meta.url), "utf8");
  assert.match(component, /subScores\[key\] \? \[\{/);
  assert.match(component, /filter\(\(group\) => group\.items\.length\)/);
  assert.match(component, /renderedSubScores\.length \?/);
  assert.match(component, /factorGroups\.length \?/);
});

test("vanha riskiesikatselu on poistettu analyysinäkymästä", async () => {
  const workspace = await readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(workspace, /RiskPreviewCard|risk-preview-card/);
  assert.match(workspace, /adaptInvestmentScore/);
  assert.match(workspace, /<InvestmentOverallScore \{\.\.\.overallScore\}/);
});
