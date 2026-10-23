"use client";

import { ArrowRight, GraduationCap } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { kajabiTrainingUrl } from "@/config/marketing";
import { trackProductEvent } from "@/core/analytics/product-events";

type TrainingCtaProps = {
  placement: "analysis" | "footer";
};

const content = {
  analysis: {
    eyebrow: "Maksuton koulutus",
    title: "Haluatko kasvattaa asuntosalkkuasi suunnitelmallisesti?",
    description:
      "Opi maksuttomassa koulutuksessa, miten löydät sijoitusasuntoja, jotka auttavat sinua hankkimaan myös seuraavan.",
    button: "Katso maksuton koulutus",
  },
  footer: {
    eyebrow: "Jatka oppimista",
    title: "Haluatko kehittyä asuntosijoittajana?",
    description:
      "Tutustu maksuttomaan koulutukseen ja opi, miten rakennat asuntosalkkua, jossa jokainen onnistunut sijoitus voi auttaa hankkimaan seuraavan.",
    button: "Katso maksuton koulutus",
  },
} as const;

export function TrainingCta({ placement }: TrainingCtaProps) {
  const copy = content[placement];
  return (
    <Card
      data-training-cta={placement}
      className={
        placement === "analysis"
          ? "border-success/30 bg-success-soft/55 shadow-sm"
          : "border-border bg-muted/35 shadow-none"
      }
    >
      <CardContent className="grid gap-5 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8">
        <div>
          <div className="flex items-center gap-2 text-success">
            <GraduationCap className="size-5 shrink-0" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">
              {copy.eyebrow}
            </p>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <a
          href={kajabiTrainingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackProductEvent("kajabi_redirect_clicked", {
              destination: "training",
              placement,
            })
          }
          className={buttonVariants({
            size: "lg",
            className:
              "min-h-12 w-full whitespace-normal bg-emerald-700 px-5 py-3 text-center font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:border-emerald-600 focus-visible:ring-emerald-600/35 sm:w-auto",
          })}
        >
          {copy.button}
          <ArrowRight data-icon="inline-end" aria-hidden />
        </a>
      </CardContent>
    </Card>
  );
}

