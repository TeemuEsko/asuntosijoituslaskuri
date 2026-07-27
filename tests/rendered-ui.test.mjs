import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { forbiddenVisibleValues, visibleTextFromHtml } from "./support/forbidden-visible-values.mjs";

test("renderöity aloitusnäkymä on suomenkielinen eikä paljasta teknisiä arvoja", async () => {
  const html = await readFile(new URL("../.next/server/app/index.html", import.meta.url), "utf8");
  const visibleText = visibleTextFromHtml(html);
  for (const forbidden of forbiddenVisibleValues) assert.doesNotMatch(visibleText, new RegExp(`(^|[^a-z])${forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i"), `Renderöity UI sisältää kielletyn arvon: ${forbidden}`);
  assert.match(html, /asuntosijoituslaskuri\.fi/);
  assert.match(html, /Aloita uusi kohde/);
  assert.match(html, /Ennakkoversio/);
});
