"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Banknote, Building2, Calculator, CheckCircle2, HelpCircle, Home, Link as LinkIcon, ShieldAlert, TrendingUp } from "lucide-react";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function eur(value) {
  if (!Number.isFinite(value)) return "0 €";
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function pct(value) {
  if (!Number.isFinite(value)) return "0,0 %";
  return new Intl.NumberFormat("fi-FI", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value / 100);
}

const fieldLabels = {
  debtFreePrice: "velaton hinta",
  sellingPrice: "myyntihinta",
  debtShare: "velkaosuus",
  hasDebtShare: "velkaosuuden tieto",
  rent: "vuokra",
  maintenanceFee: "hoitovastike",
  financingFee: "rahoitusvastike",
  size: "pinta-ala",
  buildYear: "rakennusvuosi",
  buildingType: "talotyyppi",
  heatingType: "lämmitysmuoto",
  landType: "tontti",
  upcomingPipeRenovation: "putkiremonttitieto",
  upcomingRoofRenovation: "kattoremonttitieto",
  upcomingFacadeRenovation: "julkisivuremonttitieto",
  upcomingBalconyRenovation: "parvekeremonttitieto",
  upcomingWindowRenovation: "ikkunaremonttitieto",
  upcomingElevatorRenovation: "hissiremonttitieto",
  oldRentalBuilding: "vanha vuokratalo -tieto",
};

function formatFoundFields(keys) {
  const labels = keys.map((key) => fieldLabels[key]).filter(Boolean);
  if (labels.length === 0) return "URL-haku onnistui, mutta kohteesta ei tunnistettu vielä varmoja laskentakenttiä. Täydennä puuttuvat tiedot käsin.";
  return `URL-haku onnistui. Kohteesta tunnistettiin: ${labels.join(", ")}. Tarkista silti luvut ennen analyysin käyttöä.`;
}

const initial = {
  url: "",
  buildingType: "apartment",
  buildYear: 1990,
  debtFreePrice: 118000,
  debtShare: 23000,
  ghostDebt: 0,
  rent: 720,
  maintenanceFee: 230,
  financingFee: 120,
  hasDebtShare: "yes",
  heatingType: "district",
  size: 45,
  ownCapital: 25000,
  interestRate: 4.2,
  loanYears: 25,
  repaymentType: "annuity",
  collateralValuePct: 80,
  landType: "own",
  yearsToLandLeaseRenewal: 15,
  condition: 3,
  housingCompanySize: "medium",
  oldRentalBuilding: "no",
  ownershipConcentration: "normal",
  housingCompanyFinancials: "good",
  sewerStatus: "unknown",
  waterPipeStatus: "unknown",
  heatingPipeStatus: "unknown",
  facadeRisk: "medium",
  roofRisk: "medium",
  upcomingPipeRenovation: "none",
  upcomingRoofRenovation: "none",
  upcomingFacadeRenovation: "none",
  upcomingBalconyRenovation: "none",
  upcomingWindowRenovation: "none",
  upcomingElevatorRenovation: "none",
  locationDemand: 4,
  liquidity: 3,
  locationRisk: "medium",
  dataSource: "manual",
  parsedNotice: "",
};

const renovationCostMidpoints = {
  none: 0,
  full_line: 700,
  pipe_rehab: 375,
  roof: 60,
  facade: 225,
  balcony: 125,
  windows: 100,
  elevator_modernization: 75,
  elevator_new: 160,
};

const renovationCostLabels = {
  full_line: "Täydellinen linjasaneeraus",
  pipe_rehab: "Putkien kunnostus",
  roof: "Katto",
  facade: "Julkisivu",
  balcony: "Parveke",
  windows: "Ikkunat",
  elevator_modernization: "Hissin modernisointi",
  elevator_new: "Hissin rakentaminen",
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
  const selected = [
    data.upcomingPipeRenovation,
    data.upcomingRoofRenovation,
    data.upcomingFacadeRenovation,
    data.upcomingBalconyRenovation,
    data.upcomingWindowRenovation,
    data.upcomingElevatorRenovation,
  ];
  const items = selected
    .filter((key) => key && key !== "none")
    .map((key) => ({
      key,
      label: renovationCostLabels[key],
      eurPerM2: renovationCostMidpoints[key],
      estimatedShare: Math.round((renovationCostMidpoints[key] || 0) * data.size),
    }));
  return { items, total: items.reduce((sum, item) => sum + item.estimatedShare, 0) };
}

function analyzeCore(data) {
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

  [data.sewerStatus, data.waterPipeStatus, data.heatingPipeStatus].forEach((status) => {
    if (status === "coming") companyScore -= 14;
    if (status === "not_done") companyScore -= 8;
    if (status === "done") companyScore += 5;
  });

  if (data.facadeRisk === "high") companyScore -= 14;
  if (data.roofRisk === "high") companyScore -= 14;
  if (data.facadeRisk === "low") companyScore += 5;
  if (data.roofRisk === "low") companyScore += 5;
  if (data.ghostDebt > 0) companyScore -= Math.min(20, Math.round(data.ghostDebt / 2500));
  if (renovationReserve.total > 0) companyScore -= Math.min(25, Math.round(renovationReserve.total / 3000));
  companyScore = clamp(companyScore);

  const conditionScore = clamp(data.condition * 18 + (data.condition >= 4 ? 10 : 0));
  let locationScore = clamp(data.locationDemand * 17 + data.liquidity * 10);
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

  const total = Math.round(cashflowScore * 0.35 + companyScore * 0.25 + conditionScore * 0.15 + locationScore * 0.15 + financeScore * 0.1);
  const collateralValue = purchasePrice * (data.collateralValuePct / 100);
  const requiredOwnCashOrExtraCollateral = Math.max(0, purchasePrice - collateralValue);

  const positives = [];
  const warnings = [];

  if (cashflow >= 100) positives.push("Kassavirta ylittää 100 €/kk.");
  else if (cashflow >= 0) warnings.push("Kassavirta on positiivinen, mutta alle 100 €/kk.");
  else warnings.push("Kassavirta jää negatiiviseksi nykyisillä rahoitusoletuksilla.");

  if (netYield >= 6) positives.push("Nettovuokratuotto on asuntosijoittajan näkökulmasta vahva.");
  else if (netYield < 4.5) warnings.push("Nettovuokratuotto on matala suhteessa todelliseen arvioituun velattomaan hintaan.");
  if (data.landType === "own") positives.push("Oma tontti pienentää pitkän aikavälin kustannusriskiä.");
  if (data.ghostDebt > 0) warnings.push(`Jyvittämätön remonttiosuus kasvattaa todellista velatonta hintaa noin ${eur(data.ghostDebt)}.`);
  if (renovationReserve.total > 0) warnings.push(`Valittujen taloyhtiöremonttien karkea remonttivara on noin ${eur(renovationReserve.total)}.`);
  if (requiredOwnCashOrExtraCollateral <= data.ownCapital) positives.push("Sijoitettu oma pääoma näyttää riittävän valitulla pankin vakuusarvo-oletuksella.");
  if (data.housingCompanyFinancials === "good") positives.push("Taloyhtiön talous on arvioitu hyväksi.");
  if (cashflow < 0 || netYield < 4.5) warnings.push("Kokeile pienempää velatonta tarjoushintaa.");

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
    scores: {
      cashflow: cashflowScore,
      company: Math.round(companyScore),
      condition: Math.round(conditionScore),
      location: Math.round(locationScore),
      finance: Math.round(financeScore),
      total,
    },
    positives,
    warnings,
    verdict,
  };
}

function buildRiskProfile(data, base) {
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
  if (data.upcomingPipeRenovation === "full_line") {
    dealbreakers.push("Täydellinen linjasaneeraus on valittuna tulevaksi remontiksi.");
    add("critical", "Täydellinen linjasaneeraus voi muuttaa kohteen todellista hankintahintaa olennaisesti.");
  }
  if (base.renovationReserve.total > data.debtFreePrice * 0.2) {
    dealbreakers.push("Remonttivara on yli 20 % velattomasta hinnasta.");
    add("critical", `Remonttivara on suuri suhteessa velattomaan hintaan: ${eur(base.renovationReserve.total)}.`);
  }
  if (base.cashflow < 0 && base.netYield < 4.5) add("critical", "Negatiivinen kassavirta ja matala nettovuokratuotto heikentävät kohteen sijoituslogiikkaa.");
  if (data.locationRisk === "high") add("critical", "Korkea sijaintiriski.");
  if (data.housingCompanyFinancials === "weak") add("critical", "Taloyhtiön talous vaikuttaa heikolta.");
  if (base.requiredOwnCashOrExtraCollateral > data.ownCapital) add("warning", `Sijoitettu oma pääoma ei välttämättä riitä. Vaadittu oma raha tai lisävakuus on arviolta ${eur(base.requiredOwnCashOrExtraCollateral)}.`);
  if (data.housingCompanySize === "small") add("warning", "Pieni taloyhtiö voi tarkoittaa suurempaa kuluriskiä per asunto.");
  if (data.condition <= 2) add("warning", "Asunnon kunto vaatii todennäköisesti lisäbudjettia.");
  if (data.oldRentalBuilding === "yes") add("warning", "Vanha vuokratalo voi heikentää jälleenmyytävyyttä.");
  if (data.heatingType === "electric") add("warning", "Sähkölämmitys voi heikentää vuokrattavuutta käyttökulujen vuoksi.");
  if (data.landType === "leased_city") add("warning", "Kaupungin/kunnan vuokratontti tuo uusimisriskin.");
  if (data.buildYear < 1994) add("info", "Mahdollinen asbestiriski rakennusvuoden perusteella.");
  if (data.buildingType !== "apartment" && data.buildYear >= 1960 && data.buildYear <= 1985) add("info", "Mahdollinen valesokkeli-/piilosokkeliriski.");

  base.renovationReserve.items.forEach((item) => {
    add(item.key === "full_line" ? "critical" : "warning", `${item.label}: karkea arvio noin ${eur(item.estimatedShare)} tälle huoneistolle (${item.eurPerM2} €/m²).`);
  });

  return { items, dealbreakers };
}

function buildInvestorSummary(data, base, riskProfile) {
  if (riskProfile.dealbreakers.length > 0) return "Kohde vaatii erityistä varovaisuutta. Suurimmat ongelmat liittyvät kassavirran, remonttien, tontin tai sijainnin yhdistelmään.";
  if (base.scores.total >= 70 && base.cashflow >= 100) return "Kohde sopii kassavirtapainotteiselle asuntosijoittajalle nykyisillä oletuksilla.";
  if (base.cashflow < 0) return "Nykyisellä velattomalla hinnalla kohde ei vielä näytä riittävän vahvalta. Testaa alempaa tarjoushintaa.";
  return "Kohde on jatkoselvityskelpoinen, mutta luvut pitää varmistaa ilmoituksesta ja taloyhtiöaineistosta.";
}

function simulateOfferPrices(data) {
  const current = data.debtFreePrice;
  const min = Math.max(10000, Math.round((current * 0.7) / 1000) * 1000);
  const max = Math.round((current * 1.05) / 1000) * 1000;
  const step = Math.max(1000, Math.round((max - min) / 30 / 1000) * 1000);
  const rows = [];
  for (let price = min; price <= max; price += step) {
    const scenario = analyzeCore({ ...data, debtFreePrice: price });
    rows.push({ price, cashflow: scenario.cashflow, netYield: scenario.netYield, score: scenario.scores.total });
  }
  return {
    positiveCashflowAt: rows.find((row) => row.cashflow >= 0)?.price || null,
    targetCashflowAt: rows.find((row) => row.cashflow >= 100)?.price || null,
    targetYieldAt: rows.find((row) => row.netYield >= 6)?.price || null,
    greenScoreAt: rows.find((row) => row.score >= 70)?.price || null,
  };
}

function analyze(data) {
  const base = analyzeCore(data);
  const riskProfile = buildRiskProfile(data, base);
  return {
    ...base,
    riskProfile,
    dealbreakers: riskProfile.dealbreakers,
    investorSummary: buildInvestorSummary(data, base, riskProfile),
    priceSimulation: simulateOfferPrices(data),
  };
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
  const result = useMemo(() => analyze(data), [data]);

  const update = (key, value) => {
    setData((prev) => {
      if (key === "hasDebtShare" && value === "no") return { ...prev, hasDebtShare: value, debtShare: 0, financingFee: 0 };
      if (key === "landType" && value === "own") return { ...prev, landType: value, yearsToLandLeaseRenewal: 0 };
      return { ...prev, [key]: value };
    });
  };

  const parseListingUrl = async () => {
    const url = data.url.trim();
    if (!url) {
      setData((prev) => ({ ...prev, parsedNotice: "Liitä ensin Etuovi- tai Oikotie-linkki." }));
      return;
    }

    setIsParsingUrl(true);
    setData((prev) => ({ ...prev, parsedNotice: "Haetaan kohteen tietoja..." }));

    try {
      const response = await fetch(`/api/parse-listing?url=${encodeURIComponent(url)}`);
      const contentType = response.headers.get("content-type") || "";
      const responseText = await response.text();

      if (!contentType.includes("application/json")) throw new Error("/api/parse-listing ei palauttanut JSONia.");

      const payload = JSON.parse(responseText);
      if (!response.ok) throw new Error(payload?.error || "URL-haku ei saanut ilmoitusta luettua.");

      const parsed = payload.fields || {};
      if (!parsed || Object.keys(parsed).length === 0) throw new Error("URL-haku haki sivun, mutta ei löytänyt laskentakenttiä.");

      setData((prev) => ({
        ...prev,
        ...parsed,
        url,
        dataSource: "url-parser",
        parsedNotice: formatFoundFields(Object.keys(parsed)),
      }));
    } catch (error) {
      setData((prev) => ({
        ...prev,
        parsedNotice: `URL-haku ei onnistunut: ${error.message}. Tarkista linkki tai täydennä luvut käsin.`,
      }));
    } finally {
      setIsParsingUrl(false);
    }
  };

  const scoreColor = result.scores.total >= 70 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : result.scores.total >= 55 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-rose-100 text-rose-800 border-rose-200";
  const cashflowTone = result.cashflow < 0 ? "bad" : result.cashflow < 100 ? "warn" : "good";
  const dataSourceLabel = data.dataSource === "url-parser" ? "URL-haulla haettu" : "Käsin syötetyt tiedot";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm text-slate-600 shadow-sm">
              <Home className="h-4 w-4" /> asuntosijoituslaskuri.fi
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">Sijoitusasunnon analyysi</h1>
            <p className="mt-2 max-w-2xl text-slate-600">URL-haku, kassavirta, todellinen velaton hinta, riskiliput ja tarjoushintasimulaattori.</p>
          </div>
          <Card className={scoreColor}>
            <div className="text-sm font-medium">Sijoitusarvio</div>
            <div className="mt-1 flex items-end gap-2">
              <div className="text-5xl font-bold">{result.scores.total}</div>
              <div className="pb-2 text-lg">/100</div>
            </div>
            <div className="mt-2 font-semibold">{result.verdict}</div>
          </Card>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <div className="space-y-6">
              <SectionTitle icon={<Calculator className="h-5 w-5" />} title="Kohteen tiedot" />

              <div className="space-y-3 rounded-3xl border bg-slate-50 p-4">
                <Label help="Liitä Etuovi- tai Oikotie-kohdelinkki. Työkalu yrittää hakea ilmoituksesta keskeiset laskentatiedot automaattisesti.">Etuovi/Oikotie-linkki</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={data.url} onChange={(e) => update("url", e.target.value)} placeholder="Liitä Etuovi- tai Oikotie-linkki" />
                  <Button type="button" onClick={parseListingUrl} disabled={isParsingUrl}>
                    <LinkIcon className="mr-2 h-4 w-4" /> {isParsingUrl ? "Haetaan..." : "Hae tiedot"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">Jos kaikkia tietoja ei löydy automaattisesti, täydennä puuttuvat kentät käsin.</p>
                {data.parsedNotice && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">{data.parsedNotice}</div>}
              </div>

              <SectionTitle icon={<Building2 className="h-5 w-5" />} title="Rakennus ja taloyhtiö" />
              <Grid>
                <SelectField label="Talotyyppi" help="Valitse ostokohteen tyyppi. Talotyyppi vaikuttaa remonttiriskeihin, kulurakenteeseen ja jälleenmyytävyyteen." value={data.buildingType} onChange={(v) => update("buildingType", v)} options={[["apartment", "Kerrostalo"], ["terraced", "Rivitalo"], ["loft", "Luhtitalo"]]} />
                <NumberField label="Rakennusvuosi" help="Rakennusvuosi auttaa arvioimaan tulevia remontteja, rakennusteknisiä riskejä ja asbestiriskiä." value={data.buildYear} onChange={(v) => update("buildYear", v)} />
                <SelectField label="Lämmitys" help="Lämmitysmuoto vaikuttaa vuokrattavuuteen, käyttökuluihin ja ostajakysyntään." value={data.heatingType} onChange={(v) => update("heatingType", v)} options={[["electric", "Suora sähkö"], ["district", "Kaukolämpö"], ["geothermal", "Maalämpö"]]} />
                <SelectField label="Taloyhtiön koko" help="Pienessä yhtiössä isot remontit voivat kohdistua harvemmille osakkaille. Iso yhtiö voi hajauttaa riskiä." value={data.housingCompanySize} onChange={(v) => update("housingCompanySize", v)} options={[["small", "Pieni"], ["medium", "Keskikokoinen"], ["large", "Iso"]]} />
                <SelectField label="Taloyhtiön talous" help="Arvio taloyhtiön maksuvalmiudesta, vastikepaineesta ja yleisestä taloudellisesta tilanteesta." value={data.housingCompanyFinancials} onChange={(v) => update("housingCompanyFinancials", v)} options={[["good", "Hyvä"], ["average", "Kohtalainen / ei tiedossa"], ["weak", "Heikko"]]} />
                <SelectField label="Omistuspohja" help="Keskittynyt omistuspohja voi lisätä päätöksenteko- ja vastikeriskiä." value={data.ownershipConcentration} onChange={(v) => update("ownershipConcentration", v)} options={[["normal", "Hajautunut / normaali"], ["high", "Keskittynyt"]]} />
                <SelectField label="Tontti" help="Oma tontti on yleensä ennustettavin. Vuokratontissa kannattaa tarkistaa vuokra-aika ja uusimisehdot." value={data.landType} onChange={(v) => update("landType", v)} options={[["own", "Oma tontti"], ["leased_city", "Vuokratontti: kaupunki/kunta"], ["leased_private", "Vuokratontti: yksityinen"]]} />
                <NumberField label="Vuosia tontinvuokran uusimiseen" help="Mitä lähempänä uusiminen on, sitä suurempi riski vastikkeen tai tontinvuokran nousulle." value={data.yearsToLandLeaseRenewal} onChange={(v) => update("yearsToLandLeaseRenewal", v)} disabled={data.landType === "own"} />
                <SelectField label="Vanha vuokratalo?" help="Vanha vuokratalo voi vaikuttaa jälleenmyytävyyteen ja ostajakysyntään joillakin alueilla." value={data.oldRentalBuilding} onChange={(v) => update("oldRentalBuilding", v)} options={[["no", "Ei"], ["yes", "Kyllä"]]} />
              </Grid>

              <SectionTitle icon={<ShieldAlert className="h-5 w-5" />} title="Remonttivarat" />
              <Grid>
                <SelectField label="Putkiremontti" help="Täysi linjasaneeraus on yleensä merkittävämpi kustannus kuin putkien kunnostus tai sukitus." value={data.upcomingPipeRenovation} onChange={(v) => update("upcomingPipeRenovation", v)} options={[["none", "Ei tiedossa"], ["full_line", "Täydellinen linjasaneeraus, 500–900 €/m²"], ["pipe_rehab", "Putkien kunnostus, 250–500 €/m²"]]} />
                <SelectField label="Katto" help="Kattoremontti voi vaikuttaa yhtiölainaan ja vastikkeisiin." value={data.upcomingRoofRenovation} onChange={(v) => update("upcomingRoofRenovation", v)} options={[["none", "Ei tiedossa"], ["roof", "Katto, 40–80 €/m²"]]} />
                <SelectField label="Julkisivu" help="Julkisivuremontti on monissa vanhemmissa taloyhtiöissä yksi isoista tulevista kulueristä." value={data.upcomingFacadeRenovation} onChange={(v) => update("upcomingFacadeRenovation", v)} options={[["none", "Ei tiedossa"], ["facade", "Julkisivu, 150–300 €/m²"]]} />
                <SelectField label="Parveke" help="Parvekeremontti voi olla merkittävä kuluerä erityisesti vanhemmissa kerrostaloissa." value={data.upcomingBalconyRenovation} onChange={(v) => update("upcomingBalconyRenovation", v)} options={[["none", "Ei tiedossa"], ["balcony", "Parveke, 50–200 €/m²"]]} />
                <SelectField label="Ikkunat" help="Ikkunaremontti voi vaikuttaa asumismukavuuteen, energiatehokkuuteen ja yhtiön kustannuksiin." value={data.upcomingWindowRenovation} onChange={(v) => update("upcomingWindowRenovation", v)} options={[["none", "Ei tiedossa"], ["windows", "Ikkunat, 80–120 €/m²"]]} />
                <SelectField label="Hissi" help="Hissin modernisointi tai rakentaminen voi aiheuttaa kustannuksia, jotka eivät aina jakaudu suoraan neliöiden mukaan." value={data.upcomingElevatorRenovation} onChange={(v) => update("upcomingElevatorRenovation", v)} options={[["none", "Ei tiedossa"], ["elevator_modernization", "Hissin modernisointi, 60–90 €/hissi"], ["elevator_new", "Hissin rakentaminen, 125–200 €/hissi"]]} />
              </Grid>

              <SectionTitle icon={<Banknote className="h-5 w-5" />} title="Talous" />
              <Grid>
                <NumberField label="Velaton tarjoushinta" help="Hinta, jolla arvioit kohdetta. Voit testata eri tarjoushintoja ja nähdä vaikutuksen kassavirtaan." value={data.debtFreePrice} onChange={(v) => update("debtFreePrice", v)} />
                <NumberField label="Vuokra / kk" help="Lisää tähän vain varsinainen vuokra ilman vesimaksuja, sähköä tai muita läpilaskutettavia eriä." value={data.rent} onChange={(v) => update("rent", v)} />
                <NumberField label="Hoitovastike / kk" help="Taloyhtiölle maksettava hoitovastike. Tämä vähennetään vuokratuotosta." value={data.maintenanceFee} onChange={(v) => update("maintenanceFee", v)} />
                <SelectField label="Onko velkaosuutta?" help="Valitse kyllä, jos huoneistolla on taloyhtiölainaa tai rahoitusvastiketta." value={data.hasDebtShare} onChange={(v) => update("hasDebtShare", v)} options={[["yes", "Kyllä"], ["no", "Ei"]]} />
                {data.hasDebtShare === "yes" && <NumberField label="Velkaosuus" help="Huoneistolle kohdistuva taloyhtiölainan osuus." value={data.debtShare} onChange={(v) => update("debtShare", v)} />}
                {data.hasDebtShare === "yes" && <NumberField label="Rahoitusvastike / kk" help="Taloyhtiölainasta maksettava kuukausittainen rahoitusvastike." value={data.financingFee} onChange={(v) => update("financingFee", v)} />}
                <NumberField label="Jyvittämätön remonttiosuus" help="Lisää tähän tiedossa oleva tai arvioitu tuleva remonttiosuus, jota ei vielä näy velattomassa hinnassa." value={data.ghostDebt} onChange={(v) => update("ghostDebt", v)} />
              </Grid>

              <SectionTitle icon={<Banknote className="h-5 w-5" />} title="Rahoitus" />
              <Grid>
                <NumberField label="Sijoitettu oma pääoma" help="Oma raha, jonka aiot sijoittaa tähän kohteeseen." value={data.ownCapital} onChange={(v) => update("ownCapital", v)} />
                <NumberField label="Korko %" help="Arvio lainan kokonaiskorosta." value={data.interestRate} onChange={(v) => update("interestRate", v)} step="0.1" />
                <NumberField label="Laina-aika vuosina" help="Laina-aika vaikuttaa kuukausierään ja kassavirtaan." value={data.loanYears} onChange={(v) => update("loanYears", v)} />
                <SelectField label="Lyhennystyyppi" help="Annuiteetti on yleinen lainamalli. Korot vain -vaihtoehto näyttää kassavirran lyhennysvapaan aikana." value={data.repaymentType} onChange={(v) => update("repaymentType", v)} options={[["annuity", "Annuiteetti"], ["equal_principal", "Tasalyhennys"], ["interest_only", "Korot vain"]]} />
                <SelectField label="Pankin vakuusarvo" help="Arvio siitä, kuinka suuren osuuden ostokohteesta pankki hyväksyy vakuudeksi." value={String(data.collateralValuePct)} onChange={(v) => update("collateralValuePct", Number(v))} options={[["70", "70 %"], ["80", "80 %"], ["90", "90 %"]]} />
              </Grid>

              <SectionTitle icon={<TrendingUp className="h-5 w-5" />} title="Vuokrattavuus ja exit" />
              <SelectField label="Sijaintiriski" help="Matala: haluttu sijainti, isot työllistäjät tai oppilaitokset lähellä. Keskitaso: elinvoimainen pieni tai keskisuuri kunta. Korkea: muuttotappiopaikkakunta tai yhden suuren työnantajan varassa." value={data.locationRisk} onChange={(v) => update("locationRisk", v)} options={[["low", "Matala – haluttu sijainti"], ["medium", "Keskitaso – elinvoimainen pieni/keskisuuri kunta"], ["high", "Korkea – muuttotappio tai yhden työllistäjän riski"]]} />
              <SliderField label="Asunnon kunto" help="Arvioi asunnon nykykuntoa vuokrauksen ja mahdollisen remonttitarpeen näkökulmasta." value={data.condition} onChange={(v) => update("condition", v)} left="Heikko" right="Erinomainen" />
              <SliderField label="Vuokrakysyntä alueella" help="Arvioi kuinka helposti asunto löytyy vuokralaiselle realistisella vuokratasolla." value={data.locationDemand} onChange={(v) => update("locationDemand", v)} left="Heikko" right="Vahva" />
              <SliderField label="Jälleenmyytävyys / likviditeetti" help="Arvioi kuinka nopeasti ja helposti kohde olisi myytävissä eteenpäin." value={data.liquidity} onChange={(v) => update("liquidity", v)} left="Hidas" right="Nopea" />
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-2 text-xl font-semibold"><TrendingUp className="h-5 w-5" /> Talousluvut</div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Metric label="Kassavirta / kk" value={eur(result.cashflow)} emphasis={cashflowTone} />
                <Metric label="Nettovuokratuotto" value={pct(result.netYield)} />
                <Metric label="Bruttovuokratuotto" value={pct(result.grossYield)} />
                <Metric label="Myyntihinta" value={eur(result.purchasePrice)} />
                <Metric label="Ilmoituksen velaton hinta" value={eur(data.debtFreePrice)} />
                <Metric label="Todellinen arvioitu velaton hinta" value={eur(result.adjustedDebtFreePrice)} emphasis={result.adjustedDebtFreePrice > data.debtFreePrice ? "warn" : undefined} />
                <Metric label="Remonttivara" value={eur(result.renovationReserve.total)} emphasis={result.renovationReserve.total > 0 ? "warn" : undefined} />
                <Metric label="Lainan kuukausierä" value={eur(result.loanPayment)} />
                <Metric label="Kulut yhteensä / kk" value={eur(result.monthlyCosts)} />
                <Metric label="Pankin vakuusarvo" value={eur(result.collateralValue)} />
                <Metric label="Vaadittu oma raha / lisävakuus" value={eur(result.requiredOwnCashOrExtraCollateral)} emphasis={result.requiredOwnCashOrExtraCollateral > data.ownCapital ? "bad" : "good"} />
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-xl font-semibold"><Banknote className="h-5 w-5" /> Tarjoushintasimulaattori</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Metric label="Kassavirta ≥ 0 €/kk hinnalla" value={result.priceSimulation.positiveCashflowAt ? eur(result.priceSimulation.positiveCashflowAt) : "Ei tällä haarukalla"} />
                <Metric label="Kassavirta ≥ 100 €/kk hinnalla" value={result.priceSimulation.targetCashflowAt ? eur(result.priceSimulation.targetCashflowAt) : "Ei tällä haarukalla"} />
                <Metric label="Nettotuotto ≥ 6 % hinnalla" value={result.priceSimulation.targetYieldAt ? eur(result.priceSimulation.targetYieldAt) : "Ei tällä haarukalla"} />
                <Metric label="Pisteet ≥ 70 hinnalla" value={result.priceSimulation.greenScoreAt ? eur(result.priceSimulation.greenScoreAt) : "Ei tällä haarukalla"} />
              </div>
            </Card>

            <Card>
              <div className="text-xl font-semibold">Pisteiden jakauma</div>
              <div className="mt-5 space-y-4">
                <ScoreBar label="Kassavirta & tuotto" value={result.scores.cashflow} weight="35 %" />
                <ScoreBar label="Taloyhtiö & remontit" value={result.scores.company} weight="25 %" />
                <ScoreBar label="Asunnon kunto" value={result.scores.condition} weight="15 %" />
                <ScoreBar label="Sijainti & kysyntä" value={result.scores.location} weight="15 %" />
                <ScoreBar label="Rahoitus" value={result.scores.finance} weight="10 %" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-xl font-semibold"><ShieldAlert className="h-5 w-5" /> Analyysi ja riskiliput</div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">Sijoittajan yhteenveto</div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{result.investorSummary}</p>
              </div>

              <div className="mt-4 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">Datalähde: {dataSourceLabel}</div>
                <div className="mt-1">Tarkista aina yhtiövastikkeet, rahoitusvastikkeen verokohtelu, tontin ehdot, PTS, tehdyt/tulevat remontit sekä realistinen vuokrataso.</div>
              </div>

              {result.dealbreakers.length > 0 && (
                <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-4">
                  <div className="mb-2 font-semibold text-rose-900">Mahdolliset dealbreakerit</div>
                  <div className="space-y-2">
                    {result.dealbreakers.map((item, i) => <div key={i} className="flex gap-2 text-sm text-rose-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {item}</div>)}
                  </div>
                </div>
              )}

              {result.riskProfile.items.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="font-semibold text-slate-900">Riskiliput tärkeysjärjestyksessä</div>
                  {result.riskProfile.items.map((item, i) => (
                    <div key={i} className={`rounded-2xl border p-3 text-sm ${riskSeverityTone(item.severity)}`}>
                      <div className="mb-1 text-xs font-bold uppercase tracking-wide">{riskSeverityLabel(item.severity)}</div>
                      <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {item.text}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-3">
                {result.positives.map((item, i) => <div key={i} className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="h-5 w-5 shrink-0" /> {item}</div>)}
                {result.warnings.map((item, i) => <div key={i} className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" /> {item}</div>)}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({ children, className = "" }) {
  return <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 ${className}`}>{children}</section>;
}

function Button({ children, onClick, disabled = false, type = "button" }) {
  return <button type={type} disabled={disabled} onClick={onClick} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">{children}</button>;
}

function Input(props) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${props.className || ""}`} />;
}

function Label({ children, help }) {
  return (
    <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
      {children}
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
  return <div className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">{icon}{title}</div>;
}

function NumberField({ label, value, onChange, step = "1", disabled = false, help }) {
  return (
    <div className={`space-y-2 ${disabled ? "opacity-50" : ""}`}>
      <Label help={help}>{label}</Label>
      <Input disabled={disabled} type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, help }) {
  return (
    <div className="space-y-2">
      <Label help={help}>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
        {options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
      </select>
    </div>
  );
}

function SliderField({ label, value, onChange, left, right, help }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between"><Label help={help}>{label}</Label><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{value}/5</span></div>
      <input type="range" value={value} min={1} max={5} step={1} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      <div className="flex justify-between text-xs text-slate-500"><span>{left}</span><span>{right}</span></div>
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
      <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{ width: `${value}%` }} /></div>
    </div>
  );
}
