import assert from "node:assert/strict";
import test from "node:test";

import { mergeSourceObservation } from "../src/core/data-fusion/merge-field.ts";
import type { PropertyField } from "../src/core/domain/field.ts";

test("ristiriitainen dokumenttiarvo ei ylikirjoita aktiivista arvoa", () => {
  const current: PropertyField<number> = { value: 0, status: "parser", source: { kind: "document", documentId: "doc-1" } };
  const result = mergeSourceObservation(current, 145, { kind: "document", documentId: "doc-2" });
  assert.equal(result.value, 0);
  assert.equal(result.sourceValue, 0);
  assert.equal(result.conflicts?.[0]?.incomingValue, 145);
  assert.equal(result.conflicts?.[0]?.incomingSource?.documentId, "doc-2");
});

test("puuttuva kenttä saa ensimmäisen lähdearvon", () => {
  const result = mergeSourceObservation<number>({ value: null, status: "missing" }, 145, { kind: "document", documentId: "doc-1" });
  assert.equal(result.value, 145);
  assert.equal(result.sourceValue, 145);
  assert.equal(result.status, "parser");
});
