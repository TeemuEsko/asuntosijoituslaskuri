import { Button } from "@/components/ui/button";
import type { EstimatedChoice, MarketAssessmentValue } from "@/core/market-assessment/model";

const demandOptions = [
  [1, "Heikko", "Vuokrausriski on arvioitu suureksi"],
  [2, "Melko heikko", "Vuokraus voi kestää tavallista pidempään"],
  [3, "Normaali", "Kysyntä on arvioitu tavanomaiseksi"],
  [4, "Hyvä", "Kohteen vuokrattavuus on arvioitu hyväksi"],
  [5, "Vahva", "Kysyntä on arvioitu erittäin hyväksi"],
] as const;
const riskOptions = [
  [1, "Pieni", "Vakaa ja kysytty sijainti"],
  [2, "Melko pieni", "Riski on keskimääräistä pienempi"],
  [3, "Keskitaso", "Tavanomainen sijaintiriski"],
  [4, "Melko suuri", "Kysyntä voi vaihdella"],
  [5, "Suuri", "Alueellisia kysyntä- tai työllisyysriskejä"],
] as const;
const liquidityOptions = [
  [1, "Hidas", "Suuntaa-antava markkinointiaika yli 180 päivää"],
  [2, "Melko hidas", "Suuntaa-antava markkinointiaika 120–180 päivää"],
  [3, "Normaali", "Suuntaa-antava markkinointiaika 70–120 päivää"],
  [4, "Hyvä", "Suuntaa-antava markkinointiaika 30–70 päivää"],
  [5, "Nopea", "Suuntaa-antava markkinointiaika alle 30 päivää"],
] as const;

export type MarketAssessmentKind = "rentalDemand" | "locationRisk" | "resaleLiquidity";

const labels: Record<MarketAssessmentKind, string> = {
  rentalDemand: "Vuokrakysyntä",
  locationRisk: "Sijaintiriski",
  resaleLiquidity: "Jälleenmyytävyys",
};

const confidenceLabels = {
  high: "Korkea luotettavuus",
  medium: "Kohtalainen luotettavuus",
  low: "Matala luotettavuus",
  unknown: "Luotettavuus ei tiedossa",
} as const;

export function RentalDemandSelector({
  kind,
  choice,
  onChange,
  onRestore,
}: {
  kind: MarketAssessmentKind;
  choice: EstimatedChoice<MarketAssessmentValue>;
  onChange: (value: MarketAssessmentValue) => void;
  onRestore: () => void;
}) {
  const label = labels[kind];
  const options = kind === "locationRisk" ? riskOptions : kind === "resaleLiquidity" ? liquidityOptions : demandOptions;
  const selected = options.find(([score]) => score === choice.effectiveValue);
  const sourceLabel = choice.userOverridden ? "Käyttäjän valinta" : choice.source === "automatic" ? "Automaattinen arvio" : "Ei tiedossa";

  return (
    <fieldset data-market-assessment={kind} className="min-w-0 rounded-xl border p-4">
      <legend className="px-1 text-base font-semibold">{label}</legend>
      <div className="mt-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${choice.userOverridden ? "border-success/30 bg-success-soft text-success" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
            {sourceLabel}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{confidenceLabels[choice.confidence]}</span>
        </div>
        <div>
          <p className="text-sm font-medium">
            Valittu arvio: {selected ? `${selected[0]} – ${selected[1]}` : "Ei tiedossa"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{choice.sourceName}</p>
        </div>
        {choice.factors.length ? (
          <details className="rounded-lg bg-muted/35 p-3 text-xs">
            <summary className="cursor-pointer font-medium">Tarkemmat perusteet</summary>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              {choice.factors.map((factor) => (
                <li key={factor.id}>
                  <span className="font-medium text-foreground">{factor.label}:</span> {factor.description}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {options.map(([score, title, description]) => (
            <button
              key={score}
              type="button"
              aria-pressed={choice.effectiveValue === score}
              onClick={() => onChange(score)}
              className={`rounded-lg border p-3 text-left outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/40 ${choice.effectiveValue === score ? "border-success bg-success-soft ring-1 ring-success/20" : "bg-background hover:border-foreground/25"}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{score}</span>
                {choice.effectiveValue === score ? <span className="text-[0.6875rem] font-medium text-success">{sourceLabel}</span> : null}
              </span>
              <span className="mt-1 block text-sm font-semibold">{title}</span>
              <span className="mt-1 block text-xs leading-snug text-muted-foreground">{description}</span>
            </button>
          ))}
        </div>
        {choice.userOverridden && choice.automaticValue !== null ? (
          <Button type="button" variant="ghost" size="sm" className="h-auto px-0 text-xs" onClick={onRestore}>
            Palauta automaattinen arvio
          </Button>
        ) : null}
      </div>
    </fieldset>
  );
}
