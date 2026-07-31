"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EquitySource } from "@/core/analysis/equity-assumption";
import type { RepaymentType } from "@/core/calculations/investment-analysis";
import type { FieldStatus } from "@/core/domain/field";
import type { MarketAssessmentSet, MarketAssessmentValue } from "@/core/market-assessment/model";
import { formatFinnishNumber, parseFinnishInputNumber } from "@/core/parser/normalization";
import { rentDifference } from "@/core/rent-data/rent-estimation";
import type { RentEstimate } from "@/core/rent-data/types";
import { validateRentEstimate } from "@/core/financial-sanity-checks/rent";
import { LocalizedNumberField } from "./localized-number-field";
import { PropertyField } from "./property-field";
import { RentalDemandSelector, type MarketAssessmentKind } from "./rental-demand-selector";
import { SourceBadge } from "./status-badge";

export type AssumptionValues = {
  monthlyRent: number;
  maintenanceFeeMonthly: number;
  vacancyMonths: number;
  annualInterestRate: number;
  loanTermYears: number;
  equity: number;
  equitySource: EquitySource;
  equityUserOverridden: boolean;
  repaymentType: RepaymentType;
  rentalDemand: number;
  otherCostsMonthly: number;
  collateralValue: number;
  transferTaxRate: number;
  transactionCosts: number;
  locationRisk: number;
  resaleLiquidity: number;
};
export type AssumptionFieldKey = Exclude<keyof AssumptionValues, "equitySource" | "equityUserOverridden">;
export type AssumptionStatuses = Partial<Record<AssumptionFieldKey, FieldStatus>>;

const repaymentOptions: ReadonlyArray<{ value: RepaymentType; label: string; description: string }> = [
  { value: "annuity", label: "Annuiteetti", description: "Laina-aika pysyy samana ja maksuerä lasketaan uudelleen korkotason muuttuessa." },
  { value: "fixed_payment", label: "Kiinteä tasaerä", description: "Maksuerä pysyy sovitun suuruisena ja korkotason muutokset muuttavat laina-aikaa." },
  { value: "equal_principal", label: "Tasalyhennys", description: "Pääoman lyhennys on sama joka erässä ja kokonaismaksuerä pienenee pääoman vähentyessä." },
  { value: "interest_only", label: "Vain korko", description: "Kuukausierässä maksetaan vain korko. Pääoma ei lyhene laina-aikana." },
  { value: "bullet", label: "Kertalyhennys / bullet", description: "Pääoma erääntyy kokonaisuudessaan laina-ajan lopussa; laina-aikana maksetaan tässä laskelmassa korot." },
];

function rentStatus(estimate: RentEstimate): FieldStatus {
  if (estimate.source === "user") return "user";
  if (estimate.source === "statistics_finland" || estimate.source === "fallback") return "statistics";
  if (estimate.source === "listing") return "listing";
  if (estimate.source === "lease") return "document";
  return "unknown";
}

function RentEstimateField({
  estimate,
  onOverride,
  onRestore,
}: {
  estimate: RentEstimate;
  onOverride: (value: number) => void;
  onRestore: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(estimate.effectiveMonthlyRent ?? ""));
  const [validationError, setValidationError] = useState<string | null>(null);
  const benchmark = estimate.benchmark ?? (estimate.source === "statistics_finland" || estimate.source === "fallback" ? estimate : null);
  const sourceLabel = estimate.source === "user" ? "Käyttäjän määrittämä vuokra" : estimate.source === "listing" ? "Löydetty myynti-ilmoituksesta" : estimate.source === "lease" ? "Voimassa oleva vuokrasopimus" : estimate.source === "statistics_finland" || estimate.source === "fallback" ? "Tilastokeskuksen arvio" : "Vuokra ei ole tiedossa";
  const confidence = estimate.confidence === "high" ? "Korkea luotettavuus" : estimate.confidence === "medium" ? "Kohtalainen luotettavuus" : estimate.confidence === "low" ? "Suuntaa-antava arvio" : "Luotettavuutta ei voitu arvioida";
  const comparison = typeof benchmark?.effectiveMonthlyRent === "number" && typeof estimate.effectiveMonthlyRent === "number" && benchmark.effectiveMonthlyRent !== estimate.effectiveMonthlyRent ? rentDifference(estimate.effectiveMonthlyRent, benchmark.effectiveMonthlyRent) : null;

  return (
    <section className="min-w-0 space-y-3 rounded-lg border bg-muted/20 p-4 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Kuukausivuokra</p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">Kohteesta saatava varsinainen kuukausivuokra ilman erillisiä käyttökorvauksia.</p>
          <p className="mt-2 text-2xl font-semibold">{typeof estimate.effectiveMonthlyRent === "number" ? `${formatFinnishNumber(estimate.effectiveMonthlyRent, 2)} €/kk` : "Ei tiedossa"}</p>
          <p className="mt-1 text-sm font-medium text-success">{sourceLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><SourceBadge status={rentStatus(estimate)} /><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${estimate.confidence === "low" ? "border-amber-300 bg-amber-50 text-amber-900" : ""}`}>{confidence}</span></div>
      </div>
      {benchmark?.rentPerSquareMeter ? <p className="text-sm leading-relaxed text-muted-foreground">Perustuu alueen <strong>{benchmark.sourceArea}</strong> vapaarahoitteisten {benchmark.roomCategory === "ONE_ROOM" ? "yksiöiden" : benchmark.roomCategory === "TWO_ROOMS" ? "kaksioiden" : benchmark.roomCategory === "THREE_PLUS_ROOMS" ? "kolmioiden ja suurempien asuntojen" : "asuntojen"} keskineliövuokraan {formatFinnishNumber(benchmark.rentPerSquareMeter, 2)} €/m²/kk, {benchmark.referencePeriod}. {benchmark.sampleSize ? `Havaintoja ${formatFinnishNumber(benchmark.sampleSize)}.` : ""}</p> : estimate.source === "listing" ? <p className="text-sm text-muted-foreground">Kohde on ilmoituksen mukaan vuokrattu tai ilmoituksessa on annettu nykyinen kuukausivuokra.</p> : null}
      {estimate.confidence === "low" && !estimate.warning ? <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">Arvio on suuntaa-antava. Kuntakohtaista tai huonelukuluokan tarkkaa vertailuarvoa ei ollut saatavilla.</p> : null}
      {estimate.warning ? <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">{estimate.warning}</p> : null}
      {comparison && benchmark ? <p className="text-sm text-muted-foreground">Alueellinen vertailuarvio {formatFinnishNumber(benchmark.effectiveMonthlyRent!)} €/kk · ero {comparison.euros >= 0 ? "+" : ""}{formatFinnishNumber(comparison.euros)} €/kk ({comparison.percent >= 0 ? "+" : ""}{formatFinnishNumber(comparison.percent, 1)} %)</p> : null}
      {editing ? (
        <div className="max-w-md space-y-3">
          <PropertyField id="market-rent" label="Kuukausivuokra" status="user" suffix="€/kk" type="text" inputMode="decimal" value={draft} onChange={(event) => { setDraft(event.currentTarget.value); setValidationError(null); }} description="Syötä varsinainen kuukausivuokra ilman vesi-, autopaikka- tai muita käyttömaksuja." help="Syötä varsinainen kuukausivuokra ilman vesi-, autopaikka- tai muita käyttömaksuja." />
          {validationError ? <p role="alert" className="text-sm text-danger">{validationError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => {
              const value = parseFinnishInputNumber(draft);
              const validation = validateRentEstimate({ monthlyRent: value ?? Number.NaN, source: "user", context: "listing_explicit", unit: "€/kk" });
              if (value !== null && validation.valid) { onOverride(value); setEditing(false); setValidationError(null); } else setValidationError(validation.warnings[0]?.message ?? "Tarkista kuukausivuokra.");
            }}>Käytä tätä vuokraa</Button>
            <Button type="button" variant="outline" onClick={() => { setDraft(String(estimate.effectiveMonthlyRent ?? "")); setEditing(false); setValidationError(null); }}>Peruuta</Button>
            {estimate.userOverridden && benchmark?.effectiveMonthlyRent ? <Button type="button" variant="ghost" onClick={() => { onRestore(); setEditing(false); setValidationError(null); }}>Palauta automaattinen arvio</Button> : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>Täsmennä tarvittaessa</Button>
          {estimate.userOverridden && benchmark?.effectiveMonthlyRent ? <Button type="button" variant="ghost" onClick={onRestore}>Palauta automaattinen arvio</Button> : null}
        </div>
      )}
    </section>
  );
}

export function AssumptionsCard({
  values,
  statuses,
  rentEstimate,
  financingFeeMonthly,
  financingFeeStatus,
  financingFeeDescription,
  financingFeeDisabled,
  bankLoanAmount,
  marketAssessments,
  onRentOverride,
  onRentRestore,
  onChange,
  onFinancingFeeChange,
  onResetEquity,
  onMarketChange,
  onMarketRestore,
}: {
  values: AssumptionValues;
  statuses: AssumptionStatuses;
  rentEstimate: RentEstimate;
  financingFeeMonthly?: number;
  financingFeeStatus: FieldStatus;
  financingFeeDescription: string;
  financingFeeDisabled: boolean;
  bankLoanAmount: number;
  marketAssessments: MarketAssessmentSet;
  onRentOverride: (value: number) => void;
  onRentRestore: () => void;
  onChange: <K extends AssumptionFieldKey>(key: K, value: AssumptionValues[K]) => void;
  onFinancingFeeChange: (value: number) => void;
  onResetEquity: () => void;
  onMarketChange: (kind: MarketAssessmentKind, value: MarketAssessmentValue) => void;
  onMarketRestore: (kind: MarketAssessmentKind) => void;
}) {
  const status = (key: AssumptionFieldKey) => statuses[key] ?? "default";
  const repayment = repaymentOptions.find((option) => option.value === values.repaymentType)!;

  return (
    <div className="space-y-6">
      <Card data-input-group="monthly-income-and-costs">
        <CardHeader className="border-b"><CardTitle>B. Kuukausitulot ja -kulut</CardTitle><CardDescription>Jatkuvat tulot ja kulut vaikuttavat suoraan vuokratuottoon ja kassavirtaan.</CardDescription></CardHeader>
        <CardContent className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2">
          <RentEstimateField estimate={rentEstimate} onOverride={onRentOverride} onRestore={onRentRestore} />
          <LocalizedNumberField id="maintenance-fee" label="Hoitovastike" status={status("maintenanceFeeMonthly")} suffix="€/kk" min={0} maximumFractionDigits={2} value={values.maintenanceFeeMonthly} onValueChange={(value) => onChange("maintenanceFeeMonthly", value)} description="Taloyhtiön kuukausittainen hoitovastike. Ei sisällä rahoitusvastiketta." help="Taloyhtiön kuukausittainen hoitovastike. Rahoitusvastike annetaan omassa kentässään." />
          <LocalizedNumberField id="financing-fee" label="Rahoitusvastike" status={financingFeeStatus} suffix="€/kk" min={0} maximumFractionDigits={2} value={financingFeeMonthly} allowUnknown disabled={financingFeeDisabled} onValueChange={onFinancingFeeChange} description={financingFeeDescription} help="Huoneistokohtaisen yhtiölainan kuukausittainen pääoma- tai rahoitusvastike. Jos yhtiölainaa ei ole, arvo päätellään nollaksi." />
          <LocalizedNumberField id="other-costs" label="Muut kuukausikulut" status={status("otherCostsMonthly")} suffix="€/kk" min={0} maximumFractionDigits={2} value={values.otherCostsMonthly} onValueChange={(value) => onChange("otherCostsMonthly", value)} description="Vuokranantajan maksettavaksi jäävät jatkuvat kulut vastikkeiden lisäksi." help="Esimerkiksi vakuutus tai muu jatkuva omistajalle jäävä kulu. Älä lisää kertaluonteisia ostokuluja." />
          <LocalizedNumberField id="vacancy-months" label="Arvioitu tyhjäkäynti" status={status("vacancyMonths")} suffix="kk / vuosi" min={0} max={12} maximumFractionDigits={1} value={values.vacancyMonths} onValueChange={(value) => onChange("vacancyMonths", value)} description="Arvio siitä, kuinka monta kuukautta asunto on keskimäärin ilman vuokralaista vuoden aikana." help={`Vuokrattuna arviolta ${formatFinnishNumber(12 - values.vacancyMonths, 1)} kuukautta vuodessa.`} />
        </CardContent>
      </Card>

      <Card data-input-group="bank-financing">
        <CardHeader className="border-b"><CardTitle>C. Pankkirahoitus</CardTitle><CardDescription>Rahoitusoletukset määrittävät lainan maksuerän, kassavirran ja vakuustilanteen.</CardDescription></CardHeader>
        <CardContent className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 min-[1600px]:grid-cols-3">
          <LocalizedNumberField id="bank-loan-amount" label="Pankkilainan määrä" status="inferred" suffix="€" maximumFractionDigits={1} value={bankLoanAmount} disabled description="Myyntihinnan ja kertaluonteisten hankintakulujen rahoitustarve vähennettynä sijoitetulla omalla pääomalla." help="Laskettu myyntihinnasta, remonttivarasta, varainsiirtoverosta, muista kaupantekokuluista ja omasta pääomasta." />
          <LocalizedNumberField id="interest" label="Pankkilainan kokonaiskorko" status={status("annualInterestRate")} suffix="%" min={0} maximumFractionDigits={1} value={values.annualInterestRate} onValueChange={(value) => onChange("annualInterestRate", value)} description="Viitekorko ja pankin marginaali yhteensä." help="Syötä pankkilainan vuotuinen kokonaiskorko prosentteina." />
          <LocalizedNumberField id="loan-term" label="Laina-aika" status={status("loanTermYears")} suffix="vuotta" min={1} maximumFractionDigits={1} value={values.loanTermYears} onValueChange={(value) => onChange("loanTermYears", value)} description="Pankkilainan takaisinmaksuaika vuosina." help="Laina-aika vaikuttaa kuukausierään ja lyhennyksen määrään." />
          <div className="min-w-0 space-y-2">
            <div className="flex min-h-10 flex-wrap items-start justify-between gap-3"><Label>Lyhennystyyppi</Label><SourceBadge status={status("repaymentType")} /></div>
            <p className="min-h-8 text-xs leading-4 text-muted-foreground">Määrittää, miten pankkilainan lyhennys ja maksuerä muodostuvat.</p>
            <Select value={values.repaymentType} onValueChange={(value) => value && onChange("repaymentType", value as RepaymentType)}>
              <SelectTrigger className="h-11 w-full"><SelectValue>{repayment.label}</SelectValue></SelectTrigger>
              <SelectContent>{repaymentOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">{repayment.description}</p>
          </div>
          <div className="min-w-0 space-y-2">
            <LocalizedNumberField id="equity" label="Sijoitettu oma pääoma" status={values.equityUserOverridden ? "user" : "default"} suffix="€" min={0} maximumFractionDigits={1} value={values.equity} onValueChange={(value) => onChange("equity", value)} description="Kaupantekoon käytettävä oma raha. Oletusarvo on 0 €." help="Oma pääoma pienentää laskennallista pankkilainan tarvetta. Oletus ei ole pankin hyväksymä rahoitusratkaisu." />
            {values.equityUserOverridden ? <Button type="button" variant="ghost" size="sm" className="h-auto px-0 text-xs" onClick={onResetEquity}>Palauta 0 € oletus</Button> : null}
          </div>
          <LocalizedNumberField id="collateral" label="Arvioitu vakuusarvo" status={status("collateralValue")} suffix="€" min={0} maximumFractionDigits={1} minimumFractionDigits={1} value={values.collateralValue} onValueChange={(value) => onChange("collateralValue", value)} description="Pankin kohteelle hyväksymä vakuusarvo. Tämä ei ole sama asia kuin kohteen markkinahinta." help="Vakuusarvo on pankin rahoituspäätöksessä käyttämä arvo. Tarkista todellinen vakuusarvo pankilta." />
        </CardContent>
      </Card>

      <Card data-input-group="market-assessments">
        <CardHeader className="border-b"><CardTitle>D. Markkina-arviot</CardTitle><CardDescription>Järjestelmä muodostaa esiarviot käytettävissä olevista tilasto- ja kohdetiedoista. Arviot eivät ole faktoja, ja voit aina vaihtaa ne.</CardDescription></CardHeader>
        <CardContent><div className="grid gap-6 lg:grid-cols-3">
          <RentalDemandSelector kind="rentalDemand" choice={marketAssessments.rentalDemand} onChange={(value) => onMarketChange("rentalDemand", value)} onRestore={() => onMarketRestore("rentalDemand")} />
          <RentalDemandSelector kind="locationRisk" choice={marketAssessments.locationRisk} onChange={(value) => onMarketChange("locationRisk", value)} onRestore={() => onMarketRestore("locationRisk")} />
          <RentalDemandSelector kind="resaleLiquidity" choice={marketAssessments.resaleLiquidity} onChange={(value) => onMarketChange("resaleLiquidity", value)} onRestore={() => onMarketRestore("resaleLiquidity")} />
        </div></CardContent>
      </Card>
    </div>
  );
}
