import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { plotShareRedemptionLabels, redemptionClauseLabels } from "../src/core/i18n/display-values.ts";
import { parseListingText } from "../src/core/parser/listing-parser.ts";

test("negatiiviset vastikkeet ja epärealistiset perustiedot hylätään", () => { const result = parseListingText("Hoitovastike: -10 €/kk\nPinta-ala: 0 m²\nRakennusvuosi: 1700"); assert.equal(result.findings.some((finding) => finding.field === "maintenanceFeeMonthly"), false); assert.equal(result.findings.some((finding) => finding.field === "areaSqm"), false); assert.equal(result.findings.some((finding) => finding.field === "constructionYear"), false); });
test("valinnaisen vuokratontin tilat ovat suomeksi", () => { assert.equal(parseListingText("Tontin omistusmuoto: Valinnainen vuokratontti").findings[0]?.normalizedValue, "optional_leasehold"); assert.deepEqual(Object.values(plotShareRedemptionLabels), ["Lunastettu", "Ei lunastettu", "Ei tiedossa"]); });
test("lunastuslauseke on kontekstuaalinen huomio eikä suuri lomake", async () => { assert.deepEqual(Object.values(redemptionClauseLabels), ["Ei", "Kyllä", "Ei voitu tarkistaa"]); const source = await readFile(new URL("../src/components/property/details-cards.tsx", import.meta.url), "utf8"); assert.match(source, /Yhtiöjärjestyksessä on lunastuslauseke/); assert.match(source, /osakkeiden siirtymiseen/); assert.doesNotMatch(source, /SelectField label="Yhtiöjärjestyksen lunastuslauseke"/); });
