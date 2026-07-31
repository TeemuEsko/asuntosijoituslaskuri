"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FieldStatus } from "@/core/domain/field";
import { formatFinnishNumber } from "@/core/parser/normalization";
import type { PurchaseFieldKey } from "@/data/property-demo";
import { LocalizedNumberField } from "./localized-number-field";
import { SourceBadge } from "./status-badge";

type Props = {
  values: Record<PurchaseFieldKey, number>;
  statuses: Record<PurchaseFieldKey, FieldStatus>;
  transferTaxRate: number;
  transactionCosts: number;
  transferTaxStatus: FieldStatus;
  transactionCostsStatus: FieldStatus;
  onChange: (key: PurchaseFieldKey, value: number) => void;
  onAssumptionChange: (key: "transferTaxRate" | "transactionCosts", value: number) => void;
};

const fieldDescriptions = {
  debtFreePrice: "Kohteen hinta sisältäen mahdollisen huoneistokohtaisen yhtiölainaosuuden.",
  salePrice: "Myyjälle maksettava kauppahinta ilman huoneistokohtaista yhtiölainaosuutta.",
  renovationReserve: "Huoneiston hankinnan yhteydessä tai lähiaikoina arvioitu kertaluonteinen remonttivara.",
} as const;

export function PurchaseCard({
  values,
  statuses,
  transferTaxRate,
  transactionCosts,
  transferTaxStatus,
  transactionCostsStatus,
  onChange,
  onAssumptionChange,
}: Props) {
  const transferTax = values.debtFreePrice * Math.max(0, transferTaxRate) / 100;
  const adjustedAcquisitionPrice = values.debtFreePrice + values.renovationReserve + transferTax + transactionCosts;

  return (
    <Card data-input-group="price-and-acquisition">
      <CardHeader className="border-b">
        <CardTitle>A. Hinta ja hankinta</CardTitle>
        <CardDescription>Hinnat ja kertaluonteiset hankintakulut muodostavat todellisen hankintahinnan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div data-price-row className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <LocalizedNumberField
            id="purchase-debtFreePrice"
            label="Velaton hinta"
            status={statuses.debtFreePrice}
            suffix="€"
            min={0}
            maximumFractionDigits={1}
            value={values.debtFreePrice}
            onValueChange={(value) => onChange("debtFreePrice", value)}
            description={fieldDescriptions.debtFreePrice}
            help={fieldDescriptions.debtFreePrice}
            className="text-base font-semibold"
          />
          <LocalizedNumberField
            id="purchase-salePrice"
            label="Myyntihinta"
            status={statuses.salePrice}
            suffix="€"
            min={0}
            maximumFractionDigits={1}
            value={values.salePrice}
            onValueChange={(value) => onChange("salePrice", value)}
            description={fieldDescriptions.salePrice}
            help={fieldDescriptions.salePrice}
          />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <LocalizedNumberField
            id="purchase-renovationReserve"
            label="Remonttivara"
            status={statuses.renovationReserve}
            suffix="€"
            min={0}
            maximumFractionDigits={1}
            value={values.renovationReserve}
            onValueChange={(value) => onChange("renovationReserve", value)}
            description={fieldDescriptions.renovationReserve}
            help={`${fieldDescriptions.renovationReserve} Ei sisällä taloyhtiön tulevia remontteja tai kuukausittaisia käyttömenoja.`}
          />
          <div className="min-w-0 space-y-2 rounded-lg border bg-muted/25 p-4">
            <div className="flex min-h-10 flex-wrap items-start justify-between gap-2">
              <p className="text-[13px] font-medium leading-5">Oikaistu hankintahinta</p>
              <SourceBadge status="inferred" />
            </div>
            <p className="min-h-8 text-xs leading-4 text-muted-foreground">
              Velaton hinta, remonttivara, varainsiirtovero ja muut kertaluonteiset kaupantekokulut.
            </p>
            <p className="pt-1 text-right text-xl font-semibold tabular-nums">
              {formatFinnishNumber(adjustedAcquisitionPrice, 1)} €
            </p>
          </div>
          <LocalizedNumberField
            id="transfer-tax"
            label="Varainsiirtovero"
            status={transferTaxStatus}
            suffix="%"
            min={0}
            maximumFractionDigits={1}
            value={transferTaxRate}
            onValueChange={(value) => onAssumptionChange("transferTaxRate", value)}
            description="Asunto-osakkeen hankintaan käytetty varainsiirtoveroprosentti."
            help="Prosentti lasketaan velattomasta hinnasta. Tarkista voimassa oleva verokanta omaan kauppaasi."
          />
          <LocalizedNumberField
            id="transaction-costs"
            label="Muut kaupantekokulut"
            status={transactionCostsStatus}
            suffix="€"
            min={0}
            maximumFractionDigits={1}
            value={transactionCosts}
            onValueChange={(value) => onAssumptionChange("transactionCosts", value)}
            description="Esimerkiksi pankin lainan järjestely- tai nostopalkkio, omistuksen rekisteröinti ja muut kertaluonteiset ostokulut. Älä sisällytä tähän varainsiirtoveroa tai remonttivaraa."
            help="Sisällytä tähän pankin järjestely- tai nostopalkkio, omistuksen rekisteröinti ja muut kertaluonteiset ostokulut. Varainsiirtovero ja remonttivara annetaan omissa kentissään."
          />
        </div>
      </CardContent>
    </Card>
  );
}
