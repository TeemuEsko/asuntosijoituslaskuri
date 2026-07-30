import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractListingImages } from "../src/core/listing-images/extract-listing-images.ts";

async function fixture(name: string) { return readFile(new URL(`./fixtures/listing-images/${name}`, import.meta.url), "utf8"); }

test("Etuoven tavallinen galleria poimitaan ja sivustografiikka suodatetaan", async () => {
  const images = extractListingImages(await fixture("etuovi-gallery.html"), "https://www.etuovi.com/kohde/123");
  assert.equal(images.length, 3);
  assert.ok(images.some((item) => item.extractionSource === "open_graph"));
  assert.ok(images.every((item) => item.source === "listing"));
  assert.ok(images.some((item) => item.type === "interior"));
  assert.ok(images.every((item) => !/logo/i.test(item.url)));
});

test("Oikotien picture, srcset ja lazy-kuvat poimitaan parhaalla resoluutiolla", async () => {
  const images = extractListingImages(await fixture("oikotie-gallery.html"), "https://asunnot.oikotie.fi/myytavat-asunnot/helsinki/456");
  assert.equal(images.length, 2);
  assert.match(images[0]!.url, /facade-1800\.webp/);
  assert.ok(images.every((item) => !/agents|person/i.test(item.url)));
});

test("JSON-LD:n ja hydraatiotilan kuvataulukot tunnistetaan", async () => {
  const jsonLd = extractListingImages(await fixture("json-ld-gallery.html"), "https://www.etuovi.com/kohde/789");
  const hydration = extractListingImages(await fixture("hydration-gallery.html"), "https://asunnot.oikotie.fi/myytavat-asunnot/helsinki/987");
  assert.equal(jsonLd.length, 2);
  assert.ok(jsonLd.every((item) => item.extractionSource === "json_ld"));
  assert.equal(hydration.length, 2);
  assert.ok(hydration.every((item) => item.extractionSource === "hydration_json"));
  const internal = extractListingImages(`<script>window.__LISTING__ = {"gallery":{"images":["https://images.etuovi.com/789/sauna.jpg"]}};</script>`, "https://www.etuovi.com/kohde/789");
  assert.equal(internal[0]?.extractionSource, "internal_json");
});

test("srcset-versioista valitaan suurin ja pikkukuvakaksoiskappaleet poistetaan", async () => {
  const srcset = extractListingImages(await fixture("srcset-gallery.html"), "https://www.etuovi.com/kohde/555");
  const duplicates = extractListingImages(await fixture("thumbnail-duplicates.html"), "https://www.etuovi.com/kohde/222");
  assert.equal(srcset.length, 1);
  assert.match(srcset[0]!.url, /living-2048\.jpg/);
  assert.equal(duplicates.length, 1);
  assert.match(duplicates[0]!.url, /1600x1200/);
});

test("ilman kohdekuvia palautetaan tyhjä lista ja enimmäismäärä rajataan", async () => {
  assert.deepEqual(extractListingImages(await fixture("no-gallery.html"), "https://www.etuovi.com/kohde/none"), []);
  const gallery = `<html><body>${Array.from({ length: 40 }, (_, index) => `<img src="https://images.etuovi.com/large/room-${index}.jpg" width="1200" height="800" alt="Olohuone">`).join("")}</body></html>`;
  assert.equal(extractListingImages(gallery, "https://www.etuovi.com/kohde/large").length, 24);
});
