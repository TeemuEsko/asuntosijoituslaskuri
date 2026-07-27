import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { plotShareRedemptionLabels, redemptionClauseLabels } from "../src/core/i18n/display-values.ts";
import { parseListingText } from "../src/core/parser/listing-parser.ts";

test("negatiiviset vastikkeet ja epärealistiset perustiedot hylätään", () => {
  const result = parseListingText("Hoitovastike: -10 €/kk\nPinta-ala: 0 m²\nRakennusvuosi: 1700");
  assert.equal(result.findings.some((finding) => finding.field === "maintenanceFeeMonthly"), false, "Negatiivinen vastike hyväksyttiin poimintaan");
  assert.equal(result.findings.some((finding) => finding.field === "areaSqm"), false, "Epärealistinen pinta-ala hyväksyttiin poimintaan");
  assert.equal(result.findings.some((finding) => finding.field === "constructionYear"), false, "Epärealistinen rakennusvuosi hyväksyttiin poimintaan");
});

test("valinnaisen vuokratontin tilat ovat suomeksi", () => {
  assert.equal(parseListingText("Tontin omistusmuoto: Valinnainen vuokratontti").findings[0]?.normalizedValue, "optional_leasehold");
  assert.deepEqual(Object.values(plotShareRedemptionLabels), ["Lunastettu", "Ei lunastettu", "Ei tiedossa"]);
});

test("lunastuslausekkeen tilat ja juridinen tarkistus ovat käyttöliittymässä", async () => {
  assert.deepEqual(Object.values(redemptionClauseLabels), ["Ei", "Kyllä", "Ei voitu tarkistaa"]);
  const source = await readFile(new URL("../src/components/property/details-cards.tsx", import.meta.url), "utf8");
  assert.match(source, /Juridinen tarkistus tarvitaan/);
  assert.match(source, /lunastusoikeus/);
});
