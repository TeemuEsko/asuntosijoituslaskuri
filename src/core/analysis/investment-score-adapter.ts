import type { RepairHistoryAssessment } from "../rules/repair-history";
import { clampInvestmentScore, getInvestmentRating, type InvestmentOverallScoreData, type RatingSubScore } from "./investment-overall-score.ts";

export type InvestmentScoreSource = {
  debtFreePrice?: number;
  currentRentMonthly?: number;
  maintenanceFeeMonthly?: number;
  financingFeeMonthly?: number;
  companyLoanShare?: number;
  repairHistory?: RepairHistoryAssessment;
};

function subScore(score: number, summary: string): RatingSubScore {
  const normalized = Math.round(clampInvestmentScore(score));
  return { score: normalized, grade: getInvestmentRating(normalized).grade, summary };
}

export function adaptInvestmentScore(source: InvestmentScoreSource): InvestmentOverallScoreData {
  const missingFactors: string[] = [];
  const positiveFactors: string[] = [];
  const warningFactors: string[] = [];
  const price = source.debtFreePrice && source.debtFreePrice > 0 ? source.debtFreePrice : undefined;
  const rent = source.currentRentMonthly && source.currentRentMonthly > 0 ? source.currentRentMonthly : undefined;
  const maintenance = typeof source.maintenanceFeeMonthly === "number" ? source.maintenanceFeeMonthly : undefined;
  const financingFee = typeof source.financingFeeMonthly === "number" ? source.financingFeeMonthly : undefined;

  if (!price) missingFactors.push("Velaton hinta puuttuu");
  if (!rent) missingFactors.push("Kuukausivuokra puuttuu");
  if (maintenance === undefined) missingFactors.push("Hoitovastike puuttuu");

  const grossYield = price && rent ? rent * 12 / price * 100 : undefined;
  const yieldScore = grossYield === undefined ? 60 : clampInvestmentScore(35 + grossYield * 7);
  if (grossYield !== undefined && grossYield >= 6) positiveFactors.push("Vahva vuokratuotto");
  if (grossYield !== undefined && grossYield < 4) warningFactors.push("Vuokratuotto jää matalaksi suhteessa hintaan");

  const monthlyCashFlowBeforeLoan = rent === undefined ? undefined : rent - (maintenance ?? 0) - (financingFee ?? 0);
  const cashFlowScore = monthlyCashFlowBeforeLoan === undefined || rent === undefined ? 60 : clampInvestmentScore(50 + monthlyCashFlowBeforeLoan / rent * 45);
  if (monthlyCashFlowBeforeLoan !== undefined && monthlyCashFlowBeforeLoan > 0) positiveFactors.push("Vuokra kattaa ilmoitetut yhtiövastikkeet");
  if (monthlyCashFlowBeforeLoan !== undefined && monthlyCashFlowBeforeLoan <= 0) warningFactors.push("Kassavirta ennen pankkilainaa ei ole positiivinen");

  const repairScore = source.repairHistory?.severity === "medium" ? 48 : source.repairHistory?.status === "major_recognized" ? 82 : source.repairHistory ? 65 : 60;
  if (source.repairHistory?.status === "major_recognized") positiveFactors.push("Laajoja taloyhtiökorjauksia on tunnistettu tehdyiksi");
  if (source.repairHistory?.severity === "medium") warningFactors.push("Taloyhtiön suurten korjausten tilanne vaatii tarkistamista");
  if (!source.repairHistory || source.repairHistory.confidence === "low") missingFactors.push("Taloyhtiön korjaushistoria on tarkistettava lähdeasiakirjoista");

  const loanRatio = price && typeof source.companyLoanShare === "number" ? source.companyLoanShare / price : undefined;
  const financingScore = loanRatio === undefined ? 60 : clampInvestmentScore(90 - loanRatio * 100);
  if (loanRatio !== undefined && loanRatio <= 0.15) positiveFactors.push("Yhtiölainaosuus on maltillinen");
  if (loanRatio !== undefined && loanRatio >= 0.5) warningFactors.push("Yhtiölainaosuus on suuri suhteessa velattomaan hintaan");
  if (loanRatio === undefined) missingFactors.push("Rahoitusrakenteen arviointi on puutteellinen");

  const score = Math.round(yieldScore * 0.3 + cashFlowScore * 0.25 + repairScore * 0.25 + financingScore * 0.2);
  return {
    score,
    subScores: {
      yield: subScore(yieldScore, grossYield === undefined ? "Tuotto arvioidaan neutraalina, kunnes hinta ja vuokra on annettu." : `Bruttovuokratuotto on noin ${grossYield.toFixed(1).replace(".", ",")} %.`),
      cashFlow: subScore(cashFlowScore, monthlyCashFlowBeforeLoan === undefined ? "Kassavirta tarkentuu vuokra- ja vastiketiedoilla." : "Arvio huomioi vuokran sekä ilmoitetut hoito- ja rahoitusvastikkeet."),
      housingCompanyRisk: subScore(repairScore, source.repairHistory?.message ?? "Taloyhtiöriski arvioidaan neutraalina, kunnes korjaushistoria on saatavilla."),
      financing: subScore(financingScore, loanRatio === undefined ? "Rahoitusarvio tarkentuu velattoman hinnan ja yhtiölainaosuuden avulla." : "Arvio huomioi yhtiölainaosuuden suhteessa velattomaan hintaan."),
    },
    positiveFactors,
    warningFactors,
    missingFactors,
  };
}
