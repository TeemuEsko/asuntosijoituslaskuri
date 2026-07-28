"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAnalysisReportData } from "@/core/reports/analysis-report";
import type { InvestmentAnalysisInput, InvestmentAnalysisResult } from "@/core/calculations/investment-analysis";

export function ReportsCard({ input, analysis }: { input: InvestmentAnalysisInput; analysis: InvestmentAnalysisResult }) {
  function downloadData() { const data = buildAnalysisReportData(input, analysis); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "asuntosijoitusanalyysi.json"; link.click(); URL.revokeObjectURL(url); }
  return <Card id="raportit" className="scroll-mt-24 print:hidden"><CardHeader className="border-b"><CardTitle>Raportit</CardTitle><CardDescription>Raportit muodostetaan aina ruudulla olevan ajantasaisen analyysin lähtötiedoista.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button type="button" onClick={() => window.print()}><Printer className="size-4" />Tulosta tai tallenna PDF</Button><Button type="button" variant="outline" onClick={downloadData}><Download className="size-4" />Lataa analyysidata</Button></CardContent></Card>;
}
