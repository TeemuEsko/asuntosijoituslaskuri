export type MarketAssessmentValue = 1 | 2 | 3 | 4 | 5;
export type AssessmentConfidence = "high" | "medium" | "low" | "unknown";
export type AssessmentSource = "automatic" | "user" | "unknown";
export type AssessmentFactorImpact = "positive" | "negative" | "neutral";
export type AssessmentFactorSource = "listing" | "statistics" | "portal" | "unknown";

export type AssessmentFactor = {
  id: string;
  label: string;
  impact: AssessmentFactorImpact;
  description: string;
  source: AssessmentFactorSource;
};

export type EstimatedChoice<T> = {
  automaticValue: T | null;
  effectiveValue: T | null;
  source: AssessmentSource;
  sourceName: string;
  confidence: AssessmentConfidence;
  factors: AssessmentFactor[];
  userOverridden: boolean;
  generatedAt: string | null;
};

export type MarketAssessmentSet = {
  rentalDemand: EstimatedChoice<MarketAssessmentValue>;
  locationRisk: EstimatedChoice<MarketAssessmentValue>;
  resaleLiquidity: EstimatedChoice<MarketAssessmentValue>;
};

export type OfficialAreaSignals = {
  populationChangePercent?: number;
  netMigrationRate?: number;
  employmentRate?: number;
  unemploymentRate?: number;
  workplaceSelfSufficiency?: number;
  employerConcentration?: "low" | "medium" | "high";
  urbanisation?: "urban" | "semi_urban" | "rural";
  transactionVolumeTrendPercent?: number;
  realisedTransactions?: number;
};

/**
 * Portaalisignaalit ovat valinnainen adaptaatioraja. Ne kuvaavat ilmoitusmarkkinaa,
 * eivät toteutuneita kauppoja, eikä resolveri itse hae tai skreippaa dataa.
 */
export type PortalMarketSignals = {
  sourceName: string;
  permitted: boolean;
  comparableRentalListings?: number;
  estimatedRentalListingDays?: number;
  comparableSaleListings?: number;
  estimatedSaleListingDays?: number;
  housingCompanyListingHistoryCount?: number;
  fetchedAt?: string;
};

export type MarketAssessmentInput = {
  city?: string;
  district?: string;
  postalCode?: string;
  roomDescription?: string;
  areaSqm?: number;
  buildingType?: string;
  constructionYear?: number;
  elevator?: boolean;
  floor?: number;
  landOwnership?: string;
  apartmentCount?: number;
  statisticalRentAvailable?: boolean;
  official?: OfficialAreaSignals;
  portal?: PortalMarketSignals;
  generatedAt?: string;
};

const clampValue = (value: number): MarketAssessmentValue =>
  Math.max(1, Math.min(5, Math.round(value))) as MarketAssessmentValue;

const generatedAt = (input: MarketAssessmentInput) =>
  input.generatedAt ?? new Date().toISOString();

const roomCount = (description?: string): number | undefined => {
  const value = Number(description?.match(/^\s*(\d+)/)?.[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

const usablePortal = (input: MarketAssessmentInput) =>
  input.portal?.permitted ? input.portal : undefined;

function confidence(signalCount: number, hasCurrentMarketSignal: boolean): AssessmentConfidence {
  if (signalCount >= 5 && hasCurrentMarketSignal) return "high";
  if (signalCount >= 3) return "medium";
  if (signalCount > 0) return "low";
  return "unknown";
}

function automaticChoice(
  value: number,
  factors: AssessmentFactor[],
  input: MarketAssessmentInput,
  sourceName: string,
  confidenceLevel: AssessmentConfidence,
): EstimatedChoice<MarketAssessmentValue> {
  const automaticValue = clampValue(value);
  return {
    automaticValue,
    effectiveValue: automaticValue,
    source: "automatic",
    sourceName,
    confidence: confidenceLevel,
    factors,
    userOverridden: false,
    generatedAt: generatedAt(input),
  };
}

export function resolveLocationRisk(
  input: MarketAssessmentInput,
): EstimatedChoice<MarketAssessmentValue> {
  const factors: AssessmentFactor[] = [];
  let value = 3;
  let signals = 0;
  const official = input.official;

  if (official?.populationChangePercent !== undefined) {
    signals += 1;
    const change = official.populationChangePercent;
    if (change >= 1) value -= 1;
    if (change <= -1) value += 1;
    factors.push({
      id: "population-change",
      label: "Väestökehitys",
      impact: change >= 1 ? "positive" : change <= -1 ? "negative" : "neutral",
      description: `Virallisen tilaston väestömuutos on ${change.toLocaleString("fi-FI", { maximumFractionDigits: 1 })} %.`,
      source: "statistics",
    });
  }
  if (official?.netMigrationRate !== undefined) {
    signals += 1;
    if (official.netMigrationRate > 0) value -= 0.5;
    if (official.netMigrationRate < 0) value += 0.5;
    factors.push({
      id: "net-migration",
      label: "Muuttoliike",
      impact: official.netMigrationRate > 0 ? "positive" : official.netMigrationRate < 0 ? "negative" : "neutral",
      description: "Nettomuutto huomioidaan sijaintiriskin suuntaa-antavana alueellisena signaalina.",
      source: "statistics",
    });
  }
  if (official?.employmentRate !== undefined || official?.unemploymentRate !== undefined) {
    signals += 1;
    const weak = (official.employmentRate ?? 100) < 65 || (official.unemploymentRate ?? 0) > 12;
    const strong = (official.employmentRate ?? 0) >= 72 && (official.unemploymentRate ?? 100) < 8;
    if (weak) value += 1;
    if (strong) value -= 1;
    factors.push({
      id: "employment",
      label: "Työllisyys",
      impact: strong ? "positive" : weak ? "negative" : "neutral",
      description: "Työllisyys- ja työttömyysaste kuvaavat alueen taloudellista vakautta.",
      source: "statistics",
    });
  }
  if (official?.employerConcentration) {
    signals += 1;
    if (official.employerConcentration === "high") value += 1;
    if (official.employerConcentration === "low") value -= 0.5;
    factors.push({
      id: "employer-concentration",
      label: "Työnantajakeskittymä",
      impact: official.employerConcentration === "high" ? "negative" : official.employerConcentration === "low" ? "positive" : "neutral",
      description: "Monipuolinen työnantajarakenne pienentää yksittäiseen työnantajaan liittyvää riskiä.",
      source: "statistics",
    });
  } else {
    factors.push({
      id: "employer-data-missing",
      label: "Työnantajadata",
      impact: "neutral",
      description: "Riittävää työnantajakeskittymän dataa ei ollut saatavilla, joten sitä ei pisteytetty.",
      source: "unknown",
    });
  }
  if (input.city || input.postalCode || input.district) {
    signals += 1;
    factors.push({
      id: "location-identified",
      label: "Sijainti tunnistettu",
      impact: "neutral",
      description: "Kunta- ja aluekohdistus on käytettävissä myöhempää tilastotäydennystä varten.",
      source: "listing",
    });
  }

  const level = confidence(signals, false);
  return automaticChoice(
    value,
    factors,
    input,
    official ? "Virallinen aluetieto ja kohteen perustiedot" : "Kohteen perustiedot",
    level,
  );
}

export function resolveRentalDemand(
  input: MarketAssessmentInput,
): EstimatedChoice<MarketAssessmentValue> {
  const factors: AssessmentFactor[] = [];
  let value = 3;
  let signals = 0;
  const rooms = roomCount(input.roomDescription);
  const portal = usablePortal(input);

  if (rooms !== undefined || input.areaSqm !== undefined) {
    signals += 1;
    const compact = (rooms !== undefined && rooms <= 2) || (input.areaSqm !== undefined && input.areaSqm <= 55);
    const large = (rooms !== undefined && rooms >= 4) || (input.areaSqm !== undefined && input.areaSqm >= 90);
    if (compact) value += 0.5;
    if (large) value -= 0.5;
    factors.push({
      id: "apartment-size",
      label: "Huoneluku ja koko",
      impact: compact ? "positive" : large ? "negative" : "neutral",
      description: compact
        ? "Kompakti huoneistotyyppi palvelee yleensä laajaa vuokralaisjoukkoa."
        : large
          ? "Suuren asunnon vuokralaisjoukko on usein kompaktia asuntoa rajatumpi."
          : "Kohteen koko ei muuta arviota olennaisesti.",
      source: "listing",
    });
  }
  if (input.statisticalRentAvailable) {
    signals += 1;
    factors.push({
      id: "rent-statistics",
      label: "Alueellinen vuokratilasto",
      impact: "neutral",
      description: "Tilastokeskuksen alueellinen vuokrataso on käytettävissä, mutta se ei yksin todista ajankohtaista kysyntää.",
      source: "statistics",
    });
  }
  if (input.official?.populationChangePercent !== undefined) {
    signals += 1;
    const change = input.official.populationChangePercent;
    if (change >= 1) value += 0.5;
    if (change <= -1) value -= 0.5;
    factors.push({
      id: "demand-population",
      label: "Väestökehitys",
      impact: change >= 1 ? "positive" : change <= -1 ? "negative" : "neutral",
      description: "Väestökehitys toimii vuokra-asuntojen kysynnän alueellisena taustasignaalina.",
      source: "statistics",
    });
  }
  if (portal?.comparableRentalListings !== undefined || portal?.estimatedRentalListingDays !== undefined) {
    signals += 2;
    const quick = (portal.estimatedRentalListingDays ?? 999) <= 30;
    const slow = (portal.estimatedRentalListingDays ?? 0) >= 90;
    if (quick) value += 1;
    if (slow) value -= 1;
    factors.push({
      id: "rental-listing-market",
      label: "Ajankohtainen vuokrailmoitusmarkkina",
      impact: quick ? "positive" : slow ? "negative" : "neutral",
      description: "Sallitusta portaalilähteestä saatu ilmoitusmäärä ja näkyvilläoloaika ovat tukisignaaleja, eivät toteutuneita vuokrauksia.",
      source: "portal",
    });
  } else {
    factors.push({
      id: "rental-portal-missing",
      label: "Ajankohtainen ilmoitusdata",
      impact: "neutral",
      description: "Ajankohtaista sallittua portaalidataa ei ollut käytettävissä.",
      source: "unknown",
    });
  }
  if (input.city || input.postalCode || input.district) signals += 1;

  return automaticChoice(
    value,
    factors,
    input,
    portal ? `${portal.sourceName} sekä tilasto- ja kohdetiedot` : "Tilastolliset kysyntätekijät ja kohteen perustiedot",
    confidence(signals, Boolean(portal)),
  );
}

export function resolveResaleLiquidity(
  input: MarketAssessmentInput,
): EstimatedChoice<MarketAssessmentValue> {
  const factors: AssessmentFactor[] = [];
  let value = 3;
  let signals = 0;
  const rooms = roomCount(input.roomDescription);
  const portal = usablePortal(input);
  const official = input.official;

  if (rooms !== undefined || input.areaSqm !== undefined || input.buildingType) {
    signals += 1;
    const broad = (rooms !== undefined && rooms <= 3) && (input.areaSqm ?? 70) <= 80;
    const niche = (input.areaSqm ?? 0) >= 120;
    if (broad) value += 0.5;
    if (niche) value -= 0.5;
    factors.push({
      id: "property-marketability",
      label: "Kohteen tyyppi ja koko",
      impact: broad ? "positive" : niche ? "negative" : "neutral",
      description: "Talotyyppi, huoneluku ja pinta-ala vaikuttavat potentiaalisen ostajajoukon laajuuteen.",
      source: "listing",
    });
  }
  if (input.landOwnership) {
    signals += 1;
    const optionalLease = /optional|valinnainen/i.test(input.landOwnership);
    if (optionalLease) value -= 0.5;
    factors.push({
      id: "land-ownership",
      label: "Tontin omistus",
      impact: optionalLease ? "negative" : "neutral",
      description: optionalLease
        ? "Valinnaisen vuokratontin ehdot voivat rajata osaa ostajista."
        : "Tontin omistusmuoto ei heikennä arviota käytettävissä olevilla tiedoilla.",
      source: "listing",
    });
  }
  if (input.constructionYear !== undefined || input.elevator !== undefined || input.apartmentCount !== undefined) {
    signals += 1;
    factors.push({
      id: "building-characteristics",
      label: "Rakennuksen ominaisuudet",
      impact: "neutral",
      description: "Rakennusvuosi, hissi ja taloyhtiön koko huomioidaan kohteen markkinoitavuuden taustatekijöinä.",
      source: "listing",
    });
  }
  if (official?.realisedTransactions !== undefined || official?.transactionVolumeTrendPercent !== undefined) {
    signals += 2;
    const volume = official.realisedTransactions ?? 0;
    const trend = official.transactionVolumeTrendPercent ?? 0;
    if (volume >= 100 && trend >= 0) value += 1;
    if (volume < 20 || trend <= -15) value -= 1;
    factors.push({
      id: "realised-transactions",
      label: "Toteutuneet asuntokaupat",
      impact: volume >= 100 && trend >= 0 ? "positive" : volume < 20 || trend <= -15 ? "negative" : "neutral",
      description: "Toteutuneiden kauppojen määrä ja kehitys ovat jälleenmyytävyyden vahvin käytettävissä oleva signaali.",
      source: "statistics",
    });
  }
  if (portal?.estimatedSaleListingDays !== undefined || portal?.housingCompanyListingHistoryCount !== undefined) {
    signals += 1;
    const quick = (portal.estimatedSaleListingDays ?? 999) <= 45;
    const slow = (portal.estimatedSaleListingDays ?? 0) >= 150;
    if (quick) value += 0.5;
    if (slow) value -= 0.5;
    factors.push({
      id: "sale-listing-market",
      label: "Myynti-ilmoitusmarkkina",
      impact: quick ? "positive" : slow ? "negative" : "neutral",
      description: "Ilmoitushistoria kuvaa ilmoitusmarkkinaa ja näkyvilläoloaikaa, ei toteutunutta kauppaa tai varmistettua myyntiaikaa.",
      source: "portal",
    });
  } else {
    factors.push({
      id: "housing-company-history-missing",
      label: "Taloyhtiön ilmoitushistoria",
      impact: "neutral",
      description: "Taloyhtiötason ilmoitushistoriaa ei ollut käytettävissä, eikä sen puuttuminen estä arviota.",
      source: "unknown",
    });
  }

  return automaticChoice(
    value,
    factors,
    input,
    official ? "Toteutuneiden kauppojen tilasto ja kohteen perustiedot" : portal ? `${portal.sourceName} ja kohteen perustiedot` : "Kohteen perustiedot",
    confidence(signals, Boolean(official?.realisedTransactions || portal)),
  );
}

export function resolveMarketAssessments(input: MarketAssessmentInput): MarketAssessmentSet {
  return {
    rentalDemand: resolveRentalDemand(input),
    locationRisk: resolveLocationRisk(input),
    resaleLiquidity: resolveResaleLiquidity(input),
  };
}

export function overrideEstimatedChoice<T>(
  choice: EstimatedChoice<T>,
  value: T,
): EstimatedChoice<T> {
  return {
    ...choice,
    effectiveValue: value,
    source: "user",
    userOverridden: true,
  };
}

export function restoreAutomaticChoice<T>(
  choice: EstimatedChoice<T>,
): EstimatedChoice<T> {
  return {
    ...choice,
    effectiveValue: choice.automaticValue,
    source: choice.automaticValue === null ? "unknown" : "automatic",
    userOverridden: false,
  };
}

export function assessmentConfidenceWeight(
  choice: Pick<EstimatedChoice<unknown>, "source" | "confidence"> | undefined,
): number {
  if (!choice || choice.source === "unknown") return 0;
  if (choice.source === "user") return 1;
  if (choice.confidence === "unknown") return 0;
  if (choice.confidence === "high") return 1;
  if (choice.confidence === "medium") return 0.75;
  return 0.45;
}
