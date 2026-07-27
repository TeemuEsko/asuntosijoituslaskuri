export const forbiddenVisibleValues = [
  "PropertyOS",
  "Early Access",
  "Property Workspace",
  "owned",
  "leased",
  "optional_lease",
  "redeemed",
  "not_redeemed",
  "unchecked",
  "annuity",
  "draft",
  "pending",
  "success",
  "warning",
  "error",
  "loading",
  "true",
  "false",
  "parser",
  "parse",
  "import",
];

export function visibleTextFromHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
