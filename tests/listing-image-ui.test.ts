import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("URL-valmistelu ei väitä kuva-analyysiä käynnissä olevaksi ilman todellista pyyntöä", async () => {
  const source = await readFile(new URL("../src/components/property/listing-import.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Analysoidaan ilmoituksen kuvia|Analysoimme ilmoituksen valokuvia/);
  assert.match(source, /Muodostetaan sijoitusanalyysi/);
});

test("käsinlataus on tuloksen jälkeen avattava lisätoiminto tai hallittu varavaihtoehto", async () => {
  const source = await readFile(new URL("../src/components/property/visual-condition-card.tsx", import.meta.url), "utf8");
  assert.match(source, /Ilmoituksen kuvia ei voitu analysoida automaattisesti/);
  assert.match(source, /Voit halutessasi lisätä kuvat itse visuaalista kuntoarviota\s+varten/);
  assert.match(source, /Lisää omia kuvia/);
  assert.match(source, /Jatka ilman kuva-analyysiä/);
  assert.doesNotMatch(source, /Myynti-ilmoituksen kuvia ei haeta automaattisesti/);
});

test("visuaalinen kunto sijoittuu raporttien ja asiantuntija-arvion jälkeen ennen korjaushistoriaa", async () => {
  const source = await readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8");
  const score = source.lastIndexOf("<InvestmentOverallScore");
  const risks = source.lastIndexOf("<AnalysisHighlights");
  const visual = source.lastIndexOf("<VisualConditionCard");
  const repairs = source.lastIndexOf("<HousingCompanyRenovationsCard");
  const reports = source.lastIndexOf("<ReportsCard");
  const evaluation = source.lastIndexOf("<ProfessionalEvaluationCard");
  assert.ok(score < risks && risks < reports && reports < evaluation && evaluation < visual && visual < repairs);
  assert.match(source, /listingImageAnalysis\?\.status === "completed"/);
  assert.match(source, /listingImageAnalysis\?\.status === "partial"/);
  assert.equal(source.lastIndexOf("<OfferPriceCard"), -1);
});
