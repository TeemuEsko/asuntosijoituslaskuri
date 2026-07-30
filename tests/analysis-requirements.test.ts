import assert from "node:assert/strict";
import test from "node:test";
import { analysisBlockingFields, analysisReliability, automaticValues, canUseFindingAutomatically, debtShareStatus, metadataFields, missingAnalysisFields, monthlyHousingCharges } from "../src/core/analysis/requirements.ts";
import { parseListingText, type ListingFinding } from "../src/core/parser/listing-parser.ts";

test("vain keskitetyt seitsemän analyysikenttää estävät analyysin", () => {
  assert.deepEqual(analysisBlockingFields, ["debtFreePrice", "maintenanceFeeMonthly", "areaSqm", "constructionYear", "buildingType", "heatingType", "currentRentMonthly"]);
  assert.ok(metadataFields.includes("housingCompanyName"));
  const values = Object.fromEntries(analysisBlockingFields.map((field) => [field, field === "currentRentMonthly" ? undefined : field === "heatingType" ? "district" : 1]));
  assert.deepEqual(missingAnalysisFields(values), ["currentRentMonthly"]);
});

test("confidence 70, validointi ja ristiriidattomuus mahdollistavat automaattikäytön", () => {
  const base = { confidenceScore: 70, validationResult: "accepted", conflicts: [] } as unknown as ListingFinding;
  assert.equal(canUseFindingAutomatically(base), true);
  assert.equal(canUseFindingAutomatically({ ...base, confidenceScore: 69 }), false);
  assert.equal(canUseFindingAutomatically({ ...base, conflicts: ["ristiriita"] }), false);
  assert.equal(canUseFindingAutomatically({ ...base, validationResult: "rejected" }), false);
});

test("ei-kriittinen matalan varmuuden kenttä ei estä analyysiä", () => {
  const values = Object.fromEntries(analysisBlockingFields.map((field) => [field, field === "heatingType" ? "district" : 1]));
  assert.deepEqual(missingAnalysisFields({ ...values, housingCompanyName: undefined }), []);
});

test("taloyhtiön täsmällinen label parsitaan mutta osoitetta ei hyväksytä", () => {
  const valid = parseListingText("Taloyhtiön nimi Asunto Oy Laihian Kivikkokuja 4", "etuovi");
  assert.equal(valid.findings.find((finding) => finding.field === "housingCompanyName")?.normalizedValue, "Asunto Oy Laihian Kivikkokuja 4");
  const invalid = parseListingText("Taloyhtiön nimi Kivikkokuja 4, Laihia", "etuovi");
  assert.equal(invalid.findings.some((finding) => finding.field === "housingCompanyName"), false);
  assert.equal(parseListingText("Taloyhtiön nimi", "etuovi").findings.some((finding) => finding.field === "housingCompanyName"), false);
});

test("yhtiölainan tila päätellään vain löydetyistä arvoista", () => {
  assert.equal(debtShareStatus({ companyLoanShare: 10_000 }), "yes");
  assert.equal(debtShareStatus({ companyLoanShare: 0, financingFeeMonthly: 0 }), "no");
  assert.equal(debtShareStatus({}), "unknown");
});

test("vastikkeita ei tuplalasketa yhtiövastike yhteensä -kentästä", () => {
  assert.equal(monthlyHousingCharges({ maintenanceFeeMonthly: 400, financingFeeMonthly: 216, totalHousingCharge: 616 }), 616);
  assert.equal(monthlyHousingCharges({ totalHousingCharge: 616 }), 616);
});

test("kokonaisluotettavuus on korkea vain kattavalla automaattisella aineistolla", () => {
  const parsed = parseListingText("Velaton hinta: 89000 €\nHoitovastike: 245 €/kk\nPinta-ala: 32 m²\nRakennusvuosi: 1987\nTalotyyppi: kerrostalo\nLämmitysmuoto: kaukolämpö\nNykyinen vuokra: 750 €/kk", "etuovi");
  const values = automaticValues(parsed);
  assert.deepEqual(missingAnalysisFields(values), []);
  assert.ok(["high", "moderate"].includes(analysisReliability(parsed, values)));
  assert.equal(analysisReliability(parsed, { ...values, currentRentMonthly: undefined }), "preliminary");
});
