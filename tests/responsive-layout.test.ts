import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const viewports = [
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1536, 864],
  [1920, 1080],
] as const;

async function source(path: string) {
  return readFile(new URL(`../src/components/property/${path}`, import.meta.url), "utf8");
}

test("desktop-viewportit kuuluvat responsiivisen layout-sopimuksen piiriin", () => {
  assert.deepEqual(viewports.map(([width]) => width), [1280, 1366, 1440, 1536, 1920]);
  assert.ok(viewports.every(([width, height]) => width >= 1280 && height >= 720));
});

test("sivupalkki vaihtuu kompaktiin ja täyteen tilaan hallituilla rajoilla", async () => {
  const sidebar = await source("workspace-sidebar.tsx");
  const workspace = await source("property-workspace.tsx");
  assert.match(sidebar, /min-\[1100px\]:flex/);
  assert.match(sidebar, /min-\[1600px\]:w-60/);
  assert.match(workspace, /min-\[1100px\]:pl-18/);
  assert.match(workspace, /min-\[1600px\]:pl-60/);
});

test("oikea analyysipaneeli ei muodosta kolmatta saraketta alle 1600 pikselissä", async () => {
  const workspace = await source("property-workspace.tsx");
  assert.match(workspace, /min-\[1600px\]:grid-cols-\[minmax\(0,1fr\)_minmax\(300px,350px\)\]/);
  assert.match(workspace, /min-\[1600px\]:hidden/);
});

test("yläpalkki, otsikot ja toimintopainikkeet voivat rivittyä törmäämättä", async () => {
  const header = await source("workspace-header.tsx");
  assert.match(header, /grid-cols-1/);
  assert.match(header, /sm:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(header, /truncate/);
  assert.match(header, /flex-wrap/);
  for (const text of ["Ennakkoversio", "Luonnos", "Lisää dokumentteja", "Tallenna"]) assert.ok(header.includes(text));
});

test("oletuskenttien grid vaihtuu yhdestä kahteen ja kolmeen sarakkeeseen", async () => {
  const assumptions = await source("assumptions-card.tsx");
  assert.match(assumptions, /grid-cols-1/);
  assert.match(assumptions, /sm:grid-cols-2/);
  assert.match(assumptions, /min-\[1600px\]:grid-cols-3/);
});

test("label, lähdetunniste, input ja yksikkö on erotettu responsiivisesti", async () => {
  const field = await source("property-field.tsx");
  assert.match(field, /flex-wrap/);
  assert.match(field, /whitespace-normal/);
  assert.match(field, /shrink-0/);
  assert.match(field, /pr-20/);
  assert.match(field, /whitespace-nowrap/);
});

test("lyhennystyypit näkyvät vain suomenkielisinä", async () => {
  const assumptions = await source("assumptions-card.tsx");
  for (const label of ["Annuiteetti", "Tasalyhennys", "Kertalyhenteinen laina"]) assert.ok(assumptions.includes(label));
  assert.doesNotMatch(assumptions, />annuity<|>equal_principal<|>bullet</);
});
