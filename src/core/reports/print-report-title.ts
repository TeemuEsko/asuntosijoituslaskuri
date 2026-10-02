export const PRINT_REPORT_FALLBACK_TITLE =
  "Sijoitusanalyysi – asuntosijoituslaskuri.fi";

export function buildPrintReportTitle(address?: string): string {
  const cleanAddress = address?.trim();
  return cleanAddress
    ? `Sijoitusanalyysi – ${cleanAddress}`
    : PRINT_REPORT_FALLBACK_TITLE;
}

