import type { Browser, Frame, Locator, Page } from "playwright";
import { getListingBrowserAdapter } from "./adapters/index.ts";
import type { ListingBrowserAdapter } from "./adapters/types.ts";
import type { BrowserAcquisitionResult, BrowserContentContext, ListingBrowserProvider } from "./types.ts";
import { isAllowedNavigationUrl } from "./url-security.ts";
import type { ListingSourceType } from "../parser/listing-parser.ts";

const MAX_SCROLL_ROUNDS = 12;
const MAX_EXPANSIONS = 18;
const NAVIGATION_TIMEOUT_MS = 15_000;
const TOTAL_TIMEOUT_MS = 35_000;
const MAX_RENDERED_HTML = 2_000_000;

async function handleConsentInFrame(frame: Frame, adapter: ListingBrowserAdapter): Promise<boolean> {
  const buttons = frame.getByRole("button", { name: adapter.consentNames });
  for (let index = 0; index < Math.min(await buttons.count(), 6); index += 1) {
    const button = buttons.nth(index);
    if (await button.isVisible().catch(() => false) && await button.isEnabled().catch(() => false)) {
      await button.click({ timeout: 2_000 }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

async function handleConsent(page: Page, adapter: ListingBrowserAdapter): Promise<boolean> {
  for (const frame of page.frames()) if (await handleConsentInFrame(frame, adapter)) return true;
  return false;
}

async function contentRoot(page: Page, adapter: ListingBrowserAdapter): Promise<Locator> {
  for (const selector of adapter.contentRootSelectors) {
    const candidate = page.locator(selector).first();
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return page.locator("body");
}

async function expandContent(page: Page, adapter: ListingBrowserAdapter) {
  const root = await contentRoot(page, adapter);
  const buttons = root.getByRole("button");
  let found = 0; let opened = 0; let failed = 0;
  for (let index = 0; index < Math.min(await buttons.count(), 80) && opened < MAX_EXPANSIONS; index += 1) {
    const button = buttons.nth(index);
    const name = ((await button.getAttribute("aria-label")) || (await button.innerText().catch(() => ""))).trim();
    if (!adapter.expandNames.test(name) || adapter.forbiddenActionNames.test(name)) continue;
    found += 1;
    if (await button.getAttribute("aria-expanded") === "true" || !await button.isVisible().catch(() => false) || !await button.isEnabled().catch(() => false)) continue;
    const before = await root.innerText().then((value) => value.length).catch(() => 0);
    try {
      await button.click({ timeout: 2_000 });
      opened += 1;
      const controls = await button.getAttribute("aria-controls");
      if (controls) await page.locator(`#${controls}`).evaluate((element) => element.setAttribute("data-expanded-by-acquisition", "true")).catch(() => undefined);
      await page.waitForFunction(({ selector, length }) => (document.querySelector(selector)?.textContent?.length ?? document.body.textContent?.length ?? 0) > length, { selector: adapter.contentRootSelectors[0] ?? "body", length: before }, { timeout: 1_200 }).catch(() => undefined);
    } catch { failed += 1; }
  }
  return { found, opened, failed };
}

async function scrollThroughPage(page: Page) {
  const initialHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  let lastHeight = initialHeight; let stableRounds = 0; let rounds = 0; let initialElements = 0;
  initialElements = await page.locator("dt, tr, [aria-expanded], section").count();
  while (rounds < MAX_SCROLL_ROUNDS && stableRounds < 3) {
    rounds += 1;
    await page.evaluate(() => window.scrollBy({ top: Math.max(300, window.innerHeight * 0.7), behavior: "instant" }));
    await page.waitForFunction((height) => document.documentElement.scrollHeight !== height || window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4, lastHeight, { timeout: 350 }).catch(() => undefined);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    if (height === lastHeight) stableRounds += 1; else stableRounds = 0;
    lastHeight = height;
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const finalElements = await page.locator("dt, tr, [aria-expanded], section").count();
  return { rounds, initialHeight, finalHeight: lastHeight, newContentElements: Math.max(0, finalElements - initialElements) };
}

async function extractContexts(page: Page): Promise<BrowserContentContext[]> {
  return page.evaluate(() => {
    const contexts: BrowserContentContext[] = [];
    document.querySelectorAll("dt").forEach((term) => {
      const value = term.nextElementSibling;
      if (value) contexts.push({ fieldName: term.textContent?.trim(), originalValue: value.textContent?.trim(), excerpt: `${term.textContent?.trim()}: ${value.textContent?.trim()}`, domSourceType: "definition_list", selector: "dt + dd", revealedAfterExpansion: Boolean(term.closest("[data-expanded-by-acquisition='true']")) });
    });
    document.querySelectorAll("tr").forEach((row) => {
      const cells = Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent?.trim()).filter(Boolean);
      if (cells.length >= 2) contexts.push({ fieldName: cells[0], originalValue: cells.slice(1).join(" "), excerpt: cells.join(": "), domSourceType: "table", selector: "tr", revealedAfterExpansion: Boolean(row.closest("[data-expanded-by-acquisition='true']")) });
    });
    document.querySelectorAll("script[type='application/ld+json'], script#__NEXT_DATA__").forEach((script) => contexts.push({ excerpt: script.textContent?.slice(0, 500) ?? "", domSourceType: "structured_data", selector: script.id === "__NEXT_DATA__" ? "script#__NEXT_DATA__" : "script[type='application/ld+json']", revealedAfterExpansion: false }));
    return contexts;
  });
}

export class PlaywrightListingBrowserProvider implements ListingBrowserProvider {
  readonly name = "playwright";
  private readonly options: { allowUnsafeTestUrls?: boolean; launch?: () => Promise<Browser> };
  constructor(options: { allowUnsafeTestUrls?: boolean; launch?: () => Promise<Browser> } = {}) { this.options = options; }

  async acquire(url: string, source: Exclude<ListingSourceType, "pasted_text">): Promise<BrowserAcquisitionResult> {
    const started = Date.now(); const adapter = getListingBrowserAdapter(source); let browser: Browser | undefined;
    const work = async (): Promise<BrowserAcquisitionResult> => {
      try {
        browser = this.options.launch ? await this.options.launch() : await (await import("playwright")).chromium.launch({ headless: true });
        const context = await browser.newContext({ locale: "fi-FI", viewport: { width: 1366, height: 768 }, serviceWorkers: "block" });
        const page = await context.newPage(); page.setDefaultTimeout(3_000); page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
        await page.route("**/*", async (route) => {
          const request = route.request();
          if (["image", "media", "font"].includes(request.resourceType())) return route.abort();
          if (!this.options.allowUnsafeTestUrls && request.isNavigationRequest() && request.frame() === page.mainFrame() && !isAllowedNavigationUrl(request.url())) return route.abort("blockedbyclient");
          return route.continue();
        });
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
        if (!response) return { ok: false, code: "cannot_open", error: "Linkkiä ei voitu avata selaimessa." };
        if ([404, 410].includes(response.status())) return { ok: false, code: "listing_removed", error: "Ilmoitus on poistunut." };
        if (!this.options.allowUnsafeTestUrls && !isAllowedNavigationUrl(page.url())) return { ok: false, code: "unsafe_redirect", error: "Ilmoitus ohjasi sallimattomaan osoitteeseen." };
        for (const selector of adapter.readySelectors) { if (await page.locator(selector).first().waitFor({ state: "visible", timeout: 3_000 }).then(() => true).catch(() => false)) break; }
        await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => undefined);
        const bodyText = await page.locator("body").innerText().catch(() => "");
        if (adapter.blockedContent.test(bodyText)) return { ok: false, code: "automation_blocked", error: "Sivusto esti automaattisen haun. Liitä ilmoituksen teksti." };
        const consentHandled = await handleConsent(page, adapter);
        const firstExpansion = await expandContent(page, adapter);
        const scroll = await scrollThroughPage(page);
        const secondExpansion = await expandContent(page, adapter);
        const root = await contentRoot(page, adapter);
        const visibleText = await root.innerText();
        const html = await page.content();
        if (html.length > MAX_RENDERED_HTML) return { ok: false, code: "cannot_open", error: "Renderöity sivu oli liian suuri käsiteltäväksi." };
        const contexts = await extractContexts(page);
        const totalDurationMs = Date.now() - started;
        return { ok: true, finalUrl: page.url(), html, visibleText, contexts, diagnostics: { provider: this.name, adapter: adapter.id, adapterVersion: adapter.version, loadTimeMs: totalDurationMs, consentHandled, scrollRounds: scroll.rounds, initialHeight: scroll.initialHeight, finalHeight: scroll.finalHeight, newContentElements: scroll.newContentElements, accordionsFound: firstExpansion.found + secondExpansion.found, accordionsOpened: firstExpansion.opened + secondExpansion.opened, failedClicks: firstExpansion.failed + secondExpansion.failed, namedPairsFound: contexts.filter((item) => item.domSourceType === "definition_list" || item.domSourceType === "table").length, jsonLdFound: contexts.some((item) => item.domSourceType === "structured_data"), totalDurationMs } };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, code: /timeout/i.test(message) ? "timeout" : "cannot_open", error: /timeout/i.test(message) ? "Selaintason haku aikakatkaistiin. Liitä ilmoituksen teksti." : "Selaintason haku epäonnistui. Liitä ilmoituksen teksti." };
      } finally { await browser?.close().catch(() => undefined); }
    };
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([work(), new Promise<BrowserAcquisitionResult>((resolve) => { timeoutId = setTimeout(() => resolve({ ok: false, code: "timeout", error: "Selaintason haun kokonaisaika ylittyi. Liitä ilmoituksen teksti." }), TOTAL_TIMEOUT_MS); })]);
    } finally { if (timeoutId) clearTimeout(timeoutId); }
  }
}

export function createDefaultBrowserProvider(): ListingBrowserProvider | null {
  if (process.env.LISTING_BROWSER_ENABLED === "false") return null;
  if (process.env.VERCEL && process.env.LISTING_BROWSER_ENABLED !== "true") return null;
  return new PlaywrightListingBrowserProvider();
}
