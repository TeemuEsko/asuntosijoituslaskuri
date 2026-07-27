import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ammattilaisarviokortti sisältää sovitun viestin ja laajennettavan toimintopainikkeen", async () => {
  const source = await readFile(new URL("../src/components/property/professional-evaluation-card.tsx", import.meta.url), "utf8");
  for (const text of [
    "Haluatko ammattilaisen arvion tästä kohteesta?",
    "Onko hintapyyntö markkinatasolla?",
    "Löytyykö hinnassa neuvotteluvaraa?",
    "Mitkä ovat kohteen suurimmat riskit ja mahdollisuudet?",
    "Miten itse etenisin tämän kohteen kanssa?",
    "Yksi hyvä päätös voi säästää tai tuottaa kymmeniä tuhansia euroja.",
    "Pyydä ammattilaisen arvio",
  ]) assert.match(source, new RegExp(text.replace(/[?]/g, "\\?")));
  assert.match(source, /onRequestEvaluation/);
  assert.doesNotMatch(source, /Kajabi/i);
});
