import { buildPrintReportTitle } from "./print-report-title";

export function printCurrentReport(reportAddress?: string) {
  const previousTitle = document.title;
  let restored = false;
  let fallbackTimer: number | undefined;

  const restoreTitle = () => {
    if (restored) return;
    restored = true;
    document.title = previousTitle;
    window.removeEventListener("afterprint", restoreTitle);
    if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
  };

  document.title = buildPrintReportTitle(reportAddress);
  window.addEventListener("afterprint", restoreTitle, { once: true });

  try {
    window.print();
    fallbackTimer = window.setTimeout(restoreTitle, 1_000);
  } catch (error) {
    restoreTitle();
    throw error;
  }
}
