import assert from "node:assert/strict";
import test from "node:test";
import { evaluateInvestmentObservations } from "../src/core/rules/investment-observations.ts";
import { assessRepairHistory } from "../src/core/rules/repair-history.ts";
import { parseListingText } from "../src/core/parser/listing-parser.ts";

const base = { vacancyMonths: 0, repairHistoryKnown: true, loanKnown: true };

function documentedAssessment(text: string, constructionYear = 1970) {
  const parsed = parseListingText(text);
  const renovations = parsed.renovations.map((repair) => ({
    ...repair,
    source: "document" as const,
    sourceName: "Isännöitsijäntodistus",
    verifiedByDocuments: true,
  }));
  return assessRepairHistory({ renovations, constructionYear, documentKinds: ["manager_certificate", "maintenance_plan"] });
}

test("vahvistettu suuri korjaus näkyy vahvuutena mutta ei poista muuta korjausriskiä", () => {
  const repairHistory = documentedAssessment("Tehdyt remontit\nTäydellinen linjasaneeraus tehty 2018");
  const observations = evaluateInvestmentObservations({ ...base, repairHistory });
  const strength = observations.find((item) => item.id === "documented-major-renovations");
  assert.equal(strength?.type, "strength");
  assert.match(strength?.description ?? "", /pienentää.*korjausriskiä/i);
  assert.match(strength?.description ?? "", /ei poista muiden korjausten tarvetta/i);
});

test("pelkkä ilmoituksesta parsittu suuri korjaus ei muutu vahvistetuksi vahvuudeksi", () => {
  const parsed = parseListingText("Tehdyt remontit\nTäydellinen linjasaneeraus tehty 2018");
  const repairHistory = assessRepairHistory({ renovations: parsed.renovations, constructionYear: 1970, documentKinds: ["listing"] });
  const observations = evaluateInvestmentObservations({ ...base, repairHistory });
  assert.equal(observations.some((item) => item.id === "documented-major-renovations"), false);
  assert.equal(observations.find((item) => item.id === "listing-major-renovations-check")?.type, "missingData");
});

test("päätetty, suunniteltu ja mahdollinen suuri korjaus erotetaan lähdevarmuuden mukaan", () => {
  const repairHistory = documentedAssessment("Tulevat remontit\nTäydellinen linjasaneeraus päätetty 2028\nVesikatto uusitaan suunnitelman mukaan 2030");
  const observations = evaluateInvestmentObservations({ ...base, repairHistory });
  const future = observations.filter((item) => item.id.startsWith("future-renovation-"));
  assert.ok(future.length >= 1);
  assert.ok(future.some((item) => /päätetty|suunniteltu/.test(item.description)));
  assert.ok(future.every((item) => /Huoneistokohtaista kustannusta ei ole saatavilla/.test(item.description)));
});

test("puuttuva putkihistoria on tarkistustarve eikä väite tekemättömästä remontista", () => {
  const repairHistory = assessRepairHistory({ renovations: [], constructionYear: 1965, documentKinds: ["listing"] });
  const observations = evaluateInvestmentObservations({ ...base, repairHistoryKnown: false, repairHistory });
  const check = observations.find((item) => item.id === "pipe-history-check");
  assert.equal(check?.type, "missingData");
  assert.match(check?.description ?? "", /ei tarkoita, että putkiremontti olisi tekemättä/i);
});

test("vuokratontin päättyminen ei väitä jatkumattomuutta ilman vahvistusta", () => {
  const observations = evaluateInvestmentObservations({ ...base, landOwnership: "leased", landLeaseEndDate: "2030" });
  const expiry = observations.find((item) => item.id === "land-lease-expiry-soon");
  assert.equal(expiry?.type, "risk");
  assert.match(expiry?.description ?? "", /Jatkosta ei ole vahvistettua tietoa/);
  assert.equal(observations.some((item) => item.id === "verified-land-lease-non-renewal"), false);
});

test("vahvistettu jatkumattomuus, nykyinen tonttivastike ja puuttuva korotuslaskelma esitetään erikseen", () => {
  const observations = evaluateInvestmentObservations({
    ...base,
    landOwnership: "leased",
    landLeaseEndDate: "2028",
    verifiedLandLeaseNonRenewal: true,
    plotFeeMonthly: 85,
    landRentAnnual: 24_000,
  });
  assert.equal(observations.find((item) => item.id === "verified-land-lease-non-renewal")?.severity, "critical");
  assert.match(observations.find((item) => item.id === "current-plot-fee")?.description ?? "", /85 €\/kk/);
  assert.match(observations.find((item) => item.id === "land-rent-increase-terms-check")?.description ?? "", /ei voida laskea ilman korotusehtoa ja jakoperustetta/);
  assert.equal(new Set(observations.map((item) => item.description)).size, observations.length);
});

test("oma tontti näkyy vahvuutena ilman uutta pisteytyssääntöä", () => {
  const observations = evaluateInvestmentObservations({ ...base, landOwnership: "owned" });
  assert.equal(observations.find((item) => item.id === "owned-land")?.type, "strength");
});

test("dokumentoitu maanvuokran korotus nousee vahvistetuksi riskiksi", () => {
  const observations = evaluateInvestmentObservations({ ...base, landOwnership: "leased", landLeaseEndDate: "2055", documentedLandRentIncrease: true, landRentIncreaseDescription: "vuokra nousee vuonna 2028" });
  const finding = observations.find((item) => item.id === "documented-land-rent-increase");
  assert.equal(finding?.type, "risk");
  assert.equal(finding?.severity, "high");
  assert.match(finding?.description ?? "", /vuokra nousee vuonna 2028/);
});

test("sähkölämmitys erottaa kustannusvastuun ilman automaattista oletusta", () => {
  const unknown = evaluateInvestmentObservations({ ...base, heatingType: "electric" });
  const tenant = evaluateInvestmentObservations({ ...base, heatingType: "electric", heatingCostResponsibility: "tenant" });
  const included = evaluateInvestmentObservations({ ...base, heatingType: "electric", heatingCostResponsibility: "included" });
  const landlord = evaluateInvestmentObservations({ ...base, heatingType: "electric", heatingCostResponsibility: "landlord" });
  assert.equal(unknown.find((item) => item.id === "electric-heating-responsibility-check")?.type, "missingData");
  assert.equal(tenant.find((item) => item.id === "tenant-paid-electric-heating")?.type, "risk");
  assert.equal(included.some((item) => /electric-heating|tenant-paid-electric/.test(item.id)), false);
  assert.match(landlord.find((item) => item.id === "landlord-paid-electric-heating-check")?.description ?? "", /muihin kuukausikuluihin vain kerran/);
});

test("rahoitusvaje on eri havainto kuin lisävakuustarve", () => {
  const observations = evaluateInvestmentObservations({ ...base, financingGap: 397.5, collateralShortfall: 5_000 });
  const cashGap = observations.find((item) => item.id === "acquisition-financing-gap");
  const collateralGap = observations.find((item) => item.id === "collateral-shortfall");
  assert.equal(cashGap?.title, "Puuttuva oma raha");
  assert.equal(cashGap?.value, 397.5);
  assert.equal(collateralGap?.title, "Tarvittava lisävakuus");
});
