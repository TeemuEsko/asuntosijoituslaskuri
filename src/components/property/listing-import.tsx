"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  FileWarning,
  Link2,
  LoaderCircle,
  Pencil,
  Search,
  ShieldCheck,
  TextCursorInput,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  confidenceLabels,
  displayListingStringValue,
  renovationComponentLabels,
  timeStatusLabels,
} from "@/core/i18n/display-values";
import {
  formatArea,
  formatEuro,
  formatFinnishNumber,
  formatMonthlyEuro,
} from "@/core/parser/normalization";
import type {
  FindingDecision,
  ListingFinding,
  ListingParseResult,
} from "@/core/parser/listing-parser";
import { canDeterminePreparationNextStep, type AnalysisPreparationStatus } from "@/core/analysis/preparation-types";
import type { ImportedPropertyData } from "./property-workspace";
import { analysisReliability, automaticValues, debtShareStatus, missingAnalysisFields } from "@/core/analysis/requirements";
import type { NormalizedFieldKey } from "@/core/parser/synonyms";
import { ImportSourceReview } from "./import-source-review";
import { normalizeHeatingType } from "@/core/domain/heating";

type ImportMode = "url" | "text";
type DecisionState = Record<
  string,
  { decision: FindingDecision; correctedValue?: string }
>;
type ImportError = { code?: string; error: string };

function automaticValuesWithRent(result: ListingParseResult) {
  const values = automaticValues(result);
  if (values.currentRentMonthly === undefined && result.rentEstimate?.effectiveMonthlyRent) values.currentRentMonthly = result.rentEstimate.effectiveMonthlyRent;
  return values;
}

function rentAwareReliability(result: ListingParseResult, values: Partial<Record<NormalizedFieldKey, number | string>>, userCompletedFields: readonly NormalizedFieldKey[] = []) {
  return result.rentEstimate?.confidence === "low" ? "preliminary" as const : analysisReliability(result, values, userCompletedFields);
}

function displayFindingValue(
  finding: ListingFinding,
  correctedValue?: string,
): string {
  if (correctedValue !== undefined) return correctedValue;
  if (typeof finding.normalizedValue === "string") {
    return displayListingStringValue(finding.field, finding.normalizedValue);
  }
  if (finding.unit === "€") return formatEuro(finding.normalizedValue);
  if (finding.unit === "€/kk")
    return formatMonthlyEuro(finding.normalizedValue);
  if (finding.unit === "€/m²/kk")
    return `${formatFinnishNumber(finding.normalizedValue)} €/m²/kk`;
  if (finding.unit === "m²") return formatArea(finding.normalizedValue);
  return formatFinnishNumber(finding.normalizedValue);
}

function FindingCard({
  finding,
  state,
  onDecision,
  onCorrection,
}: {
  finding: ListingFinding;
  state: DecisionState[string];
  onDecision: (decision: FindingDecision) => void;
  onCorrection: (value: string) => void;
}) {
  const accepted =
    state.decision === "accepted" || state.decision === "corrected";
  return (
    <Card
      className={
        accepted
          ? "ring-success/40"
          : state.decision === "ignored"
            ? "opacity-60"
            : finding.conflicts.length
              ? "ring-danger/40"
              : undefined
      }
    >
      <CardContent className="grid gap-4 pt-1 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{finding.fieldName}</h3>
            <Badge variant="outline">
              Varmuus: {confidenceLabels[finding.confidence]}
            </Badge>
            <Badge variant="outline">{finding.confidenceScore}/100</Badge>
            {finding.aggregate ? (
              <Badge variant="outline">Yhteissumma</Badge>
            ) : null}
            {accepted ? (
              <Badge className="bg-success text-white">Hyväksytty</Badge>
            ) : finding.autoAccepted ? (
              <Badge variant="outline">Löydetty</Badge>
            ) : null}
          </div>
          <p className="mt-2 text-lg font-semibold tabular-nums">
            {displayFindingValue(finding, state.correctedValue)}
          </p>
          {finding.calculationBasis ? (
            <p className="mt-2 rounded-md bg-muted p-2 text-xs">
              Laskentaperuste: {finding.calculationBasis}
            </p>
          ) : null}
          {finding.breakdown ? (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {finding.breakdown.map((part) => (
                <li key={`${part.label}-${part.value}`}>
                  {part.label}: {formatMonthlyEuro(part.value)}
                </li>
              ))}
            </ul>
          ) : null}
          {finding.conflicts.map((conflict) => (
            <p key={conflict} className="mt-2 text-sm font-medium text-danger">
              Ristiriita: {conflict}
            </p>
          ))}
          <details className="mt-3 rounded-md border bg-background px-3 py-2 text-xs">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
              <ChevronDown className="size-3.5" />
              Näytä lähde ja varmuuden perusteet
            </summary>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <p>Alkuperäinen arvo: {finding.originalValue}</p>
              {finding.supportingSources.map((source, index) => (
                <p key={`${source.excerpt}-${index}`}>
                  Lähde {index + 1}: “{source.excerpt}”
                </p>
              ))}
              <ul className="list-inside list-disc">
                {finding.confidenceReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          </details>
          {state.decision === "corrected" ? (
            <div className="mt-3 max-w-xs space-y-2">
              <Label htmlFor={`correct-${finding.id}`}>Korjattu arvo</Label>
              <Input
                id={`correct-${finding.id}`}
                value={state.correctedValue ?? ""}
                onChange={(event) => onCorrection(event.currentTarget.value)}
              />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap content-start gap-2 md:max-w-48">
          <Button
            size="sm"
            variant={state.decision === "accepted" ? "default" : "outline"}
            onClick={() => onDecision("accepted")}
          >
            <Check /> Hyväksy
          </Button>
          <Button
            size="sm"
            variant={state.decision === "corrected" ? "default" : "outline"}
            onClick={() => onDecision("corrected")}
          >
            <Pencil /> Muokkaa
          </Button>
          <Button
            size="sm"
            variant={state.decision === "ignored" ? "destructive" : "outline"}
            onClick={() => onDecision("ignored")}
          >
            <X /> Jätä käyttämättä
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PreparationProgress({ status }: { status: AnalysisPreparationStatus }) {
  const estimatingRent = ["estimating_rent", "running_enrichments", "validating_inputs"].includes(status);
  const steps = [
    { label: "Myynti-ilmoitus luettu", complete: status !== "parsing_listing" },
    { label: "Kohteen perustiedot tunnistettu", complete: estimatingRent },
    { label: "Arvioidaan markkinavuokraa", complete: ["running_enrichments", "validating_inputs"].includes(status), active: status === "estimating_rent" },
    { label: "Muodostetaan sijoitusanalyysi", complete: status === "validating_inputs", active: ["running_enrichments", "validating_inputs"].includes(status) },
  ];
  return <Card className="mt-8 border-success/25"><CardContent className="space-y-5 py-2"><div className="flex gap-3"><LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-success" /><div><p className="font-semibold">{estimatingRent ? "Arvioimme kohteen markkinavuokraa…" : "Valmistelemme kohteen analyysiä…"}</p><p className="mt-1 text-sm text-muted-foreground">{estimatingRent ? "Haemme alueellisen vertailuvuokran kohteen sijainnin, pinta-alan ja huoneluvun perusteella." : "Luemme ja normalisoimme myynti-ilmoituksen tiedot."}</p></div></div><ol className="space-y-2 text-sm">{steps.map((step) => <li key={step.label} className={`flex items-center gap-2 ${step.complete ? "text-success" : step.active ? "font-medium text-foreground" : "text-muted-foreground"}`}><span aria-hidden="true">{step.complete ? "✓" : step.active ? "•" : "○"}</span>{step.label}</li>)}</ol></CardContent></Card>;
}

export function ListingImport({
  initialUrl,
  onBack,
  onComplete,
}: {
  initialUrl?: string;
  onBack: () => void;
  onComplete: (values: ImportedPropertyData) => void;
}) {
  const [mode, setMode] = useState<ImportMode>("url");
  const [value, setValue] = useState(initialUrl ?? "");
  const [result, setResult] = useState<ListingParseResult | null>(null);
  const [decisions, setDecisions] = useState<DecisionState>({});
  const [loading, setLoading] = useState(false);
  const [preparationStatus, setPreparationStatus] = useState<AnalysisPreparationStatus | "idle">("idle");
  const [error, setError] = useState<ImportError | null>(null);
  const [userValues, setUserValues] = useState<Partial<Record<NormalizedFieldKey, number | string>>>({});
  const [debtChoice, setDebtChoice] = useState<"yes" | "no" | null>(null);
  const [analysisUpdateError, setAnalysisUpdateError] = useState<string | null>(null);
  const initialSearchStarted = useRef(false);
  const searchListingRef = useRef<() => Promise<void>>(async () => undefined);

  async function searchListing(forceRefresh: boolean | unknown = false) {
    setLoading(true);
    setPreparationStatus("parsing_listing");
    setError(null);
    setResult(null);
    const phaseTimers = [
      window.setTimeout(() => setPreparationStatus("normalizing_data"), 150),
      window.setTimeout(() => setPreparationStatus("resolving_location"), 350),
      window.setTimeout(() => setPreparationStatus("estimating_rent"), 550),
    ];
    try {
      const response = await fetch("/api/listing-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: mode,
          value,
          forceRefresh: forceRefresh === true || result !== null,
        }),
      });
      const payload = (await response.json()) as
        | ListingParseResult
        | ImportError;
      if (!response.ok || "error" in payload) throw payload;
      setPreparationStatus("validating_inputs");
      if (!canDeterminePreparationNextStep(payload.preparation)) throw new Error("Automaattinen tietojen rikastus ei valmistunut hallitusti.");
      setUserValues({});
      setDebtChoice(null);
      setDecisions(Object.fromEntries(payload.findings.map((finding) => [finding.id, { decision: "pending" }])));
      const parsedValues = automaticValuesWithRent(payload);
      if (payload.preparation?.nextStep === "analysis") {
        setPreparationStatus("ready");
        onComplete({ ...parsedValues, rentEstimate: payload.rentEstimate, renovations: payload.renovations, documentKinds: ["listing"], importReview: payload, analysisReliability: rentAwareReliability(payload, parsedValues) });
      } else {
        setResult(payload);
        setPreparationStatus("needs_user_input");
      }
    } catch (caught) {
      setPreparationStatus("failed");
      setError(
        typeof caught === "object" && caught !== null && "error" in caught
          ? (caught as ImportError)
          : {
              error:
                "Tietojen käsittely epäonnistui. Liitä ilmoituksen teksti.",
            },
      );
    } finally {
      for (const timer of phaseTimers) window.clearTimeout(timer);
      setLoading(false);
    }
  }

  // Ref pitää ensimmäisen automaattihaun ajan tasalla ilman uutta renderöintiä.
  // eslint-disable-next-line react-hooks/refs
  searchListingRef.current = async () => { await searchListing(); };

  useEffect(() => {
    if (initialUrl && !initialSearchStarted.current) {
      initialSearchStarted.current = true;
      void searchListingRef.current();
    }
  }, [initialUrl]);

  function decide(finding: ListingFinding, decision: FindingDecision) {
    setDecisions((current) => {
      const next = {
        ...current,
        [finding.id]: { ...current[finding.id], decision },
      };
      if (
        (decision === "accepted" || decision === "corrected") &&
        finding.conflicts.length
      )
        for (const sibling of result?.findings ?? [])
          if (sibling.id !== finding.id && sibling.field === finding.field)
            next[sibling.id] = { decision: "ignored" };
      return next;
    });
  }

  function acceptAllCertain() {
    if (result)
      setDecisions((current) => ({
        ...current,
        ...Object.fromEntries(
          result.findings
            .filter(
              (finding) =>
                finding.autoAccepted && finding.validationResult === "accepted" && finding.confidence === "high" && !finding.conflicts.length,
            )
            .map((finding) => [finding.id, { decision: "accepted" }]),
        ),
      }));
  }

  function createProperty() {
    const importedValues: ImportedPropertyData = {
      renovations: result?.renovations ?? [],
      documentKinds: ["listing"],
      rentEstimate: result?.rentEstimate,
    };
    for (const finding of result?.findings ?? []) {
      const state = decisions[finding.id];
      if (
        !state ||
        !["accepted", "corrected"].includes(state.decision) ||
        (finding.unit === "€/m²/kk" && !finding.calculationBasis)
      )
        continue;
      const correctedValue =
        state.correctedValue !== undefined
          ? typeof finding.normalizedValue === "number"
            ? Number(state.correctedValue.replace(/\s/g, "").replace(",", "."))
            : state.correctedValue
          : finding.normalizedValue;
      const valueToUse = finding.field === "heatingType" && typeof correctedValue === "string" ? normalizeHeatingType(correctedValue) : correctedValue;
      if (
        (typeof valueToUse === "number" && Number.isFinite(valueToUse)) ||
        typeof valueToUse === "string"
      )
        importedValues[finding.field] = valueToUse;
    }
    onComplete(importedValues);
  }

  function finishAutomaticAnalysis() {
    setAnalysisUpdateError(null);
    try {
      if (!result) throw new Error("Parserin tulos puuttuu");
      const parsedValues = automaticValuesWithRent(result);
      const suggestedValues = Object.fromEntries(result.findings.filter((finding) => finding.validationResult === "accepted" && !finding.conflicts.length && missingAnalysisFields(parsedValues, result.rentEstimate).includes(finding.field)).map((finding) => [finding.field, finding.normalizedValue])) as Partial<Record<NormalizedFieldKey, number | string>>;
      const combined = { ...parsedValues, ...suggestedValues, ...userValues };
      if (typeof combined.heatingType === "string") combined.heatingType = normalizeHeatingType(combined.heatingType) ?? combined.heatingType;
      const validationErrors: string[] = [];
      const rentForValidation = typeof userValues.currentRentMonthly === "number" && userValues.currentRentMonthly > 0 ? { ...result.rentEstimate!, effectiveMonthlyRent: userValues.currentRentMonthly, source: "user" as const, sourceName: "Käyttäjän määrittämä vuokra", confidence: "high" as const, userOverridden: true, previousAutomaticEstimate: result.rentEstimate?.effectiveMonthlyRent ?? null, benchmark: result.rentEstimate?.effectiveMonthlyRent ? result.rentEstimate : null, resolutionStatus: "resolved" as const, attemptedSources: ["user" as const] } : result.rentEstimate;
      for (const field of missingAnalysisFields(combined, rentForValidation)) validationErrors.push(`${field}: arvo puuttuu`);
      for (const field of ["debtFreePrice", "maintenanceFeeMonthly", "areaSqm", "constructionYear", "currentRentMonthly"] as const) if (typeof combined[field] !== "number" || !Number.isFinite(combined[field]) || combined[field] <= 0) validationErrors.push(`${field}: anna positiivinen numero`);
      const detectedDebt = debtShareStatus(combined);
      if (detectedDebt === "unknown" && debtChoice === null) validationErrors.push("hasDebtShare: valitse kyllä tai ei");
      if (detectedDebt === "unknown" && debtChoice === "no") { combined.companyLoanShare = 0; combined.financingFeeMonthly = 0; }
      if (debtChoice === "yes" && (typeof combined.companyLoanShare !== "number" || combined.companyLoanShare < 0 || typeof combined.financingFeeMonthly !== "number" || combined.financingFeeMonthly < 0)) validationErrors.push("Yhtiölainaosuus ja rahoitusvastike tarvitaan");
      const canonicalPayload: ImportedPropertyData = { ...combined, rentEstimate: rentForValidation, renovations: result.renovations, documentKinds: ["listing"], importReview: result, analysisReliability: rentAwareReliability(result, combined, [...new Set([...missingAnalysisFields(parsedValues, result.rentEstimate), ...Object.keys(userValues) as NormalizedFieldKey[]])]) };
      if (process.env.NODE_ENV === "development") console.info("[analysis-update]", { submittedMissingFields: userValues, parsedNumericValues: Object.fromEntries(Object.entries(userValues).filter(([, value]) => typeof value === "number")), hasDebtShare: detectedDebt === "unknown" ? debtChoice : detectedDebt, debtShare: combined.companyLoanShare, financingFee: combined.financingFeeMonthly, canonicalPayload, validationErrors, analysisResult: validationErrors.length ? "invalid" : "ready", navigationTarget: "workspace" });
      if (validationErrors.length) throw new Error(validationErrors.join(", "));
      onComplete(canonicalPayload);
    } catch (caught) {
      if (process.env.NODE_ENV === "development") console.error("[analysis-update]", caught);
      setAnalysisUpdateError("Analyysin päivittäminen epäonnistui. Tarkista syötetyt tiedot ja yritä uudelleen.");
    }
  }

  const certain =
    result?.findings.filter(
      (finding) => finding.autoAccepted && finding.validationResult === "accepted" && finding.confidence === "high" && !finding.conflicts.length,
    ) ?? [];
  const uncertain =
    result?.findings.filter(
      (finding) => finding.confidence !== "high" && !finding.conflicts.length,
    ) ?? [];
  const conflicting =
    result?.findings.filter((finding) => finding.conflicts.length) ?? [];
  const unresolved = result?.findings.some((finding) => {
    const state = decisions[finding.id];
    return (
      !state ||
      state.decision === "pending" ||
      (state.decision === "corrected" && !state.correctedValue?.trim())
    );
  }) ?? false;
  const canCreate = Boolean(result?.findings.length) && !unresolved;

  if (result && typeof window !== "undefined") {
    const parsedValues = automaticValuesWithRent(result);
    // Pidä parserin määrittämä täydennyslomake vakaana koko syöttämisen ajan.
    // Käyttäjän keskeneräinen arvo validoidaan vasta Viimeistele analyysi -painalluksessa.
    const missing = missingAnalysisFields(parsedValues, result.rentEstimate);
    const detectedDebt = debtShareStatus(parsedValues);
    const askDebt = detectedDebt === "unknown";
    const needsDebtAmounts = (detectedDebt === "yes" || debtChoice === "yes") && (parsedValues.companyLoanShare === undefined || parsedValues.financingFeeMonthly === undefined);
    const fieldLabels: Partial<Record<NormalizedFieldKey, string>> = { debtFreePrice: "Velaton hinta", maintenanceFeeMonthly: "Hoitovastike / kk", areaSqm: "Pinta-ala", constructionYear: "Rakennusvuosi", buildingType: "Talotyyppi", heatingType: "Lämmitysmuoto", currentRentMonthly: "Kuukausivuokra" };
    const tooManyMissing = missing.length > 3;
    const onlyRentMissing = missing.length === 1 && missing[0] === "currentRentMonthly" && !askDebt;
    return <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 md:px-8 md:py-12"><Button variant="ghost" onClick={onBack}><ArrowLeft /> Takaisin</Button><section className="mt-8"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">asuntosijoituslaskuri.fi</p><h1 className="mt-2 text-3xl font-semibold">{tooManyMissing ? "Ilmoituksesta ei löytynyt riittävästi tietoa" : onlyRentMissing ? "Emme pystyneet arvioimaan kohteen vuokraa automaattisesti" : `Tarvitsen vielä ${missing.length + (askDebt ? 1 : 0)} ${missing.length + (askDebt ? 1 : 0) === 1 ? "tiedon" : "tietoa"} analyysiä varten`}</h1><p className="mt-2 text-muted-foreground">{tooManyMissing ? "Täydennä kohde käsin tai kokeile hakua uudelleen." : onlyRentMissing ? "Syötä arvioitu kuukausivuokra, jotta voimme viimeistellä analyysin." : "Automaattiset tietolähteet on käyty läpi. Täydennä vielä puuttuvat tiedot, niin viimeistelemme analyysin."}</p>{tooManyMissing ? <div className="mt-6 flex flex-wrap gap-3"><Button onClick={onBack}>Yritä uudelleen</Button><Button variant="outline" onClick={() => onComplete({})}>Syötä kaikki tiedot käsin</Button></div> : <Card className="mt-6"><CardContent className="space-y-5 pt-2">{missing.map((field) => { const suggestion = result.findings.find((finding) => finding.field === field)?.normalizedValue; const numeric = !["buildingType", "heatingType"].includes(field); const rawInputValue = userValues[field] ?? suggestion ?? ""; const inputValue = typeof rawInputValue === "string" ? displayListingStringValue(field, rawInputValue) : String(rawInputValue); return <div key={field} className="space-y-2"><Label htmlFor={`missing-${field}`}>{fieldLabels[field] ?? field}</Label><div className="relative"><Input className={field === "currentRentMonthly" ? "pr-16" : undefined} id={`missing-${field}`} type={numeric ? "number" : "text"} inputMode={numeric ? "decimal" : undefined} value={inputValue} onChange={(event) => { const raw = event.currentTarget.value; setAnalysisUpdateError(null); setUserValues((current) => ({ ...current, [field]: numeric ? raw === "" ? "" : Number(raw.replace(",", ".")) : raw })); }} />{field === "currentRentMonthly" ? <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">€/kk</span> : null}</div>{suggestion !== undefined ? <p className="text-xs text-muted-foreground">Ilmoituksesta arvioitu. Tarkista tarvittaessa.</p> : null}</div>; })}{askDebt ? <div className="space-y-2"><Label>Onko huoneistolla yhtiölainaosuutta?</Label><div className="flex gap-2"><Button type="button" variant={debtChoice === "no" ? "default" : "outline"} onClick={() => { setDebtChoice("no"); setAnalysisUpdateError(null); }}>Ei</Button><Button type="button" variant={debtChoice === "yes" ? "default" : "outline"} onClick={() => { setDebtChoice("yes"); setAnalysisUpdateError(null); }}>Kyllä</Button></div></div> : null}{needsDebtAmounts ? <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="missing-debt">Yhtiölainaosuus</Label><Input id="missing-debt" type="number" value={String(userValues.companyLoanShare ?? parsedValues.companyLoanShare ?? "")} onChange={(event) => setUserValues((current) => ({ ...current, companyLoanShare: event.currentTarget.value === "" ? "" : Number(event.currentTarget.value) }))} /></div><div className="space-y-2"><Label htmlFor="missing-fee">Pääomavastike / rahoitusvastike / kk</Label><Input id="missing-fee" type="number" value={String(userValues.financingFeeMonthly ?? parsedValues.financingFeeMonthly ?? "")} onChange={(event) => setUserValues((current) => ({ ...current, financingFeeMonthly: event.currentTarget.value === "" ? "" : Number(event.currentTarget.value) }))} /></div></div> : null}{analysisUpdateError ? <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft p-3 text-sm text-danger">{analysisUpdateError}</p> : null}<Button size="lg" onClick={finishAutomaticAnalysis}>Viimeistele analyysi</Button></CardContent></Card>}<div className="mt-6"><ImportSourceReview result={result} onChange={(field, value) => setUserValues((current) => ({ ...current, [field]: value ?? "" }))} /></div></section></main>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft /> Takaisin
      </Button>
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">
          asuntosijoituslaskuri.fi
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Hae tiedot myynti-ilmoituksesta
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Varmat tiedot esihyväksytään. Epävarmat ja ristiriitaiset tiedot
          tarkistat itse.
        </p>
      </div>
      {!initialUrl || error ? <Card className="mt-8">
        <CardHeader>
          <CardTitle>Myynti-ilmoituksen lähde</CardTitle>
          <CardDescription>
            Valitse Etuovi- tai Oikotie-linkki tai liitä ilmoituksen teksti.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === "url" ? "default" : "outline"}
              onClick={() => {
                setMode("url");
                setResult(null);
                setError(null);
              }}
            >
              <Link2 /> Ilmoituksen linkki
            </Button>
            <Button
              variant={mode === "text" ? "default" : "outline"}
              onClick={() => {
                setMode("text");
                setResult(null);
                setError(null);
              }}
            >
              <TextCursorInput /> Ilmoituksen teksti
            </Button>
          </div>
          {mode === "url" ? (
            <div className="space-y-2">
              <Label htmlFor="listing-url">Etuovi- tai Oikotie-linkki</Label>
              <Input
                id="listing-url"
                type="url"
                value={value}
                onChange={(event) => setValue(event.currentTarget.value)}
                placeholder="https://www.etuovi.com/kohde/..."
                className="h-11"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="listing-text">Ilmoituksen teksti</Label>
              <Textarea
                id="listing-text"
                value={value}
                onChange={(event) => setValue(event.currentTarget.value)}
                placeholder="Liitä myynti-ilmoituksen koko tietosisältö tähän"
                className="min-h-44"
              />
            </div>
          )}
          <Button
            size="lg"
            disabled={loading || !value.trim()}
            onClick={searchListing}
          >
            {loading ? <LoaderCircle className="animate-spin" /> : <Search />}{" "}
            {loading ? "Haetaan tietoja…" : result ? "Hae tiedot uudelleen" : "Hae tiedot"}
          </Button>
          {error ? (
            <div
              role="alert"
              className="space-y-3 rounded-lg border border-danger/25 bg-danger-soft p-3 text-sm text-danger"
            >
              <div className="flex gap-2">
                <AlertCircle className="size-4 shrink-0" />
                {error.error}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMode("text");
                  setValue("");
                  setError(null);
                }}
              >
                Liitä ilmoituksen teksti
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card> : loading && !result && preparationStatus !== "idle" ? <PreparationProgress status={preparationStatus} /> : null}
      {result ? (
        <section className="mt-8 space-y-7">
          <div><h1 className="text-2xl font-semibold">Tarkista löydetyt tiedot</h1><p className="mt-1 text-sm text-muted-foreground">Tiedot tallennetaan kohteelle vasta, kun hyväksyt ne.</p></div>
          <Card className="border-success/20">
            <CardContent className="grid gap-4 py-2 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-semibold text-success">
                  {certain.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  tietoa tunnistettiin varmasti
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-warning">
                  {uncertain.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  tietoa kannattaa tarkistaa
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-danger">
                  {
                    new Set(conflicting.flatMap((finding) => finding.conflicts))
                      .size
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  ristiriitaa löytyi
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {result.missingCriticalFields.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  olennaista tietoa puuttuu
                </p>
              </div>
            </CardContent>
          </Card>
          {result.warnings.length ? <div role="alert" className="rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm text-warning"><div className="flex items-center gap-2 font-medium"><AlertCircle className="size-4" />Tekninen tarkistus tarvitaan</div>{result.warnings.map((warning) => <p key={warning} className="mt-2">{warning}</p>)}</div> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={acceptAllCertain}>
              <ShieldCheck /> Hyväksy kaikki varmat tiedot
            </Button>
            {uncertain.length || conflicting.length ? (
              <Button
                variant="outline"
                onClick={() =>
                  document
                    .getElementById("tarkistettavat")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <FileWarning /> Tarkista epävarmat
              </Button>
            ) : null}
          </div>
          {certain.length ? (
            <section>
              <h2 className="text-xl font-semibold">Varmat tiedot</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Löydökset ovat korkean varmuuden tietoja, mutta odottavat vielä hyväksyntääsi.
              </p>
              <div className="mt-4 space-y-3">
                {certain.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    state={decisions[finding.id] ?? { decision: "pending" }}
                    onDecision={(decision) => decide(finding, decision)}
                    onCorrection={(correctedValue) =>
                      setDecisions((current) => ({
                        ...current,
                        [finding.id]: { decision: "corrected", correctedValue },
                      }))
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
          {uncertain.length ? (
            <section id="tarkistettavat" className="scroll-mt-6">
              <h2 className="text-xl font-semibold">Tarkistettavat tiedot</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keskitason ja matalan varmuuden tiedot vaativat valintasi.
              </p>
              <div className="mt-4 space-y-3">
                {uncertain.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    state={decisions[finding.id] ?? { decision: "pending" }}
                    onDecision={(decision) => decide(finding, decision)}
                    onCorrection={(correctedValue) =>
                      setDecisions((current) => ({
                        ...current,
                        [finding.id]: { decision: "corrected", correctedValue },
                      }))
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
          {conflicting.length ? (
            <section>
              <h2 className="text-xl font-semibold text-danger">Ristiriitaiset tiedot</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Arvoja ei ole ratkaistu automaattisesti. Valitse tai korjaa
                oikea ehdokas.
              </p>
              <div className="mt-4 space-y-3">
                {conflicting.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    state={decisions[finding.id] ?? { decision: "pending" }}
                    onDecision={(decision) => decide(finding, decision)}
                    onCorrection={(correctedValue) =>
                      setDecisions((current) => ({
                        ...current,
                        [finding.id]: { decision: "corrected", correctedValue },
                      }))
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
          <section>
            <h2 className="text-xl font-semibold">
              Puuttuvat olennaiset tiedot
            </h2>
            {result.missingCriticalFields.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.missingCriticalFields.map((field) => (
                  <Badge
                    key={field}
                    variant="outline"
                    className="border-warning/30 bg-warning-soft text-warning"
                  >
                    {field}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-success">
                Kaikki määritellyt olennaiset tiedot löytyivät.
              </p>
            )}
          </section>
          {result.renovations.length ? (
            <section>
              <h2 className="text-xl font-semibold">Remonttihavainnot</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Rakennusosat ja tapahtumien tilat pidetään erillään.
              </p>
              <div className="mt-4 space-y-3">
                {result.renovations.map((renovation, index) => (
                  <Card
                    key={`${renovation.component}-${renovation.status}-${index}`}
                  >
                    <CardContent className="py-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {renovationComponentLabels[renovation.component]}
                        </p>
                        <Badge variant="outline">
                          {timeStatusLabels[renovation.status]}
                        </Badge>
                        <Badge variant="outline">
                          Varmuus: {confidenceLabels[renovation.confidence]}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm">
                        {renovation.years.length
                          ? renovation.years.join("–")
                          : "Ajankohta ei tiedossa"}
                      </p>
                      <details className="mt-2 text-xs text-muted-foreground">
                        <summary className="cursor-pointer font-medium">
                          Näytä lähde
                        </summary>
                        {renovation.supportingExcerpts.map((excerpt) => (
                          <p key={excerpt} className="mt-1">
                            “{excerpt}”
                          </p>
                        ))}
                      </details>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
          {process.env.NODE_ENV === "development" ? (
            <details className="rounded-lg border border-dashed p-4 text-xs">
              <summary className="cursor-pointer font-semibold">
                Kehitysdiagnostiikka
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(result.diagnostics, null, 2)}
              </pre>
            </details>
          ) : null}
          <div className="flex justify-end">
            <Button size="lg" disabled={!canCreate} onClick={createProperty}>
              Luo kohde tarkistetuilla tiedoilla
            </Button>
          </div>
          {unresolved ? (
            <p className="text-right text-xs text-muted-foreground">
              Käsittele tarkistettavat ja ristiriitaiset tiedot ennen
              jatkamista.
            </p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
