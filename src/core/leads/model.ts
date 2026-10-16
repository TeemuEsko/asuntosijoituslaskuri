export const CONSENT_TEXT_VERSION = "2026-10-16-v1";
export const CONSENT_SOURCE = "analysis_optin";
export const ACCESS_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type OptInInput = {
  firstName: string;
  email: string;
  marketingConsent: boolean;
};

export type ValidatedOptIn = {
  firstName: string;
  emailNormalized: string;
  marketingConsent: boolean;
};

export type ValidationResult =
  | { ok: true; value: ValidatedOptIn }
  | { ok: false; field: "firstName" | "email"; message: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

export function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function validateOptIn(input: OptInInput): ValidationResult {
  const firstName = input.firstName.trim().replace(/\s+/g, " ");
  if (!firstName) return { ok: false, field: "firstName", message: "Anna etunimesi." };
  if (firstName.length > 80) return { ok: false, field: "firstName", message: "Etunimi on liian pitkä." };
  if (!/^[\p{L}\p{M} .'-]+$/u.test(firstName)) return { ok: false, field: "firstName", message: "Tarkista etunimi." };

  const emailNormalized = normalizeEmail(input.email);
  if (!emailNormalized) return { ok: false, field: "email", message: "Anna sähköpostiosoitteesi." };
  if (emailNormalized.length > 254 || !emailPattern.test(emailNormalized)) return { ok: false, field: "email", message: "Anna kelvollinen sähköpostiosoite." };
  return { ok: true, value: { firstName, emailNormalized, marketingConsent: input.marketingConsent === true } };
}

export const funnelEvents = [
  "listing_url_submitted",
  "listing_identified",
  "optin_viewed",
  "optin_submitted",
  "optin_completed",
  "analysis_opened",
  "marketing_consent_granted",
] as const;

export type FunnelEventName = (typeof funnelEvents)[number];

export function isFunnelEventName(value: unknown): value is FunnelEventName {
  return typeof value === "string" && (funnelEvents as readonly string[]).includes(value);
}
