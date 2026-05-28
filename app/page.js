"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Banknote, Building2, Calculator, CheckCircle2, HelpCircle, Home, Link as LinkIcon, ShieldAlert, Target, TrendingUp } from "lucide-react";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isFilled(value) {
  return value !== "" && value !== null && value !== undefined;
}

function eur(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0 €";
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function pct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0,0 %";
  return new Intl.NumberFormat("fi-FI", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 100);
}

const fieldLabels = {
  debtFreePrice: "velaton hinta",
  sellingPrice: "myyntihinta",
  debtShare: "velkaosuus",
  hasDebtShare: "velkaosuuden tieto",
  maintenanceFee: "hoitovastike",
  financingFee: "rahoitusvastike",
  size: "pinta-ala",
  buildYear: "rakennusvuosi",
  buildingType: "talotyyppi",
  heatingType: "lämmitysmuoto",
  landType: "tontti",
};

function formatFoundFields(keys) {
  const labels = keys.map((key) => fieldLabels[key]).filter(Boolean);
  if (labels.length === 0) return "URL-haku onnistui, mutta kohteesta ei tunnistettu vielä varmoja laskentakenttiä. Täydennä puuttuvat tiedot käsin.";
  return `URL-haku onnistui. Kohteesta tunnistettiin: ${labels.join(", ")}. Tarkista silti luvut ennen analyysin käyttöä.`;
}

const initial = {
  url: "",
  buildingType: "",
  buildYear: "",
  debtFreePrice: "",
  originalDebtFreePrice: "",
  debtShare: "",
  ghostDebt: "",
  rent: "",
  maintenanceFee: "",
  financingFee: "",
  hasDebtShare: "",
  heatingType: "",
  size: "",
  ownCapital: "",
  interestRate: "",
  loanYears: "",
  repaymentType: "",
  collateralValuePct: "",
  landType: "",
  yearsToLandLeaseRenewal: "",
  condition: "",
  housingCompanySize: "",
  oldRentalBuilding: "",
  ownershipConcentration: "",
  housingCompanyFinancials: "",
  pipeStatus: "",
  roofStatus: "",
  facadeStatus: "",
  balconyStatus: "",
  windowStatus: "",
  elevatorStatus: "",
  locationDemand: "",
  liquidity: "",
  locationRisk: "",
  targetMode: "cashflow",
  targetCashflow: 100,
  targetNetYield: 6,
  dataSource: "manual",
  parsedNotice: "",
};

const defaultsForOptional = {
  ghostDebt: 0,
  yearsToLandLeaseRenewal: 0,
  debtShare: 0,
  financingFee: 0,
};

function normalizedData(data) {
  return {
    ...data,
    buildYear: asNumber(data.buildYear),
    debtFreePrice: asNumber(data.debtFreePrice),
    debtShare: data.hasDebtShare === "yes" ? asNumber(data.debtShare) : 0,
    ghostDebt: asNumber(data.ghostDebt),
    rent: asNumber(data.rent),
    maintenanceFee: asNumber(data.maintenanceFee),
    financingFee: data.hasDebtShare === "yes" ? asNumber(data.financingFee) : 0,
    size: asNumber(data.size),
    ownCapital: asNumber(data.ownCapital),
    interestRate: asNumber(data.interestRate),
    loanYears: asNumber(data.loanYears),
    collateralValuePct: asNumber(data.collateralValuePct),
    yearsToLandLeaseRenewal: data.landType === "own" ? 0 : asNumber(data.yearsToLandLeaseRenewal),
    condition: asNumber(data.condition),
    locationDemand: asNumber(data.locationDemand),
    liquidity: asNumber(data.liquidity),
  };
}

function requiredFieldKeys(data) {
  const keys = [
    "buildingType",
    "buildYear",
    "heatingType",
    "housingCompanySize",
    "housingCompanyFinancials",
    "ownershipConcentration",
    "landType",
    "oldRentalBuilding",
    "pipeStatus",
    "roofStatus",
    "facadeStatus",
    "balconyStatus",
    "windowStatus",
    "debtFreePrice",
    "maintenanceFee",
    "hasDebtShare",
    "rent",
    "ownCapital",
    "interestRate",
    "loanYears",
    "repaymentType",
    "collateralValuePct",
    "locationDemand",
    "locationRisk",
    "condition",
    "liquidity",
  ];

  if (data.hasDebtShare === "yes") {
    keys.push("debtShare", "financingFee");
  }

  if (data.landType && data.landType !== "own") {
    keys.push("yearsToLandLeaseRenewal");
  }

  if (!isLowRise(data)) {
    keys.push("elevatorStatus");
  }

  return keys;
}

function isRequiredMissing(data, key) {
  return requiredFieldKeys(data).includes(key) && !isFilled(data[key]);
}

function requiredMissingFields(data) {
  const missing = [];
  const req = [
    ["buildingType", "Talotyyppi"],
    ["buildYear", "Rakennusvuosi"],
    ["heatingType", "Lämmitys"],
    ["housingCompanySize", "Taloyhtiön koko"],
    ["housingCompanyFinancials", "Taloyhtiön talous"],
    ["ownershipConcentration", "Omistuspohja"],
    ["landType", "Tontti"],
    ["oldRentalBuilding", "Vanha vuokratalo"],
    ["pipeStatus", "Putki-/LVIS-remontti"],
    ["roofStatus", "Katto"],
    ["facadeStatus", "Julkisivu"],
    ["balconyStatus", "Parveke"],
    ["windowStatus", "Ikkunat"],
    ["debtFreePrice", "Velaton tarjoushinta"],
    ["maintenanceFee", "Hoitovastike"],
    ["hasDebtShare", "Onko velkaosuutta"],
    ["rent", "Vuokra"],
    ["ownCapital", "Sijoitettu oma pääoma"],
    ["interestRate", "Korko"],
    ["loanYears", "Laina-aika"],
    ["repaymentType", "Lyhennystyyppi"],
    ["collateralValuePct", "Pankin vakuusarvo"],
    ["locationDemand", "Vuokrakysyntä"],
    ["locationRisk", "Sijaintiriski"],
    ["condition", "Asunnon kunto"],
    ["liquidity", "Jälleenmyytävyys"],
  ];

  req.forEach(([key, label]) => {
    if (!isFilled(data[key])) missing.push(label);
  });

  if (data.hasDebtShare === "yes") {
    if (!isFilled(data.debtShare)) missing.push("Velkaosuus");
    if (!isFilled(data.financingFee)) missing.push("Rahoitusvastike");
  }

  if (data.landType && data.landType !== "own" && !isFilled(data.yearsToLandLeaseRenewal)) {
    missing.push("Vuosia tontinvuokran uusimiseen");
  }

  if (!isLowRise(data) && !isFilled(data.elevatorStatus)) {
    missing.push("Hissi");
  }

  return missing;
}

function isLowRise(data) {
  return data.buildingType === "terraced" || data.buildingType === "semi_detached";
}

function pipeLabel(data) {
  return isLowRise(data) ? "Putki-/LVIS-remontti" : "Putkiremontti / linjasaneeraus";
}

const renovationCostMidpoints = {
  pipe_coming: 700,
  roof_coming: 60,
  facade_coming: 225,
  balcony_coming: 125,
  windows_coming: 100,
  elevator_modernization_coming: 75,
  elevator_new_coming: 160,
};

function monthlyLoanPayment(principal, annualRate, years, repaymentType = "annuity") {
  if (principal <= 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  if (repaymentType === "interest_only") return principal * monthlyRate;
  if (repaymentType === "equal_principal") return principal / months + principal * monthlyRate;
  if (monthlyRate === 0) return principal / months;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

function scoreFromYield(yieldPct) {
  if (yieldPct >= 8) return 100;
  if (yieldPct >= 7) return 85;
  if (yieldPct >= 6) return 70;
  if (yieldPct >= 5) return 55;
  if (yieldPct >= 4) return 35;
  return 15;
}

function scoreFromCashflow(cashflow) {
  if (cashflow >= 250) return 100;
  if (cashflow >= 150) return 85;
  if (cashflow >= 100) return 75;
  if (cashflow >= 0) return 50;
  if (cashflow >= -100) return 25;
  return 10;
}

function estimateRenovationReserve(data) {
  const d = normalizedData(data);
  const items = [];
  const add = (key, label, eurPerM2) => items.push({ key, label, eurPerM2, estimatedShare: Math.round(eurPerM2 * d.size) });

  if (d.pipeStatus === "coming") add("pipe_coming", isLowRise(d) ? "Tulossa oleva putki-/LVIS-remontti" : "Tulossa oleva linjasaneeraus", renovationCostMidpoints.pipe_coming);
  if (d.roofStatus === "coming") add("roof_coming", "Tulossa oleva kattoremontti", renovationCostMidpoints.roof_coming);
  if (d.facadeStatus === "coming") add("facade_coming", "Tulossa oleva julkisivuremontti", renovationCostMidpoints.facade_coming);
  if (d.balconyStatus === "coming") add("balcony_coming", "Tulossa oleva parvekeremontti", renovationCostMidpoints.balcony_coming);
  if (d.windowStatus === "coming") add("windows_coming", "Tulossa oleva ikkunaremontti", renovationCostMidpoints.windows_coming);
  if (!isLowRise(d) && d.elevatorStatus === "new_planned") add("elevator_new_coming", "Hissien rakentaminen suunnitteilla", renovationCostMidpoints.elevator_new_coming);
  if (!isLowRise(d) && d.elevatorStatus === "not_modernized") add("elevator_modernization_coming", "Hissien modernisointivara", renovationCostMidpoints.elevator_modernization_coming);

  return { items, total: items.reduce((sum, item) => sum + item.estimatedShare, 0) };
}

function heatingScoreAdjustment(type) {
  if (type === "geothermal") return 8;
  if (type === "district") return 4;
  if (type === "electric") return -8;
  if (type === "oil") return -14;
  if (type === "exhaust_air") return 3;
  return 0;
}

function analyzeCore(rawData) {
  const data = normalizedData(rawData);
  const purchasePrice = Math.max(0, data.debtFreePrice - data.debtShare);
  const renovationReserve = estimateRenovationReserve(data);
  const adjustedDebtFreePrice = data.debtFreePrice + data.ghostDebt + renovationReserve.total;
  const loanAmount = Math.max(0, purchasePrice - data.ownCapital);
  const loanPayment = monthlyLoanPayment(loanAmount, data.interestRate, data.loanYears, data.repaymentType);
  const activeFinancingFee = data.hasDebtShare === "yes" ? data.financingFee : 0;
  const monthlyCosts = data.maintenanceFee + activeFinancingFee + loanPayment;
  const cashflow = data.rent - monthlyCosts;
  const grossYield = adjustedDebtFreePrice > 0 ? ((data.rent * 12) / adjustedDebtFreePrice) * 100 : 0;
  const netYield = adjustedDebtFreePrice > 0 ? (((data.rent - data.maintenanceFee) * 12) / adjustedDebtFreePrice) * 100 : 0;
  const cashflowScore = Math.round(scoreFromCashflow(cashflow) * 0.6 + scoreFromYield(netYield) * 0.4);

  let companyScore = 78;
  if (data.landType === "leased_city") companyScore -= 9;
  if (data.landType === "leased_private") companyScore -= 20;
  if (data.landType !== "own" && data.yearsToLandLeaseRenewal <= 5) companyScore -= 18;
  else if (data.landType !== "own" && data.yearsToLandLeaseRenewal <= 10) companyScore -= 8;
  if (data.housingCompanySize === "small") companyScore -= 14;
  if (data.housingCompanySize === "large") companyScore += 8;
  if (data.ownershipConcentration === "high") companyScore -= 16;
  if (data.housingCompanyFinancials === "weak") companyScore -= 18;
  if (data.housingCompanyFinancials === "good") companyScore += 10;
  if (data.oldRentalBuilding === "yes") companyScore -= 10;

  const statusEffects = { recent: 8, older: 2, not_done: -7, not_renewed: -7, coming: -18, not_relevant: 4, none: 0 };
  [data.pipeStatus, data.roofStatus, data.facadeStatus, data.balconyStatus, data.windowStatus].forEach((status) => {
    companyScore += statusEffects[status] || 0;
  });

  if (!isLowRise(data)) {
    if (data.elevatorStatus === "modernized_recent") companyScore += 5;
    if (data.elevatorStatus === "modernized_old") companyScore += 1;
    if (data.elevatorStatus === "not_modernized") companyScore -= 5;
    if (data.elevatorStatus === "new_planned") companyScore -= 12;
    if (data.elevatorStatus === "no_elevator") companyScore += 0;
  }

  if (data.ghostDebt > 0) companyScore -= Math.min(20, Math.round(data.ghostDebt / 2500));
  if (renovationReserve.total > 0) companyScore -= Math.min(25, Math.round(renovationReserve.total / 3000));
  companyScore = clamp(companyScore);

  const conditionScore = clamp(data.condition * 18 + (data.condition >= 4 ? 10 : 0));
  let locationScore = clamp(data.locationDemand * 22 + data.liquidity * 8);
  if (data.locationDemand <= 2) locationScore -= 18;
  if (data.locationDemand >= 5) locationScore += 8;
  if (data.locationRisk === "high") locationScore -= 28;
  if (data.locationRisk === "low") locationScore += 8;
  locationScore = clamp(locationScore);

  let financeScore = 70;
  const leverage = purchasePrice > 0 ? loanAmount / purchasePrice : 0;
  if (leverage > 0.8) financeScore -= 18;
  if (leverage < 0.6) financeScore += 8;
  if (data.interestRate > 5) financeScore -= 12;
  if (cashflow < 0) financeScore -= 18;
  if (cashflow >= 100) financeScore += 8;
  financeScore = clamp(financeScore);

  let total = Math.round(cashflowScore * 0.35 + companyScore * 0.25 + conditionScore * 0.15 + locationScore * 0.15 + financeScore * 0.1);
  total = clamp(total + heatingScoreAdjustment(data.heatingType));

  const collateralValue = purchasePrice * (data.collateralValuePct / 100);
  const requiredOwnCashOrExtraCollateral = Math.max(0, purchasePrice - collateralValue);

  const positives = [];
  const warnings = [];

  if (cashflow >= 100) positives.push("Kassavirta ylittää 100 €/kk.");
  else if (cashflow >= 0) warnings.push("Kassavirta on positiivinen, mutta alle 100 €/kk.");
  else warnings.push("Kassavirta jää negatiiviseksi nykyisillä rahoitusoletuksilla.");

  if (netYield >= 6 && cashflow >= 0) positives.push("Nettovuokratuotto on asuntosijoittajan näkökulmasta vahva.");
  else if (netYield >= 6 && cashflow < 0) warnings.push("Nettovuokratuotto näyttää vahvalta, mutta kassavirta on negatiivinen valituilla rahoitusoletuksilla.");
  else if (netYield < 4.5) warnings.push("Nettovuokratuotto on matala suhteessa todelliseen arvioituun velattomaan hintaan.");

  if (data.locationDemand >= 5) positives.push("Vahva vuokrakysyntä parantaa kohteen kannattavuus- ja tyhjäkäyntiriskiä.");
  if (data.locationDemand <= 2) warnings.push("Heikko vuokrakysyntä voi kasvattaa tyhjäkäyntiriskiä ja heikentää todellista kassavirtaa.");

  if (data.heatingType === "geothermal") positives.push("Maalämpö tukee pisteytystä ja voi parantaa pitkän aikavälin kulutehokkuutta.");
  if (data.heatingType === "district") positives.push("Kaukolämpö tukee pisteytystä ennustettavuuden ja vuokrattavuuden näkökulmasta.");
  if (data.heatingType === "electric") warnings.push("Suora sähkölämmitys laskee pisteytystä käyttökulu- ja vuokrattavuusriskin vuoksi.");
  if (data.heatingType === "oil") warnings.push("Öljylämmitys laskee pisteytystä merkittävästi.");

  if (renovationReserve.total > 0) warnings.push(`Valittujen taloyhtiöremonttien karkea remonttivara on noin ${eur(renovationReserve.total)}.`);
  if (requiredOwnCashOrExtraCollateral <= data.ownCapital) positives.push("Sijoitettu oma pääoma näyttää riittävän valitulla pankin vakuusarvo-oletuksella.");

  let verdict = "Heikko sijoituskohde";
  if (total >= 85) verdict = "Erinomainen sijoituskohde";
  else if (total >= 70) verdict = "Hyvä ostokandidaatti";
  else if (total >= 55) verdict = "Vaatii lisäselvityksiä";
  else if (total >= 40) verdict = "Riskinen kohde";

  return {
    purchasePrice,
    adjustedDebtFreePrice,
    renovationReserve,
    collateralValue,
    requiredOwnCashOrExtraCollateral,
    loanAmount,
    loanPayment,
    monthlyCosts,
    cashflow,
    grossYield,
    netYield,
    scores: { cashflow: cashflowScore, company: Math.round(companyScore), condition: Math.round(conditionScore), location: Math.round(locationScore), finance: Math.round(financeScore), total },
    positives,
    warnings,
    verdict,
  };
}

function buildRiskProfile(rawData, base) {
  const data = normalizedData(rawData);
  const items = [];
  const dealbreakers = [];
  const add = (severity, text) => items.push({ severity, text });

  if (base.cashflow < -150 && data.locationRisk === "high") {
    dealbreakers.push("Heikko kassavirta yhdistyy korkeaan sijaintiriskiin.");
    add("critical", "Kassavirta on selvästi negatiivinen ja sijaintiriski on korkea.");
  }
  if (data.landType === "leased_private") add("critical", "Yksityinen vuokratontti voi nostaa tontinvuokran uusimis- ja vastikeriskiä.");
  if (data.landType !== "own" && data.yearsToLandLeaseRenewal <= 5) {
    dealbreakers.push("Tontinvuokran uusiminen on lähellä.");
    add("critical", "Tontinvuokran uusiminen lähivuosina voi nostaa vastiketta merkittävästi.");
  }
  if (data.pipeStatus === "coming") {
    dealbreakers.push(`${pipeLabel(data)} on merkitty tulevaksi lähivuosina.`);
    add("critical", `${pipeLabel(data)} tulossa lähivuosina. Varmista lainaosuus ja aikataulu.`);
  }
  if (base.renovationReserve.total > data.debtFreePrice * 0.2) {
    dealbreakers.push("Remonttivara on yli 20 % velattomasta hinnasta.");
    add("critical", `Remonttivara on suuri suhteessa velattomaan hintaan: ${eur(base.renovationReserve.total)}.`);
  }
  if (base.cashflow < 0 && base.netYield < 4.5) add("critical", "Negatiivinen kassavirta ja matala nettovuokratuotto heikentävät kohteen sijoituslogiikkaa.");
  if (data.locationRisk === "high") add("critical", "Korkea sijaintiriski.");
  if (data.locationDemand <= 2) add("warning", "Vuokrakysyntä on arvioitu heikoksi, mikä voi kasvattaa tyhjäkäyntiriskiä.");
  if (data.housingCompanyFinancials === "weak") add("critical", "Taloyhtiön talous vaikuttaa heikolta.");
  if (base.requiredOwnCashOrExtraCollateral > data.ownCapital) add("warning", `Sijoitettu oma pääoma ei välttämättä riitä. Vaadittu oma raha tai lisävakuus on arviolta ${eur(base.requiredOwnCashOrExtraCollateral)}.`);
  if (data.heatingType === "electric") add("warning", "Suora sähkölämmitys voi heikentää vuokrattavuutta käyttökulujen vuoksi.");
  if (data.heatingType === "oil") add("critical", "Öljylämmitys nostaa tulevien kustannusten ja energiaratkaisujen riskiä.");
  if (data.buildYear < 1994) add("info", "Mahdollinen asbestiriski rakennusvuoden perusteella.");
  if (isLowRise(data) && data.buildYear >= 1960 && data.buildYear <= 1985) add("info", "Mahdollinen valesokkeli-/piilosokkeliriski.");

  base.renovationReserve.items.forEach((item) => add(item.key.includes("pipe") ? "critical" : "warning", `${item.label}: karkea arvio noin ${eur(item.estimatedShare)} tälle huoneistolle (${item.eurPerM2} €/m²).`));

  return { items, dealbreakers };
}

function buildInvestorSummary(data, base, riskProfile) {
  if (riskProfile.dealbreakers.length > 0) return "Kohde vaatii erityistä varovaisuutta. Suurimmat ongelmat liittyvät kassavirran, remonttien, tontin tai sijainnin yhdistelmään.";
  if (base.scores.total >= 70 && base.cashflow >= 100) return "Kohde sopii kassavirtapainotteiselle asuntosijoittajalle nykyisillä oletuksilla.";
  if (base.cashflow < 0) return "Nykyisellä velattomalla hinnalla kohde ei vielä näytä riittävän vahvalta. Testaa alempaa tarjoushintaa.";
  return "Kohde on jatkoselvityskelpoinen, mutta luvut pitää varmistaa ilmoituksesta ja taloyhtiöaineistosta.";
}

function simulateOfferPrices(data) {
  const d = normalizedData(data);
  const current = d.debtFreePrice || 100000;
  const min = Math.max(10000, Math.round((current * 0.4) / 1000) * 1000);
  const max = Math.round((current * 1.1) / 1000) * 1000;
  const step = 1000;
  const rows = [];
  for (let price = min; price <= max; price += step) {
    const scenario = analyzeCore({ ...d, debtFreePrice: price });
    rows.push({ price, cashflow: scenario.cashflow, netYield: scenario.netYield, score: scenario.scores.total });
  }
  const highest = (predicate) => {
    const matches = rows.filter(predicate);
    return matches.length ? matches[matches.length - 1].price : null;
  };
  return {
    positiveCashflowAt: highest((row) => row.cashflow >= 0),
    targetCashflowAt: highest((row) => row.cashflow >= 100),
    targetYieldAt: highest((row) => row.netYield >= 6),
    greenScoreAt: highest((row) => row.score >= 70),
  };
}

function analyze(data) {
  const base = analyzeCore(data);
  const riskProfile = buildRiskProfile(data, base);
  return { ...base, riskProfile, dealbreakers: riskProfile.dealbreakers, investorSummary: buildInvestorSummary(data, base, riskProfile), priceSimulation: simulateOfferPrices(data) };
}

function findOfferForTargets(data, targetCashflow, targetNetYield) {
  const d = normalizedData(data);
  const current = d.debtFreePrice || 100000;
  const min = Math.max(10000, Math.round((current * 0.35) / 500) * 500);
  const max = Math.round((current * 1.15) / 500) * 500;
  const step = 500;
  const matches = [];
  for (let price = min; price <= max; price += step) {
    const result = analyzeCore({ ...d, debtFreePrice: price });
    const cashflowOk = !Number.isFinite(targetCashflow) || result.cashflow >= targetCashflow;
    const yieldOk = !Number.isFinite(targetNetYield) || result.netYield >= targetNetYield;
    if (cashflowOk && yieldOk) matches.push({ price, result });
  }
  if (!matches.length) return null;
  return matches[matches.length - 1];
}

function scoreCardTone(score) {
  if (score >= 80) return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (score >= 60) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-rose-200 bg-rose-50 text-rose-900";
}

function riskSeverityTone(severity) {
  if (severity === "critical") return "border-rose-200 bg-rose-50 text-rose-900";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function riskSeverityLabel(severity) {
  if (severity === "critical") return "Kriittinen";
  if (severity === "warning") return "Varoitus";
  return "Huomio";
}

export default function HomePage() {
  const [data, setData] = useState(initial);
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [offerSimulation, setOfferSimulation] = useState(null);

  const missingFields = requiredMissingFields(data);
  const canAnalyze = missingFields.length === 0;
  const result = useMemo(() => analyze(data), [data]);

  const update = (key, value) => {
    setData((prev) => {
      let next = { ...prev, [key]: value };

      if (key === "hasDebtShare" && value === "no") {
        next.debtShare = 0;
        next.financingFee = 0;
      }
      if (key === "hasDebtShare" && value === "yes") {
        if (next.debtShare === 0) next.debtShare = "";
        if (next.financingFee === 0) next.financingFee = "";
      }
      if (key === "landType" && value === "own") {
        next.yearsToLandLeaseRenewal = 0;
      }
      if (key === "landType" && value !== "own" && next.yearsToLandLeaseRenewal === 0) {
        next.yearsToLandLeaseRenewal = "";
      }
      if (key === "buildingType" && (value === "terraced" || value === "semi_detached")) {
        next.elevatorStatus = "not_applicable";
      }
      if (key === "buildingType" && value !== "terraced" && value !== "semi_detached" && next.elevatorStatus === "not_applicable") {
        next.elevatorStatus = "";
      }

      if (key === "buildYear") {
        const currentYear = new Date().getFullYear();
        const age = Number(value) > 0 ? currentYear - Number(value) : null;
        if (age !== null && age <= 20) {
          next.pipeStatus = next.pipeStatus || "not_relevant";
          next.roofStatus = next.roofStatus || "not_relevant";
          next.facadeStatus = next.facadeStatus || "not_relevant";
          next.balconyStatus = next.balconyStatus || "not_relevant";
          next.windowStatus = next.windowStatus || "not_relevant";
          if (!isLowRise(next)) next.elevatorStatus = next.elevatorStatus || "not_relevant";
        }
      }
      return next;
    });
  };

  const parseListingUrl = async () => {
    const url = data.url.trim();
    if (!url) return setData((prev) => ({ ...prev, parsedNotice: "Liitä ensin Etuovi- tai Oikotie-linkki." }));
    setIsParsingUrl(true);
    setData((prev) => ({ ...prev, parsedNotice: "Haetaan kohteen tietoja..." }));
    try {
      const response = await fetch(`/api/parse-listing?url=${encodeURIComponent(url)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "URL-haku ei saanut ilmoitusta luettua.");
      const parsed = payload.fields || {};
      if (!Object.keys(parsed).length) throw new Error("URL-haku haki sivun, mutta ei löytänyt laskentakenttiä.");
      setData((prev) => {
        const originalDebtFreePrice = parsed.debtFreePrice ?? prev.originalDebtFreePrice;
        const next = { ...prev, ...parsed, originalDebtFreePrice, url, dataSource: "url-parser", parsedNotice: formatFoundFields(Object.keys(parsed)) };
        if (next.buildingType === "terraced" || next.buildingType === "semi_detached") next.elevatorStatus = "not_applicable";
        const currentYear = new Date().getFullYear();
        const age = Number(next.buildYear) > 0 ? currentYear - Number(next.buildYear) : null;
        if (age !== null && age <= 20) {
          next.pipeStatus = next.pipeStatus || "not_relevant";
          next.roofStatus = next.roofStatus || "not_relevant";
          next.facadeStatus = next.facadeStatus || "not_relevant";
          next.balconyStatus = next.balconyStatus || "not_relevant";
          next.windowStatus = next.windowStatus || "not_relevant";
          if (!isLowRise(next)) next.elevatorStatus = next.elevatorStatus || "not_relevant";
          next.parsedNotice = `${next.parsedNotice} Rakennusvuoden perusteella isot peruskorjaukset on alustavasti merkitty ei ajankohtaisiksi.`;
        }
        return next;
      });
    } catch (error) {
      setData((prev) => ({ ...prev, parsedNotice: `URL-haku ei onnistunut: ${error.message}. Tarkista linkki tai täydennä luvut käsin.` }));
    } finally {
      setIsParsingUrl(false);
    }
  };

  const runOfferSimulation = () => {
    const targetCashflow = data.targetMode === "cashflow" ? Number(data.targetCashflow) : Number.NaN;
    const targetNetYield = data.targetMode === "yield" ? Number(data.targetNetYield) : Number.NaN;
    const simulated = findOfferForTargets(data, targetCashflow, targetNetYield);
    setOfferSimulation(simulated);
  };

  const scoreColor = !canAnalyze ? "bg-slate-100 text-slate-700 border-slate-200" : result.scores.total >= 70 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : result.scores.total >= 55 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-rose-100 text-rose-800 border-rose-200";
  const cashflowTone = result.cashflow < 0 ? "bad" : result.cashflow < 100 ? "warn" : "good";
  const dataSourceLabel = data.dataSource === "url-parser" ? "URL-haulla haettu" : "Käsin syötetyt tiedot";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm text-slate-600 shadow-sm"><Home className="h-4 w-4" /> asuntosijoituslaskuri.fi</div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">Sijoitusasunnon analyysi</h1>
            <p className="mt-2 max-w-2xl text-slate-600">URL-haku, kassavirta, todellinen velaton hinta, riskiliput ja tarjoushintasimulaattori.</p>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <strong>HUOM!</strong> Laskuri toimii tuotto- ja kassavirtaperusteisesti. Palvelulla ei ole pääsyä toteutuneisiin kauppahintoihin tai alueellisiin vertailukauppoihin, joten arvio ei ole markkina-arvoanalyysi tai virallinen hinta-arvio.
            </div>
          </div>
          <Card className={scoreColor}>
            <div className="text-sm font-medium">Sijoitusarvio</div>
            {canAnalyze ? (
              <>
                <div className="mt-1 flex items-end gap-2"><div className="text-5xl font-bold">{result.scores.total}</div><div className="pb-2 text-lg">/100</div></div>
                <div className="mt-2 font-semibold">{result.verdict}</div>
              </>
            ) : (
              <>
                <div className="mt-2 text-2xl font-bold">Täydennä tiedot</div>
                <div className="mt-2 text-sm">Sijoitusarvio muodostuu, kun vaaditut kentät on täytetty.</div>
              </>
            )}
          </Card>
        </header>

        {!canAnalyze && (
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="font-semibold">Täydennä puuttuvat tiedot ennen analyysin tulkintaa.</div>
            <div className="mt-1">Puuttuu: {missingFields.slice(0, 10).join(", ")}{missingFields.length > 10 ? ` ja ${missingFields.length - 10} muuta.` : "."}</div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <div className="space-y-6">
              <SectionTitle icon={<Calculator className="h-5 w-5" />} title="Kohteen tiedot" />
              <div className="space-y-3 rounded-3xl border bg-slate-50 p-4">
                <Label help="Liitä Etuovi- tai Oikotie-kohdelinkki. Työkalu yrittää hakea ilmoituksesta keskeiset laskentatiedot automaattisesti.">Etuovi/Oikotie-linkki</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={data.url} onChange={(e) => update("url", e.target.value)} placeholder="Liitä Etuovi- tai Oikotie-linkki" />
                  <Button type="button" onClick={parseListingUrl} disabled={isParsingUrl}><LinkIcon className="mr-2 h-4 w-4" /> {isParsingUrl ? "Haetaan..." : "Hae tiedot"}</Button>
                </div>
                <p className="text-xs text-slate-500">URL-haku täyttää vain löydetyt tiedot. Käyttäjä vastaa puuttuvien tietojen täydentämisestä ja valintojen oikeellisuudesta.</p>
                {data.parsedNotice && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">{data.parsedNotice}</div>}
              </div>

              <SectionTitle icon={<Building2 className="h-5 w-5" />} title="Rakennus ja taloyhtiö" />
              <Grid>
                <SelectField label="Talotyyppi" help="Valitse ostokohteen tyyppi. Talotyyppi vaikuttaa remonttiriskeihin, kulurakenteeseen ja jälleenmyytävyyteen." value={data.buildingType} onChange={(v) => update("buildingType", v)} placeholder="Valitse talotyyppi" requiredMissing={isRequiredMissing(data, "buildingType")} options={[["apartment", "Kerrostalo"], ["terraced", "Rivitalo"], ["semi_detached", "Paritalo"], ["loft", "Luhtitalo"]]} />
                <NumberField label="Rakennusvuosi" help="Rakennusvuosi auttaa arvioimaan tulevia remontteja, rakennusteknisiä riskejä ja asbestiriskiä." value={data.buildYear} onChange={(v) => update("buildYear", v)} placeholder="Syötä rakennusvuosi" requiredMissing={isRequiredMissing(data, "buildYear")} />
                <SelectField label="Lämmitys" help="Maalämpö ja kaukolämpö nostavat pisteytystä. Suora sähkö ja öljy laskevat pisteytystä." value={data.heatingType} onChange={(v) => update("heatingType", v)} placeholder="Valitse lämmitysmuoto" requiredMissing={isRequiredMissing(data, "heatingType")} options={[["electric", "Suora sähkö"], ["district", "Kaukolämpö"], ["geothermal", "Maalämpö"], ["exhaust_air", "Poistoilmalämpöpumppu"], ["oil", "Öljylämmitys"]]} />
                <SelectField label="Taloyhtiön koko" help="Pienessä yhtiössä isot remontit voivat kohdistua harvemmille osakkaille. Iso yhtiö voi hajauttaa riskiä." value={data.housingCompanySize} onChange={(v) => update("housingCompanySize", v)} placeholder="Valitse koko" requiredMissing={isRequiredMissing(data, "housingCompanySize")} options={[["small", "Pieni (0–5 asuntoa)"], ["medium", "Keskikokoinen (10–30 asuntoa)"], ["large", "Iso (+30 asuntoa)"]]} />
                <SelectField label="Taloyhtiön talous" help="Arvio taloyhtiön maksuvalmiudesta, vastikepaineesta ja yleisestä taloudellisesta tilanteesta." value={data.housingCompanyFinancials} onChange={(v) => update("housingCompanyFinancials", v)} placeholder="Valitse arvio" requiredMissing={isRequiredMissing(data, "housingCompanyFinancials")} options={[["good", "Hyvä"], ["average", "Kohtalainen / ei tiedossa"], ["weak", "Heikko"]]} />
                <SelectField label="Omistuspohja" help="Jos omistuspohja ei ole tiedossa, valitse normaali. Keskittynyt omistuspohja tarkoittaa tilannetta, jossa yksi tai muutama omistaja omistaa suuren osan huoneistoista." value={data.ownershipConcentration} onChange={(v) => update("ownershipConcentration", v)} placeholder="Valitse omistuspohja" requiredMissing={isRequiredMissing(data, "ownershipConcentration")} options={[["normal", "Hajautunut / normaali"], ["high", "Keskittynyt"]]} />
                <SelectField label="Tontti" help="Oma tontti on yleensä ennustettavin. Vuokratontissa kannattaa tarkistaa vuokra-aika ja uusimisehdot." value={data.landType} onChange={(v) => update("landType", v)} placeholder="Valitse tonttityyppi" requiredMissing={isRequiredMissing(data, "landType")} options={[["own", "Oma tontti"], ["leased_city", "Vuokratontti: kaupunki/kunta"], ["leased_private", "Vuokratontti: yksityinen"]]} />
                {data.landType !== "own" && <NumberField label="Vuosia tontinvuokran uusimiseen" help="Mitä lähempänä uusiminen on, sitä suurempi riski vastikkeen tai tontinvuokran nousulle." value={data.yearsToLandLeaseRenewal} onChange={(v) => update("yearsToLandLeaseRenewal", v)} placeholder="Syötä vuosimäärä" requiredMissing={isRequiredMissing(data, "yearsToLandLeaseRenewal")} />}
                <SelectField label="Vanha vuokratalo?" help="Vanha vuokratalo voi vaikuttaa jälleenmyytävyyteen ja ostajakysyntään joillakin alueilla." value={data.oldRentalBuilding} onChange={(v) => update("oldRentalBuilding", v)} placeholder="Valitse" requiredMissing={isRequiredMissing(data, "oldRentalBuilding")} options={[["no", "Ei"], ["yes", "Kyllä"]]} />
              </Grid>

              <SectionTitle icon={<ShieldAlert className="h-5 w-5" />} title="Remonttivarat" />
              <Grid>
                <SelectField label={pipeLabel(data)} help="Valitse remontin todellinen tila. Tulossa lähivuosina lisää karkean remonttivaran todelliseen velattomaan hintaan." value={data.pipeStatus} onChange={(v) => update("pipeStatus", v)} placeholder="Valitse tila" requiredMissing={isRequiredMissing(data, "pipeStatus")} options={[["not_relevant", "Ei ajankohtainen"], ["not_done", "Ei tehty"], ["older", "Tehty yli 10 vuotta sitten"], ["recent", "Tehty viimeisen 10 vuoden aikana"], ["coming", "Tulossa lähivuosina"]]} />
                <SelectField label="Katto" help="Kattoremontin tila vaikuttaa taloyhtiöriskiin ja mahdolliseen remonttivaraan." value={data.roofStatus} onChange={(v) => update("roofStatus", v)} placeholder="Valitse tila" requiredMissing={isRequiredMissing(data, "roofStatus")} options={[["not_relevant", "Ei ajankohtainen"], ["not_renewed", "Ei uusittu"], ["older", "Uusittu yli 10 vuotta sitten"], ["recent", "Uusittu viimeisen 10 vuoden aikana"], ["coming", "Tulossa lähivuosina"]]} />
                <SelectField label="Julkisivu" help="Julkisivuremontti on monissa vanhemmissa yhtiöissä iso kuluerä." value={data.facadeStatus} onChange={(v) => update("facadeStatus", v)} placeholder="Valitse tila" requiredMissing={isRequiredMissing(data, "facadeStatus")} options={[["not_relevant", "Ei ajankohtainen"], ["not_done", "Ei tehty"], ["older", "Tehty yli 10 vuotta sitten"], ["recent", "Tehty viimeisen 10 vuoden aikana"], ["coming", "Tulossa lähivuosina"]]} />
                <SelectField label="Parveke" help="Valitse ei parveketta, jos kohteessa ei ole parveketta." value={data.balconyStatus} onChange={(v) => update("balconyStatus", v)} placeholder="Valitse tila" requiredMissing={isRequiredMissing(data, "balconyStatus")} options={[["none", "Ei parveketta"], ["not_relevant", "Ei ajankohtainen"], ["not_done", "Ei tehty"], ["older", "Tehty yli 10 vuotta sitten"], ["recent", "Tehty viimeisen 10 vuoden aikana"], ["coming", "Tulossa lähivuosina"]]} />
                <SelectField label="Ikkunat" help="Ikkunaremontti voi vaikuttaa asumismukavuuteen, energiatehokkuuteen ja yhtiön kustannuksiin." value={data.windowStatus} onChange={(v) => update("windowStatus", v)} placeholder="Valitse tila" requiredMissing={isRequiredMissing(data, "windowStatus")} options={[["not_relevant", "Ei ajankohtainen"], ["not_renewed", "Ei uusittu"], ["older", "Uusittu yli 10 vuotta sitten"], ["recent", "Uusittu viimeisen 10 vuoden aikana"], ["coming", "Tulossa lähivuosina"]]} />
                {!isLowRise(data) && <SelectField label="Hissi" help="Valitse ei hissiä, jos yhtiössä ei ole hissiä. Rivitaloissa ja paritaloissa hissivalinta piilotetaan." value={data.elevatorStatus} onChange={(v) => update("elevatorStatus", v)} placeholder="Valitse tila" requiredMissing={isRequiredMissing(data, "elevatorStatus")} options={[["no_elevator", "Ei hissiä"], ["not_relevant", "Ei ajankohtainen"], ["not_modernized", "Ei modernisoitu"], ["modernized_old", "Modernisoitu yli 20 vuotta sitten"], ["modernized_recent", "Modernisoitu viimeisen 20 vuoden aikana"], ["new_planned", "Hissien rakentaminen suunnitteilla"]]} />}
                <NumberField label="Jyvittämätön remonttiosuus" help="Lisää tähän tiedossa oleva tai arvioitu tuleva remonttiosuus, jota ei vielä näy velattomassa hinnassa." value={data.ghostDebt} onChange={(v) => update("ghostDebt", v)} placeholder="Syötä euroina, jos tiedossa" />
              </Grid>

              <SectionTitle icon={<Banknote className="h-5 w-5" />} title="Talous" />
              <Grid>
                <NumberField label="Velaton tarjoushinta" help="Tämä on syötetty velaton tarjoushinta. Voit muuttaa sitä testataksesi, millä hinnalla kohteen luvut täsmäävät. URL-haku tallentaa alkuperäisen ilmoitushinnan erikseen." value={data.debtFreePrice} onChange={(v) => update("debtFreePrice", v)} placeholder="Syötä velaton hinta" requiredMissing={isRequiredMissing(data, "debtFreePrice")} />
                <SelectField label="Onko velkaosuutta?" help="Valitse kyllä, jos huoneistolla on taloyhtiölainaa tai rahoitusvastiketta." value={data.hasDebtShare} onChange={(v) => update("hasDebtShare", v)} placeholder="Valitse" requiredMissing={isRequiredMissing(data, "hasDebtShare")} options={[["yes", "Kyllä"], ["no", "Ei"]]} />
                {data.hasDebtShare === "yes" && <NumberField label="Velkaosuus" help="Huoneistolle kohdistuva taloyhtiölainan osuus." value={data.debtShare} onChange={(v) => update("debtShare", v)} placeholder="Syötä velkaosuus" requiredMissing={isRequiredMissing(data, "debtShare")} />}
                <NumberField label="Hoitovastike / kk" help="Taloyhtiölle maksettava hoitovastike. Tämä vähennetään vuokratuotosta." value={data.maintenanceFee} onChange={(v) => update("maintenanceFee", v)} placeholder="Syötä hoitovastike" requiredMissing={isRequiredMissing(data, "maintenanceFee")} />
                {data.hasDebtShare === "yes" && <NumberField label="Rahoitusvastike / kk" help="Taloyhtiölainasta maksettava kuukausittainen rahoitusvastike." value={data.financingFee} onChange={(v) => update("financingFee", v)} placeholder="Syötä rahoitusvastike" requiredMissing={isRequiredMissing(data, "financingFee")} />}
              </Grid>

              <SectionTitle icon={<TrendingUp className="h-5 w-5" />} title="Vuokraus" />
              <Grid>
                <NumberField label="Vuokra / kk" help="Lisää tähän vain varsinainen vuokra ilman vesimaksuja, sähköä tai muita läpilaskutettavia eriä." value={data.rent} onChange={(v) => update("rent", v)} placeholder="Syötä vuokra" requiredMissing={isRequiredMissing(data, "rent")} />
                <SliderField label="Vuokrakysyntä alueella" help="Arvioi kuinka helposti asunto löytyy vuokralaiselle realistisella vuokratasolla." value={data.locationDemand} onChange={(v) => update("locationDemand", v)} left="Heikko" right="Vahva" requiredMissing={isRequiredMissing(data, "locationDemand")} />
              </Grid>

              <SectionTitle icon={<Banknote className="h-5 w-5" />} title="Rahoitus" />
              <Grid>
                <NumberField label="Sijoitettu oma pääoma" help="Oma raha, jonka aiot sijoittaa tähän kohteeseen." value={data.ownCapital} onChange={(v) => update("ownCapital", v)} placeholder="Syötä oma pääoma" requiredMissing={isRequiredMissing(data, "ownCapital")} />
                <NumberField label="Korko %" help="Arvio lainan kokonaiskorosta." value={data.interestRate} onChange={(v) => update("interestRate", v)} step="0.1" placeholder="Syötä korko" requiredMissing={isRequiredMissing(data, "interestRate")} />
                <NumberField label="Laina-aika vuosina" help="Laina-aika vaikuttaa kuukausierään ja kassavirtaan." value={data.loanYears} onChange={(v) => update("loanYears", v)} placeholder="Syötä laina-aika" requiredMissing={isRequiredMissing(data, "loanYears")} />
                <SelectField label="Lyhennystyyppi" help="Annuiteetti on yleinen lainamalli. Korot vain -vaihtoehto näyttää kassavirran lyhennysvapaan aikana." value={data.repaymentType} onChange={(v) => update("repaymentType", v)} placeholder="Valitse lyhennystyyppi" requiredMissing={isRequiredMissing(data, "repaymentType")} options={[["annuity", "Annuiteetti"], ["equal_principal", "Tasalyhennys"], ["interest_only", "Korot vain"]]} />
                <SelectField label="Pankin vakuusarvo" help="Arvio siitä, kuinka suuren osuuden ostokohteesta pankki hyväksyy vakuudeksi." value={String(data.collateralValuePct)} onChange={(v) => update("collateralValuePct", v)} placeholder="Valitse vakuusarvo" requiredMissing={isRequiredMissing(data, "collateralValuePct")} options={[["70", "70 %"], ["80", "80 %"], ["90", "90 %"]]} />
              </Grid>

              <SectionTitle icon={<TrendingUp className="h-5 w-5" />} title="Sijainti ja exit" />
              <SelectField label="Sijaintiriski" help="Matala: haluttu sijainti, isot työllistäjät tai oppilaitokset lähellä. Keskitaso: elinvoimainen pieni tai keskisuuri kunta. Korkea: muuttotappiopaikkakunta tai yhden suuren työnantajan varassa." value={data.locationRisk} onChange={(v) => update("locationRisk", v)} placeholder="Valitse sijaintiriski" requiredMissing={isRequiredMissing(data, "locationRisk")} options={[["low", "Matala – haluttu sijainti"], ["medium", "Keskitaso – elinvoimainen pieni/keskisuuri kunta"], ["high", "Korkea – muuttotappio tai yhden työllistäjän riski"]]} />
              <SliderField label="Asunnon kunto" help="1 Heikko: vaatii täydellisen remontin. 2 Tyydyttävä: asuttava, mutta selvä päivitystarve. 3 Kohtalainen: pinnat pääosin ok, kylpyhuone tai keittiö voi vaatia päivitystä. 4 Hyvä: siisti ja toimiva. 5 Erinomainen: remontoitu tai lähes uudenveroinen." value={data.condition} onChange={(v) => update("condition", v)} left="Heikko" right="Erinomainen" requiredMissing={isRequiredMissing(data, "condition")} />
              <SliderField label="Jälleenmyytävyys / likviditeetti" help="Arvioi kuinka nopeasti ja helposti kohde olisi myytävissä eteenpäin." value={data.liquidity} onChange={(v) => update("liquidity", v)} left="Hidas" right="Nopea" requiredMissing={isRequiredMissing(data, "liquidity")} />
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-2 text-xl font-semibold"><TrendingUp className="h-5 w-5" /> Talousluvut</div>
              {!canAnalyze && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Talousluvut päivittyvät suuntaa-antavasti. Täydennä kaikki vaaditut kentät ennen tulkintaa.</div>}

              <div className="mt-5 space-y-6">
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Tuotto & kassavirta</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Metric label="Kassavirta / kk" value={eur(result.cashflow)} emphasis={cashflowTone} />
                    <Metric label="Nettovuokratuotto" value={pct(result.netYield)} />
                    <Metric label="Bruttovuokratuotto" value={pct(result.grossYield)} />
                    <Metric label="Kulut yhteensä / kk" value={eur(result.monthlyCosts)} />
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Hinnat & arvostus</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Metric label="Myyntihinta" value={eur(result.purchasePrice)} />
                    {isFilled(data.originalDebtFreePrice) && Number(data.originalDebtFreePrice) !== normalizedData(data).debtFreePrice && <Metric label="Alkuperäinen ilmoituksen velaton hinta" value={eur(data.originalDebtFreePrice)} />}
                    <Metric label="Syötetty velaton tarjoushinta" value={eur(normalizedData(data).debtFreePrice)} />
                    <Metric label="Todellinen arvioitu velaton hinta" value={eur(result.adjustedDebtFreePrice)} emphasis={result.adjustedDebtFreePrice > normalizedData(data).debtFreePrice ? "warn" : undefined} />
                    <Metric label="Remonttivara" value={eur(result.renovationReserve.total)} emphasis={result.renovationReserve.total > 0 ? "warn" : undefined} />
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Rahoitus</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Metric label="Lainan kuukausierä" value={eur(result.loanPayment)} />
                    <Metric label="Pankin vakuusarvo" value={eur(result.collateralValue)} />
                    <Metric label="Vaadittu oma raha / lisävakuus" value={eur(result.requiredOwnCashOrExtraCollateral)} emphasis={result.requiredOwnCashOrExtraCollateral > normalizedData(data).ownCapital ? "bad" : "good"} />
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-xl font-semibold"><Target className="h-5 w-5" /> Simuloi tarjoushinta</div>
              <p className="mt-2 text-sm text-slate-600">Valitse yksi tavoite. Laskuri hakee korkeimman velattoman tarjoushinnan, jolla valittu tavoite vielä täyttyy.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Simuloinnin tavoite"
                  value={data.targetMode}
                  onChange={(v) => {
                    update("targetMode", v);
                    setOfferSimulation(null);
                  }}
                  options={[["cashflow", "Kassavirta"], ["yield", "Nettotuotto"]]}
                />
                {data.targetMode === "cashflow" ? (
                  <NumberField label="Vaadittu kassavirta €/kk" value={data.targetCashflow} onChange={(v) => update("targetCashflow", v)} />
                ) : (
                  <NumberField label="Vaadittu nettotuotto %" value={data.targetNetYield} onChange={(v) => update("targetNetYield", v)} step="0.1" />
                )}
              </div>

              <div className="mt-4"><Button type="button" onClick={runOfferSimulation}>Simuloi tarjoushinta</Button></div>
              {offerSimulation && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Metric label="Tarjottava velaton hinta enintään" value={eur(offerSimulation.price)} emphasis="good" />
                  <Metric label="Kassavirta tällä hinnalla" value={eur(offerSimulation.result.cashflow)} />
                  <Metric label="Nettotuotto tällä hinnalla" value={pct(offerSimulation.result.netYield)} />
                  <div className={`rounded-2xl border p-4 ${scoreCardTone(offerSimulation.result.scores.total)}`}>
                    <div className="text-xs uppercase tracking-wide opacity-80">Sijoitusarvio tällä hinnalla</div>
                    <div className="mt-1 text-2xl font-bold">{offerSimulation.result.scores.total}/100</div>
                  </div>
                </div>
              )}
              {offerSimulation === null && <p className="mt-3 text-sm text-slate-500">Tulos näyttää korkeimman velattoman hinnan valitun tavoitteen perusteella.</p>}
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-xl font-semibold"><ShieldAlert className="h-5 w-5" /> Analyysi ja riskiliput</div>
              {!canAnalyze ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Täydennä puuttuvat tiedot ennen analyysin tulkintaa. Käyttäjä vastaa itse syöttämiensä tietojen ja valintojensa oikeellisuudesta.
                </div>
              ) : (
                <>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">Sijoittajan yhteenveto</div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{result.investorSummary}</p>
                  </div>

                  <div className="mt-4 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Datalähde: {dataSourceLabel}</div>
                    <div className="mt-1">Tarkista aina yhtiövastikkeet, rahoitusvastikkeen verokohtelu, tontin ehdot, PTS, tehdyt/tulevat remontit sekä realistinen vuokrataso.</div>
                  </div>

                  <div className="mt-4 space-y-5">
                    {result.positives.length > 0 && (
                      <div className="space-y-3">
                        <div className="font-semibold text-slate-900">Vahvuudet</div>
                        {result.positives.map((item, i) => (
                          <div key={i} className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="h-5 w-5 shrink-0" /> {item}</div>
                        ))}
                      </div>
                    )}

                    {(result.dealbreakers.length > 0 || result.riskProfile.items.filter((item) => item.severity === "critical").length > 0) && (
                      <div className="space-y-3">
                        <div className="font-semibold text-rose-900">Kriittiset riskit</div>
                        {result.dealbreakers.map((item, i) => (
                          <div key={`deal-${i}`} className="flex gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {item}</div>
                        ))}
                        {result.riskProfile.items.filter((item) => item.severity === "critical").map((item, i) => (
                          <div key={`critical-${i}`} className={`rounded-2xl border p-3 text-sm ${riskSeverityTone(item.severity)}`}>
                            <div className="mb-1 text-xs font-bold uppercase tracking-wide">{riskSeverityLabel(item.severity)}</div>
                            <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {item.text}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {result.riskProfile.items.filter((item) => item.severity === "info").length > 0 && (
                      <div className="space-y-3">
                        <div className="font-semibold text-slate-900">Huomiot</div>
                        {result.riskProfile.items.filter((item) => item.severity === "info").map((item, i) => (
                          <div key={`info-${i}`} className={`rounded-2xl border p-3 text-sm ${riskSeverityTone(item.severity)}`}>
                            <div className="mb-1 text-xs font-bold uppercase tracking-wide">{riskSeverityLabel(item.severity)}</div>
                            <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {item.text}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(result.riskProfile.items.filter((item) => item.severity === "warning").length > 0 || result.warnings.length > 0) && (
                      <div className="space-y-3">
                        <div className="font-semibold text-amber-900">Varoitukset</div>
                        {result.riskProfile.items.filter((item) => item.severity === "warning").map((item, i) => (
                          <div key={`warning-risk-${i}`} className={`rounded-2xl border p-3 text-sm ${riskSeverityTone(item.severity)}`}>
                            <div className="mb-1 text-xs font-bold uppercase tracking-wide">{riskSeverityLabel(item.severity)}</div>
                            <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {item.text}</div>
                          </div>
                        ))}
                        {result.warnings.map((item, i) => (
                          <div key={`warning-${i}`} className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" /> {item}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                Laskurin antamat analyysit, pisteytykset ja tarjoushintasimulaatiot ovat suuntaa-antavia arvioita eivätkä sijoitusneuvontaa. Käyttäjä vastaa aina itse lopullisesta sijoituspäätöksestään sekä syöttämiensä tietojen oikeellisuudesta.
              </div>
            </Card>
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© asuntosijoituslaskuri.fi</div>
          <div className="flex gap-4">
            <Link href="/kayttoehdot" className="hover:text-slate-900">Käyttöehdot</Link>
            <Link href="/tietosuoja" className="hover:text-slate-900">Tietosuoja</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Card({ children, className = "" }) {
  return <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 ${className}`}>{children}</section>;
}

function Button({ children, onClick, disabled = false, type = "button" }) {
  return <button type={type} disabled={disabled} onClick={onClick} className="inline-flex items-center justify-center rounded-xl bg-[#1F4D3A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173A2C] disabled:opacity-50">{children}</button>;
}

function Input(props) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${props.className || ""}`} />;
}

function Label({ children, help, requiredMissing = false }) {
  return (
    <label className={`flex items-center gap-1 text-sm font-medium ${requiredMissing ? "text-rose-700" : "text-slate-700"}`}>
      {children}
      {requiredMissing && <span className="text-rose-600">*</span>}
      {help && (
        <span className="group relative inline-flex">
          <HelpCircle className="h-3.5 w-3.5 cursor-help text-slate-400" />
          <span className="pointer-events-none absolute left-1/2 top-5 z-20 hidden w-72 -translate-x-1/2 rounded-xl border bg-white p-3 text-xs font-normal leading-5 text-slate-700 shadow-xl group-hover:block">
            {help}
          </span>
        </span>
      )}
    </label>
  );
}

function Grid({ children }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function SectionTitle({ icon, title }) {
  return <div className="flex items-center gap-2 rounded-2xl bg-[#1F4D3A] px-4 py-3 font-semibold text-white">{icon}{title}</div>;
}

function NumberField({ label, value, onChange, step = "1", disabled = false, help, placeholder, requiredMissing = false }) {
  const highlight = requiredMissing ? "border-rose-300 bg-rose-50 placeholder:text-rose-400 focus-visible:ring-rose-300" : "";
  return (
    <div className={`space-y-2 ${disabled ? "opacity-50" : ""}`}>
      <Label help={help} requiredMissing={requiredMissing}>{label}</Label>
      <Input disabled={disabled} type="number" step={step} value={value} placeholder={requiredMissing ? "Täytä tämä kenttä" : (placeholder || "Syötä arvo")} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className={highlight} />
      {requiredMissing && <p className="text-xs font-medium text-rose-600">Pakollinen tieto puuttuu.</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, help, placeholder, requiredMissing = false }) {
  const highlight = requiredMissing ? "border-rose-300 bg-rose-50 text-rose-900 focus-visible:ring-rose-300" : "border-slate-200 bg-white";
  return (
    <div className="space-y-2">
      <Label help={help} requiredMissing={requiredMissing}>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${highlight}`}>
        <option value="">{requiredMissing ? "Valinta vaaditaan" : (placeholder || "Valinta vaaditaan")}</option>
        {options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
      </select>
      {requiredMissing && <p className="text-xs font-medium text-rose-600">Pakollinen valinta puuttuu.</p>}
    </div>
  );
}

function SliderField({ label, value, onChange, left, right, help, requiredMissing = false }) {
  return (
    <div className={`space-y-3 rounded-2xl border p-4 ${requiredMissing ? "border-rose-300 bg-rose-50" : "bg-white"}`}>
      <div className="flex items-center justify-between"><Label help={help} requiredMissing={requiredMissing}>{label}</Label><span className={`rounded-full px-3 py-1 text-sm font-semibold ${requiredMissing ? "bg-rose-100 text-rose-700" : "bg-slate-100"}`}>{value || "–"}/5</span></div>
      <input type="range" value={value || 3} min={1} max={5} step={1} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      <div className="flex justify-between text-xs text-slate-500"><span>{left}</span><span>{right}</span></div>
      {requiredMissing && <p className="text-xs font-medium text-rose-600">Pakollinen arvio puuttuu.</p>}
    </div>
  );
}

function Metric({ label, value, emphasis }) {
  const cls = emphasis === "good" ? "text-emerald-700" : emphasis === "warn" ? "text-amber-600" : emphasis === "bad" ? "text-rose-700" : "text-slate-900";
  return <div className="rounded-2xl border bg-white p-4"><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className={`mt-1 text-2xl font-bold ${cls}`}>{value}</div></div>;
}

function ScoreBar({ label, value, weight }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{label}</span><span className="text-slate-500">{value}/100 · paino {weight}</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1F4D3A]" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

// Layout optimized for single-column investment analysis flow.
