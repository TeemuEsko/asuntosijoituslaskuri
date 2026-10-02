import { FileText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brandName } from "@/core/i18n/display-values";

export function WorkspaceHeader({ title, location, reportsAvailable }: { title: string; location?: string; reportsAvailable: boolean }) {
  const scrollToReports = () => {
    document.getElementById("raportit")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="sticky top-0 z-30 grid min-h-20 grid-cols-1 gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-6">
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2 min-[1600px]:hidden"><Link href="/" aria-label="Siirry etusivulle" onClick={() => window.dispatchEvent(new Event("property-home"))} className="min-w-0 cursor-pointer truncate rounded-sm font-semibold text-success outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2">{brandName}</Link><Badge variant="outline" className="shrink-0">Ennakkoversio</Badge></div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="min-w-0 max-w-full truncate text-lg font-semibold tracking-tight">{title}</h1>
          <Badge variant="outline" className="shrink-0 bg-muted/70">Luonnos</Badge>
        </div>
        {location ? <p className="truncate text-xs text-muted-foreground">{location}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <Button type="button" size="lg" disabled={!reportsAvailable} title={reportsAvailable ? undefined : "Täydennä analyysin kriittiset tiedot raporttia varten."} onClick={scrollToReports}><FileText data-icon="inline-start" /> Luo raportti</Button>
      </div>
    </header>
  );
}
