import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { professionalEvaluationUrl } from "@/config/marketing";

const evaluationTopics = [
  "Onko hintapyyntö markkinatasolla?",
  "Löytyykö hinnassa neuvotteluvaraa?",
  "Mitkä ovat kohteen suurimmat riskit ja mahdollisuudet?",
  "Miten itse etenisin tämän kohteen kanssa?",
] as const;

export function ProfessionalEvaluationCard() {
  return (
    <Card className="border-blue-200 bg-blue-50/75 shadow-sm ring-1 ring-blue-100">
      <CardContent className="grid gap-7 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <div className="flex items-center gap-2 text-blue-900">
            <ShieldCheck className="size-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">
              Henkilökohtainen asiantuntija-arvio
            </p>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
            Haluatko ammattilaisen arvion tästä kohteesta?
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
            Ennen kuin teet yhden elämäsi suurimmista taloudellisista
            päätöksistä, kannattaa varmistaa, ettei mitään olennaista jää
            huomaamatta.
          </p>
          <p className="mt-4 font-medium">
            Käyn kohteen henkilökohtaisesti läpi ja arvioin esimerkiksi:
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {evaluationTopics.map((topic) => (
              <li key={topic} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-lg border border-blue-200 bg-white/85 px-4 py-3 font-semibold text-blue-950">
            Yksi hyvä päätös voi säästää tai tuottaa kymmeniä tuhansia euroja.
          </p>
        </div>
        <div className="md:w-72">
          <a
            href={professionalEvaluationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              size: "lg",
              className:
                "h-auto min-h-14 w-full whitespace-normal bg-blue-900 px-6 py-4 text-center text-base font-semibold text-white shadow-md shadow-blue-950/15 hover:bg-blue-800 focus-visible:border-blue-800 focus-visible:ring-blue-800/35",
            })}
            data-intent="request-professional-evaluation"
          >
            Pyydä ammattilaisen arvio
            <ArrowRight data-icon="inline-end" />
          </a>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Henkilökohtaisen arvion sivu avautuu uuteen välilehteen.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
