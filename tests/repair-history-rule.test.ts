import assert from "node:assert/strict";
import test from "node:test";

import { parseListingText } from "../src/core/parser/listing-parser.ts";
import { assessRepairHistory, classifyRepair, type RepairDocumentKind } from "../src/core/rules/repair-history.ts";

function assess(text: string, constructionYear = 1970, documentKinds: RepairDocumentKind[] = ["listing"]) {
  return assessRepairHistory({ renovations: parseListingText(`Tehdyt remontit\n${text}`).renovations, constructionYear, documentKinds });
}

test("1: useat ylläpitotyöt nostavat suurten korjausten tarkistuksen", () => {
  const result = assess("Lukitus uusittu 2018\nPostilaatikot uusittu 2019\nPihavalaistus uusittu 2020");
  assert.equal(result.status, "major_status_check");
});

test("2: parvekeovien vaihto ei ole julkisivuremontti", () => {
  const result = assess("Parvekeovet vaihdettu 2019");
  assert.equal(result.repairs.some((item) => item.scale === "major" && item.system === "facade_balconies"), false);
});

test("3: elementtisaumat eivät yksin ole julkisivusaneeraus", () => {
  assert.equal(assess("Elementtisaumat uusittu 2019").repairs[0]?.scale, "partial");
});

test("4: katon pinnoitus ei ole vesikaton uusiminen", () => {
  assert.equal(assess("Katto pinnoitettu 2019").repairs[0]?.scale, "partial");
});

test("5: käyttövesiputket eivät yksin ole täydellinen linjasaneeraus", () => {
  const result = assess("Käyttövesiputket uusittu 2018");
  assert.equal(result.repairs[0]?.scale, "partial");
  assert.equal(result.repairs.some((item) => item.component === "full_line"), false);
});

test("6: viemärien sukitus ei ole koko LVIS-saneeraus", () => {
  assert.equal(assess("Viemärien sukitus toteutettu 2019").repairs[0]?.scale, "partial");
});

test("7: täydellinen linjasaneeraus tunnistetaan suureksi", () => {
  assert.equal(assess("Täydellinen linjasaneeraus tehty 2018").status, "major_recognized");
});

test("8: julkisivujen ja parvekkeiden saneeraus tunnistetaan suureksi", () => {
  const result = assess("Julkisivut ja parvekkeet saneerattu laajasti 2018");
  assert.equal(result.status, "major_recognized");
});

test("9: vesikaton uusiminen tunnistetaan suureksi", () => {
  assert.equal(assess("Vesikatto uusittu 2018").status, "major_recognized");
});

test("10: salaojien ja perustusten vedeneristyksen uusiminen on suuri", () => {
  assert.equal(assess("Salaojat ja perustusten vedeneristys uusittu 2018").status, "major_recognized");
});

test("11: kuntotutkimus ei ole toteutettu korjaus", () => {
  const result = assess("Putkiston kuntotutkimus tehty 2021");
  assert.ok(result.repairs.every((item) => item.scale === "study"));
  assert.ok(result.repairs.every((item) => item.status === "investigated"));
});

test("12: hankesuunnittelu on valmistelussa", () => {
  const result = assess("Putkiremontin hankesuunnittelu aloitettu 2024");
  assert.equal(result.repairs[0]?.status, "preparing");
  assert.equal(result.repairs[0]?.scale, "study");
});

test("13: pelkän myynti-ilmoituksen rajallisuus kerrotaan", () => {
  assert.match(assess("Lukitus uusittu 2018").sourceLimitation ?? "", /myynti-ilmoituksen tietoihin/i);
});

test("14: kattavat taloyhtiöasiakirjat nostavat varmuutta", () => {
  const result = assess("Lukitus uusittu 2018", 1970, ["manager_certificate", "maintenance_plan", "annual_report"]);
  assert.equal(result.confidence, "high");
  assert.equal(result.sourceLimitation, undefined);
});

test("15: uudehko yhtiö ei saa tarpeettoman voimakasta varoitusta", () => {
  const result = assess("Lukitus uusittu 2023\nPostilaatikot uusittu 2024\nPihavalaistus uusittu 2025", 2015);
  assert.equal(result.severity, "low");
});

test("16: vanhempi yhtiö saa korostetun tarkistustarpeen", () => {
  const result = assess("Lukitus uusittu 2018\nPostilaatikot uusittu 2019\nPihavalaistus uusittu 2020", 1965);
  assert.equal(result.severity, "medium");
});

test("17: osakorjaus jättää kokonaisuuden tarkistettavaksi", () => {
  const result = assess("Käyttövesiputket uusittu 2018", 2010);
  assert.equal(result.status, "partial_recognized");
  assert.match(result.relevantSystems.find((item) => item.system === "plumbing")?.reason ?? "", /Osittainen korjaus/);
});

test("18: suunniteltu suuri remontti ei näy tehtynä", () => {
  const parsed = parseListingText("Tulevat remontit\nTäydellinen linjasaneeraus suunnitteilla 2029");
  const repair = parsed.renovations.find((item) => item.component === "full_line");
  assert.equal(repair?.status, "planned");
  assert.equal(classifyRepair(repair!).scale, "major");
  assert.notEqual(assessRepairHistory({ renovations: parsed.renovations, constructionYear: 1970, documentKinds: ["listing"] }).status, "major_recognized");
});
