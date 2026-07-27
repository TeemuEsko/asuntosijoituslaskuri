import { Badge } from "@/components/ui/badge";
import type { FieldStatus } from "@/core/domain/field";
import type { RuleStatus } from "@/core/rules/types";
import { cn } from "@/lib/utils";

const fieldLabels: Record<FieldStatus, string> = {
  parser: "Parseri",
  user: "Oma tieto",
  derived: "Johdettu",
  missing: "Puuttuu",
};

const ruleLabels: Record<RuleStatus, string> = {
  not_detected: "Ei havaittu",
  detected: "Havaittu",
  unchecked: "Tarkistamatta",
  not_applicable: "Ei sovellu",
  data_conflict: "Ristiriita",
};

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
      {fieldLabels[status]}
    </Badge>
  );
}

export function RuleStatusBadge({ status }: { status: RuleStatus }) {
  return <Badge variant="outline" className="bg-background font-normal">{ruleLabels[status]}</Badge>;
}
