import type { ConfidenceLevel, RenovationComponent, RenovationFinding } from "../parser/listing-parser";

export type RepairScale = "maintenance" | "partial" | "major" | "study";
export type RepairHistoryStatus = "major_recognized" | "partial_recognized" | "major_status_check" | "history_incomplete" | "insufficient_information";
export type RepairDocumentKind = "listing" | "manager_certificate" | "maintenance_plan" | "financial_statements" | "annual_report" | "meeting_minutes" | "shareholder_register";
export type MajorRepairSystem = "plumbing" | "facade_balconies" | "roof" | "drainage_foundations" | "heating" | "ventilation" | "elevators" | "yard_structures" | "energy";

export type ClassifiedRepair = RenovationFinding & { scale: RepairScale; system?: MajorRepairSystem; classificationReason: string };
export type RepairHistoryAssessment = {
  status: RepairHistoryStatus;
  severity: "info" | "low" | "medium";
  confidence: ConfidenceLevel;
  title: string;
  message: string;
  sourceLimitation?: string;
  technicalRiskScore: number;
  strengths: string[];
  risks: string[];
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
  pipe_unspecified: "plumbing", line_unspecified: "plumbing", full_line: "plumbing", water_pipes: "plumbing", plot_water_line: "plumbing", drains: "plumbing", drain_lining: "plumbing", electrical: "plumbing", bathrooms: "plumbing", telecom: "plumbing", fiber_connection: "plumbing",
  facade: "facade_balconies", facade_painting: "facade_balconies", balconies: "facade_balconies", element_seams: "facade_balconies", windows: "facade_balconies", doors: "facade_balconies", exterior_doors: "facade_balconies",
  roof_replacement: "roof", roof_coating: "roof", roof_unspecified: "roof",
  drainage: "drainage_foundations", foundations: "drainage_foundations",
  heating: "heating", heating_exchanger: "heating", ventilation: "ventilation", elevator: "elevators", yard_deck: "yard_structures", yard: "yard_structures", energy_project: "energy",
};

const maintenanceComponents = new Set<RenovationComponent>(["locks", "entry_phone", "mailboxes", "yard_lighting", "painting", "facade_painting", "fire_safety", "fiber_connection"]);
const partialComponents = new Set<RenovationComponent>(["water_pipes", "plot_water_line", "drain_lining", "element_seams", "roof_coating", "heating_exchanger"]);
const studyPattern = /kuntotutkimus|kuntoarvio|kuvaus|kartoitus|hankesuunnittelu|korjaussuunnitelma|kilpailutus|kustannusarvio/i;
const broadPattern = /täydellinen|laaja|kokonais|peruskorjaus|saneeraus|uusittu|uusiminen/i;
const partialPattern = /osittai|paikalli|yksittäi|huolto|puhdist|säätö|pinnoit|sukit/i;

export function classifyRepair(repair: RenovationFinding): ClassifiedRepair {
  const text = repair.sourceExcerpt;
  const system = systemByComponent[repair.component];
  if (studyPattern.test(text) || ["investigated", "preparing", "under_investigation", "not_implemented"].includes(repair.status)) return { ...repair, scale: "study", system, classificationReason: "Tutkimus tai valmistelu ei ole toteutettu korjaus" };
  if (maintenanceComponents.has(repair.component)) return { ...repair, scale: "maintenance", system, classificationReason: "Rajattu ylläpito- tai kunnossapitotyö" };
  if (partialComponents.has(repair.component)) return { ...repair, scale: "partial", system, classificationReason: "Osakorjaus ei osoita koko järjestelmän uusimista" };
  if (repair.component === "doors" || repair.component === "exterior_doors" || repair.component === "windows" || repair.component === "balconies") {
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
  const futureMajor = repairs.filter((repair) => ["decided", "planned", "estimated", "proposed", "under_investigation", "preparing"].includes(repair.status) && repair.scale === "major");
  const authoritativeCount = new Set(documents.filter((kind) => kind !== "listing")).size;
  const olderBuilding = typeof input.constructionYear === "number" && new Date().getFullYear() - input.constructionYear >= 35;
  const listingOnly = repairs.length ? repairs.every((repair) => repair.source === "listing" && !repair.verifiedByDocuments) : documents.every((kind) => kind === "listing");
  const sourceLimitation = listingOnly ? repairs.length ? "Remonttihistoria löytyi myynti-ilmoituksesta, mutta sitä ei ole vielä vahvistettu taloyhtiön asiakirjoista." : "Myynti-ilmoituksesta ei löytynyt riittävää remonttihistoriaa. Tarkista tiedot taloyhtiön asiakirjoista." : undefined;
  const foundSystems = new Set(major.map((repair) => repair.system).filter((system): system is MajorRepairSystem => Boolean(system)));
  const candidates: MajorRepairSystem[] = ["plumbing", "facade_balconies", "roof", "drainage_foundations", "heating", "ventilation"];
  if (input.buildingType?.toLocaleLowerCase("fi").includes("hissi") || repairs.some((repair) => repair.component === "elevator")) candidates.push("elevators");
  if (repairs.some((repair) => repair.component === "yard_deck")) candidates.push("yard_structures");
  const relevantSystems = candidates.filter((system) => !foundSystems.has(system)).map((system) => ({ system, label: systemLabels[system], reason: partial.some((repair) => repair.system === system) ? "Osittainen korjaus tunnistettiin, mutta kokonaisuuden tila jäi epäselväksi." : "Toteutumisesta ei löytynyt tietoa." }));
  const confidence: ConfidenceLevel = repairs.some((repair) => repair.verifiedByDocuments || repair.source === "document") || authoritativeCount >= 2 ? "high" : repairs.some((repair) => repair.confidence === "medium") || authoritativeCount === 1 ? "medium" : "low";
  const sourcePhrase = (repair: ClassifiedRepair) => repair.verifiedByDocuments || repair.source === "document" ? "taloyhtiön asiakirjan mukaan" : "ilmoituksen mukaan";
  const strengths = implemented.flatMap((repair) => repair.component === "water_pipes" ? [`Käyttövesiputket on ${sourcePhrase(repair)} uusittu.${repair.verifiedByDocuments ? "" : " Vahvista työn laajuus taloyhtiön asiakirjoista."}`] : repair.component === "drain_lining" ? [`Viemärit on ${sourcePhrase(repair)} sukitettu. Sukitus on osakorjaus, joten varmista muun viemärijärjestelmän tila asiakirjoista.`] : []);
  const risks = futureMajor.map((repair) => { const statusText = repair.status === "decided" ? "päätetty toteuttaa" : repair.status === "proposed" ? "ehdotettu" : repair.status === "preparing" || repair.status === "under_investigation" ? "valmistelussa" : "suunnitteilla"; const timing = repair.yearFrom && repair.yearTo ? ` vuosille ${repair.yearFrom}–${repair.yearTo}` : repair.year ? ` vuodelle ${repair.year}` : ""; return `${repair.component.startsWith("roof_") ? "Kattoremontti" : repair.title} on ${sourcePhrase(repair)} ${statusText}${timing}. Vahvista päätös, aikataulu ja kustannus taloyhtiön asiakirjoista.`; });
  const evidenceWeight = (repair: ClassifiedRepair) => repair.verifiedByDocuments || repair.source === "document" ? 1 : repair.confidence === "medium" ? 0.65 : 0.35;
  const implementedBenefit = implemented.reduce((sum, repair) => sum + (repair.scale === "major" ? 14 : repair.scale === "partial" ? 6 : repair.scale === "maintenance" ? 1 : 0) * evidenceWeight(repair), 0);
  const currentYear = new Date().getFullYear();
  const futurePenalty = futureMajor.reduce((sum, repair) => { const statusWeight = repair.status === "decided" ? 18 : repair.status === "planned" || repair.status === "estimated" ? 14 : 9; const nearTerm = repair.yearFrom !== null && repair.yearFrom <= currentYear + 5 ? 3 : 0; return sum + (statusWeight + nearTerm) * evidenceWeight(repair); }, 0);
  const technicalRiskScore = Math.max(20, Math.min(90, 50 + Math.min(25, implementedBenefit) - Math.min(30, futurePenalty)));
  const common = { sourceLimitation, technicalRiskScore, strengths: [...new Set(strengths)], risks: [...new Set(risks)], repairs, relevantSystems };

  if (major.length) return { status: "major_recognized", severity: futureMajor.length ? "medium" : "info", confidence, title: "Suuria peruskorjauksia tunnistettu", message: "Lähdeaineistosta tunnistettiin yksi tai useampi laaja peruskorjaus. Tarkista silti korjausten tarkka laajuus ja mitä rakennusosia ne sisälsivät.", ...common };
  if (partial.length) return { status: "partial_recognized", severity: olderBuilding || futureMajor.length ? "medium" : "low", confidence, title: olderBuilding || futureMajor.length ? "Suurten peruskorjausten tilanne tarkistettava" : "Osittaisia korjauksia tunnistettu", message: olderBuilding ? "Rakennuksen iän ja puutteellisen korjaushistorian vuoksi suurten peruskorjausten tilanne kannattaa selvittää ennen ostopäätöstä." : "Osittainen korjaus on tehty, mutta koko rakennusosan korjaustilanne jäi epäselväksi.", ...common };
  if (maintenance.length >= 3 || futureMajor.length) return { status: "major_status_check", severity: olderBuilding || futureMajor.length ? "medium" : "low", confidence, title: "Suurten peruskorjausten tilanne tarkistettava", message: futureMajor.length ? "Ilmoituksessa on mainittu suunnitteilla oleva suuri korjaus. Vahvista hankkeen päätös, aikataulu, laajuus ja kustannus taloyhtiön asiakirjoista." : "Korjaushistoriassa on mainittu pääasiassa pieniä ylläpito- ja osakorjauksia. Tarkista erikseen suurten rakennusosien korjaustilanne.", ...common };
  if (olderBuilding) return { status: "major_status_check", severity: "medium", confidence, title: "Suurten peruskorjausten tilanne tarkistettava", message: "Rakennuksen iän ja puutteellisen korjaushistorian vuoksi suurten peruskorjausten tilanne kannattaa selvittää ennen ostopäätöstä.", ...common };
  if (repairs.length || authoritativeCount > 0) return { status: "history_incomplete", severity: olderBuilding ? "medium" : "low", confidence, title: "Korjaushistoria puutteellinen", message: "Suurten peruskorjausten toteutumisesta ei löytynyt riittävästi tietoa. Asia kannattaa tarkistaa lähdeasiakirjoista.", ...common };
  return { status: "insufficient_information", severity: "info", confidence, title: "Ei riittävästi tietoa", message: "Myynti-ilmoitus ei anna riittävästi tietoa taloyhtiön korjaushistoriasta.", ...common };
}
