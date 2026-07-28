import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clampInvestmentScore, gaugeArcPath, gaugePoint, getInvestmentRating, type InvestmentOverallScoreData, type RatingSubScore } from "@/core/analysis/investment-overall-score";

export type InvestmentOverallScoreProps = InvestmentOverallScoreData;

const zones = [
  { start: 0, end: 18.8, color: "#b94a55" },
  { start: 20.3, end: 39.1, color: "#ce7137" },
  { start: 40.6, end: 59.4, color: "#c49b2f" },
  { start: 60.9, end: 79.7, color: "#6f9f62" },
  { start: 81.2, end: 100, color: "#28765a" },
] as const;

const subScoreLabels = { yield: "Tuotto", cashFlow: "Kassavirta", housingCompanyRisk: "Taloyhtiö ja remonttiriskit", financing: "Rahoitus ja vakuudet" } as const;

function SubScore({ name, value }: { name: string; value: RatingSubScore }) {
  const score = Math.round(clampInvestmentScore(value.score));
  const grade = value.grade ?? getInvestmentRating(score).grade;
  return <section className="min-w-0 rounded-lg border bg-muted/25 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-medium leading-snug">{name}</h3><span className="shrink-0 text-sm font-semibold">{score} / 100 · {grade}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${name} ${score} pistettä sadasta`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}><div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} /></div>{value.summary ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{value.summary}</p> : null}</section>;
}

export function InvestmentOverallScore({ score: rawScore, grade, label, summary, subScores, positiveFactors = [], warningFactors = [], missingFactors = [] }: InvestmentOverallScoreProps) {
  const score = Math.round(clampInvestmentScore(rawScore));
  const rating = getInvestmentRating(score);
  const resolvedGrade = grade ?? rating.grade;
  const resolvedLabel = label ?? rating.label;
  const resolvedSummary = summary ?? rating.summary;
  const marker = gaugePoint(score);
  const renderedSubScores = subScores ? (Object.entries(subScoreLabels) as Array<[keyof typeof subScoreLabels, string]>).flatMap(([key, name]) => subScores[key] ? [{ key, name, value: subScores[key] }] : []) : [];
  const factorGroups = [
    { title: "Arviota parantavat tekijät", items: positiveFactors },
    { title: "Huomioitavat riskit", items: warningFactors },
    { title: "Puuttuvat tiedot", items: missingFactors },
  ].filter((group) => group.items.length);

  return <Card id="kokonaisarvio" className="min-w-0 scroll-mt-24"><CardHeader className="border-b"><CardTitle className="text-lg">Kohteen kokonaisarvio</CardTitle></CardHeader><CardContent className="min-w-0 space-y-7">
    <div className="mx-auto w-full max-w-xl text-center" role="img" aria-label={`Kohteen kokonaisarvio ${score} pistettä sadasta. ${resolvedLabel}.`}>
      <svg className="block h-auto w-full max-w-full" viewBox="0 0 220 162" aria-hidden="true">
        {zones.map((zone) => <path key={zone.start} d={gaugeArcPath(zone.start, zone.end)} fill="none" stroke={zone.color} strokeWidth="15" strokeLinecap="round" />)}
        <circle cx={marker.x} cy={marker.y} r="7.5" fill="white" stroke="#173b31" strokeWidth="4" />
      </svg>
      <div className="-mt-14 sm:-mt-16"><p className="text-4xl font-semibold tracking-tight sm:text-5xl"><span>{score}</span> <span className="text-xl font-medium text-muted-foreground sm:text-2xl">/ 100</span></p><p className="mt-2 text-xl font-semibold">{resolvedLabel}</p><p className="mt-1 text-base font-medium text-muted-foreground">Arvosana {resolvedGrade}</p></div>
    </div>
    <p className="mx-auto max-w-2xl text-center text-base leading-relaxed">{resolvedSummary}</p>
    {renderedSubScores.length ? <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">{renderedSubScores.map(({ key, name, value }) => <SubScore key={key} name={name} value={value!} />)}</div> : null}
    {factorGroups.length ? <details className="rounded-lg border bg-background"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium"><span>Näytä, mistä arvio muodostuu</span><ChevronDown className="size-4 shrink-0" /></summary><div className="grid gap-5 border-t p-4 md:grid-cols-3">{factorGroups.map((group) => <section key={group.title}><h3 className="font-medium">{group.title}</h3><ul className="mt-2 space-y-2 text-sm text-muted-foreground">{group.items.map((item) => <li key={item} className="border-l-2 pl-3">{item}</li>)}</ul></section>)}</div></details> : null}
  </CardContent></Card>;
}
