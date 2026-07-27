import assert from "node:assert/strict";
import test from "node:test";

import {
  effectiveFinancingFeeMonthly,
  effectiveFinancingFeeMonthlyOrNull,
  expectedDebtFreePrice,
  expectedDebtFreePriceOrNull,
  pricesAreConsistent,
  purchaseCalculationDefinitions,
} from "../src/core/calculations/purchase-price.ts";

test("velaton hinta lasketaan ja pyöristetään sentin tarkkuuteen", () => {
  assert.equal(expectedDebtFreePrice(79_000.105, 2_000.105), 81_000.21);
  assert.equal(pricesAreConsistent(79_001, 79_000, 0), true);
  assert.equal(pricesAreConsistent(79_001.01, 79_000, 0), false);
});

test("puuttuvaa hintatietoa ei korvata nollalla", () => {
  assert.equal(expectedDebtFreePriceOrNull(null, 0), null);
  assert.equal(expectedDebtFreePriceOrNull(79_000, null), null);
});

test("laskennallinen rahoitusvastike on nolla ilman yhtiölainaa", () => {
  assert.equal(effectiveFinancingFeeMonthly(0, 145), 0);
  assert.equal(effectiveFinancingFeeMonthlyOrNull(0, null), 0);
  assert.equal(effectiveFinancingFeeMonthlyOrNull(null, 145), null);
  assert.equal(effectiveFinancingFeeMonthlyOrNull(10_000, null), null);
});

test("jokaisella laskettavalla rahaluvulla on täydet metatiedot", () => {
  assert.equal(purchaseCalculationDefinitions.length, 2);
  for (const definition of purchaseCalculationDefinitions) {
    assert.ok(definition.name);
    assert.ok(definition.formula);
    assert.ok(definition.inputs.length > 0);
    assert.ok(definition.includes);
    assert.ok(definition.excludes);
    assert.ok(definition.unit);
    assert.ok(definition.rounding);
    assert.ok(definition.missingData);
  }
});
