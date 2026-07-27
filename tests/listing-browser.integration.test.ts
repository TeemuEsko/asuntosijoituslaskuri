import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test, { after, before } from "node:test";

import { PlaywrightListingBrowserProvider } from "../src/core/listing-acquisition/playwright-browser-provider.ts";

let server: Server; let baseUrl = ""; let contactClicks = 0;

before(async () => {
  server = createServer((request, response) => {
    if (request.url === "/contact-clicked") { contactClicks += 1; response.end("ok"); return; }
    if (request.url === "/consent-frame") { response.setHeader("content-type", "text/html; charset=utf-8"); response.end(`<button onclick="document.body.dataset.accepted='true';this.remove()">Accept all</button>`); return; }
    if (request.url === "/blocked") { response.setHeader("content-type", "text/html; charset=utf-8"); response.end(`<main><h1>Verify you are human</h1><p>CAPTCHA</p></main>`); return; }
    if (request.url === "/infinite") { response.setHeader("content-type", "text/html; charset=utf-8"); response.end(`<main><h1>Kohde</h1><div id="grow" style="height:2200px"></div><script>addEventListener('scroll',()=>{const d=document.createElement('div');d.style.height='300px';document.querySelector('#grow').append(d)})</script></main>`); return; }
    if (request.url === "/iframe-fixture") { response.setHeader("content-type", "text/html; charset=utf-8"); response.end(`<iframe src="/consent-frame"></iframe><main><h1>Kohde</h1><p>Myyntihinta: 79 000 €</p></main>`); return; }
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><html><body><button onclick="this.remove()">Hyväksy kaikki</button><main><h1>Kivikkokuja 4</h1><button aria-expanded="false" aria-controls="company" onclick="this.setAttribute('aria-expanded','true');document.querySelector('#company').hidden=false">Taloyhtiön tiedot</button><section id="company" hidden><dl><dt>Taloyhtiö</dt><dd>Asunto Oy Kivi</dd><dt>Hoitovastike</dt><dd>185 €/kk</dd></dl></section><button onclick="fetch('/contact-clicked')">Ota yhteyttä</button><div style="height:1800px"></div><section id="lazy"></section><script>addEventListener('scroll',()=>{if(scrollY>250&&!document.querySelector('#lazy').textContent){document.querySelector('#lazy').innerHTML='<h2>Tulevat remontit</h2><dl><dt>Putkiremontti</dt><dd>Suunnitteilla 2029</dd><dt>Myyntihinta</dt><dd>79 000 €</dd></dl>'}})</script></main></body></html>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Fixture-palvelin ei käynnistynyt"); baseUrl = `http://127.0.0.1:${address.port}`;
});
after(async () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

test("Playwright avaa haitarin, vierittää lazy-sisältöön ja jättää yhteydenoton rauhaan", { timeout: 60_000 }, async () => {
  contactClicks = 0; const provider = new PlaywrightListingBrowserProvider({ allowUnsafeTestUrls: true }); const result = await provider.acquire(`${baseUrl}/fixture`, "etuovi");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.visibleText, /Asunto Oy Kivi/); assert.match(result.visibleText, /Suunnitteilla 2029/);
  assert.equal(result.diagnostics.consentHandled, true); assert.ok(result.diagnostics.accordionsOpened >= 1); assert.ok(result.diagnostics.scrollRounds >= 1); assert.equal(contactClicks, 0);
  assert.ok(result.contexts.some((context) => context.fieldName === "Taloyhtiö" && context.revealedAfterExpansion));
});

test("iframe-pohjainen evästesuostumus käsitellään", { timeout: 60_000 }, async () => {
  const result = await new PlaywrightListingBrowserProvider({ allowUnsafeTestUrls: true }).acquire(`${baseUrl}/iframe-fixture`, "oikotie");
  assert.ok(result.ok && result.diagnostics.consentHandled);
});

test("loputon lazy loading katkeaa kierrosrajaan", { timeout: 60_000 }, async () => {
  const result = await new PlaywrightListingBrowserProvider({ allowUnsafeTestUrls: true }).acquire(`${baseUrl}/infinite`, "etuovi");
  assert.ok(result.ok && result.diagnostics.scrollRounds <= 12);
});

test("CAPTCHA havaitaan eikä sitä yritetä kiertää", { timeout: 60_000 }, async () => {
  const result = await new PlaywrightListingBrowserProvider({ allowUnsafeTestUrls: true }).acquire(`${baseUrl}/blocked`, "etuovi");
  assert.ok(!result.ok && result.code === "automation_blocked");
});
