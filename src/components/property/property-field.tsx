import { Info } from "lucide-react";
import type { ComponentProps } from "react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FieldStatus } from "@/core/domain/field";
import { cn } from "@/lib/utils";
import { SourceBadge } from "./status-badge";

type PropertyFieldProps = ComponentProps<typeof Input> & {
  label: string;
  status: FieldStatus;
  sourceLabel?: string;
  suffix?: string;
  help?: string;
  description?: string;
  endAdornment?: ReactNode;
};

export function PropertyField({ label, status, sourceLabel, suffix, help, description, endAdornment, className, ...props }: PropertyFieldProps) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex min-h-10 min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <Label htmlFor={props.id} className="min-w-0 flex-1 whitespace-normal text-[13px] leading-5">{label}</Label>
        <div className="flex shrink-0 items-center gap-1.5">
          {help ? (
            <Tooltip>
              <TooltipTrigger aria-label={`Lisätietoa kentästä ${label}`} className="text-muted-foreground hover:text-foreground">
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{help}</TooltipContent>
            </Tooltip>
          ) : null}
          <SourceBadge status={status} label={sourceLabel} />
        </div>
      </div>
      {description ? <p className="min-h-8 text-xs leading-4 text-muted-foreground">{description}</p> : null}
      <div className="relative">
        <Input className={cn("h-11 text-right tabular-nums", endAdornment ? suffix ? "pr-28" : "pr-12" : suffix ? suffix.length > 4 ? "pr-20" : "pr-12" : "pr-3", className)} {...props} />
        {suffix ? <span className={cn("pointer-events-none absolute inset-y-0 flex max-w-16 items-center whitespace-nowrap text-sm text-muted-foreground", endAdornment ? "right-11" : "right-3")}>{suffix}</span> : null}
        {endAdornment ? <span className="absolute inset-y-1 right-1 flex w-8 flex-col overflow-hidden rounded-md border bg-background">{endAdornment}</span> : null}
      </div>
    </div>
  );
}
