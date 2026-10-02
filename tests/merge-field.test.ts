import assert from "node:assert/strict";
import test from "node:test";

import { mergeSourceObservation } from "../src/core/data-fusion/merge-field.ts";
import type { PropertyField } from "../src/core/domain/field.ts";

test("saman prioriteetin ristiriitainen dokumenttiarvo ei ylikirjoita aktiivista arvoa", () => {
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
  assert.equal(result.status, "document");
});

test("asiakirja ohittaa ilmoituksen mutta ei käyttäjän arvoa", () => {
  const listing: PropertyField<number> = {
    value: 250,
    status: "listing",
    source: { kind: "listing" },
  };
  const fromDocument = mergeSourceObservation(listing, 263.2, {
    kind: "document",
    documentId: "doc-1",
  });
  assert.equal(fromDocument.value, 263.2);
  assert.equal(fromDocument.status, "document");
  assert.equal(fromDocument.conflicts?.[0]?.incomingValue, 250);

  const user: PropertyField<number> = {
    value: 275,
    status: "user",
    source: { kind: "user" },
  };
  const protectedUser = mergeSourceObservation(user, 263.2, {
    kind: "document",
    documentId: "doc-1",
  });
  assert.equal(protectedUser.value, 275);
  assert.equal(protectedUser.status, "user");
  assert.equal(protectedUser.conflicts?.[0]?.incomingValue, 263.2);
});

test("puuttuva lähdearvo ei nollaa nykyistä tietoa", () => {
  const current: PropertyField<number> = {
    value: 250,
    status: "listing",
    source: { kind: "listing" },
  };
  assert.deepEqual(
    mergeSourceObservation(current, null, { kind: "document" }),
    current,
  );
});

test("tarkistettavaksi merkitty arvo voidaan korvata uudella luotettavalla lähdearvolla", () => {
  const current: PropertyField<number> = {
    value: 0,
    status: "unknown",
    source: { kind: "document", documentId: "doc-1" },
  };
  const result = mergeSourceObservation(current, 12_450.6, {
    kind: "document",
    documentId: "doc-2",
  });

  assert.equal(result.value, 12_450.6);
  assert.equal(result.status, "document");
  assert.equal(result.source?.documentId, "doc-2");
  assert.equal(result.conflicts?.[0]?.incomingValue, 0);
});
