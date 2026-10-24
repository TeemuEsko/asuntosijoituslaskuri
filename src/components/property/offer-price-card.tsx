"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NET_RENTAL_YIELD_THRESHOLDS } from "@/core/analysis/net-rental-yield";
import {
  simulateMaximumOfferPrice,
  type OfferPriceMode,
} from "@/core/calculations/offer-price";
import type { InvestmentAnalysisInput } from "@/core/calculations/investment-analysis";
import { formatFinnishNumber } from "@/core/parser/normalization";

type OfferPriceCardProps = {
  input: InvestmentAnalysisInput;
  originalSalePrice?: number;
  priceApplied: boolean;
  onApply: (salePrice: number) => void;
  onRestore: () => void;
};

const money = (value: number | undefined) =>
  value === undefined ? "Ei laskettavissa" : `${formatFinnishNumber(value)} €`;

export function OfferPriceCard({
  input,
  originalSalePrice,
  priceApplied,
  onApply,
  onRestore,
}: OfferPriceCardProps) {
  const [mode, setMode] = useState<OfferPriceMode>("monthly_cash_flow");
  const [targetCashFlow, setTargetCashFlow] = useState<number | "">(100);
  const [targetYield, setTargetYield] = useState<number | "">(
    NET_RENTAL_YIELD_THRESHOLDS.good,
  );
  const targetValue =
    mode === "monthly_cash_flow" ? targetCashFlow : targetYield;
  const numericTarget = typeof targetValue === "number" ? targetValue : NaN;
  const result = useMemo(
    () => simulateMaximumOfferPrice(input, { mode, value: numericTarget }),
    [input, mode, numericTarget],
  );

  return (
    <Card id="tarjoushinta" className="scroll-mt-24">
      <CardHeader className="border-b">
        <CardTitle>Tarjoushintasimulaattori</CardTitle>
        <CardDescription>
          Laske korkein myyntihinta, jolla valitsemasi kassavirta- tai
          tuottotavoite vielä täyttyy. Simulointi ei muuta analyysiä ennen kuin
          otat tarjoushinnan käyttöön.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          role="group"
          aria-label="Tarjoushinnan tavoite"
        >
          <Button
            type="button"
            variant={mode === "monthly_cash_flow" ? "default" : "outline"}
            className="h-auto min-h-10 whitespace-normal px-4 py-2"
            aria-pressed={mode === "monthly_cash_flow"}
            onClick={() => setMode("monthly_cash_flow")}
          >
            Kassavirtavaatimus
          </Button>
          <Button
            type="button"
            variant={mode === "net_rental_yield" ? "default" : "outline"}
            className="h-auto min-h-10 whitespace-normal px-4 py-2"
            aria-pressed={mode === "net_rental_yield"}
            onClick={() => setMode("net_rental_yield")}
          >
            Nettovuokratuottovaatimus
          </Button>
        </div>

        <label
          className="block space-y-2 text-sm font-medium"
          htmlFor="offer-price-target"
        >
          {mode === "monthly_cash_flow"
            ? "Tavoiteltu kassavirta (€/kk)"
            : "Tavoiteltu nettovuokratuotto (%)"}
          <div className="relative max-w-sm">
            <Input
              id="offer-price-target"
              type="number"
              step={mode === "monthly_cash_flow" ? 10 : 0.1}
              min={mode === "net_rental_yield" ? 0 : undefined}
              value={targetValue}
              onChange={(event) => {
                const value =
                  event.currentTarget.value === ""
                    ? ""
                    : event.currentTarget.valueAsNumber;
                if (mode === "monthly_cash_flow") setTargetCashFlow(value);
                else setTargetYield(value);
              }}
              className="pr-20"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              {mode === "monthly_cash_flow" ? "€/kk" : "%"}
            </span>
          </div>
        </label>

        {priceApplied ? (
          <div className="rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success">
            Simuloitu tarjoushinta on käytössä analyysissä ja PDF-raportissa.
          </div>
        ) : null}

        {result.status === "success" ? (
          <div className="space-y-4 rounded-xl bg-success-soft p-4 sm:p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-success">
                Enimmäistarjoushinta
              </p>
              <p className="mt-1 text-3xl font-semibold">
                {money(result.maximumSalePrice)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Turvallisesti alaspäin pyöristetty lähimpään 100 euroon.
              </p>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Nykyinen myyntihinta</dt>
                <dd className="font-semibold">{money(result.currentSalePrice)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Simuloitu velaton hinta</dt>
                <dd className="font-semibold">{money(result.simulatedDebtFreePrice)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ero nykyhintaan</dt>
                <dd className="font-semibold">
                  {result.differenceEuro! >= 0 ? "+" : ""}
                  {money(result.differenceEuro)}
                  {result.differencePercent === undefined
                    ? ""
                    : ` (${result.differencePercent >= 0 ? "+" : ""}${formatFinnishNumber(result.differencePercent, 1)} %)`}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Pankkilaina</dt>
                <dd className="font-semibold">{money(result.bankLoanAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  Kassavirta pankkilainan jälkeen
                </dt>
                <dd className="font-semibold">
                  {money(result.cashFlowAfterLoan)} / kk
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Nettovuokratuotto</dt>
                <dd className="font-semibold">
                  {result.netRentalYield === undefined
                    ? "Ei laskettavissa"
                    : `${formatFinnishNumber(result.netRentalYield, 2)} %`}
                </dd>
              </div>
            </dl>
            {(result.financingGap ?? 0) > 0 ? (
              <div className="rounded-lg border border-warning/30 bg-background/70 p-3 text-sm text-warning">
                <strong>Rahoitusvaje {money(result.financingGap)}.</strong>{" "}
                Tarjous täyttää valitun tavoitteen, mutta nykyinen oma pääoma ei
                kata kaikkia hankinnan käteiskuluja.
              </div>
            ) : null}
            {!result.verified ? (
              <p className="text-sm text-warning">
                Enimmäishinnan seuraavaa 100 euroa ei voitu varmistaa tavoitteen
                alittavaksi.
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="h-auto min-h-10 whitespace-normal px-4 py-2"
                onClick={() => onApply(result.maximumSalePrice!)}
              >
                Käytä tarjoushintaa laskelmassa
              </Button>
              {priceApplied && originalSalePrice !== undefined ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-10 px-4 py-2"
                  onClick={onRestore}
                >
                  Palauta alkuperäinen hinta
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-muted p-4 sm:p-5">
            <p className="font-semibold">Enimmäishintaa ei voida näyttää</p>
            <p className="mt-1 text-sm text-muted-foreground">{result.reason}</p>
            {priceApplied && originalSalePrice !== undefined ? (
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={onRestore}
              >
                Palauta alkuperäinen hinta
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
