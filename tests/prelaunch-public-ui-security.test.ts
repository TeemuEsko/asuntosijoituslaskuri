import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const propertyComponent = (name: string) =>
  readFile(path.join(root, "src/components/property", name), "utf8");

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory()
          ? sourceFiles(target)
          : /\.(?:ts|tsx)$/.test(entry.name)
            ? [target]
            : [];
      }),
    )
  ).flat();
}

test("cases 1–10: julkisessa komponenttipuussa ei ole dokumenttilatausta tai siihen kehottavia elementtejä", async () => {
  const publicFiles = [
    "new-property-start.tsx",
    "property-application.tsx",
    "property-workspace.tsx",
    "workspace-sidebar.tsx",
    "reports-card.tsx",
  ];
  const publicSource = (
    await Promise.all(publicFiles.map(propertyComponent))
  ).join("\n");
  for (const forbidden of [
    "AnalysisCoverageCard",
    "analyzePropertyDocument",
    "document-analysis-client",
    "onDocuments",
    'type="file"',
    "Lisää asiakirja",
    "Lisää dokumentti",
    "Isännöitsijäntodistus",
    "Tilinpäätös",
    "PTS",
    "Osakeluettelo",
    "Dokumentit ja lähtötiedot",
    "dokumentit kannattaa",
    "asiakirjoja kannattaa",
  ])
    assert.equal(
      publicSource.includes(forbidden),
      false,
      `Julkinen UI sisältää tekstin tai kytkennän: ${forbidden}`,
    );
  assert.match(publicSource, /Myynti-ilmoituksen lähtötiedot ja lähteet/);
});

test("cases 11–15: dokumenttimoottori, normalisointi, provenance ja canonical merge säilyvät", async () => {
  const required = [
    "src/server/documents/deterministic-document-parser.ts",
    "src/server/documents/local-document-text.ts",
    "src/core/documents/normalize.ts",
    "src/core/documents/merge.ts",
    "src/core/documents/types.ts",
    "src/core/documents/workspace-update.ts",
    "src/components/property/analysis-coverage-card.tsx",
    "src/components/property/document-analysis-client.ts",
    "tests/document-analysis-integration.test.ts",
    "tests/document-analysis-route.test.ts",
  ];
  for (const relative of required)
    assert.ok(
      (await readFile(path.join(root, relative), "utf8")).length > 0,
      `${relative} puuttuu`,
    );
});

test("cases 16–25: pää-CTA:t korostuvat, toimivat ennallaan eikä raakadata-CTA:ta renderöidä", async () => {
  const [header, reports, expert, exportUtility] = await Promise.all([
    propertyComponent("workspace-header.tsx"),
    propertyComponent("reports-card.tsx"),
    propertyComponent("professional-evaluation-card.tsx"),
    readFile(path.join(root, "src/core/reports/analysis-report.ts"), "utf8"),
  ]);
  assert.match(header, /Luo raportti/);
  assert.match(header, /scrollIntoView/);
  assert.match(header, /min-h-12/);
  assert.match(reports, /Tulosta tai tallenna PDF/);
  assert.match(reports, /window\.print\(\)/);
  assert.match(reports, /h-14/);
  assert.doesNotMatch(reports, /Lataa analyysidata|downloadData|\.json/);
  assert.match(expert, /Pyydä ammattilaisen arvio/);
  assert.match(expert, /min-h-14/);
  assert.match(expert, /onClick=\{onRequestEvaluation\}/);
  assert.match(exportUtility, /export function buildAnalysisReportData/);
});

test("cases 26–29: client-komponentit eivät tuo server-moduuleja tai raskasta listing-parseria", async () => {
  const files = await sourceFiles(path.join(root, "src/components"));
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (!/^"use client";/m.test(source)) continue;
    assert.doesNotMatch(
      source,
      /(?:from|import\()\s*["']@\/server\//,
      `${path.relative(root, file)} tuo server-moduulin`,
    );
    const runtimeParserImport =
      source.match(
        /import(?!\s+type)[^;]*from\s+["']@\/core\/parser\/listing-parser["']/g,
      ) ?? [];
    assert.deepEqual(
      runtimeParserImport,
      [],
      `${path.relative(root, file)} tuo listing-parserin client-bundleen`,
    );
  }
  const route = await readFile(
    path.join(root, "src/app/api/listing-import/route.ts"),
    "utf8",
  );
  assert.match(route, /clientSafeListingResult/);
  assert.match(route, /delete publicResult\.diagnostics/);
  assert.match(route, /delete publicRentEstimate\.resolutionDiagnostics/);
  const config = await readFile(path.join(root, "next.config.ts"), "utf8");
  assert.doesNotMatch(config, /productionBrowserSourceMaps\s*:\s*true/);
});

test("dokumentti-API on oletuksena suljettu ennen request bodyn lukemista", async () => {
  const route = await readFile(
    path.join(root, "src/app/api/document-analysis/route.ts"),
    "utf8",
  );
  const gate = route.indexOf('process.env.ENABLE_DOCUMENT_ANALYSIS !== "true"');
  const bodyRead = route.indexOf("request.formData()");
  assert.ok(gate > 0 && bodyRead > gate);
  assert.match(route, /DOCUMENT_ANALYSIS_DISABLED/);
});
