import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAnalysisFieldCountInvariant,
  countAnalysisFields,
  type AnalysisFieldId,
} from "../src/core/analysis/analysis-field-registry.ts";
import { parseListingText } from "../src/core/parser/listing-parser.ts";
import { ANALYSIS_FIELD_REGISTRY } from "../src/core/parser/synonyms.ts";

test("analyysikenttien rekisterissä ei ole päällekkäisiä tunnisteita", () => {
  assert.equal(new Set(ANALYSIS_FIELD_REGISTRY.map((field) => field.key)).size, ANALYSIS_FIELD_REGISTRY.length);
});

test("löydetty määrä ei koskaan ylitä relevanttien kenttien määrää", () => {
  const count = countAnalysisFields(parseListingText("Osoite: Testikatu 1\nKaupunki: Helsinki\nVelaton hinta: 88 000 €\nMyyntihinta: 88 000 €"));
  assert.ok(count.found <= count.total);
  assertAnalysisFieldCountInvariant(count.foundIds, count.relevantIds, "development");
});

test("saman canonical-kentän useat lähteet lasketaan vain kerran", () => {
  const parsed = parseListingText("Myyntihinta: 88 000 €", "etuovi", [{ field: "salePrice", value: 88_000, unit: "€", label: "price", excerpt: "JSON-LD" }]);
  const count = countAnalysisFields(parsed);
  assert.equal([...count.foundIds].filter((id) => id === "salePrice").length, 1);
});

test("rekisterin ulkopuolinen metatieto ei kasvata osoittajaa", () => {
  const withMetadata = countAnalysisFields(parseListingText("Kohdenumero: 123456\nIlmoituksen otsikko: Testikohde"));
  const empty = countAnalysisFields(parseListingText(""));
  assert.equal(withMetadata.found, empty.found);
});

test("tunnettu yhtiölainan nolla lasketaan löydetyksi kentäksi", () => {
  const count = countAnalysisFields(parseListingText("Myyntihinta: 88 000 €\nVelaton hinta: 88 000 €"));
  assert.ok(count.foundIds.has("companyLoanShare"));
});

test("lainattomassa kohteessa rahoitusvastike ei kuulu nimittäjään", () => {
  const noDebt = countAnalysisFields(parseListingText("Myyntihinta: 88 000 €\nVelaton hinta: 88 000 €"));
  const unknown = countAnalysisFields(parseListingText("Velaton hinta: 88 000 €"));
  assert.equal(noDebt.relevantIds.has("financingFeeMonthly"), false);
  assert.equal(unknown.relevantIds.has("financingFeeMonthly"), true);
});

test("oma tontti poistaa tonttivastikkeen epärelevanttina", () => {
  const owned = countAnalysisFields(parseListingText("Tontin omistusmuoto: Oma tontti"));
  const leased = countAnalysisFields(parseListingText("Tontin omistusmuoto: Vuokratontti"));
  assert.equal(owned.relevantIds.has("plotFeeMonthly"), false);
  assert.equal(leased.relevantIds.has("plotFeeMonthly"), true);
});

test("rivitalossa kerros ja hissi eivät kasvata nimittäjää", () => {
  const terraced = countAnalysisFields(parseListingText("Talotyyppi: Rivitalo"));
  const apartment = countAnalysisFields(parseListingText("Talotyyppi: Kerrostalo"));
  assert.equal(terraced.relevantIds.has("floor"), false);
  assert.equal(terraced.relevantIds.has("elevator"), false);
  assert.equal(apartment.relevantIds.has("floor"), true);
  assert.equal(apartment.relevantIds.has("elevator"), true);
});

test("tehty remontti käyttää yhtä rekisteritunnistetta", () => {
  const count = countAnalysisFields(parseListingText("Tehdyt remontit\nPutkiremontti toteutettu 2019"));
  assert.ok(count.foundIds.has("completedRenovations"));
  assert.equal([...count.foundIds].filter((id) => id === "completedRenovations").length, 1);
});

test("tuleva remontti käyttää yhtä rekisteritunnistetta", () => {
  const count = countAnalysisFields(parseListingText("Tulevat remontit\nKattoremontti suunniteltu 2029"));
  assert.ok(count.foundIds.has("futureRenovations"));
});

test("ristiriitainen canonical-arvo ei ole löydetty arvo", () => {
  const count = countAnalysisFields(parseListingText("Myyntihinta: 88 000 €\nMyyntihinta: 89 000 €"));
  assert.equal(count.foundIds.has("salePrice"), false);
});

test("kehitysympäristön invariantti ilmoittaa mahdottomasta suhteesta", () => {
  const found = new Set<AnalysisFieldId>(["salePrice", "debtFreePrice"]);
  const relevant = new Set<AnalysisFieldId>(["salePrice"]);
  assert.throws(() => assertAnalysisFieldCountInvariant(found, relevant, "development"), /Analysis field count invariant violated/);
});
