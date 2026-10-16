import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3100";
const trainingUrl =
  "https://www.teemuesko.fi/asuntosijoittajan-kasvuloikka-maksuton-koulutus";
const draftKey = "asuntosijoituslaskuri:analysis-draft:v1";
const pdfPath = process.env.SMOKE_PDF_PATH ?? "tmp/pdfs/free-flow-smoke.pdf";
const completeDraft = {
  address: "Testikatu 1 A 2",
  city: "Vaasa",
  roomDescription: "2h + k",
  areaSqm: 45,
  buildingType: "apartment",
  constructionYear: 2010,
  debtFreePrice: 120000,
  salePrice: 120000,
  companyLoanShare: 0,
  maintenanceFeeMonthly: 250,
  financingFeeMonthly: 0,
  currentRentMonthly: 850,
  housingCompanyName: "Asunto Oy Testikatu",
  landOwnership: "owned",
};

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 1440, height: 900 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    assert.equal(await page.getByText("Analyysisi on pian valmis!").count(), 0);
    assert.equal(await page.getByLabel("Etunimi").count(), 0);
    assert.equal(await page.getByLabel("Sähköpostiosoite").count(), 0);

    await page.getByRole("button", { name: "Aloita tyhjästä" }).click();
    await page
      .locator(".workspace-screen")
      .getByRole("heading", { name: "Analysoitu sijoituskohde" })
      .waitFor();

    await page.evaluate(
      ({ key, draft }) => sessionStorage.setItem(key, JSON.stringify(draft)),
      { key: draftKey, draft: completeDraft },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("Testikatu 1 A 2").first().waitFor();

    const ctas = page.locator("[data-training-cta]");
    assert.equal(await ctas.count(), 2);
    for (const link of await ctas.locator("a").all())
      assert.equal(await link.getAttribute("href"), trainingUrl);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    assert.equal(overflow, false, `vaakaylivuoto ${viewport.width}px näkymässä`);

    const reportAccess = await page.request.get(`${baseUrl}/api/report`);
    assert.equal(reportAccess.status(), 204);

    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator(".print-report").evaluate((element) => getComputedStyle(element).display), "block");
    const printLink = page.locator(".print-training-cta a");
    assert.equal(await printLink.getAttribute("href"), trainingUrl);
    assert.match(await page.locator(".print-training-cta").innerText(), /Haluatko oppia rakentamaan kasvavaa asuntosalkkua/);
    if (viewport.width === 1440) {
      await mkdir(path.dirname(pdfPath), { recursive: true });
      await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    }
    await page.close();
  }
  console.log("Maksuton analyysipolku, Kajabi-CTA:t ja tulostusnäkymä: OK");
} finally {
  await browser.close();
}
