import assert from "node:assert/strict";
import test from "node:test";

import { booleanLabels, confidenceLabels, fieldStatusLabels, landOwnershipLabels, redemptionClauseLabels, ruleStatusLabels, severityLabels, workflowStatusLabels } from "../src/core/i18n/display-values.ts";

test("kaikilla käyttöliittymän enum-arvoilla on suomenkielinen näyttöarvo", () => {
  const maps = [booleanLabels, confidenceLabels, fieldStatusLabels, landOwnershipLabels, redemptionClauseLabels, ruleStatusLabels, severityLabels, workflowStatusLabels];
  const forbidden = /^(owned|leased|optional_leasehold|unchecked|yes|no|true|false|draft|ready|pending|error|warning|success|high|medium|low|parser)$/i;
  for (const map of maps) for (const label of Object.values(map)) assert.doesNotMatch(label, forbidden);
  assert.equal(fieldStatusLabels.parser, "Tietojen haku");
  assert.equal(landOwnershipLabels.owned, "Oma tontti");
  assert.equal(ruleStatusLabels.unchecked, "Ei tarkistettu");
  assert.equal(booleanLabels.true, "Kyllä");
  assert.equal(booleanLabels.false, "Ei");
});
