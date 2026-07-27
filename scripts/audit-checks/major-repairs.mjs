import { parseListingText } from "../../src/core/parser/listing-parser.ts";
import { assessRepairHistory } from "../../src/core/rules/repair-history.ts";

const text = `Tehdyt remontit
Lukitus uusittu 2018
Postilaatikot vaihdettu 2019
Pihavalaistus uusittu 2020
Porraskäytävän maalaustyöt tehty 2021
Parvekeovet vaihdettu 2022`;
const assessment = assessRepairHistory({ renovations: parseListingText(text).renovations, constructionYear: 1970, documentKinds: ["listing"] });
if (assessment.title !== "Suurten peruskorjausten tilanne tarkistettava") throw new Error(`Odottamaton tulkinta: ${assessment.title}`);

const visible = assessment.relevantSystems.map((item) => item.label.toLocaleLowerCase("fi")).join(" ");
const required = ["lvis", "julkisiv", "parvek", "vesikat", "salaoj", "perust", "lämmitys", "ilmanvaihto"];
const missing = required.filter((term) => !visible.includes(term));
if (missing.length) throw new Error(`Tarkistuslistalta puuttuvat kokonaisuudet: ${missing.join(", ")}`);

if (/varmasti tekemättä|korjausvelka|on tulossa|pitää tehdä/i.test(`${assessment.title} ${assessment.message}`)) throw new Error("Käyttöliittymän muotoilu on liian ehdoton");
