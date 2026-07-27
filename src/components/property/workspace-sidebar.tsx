import { Bot, Building2, FileText, Landmark, NotebookPen, Scale, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { brandName } from "@/core/i18n/display-values";

const links = [
  ["Kohde", "kohde", Building2], ["Talous", "talous", Landmark], ["Riskit", "riskit", ShieldCheck],
  ["Dokumentit", "dokumentit", FileText], ["Muistiinpanot", "muistiinpanot", NotebookPen], ["AI", "ai", Bot], ["Päätös", "paatos", Scale],
] as const;

export function WorkspaceSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-18 min-w-0 border-r bg-sidebar min-[1100px]:flex min-[1100px]:flex-col min-[1600px]:w-60">
      <div className="flex h-20 min-w-0 items-center justify-center gap-2 border-b px-3 min-[1600px]:justify-start min-[1600px]:px-5"><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-success text-white" title={brandName}><Building2 className="size-4" /></div><span className="hidden min-w-0 truncate text-sm font-semibold min-[1600px]:inline">{brandName}</span><Badge variant="outline" className="ml-auto hidden shrink-0 px-1.5 text-[10px] min-[1600px]:inline-flex">Ennakkoversio</Badge></div>
      <nav aria-label="Työtilan osiot" className="space-y-1 p-3">
        {links.map(([label, id, Icon], index) => <a key={id} href={`#${id}`} title={label} className={`flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-[1600px]:justify-start ${index === 0 ? "bg-success-soft text-success" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4 shrink-0" /><span className="hidden min-w-0 truncate min-[1600px]:inline">{label}</span></a>)}
      </nav>
      <div className="mt-auto hidden border-t p-4 text-xs leading-relaxed text-muted-foreground min-[1600px]:block">Kohdetyötila<br />Julkaisuehdokas</div>
    </aside>
  );
}
