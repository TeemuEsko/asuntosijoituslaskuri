import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  allowPublicApiAttempt,
  clearPublicApiRateLimits,
} from "../src/server/access/public-api-rate-limit.ts";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("julkinen analyysirajapinta tarkistaa alkuperän ja rajoittaa kutsutahtia", async () => {
  const route = await read("../src/app/api/listing-import/route.ts");
  assert.match(route, /sameOriginMutation\(request\)/);
  assert.match(route, /allowPublicApiAttempt/);
  assert.match(route, /status: 403/);
  assert.match(route, /status: 429/);
});

test("kuva- ja asiakirjareitit käyttävät samoja suojausrajoja", async () => {
  const routes = await Promise.all([
    read("../src/app/api/visual-condition/route.ts"),
    read("../src/app/api/document-analysis/route.ts"),
  ]);
  for (const route of routes) {
    assert.match(route, /sameOriginMutation\(request\)/);
    assert.match(route, /allowPublicApiAttempt/);
  }
  assert.doesNotMatch(routes[0], /error instanceof Error \? error\.message/);
});

test("instanssikohtainen kutsurajoitus hylkää rajan ylittävän pyynnön", () => {
  clearPublicApiRateLimits();
  const request = new Request("https://www.asuntosijoituslaskuri.fi/api/test", {
    headers: { "x-forwarded-for": "203.0.113.10" },
  });
  assert.equal(
    allowPublicApiAttempt({ request, scope: "test", limit: 2, windowMs: 60_000, now: 1_000 }),
    true,
  );
  assert.equal(
    allowPublicApiAttempt({ request, scope: "test", limit: 2, windowMs: 60_000, now: 2_000 }),
    true,
  );
  assert.equal(
    allowPublicApiAttempt({ request, scope: "test", limit: 2, windowMs: 60_000, now: 3_000 }),
    false,
  );
  assert.equal(
    allowPublicApiAttempt({ request, scope: "test", limit: 2, windowMs: 60_000, now: 62_001 }),
    true,
  );
});

test("automaattinen ilmoituskuvien lähetys vaatii erillisen feature flagin", async () => {
  const route = await read("../src/app/api/listing-import/route.ts");
  assert.match(route, /ENABLE_LISTING_IMAGE_ANALYSIS === "true"/);
  assert.match(route, /Boolean\(process\.env\.OPENAI_API_KEY\)/);
});

test("turvaotsakkeet, canonical, robots ja sitemap ovat määritelty", async () => {
  const [config, layout, robots, sitemap] = await Promise.all([
    read("../next.config.ts"),
    read("../src/app/layout.tsx"),
    read("../src/app/robots.ts"),
    read("../src/app/sitemap.ts"),
  ]);
  for (const header of [
    "Content-Security-Policy",
    "Referrer-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Permissions-Policy",
    "Strict-Transport-Security",
    "Cross-Origin-Opener-Policy",
  ])
    assert.match(config, new RegExp(header));
  assert.match(layout, /metadataBase: new URL\("https:\/\/asuntosijoituslaskuri\.fi"\)/);
  assert.match(layout, /alternates: \{ canonical: "\/" \}/);
  assert.match(robots, /disallow: "\/api\/"/);
  assert.match(sitemap, /\/tietosuoja/);
});

test("aloitussivulla on näkyvä tietosuojalinkki ja täsmällinen istuntotallennuskuvaus", async () => {
  const source = await read("../src/components/property/new-property-start.tsx");
  assert.match(source, /href="\/tietosuoja"/);
  assert.match(source, /selaimen istunnossa/);
});
