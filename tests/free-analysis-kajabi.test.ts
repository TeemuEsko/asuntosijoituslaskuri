import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { GET as reportAccess } from "../src/app/api/report/route.ts";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("URL-, teksti- ja manuaalipolku eivät renderöi pakollista opt-inia", async () => {
  const [application, listingImport] = await Promise.all([
    read("../src/components/property/property-application.tsx"),
    read("../src/components/property/listing-import.tsx"),
  ]);
  for (const source of [application, listingImport])
    assert.doesNotMatch(
      source,
      /LeadOptIn|manual_optin|showOptIn|api\/access\/session|marketingConsent/,
    );
  assert.match(application, /onManual=\{\(\) => openWorkspace\(\)\}/);
  assert.match(listingImport, /if \(mode !== "url"\)[\s\S]*await loadAnalysis/);
  assert.match(listingImport, /payload\.preview/);
  assert.match(
    listingImport,
    /if \(!response\.ok \|\| !payload\.preview\)[\s\S]*await loadAnalysis\(forceRefresh\)/,
  );
});

test("analyysi-, raportti-, dokumentti- ja kuvarajapinnat eivät vaadi liidisessiota", async () => {
  const routes = await Promise.all([
    read("../src/app/api/listing-import/route.ts"),
    read("../src/app/api/report/route.ts"),
    read("../src/app/api/document-analysis/route.ts"),
    read("../src/app/api/visual-condition/route.ts"),
  ]);
  for (const source of routes)
    assert.doesNotMatch(
      source,
      /sessionFromRequest|touchLead|leadRepository|unauthorizedResponse|ACCESS_REQUIRED|SESSION_SECRET|DATABASE_URL/,
    );
  const response = await reportAccess();
  assert.equal(response.status, 204);
});

test("julkinen tunnistus käyttää muistirajoitusta ilman Neon- tai sessioriippuvuutta", async () => {
  const route = await read("../src/app/api/listing-identify/route.ts");
  assert.match(route, /allowListingIdentifyAttempt/);
  assert.doesNotMatch(route, /leadRepository|SESSION_SECRET|DATABASE_URL/);
});

test("Kajabi-linkki on keskitetty ja kaikki kolme CTA-sijoittelua käyttävät sitä", async () => {
  const [config, component, workspace, printReport, env] = await Promise.all([
    read("../src/config/marketing.ts"),
    read("../src/components/property/training-cta.tsx"),
    read("../src/components/property/property-workspace.tsx"),
    read("../src/components/property/investment-analysis-print-report.tsx"),
    read("../.env.example"),
  ]);
  assert.match(config, /NEXT_PUBLIC_KAJABI_TRAINING_URL/);
  assert.match(config, /https:\/\/www\.teemuesko\.fi\/asuntosijoittajan-kasvuloikka-maksuton-koulutus/);
  assert.match(component, /Haluatko kasvattaa asuntosalkkuasi suunnitelmallisesti/);
  assert.match(component, /Haluatko kehittyä asuntosijoittajana/);
  assert.match(component, /target="_blank"/);
  assert.match(component, /rel="noopener noreferrer"/);
  assert.match(component, /w-full[\s\S]*sm:w-auto/);
  assert.equal(workspace.match(/<TrainingCta/g)?.length, 2);
  assert.match(workspace, /<TrainingCta placement="analysis"/);
  assert.match(workspace, /<TrainingCta placement="footer"/);
  assert.match(printReport, /Haluatko oppia rakentamaan kasvavaa asuntosalkkua/);
  assert.match(printReport, /<a href=\{kajabiTrainingUrl\}>Katso maksuton koulutus<\/a>/);
  assert.match(printReport, /<small>\{kajabiTrainingUrl\}<\/small>/);
  assert.match(env, /NEXT_PUBLIC_KAJABI_TRAINING_URL=/);
});

test("julkinen käyttöpolku ei kutsu vanhaa liidi- tai funnel-APIa", async () => {
  const files = await Promise.all([
    read("../src/components/property/property-application.tsx"),
    read("../src/components/property/listing-import.tsx"),
    read("../src/components/property/reports-card.tsx"),
    read("../src/components/property/property-workspace.tsx"),
  ]);
  for (const source of files)
    assert.doesNotMatch(source, /api\/leads\/opt-in|api\/funnel|trackFunnelEvent/);
});
