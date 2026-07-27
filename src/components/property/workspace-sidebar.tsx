import { Bot, Building2, FileText, Landmark, NotebookPen, Scale, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { brandName } from "@/core/i18n/display-values";

const links = [
  ["Kohde", "kohde", Building2], ["Talous", "talous", Landmark], ["Riskit", "riskit", ShieldCheck],
  ["Dokumentit", "dokumentit", FileText], ["Muistiinpanot", "muistiinpanot", NotebookPen], ["AI", "ai", Bot], ["Päätös", "paatos", Scale],
] as const;

export function WorkspaceSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-17 items-center gap-2 border-b px-5"><div className="grid size-8 place-items-center rounded-lg bg-success text-white"><Building2 className="size-4" /></div><span className="text-sm font-semibold">{brandName}</span><Badge variant="outline" className="ml-auto px-1.5 text-[10px]">Ennakkoversio</Badge></div>
      <nav aria-label="Työtilan osiot" className="space-y-1 p-3">
        {links.map(([label, id, Icon], index) => <a key={id} href={`#${id}`} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${index === 0 ? "bg-success-soft text-success" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4" />{label}</a>)}
      </nav>
      <div className="mt-auto border-t p-4 text-xs leading-relaxed text-muted-foreground">Kohdetyötila<br />Julkaisuehdokas</div>
    </aside>
  );
}
