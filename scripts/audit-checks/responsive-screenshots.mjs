import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const screenshots = path.join(root, "reports", "screenshots");
await mkdir(screenshots, { recursive: true });
const port = await new Promise((resolve, reject) => { const server = createServer(); server.on("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); if (!address || typeof address === "string") return reject(new Error("Vapaata porttia ei löytynyt")); const value = address.port; server.close(() => resolve(value)); }); });
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const app = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], { cwd: root, stdio: "ignore", windowsHide: true });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(`http://127.0.0.1:${port}`); if (response.ok) return; } catch { /* Palvelin käynnistyy. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Next.js-palvelin ei käynnistynyt auditointia varten");
}

const viewports = [[1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]];
let browser;
try {
  await waitForServer(); browser = await chromium.launch({ headless: true });
  const startPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await startPage.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });
  const urlInput = startPage.getByPlaceholder("Liitä Etuovi- tai Oikotie-linkki");
  const searchButton = startPage.getByRole("button", { name: "Hae tiedot", exact: true });
  const startCards = await startPage.locator('[data-slot="card"]').evaluateAll((cards) => cards.slice(0, 3).map((card) => { const box = card.getBoundingClientRect(); return { top: box.top, width: box.width }; }));
  if (startCards.length !== 3 || !(startCards[0].top < startCards[1].top && startCards[1].top < startCards[2].top) || Math.max(...startCards.map((card) => card.width)) - Math.min(...startCards.map((card) => card.width)) > 2) throw new Error("Aloituskortit eivät ole samanlevyisinä pystysarakkeessa");
  if (!await searchButton.isDisabled()) throw new Error("Tyhjän URL-kentän hakupainike ei ole pois käytöstä");
  await urlInput.fill("https://example.com/kohde/1");
  await urlInput.press("Enter");
  await startPage.getByRole("alert").getByText(/kelvollinen Etuovi- tai Oikotie/).waitFor();
  const required = [["debtFreePrice", "Velaton hinta", 89000], ["maintenanceFeeMonthly", "Hoitovastike", 245], ["areaSqm", "Pinta-ala", 32], ["constructionYear", "Rakennusvuosi", 1987], ["buildingType", "Talotyyppi", "apartment"], ["heatingType", "Lämmitysmuoto", "district"], ["currentRentMonthly", "Kuukausivuokra", 750], ["companyLoanShare", "Yhtiölainaosuus", 0]];
  const findings = required.map(([field, fieldName, value], index) => ({ id: `${field}-${index}`, field, fieldName, originalLabel: fieldName, originalValue: String(value), normalizedValue: value, source: "etuovi", sourceExcerpt: `Myynti-ilmoituksen HTML: ${fieldName} ${value}`, supportingSources: [{ semanticSource: "named_field", section: "basic", excerpt: `${fieldName}: ${value}`, originalValue: String(value) }], section: "basic", confidence: "high", confidenceScore: 90, confidenceReasons: ["Tarkka kenttäosuma"], sourceConfidence: 90, fieldMatchConfidence: 90, validationConfidence: 100, validationResult: "accepted", conflicts: [], autoAccepted: true }));
  const completedStages = ["parsing_listing", "normalizing_data", "resolving_location", "estimating_rent", "running_enrichments", "validating_inputs"];
  const readyPreparation = { status: "ready", allAutomaticEnrichmentsCompleted: true, completedStages, missingCriticalFields: [], nextStep: "analysis" };
  await startPage.route("**/api/listing-import", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ source: "etuovi", findings, preparation: readyPreparation, renovations: [], missingCriticalFields: [], warnings: [], diagnostics: { parserVersion: "test", site: "etuovi", sections: [], rawCandidateCount: findings.length, rejectedCandidates: [], fieldDiagnostics: [], mergedFindingCount: findings.length, acceptedFields: findings.length, rejectedFields: 0, conflicts: [], missingEssentialFields: [], warnings: [], errors: [] } }) }));
  await urlInput.fill("https://www.etuovi.com/kohde/123");
  await urlInput.press("Enter");
  await startPage.getByText("Analyysi valmis", { exact: true }).waitFor();
  await startPage.close();
  const pendingRentPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pendingRentPage.route("**/api/listing-import", async (route) => { await new Promise((resolve) => setTimeout(resolve, 1_000)); await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ source: "etuovi", findings, preparation: readyPreparation, renovations: [], missingCriticalFields: [], warnings: [], diagnostics: { parserVersion: "test", site: "etuovi", sections: [], rawCandidateCount: findings.length, rejectedCandidates: [], fieldDiagnostics: [], mergedFindingCount: findings.length, acceptedFields: findings.length, rejectedFields: 0, conflicts: [], missingEssentialFields: [], warnings: [], errors: [] } }) }); });
  await pendingRentPage.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });
  await pendingRentPage.getByPlaceholder("Liitä Etuovi- tai Oikotie-linkki").fill("https://www.etuovi.com/kohde/odotus");
  await pendingRentPage.getByPlaceholder("Liitä Etuovi- tai Oikotie-linkki").press("Enter");
  await pendingRentPage.getByText("Arvioimme kohteen markkinavuokraa…", { exact: true }).waitFor();
  if (await pendingRentPage.getByText(/Tarvitsen vielä/).count() || await pendingRentPage.locator("#missing-currentRentMonthly").count()) throw new Error("Puuttuvien tietojen näkymä näkyi vuokrahaun aikana");
  await pendingRentPage.getByText("Analyysi valmis", { exact: true }).waitFor();
  await pendingRentPage.close();
  const automaticRentPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const rentEstimate = { effectiveMonthlyRent: 795, exactEstimatedMonthlyRent: 793.4, rentPerSquareMeter: 15.9, source: "statistics_finland", sourceName: "Tilastokeskus, asuntojen vuokrat", sourceArea: "Vaasa", sourceAreaLevel: "municipality", roomCategory: "TWO_ROOMS", referencePeriod: "2026Q2", metricType: "average", housingFinanceType: "non_subsidised", confidence: "medium", sampleSize: 120, rawSourceValue: 15.9, userOverridden: false, fetchedAt: "2026-07-16T05:00:00Z", datasetId: "15fa", resolutionStatus: "resolved" };
  await automaticRentPage.route("**/api/listing-import", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ source: "etuovi", findings: findings.filter((finding) => finding.field !== "currentRentMonthly"), rentEstimate, preparation: readyPreparation, renovations: [], missingCriticalFields: [], warnings: [], diagnostics: { parserVersion: "test", site: "etuovi", sections: [], rawCandidateCount: findings.length - 1, rejectedCandidates: [], fieldDiagnostics: [], mergedFindingCount: findings.length - 1, acceptedFields: findings.length - 1, rejectedFields: 0, conflicts: [], missingEssentialFields: [], warnings: [], errors: [] } }) }));
  await automaticRentPage.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });
  await automaticRentPage.getByPlaceholder("Liitä Etuovi- tai Oikotie-linkki").fill("https://www.etuovi.com/kohde/789");
  await automaticRentPage.getByPlaceholder("Liitä Etuovi- tai Oikotie-linkki").press("Enter");
  await automaticRentPage.getByText("Tilastokeskuksen arvio", { exact: true }).waitFor();
  await automaticRentPage.getByText(/Vaasa.*15,9 €\/m²\/kk.*2026Q2/).waitFor();
  await automaticRentPage.getByRole("button", { name: "Täsmennä tarvittaessa" }).click();
  const automaticRentInput = automaticRentPage.locator("#market-rent");
  await automaticRentInput.fill("850");
  if (await automaticRentInput.inputValue() !== "850" || !await automaticRentInput.evaluate((element) => document.activeElement === element)) throw new Error("Automaattisen vuokran täsmennyskenttä ei säilyttänyt arvoa tai fokusta");
  await automaticRentPage.getByRole("button", { name: "Käytä tätä vuokraa" }).click();
  await automaticRentPage.getByText("Käyttäjän määrittämä vuokra", { exact: true }).waitFor();
  await automaticRentPage.reload({ waitUntil: "networkidle" });
  await automaticRentPage.getByText("Käyttäjän määrittämä vuokra", { exact: true }).waitFor();
  await automaticRentPage.getByText("850 €/kk", { exact: true }).waitFor();
  await automaticRentPage.getByText(/Alueellinen vertailuarvio 795 €\/kk/).waitFor();
  await automaticRentPage.getByRole("button", { name: "Palauta automaattinen arvio" }).click();
  await automaticRentPage.getByText("Tilastokeskuksen arvio", { exact: true }).waitFor();
  await automaticRentPage.close();
  const missingPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const missingRentEstimate = { effectiveMonthlyRent: null, source: "unknown", confidence: "unknown", userOverridden: false, resolutionStatus: "unavailable" };
  const needsRentPreparation = { status: "needs_user_input", allAutomaticEnrichmentsCompleted: true, completedStages, missingCriticalFields: ["currentRentMonthly"], nextStep: "missing_data" };
  await missingPage.route("**/api/listing-import", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ source: "etuovi", findings: findings.filter((finding) => finding.field !== "currentRentMonthly"), rentEstimate: missingRentEstimate, preparation: needsRentPreparation, renovations: [], missingCriticalFields: ["Nykyinen vuokra"], warnings: [], diagnostics: { parserVersion: "test", site: "etuovi", sections: [], rawCandidateCount: findings.length - 1, rejectedCandidates: [], fieldDiagnostics: [], mergedFindingCount: findings.length - 1, acceptedFields: findings.length - 1, rejectedFields: 0, conflicts: [], missingEssentialFields: ["Nykyinen vuokra"], warnings: [], errors: [] } }) }));
  await missingPage.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });
  await missingPage.getByPlaceholder("Liitä Etuovi- tai Oikotie-linkki").fill("https://www.etuovi.com/kohde/456");
  await missingPage.getByPlaceholder("Liitä Etuovi- tai Oikotie-linkki").press("Enter");
  await missingPage.getByRole("heading", { name: "Emme pystyneet arvioimaan kohteen vuokraa automaattisesti" }).waitFor();
  await missingPage.getByText("Syötä arvioitu kuukausivuokra, jotta voimme viimeistellä analyysin.", { exact: true }).waitFor();
  const rentInput = missingPage.locator("#missing-currentRentMonthly");
  await rentInput.waitFor();
  if (await rentInput.getAttribute("type") !== "number") throw new Error("Vuokrakenttä ei ole numeerinen");
  await rentInput.locator("xpath=..").getByText("€ / kk", { exact: true }).waitFor();
  await rentInput.pressSequentially("750");
  if (await rentInput.inputValue() !== "750" || !await rentInput.isVisible()) throw new Error("Vuokrakenttä katosi tai arvo ei säilynyt monimerkkisen syötön aikana");
  if (await missingPage.getByText("Analyysi valmis", { exact: true }).count()) throw new Error("Analyysi käynnistyi ennen Viimeistele analyysi -painallusta");
  await missingPage.getByRole("button", { name: "Viimeistele analyysi" }).click();
  await missingPage.getByText("Analyysi valmis", { exact: true }).waitFor();
  await missingPage.close();
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Aloita tyhjästä" }).click();
    await page.getByRole("heading", { name: "Täydennä sijoituskohteen analyysi", exact: true }).first().waitFor();
    await page.getByText("Täydennä vielä analyysin lähtötiedot", { exact: true }).waitFor();
    if (await page.getByText("Sijoitusmahdollisuus", { exact: true }).count()) throw new Error("Score näkyi ennen kriittisten tietojen täydentämistä");
    await page.locator("#purchase-debtFreePrice").fill("158989"); await page.locator("#purchase-debtFreePrice").blur();
    await page.locator("#purchase-companyLoanShare").fill("0"); await page.locator("#purchase-companyLoanShare").blur();
    await page.locator("#maintenance-fee").fill("280");
    await page.getByRole("button", { name: "Täsmennä tarvittaessa" }).click();
    await page.locator("#market-rent").fill("750");
    await page.getByRole("button", { name: "Käytä tätä vuokraa" }).click();
    await page.getByText("Sijoitusmahdollisuus", { exact: true }).waitFor();
    if (width === 1280) {
      const debtShare = page.locator("#purchase-companyLoanShare");
      const debtFreePrice = page.locator("#purchase-debtFreePrice");
      const salePrice = page.locator("#purchase-salePrice");
      await debtShare.fill("15000"); await debtShare.blur();
      if (await page.locator('[aria-label^="Sijoitusmahdollisuus"]').count()) throw new Error("Score jäi näkyviin, vaikka yhtiölainan rahoitusvastike puuttui");
      await page.locator("#purchase-financingFeeMonthly").fill("120"); await page.locator("#purchase-financingFeeMonthly").blur();
      await debtFreePrice.fill("158989"); await debtFreePrice.blur();
      await page.locator('[aria-label^="Sijoitusmahdollisuus"]').waitFor();
      const normalizedSalePrice = (await salePrice.inputValue()).replace(/[\s\u00a0]/g, "");
      if (normalizedSalePrice !== "143989") throw new Error(`Myyntihinta ei päivittynyt velattomasta hinnasta: ${normalizedSalePrice}`);
      if (await page.getByText("Hintatiedot eivät täsmää", { exact: true }).count()) throw new Error("Normaali hintojen haarukointi näytti ristiriitavirheen");
      const scoreBeforeRentChange = await page.locator('[aria-label^="Sijoitusmahdollisuus"]').getAttribute("aria-label");
      await page.getByRole("button", { name: "Täsmennä tarvittaessa" }).click();
      const assumptionRent = page.locator("#market-rent");
      await assumptionRent.fill("1100");
      if (!await assumptionRent.evaluate((element) => document.activeElement === element) || await assumptionRent.inputValue() !== "1100") throw new Error("Oletusvuokran fokus tai luonnos katosi muutoksen aikana");
      await page.getByRole("button", { name: "Käytä tätä vuokraa" }).click();
      const updatingStatus = page.getByText("Päivitetään analyysiä…", { exact: true });
      await updatingStatus.waitFor();
      await updatingStatus.waitFor({ state: "detached" });
      const scoreAfterRentChange = await page.locator('[aria-label^="Sijoitusmahdollisuus"]').getAttribute("aria-label");
      if (scoreAfterRentChange === scoreBeforeRentChange) throw new Error("Vuokran muutos ei päivittänyt sijoitusanalyysiä");
      await page.getByText("kk / vuosi", { exact: true }).waitFor();
      const coverageCard = page.getByText("Analyysin kattavuus", { exact: true }).locator("xpath=ancestor::*[@data-slot='card']");
      const financialInput = coverageCard.locator('input[type="file"]');
      await coverageCard.getByRole("button", { name: "Lisää asiakirja" }).first().click();
      await financialInput.setInputFiles({ name: "tilinpaatos.pdf", mimeType: "application/pdf", buffer: Buffer.from("test") });
      await coverageCard.getByText("Analysoitu", { exact: true }).waitFor();
      await coverageCard.getByText("70 %", { exact: true }).waitFor();
    }
    const layout = await page.evaluate(() => {
      const header = document.querySelector("header");
      const headerChildren = header ? Array.from(header.children).map((element) => element.getBoundingClientRect()) : [];
      const overlaps = headerChildren.some((left, index) => headerChildren.slice(index + 1).some((right) => left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top));
      return { horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1, headerOverlap: overlaps };
    });
    if (layout.horizontalOverflow) throw new Error(`${width}x${height}: sivulla on vaakasuuntainen ylivuoto`);
    if (layout.headerOverlap) throw new Error(`${width}x${height}: yläpalkin alueet menevät päällekkäin`);
    const visibleText = await page.locator("body").innerText();
    for (const internalValue of ["owned", "optional_leasehold", "unchecked", "annuity"]) {
      if (new RegExp(`(^|\\s)${internalValue}($|\\s)`, "m").test(visibleText)) throw new Error(`${width}x${height}: sisäinen arvo ${internalValue} näkyy käyttöliittymässä`);
    }
    await page.screenshot({ path: path.join(screenshots, `workspace-${width}x${height}.png`), fullPage: true });
    await page.close();
  }
  const logoPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await logoPage.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });
  await logoPage.getByRole("button", { name: "Aloita tyhjästä" }).click();
  const homeLink = logoPage.getByRole("link", { name: "Siirry etusivulle" }).first();
  if (await homeLink.getAttribute("href") !== "/") throw new Error("Työtilan logo ei linkitä etusivulle");
  await homeLink.focus();
  await homeLink.press("Enter");
  await logoPage.getByRole("heading", { name: "Aloita uusi kohde", exact: true }).waitFor();
  await logoPage.close();
} finally {
  await browser?.close().catch(() => undefined);
  app.kill();
}
