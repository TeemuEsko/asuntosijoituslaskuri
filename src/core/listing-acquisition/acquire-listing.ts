import { createHash } from "node:crypto";
import { LISTING_PARSER_VERSION, parseListingText, type ListingParseResult } from "../parser/listing-parser.ts";
import { classifyListingFetchStatus } from "../parser/listing-fetch.ts";
import { getListingBrowserAdapter } from "./adapters/index.ts";
import { extractStructuredValues, parserInputFromHtml } from "./html-extraction.ts";
import { mapLegacyFieldsToCanonical, parseLegacyListingHtml } from "./legacy-listing-parser.ts";
import { createDefaultBrowserProvider } from "./playwright-browser-provider.ts";
import type { ListingAcquisitionDiagnostics, ListingAcquisitionResult, ListingBrowserProvider } from "./types.ts";
import { assertPublicListingDestination, validateListingUrl } from "./url-security.ts";

const MAX_REMOTE_LENGTH = 2_000_000;
const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { expires: number; result: ListingParseResult; diagnostics: ListingAcquisitionDiagnostics }>();
const keyCriticalFields = new Set(["address", "areaSqm", "salePrice", "debtFreePrice", "housingCompanyName", "maintenanceFeeMonthly"]);

function criticalCount(result: ListingParseResult): number { return result.findings.filter((finding) => keyCriticalFields.has(finding.field)).length; }
function fallbackReason(result: ListingParseResult): string | null {
  const missing = [...keyCriticalFields].filter((field) => !result.findings.some((finding) => finding.field === field));
  if (result.findings.length < 6) return `Staattisesta HTML:stä löytyi vain ${result.findings.length} kenttää`;
  if (missing.length >= 2) return `Staattisesta HTML:stä puuttui ydinkenttiä: ${missing.join(", ")}`;
  return null;
}
function hash(value: string): string { return createHash("sha256").update(value).digest("hex").slice(0, 16); }

export async function acquireListing(urlInput: string, options: { browserProvider?: ListingBrowserProvider | null; forceRefresh?: boolean; fetchImpl?: typeof fetch; skipDnsCheck?: boolean } = {}): Promise<ListingAcquisitionResult> {
  const totalStarted = Date.now(); const validation = validateListingUrl(urlInput);
  const emptyDiagnostics: ListingAcquisitionDiagnostics = { portal: validation.ok ? validation.source : "pasted_text", acquisitionMethod: "static", staticHtmlSucceeded: false, structuredDataFound: false, browserAutomationUsed: false, cookieBannerHandled: false, scrollCompleted: false, accordionsOpened: 0, rawFieldsFound: 0, normalizedFieldsCreated: 0, acceptedFields: 0, rejectedFields: 0, conflicts: [], missingEssentialFields: [], warnings: [], errors: [], htmlLength: 0, cleanedTextLength: 0, legacyParserFieldsFound: {}, canonicalFieldsMapped: [], fieldsRejected: 0, rejectionReasons: [], finalFieldsShownInReview: [], staticLoadTimeMs: 0, staticCriticalFieldCount: 0, finalCriticalFieldCount: 0, staticFindingCount: 0, finalFindingCount: 0, cacheHit: false, rawContentHash: "", totalDurationMs: 0 };
  if (!validation.ok) return { ok: false, code: validation.code, error: `${validation.error} Liitä ilmoituksen teksti.`, status: 400, diagnostics: { ...emptyDiagnostics, finalErrorType: validation.code, totalDurationMs: Date.now() - totalStarted } };
  if (!options.skipDnsCheck) { try { await assertPublicListingDestination(validation.url); } catch { return { ok: false, code: "unsafe_url", error: "Osoite ei läpäissyt verkkoturvallisuuden tarkistusta. Liitä ilmoituksen teksti.", status: 400, diagnostics: { ...emptyDiagnostics, finalErrorType: "unsafe_url", totalDurationMs: Date.now() - totalStarted } }; } }
  const adapter = getListingBrowserAdapter(validation.source); const cacheKey = `${validation.url.toString()}:${LISTING_PARSER_VERSION}:${adapter.version}`;
  const cached = cache.get(cacheKey);
  if (!options.forceRefresh && cached && cached.expires > Date.now()) return { ok: true, result: structuredClone(cached.result), diagnostics: { ...cached.diagnostics, acquisitionMethod: "cache", cacheHit: true, totalDurationMs: Date.now() - totalStarted }, partial: cached.result.missingCriticalFields.length > 0 };

  const fetchStarted = Date.now(); const fetchImpl = options.fetchImpl ?? fetch; let html = "";
  let fetchStatus: number | undefined;
  try {
    const response = await fetchImpl(validation.url, { cache: "no-store", redirect: "manual", headers: { "User-Agent": "asuntosijoituslaskuri.fi/1.0 listing import" }, signal: AbortSignal.timeout(10_000) });
    fetchStatus = response.status;
    if (response.status >= 300 && response.status < 400) return { ok: false, code: "unsafe_redirect", error: "Myynti-ilmoitus ohjasi toiseen osoitteeseen. Liitä ilmoituksen teksti.", status: 400, diagnostics: { ...emptyDiagnostics, staticLoadTimeMs: Date.now() - fetchStarted, finalErrorType: "unsafe_redirect", totalDurationMs: Date.now() - totalStarted } };
    const fetchError = classifyListingFetchStatus(response.status);
    if (fetchError) return { ok: false, code: fetchError.code, error: fetchError.error, status: fetchError.status, diagnostics: { ...emptyDiagnostics, staticLoadTimeMs: Date.now() - fetchStarted, finalErrorType: fetchError.code, totalDurationMs: Date.now() - totalStarted } };
    if (Number(response.headers.get("content-length") ?? 0) > MAX_REMOTE_LENGTH) throw new Error("content_too_large");
    html = await response.text(); if (html.length > MAX_REMOTE_LENGTH) throw new Error("content_too_large");
  } catch (error) {
    return { ok: false, code: "cannot_open", error: error instanceof Error && error.message === "content_too_large" ? "Myynti-ilmoituksen sisältö on liian suuri käsiteltäväksi. Liitä ilmoituksen teksti." : "Linkkiä ei voitu avata. Liitä ilmoituksen teksti.", status: 502, diagnostics: { ...emptyDiagnostics, staticLoadTimeMs: Date.now() - fetchStarted, finalErrorType: "cannot_open", totalDurationMs: Date.now() - totalStarted } };
  }
  const staticLegacy = parseLegacyListingHtml(html, validation.url.toString());
  const staticCanonical = mapLegacyFieldsToCanonical(staticLegacy.fields);
  const staticResult = parseListingText(parserInputFromHtml(html), validation.source, [...extractStructuredValues(html), ...staticCanonical]);
  const reason = fallbackReason(staticResult); let finalResult = staticResult; let method: ListingAcquisitionDiagnostics["acquisitionMethod"] = "static"; let browserDiagnostics; let contentContexts; let browserFailureType: string | undefined;
  if (reason) {
    const provider = options.browserProvider === undefined ? createDefaultBrowserProvider() : options.browserProvider;
    if (provider) {
      const browser = await provider.acquire(validation.url.toString(), validation.source);
      if (browser.ok) { const renderedLegacy = parseLegacyListingHtml(browser.html, validation.url.toString()); finalResult = parseListingText(parserInputFromHtml(browser.html, `${browser.visibleText}\n${browser.contexts.map((context) => context.excerpt).join("\n")}`), validation.source, [...extractStructuredValues(browser.html), ...mapLegacyFieldsToCanonical(renderedLegacy.fields)]); method = "browser"; browserDiagnostics = browser.diagnostics; contentContexts = browser.contexts; }
      else { browserFailureType = browser.code; if (!staticResult.findings.length) return { ok: false, code: browser.code, error: `${browser.error} Liitä ilmoituksen teksti.`, status: 502, diagnostics: { ...emptyDiagnostics, staticLoadTimeMs: Date.now() - fetchStarted, browserFallbackReason: reason, staticFindingCount: 0, finalErrorType: browser.code, totalDurationMs: Date.now() - totalStarted } }; }
    }
  }
  const essentialFindingFields = new Set(["address", "areaSqm", "constructionYear", "debtFreePrice", "salePrice", "maintenanceFeeMonthly", "buildingType", "heatingType", "landOwnership"]);
  const essentialCount = finalResult.findings.filter((finding) => essentialFindingFields.has(finding.field)).length;
  const meaningfulFindings = finalResult.findings.filter((finding) => finding.field !== "listingId" && finding.field !== "listingTitle");
  if (essentialCount < 4) finalResult.warnings.push(`Perustason haku löysi vain ${essentialCount}/4 olennaista kenttää. Tarkista tiedot tai yritä uudelleen.`);
  if (!meaningfulFindings.length) return { ok: false, code: "insufficient_content", error: "Sivulta löytyi korkeintaan ilmoituksen tunniste tai otsikko, mutta ei riittävästi kohdetietoja. Yritä uudelleen tai liitä ilmoituksen teksti.", status: 422, diagnostics: { ...emptyDiagnostics, fetchStatus, htmlLength: html.length, cleanedTextLength: staticLegacy.text.length, legacyParserFieldsFound: staticLegacy.fields, canonicalFieldsMapped: staticCanonical.map((item) => item.field), finalFieldsShownInReview: finalResult.findings.map((item) => item.field), staticLoadTimeMs: Date.now() - fetchStarted, browserFallbackReason: reason ?? undefined, rawContentHash: hash(html), finalErrorType: "insufficient_content", totalDurationMs: Date.now() - totalStarted } };
  const diagnostics: ListingAcquisitionDiagnostics = { portal: validation.source, acquisitionMethod: method, staticHtmlSucceeded: html.length > 0, structuredDataFound: extractStructuredValues(html).length > 0 || Boolean(browserDiagnostics?.jsonLdFound), browserAutomationUsed: method === "browser", cookieBannerHandled: Boolean(browserDiagnostics?.consentHandled), scrollCompleted: method !== "browser" || Boolean(browserDiagnostics?.scrollRounds), accordionsOpened: browserDiagnostics?.accordionsOpened ?? 0, rawFieldsFound: finalResult.diagnostics.rawCandidateCount, normalizedFieldsCreated: finalResult.findings.length, acceptedFields: finalResult.diagnostics.acceptedFields, rejectedFields: finalResult.diagnostics.rejectedFields, conflicts: finalResult.diagnostics.conflicts, missingEssentialFields: finalResult.missingCriticalFields, warnings: finalResult.warnings, errors: browserFailureType ? [browserFailureType] : [], fetchStatus, htmlLength: html.length, cleanedTextLength: staticLegacy.text.length, legacyParserFieldsFound: staticLegacy.fields, canonicalFieldsMapped: staticCanonical.map((item) => item.field), fieldsRejected: finalResult.diagnostics.rejectedFields, rejectionReasons: finalResult.diagnostics.rejectedCandidates.map((item) => item.reason), finalFieldsShownInReview: finalResult.findings.map((item) => item.field), browserFallbackReason: reason ?? undefined, staticLoadTimeMs: Date.now() - fetchStarted, browser: browserDiagnostics, contentContexts, staticCriticalFieldCount: criticalCount(staticResult), finalCriticalFieldCount: criticalCount(finalResult), staticFindingCount: staticResult.findings.length, finalFindingCount: finalResult.findings.length, cacheHit: false, rawContentHash: hash(method === "browser" ? `${html}:${finalResult.findings.map((finding) => finding.sourceExcerpt).join("|")}` : html), totalDurationMs: Date.now() - totalStarted, finalErrorType: browserFailureType };
  if (process.env.NODE_ENV === "development") console.info("[listing-import comparison]", { fetchStatus, htmlLength: html.length, cleanedTextLength: staticLegacy.text.length, cleanedTextPreview: staticLegacy.text.slice(0, 500), labelsFound: Object.fromEntries(["Velaton hinta", "Myyntihinta", "Hoitovastike", "Pinta-ala", "Rakennusvuosi", "Lämmitysmuoto", "Tontti"].map((label) => [label, staticLegacy.text.toLocaleLowerCase("fi").includes(label.toLocaleLowerCase("fi"))])), legacyParserOutput: staticLegacy.fields, canonicalMappedOutput: staticCanonical, reviewScreenInput: finalResult.findings.map((finding) => ({ field: finding.field, value: finding.normalizedValue })) });
  finalResult.diagnostics.acquisition = diagnostics;
  if (essentialCount >= 4) cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, result: structuredClone(finalResult), diagnostics });
  return { ok: true, result: finalResult, diagnostics, partial: finalResult.missingCriticalFields.length > 0 };
}

export function clearListingAcquisitionCache(): void { cache.clear(); }
