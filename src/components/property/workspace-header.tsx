import { FilePlus2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function WorkspaceHeader() {
  return (
    <header className="sticky top-0 z-30 flex min-h-17 flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2 lg:hidden"><span className="font-semibold text-success">PropertyOS</span><Badge variant="outline">Early Access</Badge></div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">Koulukatu 12 A 4</h1>
          <span className="text-sm text-muted-foreground">Vaasa</span>
          <Badge variant="outline" className="bg-muted/70">Luonnos</Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="lg"><FilePlus2 data-icon="inline-start" /> <span className="hidden sm:inline">Lisää dokumentteja</span><span className="sm:hidden">Dokumentit</span></Button>
        <Button size="lg"><Save data-icon="inline-start" /> Tallenna</Button>
      </div>
    </header>
  );
}
