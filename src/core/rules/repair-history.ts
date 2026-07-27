import type { ConfidenceLevel, RenovationComponent, RenovationFinding } from "../parser/listing-parser";

export type RepairScale = "maintenance" | "partial" | "major" | "study";
export type RepairHistoryStatus = "major_recognized" | "partial_recognized" | "major_status_check" | "history_incomplete" | "insufficient_information";
export type RepairDocumentKind = "listing" | "manager_certificate" | "maintenance_plan" | "financial_statements" | "annual_report" | "meeting_minutes";
export type MajorRepairSystem = "plumbing" | "facade_balconies" | "roof" | "drainage_foundations" | "heating" | "ventilation" | "elevators" | "yard_structures" | "energy";

export type ClassifiedRepair = RenovationFinding & { scale: RepairScale; system?: MajorRepairSystem; classificationReason: string };
export type RepairHistoryAssessment = {
  status: RepairHistoryStatus;
  severity: "info" | "low" | "medium";
  confidence: ConfidenceLevel;
  title: string;
  message: string;
  sourceLimitation?: string;
  repairs: ClassifiedRepair[];
  relevantSystems: Array<{ system: MajorRepairSystem; label: string; reason: string }>;
};

const systemLabels: Record<MajorRepairSystem, string> = {
  plumbing: "LVIS-järjestelmät ja putkistot",
  facade_balconies: "Julkisivut ja parvekkeet",
  roof: "Vesikatto ja yläpohja",
  drainage_foundations: "Salaojat, kuivatus ja perustukset",
  heating: "Lämmitysjärjestelmä",
  ventilation: "Ilmanvaihto",
  elevators: "Hissit",
  yard_structures: "Pihakannet ja rakenteelliset piha-alueet",
  energy: "Laajat energiatehokkuushankkeet",
};

const systemByComponent: Partial<Record<RenovationComponent, MajorRepairSystem>> = {
  pipe_unspecified: "plumbing", line_unspecified: "plumbing", full_line: "plumbing", water_pipes: "plumbing", drains: "plumbing", drain_lining: "plumbing", electrical: "plumbing", bathrooms: "plumbing", telecom: "plumbing",
  facade: "facade_balconies", balconies: "facade_balconies", element_seams: "facade_balconies", windows: "facade_balconies", doors: "facade_balconies",
  roof_replacement: "roof", roof_coating: "roof", roof_unspecified: "roof",
  drainage: "drainage_foundations", foundations: "drainage_foundations",
  heating: "heating", heating_exchanger: "heating", ventilation: "ventilation", elevator: "elevators", yard_deck: "yard_structures", yard: "yard_structures", energy_project: "energy",
};

const maintenanceComponents = new Set<RenovationComponent>(["locks", "entry_phone", "mailboxes", "yard_lighting", "painting", "fire_safety"]);
const partialComponents = new Set<RenovationComponent>(["water_pipes", "drain_lining", "element_seams", "roof_coating", "heating_exchanger"]);
const studyPattern = /kuntotutkimus|kuntoarvio|kuvaus|kartoitus|hankesuunnittelu|korjaussuunnitelma|kilpailutus|kustannusarvio/i;
const broadPattern = /täydellinen|laaja|kokonais|peruskorjaus|saneeraus|uusittu|uusiminen/i;
const partialPattern = /osittai|paikalli|yksittäi|huolto|puhdist|säätö|pinnoit|sukit/i;

export function classifyRepair(repair: RenovationFinding): ClassifiedRepair {
  const text = repair.sourceExcerpt;
  const system = systemByComponent[repair.component];
  if (studyPattern.test(text) || ["investigated", "preparing", "under_investigation", "not_implemented"].includes(repair.status)) return { ...repair, scale: "study", system, classificationReason: "Tutkimus tai valmistelu ei ole toteutettu korjaus" };
  if (maintenanceComponents.has(repair.component)) return { ...repair, scale: "maintenance", system, classificationReason: "Rajattu ylläpito- tai kunnossapitotyö" };
  if (partialComponents.has(repair.component)) return { ...repair, scale: "partial", system, classificationReason: "Osakorjaus ei osoita koko järjestelmän uusimista" };
  if (repair.component === "doors" || repair.component === "windows" || repair.component === "balconies") {
    const scale = /laaja|kaikki|kokonais|saneeraus|rakente/.test(text) ? "major" : partialPattern.test(text) || /parvekeov/.test(text) ? "partial" : "partial";
    return { ...repair, scale, system, classificationReason: scale === "major" ? "Laaja rakennusosakokonaisuus" : "Rajattu rakennusosan korjaus" };
  }
  if (repair.component === "facade" || repair.component === "roof_unspecified" || repair.component === "drains" || repair.component === "drainage" || repair.component === "elevator" || repair.component === "ventilation" || repair.component === "heating" || repair.component === "yard" || repair.component === "yard_deck") {
    const scale = broadPattern.test(text) && !partialPattern.test(text) ? "major" : "partial";
    return { ...repair, scale, system, classificationReason: scale === "major" ? "Lähde kuvaa laajaa uusimista tai saneerausta" : "Korjauksen laajuus ei osoita täydellistä peruskorjausta" };
  }
  if (["full_line", "line_unspecified", "roof_replacement", "foundations", "energy_project"].includes(repair.component)) return { ...repair, scale: "major", system, classificationReason: "Tunnistettu laaja peruskorjauskokonaisuus" };
  if (repair.component === "electrical" && broadPattern.test(text)) return { ...repair, scale: "major", system, classificationReason: "Sähköjärjestelmän laaja uusiminen" };
  return { ...repair, scale: "partial", system, classificationReason: "Laajuus jäi osittaiseksi tai epäselväksi" };
}

export function assessRepairHistory(input: { renovations: RenovationFinding[]; constructionYear?: number; documentKinds?: RepairDocumentKind[]; buildingType?: string }): RepairHistoryAssessment {
  const documents = input.documentKinds?.length ? input.documentKinds : ["listing"];
  const repairs = input.renovations.map(classifyRepair);
  const implemented = repairs.filter((repair) => ["completed", "ongoing"].includes(repair.status));
  const major = implemented.filter((repair) => repair.scale === "major");
  const partial = implemented.filter((repair) => repair.scale === "partial");
  const maintenance = implemented.filter((repair) => repair.scale === "maintenance");
  const authoritativeCount = new Set(documents.filter((kind) => kind !== "listing")).size;
  const olderBuilding = typeof input.constructionYear === "number" && new Date().getFullYear() - input.constructionYear >= 35;
  const sourceLimitation = documents.every((kind) => kind === "listing") ? "Arvio perustuu myynti-ilmoituksen tietoihin. Kaikkia tehtyjä tai suunniteltuja korjauksia ei välttämättä ole ilmoituksessa mainittu." : undefined;
  const foundSystems = new Set(major.map((repair) => repair.system).filter((system): system is MajorRepairSystem => Boolean(system)));
  const candidates: MajorRepairSystem[] = ["plumbing", "facade_balconies", "roof", "drainage_foundations", "heating", "ventilation"];
  if (input.buildingType?.toLocaleLowerCase("fi").includes("hissi") || repairs.some((repair) => repair.component === "elevator")) candidates.push("elevators");
  if (repairs.some((repair) => repair.component === "yard_deck")) candidates.push("yard_structures");
  const relevantSystems = candidates.filter((system) => !foundSystems.has(system)).map((system) => ({ system, label: systemLabels[system], reason: partial.some((repair) => repair.system === system) ? "Osittainen korjaus tunnistettiin, mutta kokonaisuuden tila jäi epäselväksi." : "Toteutumisesta ei löytynyt tietoa." }));
  const confidence: ConfidenceLevel = authoritativeCount >= 2 ? "high" : authoritativeCount === 1 ? "medium" : "low";

  if (major.length) return { status: "major_recognized", severity: "info", confidence, title: "Suuria peruskorjauksia tunnistettu", message: "Lähdeaineistosta tunnistettiin yksi tai useampi laaja peruskorjaus. Tarkista silti korjausten tarkka laajuus ja mitä rakennusosia ne sisälsivät.", sourceLimitation, repairs, relevantSystems };
  if (partial.length) return { status: "partial_recognized", severity: olderBuilding ? "medium" : "low", confidence, title: olderBuilding ? "Suurten peruskorjausten tilanne tarkistettava" : "Osittaisia korjauksia tunnistettu", message: olderBuilding ? "Rakennuksen iän ja puutteellisen korjaushistorian vuoksi suurten peruskorjausten tilanne kannattaa selvittää ennen ostopäätöstä." : "Osittainen korjaus on tehty, mutta koko rakennusosan korjaustilanne jäi epäselväksi.", sourceLimitation, repairs, relevantSystems };
  if (maintenance.length >= 3) return { status: "major_status_check", severity: olderBuilding ? "medium" : "low", confidence, title: "Suurten peruskorjausten tilanne tarkistettava", message: "Korjaushistoriassa on mainittu pääasiassa pieniä ylläpito- ja osakorjauksia. Tarkista erikseen suurten rakennusosien korjaustilanne.", sourceLimitation, repairs, relevantSystems };
  if (olderBuilding) return { status: "major_status_check", severity: "medium", confidence, title: "Suurten peruskorjausten tilanne tarkistettava", message: "Rakennuksen iän ja puutteellisen korjaushistorian vuoksi suurten peruskorjausten tilanne kannattaa selvittää ennen ostopäätöstä.", sourceLimitation, repairs, relevantSystems };
  if (repairs.length || authoritativeCount > 0) return { status: "history_incomplete", severity: olderBuilding ? "medium" : "low", confidence, title: "Korjaushistoria puutteellinen", message: "Suurten peruskorjausten toteutumisesta ei löytynyt riittävästi tietoa. Asia kannattaa tarkistaa lähdeasiakirjoista.", sourceLimitation, repairs, relevantSystems };
  return { status: "insufficient_information", severity: "info", confidence, title: "Ei riittävästi tietoa", message: "Myynti-ilmoitus ei anna riittävästi tietoa taloyhtiön korjaushistoriasta.", sourceLimitation, repairs, relevantSystems };
}
