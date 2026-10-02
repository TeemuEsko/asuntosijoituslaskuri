"use client";

import { Printer } from "lucide-react";
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
  function printReport() {
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
        >
          <Printer className="size-5" />
          Tulosta tai tallenna PDF
        </Button>
      </CardContent>
    </Card>
  );
}
