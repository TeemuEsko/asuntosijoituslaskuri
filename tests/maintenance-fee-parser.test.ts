import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { automaticValues, monthlyHousingCharges } from "../src/core/analysis/requirements.ts";
import { extractStructuredValues, parserInputFromHtml } from "../src/core/listing-acquisition/html-extraction.ts";
import { mapLegacyFieldsToCanonical, parseLegacyListingHtml } from "../src/core/listing-acquisition/legacy-listing-parser.ts";
import { parseListingText } from "../src/core/parser/listing-parser.ts";

function values(text: string) {
  return automaticValues(parseListingText(text, "etuovi"));
}

test("nimetty hoitovastikkeen €/kk-kenttä ohittaa esittelytekstin neliöhinnan", () => {
  const parsed = parseListingText(
    "Edullinen hoitovastike, vain 3,10 €/m²\nHoitovastike: 359,60 €/kk",
    "etuovi",
    [{ field: "maintenanceFeeMonthly", value: 359.6, unit: "€/kk", label: "Hoitovastike", excerpt: "Rakenteinen vastikekenttä", sourcePath: "fees.maintenanceFee" }],
  );
  assert.equal(automaticValues(parsed).maintenanceFeeMonthly, 359.6);
  assert.equal(parsed.findings.filter((finding) => finding.field === "maintenanceFeeMonthly").length, 1);
  assert.equal(parsed.findings.find((finding) => finding.field === "maintenanceFeeMonthly")?.confidence, "high");
});

test("rakenteinen hoitovastike ohittaa myös alemman prioriteetin ristiriitaisen kuukausiosuman", () => {
  const parsed = parseListingText(
    "Hoitovastike mainoslauseessa: 3,10 €/kk",
    "etuovi",
    [{ field: "maintenanceFeeMonthly", value: 359.6, unit: "€/kk", label: "Hoitovastike", excerpt: "Rakenteinen vastikekenttä", sourcePath: "fees.maintenanceFee" }],
  );
  assert.equal(automaticValues(parsed).maintenanceFeeMonthly, 359.6);
  assert.ok(parsed.diagnostics.rejectedCandidates.some((candidate) => candidate.normalizedValue === 3.1 && /Heikompi hoitovastikeosuma/.test(candidate.rejectionReason ?? "")));
});

test("€/m²/kk muunnetaan kuukausisummaa varten vain pinta-alan kanssa", () => {
  const parsed = parseListingText("Pinta-ala: 116 m²\nHoitovastike: 3,10 €/m²/kk", "etuovi");
  const maintenance = parsed.findings.find((finding) => finding.field === "maintenanceFeeMonthly");
  assert.equal(automaticValues(parsed).maintenanceFeeMonthly, 359.6);
  assert.equal(maintenance?.unit, "€/kk");
  assert.equal(maintenance?.calculationBasis, "3,1 €/m²/kk × 116 m² = 359,6 €/kk");
  assert.equal(maintenance?.supportingSources[0]?.semanticSource, "calculation");
});

test("€/m² ilman aikajaksoa ei muutu kuukausittaiseksi hoitovastikkeeksi", () => {
  const parsed = parseListingText("Pinta-ala: 116 m²\nHoitovastike: 3,10 €/m²", "etuovi");
  assert.equal(automaticValues(parsed).maintenanceFeeMonthly, undefined);
  assert.equal(parsed.findings.some((finding) => finding.field === "maintenanceFeeMonthly"), false);
});

test("hoito-, rahoitus- ja kokonaisyhtiövastike pysyvät erillisinä ilman kaksinkertaista kulua", () => {
  const sameTotal = values("Hoitovastike: 359,60 €/kk\nYhtiövastike yhteensä: 359,60 €/kk");
  assert.equal(sameTotal.maintenanceFeeMonthly, 359.6);
  assert.equal(sameTotal.totalHousingCharge, 359.6);
  assert.equal(monthlyHousingCharges(sameTotal), 359.6);

  const split = values("Hoitovastike: 250 €/kk\nRahoitusvastike: 150 €/kk\nYhtiövastike yhteensä: 400 €/kk");
  assert.equal(split.maintenanceFeeMonthly, 250);
  assert.equal(split.financingFeeMonthly, 150);
  assert.equal(split.totalHousingCharge, 400);
  assert.equal(monthlyHousingCharges(split), 400);

  const totalOnly = values("Yhtiövastike yhteensä: 400 €/kk");
  assert.equal(totalOnly.maintenanceFeeMonthly, undefined);
  assert.equal(totalOnly.totalHousingCharge, 400);
});

test("kuukausivastikkeen suomalaiset lukumuodot normalisoituvat", () => {
  for (const [input, expected] of [["359,60", 359.6], ["359.60", 359.6], ["1 359,60", 1_359.6], ["1.359,60", 1_359.6]] as const) {
    assert.equal(values(`Hoitovastike: ${input} €/kk`).maintenanceFeeMonthly, expected, input);
  }
});

test("Etuovi 55962690 käyttää tallennetusta fixturestä arvoa 359,60 €/kk", async () => {
  const html = await readFile(new URL("./fixtures/etuovi-55962690.html", import.meta.url), "utf8");
  const legacy = parseLegacyListingHtml(html, "https://www.etuovi.com/kohde/55962690");
  const parsed = parseListingText(
    parserInputFromHtml(html),
    "etuovi",
    [...extractStructuredValues(html), ...mapLegacyFieldsToCanonical(legacy.fields)],
  );
  assert.equal(legacy.fields.maintenanceFee, 359.6);
  assert.equal(automaticValues(parsed).maintenanceFeeMonthly, 359.6);
  assert.deepEqual(
    parsed.findings.filter((finding) => finding.field === "maintenanceFeeMonthly").map((finding) => finding.normalizedValue),
    [359.6],
  );
});

test("käyttäjän vahvistaman hoitovastikkeen source-priority säilyy", async () => {
  const source = await readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8");
  assert.match(source, /maintenanceFeeMonthly:\s*Number\(value\)/);
  assert.match(source, /setAssumptionStatuses\(\(current\) => \(\{ \.\.\.current, \[key\]: "user" \}\)\)/);
  assert.match(source, /provenance:\s*provenanceForStatus\("user"\)!/);
});
