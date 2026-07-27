import { Info } from "lucide-react";
import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FieldStatus } from "@/core/domain/field";
import { cn } from "@/lib/utils";
import { SourceBadge } from "./status-badge";

type PropertyFieldProps = ComponentProps<typeof Input> & {
  label: string;
  status: FieldStatus;
  suffix?: string;
  help?: string;
};

export function PropertyField({ label, status, suffix, help, className, ...props }: PropertyFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <Label htmlFor={props.id} className="text-[13px]">{label}</Label>
        <div className="flex items-center gap-1.5">
          {help ? (
            <Tooltip>
              <TooltipTrigger aria-label={`Lisätietoa kentästä ${label}`} className="text-muted-foreground hover:text-foreground">
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{help}</TooltipContent>
            </Tooltip>
          ) : null}
          <SourceBadge status={status} />
        </div>
      </div>
      <div className="relative">
        <Input className={cn("h-10 pr-14 text-right tabular-nums", className)} {...props} />
        {suffix ? <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{suffix}</span> : null}
      </div>
    </div>
  );
}
