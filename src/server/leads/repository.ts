import type { FunnelEventName, ValidatedOptIn } from "@/core/leads/model";

export type StoredLead = { id: string; firstName: string; emailNormalized: string; marketingConsent: boolean; consentTimestamp: Date | null; consentSource: string | null };
export type MarketingLead = Pick<StoredLead, "firstName" | "emailNormalized" | "consentTimestamp" | "consentSource">;

export interface LeadRepository {
  allowAttempt(kind: "optin" | "listing_identify", identifierHash: string, limit: number, windowSeconds: number): Promise<boolean>;
  upsertLead(input: ValidatedOptIn, consent: { textVersion: string; source: string; timestamp: Date }): Promise<StoredLead>;
  touchLead(leadId: string): Promise<boolean>;
  recordFunnelEvent(event: FunnelEventName, funnelId: string, leadId?: string): Promise<void>;
  listMarketingLeads(): Promise<MarketingLead[]>;
  revokeMarketingConsent(leadId: string, source: string, timestamp: Date): Promise<boolean>;
}
