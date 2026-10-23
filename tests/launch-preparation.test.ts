import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createProductEventTracker } from "../src/core/analytics/product-events.ts";

const read = (path: string) =>
  readFile(new URL(path, import.meta.url), "utf8");

test("tuote-eventit lähetetään kerran ilman henkilö- tai laskentatietoja", () => {
  const events: Array<{ name: string; properties?: object }> = [];
  let time = 1_000;
  const send = createProductEventTracker(
    (name, properties) => events.push({ name, properties }),
    () => time,
  );

  send("calculator_used");
  send("calculator_used");
  send("kajabi_redirect_clicked", {
    destination: "training",
    placement: "analysis",
  });
  time += 1_001;
  send("calculator_used");

  assert.deepEqual(events, [
    { name: "calculator_used", properties: undefined },
    {
      name: "kajabi_redirect_clicked",
      properties: { destination: "training", placement: "analysis" },
    },
    { name: "calculator_used", properties: undefined },
  ]);
  assert.doesNotMatch(JSON.stringify(events), /email|address|price|rent|loan/i);
});

test("Vercel Analytics poistaa sivuosoitteen hakuparametrit", async () => {
  const source = await read(
    "../src/components/analytics/privacy-safe-analytics.tsx",
  );
  assert.match(source, /<Analytics beforeSend=/);
  assert.match(source, /url\.search = ""/);
  assert.match(source, /url\.hash = ""/);
});

test("kaikki neljä julkaisueventtiä on kytketty oikeisiin toimintoihin", async () => {
  const [application, header, training, evaluation] = await Promise.all([
    read("../src/components/property/property-application.tsx"),
    read("../src/components/property/workspace-header.tsx"),
    read("../src/components/property/training-cta.tsx"),
    read("../src/components/property/professional-evaluation-card.tsx"),
  ]);
  assert.match(application, /trackProductEvent\("calculator_used"\)/);
  assert.match(header, /trackProductEvent\("report_downloaded"\)/);
  assert.match(evaluation, /trackProductEvent\("analysis_order_clicked"\)/);
  assert.match(training, /trackProductEvent\("kajabi_redirect_clicked"/);
  assert.match(evaluation, /trackProductEvent\("kajabi_redirect_clicked"/);
});

test("julkaisukoodi ei sisällä vanhaa Postgres-liiditallennusta", async () => {
  const [manifest, environment, readme] = await Promise.all([
    read("../package.json"),
    read("../.env.example"),
    read("../README.md"),
  ]);
  assert.doesNotMatch(manifest, /"postgres"|db:migrate|lead:admin/);
  assert.doesNotMatch(environment, /DATABASE_URL|LEAD_EXPORT_ADMIN_TOKEN/);
  assert.match(readme, /ei käytä PostgreSQL\/Neon-tietokantaa/);
});

test("canonical-, sitemap- ja robots-osoitteet käyttävät apex-domainia", async () => {
  const [layout, sitemap, robots] = await Promise.all([
    read("../src/app/layout.tsx"),
    read("../src/app/sitemap.ts"),
    read("../src/app/robots.ts"),
  ]);
  for (const source of [layout, sitemap, robots]) {
    assert.match(source, /https:\/\/asuntosijoituslaskuri\.fi/);
    assert.doesNotMatch(source, /https:\/\/www\.asuntosijoituslaskuri\.fi/);
  }
});

test("tietosuojasivu kuvaa analytiikan, istuntoluonnoksen ja selaimessa syntyvän PDF:n", async () => {
  const privacy = await read("../src/app/tietosuoja/page.tsx");
  assert.match(privacy, /Vercel Web Analytics/);
  assert.match(privacy, /sessionStorage/);
  assert.match(privacy, /PDF muodostetaan selaimen/);
  assert.match(privacy, /ei yksinään takaa tietosuojalainsäädännön/);
});
