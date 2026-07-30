import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clampInvestmentScore, getInvestmentRating, scoreMarkerPosition, type InvestmentOverallScoreData } from "@/core/analysis/investment-overall-score";

export type InvestmentOverallScoreProps = Omit<InvestmentOverallScoreData, "score"> & { score?: number | null };

export function InvestmentOpportunityScore({ score: rawScore, label, summary, preliminary }: InvestmentOverallScoreProps) {
  const scoreMissing = rawScore === null || rawScore === undefined || !Number.isFinite(rawScore);
  const score = Math.round(clampInvestmentScore(rawScore));
  const rating = getInvestmentRating(score);
  const resolvedLabel = preliminary ? "Alustava sijoitusmahdollisuus" : label ?? rating.label;
  const ariaLabel = scoreMissing ? "Sijoitusmahdollisuuden arvio ei ole vielä valmis." : `Sijoitusmahdollisuus ${score} pistettä sadasta. ${resolvedLabel}.`;
  return <Card id="sijoitusmahdollisuus" className="min-w-0 scroll-mt-24"><CardHeader className="border-b"><CardTitle className="text-lg">Sijoitusmahdollisuus</CardTitle></CardHeader><CardContent>
    <div className="mx-auto w-full max-w-[760px] min-w-0" aria-label={ariaLabel}>
      {scoreMissing ? <><p className="text-xl font-semibold">Arvio kesken</p><p className="mt-2 text-sm text-muted-foreground">Arvio muodostuu lähtötietojen täydentämisen jälkeen.</p></> : <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><p className="text-4xl font-semibold tracking-tight sm:text-5xl">{score} <span className="text-xl font-medium text-muted-foreground">/ 100</span></p><p className="text-lg font-semibold sm:text-right">{resolvedLabel}</p></div>}
      <div className="relative mt-6 h-3 w-full rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scoreMissing ? undefined : score} aria-label="Sijoitusmahdollisuuden pistemäärä"><div data-score-progress className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: scoreMissing ? "0%" : `${score}%`, backgroundColor: scoreMissing ? "transparent" : rating.color }} />{scoreMissing ? null : <span data-score-marker className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-background shadow-sm transition-[left] duration-500 ease-out" style={{ left: scoreMarkerPosition(score), borderColor: rating.color }} />}</div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>0</span><span>100</span></div>
      {!scoreMissing ? <><p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{preliminary ? "Arvio tarkentuu, kun pankkilainan ja taloyhtiön tiedot täydennetään." : summary ?? rating.summary}</p><p className="mt-3 text-xs text-muted-foreground">Arvio perustuu kohteen tuottoon, kassavirtaan, rahoitukseen ja taloyhtiöriskeihin. Kohteen markkinahintaa ei arvioida tässä analyysissä, joten analyysi ei ota kantaa siihen, onko pyyntihinta markkinatasoon nähden oikea. Voit tilata markkinahinta-analyysin erikseen.</p></> : null}
    </div>
  </CardContent></Card>;
}

export const InvestmentOverallScore = InvestmentOpportunityScore;
