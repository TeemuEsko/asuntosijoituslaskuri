import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateOptIn, CONSENT_SOURCE, CONSENT_TEXT_VERSION } from "../src/core/leads/model.ts";
import { createAccessSessionToken, verifyAccessSessionToken } from "../src/server/access/session.ts";
import { marketingLeadsCsv } from "../src/server/leads/csv.ts";
import { sameOriginMutation, secureTokenMatches } from "../src/server/access/request-security.ts";

const secret = "test-secret-with-at-least-thirty-two-characters";
const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("opt-in hyväksyy etunimen ja normalisoi sähköpostin ilman markkinointipakkoa", () => {
  const result = validateOptIn({ firstName: "  Maija  ", email: " MAIJA@Example.FI ", marketingConsent: false });
  assert.deepEqual(result, { ok: true, value: { firstName: "Maija", emailNormalized: "maija@example.fi", marketingConsent: false } });
});

test("tyhjä nimi, virheellinen sähköposti ja liian pitkät syötteet estetään", () => {
  assert.equal(validateOptIn({ firstName: "", email: "a@b.fi", marketingConsent: false }).ok, false);
  assert.equal(validateOptIn({ firstName: "Maija", email: "ei-sähköposti", marketingConsent: false }).ok, false);
  assert.equal(validateOptIn({ firstName: "M".repeat(81), email: "a@b.fi", marketingConsent: false }).ok, false);
  assert.equal(validateOptIn({ firstName: "Maija", email: `${"a".repeat(250)}@b.fi`, marketingConsent: false }).ok, false);
});

test("suostumuksen versio ja lähde ovat eksplisiittiset", () => {
  assert.equal(CONSENT_TEXT_VERSION, "2026-10-16-v1");
  assert.equal(CONSENT_SOURCE, "analysis_optin");
});

test("palvelimen allekirjoittama sessio hyväksytään voimassaoloaikana", () => {
  const now = Date.UTC(2026, 9, 16);
  const token = createAccessSessionToken("lead-1", secret, now);
  assert.equal(verifyAccessSessionToken(token, secret, now + 1_000)?.leadId, "lead-1");
});

test("vanhentunut, muokattu ja väärällä salaisuudella allekirjoitettu sessio hylätään", () => {
  const now = Date.UTC(2026, 9, 16);
  const token = createAccessSessionToken("lead-1", secret, now);
  assert.equal(verifyAccessSessionToken(token, secret, now + 31 * 24 * 60 * 60 * 1_000), null);
  assert.equal(verifyAccessSessionToken(`${token}x`, secret, now), null);
  assert.equal(verifyAccessSessionToken(token, `${secret}-wrong`, now), null);
});

test("CSV muotoilee vain sille annetut suostumusrivit ja torjuu kaavainjektion", () => {
  const csv = marketingLeadsCsv([{ firstName: "=HYPERLINK(1)", emailNormalized: "maija@example.fi", consentTimestamp: new Date("2026-10-16T12:00:00Z"), consentSource: "analysis_optin" }]);
  assert.match(csv, /"First Name","Email"/);
  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /maija@example\.fi/);
  assert.doesNotMatch(csv, /ei-lupaa@example\.fi/);
});

test("admin-token vaatii pitkän täsmällisen palvelinsalaisuuden", () => {
  assert.equal(secureTokenMatches(secret, secret), true);
  assert.equal(secureTokenMatches("väärä", secret), false);
  assert.equal(secureTokenMatches(undefined, secret), false);
});

test("cross-site mutaatio hylätään", () => {
  const request = new Request("https://app.example.fi/api/leads/opt-in", { headers: { origin: "https://evil.example", host: "app.example.fi", "sec-fetch-site": "cross-site" } });
  assert.equal(sameOriginMutation(request), false);
});

test("tietokantamigraatio sisältää uniikin sähköpostin ja suostumusauditin", async () => {
  const sql = await read("../db/migrations/001_lead_capture.sql");
  assert.match(sql, /email_normalized varchar\(254\) not null unique/i);
  assert.match(sql, /create table if not exists consent_events/i);
  assert.match(sql, /action in \('granted', 'revoked'\)/i);
  assert.match(sql, /on delete cascade/i);
});

test("Postgres-upsert estää duplikaatit eikä muuta kieltoa suostumukseksi ilman uutta lupaa", async () => {
  const source = await read("../src/server/leads/postgres.ts");
  assert.match(source, /on conflict \(email_normalized\) do update/i);
  assert.match(source, /leads\.marketing_consent or excluded\.marketing_consent/i);
  assert.match(source, /if \(input\.marketingConsent\)[\s\S]*consent_events/);
});

test("maksuton analyysi ja raportti eivät tarkista liidisessiota tai tietokantariviä", async () => {
  const [analysis, report] = await Promise.all([read("../src/app/api/listing-import/route.ts"), read("../src/app/api/report/route.ts")]);
  for (const source of [analysis, report]) {
    assert.doesNotMatch(source, /sessionFromRequest/);
    assert.doesNotMatch(source, /touchLead|leadRepository|DATABASE_URL|SESSION_SECRET/);
  }
  assert.doesNotMatch(analysis, /unauthorizedResponse|recordFunnelEvent/);
  assert.match(report, /status: 204/);
});

test("CSV-reitti vaatii palvelinpuolisen bearer-tunnistuksen", async () => {
  const source = await read("../src/app/api/admin/leads/export/route.ts");
  assert.match(source, /authorization/);
  assert.match(source, /secureTokenMatches/);
  assert.match(source, /status: 401/);
  assert.match(source, /LEAD_EXPORT_ADMIN_TOKEN/);
});

test("selainvaraston analyysiluonnos palautuu ilman henkilötietoja tai palvelinsessiota", async () => {
  const source = await read("../src/components/property/property-application.tsx");
  assert.match(source, /sessionStorage\.getItem/);
  assert.doesNotMatch(source, /api\/access\/session|LeadOptIn|manual_optin|firstName|email/);
});

test("opt-in on mobiiliystävällinen, vapaaehtoinen ja estää tuplalähetyksen", async () => {
  const source = await read("../src/components/property/lead-opt-in.tsx");
  assert.match(source, /w-full max-w-xl/);
  assert.match(source, /if \(submitting\) return/);
  assert.match(source, /checked=\{marketingConsent\}/);
  assert.match(source, /vapaaehtoinen/);
  assert.match(source, /AbortSignal\.timeout/);
});

test("raportin tulostus toimii suoraan ilman palvelimen käyttöoikeustarkistusta", async () => {
  const source = await read("../src/components/property/reports-card.tsx");
  assert.match(source, /window\.print\(\)/);
  assert.doesNotMatch(source, /api\/report|accessError|checkingAccess|yhteystietosi|Istuntosi/);
});
