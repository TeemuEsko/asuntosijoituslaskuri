import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  clampInvestmentScore,
  getInvestmentRating,
  scoreMarkerPosition,
  type InvestmentOverallScoreData,
} from "@/core/analysis/investment-overall-score";

export type InvestmentOverallScoreProps = Omit<InvestmentOverallScoreData, "score"> & {
  score?: number | null;
};

const scoreLabels = {
  cashFlow: "Kassavirta",
  yield: "Riskikorjattu nettovuokratuotto",
  housingCompanyRisk: "Taloyhtiöriski",
  valueCreation: "Arvonluonti ja vakuuspotentiaali",
  financing: "Rahoitus",
  market: "Markkina ja kysyntä",
} as const;

const reliabilityLabels = {
  preliminary: "Alustava",
  moderate: "Kohtalainen",
  good: "Hyvä",
} as const;

export function InvestmentOpportunityScore({
  score: rawScore,
  label,
  summary,
  preliminary,
  subScores,
  reliability,
  severeRisks = [],
  missingFactors = [],
  appliedScoreCap,
}: InvestmentOverallScoreProps) {
  const scoreMissing = rawScore === null || rawScore === undefined || !Number.isFinite(rawScore);
  const score = Math.round(clampInvestmentScore(rawScore));
  const rating = getInvestmentRating(score);
  const resolvedLabel = preliminary ? "Alustava sijoitusmahdollisuus" : label ?? rating.label;
  const ariaLabel = scoreMissing
    ? "Sijoitusmahdollisuuden arvio ei ole vielä valmis."
    : `Sijoitusmahdollisuus ${score} pistettä sadasta. ${resolvedLabel}.`;
  const displayedSubScores = subScores
    ? (Object.keys(scoreLabels) as Array<keyof typeof scoreLabels>).flatMap((key) =>
        subScores[key] ? [[key, subScores[key]!] as const] : [],
      )
    : [];

  return (
    <Card id="sijoitusmahdollisuus" className="min-w-0 scroll-mt-24">
      <CardHeader className="border-b"><CardTitle className="text-lg">Sijoitusmahdollisuus</CardTitle></CardHeader>
      <CardContent>
        <div className="mx-auto w-full max-w-[860px] min-w-0" aria-label={ariaLabel}>
          {scoreMissing ? (
            <><p className="text-xl font-semibold">Arvio kesken</p><p className="mt-2 text-sm text-muted-foreground">Arvio muodostuu lähtötietojen täydentämisen jälkeen.</p></>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-4xl font-semibold tracking-tight sm:text-5xl">{score} <span className="text-xl font-medium text-muted-foreground">/ 100</span></p>
              <p className="text-lg font-semibold sm:text-right">{resolvedLabel}</p>
            </div>
          )}
          <div className="relative mt-6 h-3 w-full rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scoreMissing ? undefined : score} aria-label="Sijoitusmahdollisuuden pistemäärä">
            <div data-score-progress className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: scoreMissing ? "0%" : `${score}%`, backgroundColor: scoreMissing ? "transparent" : rating.color }} />
            {scoreMissing ? null : <span data-score-marker className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-background shadow-sm transition-[left] duration-500 ease-out" style={{ left: scoreMarkerPosition(score), borderColor: rating.color }} />}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>0</span><span>100</span></div>
          {!scoreMissing ? (
            <>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{preliminary ? "Arvio tarkentuu, kun pankkilainan ja taloyhtiön tiedot täydennetään." : summary ?? rating.summary}</p>
              <p className="mt-3 text-xs text-muted-foreground">Opportunity Score 2.0 arvioi kassavirtaa, riskikorjattua tuottoa, taloyhtiötä, arvonluontia, rahoitusta sekä markkinaa. Käyttäjän vahvistamatonta markkina-arviota painotetaan rajatusti eikä sitä käsitellä pankin hyväksymänä vakuusarvona.</p>
            </>
          ) : null}

          {displayedSubScores.length ? (
            <section className="mt-6" aria-labelledby="score-breakdown-heading">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="score-breakdown-heading" className="font-semibold">Pisteiden muodostuminen</h3>
                <span className="rounded-full border px-2.5 py-1 text-xs font-medium">Analyysin luotettavuus: {reliabilityLabels[reliability ?? (preliminary ? "preliminary" : "moderate")]}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {displayedSubScores.map(([key, item]) => (
                  <div key={key} className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-baseline justify-between gap-3"><p className="text-sm font-medium">{scoreLabels[key]}</p><strong className="tabular-nums">{item.score} / 100</strong></div>
                    {item.summary ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.summary}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {severeRisks.length ? (
            <section className="mt-5 rounded-lg border border-danger/30 bg-danger-soft/60 p-4" aria-labelledby="severe-risks-heading">
              <h3 id="severe-risks-heading" className="font-semibold text-danger">Todennetut vakavat riskit</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{severeRisks.map((risk) => <li key={risk.id}>{risk.label}{appliedScoreCap ? ` Pistemäärän enimmäisraja on ${appliedScoreCap}.` : ""}</li>)}</ul>
            </section>
          ) : null}
          {missingFactors.length ? (
            <details className="mt-5 rounded-lg border p-4"><summary className="cursor-pointer font-medium">Puuttuvat tai tarkistettavat tiedot ({missingFactors.length})</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{missingFactors.map((item) => <li key={item}>{item}</li>)}</ul></details>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export const InvestmentOverallScore = InvestmentOpportunityScore;
