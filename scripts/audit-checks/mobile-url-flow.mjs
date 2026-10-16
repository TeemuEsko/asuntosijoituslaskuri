import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const artifactDirectory = process.env.ARTIFACT_DIR;
if (artifactDirectory) await mkdir(artifactDirectory, { recursive: true });
const viewports = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];
const fixtureValues = [
  ["address", "Osoite", "Kivikkokuja 4 A 2, 65100 Vaasa"],
  ["roomDescription", "Huonejako", "2h + k"],
  ["debtFreePrice", "Velaton hinta", 120000], ["salePrice", "Myyntihinta", 100000],
  ["companyLoanShare", "Yhtiölainaosuus", 20000], ["maintenanceFeeMonthly", "Hoitovastike", 250],
  ["financingFeeMonthly", "Rahoitusvastike", 100], ["areaSqm", "Pinta-ala", 50],
  ["constructionYear", "Rakennusvuosi", 2010], ["currentRentMonthly", "Kuukausivuokra", 800],
  ["buildingType", "Talotyyppi", "apartment"], ["heatingType", "Lämmitysmuoto", "district"],
];
const findings = fixtureValues.map(([field, fieldName, value], index) => ({ id: `${field}-${index}`, field, fieldName, originalLabel: fieldName, originalValue: String(value), normalizedValue: value, source: "etuovi", sourceExcerpt: `${fieldName}: ${value}`, supportingSources: [{ semanticSource: "named_field", section: "basic", excerpt: `${fieldName}: ${value}`, originalValue: String(value) }], section: "basic", confidence: "high", confidenceScore: 95, confidenceReasons: ["Tarkka kenttäosuma"], sourceConfidence: 95, fieldMatchConfidence: 95, validationConfidence: 100, validationResult: "accepted", conflicts: [], autoAccepted: true }));
const listingResult = { source: "etuovi", findings, renovations: [], missingCriticalFields: [], warnings: [], housingCompanyLoan: { debtShare: 20000, hasDebtShare: true, source: "direct", sourceDescription: "Ilmoituksessa annettu yhtiölainaosuus", confidence: "high", userOverridden: false, conflicts: [] }, rentEstimate: { effectiveMonthlyRent: 800, exactEstimatedMonthlyRent: 800, source: "listing", sourceName: "Myynti-ilmoitus", confidence: "high", userOverridden: false, resolutionStatus: "resolved" }, preparation: { status: "ready", allAutomaticEnrichmentsCompleted: true, completedStages: ["parsing_listing", "normalizing_data", "resolving_location", "estimating_rent", "analysing_listing_images", "running_enrichments", "validating_inputs"], missingCriticalFields: [], nextStep: "analysis" }, diagnostics: { parserVersion: "test", site: "etuovi", sections: [], rawCandidateCount: findings.length, rejectedCandidates: [], fieldDiagnostics: [], mergedFindingCount: findings.length, acceptedFields: findings.length, rejectedFields: 0, conflicts: [], missingEssentialFields: [], warnings: [], errors: [] } };

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
    await page.route("**/api/listing-identify", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ preview: { address: "Kivikkokuja 4 A 2, 65100 Vaasa", roomDescription: "2h + k", areaSqm: 50, debtFreePrice: 120000, buildingType: "apartment" } }) }));
    await page.route("**/api/listing-import", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listingResult) }));
    await page.route("**/api/report", (route) => route.fulfill({ status: 204 }));

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByLabel("Etuovi- tai Oikotie-linkki").fill("https://www.etuovi.com/kohde/12345678");
    await page.getByRole("button", { name: "Hae tiedot", exact: true }).click();
    await page.locator("#vacancy-months").waitFor({ state: "visible", timeout: 30_000 });
    assert.equal(await page.getByText("Analyysisi on pian valmis!").count(), 0);
    assert.equal(await page.getByLabel("Etunimi").count(), 0);
    assert.equal(await page.getByLabel("Sähköpostiosoite").count(), 0);
    if (artifactDirectory) {
      await page.screenshot({
        path: path.join(artifactDirectory, `mobile-top-${viewport.width}x${viewport.height}.png`),
      });
      if (viewport.width === 390) {
        const previousTitle = await page.title();
        await page.evaluate(() => {
          document.title = "Sijoitusanalyysi – Kivikkokuja 4 A 2, 65100 Vaasa";
        });
        await page.emulateMedia({ media: "print" });
        await page.pdf({
          path: path.join(artifactDirectory, "investment-analysis-report.pdf"),
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
        });
        await page.emulateMedia({ media: "screen" });
        await page.evaluate((title) => {
          document.title = title;
        }, previousTitle);
      }
    }

    const vacancy = page.locator("#vacancy-months");
    await vacancy.scrollIntoViewIfNeeded();
    await vacancy.fill("1");
    await vacancy.blur();
    assert.match(await vacancy.inputValue(), /^1(?:[,.]0)?$/);
    if (artifactDirectory) {
      await page.screenshot({
        path: path.join(artifactDirectory, `mobile-financing-${viewport.width}x${viewport.height}.png`),
      });
    }

    await page.getByRole("button", { name: "Luo raportti" }).click();
    const printAction = page.getByRole("button", { name: "Tulosta tai tallenna PDF" });
    await printAction.waitFor({ state: "visible" });
    await page.evaluate(() => {
      window.print = () => {
        window.__capturedPrintTitle = document.title;
      };
    });
    await printAction.click();
    await page.waitForFunction(() => typeof window.__capturedPrintTitle === "string");
    const printTitle = await page.evaluate(() => window.__capturedPrintTitle);
    assert.equal(printTitle, "Sijoitusanalyysi – Kivikkokuja 4 A 2, 65100 Vaasa");
    const expertAction = page.getByRole("button", { name: "Pyydä ammattilaisen arvio" });
    await expertAction.scrollIntoViewIfNeeded();
    await expertAction.click();
    if (artifactDirectory) {
      await page.screenshot({
        path: path.join(artifactDirectory, `mobile-${viewport.width}x${viewport.height}.png`),
      });
    }
    await page.evaluate(async () => {
      for (let top = 0; top <= document.documentElement.scrollHeight; top += innerHeight / 2) {
        scrollTo(0, top);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    });

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    assert.ok(
      dimensions.scrollWidth <= dimensions.clientWidth,
      `${viewport.width}x${viewport.height}: vaakasuuntainen ylivuoto ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`,
    );
    console.log(`${viewport.width}x${viewport.height}: URL → analyysi → muokkaus → raportti OK`);
    await page.close();
  }
} finally {
  await browser.close();
}
