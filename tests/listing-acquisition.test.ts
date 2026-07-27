import assert from "node:assert/strict";
import test from "node:test";

import { acquireListing, clearListingAcquisitionCache } from "../src/core/listing-acquisition/acquire-listing.ts";
import { etuoviBrowserAdapter } from "../src/core/listing-acquisition/adapters/etuovi-browser-adapter.ts";
import { oikotieBrowserAdapter } from "../src/core/listing-acquisition/adapters/oikotie-browser-adapter.ts";
import { extractNamedPairs, extractStructuredValues, parserInputFromHtml } from "../src/core/listing-acquisition/html-extraction.ts";
import type { BrowserAcquisitionResult, ListingBrowserProvider } from "../src/core/listing-acquisition/types.ts";
import { isAllowedNavigationUrl, validateListingUrl } from "../src/core/listing-acquisition/url-security.ts";

const url = "https://www.etuovi.com/kohde/123";
const fullHtml = `<html><body><main><dl>
<dt>Osoite</dt><dd>Kivikkokuja 4</dd><dt>Pinta-ala</dt><dd>32 m²</dd>
<dt>Myyntihinta</dt><dd>79 000 €</dd><dt>Velaton hinta</dt><dd>79 000 €</dd>
<dt>Taloyhtiö</dt><dd>Asunto Oy Kivi</dd><dt>Hoitovastike</dt><dd>185 €/kk</dd>
</dl></main></body></html>`;
const dynamicHtml = `<html><body><main><dl>${fullHtml.match(/<dl>([\s\S]*?)<\/dl>/)?.[1]}<dt>Rakennusvuosi</dt><dd>1972</dd></dl></main></body></html>`;

function response(html: string, status = 200, headers: Record<string, string> = {}) { return new Response(html, { status, headers }); }
function fakeProvider(result: BrowserAcquisitionResult, calls: { count: number }): ListingBrowserProvider { return { name: "fake", async acquire() { calls.count += 1; return result; } }; }
function browserSuccess(html = dynamicHtml): BrowserAcquisitionResult { return { ok: true, finalUrl: url, html, visibleText: "", contexts: [], diagnostics: { provider: "fake", adapter: "etuovi", adapterVersion: "1", loadTimeMs: 1, consentHandled: false, scrollRounds: 1, initialHeight: 100, finalHeight: 200, newContentElements: 2, accordionsFound: 1, accordionsOpened: 1, failedClicks: 0, namedPairsFound: 7, jsonLdFound: false, totalDurationMs: 2 } }; }

test("1: täydellinen staattinen HTML ei käynnistä selainta", async () => {
  clearListingAcquisitionCache(); const calls = { count: 0 };
  const result = await acquireListing(url, { skipDnsCheck: true, fetchImpl: async () => response(fullHtml), browserProvider: fakeProvider(browserSuccess(), calls) });
  assert.equal(result.ok, true); assert.equal(calls.count, 0); if (result.ok) assert.equal(result.diagnostics.acquisitionMethod, "static");
});

test("2: puutteellinen staattinen HTML käynnistää selainfallbackin", async () => {
  clearListingAcquisitionCache(); const calls = { count: 0 };
  const result = await acquireListing(url, { skipDnsCheck: true, fetchImpl: async () => response("<main>Ladataan…</main>"), browserProvider: fakeProvider(browserSuccess(), calls) });
  assert.equal(result.ok, true); assert.equal(calls.count, 1); if (result.ok) assert.equal(result.diagnostics.acquisitionMethod, "browser");
});

test("3: selainfallback kasvattaa löydettyjen kenttien määrää", async () => {
  clearListingAcquisitionCache(); const result = await acquireListing(url, { skipDnsCheck: true, fetchImpl: async () => response("<main><p>Myyntihinta: 79 000 €</p></main>"), browserProvider: fakeProvider(browserSuccess(), { count: 0 }) });
  assert.ok(result.ok && result.diagnostics.finalFindingCount > result.diagnostics.staticFindingCount);
});

test("4: osittainen staattinen tulos palautetaan, jos selainta ei ole", async () => {
  clearListingAcquisitionCache(); const result = await acquireListing(url, { skipDnsCheck: true, fetchImpl: async () => response("<main><p>Myyntihinta: 79 000 €</p></main>"), browserProvider: null });
  assert.ok(result.ok && result.partial && result.result.findings.length === 1);
});

test("5: selaineston yhteydessä osittainen staattinen tulos säilyy", async () => {
  clearListingAcquisitionCache(); const blocked: BrowserAcquisitionResult = { ok: false, code: "automation_blocked", error: "Estetty" };
  const result = await acquireListing(url, { skipDnsCheck: true, fetchImpl: async () => response("<main><p>Myyntihinta: 79 000 €</p></main>"), browserProvider: fakeProvider(blocked, { count: 0 }) });
  assert.ok(result.ok && result.result.findings[0]?.field === "salePrice");
});

test("6: täysin tyhjä sivu on epäonnistuminen", async () => {
  clearListingAcquisitionCache(); const result = await acquireListing(url, { skipDnsCheck: true, fetchImpl: async () => response("<main></main>"), browserProvider: null });
  assert.ok(!result.ok && result.code === "insufficient_content");
});

test("7: poistunut ilmoitus saa oman virheensä", async () => {
  const result = await acquireListing(url, { skipDnsCheck: true, fetchImpl: async () => response("", 404), browserProvider: null });
  assert.ok(!result.ok && result.code === "listing_removed");
});

test("8: automaation esto saa oman virheensä", async () => {
  const result = await acquireListing(url, { skipDnsCheck: true, fetchImpl: async () => response("", 403), browserProvider: null });
  assert.ok(!result.ok && result.code === "site_blocked" && /Liitä ilmoituksen teksti/.test(result.error));
});

test("9: HTTP-uudelleenohjausta ei seurata", async () => {
  const result = await acquireListing(url, { skipDnsCheck: true, fetchImpl: async () => response("", 302, { location: "https://example.com" }), browserProvider: null });
  assert.ok(!result.ok && result.code === "unsafe_redirect");
});

test("10: localhost ja sisäverkon osoitteet estetään", () => {
  for (const input of ["https://localhost/kohde/1", "https://127.0.0.1/kohde/1", "https://192.168.1.2/kohde/1"]) assert.equal(validateListingUrl(input).ok, false);
});

test("11: file-, data-, javascript- ja http-URL:t estetään", () => {
  for (const input of ["file:///tmp/a", "data:text/plain,a", "javascript:alert(1)", "http://www.etuovi.com/kohde/1"]) assert.equal(validateListingUrl(input).ok, false);
});

test("12: vain tunnetut ilmoituspolut hyväksytään", () => {
  assert.equal(validateListingUrl("https://www.etuovi.com/yritys/123").ok, false);
  assert.equal(validateListingUrl("https://asunnot.oikotie.fi/myytavat-asunnot/helsinki/123").ok, true);
});

test("13: sallimattoman domainin navigointi estetään", () => assert.equal(isAllowedNavigationUrl("https://example.com/kohde/1"), false));

test("14: Etuovi- ja Oikotie-adapterit ovat erillisiä", () => {
  assert.equal(etuoviBrowserAdapter.id, "etuovi"); assert.equal(oikotieBrowserAdapter.id, "oikotie"); assert.notDeepEqual(etuoviBrowserAdapter.contentRootSelectors, oikotieBrowserAdapter.contentRootSelectors);
});

test("15: adapteri sallii tietosisällön mutta torjuu yhteydenoton", () => {
  assert.match("Taloyhtiön tiedot", etuoviBrowserAdapter.expandNames); assert.match("Ota yhteyttä", etuoviBrowserAdapter.forbiddenActionNames);
});

test("16: definition list ja taulukko poimitaan kenttäpareiksi", () => {
  const pairs = extractNamedPairs("<dl><dt>Pinta-ala</dt><dd>32 m²</dd></dl><table><tr><th>Myyntihinta</th><td>79 000 €</td></tr></table>");
  assert.deepEqual(pairs, ["Pinta-ala: 32 m²", "Myyntihinta: 79 000 €"]);
});

test("17: JSON-LD poimitaan ennen näkyvää tekstiä", () => {
  const values = extractStructuredValues(`<script type="application/ld+json">{"offers":{"price":79000},"floorSize":{"value":32}}</script>`);
  assert.deepEqual(values.map((item) => item.field), ["salePrice", "areaSqm"]);
});

test("18: parserisyöte ei perustu vain koko sivun raakatekstiin", () => assert.match(parserInputFromHtml("<dl><dt>Pinta-ala</dt><dd>32 m²</dd></dl>"), /^Pinta-ala: 32 m²/));

test("19: välimuisti estää saman URL:n tarpeettoman selainhaun", async () => {
  clearListingAcquisitionCache(); const calls = { count: 0 }; const provider = fakeProvider(browserSuccess(), calls); const fetchImpl = async () => response("<main>Ladataan…</main>");
  await acquireListing(url, { skipDnsCheck: true, fetchImpl, browserProvider: provider }); const second = await acquireListing(url, { skipDnsCheck: true, fetchImpl, browserProvider: provider });
  assert.equal(calls.count, 1); assert.ok(second.ok && second.diagnostics.acquisitionMethod === "cache");
});

test("20: pakotettu päivitys ohittaa välimuistin", async () => {
  clearListingAcquisitionCache(); const calls = { count: 0 }; const provider = fakeProvider(browserSuccess(), calls); const fetchImpl = async () => response("<main>Ladataan…</main>");
  await acquireListing(url, { skipDnsCheck: true, fetchImpl, browserProvider: provider }); await acquireListing(url, { skipDnsCheck: true, fetchImpl, browserProvider: provider, forceRefresh: true }); assert.equal(calls.count, 2);
});
