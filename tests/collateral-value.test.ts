import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAutomaticCollateralValue,
  DEFAULT_COLLATERAL_PERCENTAGE,
} from "../src/core/calculations/collateral-value.ts";

test("vakuusarvon oletusprosentti on 70", () => {
  assert.equal(DEFAULT_COLLATERAL_PERCENTAGE, 70);
});

test("yhtiölaina vähennetään velattomasta hinnasta lasketusta vakuusarvosta", () => {
  assert.equal(
    calculateAutomaticCollateralValue({
      debtFreePrice: 38_000,
      companyLoanShare: 14_318,
      collateralPercentage: 70,
    }),
    12_282,
  );
  assert.equal(
    calculateAutomaticCollateralValue({
      debtFreePrice: 38_000,
      companyLoanShare: 14_318,
      collateralPercentage: 80,
    }),
    16_082,
  );
});

test("lainattoman kohteen vakuusarvo perustuu prosenttiin eikä arvo alita nollaa", () => {
  assert.equal(
    calculateAutomaticCollateralValue({
      debtFreePrice: 100_000,
      companyLoanShare: 0,
      collateralPercentage: 70,
    }),
    70_000,
  );
  assert.equal(
    calculateAutomaticCollateralValue({
      debtFreePrice: 10_000,
      companyLoanShare: 20_000,
      collateralPercentage: 70,
    }),
    0,
  );
});

test("työtila säilyttää käyttäjän override-arvon ja tarjoaa automaattisen arvion palautuksen", async () => {
  const workspace = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8"),
  );
  const assumptions = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../src/components/property/assumptions-card.tsx", import.meta.url), "utf8"),
  );
  assert.match(workspace, /assumptionStatuses\.collateralValue !== "user"/);
  assert.match(workspace, /function resetCollateral/);
  assert.match(assumptions, /Palauta automaattinen arvio/);
});
