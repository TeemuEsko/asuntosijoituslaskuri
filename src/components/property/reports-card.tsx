"use client";

import { AlertCircle, Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildPrintReportTitle } from "@/core/reports/print-report-title";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ReportsCard({ reportAddress }: { reportAddress?: string }) {
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  async function printReport() {
    if (checkingAccess) return;
    setCheckingAccess(true);
    setAccessError(null);
    try {
      const access = await fetch("/api/report", { cache: "no-store", credentials: "same-origin" });
      if (!access.ok) {
        setAccessError(access.status === 401 ? "Istuntosi on vanhentunut. Aloita uusi analyysi ja anna yhteystietosi uudelleen." : "Raportin käyttöoikeutta ei voitu tarkistaa. Yritä uudelleen.");
        return;
      }
    const previousTitle = document.title;
    let restored = false;
    let fallbackTimer: number | undefined;
    const restoreTitle = () => {
      if (restored) return;
      restored = true;
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };

    document.title = buildPrintReportTitle(reportAddress);
    window.addEventListener("afterprint", restoreTitle, { once: true });
    try {
      window.print();
      fallbackTimer = window.setTimeout(restoreTitle, 1_000);
    } catch (error) {
      restoreTitle();
      throw error;
    }
    } catch {
      setAccessError("Raportin avaaminen epäonnistui verkkovirheen vuoksi. Yritä uudelleen.");
    } finally {
      setCheckingAccess(false);
    }
  }

  return (
    <Card
      id="raportit"
      className="scroll-mt-40 border-primary/25 print:hidden sm:scroll-mt-24"
    >
      <CardHeader className="border-b">
        <CardTitle>Raportit</CardTitle>
        <CardDescription>
          Raportti muodostetaan aina ruudulla olevan ajantasaisen analyysin
          lähtötiedoista.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          size="lg"
          className="h-14 w-full text-base font-semibold sm:w-auto sm:min-w-72"
          onClick={printReport}
          disabled={checkingAccess}
        >
          <Printer className="size-5" />
          {checkingAccess ? "Tarkistetaan käyttöoikeutta…" : "Tulosta tai tallenna PDF"}
        </Button>
        {accessError ? <p role="alert" className="mt-3 flex max-w-xl gap-2 text-sm text-danger"><AlertCircle className="mt-0.5 size-4 shrink-0" />{accessError}</p> : null}
      </CardContent>
    </Card>
  );
}
