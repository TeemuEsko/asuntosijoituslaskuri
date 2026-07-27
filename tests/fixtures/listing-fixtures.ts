import type { ListingSourceType, RenovationComponent } from "../../src/core/parser/listing-parser.ts";
import type { NormalizedFieldKey } from "../../src/core/parser/synonyms.ts";

export type ListingFixture = {
  name: string;
  source: ListingSourceType;
  text: string;
  expectedFields?: Partial<Record<NormalizedFieldKey, number | string>>;
  expectedRenovations?: Array<{ component: RenovationComponent; status: string }>;
  forbiddenRenovations?: RenovationComponent[];
  expectedMissing?: string[];
  expectedConflicts?: number;
  expectedCompanyFindingCount?: number;
};

const base = `Perustiedot
Osoite: Kivikkokuja 4 A 2
Kunta: Laihia
Pinta-ala: 32 m²
Huoneistotyyppi: 1h + kk
Rakennusvuosi: 1972
Hintatiedot
Myyntihinta: 79 000 €
Yhtiölainaosuus: 0 €
Velaton hinta: 79 000 €
Vastikkeet ja maksut
Hoitovastike: 185 €/kk
Rahoitusvastike: 0 €/kk
Taloyhtiön tiedot
Taloyhtiö: Asunto Oy Laihian Kivikkokuja 4`;

export const listingFixtures: ListingFixture[] = [
  { name: "Normaali Etuovi-ilmoitus", source: "etuovi", text: base, expectedFields: { salePrice: 79_000, areaSqm: 32, housingCompanyName: "Asunto Oy Laihian Kivikkokuja 4" } },
  { name: "Normaali Oikotie-ilmoitus", source: "oikotie", text: base.replace("Kivikkokuja", "Koulukatu"), expectedFields: { debtFreePrice: 79_000, maintenanceFeeMonthly: 185 } },
  { name: "Ei yhtiölainaa", source: "pasted_text", text: `${base}\nLainaosuus: 0 €`, expectedFields: { companyLoanShare: 0 }, expectedConflicts: 0 },
  { name: "Suuri yhtiölainaosuus", source: "pasted_text", text: "Hintatiedot\nMyyntihinta: 90 000 €\nYhtiölainaosuus: 110 000 €\nVelaton hinta: 200 000 €", expectedFields: { companyLoanShare: 110_000, debtFreePrice: 200_000 } },
  { name: "Useita rahoitusvastikkeita", source: "pasted_text", text: "Vastikkeet ja maksut\nPääomavastike A: 100 €/kk\nPääomavastike B: 45 €/kk\nHoitovastike: 185 €/kk", expectedFields: { financingFeeMonthly: 145 } },
  { name: "Valinnainen vuokratontti", source: "pasted_text", text: "Tontti\nTontin omistusmuoto: Valinnainen vuokratontti", expectedFields: { landOwnership: "optional_leasehold" } },
  { name: "Oma tontti", source: "pasted_text", text: "Tontti\nTontin omistusmuoto: Oma tontti", expectedFields: { landOwnership: "owned" } },
  { name: "Vuokratontti", source: "pasted_text", text: "Tontti\nTontin omistusmuoto: Vuokratontti", expectedFields: { landOwnership: "leased" } },
  { name: "Tehty putkiremontti", source: "pasted_text", text: "Tehdyt remontit\nPutkiremontti tehty 2018", expectedRenovations: [{ component: "pipe_unspecified", status: "completed" }] },
  { name: "Vain käyttövesiputket uusittu", source: "pasted_text", text: "Tehdyt remontit\nKäyttövesiputket uusittu 2018", expectedRenovations: [{ component: "water_pipes", status: "completed" }], forbiddenRenovations: ["full_line", "drains"] },
  { name: "Viemärit sukitettu", source: "pasted_text", text: "Tehdyt remontit\nViemärien sukitus toteutettu 2019", expectedRenovations: [{ component: "drain_lining", status: "completed" }], forbiddenRenovations: ["full_line"] },
  { name: "Putkiremontti suunnitteilla", source: "pasted_text", text: "Tulevat remontit\nPutkiremontti suunnitteilla 2029", expectedRenovations: [{ component: "pipe_unspecified", status: "planned" }] },
  { name: "Kylpyhuone vain kuvauksessa", source: "pasted_text", text: "Kuvaus\nTilavassa kylpyhuoneessa on paikka pesukoneelle. Kylpyhuoneen kuvaus on ilmoituksessa.", forbiddenRenovations: ["bathrooms"] },
  { name: "Taloyhtiön nimi useassa kohdassa", source: "pasted_text", text: "Taloyhtiön tiedot\nTaloyhtiö: Asunto Oy Laihian Kivikkokuja 4\nYhtiön nimi: Laihian Kivikkokuja 4", expectedFields: { housingCompanyName: "Asunto Oy Laihian Kivikkokuja 4" }, expectedCompanyFindingCount: 1 },
  { name: "Ristiriitaiset hintatiedot", source: "pasted_text", text: "Hintatiedot\nMyyntihinta: 70 000 €\nYhtiölainaosuus: 10 000 €\nVelaton hinta: 85 000 €", expectedConflicts: 1 },
  { name: "Puuttuva velaton hinta", source: "pasted_text", text: "Hintatiedot\nMyyntihinta: 70 000 €\nYhtiölainaosuus: 10 000 €", expectedMissing: ["Velaton hinta"] },
  { name: "Neliöperusteinen vastike", source: "pasted_text", text: "Perustiedot\nPinta-ala: 32 m²\nVastikkeet ja maksut\nHoitovastike: 5,78 €/m²/kk", expectedFields: { maintenanceFeeMonthly: 184.96 } },
  { name: "Ilmoitusteksti liitetty käsin", source: "pasted_text", text: base, expectedFields: { salePrice: 79_000, areaSqm: 32 } },
];

export const fetchFailureFixtures = [
  { name: "Poistunut ilmoitus", status: 404, expectedCode: "listing_removed" },
  { name: "Estetty sivunhaku", status: 403, expectedCode: "site_blocked" },
] as const;
