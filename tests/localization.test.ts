import assert from "node:assert/strict";
import test from "node:test";

import { booleanLabels, confidenceLabels, fieldStatusLabels, landOwnershipLabels, redemptionClauseLabels, ruleStatusLabels, severityLabels, workflowStatusLabels } from "../src/core/i18n/display-values.ts";

test("kaikilla käyttöliittymän enum-arvoilla on suomenkielinen näyttöarvo", () => {
  const maps = [booleanLabels, confidenceLabels, fieldStatusLabels, landOwnershipLabels, redemptionClauseLabels, ruleStatusLabels, severityLabels, workflowStatusLabels];
  const forbidden = /^(owned|leased|optional_leasehold|unchecked|yes|no|true|false|draft|ready|pending|error|warning|success|high|medium|low|parser)$/i;
  for (const map of maps) for (const label of Object.values(map)) assert.doesNotMatch(label, forbidden);
  assert.equal(fieldStatusLabels.parser, "Myynti-ilmoitus");
  assert.equal(fieldStatusLabels.user, "Käyttäjän tieto");
  assert.equal(fieldStatusLabels.statistics, "Tilastokeskus");
  assert.equal(fieldStatusLabels.automatic, "Automaattinen arvio");
  assert.equal(fieldStatusLabels.default, "Oletus");
  assert.equal(landOwnershipLabels.owned, "Oma tontti");
  assert.equal(ruleStatusLabels.unchecked, "Ei tarkistettu");
  assert.equal(booleanLabels.true, "Kyllä");
  assert.equal(booleanLabels.false, "Ei");
});
