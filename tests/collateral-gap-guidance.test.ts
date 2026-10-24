import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  COLLATERAL_GAP_GUIDANCE,
  getCollateralGapGuidance,
} from "../src/core/analysis/collateral-gap-guidance.ts";
import { stepAnalysisNumericValue } from "../src/core/analysis/numeric-input-stepping.ts";
import { calculateInvestmentAnalysis } from "../src/core/calculations/investment-analysis.ts";

test("positiivinen vakuusvaje näyttää toimintaohjeen", () => {
  const analysis = calculateInvestmentAnalysis({ bankLoanAmount: 52_780, collateralValue: 36_400 });
  assert.equal(analysis.collateralShortfall, 16_380);
  assert.equal(getCollateralGapGuidance(analysis.collateralShortfall), COLLATERAL_GAP_GUIDANCE);
});

test("lisävakuus perustuu vain pankkilainan ja hyväksytyn vakuusarvon erotukseen", () => {
  const first = calculateInvestmentAnalysis({ bankLoanAmount: 100_000, collateralValue: 70_000, equity: 20_000, companyLoanShare: 45_000 });
  const moreEquity = calculateInvestmentAnalysis({ bankLoanAmount: 100_000, collateralValue: 70_000, equity: 50_000, companyLoanShare: 0 });
  assert.equal(first.collateralShortfall, 30_000);
  assert.equal(moreEquity.collateralShortfall, 30_000);
  assert.match(COLLATERAL_GAP_GUIDANCE, /Lisävakuuden tarve suunnitellulle pankkilainalle/);
  assert.doesNotMatch(COLLATERAL_GAP_GUIDANCE, /sijoitettu oma pääoma/i);
});

test("nolla tai negatiivinen vakuusvaje ei näytä toimintaohjetta", () => {
  assert.equal(getCollateralGapGuidance(0), undefined);
  assert.equal(getCollateralGapGuidance(-1), undefined);
  assert.equal(getCollateralGapGuidance(undefined), undefined);
});

test("vakuusarvon nuolinäppäinmuutos päivittyy analyysimoottorin kautta", () => {
  const bankLoanAmount = 52_780;
  const initial = calculateInvestmentAnalysis({ bankLoanAmount, collateralValue: 36_400 });
  const steppedCollateral = stepAnalysisNumericValue("collateralValue", "36 400", 1);
  const updated = calculateInvestmentAnalysis({ bankLoanAmount, collateralValue: steppedCollateral });
  const covered = calculateInvestmentAnalysis({ bankLoanAmount, collateralValue: bankLoanAmount });

  assert.equal(steppedCollateral, 37_400);
  assert.equal(initial.collateralShortfall, 16_380);
  assert.equal(updated.collateralShortfall, 15_380);
  assert.equal(getCollateralGapGuidance(updated.collateralShortfall), COLLATERAL_GAP_GUIDANCE);
  assert.equal(covered.collateralShortfall, 0);
  assert.equal(getCollateralGapGuidance(covered.collateralShortfall), undefined);
});

test("vakuusyhteenveto liittää hillityn ohjeen analyysin vakuusvajeeseen", async () => {
  const source = await readFile(new URL("../src/components/property/financial-overview-card.tsx", import.meta.url), "utf8");
  assert.match(source, /getCollateralGapGuidance\(analysis\.collateralShortfall\)/);
  assert.match(source, /label: collateralTitle, value: money\(collateralAmount\), note: collateralNote/);
  assert.match(source, /text-xs leading-relaxed text-muted-foreground/);
});
