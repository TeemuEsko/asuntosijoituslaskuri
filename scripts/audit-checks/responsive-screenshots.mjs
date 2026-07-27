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
  if (!await searchButton.isDisabled()) throw new Error("Tyhjän URL-kentän hakupainike ei ole pois käytöstä");
  await urlInput.fill("https://example.com/kohde/1");
  await urlInput.press("Enter");
  await startPage.getByRole("alert").getByText(/kelvollinen Etuovi- tai Oikotie/).waitFor();
  await startPage.route("**/api/listing-import", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ source: "etuovi", findings: [], renovations: [], missingCriticalFields: ["Osoite"], warnings: [], diagnostics: { parserVersion: "test", site: "etuovi", sections: [], rawCandidateCount: 0, rejectedCandidates: [], fieldDiagnostics: [], mergedFindingCount: 0, acceptedFields: 0, rejectedFields: 0, conflicts: [], missingEssentialFields: ["Osoite"], warnings: [], errors: [] } }) }));
  await urlInput.fill("https://www.etuovi.com/kohde/123");
  await urlInput.press("Enter");
  await startPage.getByRole("heading", { name: "Tarkista löydetyt tiedot" }).waitFor();
  await startPage.close();
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Aloita tyhjästä" }).click();
    await page.getByRole("heading", { name: "Uusi kohde", exact: true }).first().waitFor();
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
