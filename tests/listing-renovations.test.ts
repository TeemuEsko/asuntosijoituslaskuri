import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { adaptInvestmentScore } from "../src/core/analysis/investment-score-adapter.ts";
import { mergeRenovationFindings } from "../src/core/data-fusion/merge-renovations.ts";
import { parseListingText, type RenovationFinding } from "../src/core/parser/listing-parser.ts";
import { assessRepairHistory } from "../src/core/rules/repair-history.ts";

const completedText = "Paljon merkittäviä korjauksia vuosien varrella. Viimeisimpiä merkittävimpiä: salaoja- ja ikkuna sekä ulko-oviremontti, valokuituliittymä taloyhtiöön, talon ulkomaalaus. Lisäksi viemärit sukitettu ja käyttövesiputket uusittu sekä tonttivesijohto uusittu.";
const plannedText = "V. 2027-2031 suunnitteilla: Katon maalaus/korjaus/uusiminen.";
const listingText = `Taloyhtiössä tehdyt remontit:\n${completedText}\nSuunnitellut remontit:\n${plannedText}`;

test("Etuovi-regressio tunnistaa pitkän tehdyn remonttihistorian kategorioiksi", () => {
  const result = parseListingText(listingText, "etuovi");
  const components = new Set(result.renovations.filter((repair) => repair.status === "completed").map((repair) => repair.component));
  for (const component of ["drainage", "windows", "exterior_doors", "fiber_connection", "facade_painting", "drain_lining", "water_pipes", "plot_water_line"] as const) assert.ok(components.has(component), `${component} puuttuu`);
  assert.equal(result.housingCompanyRenovations.completedRawText, completedText);
  assert.ok(result.renovations.filter((repair) => repair.status === "completed").every((repair) => repair.source === "listing" && repair.sourceName === "Myynti-ilmoitus" && !repair.verifiedByDocuments));
  assert.ok(result.renovations.every((repair) => repair.confidence !== "high"));
});

test("suunniteltu kattoremontti säilyttää tilan ja vuosivälin", () => {
  const result = parseListingText(listingText, "etuovi");
  const roof = result.renovations.find((repair) => repair.component === "roof_unspecified");
  assert.equal(roof?.status, "planned");
  assert.equal(roof?.year, null);
  assert.equal(roof?.yearFrom, 2027);
  assert.equal(roof?.yearTo, 2031);
  assert.match(roof?.description ?? "", /maalaus\/korjaus\/uusiminen/i);
  assert.equal(result.housingCompanyRenovations.plannedRawText, plannedText);
});

test("kaikki sovitut tehdyn ja tulevan remontin otsikot tunnistetaan", () => {
  const completedLabels = ["Tehdyt remontit", "Tehdyt korjaukset", "Taloyhtiössä tehdyt remontit", "Taloyhtiön remontit", "Korjaushistoria", "Peruskorjaukset", "Suoritetut korjaukset", "Kunnossapito ja korjaukset"];
  const plannedLabels = ["Tulevat remontit", "Tulevat korjaukset", "Suunnitellut remontit", "Suunnitellut korjaukset", "Kunnossapitotarveselvitys", "Kunnossapitotarpeet", "Tulevat peruskorjaukset", "Arvio tulevista korjauksista", "Seuraavien vuosien korjaukset"];
  for (const label of completedLabels) assert.equal(parseListingText(`${label}:\nIkkunat uusittu 2020`).renovations[0]?.status, "completed", label);
  for (const label of plannedLabels) assert.equal(parseListingText(`${label}:\nKattoremontti suunnitteilla 2029`).renovations[0]?.status, "planned", label);
});

test("remonttiotsikoiden variaatiot ja päätösasteet tunnistetaan", () => {
  const cases = [
    ["Taloyhtiön tehdyt remontit:\nIkkunat uusittu 2020", "completed"],
    ["Tulevat korjaukset:\nKattoremontti yhtiökokous on päättänyt toteuttaa 2028", "decided"],
    ["Kunnossapitotarveselvitys 5 vuotta:\nJulkisivun korjausta mahdollisesti lähivuosina", "proposed"],
    ["PTS:\nPutkiremonttia selvitetään", "under_investigation"],
    ["Suunnitellut korjaukset:\nVesikaton korjaus toteutetaan parhaillaan", "ongoing"],
  ] as const;
  for (const [text, expected] of cases) assert.equal(parseListingText(text).renovations[0]?.status, expected);
});

function documentVersion(repair: RenovationFinding, overrides: Partial<RenovationFinding> = {}): RenovationFinding {
  return { ...repair, id: `document-${repair.id}`, source: "document", sourceName: "Isännöitsijäntodistus", verifiedByDocuments: true, confidence: "high", confidenceScore: 92, rawText: repair.rawText, sourceHistory: [{ source: "document", sourceName: "Isännöitsijäntodistus", rawText: repair.rawText, confidence: "high" }], ...overrides };
}

test("asiakirja vahvistaa saman remontin ilman duplikaattia", () => {
  const listingRepair = parseListingText("Tehdyt remontit\nKäyttövesiputket uusittu 2018").renovations[0]!;
  const merged = mergeRenovationFindings([listingRepair], [documentVersion(listingRepair)]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.source, "document");
  assert.equal(merged[0]?.confidence, "high");
  assert.equal(merged[0]?.verifiedByDocuments, true);
  assert.equal(merged[0]?.sourceHistory.length, 2);
});

test("asiakirjan ristiriitainen tila voittaa ilmoituksen mutta alkuperäinen lähde säilyy", () => {
  const listingRepair = parseListingText("Tehdyt remontit\nKäyttövesiputket uusittu 2018").renovations[0]!;
  const documentRepair = documentVersion(listingRepair, { status: "planned", description: "Käyttövesiputket suunnitteilla 2018", rawText: "Käyttövesiputket suunnitteilla 2018" });
  const merged = mergeRenovationFindings([listingRepair], [documentRepair]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.source, "document");
  assert.equal(merged[0]?.status, "planned");
  assert.equal(merged[0]?.conflicts.length, 1);
  assert.ok(merged[0]?.sourceHistory.some((source) => source.source === "listing"));
});

test("asiakirjan ristiriitainen vuosiluku voittaa ilmoituksen ja synnyttää varoituksen", () => {
  const listingRepair = parseListingText("Tehdyt remontit\nIkkunat uusittu 2020").renovations[0]!;
  const documentRepair = documentVersion(listingRepair, { year: 2021, years: [2021], rawText: "Ikkunat uusittu 2021", description: "Ikkunat uusittu 2021" });
  const merged = mergeRenovationFindings([listingRepair], [documentRepair]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.source, "document");
  assert.equal(merged[0]?.year, 2021);
  assert.equal(merged[0]?.confidence, "medium");
  assert.equal(merged[0]?.conflicts.length, 1);
});

test("käyttäjän remonttitieto ohittaa asiakirjan lähdeprioriteetin mukaisesti", () => {
  const listingRepair = parseListingText("Tehdyt remontit\nIkkunat uusittu 2020").renovations[0]!;
  const documentRepair = documentVersion(listingRepair);
  const userRepair: RenovationFinding = { ...listingRepair, id: "user-windows", source: "user", sourceName: "Käyttäjän tieto", rawText: "Ikkunat uusittu 2020", sourceHistory: [{ source: "user", sourceName: "Käyttäjän tieto", rawText: "Ikkunat uusittu 2020", confidence: "high" }], confidence: "high", confidenceScore: 100 };
  const merged = mergeRenovationFindings([documentRepair], [userRepair]);
  assert.equal(merged[0]?.source, "user");
});

test("ilmoituksen korjaukset vaikuttavat ensimmäiseen analyysiin ja tuleva kattohanke näkyy riskinä", () => {
  const parsed = parseListingText(listingText, "etuovi");
  const assessment = assessRepairHistory({ renovations: parsed.renovations, documentKinds: ["listing"], constructionYear: 1985 });
  assert.ok(assessment.strengths.some((item) => /Käyttövesiputket/.test(item)));
  assert.ok(assessment.strengths.some((item) => /sukitettu/.test(item)));
  assert.ok(assessment.risks.some((item) => /2027–2031/.test(item)));
  assert.ok(assessment.technicalRiskScore > 50, "tehdyt olennaiset korjaukset pienentävät teknistä riskiä suhteessa puuttuvaan historiaan");
  const analysis = adaptInvestmentScore({ debtFreePrice: 120_000, currentRentMonthly: 850, maintenanceFeeMonthly: 280, vacancyMonths: 1, otherCostsMonthly: 0, renovationReserve: 0, transferTaxRate: 1.5, transactionCosts: 0, annualInterestRate: 4, loanTermYears: 20, repaymentType: "annuity", bankLoanAmount: 80_000, repairHistory: assessment });
  assert.equal(analysis.observations.some((item) => item.id === "missing-repair-history"), false);
});

test("remonttiosio ja asiakirjavahvistus näkyvät analyysin käyttöliittymässä suomeksi", async () => {
  const [card, workspace, coverage] = await Promise.all([
    readFile(new URL("../src/components/property/housing-company-renovations-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/analysis-coverage-card.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(card, /Taloyhtiön remontit/);
  assert.match(card, /Tehdyt remontit/);
  assert.match(card, /Suunnitellut remontit/);
  assert.match(card, /Lähde:/);
  assert.match(card, /Vahvista remonttitiedot taloyhtiön asiakirjoista/);
  assert.match(workspace, /housingCompanyRenovations/);
  assert.match(coverage, /Ilmoituksesta löytyi remonttitietoja/);
});
