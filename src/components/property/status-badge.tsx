import { Badge } from "@/components/ui/badge";
import type { FieldStatus } from "@/core/domain/field";
import type { RuleStatus } from "@/core/rules/types";
import { fieldStatusLabels, ruleStatusLabels } from "@/core/i18n/display-values";
import { cn } from "@/lib/utils";

export function SourceBadge({ status }: { status: FieldStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        status === "user" && "border-success/25 bg-success-soft text-success",
        status === "derived" && "border-blue-200 bg-blue-50 text-blue-700",
        status === "missing" && "border-warning/25 bg-warning-soft text-warning",
      )}
    >
      {fieldStatusLabels[status]}
    </Badge>
  );
}

export function RuleStatusBadge({ status }: { status: RuleStatus }) {
  return <Badge variant="outline" className="bg-background font-normal">{ruleStatusLabels[status]}</Badge>;
}
