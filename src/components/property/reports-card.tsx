"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ReportsCard() {
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
          onClick={() => window.print()}
        >
          <Printer className="size-5" />
          Tulosta tai tallenna PDF
        </Button>
      </CardContent>
    </Card>
  );
}
