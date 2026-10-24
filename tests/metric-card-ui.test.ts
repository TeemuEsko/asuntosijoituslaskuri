import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("tunnuslukukortit ovat responsiivisia, saavutettavia ja käyttävät semanttisia tiloja", async () => {
  const source = await readFile(new URL("../src/components/property/analysis-summary.tsx", import.meta.url), "utf8");
  assert.match(source, /grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4/);
  assert.match(source, /data-status=\{status\.status\}/);
  assert.match(source, /aria-label=\{`Tila: \$\{status\.statusLabel\}`\}/);
  assert.match(source, /StatusIcon aria-hidden="true"/);
  assert.match(source, /METRIC_CARD_STATUS_CLASSES/);
  assert.match(source, /min-w-0/);
  assert.match(source, /flex-wrap items-start/);
  assert.match(source, /max-w-full whitespace-normal/);
  assert.match(source, /break-words text-sm font-medium/);
  assert.doesNotMatch(source, /Infinity|NaN/);
  assert.match(source, /Ensisijainen tuottomittari/);
  assert.match(source, /Vertailuluku/);
  assert.match(source, /data-emphasis=\{metric\.emphasis\}/);
  assert.match(source, /Huomioi tyhjäkäynnin ja jatkuvat kulut, kuten hoitovastikkeen/);
  assert.match(source, /Vuokratuotto ennen vastikkeita ja muita kuluja/);
  assert.match(source, /analysis\.annualBankLoanPrincipal/);
  assert.match(source, /ensimmäiset 12 kk/);
});

test("oman pääoman käyttöliittymä näyttää oletuslähteen ja tarjoaa palautuksen", async () => {
  const assumptions = await readFile(new URL("../src/components/property/assumptions-card.tsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8");
  assert.match(workspace, /\.\.\.defaultEquityAssumption\(\)/);
  assert.match(workspace, /userEquityAssumption\(Number\(value\)\)/);
  assert.match(workspace, /onResetEquity=\{resetEquity\}/);
  assert.match(assumptions, /status=\{values\.equityUserOverridden \? "user" : "default"\}/);
  assert.match(assumptions, /Oletusarvo on 0 €/);
  assert.match(assumptions, /Palauta 0 € oletus/);
});

test("korttien vakuustekstit ja nollan oman pääoman ohje ovat käyttäjälle yksiselitteisiä", async () => {
  const source = await readFile(new URL("../src/components/property/analysis-summary.tsx", import.meta.url), "utf8");
  for (const text of ["Tarvittava lisävakuus", "Vakuuspuskuri", "Vakuustilanne", "Lisää sijoitettava oma pääoma.", "Ei laskettavissa"]) assert.match(source, new RegExp(text));
});
