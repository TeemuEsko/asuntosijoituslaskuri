export type InvestmentGrade = "A+" | "A" | "B" | "C" | "D" | "E";

export type RatingLevel = {
  grade: InvestmentGrade;
  label: string;
  summary: string;
  color: string;
};

const ratingColors: Record<InvestmentGrade, string> = { "A+": "#166534", A: "#27845f", B: "#73a66a", C: "#a48f24", D: "#c9672f", E: "#b33f4b" };

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
  preliminary?: boolean;
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
  return { grade, label: labels[grade], summary: summaries[grade], color: ratingColors[grade] };
}

export function scoreMarkerPosition(score: number | null | undefined): string {
  return `clamp(6px, ${clampInvestmentScore(score)}%, calc(100% - 6px))`;
}
