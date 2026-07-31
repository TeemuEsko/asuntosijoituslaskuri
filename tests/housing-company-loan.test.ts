import assert from "node:assert/strict";
import test from "node:test";

import {
  HOUSING_COMPANY_LOAN_FEE_CONFLICT,
  housingCompanyLoanStatus,
  resolveHousingCompanyLoan,
} from "../src/core/analysis/housing-company-loan.ts";
import { prepareListingAnalysis } from "../src/core/analysis/prepare-listing-analysis.ts";
import { automaticValues, debtShareStatus } from "../src/core/analysis/requirements.ts";
import { parseListingText } from "../src/core/parser/listing-parser.ts";

test("suora yhtiölainaosuus on ensisijainen", () => {
  const result = resolveHousingCompanyLoan({ directDebtShare: 12_500, debtFreePrice: 100_000, salePrice: 87_500 });
  assert.equal(result.debtShare, 12_500);
  assert.equal(result.hasDebtShare, true);
  assert.equal(result.source, "direct");
  assert.equal(result.confidence, "high");
});

test("nimenomainen tieto lainattomuudesta tuottaa tunnetun nollan", () => {
  const result = resolveHousingCompanyLoan({ explicitHasDebtShare: false });
  assert.equal(result.debtShare, 0);
  assert.equal(result.hasDebtShare, false);
  assert.equal(result.source, "explicit_no_debt");
});

test("parseri erottaa nimenomaisen ei-arvon ei tiedossa -arvosta", () => {
  assert.equal(parseListingText("Yhtiölainaosuus: Ei").housingCompanyLoan.hasDebtShare, false);
  assert.equal(parseListingText("Yhtiölainaosuus: Ei tiedossa").housingCompanyLoan.hasDebtShare, null);
});

test("samat hinnat ilman rahoitusvastiketta päättelevät yhtiölainaosuuden nollaksi", () => {
  const result = resolveHousingCompanyLoan({ debtFreePrice: 88_000, salePrice: 88_000 });
  assert.deepEqual(
    { debtShare: result.debtShare, hasDebtShare: result.hasDebtShare, source: result.source, confidence: result.confidence },
    { debtShare: 0, hasDebtShare: false, source: "calculated", confidence: "high" },
  );
  assert.match(result.sourceDescription, /Velaton hinta − myyntihinta = 0 €/);
});

test("hintojen positiivinen erotus päätellään yhtiölainaosuudeksi", () => {
  const result = resolveHousingCompanyLoan({ debtFreePrice: 100_000, salePrice: 85_000 });
  assert.equal(result.debtShare, 15_000);
  assert.equal(result.hasDebtShare, true);
  assert.equal(result.source, "calculated");
});

test("samojen hintojen ja positiivisen rahoitusvastikkeen ristiriita ei muutu nollaksi", () => {
  const result = resolveHousingCompanyLoan({ debtFreePrice: 88_000, salePrice: 88_000, financingFeeMonthly: 125 });
  assert.equal(result.debtShare, null);
  assert.equal(result.hasDebtShare, null);
  assert.deepEqual(result.conflicts, [HOUSING_COMPANY_LOAN_FEE_CONFLICT]);
});

test("positiivinen rahoitusvastike tukee lainan olemassaoloa mutta ei keksi määrää", () => {
  const result = resolveHousingCompanyLoan({ financingFeeMonthly: 125 });
  assert.equal(result.debtShare, null);
  assert.equal(result.hasDebtShare, true);
  assert.equal(result.source, "financing_fee");
});

test("ilman lainasignaaleja tulos säilyy tuntemattomana", () => {
  const result = resolveHousingCompanyLoan({});
  assert.equal(result.debtShare, null);
  assert.equal(result.hasDebtShare, null);
  assert.equal(result.source, "unknown");
});

test("käyttäjän ylikirjoitus voittaa automaattisen arvon", () => {
  const result = resolveHousingCompanyLoan({ userOverride: 7_500, directDebtShare: 10_000, debtFreePrice: 100_000, salePrice: 90_000 });
  assert.equal(result.debtShare, 7_500);
  assert.equal(result.source, "user");
  assert.equal(result.userOverridden, true);
});

test("yhden euron hintatoleranssi tuottaa nollan mutta suurempi erotus lainan", () => {
  assert.equal(resolveHousingCompanyLoan({ debtFreePrice: 88_001, salePrice: 88_000 }).debtShare, 0);
  assert.equal(resolveHousingCompanyLoan({ debtFreePrice: 88_001.01, salePrice: 88_000 }).debtShare, 1.01);
});

test("konkreettinen 88 000 euron ilmoitus ei kysy yhtiölainaa puuttuvana tietona", async () => {
  const parsed = parseListingText([
    "Hintatiedot",
    "Myyntihinta: 88 000 €",
    "Velaton hinta: 88 000 €",
    "Vastikkeet ja maksut",
    "Hoitovastike: 140,80 €/kk",
    "Yhtiövastike yhteensä: 140,80 €/kk",
  ].join("\n"), "etuovi");
  const values = automaticValues(parsed);
  assert.equal(values.companyLoanShare, 0);
  assert.equal(debtShareStatus(values), "no");
  assert.equal(parsed.housingCompanyLoan.source, "calculated");
  assert.equal(parsed.findings.find((finding) => finding.field === "companyLoanShare")?.originalLabel, "Päätelty hinnoista");

  const prepared = await prepareListingAnalysis(parsed, { fetcher: (async () => { throw new Error("ei verkkohakua"); }) as typeof fetch, logger: { error() {} } });
  assert.notEqual(prepared.preparation?.status, "ready");
  assert.equal(debtShareStatus(automaticValues(prepared)), "no");
});

test("parseri säilyttää hintojen ja rahoitusvastikkeen ristiriidan varoituksena", () => {
  const parsed = parseListingText("Myyntihinta: 88 000 €\nVelaton hinta: 88 000 €\nRahoitusvastike: 125 €/kk", "etuovi");
  assert.equal(parsed.housingCompanyLoan.debtShare, null);
  assert.ok(parsed.warnings.includes(HOUSING_COMPANY_LOAN_FEE_CONFLICT));
  assert.equal(automaticValues(parsed).companyLoanShare, undefined);
  assert.equal(housingCompanyLoanStatus(parsed.housingCompanyLoan), "unknown");
});
