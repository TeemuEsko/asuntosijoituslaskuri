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
  await startPage.route("**/api/listing-import", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ source: "etuovi", findings, renovations: [], missingCriticalFields: [], warnings: [], diagnostics: { parserVersion: "test", site: "etuovi", sections: [], rawCandidateCount: findings.length, rejectedCandidates: [], fieldDiagnostics: [], mergedFindingCount: findings.length, acceptedFields: findings.length, rejectedFields: 0, conflicts: [], missingEssentialFields: [], warnings: [], errors: [] } }) }));
  await urlInput.fill("https://www.etuovi.com/kohde/123");
  await urlInput.press("Enter");
  await startPage.getByText("Analyysi valmis", { exact: true }).waitFor();
  await startPage.close();
  const missingPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await missingPage.route("**/api/listing-import", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ source: "etuovi", findings: findings.filter((finding) => !["currentRentMonthly", "companyLoanShare"].includes(finding.field)), renovations: [], missingCriticalFields: [], warnings: [], diagnostics: { parserVersion: "test", site: "etuovi", sections: [], rawCandidateCount: findings.length - 2, rejectedCandidates: [], fieldDiagnostics: [], mergedFindingCount: findings.length - 2, acceptedFields: findings.length - 2, rejectedFields: 0, conflicts: [], missingEssentialFields: [], warnings: [], errors: [] } }) }));
  await missingPage.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });
  await missingPage.getByPlaceholder("Liitä Etuovi- tai Oikotie-linkki").fill("https://www.etuovi.com/kohde/456");
  await missingPage.getByPlaceholder("Liitä Etuovi- tai Oikotie-linkki").press("Enter");
  const rentInput = missingPage.locator("#missing-currentRentMonthly");
  await rentInput.waitFor();
  if (await rentInput.getAttribute("type") !== "number") throw new Error("Vuokrakenttä ei ole numeerinen");
  await missingPage.getByText("€ / kk", { exact: true }).waitFor();
  await rentInput.pressSequentially("750");
  if (await rentInput.inputValue() !== "750" || !await rentInput.isVisible()) throw new Error("Vuokrakenttä katosi tai arvo ei säilynyt monimerkkisen syötön aikana");
  if (await missingPage.getByText("Analyysi valmis", { exact: true }).count()) throw new Error("Analyysi käynnistyi ennen Päivitä analyysi -painallusta");
  await missingPage.getByRole("button", { name: "Ei", exact: true }).click();
  await missingPage.getByRole("button", { name: "Päivitä analyysi" }).click();
  await missingPage.getByText("Analyysi valmis", { exact: true }).waitFor();
  await missingPage.close();
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Aloita tyhjästä" }).click();
    await page.getByRole("heading", { name: "Analysoitu sijoituskohde", exact: true }).first().waitFor();
    await page.getByText("Sijoitusmahdollisuus", { exact: true }).waitFor();
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
} finally {
  await browser?.close().catch(() => undefined);
  app.kill();
}
