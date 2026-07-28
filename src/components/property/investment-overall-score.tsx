import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clampInvestmentScore, gaugeArcPath, gaugePoint, getInvestmentRating, type InvestmentOverallScoreData } from "@/core/analysis/investment-overall-score";

export type InvestmentOverallScoreProps = InvestmentOverallScoreData;
const zones = [{ start: 0, end: 18.8, color: "#b94a55" }, { start: 20.3, end: 39.1, color: "#ce7137" }, { start: 40.6, end: 59.4, color: "#c49b2f" }, { start: 60.9, end: 79.7, color: "#6f9f62" }, { start: 81.2, end: 100, color: "#28765a" }] as const;

export function InvestmentOverallScore({ score: rawScore, label, summary }: InvestmentOverallScoreProps) {
  const score = Math.round(clampInvestmentScore(rawScore)); const rating = getInvestmentRating(score); const resolvedLabel = label ?? rating.label;
  return <Card id="sijoitusmahdollisuus" className="min-w-0 scroll-mt-24"><CardHeader className="border-b"><CardTitle className="text-lg">Sijoitusmahdollisuus</CardTitle></CardHeader><CardContent>
    <div className="mx-auto grid w-full max-w-4xl items-center gap-4 md:grid-cols-[minmax(220px,300px)_minmax(0,1fr)] md:gap-8" role="img" aria-label={`Sijoitusmahdollisuus ${score} pistettä sadasta. ${resolvedLabel}.`}>
      <svg className="mx-auto block h-auto w-full max-w-[280px]" viewBox="0 0 220 142" aria-hidden="true">{zones.map((zone) => <path key={zone.start} d={gaugeArcPath(zone.start, zone.end, 76, 110, 94)} fill="none" stroke={zone.color} strokeWidth="9" strokeLinecap="round" />)}<circle cx={gaugePoint(score, 76, 110, 94).x} cy={gaugePoint(score, 76, 110, 94).y} r="5" fill="white" stroke="#173b31" strokeWidth="3" /></svg>
      <div className="min-w-0 text-center md:text-left"><p className="text-4xl font-semibold tracking-tight sm:text-5xl">{score} <span className="text-xl font-medium text-muted-foreground">/ 100</span></p><p className="mt-2 text-xl font-semibold">{resolvedLabel}</p><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{summary ?? rating.summary}</p><p className="mt-3 text-xs text-muted-foreground">Arvio perustuu kohteen hintaan ja analyysissä käytettyihin lähtötietoihin.</p></div>
    </div>
  </CardContent></Card>;
}
