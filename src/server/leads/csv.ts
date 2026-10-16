import type { MarketingLead } from "./repository";

function cell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function marketingLeadsCsv(leads: readonly MarketingLead[]): string {
  const lines = [["First Name", "Email", "Marketing Consent Timestamp", "Consent Source"], ...leads.map((lead) => [lead.firstName, lead.emailNormalized, lead.consentTimestamp?.toISOString() ?? "", lead.consentSource ?? ""])];
  return `\uFEFF${lines.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
