import test from "node:test";
import assert from "node:assert/strict";
import { defaultEquityAssumption, userEquityAssumption } from "../src/core/analysis/equity-assumption.ts";

test("oman pääoman oletus on nolla ja merkitty oletukseksi", () => {
  assert.deepEqual(defaultEquityAssumption(), {
    equity: 0,
    equitySource: "default",
    equityUserOverridden: false,
  });
});

test("käyttäjän syöttämä oma pääoma saa oman lähdemetadatan", () => {
  assert.deepEqual(userEquityAssumption(20_000), {
    equity: 20_000,
    equitySource: "user",
    equityUserOverridden: true,
  });
});

test("oletuksen palautus poistaa käyttäjän ylikirjoituksen", () => {
  const edited = userEquityAssumption(20_000);
  const reset = defaultEquityAssumption();
  assert.equal(edited.equityUserOverridden, true);
  assert.equal(reset.equity, 0);
  assert.equal(reset.equitySource, "default");
  assert.equal(reset.equityUserOverridden, false);
});
