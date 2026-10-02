import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = (name: string) => readFile(new URL(`../src/components/property/${name}`, import.meta.url), "utf8");

test("dokumenttiosio lähettää varsinaisen tiedoston analyysiin eikä merkitse sitä valmiiksi ennen onnistumista", async () => {
  const source = await component("analysis-coverage-card.tsx");
  assert.match(source, /analyzePropertyDocument\(file, kind\)/);
  assert.match(source, /await analyzePropertyDocument/);
  assert.match(source, /onDocumentAnalyzed\?\.\(result\)/);
  assert.ok(source.indexOf('next[result.documentKind] = "analyzed"') > source.indexOf("await analyzePropertyDocument"));
  assert.match(source, /catch \(error\)/);
  assert.match(source, /\[kind\]: "failed"/);
  assert.match(source, /accept="\.pdf,\.txt"/);
});

test("skannatun asiakirjan palvelinviesti säilyy käyttöliittymään asti", async () => {
  const client = await component("document-analysis-client.ts");
  const coverage = await component("analysis-coverage-card.tsx");
  assert.match(client, /typeof payload\.message === "string"/);
  assert.match(coverage, /error instanceof Error \? error\.message/);
});

test("dokumenttiosio lukitsee rinnakkaisen latauksen ja kohdistaa tuloksen sekä virheen oikealle riville", async () => {
  const source = await component("analysis-coverage-card.tsx");
  assert.match(source, /const activeUploadKind = useRef<RepairDocumentKind \| null>\(null\)/);
  assert.match(source, /if \(!file \|\| activeUploadKind\.current !== null\) return/);
  assert.match(source, /activeUploadKind\.current = kind/);
  assert.match(source, /activeUploadKind\.current = null/);
  assert.match(source, /disabled=\{uploadInProgress\}/);
  assert.match(source, /const kind = selectedKind\.current/);
  assert.match(source, /if \(result\.documentKind\) next\[result\.documentKind\] = "analyzed"/);
  assert.match(source, /setErrors\(\(current\) => \(\{ \.\.\.current, \[kind\]: error instanceof Error/);
});

test("dokumenttirivien tila seuraa muuttuvaa documentKinds-propia", async () => {
  const source = await component("analysis-coverage-card.tsx");
  assert.match(source, /function synchronizeDocumentStates/);
  assert.match(source, /documentKindsSignature/);
  assert.match(source, /useEffect\(\(\) => \{/);
  assert.match(source, /setStates\(\(current\) => synchronizeDocumentStates\(current, analyzedKinds\)\)/);
});

test("isännöitsijäntodistus on varsinainen responsiivinen latausvaihtoehto", async () => {
  const source = await component("analysis-coverage-card.tsx");
  assert.match(source, /kind: "manager_certificate", name: "Isännöitsijäntodistus"/);
  assert.match(source, /flex-col/);
  assert.match(source, /sm:flex-row/);
  assert.match(source, /w-full sm:w-auto/);
});

test("aloitusnäkymän asiakirjapolku odottaa analyysiä ja näyttää virheen poistumatta näkymästä", async () => {
  const start = await component("new-property-start.tsx");
  const application = await component("property-application.tsx");
  assert.match(start, /onDocuments: \(files: FileList \| null\) => Promise<void>/);
  assert.match(start, /await onDocuments\(files\)/);
  assert.match(start, /Analysoidaan asiakirjoja…/);
  assert.match(start, /documentError/);
  assert.match(application, /Promise\.allSettled/);
  assert.match(application, /analyzePropertyDocument/);
  assert.match(application, /mergeDocumentAnalysis/);
});

test("dokumentin provenance näkyy kentän omalla suomalaisella lähdelabelilla", async () => {
  const badge = await component("status-badge.tsx");
  const assumptions = await component("assumptions-card.tsx");
  const workspace = await component("property-workspace.tsx");
  assert.match(badge, /label \?\? fieldStatusLabels\[status\]/);
  assert.match(assumptions, /maintenanceFeeSourceLabel/);
  assert.match(assumptions, /financingFeeSourceLabel/);
  assert.match(assumptions, /otherCostsSourceLabel/);
  assert.match(workspace, /sourceLabel/);
  assert.match(workspace, /documentWarnings/);
});

test("dokumentin muut säännölliset kulut ja viimeisin workspace-tila kytketään laskentaan", async () => {
  const workspace = await component("property-workspace.tsx");
  const updater = await readFile(new URL("../src/core/documents/workspace-update.ts", import.meta.url), "utf8");
  assert.match(workspace, /applyDocumentAnalysisToWorkspaceState/);
  assert.match(workspace, /const snapshot = latestStateRef\.current/);
  assert.match(updater, /otherCostsWereApplied/);
  assert.match(updater, /documentOtherCostsMonthly/);
  assert.match(updater, /validateDocumentCanonicalConsistency/);
  assert.match(workspace, /field === "otherMonthlyFees" \|\| field === "plotFeeMonthly"/);
  assert.match(workspace, /otherCostsUserOverride/);
});

test("ilmoituskatselmuksessa hyväksytty tieto saa käyttäjälähteen", async () => {
  const listingImport = await component("listing-import.tsx");
  assert.match(listingImport, /importedValues\.documentProvenance!\[finding\.field\]/);
  assert.match(listingImport, /source: \{ kind: "user", label: "Käyttäjän tieto" \}/);
});
