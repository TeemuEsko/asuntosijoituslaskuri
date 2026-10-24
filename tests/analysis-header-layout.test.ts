import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  analysisFacts,
  analysisSubtitle,
  analysisTitle,
  showFloor,
} from "../src/core/analysis/analysis-presentation.ts";
import {
  parseBuildingType,
  parseFloor,
  parseRoomConfiguration,
} from "../src/core/parser/normalization.ts";
import { parseListingText } from "../src/core/parser/listing-parser.ts";

test("otsikko käyttää osoitetta, ilmoitusotsikkoa ja turvallista fallbackia", () => {
  assert.equal(
    analysisTitle({ address: "Keskuskatu 12 A 4", city: "Vaasa" }),
    "Keskuskatu 12 A 4, Vaasa",
  );
  assert.equal(
    analysisTitle({ listingTitle: "Kolmio keskustassa" }),
    "Kolmio keskustassa",
  );
  assert.equal(analysisTitle({}), "Analysoitu sijoituskohde");
});
test("otsikon alarivi käyttää taloyhtiön nimeä sekä postinumeroa ilman kaupungin turhaa toistoa", () => {
  assert.equal(analysisSubtitle({ housingCompanyName: "As Oy Gerbyn Länsimetsäntie 27 Bost Ab", postalCode: "65280", city: "Vaasa" }), "As Oy Gerbyn Länsimetsäntie 27 Bost Ab · 65280 Vaasa");
  assert.equal(analysisSubtitle({ postalCode: "65280", city: "Vaasa" }), "65280 Vaasa");
  assert.equal(analysisSubtitle({ housingCompanyName: "Asunto Oy Erittäin Pitkä Taloyhtiön Nimi" }), "Asunto Oy Erittäin Pitkä Taloyhtiön Nimi");
  assert.equal(analysisSubtitle({ city: "Vaasa" }), undefined);
  assert.equal(analysisSubtitle({}), undefined);
});
test("perustietorivi sisältää vain saatavilla olevat arvot", () => {
  assert.deepEqual(
    analysisFacts({
      roomDescription: "3h + k + s",
      areaSqm: 99.6,
      buildingType: "terraced",
      constructionYear: 1964,
      floor: "1 / 2",
    }),
    ["3h + k + s", "99,6 m²", "Rivitalo", "Rakennusvuosi 1964"],
  );
  assert.deepEqual(
    analysisFacts({ areaSqm: 45, buildingType: "apartment", floor: "2 / 5" }),
    ["45 m²", "Kerrostalo", "Kerros 2 / 5"],
  );
});
test("huonejako, rakennustyyppi ja kerros normalisoituvat", () => {
  assert.equal(parseRoomConfiguration("3h, k, s"), "3h + k + s");
  assert.equal(parseRoomConfiguration("2 huonetta ja keittiö"), "2h + k");
  assert.equal(parseBuildingType("Valoisa rivitaloasunto"), "terraced");
  assert.equal(parseBuildingType("Kerrostalo keskustassa"), "apartment");
  assert.equal(parseFloor("katutaso"), "Katutaso");
  assert.equal(showFloor("terraced", "1 / 2"), false);
  assert.equal(showFloor("apartment", "2 / 5"), true);
});
test("huonejako ja rakennustyyppi johdetaan ilmoituksen otsikosta", () => {
  const result = parseListingText("", "etuovi", [
    {
      field: "listingTitle",
      value: "3h + k + s, rivitalo Vaasa",
      label: "otsikko",
      excerpt: "h1",
    },
  ]);
  assert.equal(
    result.findings.find((item) => item.field === "roomDescription")
      ?.normalizedValue,
    "3h + k + s",
  );
  assert.equal(
    result.findings.find((item) => item.field === "buildingType")
      ?.normalizedValue,
    "terraced",
  );
});
test("tontin omistusmuodot parsitaan automaattisesti", () => {
  for (const [input, expected] of [
    ["Oma tontti", "owned"],
    ["Vuokratontti", "leased"],
    ["Valinnainen vuokratontti", "optional_leasehold"],
  ] as const)
    assert.equal(
      parseListingText(`Tontin omistusmuoto: ${input}`).findings[0]
        ?.normalizedValue,
      expected,
    );
});
test("saatavilla oleva kuntotieto parsitaan", () => {
  assert.equal(
    parseListingText("Asunnon kunto: Hyvä").findings.find(
      (item) => item.field === "condition",
    )?.normalizedValue,
    "Hyvä",
  );
});
test("analyysi etenee lähtötiedoista huomioihin, raportteihin ja yksityiskohtiin", async () => {
  const workspace = await readFile(
    new URL(
      "../src/components/property/property-workspace.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const parser = workspace.indexOf("<ParserAnalysisSummary");
  const prices = workspace.indexOf("<PurchaseCard");
  const assumptions = workspace.indexOf("<AssumptionsCard");
  const calculations = workspace.indexOf("<KeyMetrics");
  const score = workspace.indexOf("<InvestmentOverallScore");
  const highlights = workspace.indexOf("<AnalysisHighlights");
  const training = workspace.indexOf('<TrainingCta placement="analysis"');
  const evaluation = workspace.indexOf("<ProfessionalEvaluationCard");
  const details = workspace.indexOf("<VisualConditionCard");
  const sources = workspace.indexOf("<ImportSourceReview");
  assert.ok(
    parser > 0 &&
      prices > parser &&
      assumptions > prices &&
      calculations > assumptions &&
      score > calculations &&
      highlights > score &&
      training > highlights &&
      evaluation > training &&
      details > evaluation &&
      sources > details,
  );
  assert.doesNotMatch(workspace, /ReportsCard|reports-card/);
  assert.equal(workspace.match(/<ProfessionalEvaluationCard/g)?.length, 1);
  assert.doesNotMatch(
    workspace,
    /PropertyDetailsCard|>Kohteen tiedot|AnalysisCoverageCard|Dokumentit ja lähtötiedot/,
  );
  for (const value of [
    "Talous ja rahoitus",
    "Laskennan yhteenveto",
    "Myynti-ilmoituksen lähtötiedot ja lähteet",
    "analysisReady ?",
  ])
    assert.ok(workspace.includes(value));
});
test("tarjoushintasimulaattori näkyy juuri ennen sijoitusmahdollisuutta", async () => {
  const workspace = await readFile(
    new URL(
      "../src/components/property/property-workspace.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const component = await readFile(
    new URL("../src/components/property/offer-price-card.tsx", import.meta.url),
    "utf8",
  );
  const calculation = await readFile(
    new URL("../src/core/calculations/offer-price.ts", import.meta.url),
    "utf8",
  );
  assert.match(workspace, /import \{ OfferPriceCard \} from "\.\/offer-price-card"/);
  assert.ok(
    workspace.indexOf("<OfferPriceCard") <
      workspace.indexOf("<InvestmentOverallScore"),
  );
  assert.match(component, /export function OfferPriceCard/);
  assert.match(component, /Käytä tarjoushintaa laskelmassa/);
  assert.match(component, /Palauta alkuperäinen hinta/);
  assert.match(calculation, /export function simulateMaximumOfferPrice/);
});
test("yläpalkki tarjoaa ainoan PDF-toiminnon ilman erillistä raporttiosiota", async () => {
  const [header, workspace, printAction] = await Promise.all([
    readFile(new URL("../src/components/property/workspace-header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/core/reports/print-current-report.ts", import.meta.url), "utf8"),
  ]);
  assert.match(header, /printCurrentReport\(reportAddress\)/);
  assert.match(header, /Muodostetaan PDF…/);
  assert.match(header, /PDF-raportin muodostaminen epäonnistui/);
  assert.match(printAction, /window\.print\(\)/);
  assert.doesNotMatch(workspace, /ReportsCard|reports-card/);
});
test("työtilan brändit ovat saavutettavia etusivulinkkejä", async () => {
  for (const file of ["workspace-sidebar.tsx", "workspace-header.tsx"]) {
    const source = await readFile(
      new URL(`../src/components/property/${file}`, import.meta.url),
      "utf8",
    );
    assert.match(source, /import Link from "next\/link"/);
    assert.match(source, /<Link\s+href="\/"\s+aria-label="Siirry etusivulle"/);
    assert.match(source, /cursor-pointer/);
    assert.match(source, /focus-visible:ring/);
  }
});
test("puuttuvat kentät ja suuret tonttilomakkeet eivät renderöidy", async () => {
  const details = await readFile(
    new URL("../src/components/property/details-cards.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    details,
    /SelectField|SelectTrigger|placeholder="Ei tiedossa"/,
  );
  assert.match(details, /if \(present\(importedData\.landOwnership\)\)/);
  assert.match(details, /if \(present\(importedData\.condition\)\)/);
});
