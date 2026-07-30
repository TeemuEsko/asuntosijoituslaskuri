export type InvestmentObservation = {
  id: string;
  category: "cashFlow" | "yield" | "financing" | "housingCompany" | "apartmentCondition" | "renovation" | "rentalDemand" | "exit" | "dataCompleteness";
  type: "strength" | "risk" | "notice" | "missingData";
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  value?: number;
  unit?: string;
  scoreImpact: number;
};

export type ObservationInput = {
  cashFlowAfterLoan?: number;
  netYield?: number;
  leverageRatio?: number;
  annualInterestRate?: number;
  rentalDemand?: number;
  vacancyMonths: number;
  collateralShortfall?: number;
  repairRiskScore?: number;
  repairHistoryKnown: boolean;
  locationRisk?: number;
  resaleLiquidity?: number;
  loanKnown: boolean;
  visualConditionConfirmed?: boolean;
  visualConditionConfidence?: "high" | "medium" | "low" | "unknown";
  visualConditionRating?: "excellent" | "good" | "fair" | "poor" | "very_poor" | "unknown";
};

export function evaluateInvestmentObservations(input: ObservationInput): InvestmentObservation[] {
  const findings: InvestmentObservation[] = [];
  const add = (finding: InvestmentObservation) => findings.push(finding);
  if (!input.loanKnown) add({ id: "missing-bank-loan", category: "dataCompleteness", type: "missingData", severity: "high", title: "Pankkilainan tiedot puuttuvat", description: "Kassavirtaa pankkilainan jälkeen ei voida laskea ja arvio on alustava.", scoreImpact: 0 });
  if (!input.repairHistoryKnown) add({ id: "missing-repair-history", category: "dataCompleteness", type: "missingData", severity: "medium", title: "Korjaushistoria tarkistettava", description: "Taloyhtiön korjaushistoria on tarkistettava lähdeasiakirjoista.", scoreImpact: 0 });
  if (input.cashFlowAfterLoan !== undefined && input.cashFlowAfterLoan < 0) add({ id: "negative-cash-flow-after-loan", category: "cashFlow", type: "risk", severity: "high", title: "Negatiivinen kassavirta", description: "Kohde jää pankkilainan jälkeen negatiiviselle kassavirralle.", value: input.cashFlowAfterLoan, unit: "€/kk", scoreImpact: -12 });
  else if (input.cashFlowAfterLoan !== undefined && input.cashFlowAfterLoan < 100) add({ id: "thin-cash-flow-buffer", category: "cashFlow", type: input.cashFlowAfterLoan > 0 ? "notice" : "risk", severity: "medium", title: "Pieni kassavirtapuskuri", description: input.cashFlowAfterLoan > 0 ? "Kassavirta on lievästi positiivinen, mutta puskuri jää pieneksi." : "Kassavirta jää pankkilainan jälkeen nollaan.", value: input.cashFlowAfterLoan, unit: "€/kk", scoreImpact: -4 });
  else if (input.cashFlowAfterLoan !== undefined) add({ id: "strong-positive-cash-flow", category: "cashFlow", type: "strength", severity: "info", title: "Vahva kassavirta", description: "Kaikkien kuukausikulujen ja pankkilainan jälkeen jää vähintään 100 euroa kassavirtaa.", value: input.cashFlowAfterLoan, unit: "€/kk", scoreImpact: 8 });
  if (input.netYield !== undefined && input.netYield < 4.5) add({ id: "low-net-yield", category: "yield", type: "risk", severity: "medium", title: "Matala nettovuokratuotto", description: "Nettovuokratuotto jää alle 4,5 prosentin.", value: input.netYield, unit: "%", scoreImpact: -8 });
  else if (input.netYield !== undefined && input.netYield >= 6) add({ id: "strong-net-yield", category: "yield", type: "strength", severity: "info", title: "Vahva nettovuokratuotto", description: "Nettovuokratuotto on vähintään 6 prosenttia.", value: input.netYield, unit: "%", scoreImpact: 6 });
  if (input.leverageRatio !== undefined && input.leverageRatio > .8) add({ id: "high-leverage", category: "financing", type: "risk", severity: "high", title: "Korkea velkavipu", description: "Pankki- ja yhtiölainat ylittävät 80 prosenttia kohteen oikaistusta hankintahinnasta.", value: input.leverageRatio * 100, unit: "%", scoreImpact: -10 });
  if (input.collateralShortfall !== undefined && input.collateralShortfall > 0) add({ id: "collateral-shortfall", category: "financing", type: "risk", severity: "medium", title: "Vakuusvaje", description: "Pankkilaina ylittää kohteelle annetun vakuusarvon. Erotus vaatii omaa rahaa tai lisävakuutta.", value: input.collateralShortfall, unit: "€", scoreImpact: -6 });
  if ((input.annualInterestRate ?? 0) >= 6) add({ id: "high-interest-rate", category: "financing", type: "risk", severity: "medium", title: "Korkoriski", description: "Kokonaiskorko on vähintään 6 prosenttia.", value: input.annualInterestRate, unit: "%", scoreImpact: -5 });
  if ((input.rentalDemand ?? 3) <= 2) add({ id: "weak-rental-demand", category: "rentalDemand", type: "risk", severity: "medium", title: "Heikko vuokrakysyntä", description: "Käyttäjän arvioima vuokrakysyntä voi kasvattaa tyhjäkäyntiriskiä.", value: input.rentalDemand, unit: "/5", scoreImpact: -7 });
  if (input.vacancyMonths >= 3) add({ id: "high-vacancy", category: "rentalDemand", type: "risk", severity: "medium", title: "Korkea tyhjäkäyntioletus", description: "Vähintään kolmen kuukauden vuotuinen tyhjäkäynti heikentää toteutuvaa vuokratuottoa.", value: input.vacancyMonths, unit: "kk/v", scoreImpact: -6 });
  if ((input.locationRisk ?? 3) >= 4) add({ id: "location-risk", category: "exit", type: "risk", severity: "high", title: "Sijaintiriski", description: "Käyttäjän sijaintiarvio voi heikentää vuokrattavuutta ja jälleenmyyntiä.", value: input.locationRisk, unit: "/5", scoreImpact: -8 });
  if ((input.resaleLiquidity ?? 3) <= 2) add({ id: "weak-resale-liquidity", category: "exit", type: "risk", severity: "medium", title: "Hidas jälleenmyytävyys", description: "Kohteen arvioitu jälleenmyyntiaika on tavallista pidempi.", value: input.resaleLiquidity, unit: "/5", scoreImpact: -6 });
  const visualUsable = input.visualConditionConfirmed && (input.visualConditionConfidence === "high" || input.visualConditionConfidence === "medium");
  if (visualUsable && (input.visualConditionRating === "poor" || input.visualConditionRating === "very_poor")) add({ id: "visual-condition-risk", category: "apartmentCondition", type: "risk", severity: input.visualConditionRating === "very_poor" ? "high" : "medium", title: "Valokuvissa näkyvä korjaustarve", description: "Kuvahavainnoissa näkyy huoneiston pintoihin liittyvää korjaustarvetta. Arvio ei koske rakenteiden sisäistä kuntoa.", scoreImpact: 0 });
  else if (visualUsable && input.visualConditionRating === "fair") add({ id: "visual-condition-notice", category: "apartmentCondition", type: "notice", severity: "low", title: "Kuvissa näkyviä kuntohuomioita", description: "Kuvahavainnoissa on pintojen kuntoon liittyviä huomioita, jotka on hyvä tarkistaa paikan päällä.", scoreImpact: 0 });
  else if (visualUsable && (input.visualConditionRating === "good" || input.visualConditionRating === "excellent")) add({ id: "visual-condition-strength", category: "apartmentCondition", type: "strength", severity: "info", title: "Kuvissa siisti yleisilme", description: "Kuvissa näkyvät pinnat vaikuttavat pääosin siisteiltä. Havainto ei sulje pois kuvien ulkopuolisia tai piileviä vaurioita.", scoreImpact: 0 });
  return findings;
}
