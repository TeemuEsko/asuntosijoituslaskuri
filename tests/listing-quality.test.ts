import assert from "node:assert/strict";
import test from "node:test";

import { classifyListingFetchStatus } from "../src/core/parser/listing-fetch.ts";
import { parseListingText, type ListingFinding } from "../src/core/parser/listing-parser.ts";
import { fetchFailureFixtures, listingFixtures } from "./fixtures/listing-fixtures.ts";

function preferredFinding(findings: ListingFinding[], field: ListingFinding["field"]) {
  const matches = findings.filter((finding) => finding.field === field);
  return matches.find((finding) => finding.aggregate) ?? matches[0];
}

test("20 ilmoitustilanteen laatuaineisto läpäisee odotukset", () => {
  let expectedCount = 0;
  let missedCount = 0;
  let falsePositiveCount = 0;

  for (const fixture of listingFixtures) {
    const result = parseListingText(fixture.text, fixture.source);

    for (const [field, expected] of Object.entries(fixture.expectedFields ?? {})) {
      expectedCount += 1;
      const finding = preferredFinding(result.findings, field as ListingFinding["field"]);
      if (!finding || finding.normalizedValue !== expected) missedCount += 1;
      assert.equal(finding?.normalizedValue, expected, fixture.name);
    }

    for (const expected of fixture.expectedRenovations ?? []) {
      expectedCount += 1;
      const found = result.renovations.some((item) => item.component === expected.component && item.status === expected.status);
      if (!found) missedCount += 1;
      assert.ok(found, fixture.name);
    }

    for (const forbidden of fixture.forbiddenRenovations ?? []) {
      const found = result.renovations.some((item) => item.component === forbidden);
      if (found) falsePositiveCount += 1;
      assert.equal(found, false, fixture.name);
    }

    for (const missing of fixture.expectedMissing ?? []) assert.ok(result.missingCriticalFields.includes(missing), fixture.name);
    if (fixture.expectedConflicts !== undefined) assert.equal(result.diagnostics.conflicts.length, fixture.expectedConflicts, fixture.name);
    if (fixture.expectedCompanyFindingCount !== undefined) {
      assert.equal(result.findings.filter((finding) => finding.field === "housingCompanyName").length, fixture.expectedCompanyFindingCount, fixture.name);
    }
  }

  for (const fixture of fetchFailureFixtures) assert.equal(classifyListingFetchStatus(fixture.status)?.code, fixture.expectedCode, fixture.name);
  assert.equal(listingFixtures.length + fetchFailureFixtures.length, 20);
  assert.equal(missedCount, 0, `${missedCount}/${expectedCount} odotetusta havainnosta jäi löytymättä`);
  assert.equal(falsePositiveCount, 0, `${falsePositiveCount} kiellettyä remonttihavaintoa`);
});

test("rakenteinen ja näkyvä sama tieto yhdistyvät perusteluineen", () => {
  const result = parseListingText("Hintatiedot\nMyyntihinta: 79 000 €", "etuovi", [
    { field: "salePrice", value: 79_000, unit: "€", label: "hinta", excerpt: "JSON-LD: 79000" },
  ]);
  const prices = result.findings.filter((finding) => finding.field === "salePrice");
  assert.equal(prices.length, 1);
  assert.equal(prices[0]?.supportingSources.length, 2);
  assert.equal(prices[0]?.confidence, "high");
  assert.equal(prices[0]?.autoAccepted, true);
});

test("ristiriitaiset lähdearvot säilyvät eivätkä kelpaa automaattisesti", () => {
  const result = parseListingText("Hintatiedot\nMyyntihinta: 79 000 €", "etuovi", [
    { field: "salePrice", value: 82_000, unit: "€", label: "hinta", excerpt: "JSON-LD: 82000" },
  ]);
  const prices = result.findings.filter((finding) => finding.field === "salePrice");
  assert.equal(prices.length, 2);
  assert.ok(prices.every((finding) => finding.conflicts.length > 0 && !finding.autoAccepted));
});

test("negatiivinen remonttilause säilyy negatiivisena tietona", () => {
  const result = parseListingText("Tulevat remontit\nPutkiremonttia ei ole tehty", "pasted_text");
  assert.equal(result.renovations[0]?.component, "pipe_unspecified");
  assert.equal(result.renovations[0]?.status, "not_done");
  assert.equal(parseListingText("Tulevat remontit\nPutkiremonttia ei ole päätetty", "pasted_text").renovations[0]?.status, "unknown");
});

test("nimetty taloyhtiökenttä yhdistyy yhdeksi korkean varmuuden nimeksi", () => {
  const result = parseListingText("Taloyhtiön tiedot\nTaloyhtiö: Asunto Oy Laihian Kivikkokuja 4\nYhtiön nimi: Laihian Kivikkokuja 4", "pasted_text");
  const names = result.findings.filter((finding) => finding.field === "housingCompanyName");
  assert.equal(names.length, 1);
  assert.equal(names[0]?.normalizedValue, "Asunto Oy Laihian Kivikkokuja 4");
  assert.equal(names[0]?.confidence, "high");
});
