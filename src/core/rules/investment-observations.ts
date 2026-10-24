import {
  NET_RENTAL_YIELD_THRESHOLDS,
  classifyNetRentalYield,
} from "../analysis/net-rental-yield.ts";
import { formatFinnishNumber } from "../parser/normalization.ts";
import type { RepairHistoryAssessment } from "./repair-history.ts";

export type InvestmentObservation = {
  id: string;
  category:
    | "cashFlow"
    | "yield"
    | "financing"
    | "housingCompany"
    | "apartmentCondition"
    | "renovation"
    | "rentalDemand"
    | "exit"
    | "dataCompleteness";
  type: "strength" | "risk" | "notice" | "missingData";
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  value?: number;
  unit?: string;
};

export type ObservationInput = {
  cashFlowAfterLoan?: number;
  netYield?: number;
  leverageRatio?: number;
  annualInterestRate?: number;
  rentalDemand?: number;
  vacancyMonths: number;
  collateralShortfall?: number;
  financingGap?: number;
  repairRiskScore?: number;
  repairHistoryKnown: boolean;
  repairHistory?: RepairHistoryAssessment;
  landOwnership?: string;
  landLeaseEndDate?: string;
  landRentAnnual?: number;
  plotFeeMonthly?: number;
  verifiedLandLeaseNonRenewal?: boolean;
  documentedLandRentIncrease?: boolean;
  landRentIncreaseDescription?: string;
  heatingType?: string;
  heatingCostResponsibility?: "tenant" | "landlord" | "included" | "unknown";
  locationRisk?: number;
  resaleLiquidity?: number;
  loanKnown: boolean;
  visualConditionConfirmed?: boolean;
  visualConditionConfidence?: "high" | "medium" | "low" | "unknown";
  visualConditionRating?:
    | "excellent"
    | "good"
    | "fair"
    | "poor"
    | "very_poor"
    | "unknown";
};

export function evaluateInvestmentObservations(
  input: ObservationInput,
): InvestmentObservation[] {
  const findings: InvestmentObservation[] = [];
  const add = (finding: InvestmentObservation) => findings.push(finding);
  if (!input.loanKnown)
    add({
      id: "missing-bank-loan",
      category: "dataCompleteness",
      type: "missingData",
      severity: "high",
      title: "Pankkilainan tiedot puuttuvat",
      description:
        "Kassavirtaa pankkilainan jälkeen ei voida laskea ja arvio on alustava.",
    });
  if (!input.repairHistoryKnown && !input.repairHistory)
    add({
      id: "missing-repair-history",
      category: "dataCompleteness",
      type: "missingData",
      severity: "medium",
      title: "Korjaushistoria tarkistettava",
      description:
        "Taloyhtiön korjaushistoria kannattaa varmistaa taloyhtiöltä tai isännöitsijältä.",
    });

  const repairs = input.repairHistory?.repairs ?? [];
  const reliableCompletedMajor = repairs.filter(
    (repair) =>
      repair.scale === "major" &&
      ["completed", "ongoing"].includes(repair.status) &&
      (repair.verifiedByDocuments || repair.source === "document" || repair.source === "user"),
  );
  const listingOnlyCompletedMajor = repairs.filter(
    (repair) =>
      repair.scale === "major" &&
      ["completed", "ongoing"].includes(repair.status) &&
      !reliableCompletedMajor.includes(repair),
  );
  if (reliableCompletedMajor.length) {
    const titles = [...new Set(reliableCompletedMajor.map((repair) => repair.title))].slice(0, 3);
    add({
      id: "documented-major-renovations",
      category: "renovation",
      type: "strength",
      severity: "info",
      title: "Merkittäviä korjauksia on tehty",
      description: `Taloyhtiössä on lähdetietojen perusteella tehty merkittäviä korjauksia (${titles.join(", ")}). Tämä pienentää kyseisiin rakenteisiin liittyvää korjausriskiä, mutta ei poista muiden korjausten tarvetta.`,
    });
  } else if (listingOnlyCompletedMajor.length) {
    add({
      id: "listing-major-renovations-check",
      category: "renovation",
      type: "missingData",
      severity: "medium",
      title: "Ilmoituksessa mainitut suuret korjaukset tarkistettava",
      description: "Myynti-ilmoituksessa mainitaan merkittäviä tehtyjä korjauksia, mutta niiden laajuutta ei ole vahvistettu taloyhtiöasiakirjoista.",
    });
  }

  const futureRepairs = repairs.filter(
    (repair) =>
      repair.scale === "major" &&
      ["decided", "planned", "estimated", "proposed", "under_investigation", "preparing"].includes(repair.status),
  );
  for (const repair of futureRepairs.slice(0, 3)) {
    const authoritative = repair.verifiedByDocuments || repair.source === "document" || repair.source === "user";
    const timing = repair.yearFrom && repair.yearTo
      ? ` vuosille ${repair.yearFrom}–${repair.yearTo}`
      : repair.year ? ` vuodelle ${repair.year}` : "";
    const status = repair.status === "decided"
      ? "päätetty"
      : repair.status === "planned" || repair.status === "estimated"
        ? "suunniteltu"
        : "mahdollinen tai valmistelussa";
    const confirmedDecision = repair.status === "decided" && authoritative;
    add({
      id: `future-renovation-${repair.id}`,
      category: "renovation",
      type: confirmedDecision || authoritative && ["planned", "estimated"].includes(repair.status) ? "risk" : "notice",
      severity: confirmedDecision ? "high" : "medium",
      title: confirmedDecision ? "Päätetty suuri korjaus" : "Tuleva suuri korjaus tarkistettava",
      description: `${repair.title} on ${authoritative ? "lähdetietojen perusteella" : "myynti-ilmoituksen mukaan"} ${status}${timing}. Huoneistokohtaista kustannusta ei ole saatavilla, joten varmista hankkeen päätös, aikataulu ja kustannus taloyhtiöltä.`,
    });
  }

  if (input.repairHistory?.relevantSystems.some((item) => item.system === "plumbing")) {
    add({
      id: "pipe-history-check",
      category: "renovation",
      type: "missingData",
      severity: "medium",
      title: "Putkistojen korjaushistoria tarkistettava",
      description: "Putkistojen kattavasta uusimisesta ei löytynyt riittävää tietoa. Tämä ei tarkoita, että putkiremontti olisi tekemättä; varmista järjestelmien tila taloyhtiöltä.",
    });
  }

  const landOwnership = input.landOwnership?.toLocaleLowerCase("fi");
  const leasedLand = landOwnership === "leased" || landOwnership === "optional_leasehold";
  if (landOwnership === "owned") {
    add({
      id: "owned-land",
      category: "housingCompany",
      type: "strength",
      severity: "info",
      title: "Oma tontti",
      description: "Taloyhtiö sijaitsee omalla tontilla, joten vuokratontin sopimus- ja korotusriskiä ei ole tunnistettu.",
    });
  }
  if (leasedLand) {
    const leaseYearMatch = input.landLeaseEndDate?.match(/(?:19|20)\d{2}/);
    const leaseYear = leaseYearMatch ? Number(leaseYearMatch[0]) : undefined;
    const yearsRemaining = leaseYear === undefined ? undefined : leaseYear - new Date().getFullYear();
    if (input.verifiedLandLeaseNonRenewal) {
      add({
        id: "verified-land-lease-non-renewal",
        category: "housingCompany",
        type: "risk",
        severity: "critical",
        title: "Tontin vuokrasopimuksen jatkumattomuus vahvistettu",
        description: "Lähdeaineiston perusteella tontin vuokrasopimusta ei jatketa. Arvioi vaikutus kohteen käyttöön, rahoitettavuuteen ja jälleenmyyntiin ennen päätöstä.",
      });
    } else if (yearsRemaining !== undefined && yearsRemaining <= 10) {
      add({
        id: "land-lease-expiry-soon",
        category: "housingCompany",
        type: "risk",
        severity: "high",
        title: "Tontin vuokrasopimus päättyy pian",
        description: `Tontin vuokrasopimus päättyy vuonna ${leaseYear}. Jatkosta ei ole vahvistettua tietoa, joten tarkista uusimisehdot ja taloudellinen vaikutus taloyhtiöltä.`,
      });
    } else if (yearsRemaining !== undefined && yearsRemaining <= 20) {
      add({
        id: "land-lease-expiry-check",
        category: "housingCompany",
        type: "notice",
        severity: "medium",
        title: "Tontin vuokrasopimuksen päättyminen lähestyy",
        description: `Tontin vuokrasopimus päättyy vuonna ${leaseYear}. Tarkista jatko- ja korotusehdot taloyhtiöltä.`,
      });
    } else if (leaseYear === undefined) {
      add({
        id: "missing-land-lease-end-date",
        category: "dataCompleteness",
        type: "missingData",
        severity: "medium",
        title: "Tontin vuokrasopimuksen päättymisaika puuttuu",
        description: "Vuokratontin sopimuksen päättymisaika ja jatkoehdot kannattaa varmistaa taloyhtiöltä.",
      });
    }
    if ((input.plotFeeMonthly ?? 0) > 0) {
      add({
        id: "current-plot-fee",
        category: "housingCompany",
        type: "notice",
        severity: "low",
        title: "Tonttivastike vaikuttaa kuukausikuluihin",
        description: `Nykyinen huoneistokohtainen tonttivastike on ${formatFinnishNumber(input.plotFeeMonthly!)} €/kk ja se sisältyy laskelman muihin kuukausikuluihin.`,
        value: input.plotFeeMonthly,
        unit: "€/kk",
      });
    }
    add({
      id: "land-rent-increase-terms-check",
      category: "housingCompany",
      type: "missingData",
      severity: "medium",
      title: "Tontinvuokran korotusehdot tarkistettava",
      description: input.landRentAnnual && input.landRentAnnual > 0
        ? `Taloyhtiön nykyinen tontin vuosivuokra on ${formatFinnishNumber(input.landRentAnnual)} €. Tulevan korotuksen huoneistokohtaista kuukausivaikutusta ei voida laskea ilman korotusehtoa ja jakoperustetta.`
        : "Tulevan tontinvuokran korotuksen huoneistokohtaista vaikutusta ei voida laskea ilman korotusehtoa ja jakoperustetta.",
    });
    if (input.documentedLandRentIncrease) {
      add({
        id: "documented-land-rent-increase",
        category: "housingCompany",
        type: "risk",
        severity: "high",
        title: "Maanvuokran merkittävä korotus",
        description: input.landRentIncreaseDescription?.trim()
          ? `Lähdeaineistossa on dokumentoitu maanvuokran korotus: ${input.landRentIncreaseDescription.trim()} Huoneistokohtainen vaikutus tulee varmistaa taloyhtiöltä.`
          : "Lähdeaineistossa on dokumentoitu merkittävä maanvuokran korotus. Huoneistokohtainen vaikutus tulee varmistaa taloyhtiöltä.",
      });
    }
  }
  if (input.heatingType?.toLocaleLowerCase("fi") === "electric") {
    if (input.heatingCostResponsibility === "tenant")
      add({
        id: "tenant-paid-electric-heating",
        category: "rentalDemand",
        type: "risk",
        severity: "medium",
        title: "Vuokralainen maksaa lämmityssähkön",
        description: "Asunnossa on sähkölämmitys, jonka vuokralainen maksaa erikseen. Huomioi vaikutus vuokralaisen kokonaisasumiskustannuksiin ja vuokrattavuuteen.",
      });
    else if (input.heatingCostResponsibility === "landlord")
      add({
        id: "landlord-paid-electric-heating-check",
        category: "dataCompleteness",
        type: "missingData",
        severity: "medium",
        title: "Lämmityssähkö sisällytettävä kuluihin",
        description: "Vuokranantaja vastaa sähkölämmityksen kustannuksesta. Varmista, että todellinen lämmityskulu sisältyy muihin kuukausikuluihin vain kerran.",
      });
    else if (!input.heatingCostResponsibility || input.heatingCostResponsibility === "unknown")
      add({
        id: "electric-heating-responsibility-check",
        category: "dataCompleteness",
        type: "missingData",
        severity: "medium",
        title: "Sähkölämmityksen kustannusvastuu tarkistettava",
        description: "Asunnossa on sähkölämmitys. Tarkista lämmityskustannusten maksaja ja vaikutus vuokralaisen kokonaisasumiskustannuksiin.",
      });
  }
  if (input.cashFlowAfterLoan !== undefined && input.cashFlowAfterLoan < 0)
    add({
      id: "negative-cash-flow-after-loan",
      category: "cashFlow",
      type: "risk",
      severity: "high",
      title: "Negatiivinen kassavirta",
      description:
        "Kohde jää pankkilainan jälkeen negatiiviselle kassavirralle.",
      value: input.cashFlowAfterLoan,
      unit: "€/kk",
    });
  else if (
    input.cashFlowAfterLoan !== undefined &&
    input.cashFlowAfterLoan < 100
  )
    add({
      id: "thin-cash-flow-buffer",
      category: "cashFlow",
      type: input.cashFlowAfterLoan > 0 ? "notice" : "risk",
      severity: "medium",
      title: "Pieni kassavirtapuskuri",
      description:
        input.cashFlowAfterLoan > 0
          ? "Kassavirta on lievästi positiivinen, mutta puskuri jää pieneksi."
          : "Kassavirta jää pankkilainan jälkeen nollaan.",
      value: input.cashFlowAfterLoan,
      unit: "€/kk",
    });
  else if (input.cashFlowAfterLoan !== undefined)
    add({
      id: "strong-positive-cash-flow",
      category: "cashFlow",
      type: "strength",
      severity: "info",
      title: "Vahva kassavirta",
      description:
        "Kaikkien kuukausikulujen ja pankkilainan jälkeen jää vähintään 100 euroa kassavirtaa.",
      value: input.cashFlowAfterLoan,
      unit: "€/kk",
    });
  const netYieldClassification =
    input.netYield === undefined
      ? undefined
      : classifyNetRentalYield(input.netYield);
  if (netYieldClassification === "Heikko")
    add({
      id: "low-net-yield",
      category: "yield",
      type: "risk",
      severity: "medium",
      title: "Heikko nettovuokratuotto",
      description: `Heikko nettovuokratuotto: tuotto jää alle ${NET_RENTAL_YIELD_THRESHOLDS.poor} prosentin.`,
      value: input.netYield,
      unit: "%",
    });
  else if (netYieldClassification === "Erittäin hyvä")
    add({
      id: "excellent-net-yield",
      category: "yield",
      type: "strength",
      severity: "info",
      title: "Erittäin hyvä nettovuokratuotto",
      description: `Erittäin hyvä nettovuokratuotto: tuotto on vähintään ${NET_RENTAL_YIELD_THRESHOLDS.excellent} prosenttia.`,
      value: input.netYield,
      unit: "%",
    });
  else if (netYieldClassification === "Hyvä")
    add({
      id: "good-net-yield",
      category: "yield",
      type: "strength",
      severity: "info",
      title: "Hyvä nettovuokratuotto",
      description: `Hyvä nettovuokratuotto: tuotto on vähintään ${NET_RENTAL_YIELD_THRESHOLDS.good} prosenttia.`,
      value: input.netYield,
      unit: "%",
    });
  if (input.leverageRatio !== undefined && input.leverageRatio > 0.8)
    add({
      id: "high-leverage",
      category: "financing",
      type: "risk",
      severity: "high",
      title: "Korkea velkavipu",
      description:
        "Pankki- ja yhtiölainat ylittävät 80 prosenttia kohteen oikaistusta hankintahinnasta.",
      value: input.leverageRatio * 100,
      unit: "%",
    });
  if (input.collateralShortfall !== undefined && input.collateralShortfall > 0)
    add({
      id: "collateral-shortfall",
      category: "financing",
      type: "risk",
      severity: "medium",
      title: "Tarvittava lisävakuus",
      description:
        "Lisävakuuden tarve suunnitellulle pankkilainalle. Voidaan kattaa muilla vakuuksilla tai pienentämällä lainaa omalla rahalla.",
      value: input.collateralShortfall,
      unit: "€",
    });
  if (input.financingGap !== undefined && input.financingGap > 0)
    add({
      id: "acquisition-financing-gap",
      category: "financing",
      type: "risk",
      severity: "high",
      title: "Puuttuva oma raha",
      description: `Hankinnan varainsiirtovero ja muut kulut tulee kattaa omalla rahalla. Ilmoitettu oma pääoma ei riitä kattamaan kaikkia hankinnan käteiskuluja. Puuttuva oma raha on ${formatFinnishNumber(input.financingGap, 1)} euroa.`,
      value: input.financingGap,
      unit: "€",
    });
  if ((input.annualInterestRate ?? 0) >= 6)
    add({
      id: "high-interest-rate",
      category: "financing",
      type: "risk",
      severity: "medium",
      title: "Korkoriski",
      description: "Kokonaiskorko on vähintään 6 prosenttia.",
      value: input.annualInterestRate,
      unit: "%",
    });
  if ((input.rentalDemand ?? 3) <= 2)
    add({
      id: "weak-rental-demand",
      category: "rentalDemand",
      type: "risk",
      severity: "medium",
      title: "Heikko vuokrakysyntä",
      description:
        "Käyttäjän arvioima vuokrakysyntä voi kasvattaa tyhjäkäyntiriskiä.",
      value: input.rentalDemand,
      unit: "/5",
    });
  if (input.vacancyMonths >= 3)
    add({
      id: "high-vacancy",
      category: "rentalDemand",
      type: "risk",
      severity: "medium",
      title: "Korkea tyhjäkäyntioletus",
      description:
        "Vähintään kolmen kuukauden vuotuinen tyhjäkäynti heikentää toteutuvaa vuokratuottoa.",
      value: input.vacancyMonths,
      unit: "kk/v",
    });
  if ((input.locationRisk ?? 3) >= 4)
    add({
      id: "location-risk",
      category: "exit",
      type: "risk",
      severity: "high",
      title: "Sijaintiriski",
      description:
        "Käyttäjän sijaintiarvio voi heikentää vuokrattavuutta ja jälleenmyyntiä.",
      value: input.locationRisk,
      unit: "/5",
    });
  if ((input.resaleLiquidity ?? 3) <= 2)
    add({
      id: "weak-resale-liquidity",
      category: "exit",
      type: "risk",
      severity: "medium",
      title: "Hidas jälleenmyytävyys",
      description: "Kohteen arvioitu jälleenmyyntiaika on tavallista pidempi.",
      value: input.resaleLiquidity,
      unit: "/5",
    });
  const visualUsable =
    input.visualConditionConfirmed &&
    (input.visualConditionConfidence === "high" ||
      input.visualConditionConfidence === "medium");
  if (
    visualUsable &&
    (input.visualConditionRating === "poor" ||
      input.visualConditionRating === "very_poor")
  )
    add({
      id: "visual-condition-risk",
      category: "apartmentCondition",
      type: "risk",
      severity: input.visualConditionRating === "very_poor" ? "high" : "medium",
      title: "Valokuvissa näkyvä korjaustarve",
      description:
        "Kuvahavainnoissa näkyy huoneiston pintoihin liittyvää korjaustarvetta. Arvio ei koske rakenteiden sisäistä kuntoa.",
    });
  else if (visualUsable && input.visualConditionRating === "fair")
    add({
      id: "visual-condition-notice",
      category: "apartmentCondition",
      type: "notice",
      severity: "low",
      title: "Kuvissa näkyviä kuntohuomioita",
      description:
        "Kuvahavainnoissa on pintojen kuntoon liittyviä huomioita, jotka on hyvä tarkistaa paikan päällä.",
    });
  else if (
    visualUsable &&
    (input.visualConditionRating === "good" ||
      input.visualConditionRating === "excellent")
  )
    add({
      id: "visual-condition-strength",
      category: "apartmentCondition",
      type: "strength",
      severity: "info",
      title: "Kuvissa siisti yleisilme",
      description:
        "Kuvissa näkyvät pinnat vaikuttavat pääosin siisteiltä. Havainto ei sulje pois kuvien ulkopuolisia tai piileviä vaurioita.",
    });
  const severityRank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;
  const typeRank = { risk: 0, notice: 1, strength: 2, missingData: 3 } as const;
  const topicRank = (finding: InvestmentObservation) =>
    finding.id.startsWith("future-renovation-") || finding.id === "verified-land-lease-non-renewal" || finding.id === "land-lease-expiry-soon" || finding.id === "documented-land-rent-increase"
      ? 0
      : ["cashFlow", "yield", "financing"].includes(finding.category) ? 1
        : finding.type === "strength" ? 2 : 3;
  const unique = findings.filter((finding, index) => {
    const identity = finding.description.toLocaleLowerCase("fi").replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim();
    return findings.findIndex((candidate) => candidate.description.toLocaleLowerCase("fi").replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim() === identity) === index;
  });
  return unique.sort((left, right) => topicRank(left) - topicRank(right) || typeRank[left.type] - typeRank[right.type] || severityRank[left.severity] - severityRank[right.severity]);
}
