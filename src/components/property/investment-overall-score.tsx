import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clampInvestmentScore, gaugeArcPath, gaugePoint, getInvestmentRating, type InvestmentOverallScoreData } from "@/core/analysis/investment-overall-score";

export type InvestmentOverallScoreProps = InvestmentOverallScoreData;
function scoreColor(score: number) { return score <= 44 ? "#b94a55" : score <= 59 ? "#ce7137" : score <= 69 ? "#c49b2f" : score <= 84 ? "#75a968" : "#28765a"; }

export function InvestmentOverallScore({ score: rawScore, label, summary, preliminary }: InvestmentOverallScoreProps) {
  const score = Math.round(clampInvestmentScore(rawScore));
  const rating = getInvestmentRating(score);
  const resolvedLabel = preliminary ? "Alustava sijoitusmahdollisuus" : label ?? rating.label;
  const color = scoreColor(score);
  const marker = gaugePoint(score, 76, 110, 94);
  return <Card id="sijoitusmahdollisuus" className="min-w-0 scroll-mt-24"><CardHeader className="border-b"><CardTitle className="text-lg">Sijoitusmahdollisuus</CardTitle></CardHeader><CardContent>
    <div className="mx-auto grid w-full max-w-4xl items-center gap-4 md:grid-cols-[minmax(200px,260px)_minmax(0,1fr)] md:gap-8" role="img" aria-label={`Sijoitusmahdollisuus ${score} pistettä sadasta. ${resolvedLabel}.`}>
      <svg className="mx-auto block h-auto w-full max-w-[240px]" viewBox="0 0 220 142" aria-hidden="true"><path d={gaugeArcPath(0, 100, 76, 110, 94)} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" strokeLinecap="round" />{score > 0 ? <path d={gaugeArcPath(0, score, 76, 110, 94)} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" className="transition-all duration-500 ease-out" /> : null}<circle cx={marker.x} cy={marker.y} r="5" fill="white" stroke={color} strokeWidth="3" className="transition-all duration-500 ease-out" /></svg>
      <div className="min-w-0 text-center md:text-left"><p className="text-4xl font-semibold tracking-tight sm:text-5xl">{score} <span className="text-xl font-medium text-muted-foreground">/ 100</span></p><p className="mt-2 text-xl font-semibold">{resolvedLabel}</p><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{preliminary ? "Arvio tarkentuu, kun pankkilainan ja taloyhtiön tiedot täydennetään." : summary ?? rating.summary}</p><p className="mt-3 text-xs text-muted-foreground">Arvio perustuu kohteen hintaan, tuottoon, kassavirtaan, rahoitukseen ja taloyhtiöriskiin.</p></div>
    </div>
  </CardContent></Card>;
}
