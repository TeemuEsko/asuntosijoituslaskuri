import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { analyseListingImages } from "../src/server/listing-images/analyse-listing-images.ts";
import { fetchListingImage, isApprovedListingImageUrl, ListingImageFetchError } from "../src/server/listing-images/fetch-listing-image.ts";

const publicResolver = async () => [{ address: "203.0.113.10" }];

test("vain portaalikohtaiset kuvalähteet hyväksytään", () => {
  assert.equal(isApprovedListingImageUrl("https://images.etuovi.com/123/interior.jpg", "etuovi"), true);
  assert.equal(isApprovedListingImageUrl("https://images.asunnot.oikotie.fi/123/interior.jpg", "oikotie"), true);
  assert.equal(isApprovedListingImageUrl("https://evil.example/interior.jpg", "etuovi"), false);
  assert.equal(isApprovedListingImageUrl("http://images.etuovi.com/interior.jpg", "etuovi"), false);
  assert.equal(isApprovedListingImageUrl("https://127.0.0.1/interior.jpg", "etuovi"), false);
});

test("yksityiseen IP-osoitteeseen ratkaiseva kuvalähde estetään ennen fetchiä", async () => {
  let fetched = false;
  await assert.rejects(() => fetchListingImage({ url: "https://images.etuovi.com/1.jpg", listingPageUrl: "https://www.etuovi.com/kohde/1", source: "etuovi", resolveHost: async () => [{ address: "10.0.0.4" }], fetchImpl: async () => { fetched = true; return new Response(); } }), (error) => error instanceof ListingImageFetchError && error.code === "LISTING_IMAGE_ACCESS_DENIED");
  assert.equal(fetched, false);
});

test("jokainen uudelleenohjaus validoidaan eikä kuvahaku ole avoin välityspalvelin", async () => {
  await assert.rejects(() => fetchListingImage({ url: "https://images.etuovi.com/redirect.jpg", listingPageUrl: "https://www.etuovi.com/kohde/1", source: "etuovi", resolveHost: publicResolver, fetchImpl: async () => new Response(null, { status: 302, headers: { location: "https://evil.example/private.jpg" } }) }), (error) => error instanceof ListingImageFetchError && error.code === "LISTING_IMAGE_ACCESS_DENIED");
});

test("väärä sisältötyyppi ja liian suuri vastaus estetään", async () => {
  await assert.rejects(() => fetchListingImage({ url: "https://images.etuovi.com/not-image", listingPageUrl: "https://www.etuovi.com/kohde/1", source: "etuovi", resolveHost: publicResolver, fetchImpl: async () => new Response("html", { headers: { "content-type": "text/html" } }) }), (error) => error instanceof ListingImageFetchError && error.code === "UNSUPPORTED_IMAGE_FORMAT");
  await assert.rejects(() => fetchListingImage({ url: "https://images.etuovi.com/huge.jpg", listingPageUrl: "https://www.etuovi.com/kohde/1", source: "etuovi", resolveHost: publicResolver, fetchImpl: async () => new Response(new Uint8Array([1]), { headers: { "content-type": "image/jpeg", "content-length": String(11 * 1024 * 1024) } }) }), (error) => error instanceof ListingImageFetchError && error.code === "IMAGE_TOO_LARGE");
});

test("403-galleria tuottaa hallitun käyttöestekoodin", async () => {
  const html = await readFile(new URL("./fixtures/listing-images/access-denied-gallery.html", import.meta.url), "utf8");
  const result = await analyseListingImages({ html, pageUrl: "https://www.etuovi.com/kohde/forbidden", source: "etuovi", provider: { analyzeImage: async () => { throw new Error("provideria ei saa kutsua"); } }, resolveHost: publicResolver, fetchImpl: async () => new Response(null, { status: 403 }) });
  assert.equal(result.status.status, "failed");
  assert.deepEqual(result.status.errorCodes, ["LISTING_IMAGE_ACCESS_DENIED"]);
});
