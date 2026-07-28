import assert from "node:assert/strict";
import test from "node:test";
import { cleanText, detectBuildingType, detectHeating, detectLand, mapLegacyFieldsToCanonical, parseEuro, parseLegacyListingHtml, parseNumberAfter, parseYear } from "../src/core/listing-acquisition/legacy-listing-parser.ts";
import { parseListingText } from "../src/core/parser/listing-parser.ts";

test("cleanText poistaa ohjelmakoodin ja säilyttää suomalaisen tekstin", () => {
  const result = cleanText("<style>.x{color:red}</style><script>alert(1)</script><p>Ääkköset&nbsp; 89&nbsp;000 &euro;</p>");
  assert.equal(result, "Ääkköset 89 000 €");
  assert.doesNotMatch(result, /alert|color|<p>/);
});

test("parseEuro poimii vanhat hintakentät ja vastikkeet", () => {
  assert.equal(parseEuro("Velaton hinta 89 000 €", ["Velaton hinta", "Hinta"]), 89_000);
  assert.equal(parseEuro("Myyntihinta 75 500 €", ["Myyntihinta"]), 75_500);
  assert.equal(parseEuro("Hoitovastike 245,50 € / kk", ["Hoitovastike"]), 245.5);
  assert.equal(parseEuro("Rahoitusvastike 112,30 € / kk", ["Rahoitusvastike"]), 112.3);
  assert.equal(parseEuro("Velaton hinta 89 000 € Hinta 12 000 €", ["Velaton hinta", "Hinta"]), 89_000);
});

test("parseNumberAfter poimii pinta-alan", () => {
  assert.equal(parseNumberAfter("Pinta-ala 32,5 m²", ["Pinta-ala"]), 32.5);
  assert.equal(parseNumberAfter("Asuinpinta-ala 61 m²", ["Asuinpinta-ala"]), 61);
});

test("parseYear tunnistaa rakennusvuoden eri ilmauksista", () => {
  assert.equal(parseYear("Rakennusvuosi 1987"), 1987);
  assert.equal(parseYear("Valmistunut 2012"), 2012);
  assert.equal(parseYear("Rakennettu vuonna 1974"), 1974);
});

test("talotyyppi, lämmitys ja tontti luokitellaan", () => {
  assert.equal(detectBuildingType("Kerrostalo"), "apartment");
  assert.equal(detectBuildingType("Rivitalo"), "terraced");
  assert.equal(detectBuildingType("Paritalo"), "semi_detached");
  assert.equal(detectBuildingType("Luhtitalo"), "loft");
  assert.equal(detectHeating("Maalämpö"), "geothermal");
  assert.equal(detectHeating("Kaukolämpö"), "district");
  assert.equal(detectHeating("Suora sähkö"), "electric");
  assert.equal(detectHeating("Öljy"), "oil");
  assert.equal(detectHeating("Poistoilmalämpöpumppu"), "exhaust_air");
  assert.equal(detectLand("Oma tontti"), "own");
  assert.equal(detectLand("Vuokratontti"), "leased");
});

const fixture = `<!doctype html><html><head><script>const ignored = "Hinta 1 €"</script></head><body>
<h1>Kivikkokuja 4</h1><div>Velaton hinta 89 000 €</div><div>Myyntihinta 75 500 €</div>
<div>Hoitovastike 245,50 € / kk</div><div>Rahoitusvastike 112,30 € / kk</div>
<div>Pinta-ala 32,5 m²</div><div>Rakennusvuosi 1987</div><div>Talotyyppi Kerrostalo</div>
<div>Lämmitysmuoto Kaukolämpö</div><div>Tontti Oma tontti</div></body></html>`;

test("vanhan parserin HTML-fixture palauttaa kaikki peruskentät", () => {
  const { fields } = parseLegacyListingHtml(fixture, "https://www.etuovi.com/kohde/123456");
  assert.deepEqual(fields, { listingId: "123456", debtFreePrice: 89_000, sellingPrice: 75_500, maintenanceFee: 245.5, financingFee: 112.3, debtShare: 13_500, debtShareSource: "price_difference", hasDebtShare: "yes", size: 32.5, buildYear: 1987, buildingType: "apartment", heatingType: "district", landType: "own" });
});

test("pääoma- ja rahoitusvastike mapataan samaan canonical-kenttään", () => {
  assert.equal(parseLegacyListingHtml("Pääomavastike 216 € / kk").fields.financingFee, 216);
  assert.equal(parseLegacyListingHtml("Rahoitusvastike 216 € / kk").fields.financingFee, 216);
  assert.equal(parseLegacyListingHtml("Pääomavastike 216 € / kk").fields.hasDebtShare, "yes");
});

test("suora velkaosuus voittaa hintojen erotuksen", () => {
  const direct = parseLegacyListingHtml("Myyntihinta 144 000 € Velkaosuus 15 000 € Velaton hinta 159 000 €");
  assert.equal(direct.fields.debtShare, 15_000); assert.equal(direct.fields.debtShareSource, "label"); assert.equal(direct.fields.hasDebtShare, "yes");
  const fallback = parseLegacyListingHtml("Myyntihinta 144 000 € Velaton hinta 159 000 €");
  assert.equal(fallback.fields.debtShare, 15_000); assert.equal(fallback.fields.debtShareSource, "price_difference");
  const directFinding = parseListingText(direct.text, "etuovi", mapLegacyFieldsToCanonical(direct.fields)).findings.find((finding) => finding.field === "companyLoanShare");
  const fallbackFinding = parseListingText(fallback.text, "etuovi", mapLegacyFieldsToCanonical(fallback.fields)).findings.find((finding) => finding.field === "companyLoanShare");
  assert.ok((directFinding?.confidenceScore ?? 0) > (fallbackFinding?.confidenceScore ?? 0));
});

test("yhtiövastike yhteensä ja erillismaksut säilyvät erillisinä", () => {
  const { fields } = parseLegacyListingHtml("Hoitovastike 400 € / kk Pääomavastike 216 € / kk Yhtiövastike yhteensä 616 € / kk Vesimaksu 20 € / kk Autopaikkamaksu 15 € / kk Saunamaksu 10 € / kk Jätemaksu 5 € / kk");
  assert.equal(fields.maintenanceFee, 400); assert.equal(fields.financingFee, 216); assert.equal(fields.totalHousingCharge, 616);
  assert.equal(fields.waterFee, 20); assert.equal(fields.parkingFee, 15); assert.equal(fields.saunaFee, 10); assert.equal(fields.wasteFee, 5);
});

test("legacy-kentät mapataan canonical review -kentiksi eikä validointi pudota niitä", () => {
  const legacy = parseLegacyListingHtml(fixture, "https://www.etuovi.com/kohde/123456");
  const mapped = mapLegacyFieldsToCanonical(legacy.fields);
  const parsed = parseListingText(legacy.text, "etuovi", mapped);
  const values = Object.fromEntries(parsed.findings.map((finding) => [finding.field, finding.normalizedValue]));
  assert.equal(values.debtFreePrice, 89_000);
  assert.equal(values.salePrice, 75_500);
  assert.equal(values.maintenanceFeeMonthly, 245.5);
  assert.equal(values.financingFeeMonthly, 112.3);
  assert.equal(values.areaSqm, 32.5);
  assert.equal(values.constructionYear, 1987);
  assert.equal(values.buildingType, "apartment");
  assert.equal(values.heatingType, "district");
  assert.equal(values.landOwnership, "owned");
  assert.ok(parsed.findings.every((finding) => finding.supportingSources.length > 0));
});
