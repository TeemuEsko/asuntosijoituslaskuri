import assert from "node:assert/strict";
import test from "node:test";

import { getListingSourceFromUrl, parseListingText } from "../src/core/parser/listing-parser.ts";
import { formatFinnishDecimal, formatFinnishInputNumber, parseArea, parseFinnishInputNumber, parseFinnishNumber, parseMonthlyAmount, parseSquareMeterRate, parseTimeExpression } from "../src/core/parser/normalization.ts";

test("Etuovi- ja Oikotie-linkit tunnistetaan ilman muiden osoitteiden hyväksymistä", () => {
  assert.equal(getListingSourceFromUrl("https://www.etuovi.com/kohde/123"), "etuovi");
  assert.equal(getListingSourceFromUrl("https://asunnot.oikotie.fi/myytavat-asunnot/123"), "oikotie");
  assert.equal(getListingSourceFromUrl("https://etuovi.com.example.org/kohde/123"), null);
  assert.equal(getListingSourceFromUrl("not-a-url"), null);
});

test("ilmoitusteksti käsittelee velkaosuus- ja lainaosuus-synonyymit", () => {
  for (const label of ["Velkaosuus", "Lainaosuus", "Huoneistokohtainen lainaosuus", "Osuus yhtiölainasta"]) {
    const result = parseListingText(`${label}: 12 500 €`);
    assert.equal(result.findings[0]?.field, "companyLoanShare");
    assert.equal(result.findings[0]?.normalizedValue, 12_500);
  }
});

test("taloyhtiön koko lainamäärää ei tulkita huoneistokohtaiseksi yhtiölainaksi", () => {
  assert.equal(parseListingText("Taloyhtiön koko lainamäärä: 900 000 €").findings.some((finding) => finding.field === "companyLoanShare"), false);
});

test("useat rahoitusvastikkeet säilyvät eriteltyinä ja saavat yhteissumman", () => {
  const result = parseListingText("Pääomavastike A: 100,50 €/kk\nPääomavastike B: 44,50 euroa kuukaudessa");
  const total = result.findings.find((finding) => finding.aggregate);
  assert.equal(total?.normalizedValue, 145);
  assert.deepEqual(total?.breakdown?.map((part) => part.value), [100.5, 44.5]);
});

test("suomalaiset numero-, kuukausi-, neliöhinta- ja pinta-alamuodot normalisoituvat", () => {
  assert.equal(parseFinnishNumber("1 234,56"), 1234.56);
  assert.equal(parseFinnishNumber("1234.56"), 1234.56);
  for (const value of ["185 €/kk", "185,00 euroa/kk", "185 e / kk", "185 euroa kuukaudessa"]) assert.equal(parseMonthlyAmount(value), 185);
  assert.equal(parseSquareMeterRate("19,50 €/m²/kk"), 19.5);
  for (const value of ["32 m²", "32,0 m2", "32 neliötä", "32,00 m²"]) assert.equal(parseArea(value), 32);
});

test("näyttömuotoilu poistaa liukulukuartefaktit ja desimaalipilkku toimii syötössä", () => {
  assert.equal(formatFinnishDecimal(58799.99999999999, 1).replace(/\u00a0|\u202f/g, " "), "58 800,0");
  assert.equal(formatFinnishInputNumber(58799.99999999999, 1, 1).replace(/\u00a0|\u202f/g, " "), "58 800,0");
  assert.equal(parseFinnishInputNumber("58 800,5"), 58_800.5);
  assert.equal(parseFinnishInputNumber("58\u00a0800,5"), 58_800.5);
});

test("ristiriitaiset kenttäarvot säilyvät erillisinä", () => {
  const result = parseListingText("Myyntihinta: 79 000 €\nKauppahinta: 81 000 €");
  assert.equal(result.findings.length, 2);
  assert.deepEqual(result.findings.map((finding) => finding.normalizedValue), [79_000, 81_000]);
  assert.ok(result.findings.every((finding) => finding.conflicts.length === 1));
});

test("hintojen täsmäytys näyttää laskelman muuttamatta arvoja", () => {
  const result = parseListingText("Myyntihinta: 70 000 €\nYhtiölainaosuus: 10 000 €\nVelaton hinta: 85 000 €");
  assert.deepEqual(result.findings.map((finding) => finding.normalizedValue), [70_000, 10_000, 85_000]);
  assert.ok(result.findings.every((finding) => finding.conflicts.some((conflict) => {
    const normalized = conflict.replace(/\s/g, " ");
    return normalized.includes("70 000 €") && normalized.includes("80 000 €") && normalized.includes("85 000 €");
  })));
});

test("puuttuva ja epäselvä tieto ei muutu keksityksi arvoksi", () => {
  const result = parseListingText("Rakennusvuosi: ei tiedossa\nVelaton hinta: kysy välittäjältä");
  assert.equal(result.findings.length, 0);
  assert.ok(result.warnings.length > 0);
});

test("vuosien vaihteluväli ja remontin tila säilyvät", () => {
  assert.deepEqual(parseTimeExpression("tehty 2018–2019"), { years: [2018, 2019], status: "completed" });
  assert.equal(parseTimeExpression("arviolta 2028").status, "estimated");
  assert.equal(parseTimeExpression("suunnitteilla 2029").status, "planned");
});

test("putkiremontin osat ja katon pinnoitus erotellaan", () => {
  const result = parseListingText("Käyttövesiputkien uusiminen tehty 2018.\nViemärien sukitus suunnitteilla 2029.\nKaton pinnoitus tehty 2020.\nPutkiremontti arvioitu 2030.");
  assert.deepEqual(result.renovations.map((item) => item.component), ["water_pipes", "drain_lining", "roof_coating", "pipe_unspecified"]);
  assert.equal(result.renovations.some((item) => item.component === "roof_replacement"), false);
});
