import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PRINT_REPORT_FALLBACK_TITLE,
  buildPrintReportTitle,
} from "../src/core/reports/print-report-title.ts";

const read = (path: string) =>
  readFile(new URL(path, import.meta.url), "utf8");

test("tulostusotsikko perustuu osoitteeseen ja käyttää turvallista fallbackia", () => {
  assert.equal(
    buildPrintReportTitle("Metsontie 31 A1, Laihia"),
    "Sijoitusanalyysi – Metsontie 31 A1, Laihia",
  );
  assert.equal(buildPrintReportTitle(), PRINT_REPORT_FALLBACK_TITLE);
  assert.equal(buildPrintReportTitle("  "), PRINT_REPORT_FALLBACK_TITLE);
  assert.doesNotMatch(buildPrintReportTitle(), /Kohdetyötila|Luonnos/);
});

test("tulostuspainike asettaa osoiteotsikon ja palauttaa alkuperäisen otsikon", async () => {
  const reportsCard = await read(
    "../src/components/property/reports-card.tsx",
  );
  assert.match(reportsCard, /buildPrintReportTitle\(reportAddress\)/);
  assert.match(reportsCard, /document\.title = previousTitle/);
  assert.match(reportsCard, /addEventListener\("afterprint"/);
  assert.match(reportsCard, /window\.print\(\)/);
});

test("raportilla on erillinen print-only-esitysrakenne ilman interaktiivisia kontrolleja", async () => {
  const [report, workspace] = await Promise.all([
    read("../src/components/property/investment-analysis-print-report.tsx"),
    read("../src/components/property/property-workspace.tsx"),
  ]);
  assert.match(workspace, /workspace-screen min-h-screen/);
  assert.match(workspace, /<InvestmentAnalysisPrintReport/);
  assert.match(report, /className="print-report"/);
  for (const forbidden of [
    "Luonnos",
    "Ennakkoversio",
    "Luo raportti",
    "Lisää asiakirja",
    "Lataa analyysidata",
    "Näytä alkuperäiset remonttitekstit",
    "Tarkemmat perusteet",
    "Pyydä ammattilaisen arvio",
  ])
    assert.equal(report.includes(forbidden), false, forbidden);
  assert.doesNotMatch(report, /<(?:input|select|button|details|summary)\b/);
});

test("raportti näyttää score-heron, neljä KPI:tä ja vain valitut markkina-arviot", async () => {
  const report = await read(
    "../src/components/property/investment-analysis-print-report.tsx",
  );
  assert.match(report, /print-score-hero print-avoid-break/);
  assert.match(report, /print-score-track/);
  assert.match(report, /analysis\.score/);
  for (const label of [
    "Nettovuokratuotto",
    "Kassavirta",
    "Arvioitu kuukausivuokra",
    "Vakuusvaje",
    "Vuokrakysyntä",
    "Sijaintiriski",
    "Jälleenmyytävyys",
  ])
    assert.ok(report.includes(label), label);
  assert.match(report, /choice\.effectiveValue/);
  assert.doesNotMatch(report, /options\.map|onMarketChange|onChange=|onClick=/);
});

test("raportti käyttää suoraan työtilan canonical- ja analyysiarvoja", async () => {
  const [report, workspace] = await Promise.all([
    read("../src/components/property/investment-analysis-print-report.tsx"),
    read("../src/components/property/property-workspace.tsx"),
  ]);
  for (const prop of [
    "data={data}",
    "purchase={purchase}",
    "assumptions={assumptions}",
    "analysis={overallScore}",
    "rentEstimate={rentEstimate}",
    "marketAssessments={marketAssessments}",
    "repairHistory={repairHistory}",
  ])
    assert.ok(workspace.includes(prop), prop);
  assert.doesNotMatch(report, /calculateInvestmentAnalysis|adaptInvestmentScore|calculateBankLoan/);
  assert.match(report, /analysis\.netRentalYield/);
  assert.match(report, /analysis\.cashFlowAfterBankLoan/);
  assert.match(report, /analysis\.monthlyBankLoanPayment/);
  for (const label of ["Yhtiölainaosuus", "Remonttivara", "Oikaistu hankintahinta", "Vakuusarvoprosentti", "Arvioitu vakuusarvo"]) assert.match(report, new RegExp(label));
  assert.match(report, /Laskelma perustuu täyteen 12 kuukauden vuokrausasteeseen/);
});

test("PDF:n lähtötiedot etenevät järjestyksessä A hankinta, B pankkirahoitus ja C vuokraus", async () => {
  const report = await read("../src/components/property/investment-analysis-print-report.tsx");
  const purchase = report.indexOf('title="A. Hinta ja hankinta"');
  const financing = report.indexOf('title="B. Pankkirahoitus"');
  const rental = report.indexOf('title="C. Vuokraus ja tuotot"');

  assert.ok(purchase >= 0);
  assert.ok(purchase < financing);
  assert.ok(financing < rental);
  assert.match(report.slice(financing, rental), /Pankkilaina[\s\S]*Oma pääoma[\s\S]*Korko[\s\S]*Laina-aika/);
  assert.match(report.slice(rental), /Kuukausivuokra[\s\S]*Hoitovastike[\s\S]*Rahoitusvastike[\s\S]*Muut kuukausikulut[\s\S]*Tyhjäkäynti/);
});

test("raportti erottaa markkina-arvion oletuksen, käyttäjävalinnan ja todellisen lähteen", async () => {
  const report = await read("../src/components/property/investment-analysis-print-report.tsx");
  assert.match(report, /choice\.source === "default" \? "Oletus"/);
  assert.match(report, /choice\.userOverridden \? "Käyttäjän valinta"/);
  assert.match(report, /evidence\.publisher/);
  assert.match(report, /evidence\.datasetName/);
  assert.match(report, /evidence\.period/);
});

test("A4-tyylit hallitsevat värit ja sivukatkot", async () => {
  const css = await read("../src/app/globals.css");
  assert.match(css, /@page\s*{[\s\S]*size: A4 portrait/);
  assert.match(css, /\.workspace-screen\s*{[\s\S]*display: none !important/);
  assert.match(css, /\.print-report-page\s*{[\s\S]*break-after: page/);
  assert.match(css, /\.print-avoid-break[\s\S]*break-inside: avoid/);
  assert.match(css, /print-color-adjust: exact/);
});

test("raportin tarkistettavat tiedot poistavat myös välimerkistä johtuvat kaksoiskappaleet", async () => {
  const report = await read(
    "../src/components/property/investment-analysis-print-report.tsx",
  );
  assert.match(report, /const reviewCandidates =/);
  assert.match(report, /replace\(\/\[\.!\?\]\+\$\/g, ""\)/);
  assert.match(report, /findIndex/);
});
