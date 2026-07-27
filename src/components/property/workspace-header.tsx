import { FilePlus2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brandName } from "@/core/i18n/display-values";

export function WorkspaceHeader({ title, location }: { title: string; location?: string }) {
  return (
    <header className="sticky top-0 z-30 grid min-h-20 grid-cols-1 gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-6">
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2 min-[1600px]:hidden"><span className="min-w-0 truncate font-semibold text-success">{brandName}</span><Badge variant="outline" className="shrink-0">Ennakkoversio</Badge></div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="min-w-0 max-w-full truncate text-lg font-semibold tracking-tight">{title}</h1>
          <Badge variant="outline" className="shrink-0 bg-muted/70">Luonnos</Badge>
        </div>
        {location ? <p className="truncate text-xs text-muted-foreground">{location}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <Button variant="outline" size="lg"><FilePlus2 data-icon="inline-start" /> <span className="hidden sm:inline">Lisää dokumentteja</span><span className="sm:hidden">Dokumentit</span></Button>
        <Button size="lg"><Save data-icon="inline-start" /> Tallenna</Button>
      </div>
    </header>
  );
}
