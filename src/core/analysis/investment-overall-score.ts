export type InvestmentGrade = "A+" | "A" | "B" | "C" | "D" | "E";

export type RatingLevel = {
  grade: InvestmentGrade;
  label: string;
  summary: string;
};

export type RatingSubScore = {
  score: number;
  grade?: InvestmentGrade;
  summary?: string;
};

export type InvestmentSubScores = {
  yield?: RatingSubScore;
  cashFlow?: RatingSubScore;
  housingCompanyRisk?: RatingSubScore;
  financing?: RatingSubScore;
};

export type InvestmentOverallScoreData = {
  score: number;
  grade?: InvestmentGrade;
  label?: string;
  summary?: string;
  subScores?: InvestmentSubScores;
  positiveFactors?: string[];
  warningFactors?: string[];
  missingFactors?: string[];
};

const summaries: Record<InvestmentGrade, string> = {
  "A+": "Kohteen tuotto, kassavirta, rahoitettavuus ja riskitaso muodostavat erittäin vahvan sijoitusmahdollisuuden.",
  A: "Kohde on nykyisillä tiedoilla erittäin kiinnostava sijoitusmahdollisuus, vaikka yksittäisiä huomioitavia tekijöitä voi olla.",
  B: "Kohde täyttää hyvän sijoitusmahdollisuuden tärkeimmät kriteerit, mutta kokonaisuudessa on myös tarkistettavia tekijöitä.",
  C: "Kohde voi soveltua sijoitukseen, mutta tuoton, kassavirran ja riskien tasapaino vaatii tarkempaa arviointia.",
  D: "Kohteessa on useita tekijöitä, jotka heikentävät sijoituksen houkuttelevuutta nykyisillä tiedoilla.",
  E: "Kohde ei nykyisillä tiedoilla ja hinnalla muodosta houkuttelevaa sijoitusmahdollisuutta.",
};

export function clampInvestmentScore(score: number | null | undefined): number {
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score as number)) : 0;
}

export function getInvestmentRating(score: number | null | undefined): RatingLevel {
  const value = clampInvestmentScore(score);
  const grade: InvestmentGrade = value >= 90 ? "A+" : value >= 80 ? "A" : value >= 70 ? "B" : value >= 60 ? "C" : value >= 45 ? "D" : "E";
  const labels: Record<InvestmentGrade, string> = { "A+": "Erinomainen sijoitusmahdollisuus", A: "Erittäin hyvä sijoitusmahdollisuus", B: "Hyvä sijoitusmahdollisuus", C: "Kohtalainen sijoitusmahdollisuus", D: "Heikko sijoitusmahdollisuus", E: "Ei suositeltava sijoitus" };
  return { grade, label: labels[grade], summary: summaries[grade] };
}

export type GaugePoint = { x: number; y: number };

export function gaugePoint(score: number | null | undefined, radius = 82, centerX = 110, centerY = 103): GaugePoint {
  const angle = (150 + clampInvestmentScore(score) * 2.4) * Math.PI / 180;
  return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
}

export function gaugeArcPath(startScore: number, endScore: number, radius = 82, centerX = 110, centerY = 103): string {
  const start = gaugePoint(startScore, radius, centerX, centerY);
  const end = gaugePoint(endScore, radius, centerX, centerY);
  const largeArc = (endScore - startScore) * 2.4 > 180 ? 1 : 0;
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}
