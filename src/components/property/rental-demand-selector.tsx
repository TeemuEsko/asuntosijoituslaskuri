const options = [
  [1, "Heikko", "Paljon tyhjäkäyntiriskiä"], [2, "Melko heikko", "Vuokraus voi kestää"], [3, "Normaali", "Tavanomainen kysyntä"], [4, "Hyvä", "Hyvä vuokrattavuus"], [5, "Vahva", "Erittäin hyvä kysyntä"],
] as const;

export function RentalDemandSelector({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <fieldset><legend className="text-sm font-medium">Vuokrakysyntä</legend><p className="mt-1 text-xs text-muted-foreground">Oma arviosi alueen vuokrattavuudesta</p><div className="mt-3 grid gap-2 sm:grid-cols-5">{options.map(([score, title, description]) => <button key={score} type="button" aria-pressed={value === score} onClick={() => onChange(score)} className={`rounded-lg border p-3 text-left outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/40 ${value === score ? "border-success bg-success-soft ring-1 ring-success/20" : "bg-background hover:border-foreground/25"}`}><span className="block text-xs text-muted-foreground">{score}</span><span className="mt-1 block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-snug text-muted-foreground">{description}</span></button>)}</div></fieldset>
  );
}
