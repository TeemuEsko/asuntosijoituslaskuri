import test from "node:test";
import assert from "node:assert/strict";
import { parseListingText } from "../src/core/parser/listing-parser.ts";

test("parseri poimii parity-auditissa lisätyt tontti-, juridiset ja kohdekentät", () => {
  const result = parseListingText(`Perustiedot\nKerrosten lukumäärä: 5\nParveke: Lasitettu\nSauna: Taloyhtiössä\nAutopaikka: Hallipaikka\nTontti\nTontin vuosivuokra: 12 000 €\nTonttiosuuden lunastushinta: 18 500 €\nSeuraava lunastusajankohta: kesäkuu 2027\nLisätiedot\nLunastuslauseke: Osakkailla lunastusoikeus\nKäyttörajoitukset: Lyhytaikainen vuokraus kielletty\nVapautuminen: Sopimuksen mukaan\nVuokraustilanne: Vuokrattu`, "etuovi");
  const fields = new Set(result.findings.map((item) => item.field));
  for (const field of ["floorCount", "balcony", "sauna", "parking", "landRentAnnual", "plotShareRedemptionPrice", "nextPlotShareRedemptionDate", "articlesRedemptionClause", "usageRestrictions", "availability", "occupancyStatus"]) assert.ok(fields.has(field as never), field);
});
