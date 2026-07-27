import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type ProfessionalEvaluationLead = {
  firstName: string;
  email: string;
  phone?: string;
};

type ProfessionalEvaluationCardProps = {
  onRequestEvaluation?: () => void;
};

const evaluationTopics = [
  "Onko hintapyyntö markkinatasolla?",
  "Löytyykö hinnassa neuvotteluvaraa?",
  "Mitkä ovat kohteen suurimmat riskit ja mahdollisuudet?",
  "Miten itse etenisin tämän kohteen kanssa?",
] as const;

export function ProfessionalEvaluationCard({ onRequestEvaluation }: ProfessionalEvaluationCardProps) {
  return <Card className="border-success/25 bg-success-soft/60 ring-success/15"><CardContent className="grid gap-7 py-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div><div className="flex items-center gap-2 text-success"><ShieldCheck className="size-5" /><p className="text-xs font-semibold uppercase tracking-[0.16em]">Henkilökohtainen asiantuntija-arvio</p></div><h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">Haluatko ammattilaisen arvion tästä kohteesta?</h2><p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">Ennen kuin teet yhden elämäsi suurimmista taloudellisista päätöksistä, kannattaa varmistaa, ettei mitään olennaista jää huomaamatta.</p><p className="mt-4 font-medium">Käyn kohteen henkilökohtaisesti läpi ja arvioin esimerkiksi:</p><ul className="mt-3 grid gap-2 sm:grid-cols-2">{evaluationTopics.map((topic) => <li key={topic} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /><span>{topic}</span></li>)}</ul><p className="mt-5 rounded-lg border border-success/20 bg-background/80 px-4 py-3 font-semibold text-success">Yksi hyvä päätös voi säästää tai tuottaa kymmeniä tuhansia euroja.</p></div><div className="md:w-64"><Button type="button" size="lg" className="h-auto min-h-11 w-full whitespace-normal py-3 text-center" onClick={onRequestEvaluation} data-intent="request-professional-evaluation">Pyydä ammattilaisen arvio<ArrowRight data-icon="inline-end" /></Button><p className="mt-2 text-center text-xs text-muted-foreground">Painike avaa yhteydenottolomakkeen tulevassa julkaisussa.</p></div></CardContent></Card>;
}
