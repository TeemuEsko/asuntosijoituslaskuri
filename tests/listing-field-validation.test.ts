import assert from "node:assert/strict";
import test from "node:test";
import { extractStructuredValues, parserInputFromHtml } from "../src/core/listing-acquisition/html-extraction.ts";
import { isValidHousingCompanyName, parseListingText } from "../src/core/parser/listing-parser.ts";

test("katuosoite ei kelpaa taloyhtiön nimeksi ja hylkäyssyy diagnosoidaan", () => {
  const result = parseListingText("Taloyhtiö: Laihian Kivikkokuja 4", "etuovi");
  assert.equal(result.findings.some((item) => item.field === "housingCompanyName"), false);
  const rejected = result.diagnostics.fieldDiagnostics.find((item) => item.fieldName === "housingCompanyName");
  assert.equal(rejected?.validationResult, "rejected");
  assert.equal(rejected?.rejectionReason, "Value matches street address pattern");
  assert.equal(rejected?.fieldMatchConfidence, 0);
  assert.equal(rejected?.finalConfidence, 0);
});

test("Laihian Kivikkokuja 4 tunnistetaan H1-otsikoksi eikä taloyhtiöksi", () => {
  const html = "<main><h1>Laihian Kivikkokuja 4</h1></main>";
  const result = parseListingText("", "etuovi", extractStructuredValues(html));
  assert.equal(result.findings.find((item) => item.field === "listingTitle")?.normalizedValue, "Laihian Kivikkokuja 4");
  assert.equal(result.findings.some((item) => item.field === "housingCompanyName"), false);
});

test("Asunto Oy -muotoinen nimi hyväksytään korkealla varmuudella", () => {
  const result = parseListingText("Taloyhtiön tiedot\nTaloyhtiö: Asunto Oy Kivikkokuja 4", "etuovi");
  const company = result.findings.find((item) => item.field === "housingCompanyName");
  assert.equal(company?.validationResult, "accepted");
  assert.equal(company?.validationConfidence, 100);
  assert.equal(company?.confidence, "high");
  assert.equal(company?.autoAccepted, true);
});

test("taloyhtiön nimi jää tyhjäksi ilman luotettavaa nimeä", () => {
  const result = parseListingText("Osoite: Kivikkokuja 4\nKunta: Laihia", "oikotie");
  assert.equal(result.findings.some((item) => item.field === "housingCompanyName"), false);
  assert.equal(isValidHousingCompanyName("66400 Laihia"), false);
  assert.equal(isValidHousingCompanyName("Kivikkokuja 4 A 2"), false);
});

test("sama arvo ei päädy osoitteeksi ja taloyhtiön nimeksi", () => {
  const result = parseListingText("Osoite: Kivikkokuja 4\nTaloyhtiö: Kivikkokuja 4", "etuovi");
  assert.equal(result.findings.some((item) => item.field === "address"), true);
  assert.equal(result.findings.some((item) => item.field === "housingCompanyName"), false);
});

test("epäkelpo kenttä ei päädy massahyväksyttäväksi", () => {
  const result = parseListingText("Taloyhtiö: Laihian Kivikkokuja 4", "etuovi");
  assert.equal(result.findings.some((item) => item.autoAccepted), false);
  assert.equal(result.diagnostics.acceptedFields, 0);
  assert.equal(result.diagnostics.rejectedFields, 1);
});

test("fixture-pohjainen Etuovi- ja Oikotie-data poimii osoitteen ja yhtiön erikseen", () => {
  for (const source of ["etuovi", "oikotie"] as const) {
    const html = `<script type="application/ld+json">{"@type":"Apartment","name":"Laihian Kivikkokuja 4","address":{"streetAddress":"Kivikkokuja 4","postalCode":"66400","addressLocality":"Laihia"}}</script><dl><dt>Taloyhtiö</dt><dd>Asunto Oy Laihian Kivikkokuja</dd></dl>`;
    const result = parseListingText(parserInputFromHtml(html), source, extractStructuredValues(html));
    assert.equal(result.findings.find((item) => item.field === "streetAddress")?.normalizedValue, "Kivikkokuja 4");
    assert.equal(result.findings.find((item) => item.field === "postalCode")?.normalizedValue, "66400");
    assert.equal(result.findings.find((item) => item.field === "housingCompanyName")?.normalizedValue, "Asunto Oy Laihian Kivikkokuja");
  }
});
