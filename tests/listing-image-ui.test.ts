import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("URL-valmistelu kertoo ilmoituskuvien automaattisesta analyysistä", async () => {
  const source = await readFile(new URL("../src/components/property/listing-import.tsx", import.meta.url), "utf8");
  assert.match(source, /Analysoidaan ilmoituksen kuvia/);
  assert.match(source, /analysing_listing_images/);
});

test("käsinlataus on tuloksen jälkeen avattava lisätoiminto tai hallittu varavaihtoehto", async () => {
  const source = await readFile(new URL("../src/components/property/visual-condition-card.tsx", import.meta.url), "utf8");
  assert.match(source, /Ilmoituksen kuvia ei voitu analysoida automaattisesti/);
  assert.match(source, /Voit halutessasi lisätä kuvat itse visuaalista kuntoarviota varten/);
  assert.match(source, /Lisää omia kuvia/);
  assert.match(source, /Jatka ilman kuva-analyysiä/);
  assert.doesNotMatch(source, /Myynti-ilmoituksen kuvia ei haeta automaattisesti/);
});

test("visuaalinen kunto sijoittuu score- ja riskiosion jälkeen ennen korjaushistoriaa", async () => {
  const source = await readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8");
  const score = source.lastIndexOf("<InvestmentOverallScore");
  const risks = source.lastIndexOf("<AnalysisHighlights");
  const visual = source.lastIndexOf("<VisualConditionCard");
  const repairs = source.lastIndexOf("<HousingCompanyRenovationsCard");
  const offer = source.lastIndexOf("<OfferPriceCard");
  assert.ok(score < risks && risks < visual && visual < repairs && repairs < offer);
});
