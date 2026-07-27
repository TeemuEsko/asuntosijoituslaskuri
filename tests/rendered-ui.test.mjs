import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("renderöity aloitusnäkymä on suomenkielinen eikä paljasta teknisiä arvoja", async () => {
  const html = await readFile(new URL("../.next/server/app/index.html", import.meta.url), "utf8");
  for (const forbidden of ["PropertyOS", "Early Access", "Property Workspace", ">owned<", ">unchecked<", ">true<", ">false<"]) assert.equal(html.includes(forbidden), false, `Renderöity UI sisältää kielletyn arvon: ${forbidden}`);
  assert.match(html, /asuntosijoituslaskuri\.fi/);
  assert.match(html, /Aloita uusi kohde/);
  assert.match(html, /Ennakkoversio/);
});
