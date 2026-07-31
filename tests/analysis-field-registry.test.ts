import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAnalysisFieldCountInvariant,
  countAnalysisFields,
  type AnalysisFieldId,
} from "../src/core/analysis/analysis-field-registry.ts";
import { parseListingText, type StructuredListingValue } from "../src/core/parser/listing-parser.ts";
import { ANALYSIS_FIELD_REGISTRY } from "../src/core/parser/synonyms.ts";

const allRelevantCanonicalFields: StructuredListingValue[] = [
  { field: "address", value: "Testikatu 1", label: "Osoite", excerpt: "Osoite: Testikatu 1" },
  { field: "city", value: "Helsinki", label: "Kaupunki", excerpt: "Kaupunki: Helsinki" },
  { field: "areaSqm", value: 50, unit: "m²", label: "Pinta-ala", excerpt: "Pinta-ala: 50 m²" },
  { field: "roomDescription", value: "2h+k", label: "Huoneistotyyppi", excerpt: "Huoneistotyyppi: 2h+k" },
  { field: "constructionYear", value: 2000, unit: "vuosi", label: "Rakennusvuosi", excerpt: "Rakennusvuosi: 2000" },
  { field: "salePrice", value: 80_000, unit: "€", label: "Myyntihinta", excerpt: "Myyntihinta: 80 000 €" },
  { field: "debtFreePrice", value: 90_000, unit: "€", label: "Velaton hinta", excerpt: "Velaton hinta: 90 000 €" },
  { field: "companyLoanShare", value: 10_000, unit: "€", label: "Yhtiölainaosuus", excerpt: "Yhtiölainaosuus: 10 000 €" },
  { field: "maintenanceFeeMonthly", value: 250, unit: "€/kk", label: "Hoitovastike", excerpt: "Hoitovastike: 250 €/kk" },
  { field: "financingFeeMonthly", value: 100, unit: "€/kk", label: "Rahoitusvastike", excerpt: "Rahoitusvastike: 100 €/kk" },
  { field: "plotFeeMonthly", value: 20, unit: "€/kk", label: "Tonttivastike", excerpt: "Tonttivastike: 20 €/kk" },
  { field: "otherMonthlyFees", value: 15, unit: "€/kk", label: "Muut maksut", excerpt: "Muut maksut: 15 €/kk" },
  { field: "landOwnership", value: "leased", label: "Tontti", excerpt: "Tontti: vuokratontti" },
  { field: "housingCompanyName", value: "Asunto Oy Testitalo", label: "Taloyhtiön nimi", excerpt: "Taloyhtiön nimi: Asunto Oy Testitalo" },
  { field: "condition", value: "hyvä", label: "Kunto", excerpt: "Kunto: hyvä" },
  { field: "heatingType", value: "district", label: "Lämmitys", excerpt: "Lämmitys: kaukolämpö" },
  { field: "energyClass", value: "C", label: "Energialuokka", excerpt: "Energialuokka: C" },
  { field: "floor", value: "2/5", label: "Kerros", excerpt: "Kerros: 2/5" },
  { field: "elevator", value: "Kyllä", label: "Hissi", excerpt: "Hissi: kyllä" },
];

function completeRegistryFixture(excludedField?: StructuredListingValue["field"]) {
  return parseListingText(
    "Tehdyt remontit\nPutkiremontti toteutettu 2019\nTulevat remontit\nKattoremontti suunniteltu 2029",
    "etuovi",
    allRelevantCanonicalFields.filter((field) => field.field !== excludedField),
  );
}

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

test("21 relevanttia ja 21 löydettyä renderöityy suhteena 21 / 21", () => {
  const count = countAnalysisFields(completeRegistryFixture());
  assert.deepEqual({ found: count.found, total: count.total }, { found: 21, total: 21 });
});

test("21 relevanttia ja 20 löydettyä renderöityy suhteena 20 / 21", () => {
  const count = countAnalysisFields(completeRegistryFixture("energyClass"));
  assert.deepEqual({ found: count.found, total: count.total }, { found: 20, total: 21 });
});
