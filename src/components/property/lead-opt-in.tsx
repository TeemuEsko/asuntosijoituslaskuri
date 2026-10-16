"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, LockKeyhole } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackFunnelEvent } from "@/core/leads/client-analytics";

export function LeadOptIn({ onComplete }: { onComplete: () => void | Promise<void> }) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { trackFunnelEvent("optin_viewed"); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    trackFunnelEvent("optin_submitted");
    try {
      const response = await fetch("/api/leads/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ firstName, email, marketingConsent }),
        signal: AbortSignal.timeout(15_000),
      });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "Tietojen tallentaminen epäonnistui.");
      await onComplete();
    } catch (caught) {
      setError(caught instanceof Error && caught.name === "TimeoutError" ? "Tallennus aikakatkaistiin. Yritä uudelleen." : caught instanceof Error ? caught.message : "Tallennus epäonnistui. Yritä uudelleen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-xl border-success/30 shadow-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-1 grid size-11 place-items-center rounded-full bg-success-soft text-success"><LockKeyhole className="size-5" /></div>
        <CardTitle className="text-2xl"><h2>Analyysisi on pian valmis!</h2></CardTitle>
        <CardDescription className="mx-auto max-w-md text-sm leading-relaxed">Syötä yhteystietosi, niin pääset tarkastelemaan kohteen tuottoja, riskejä ja sijoitusmahdollisuuksia.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="lead-first-name">Etunimi</Label>
            <Input id="lead-first-name" name="firstName" autoComplete="given-name" maxLength={80} required className="h-11" value={firstName} onChange={(event) => { setFirstName(event.currentTarget.value); setError(null); }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-email">Sähköpostiosoite</Label>
            <Input id="lead-email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} required className="h-11" value={email} onChange={(event) => { setEmail(event.currentTarget.value); setError(null); }} />
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
            <Checkbox id="marketing-consent" checked={marketingConsent} onCheckedChange={(checked) => setMarketingConsent(checked === true)} aria-describedby="marketing-consent-description" />
            <Label id="marketing-consent-description" htmlFor="marketing-consent" className="cursor-pointer text-sm font-normal leading-relaxed">Haluan saada sähköpostitse asuntosijoittamiseen liittyviä vinkkejä, koulutuksia ja tarjouksia.</Label>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">Markkinointilupa on vapaaehtoinen eikä vaikuta analyysin avaamiseen. Lue <Link href="/tietosuoja" className="font-medium text-foreground underline underline-offset-2">tietosuojaseloste</Link>.</p>
          {error ? <p role="alert" className="flex gap-2 rounded-lg border border-danger/25 bg-danger-soft p-3 text-sm text-danger"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</p> : null}
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={submitting || !firstName.trim() || !email.trim()}>{submitting ? "Tallennetaan…" : "Katso maksuton analyysi"}{!submitting ? <ArrowRight /> : null}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
