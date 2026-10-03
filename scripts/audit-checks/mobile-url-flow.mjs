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
const listingFixture = `
Osoite: Kivikkokuja 4 A 2, 65100 Vaasa
2h + k
Velaton hinta: 120 000 €
Myyntihinta: 100 000 €
Yhtiölainaosuus: 20 000 €
Hoitovastike: 250 €/kk
Rahoitusvastike: 100 €/kk
Pinta-ala: 50 m²
Rakennusvuosi: 2010
Kuukausivuokra: 800 €/kk
Talotyyppi: Kerrostalo
Lämmitysmuoto: Kaukolämpö
`;

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
    await page.route("**/api/listing-import", async (route) => {
      const request = route.request();
      await route.continue({
        headers: { ...request.headers(), "content-type": "application/json" },
        postData: JSON.stringify({ kind: "text", value: listingFixture }),
      });
    });

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByLabel("Etuovi- tai Oikotie-linkki").fill("https://www.etuovi.com/kohde/12345678");
    await page.getByRole("button", { name: "Hae tiedot", exact: true }).click();
    await page.locator("#vacancy-months").waitFor({ state: "visible", timeout: 30_000 });
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
