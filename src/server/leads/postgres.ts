import "server-only";
import postgres, { type Sql } from "postgres";
import type { FunnelEventName, ValidatedOptIn } from "@/core/leads/model";
import type { LeadRepository, MarketingLead, StoredLead } from "./repository";

let client: Sql | undefined;

function database(): Sql {
  const connection = process.env.DATABASE_URL;
  if (!connection) throw new Error("DATABASE_URL_MISSING");
  client ??= postgres(connection, { max: 4, idle_timeout: 20, connect_timeout: 10, prepare: true });
  return client;
}

type LeadRow = { id: string; first_name: string; email_normalized: string; marketing_consent: boolean; consent_timestamp: Date | null; consent_source: string | null };
function mapLead(row: LeadRow): StoredLead {
  return { id: row.id, firstName: row.first_name, emailNormalized: row.email_normalized, marketingConsent: row.marketing_consent, consentTimestamp: row.consent_timestamp, consentSource: row.consent_source };
}

export class PostgresLeadRepository implements LeadRepository {
  async allowAttempt(kind: "optin" | "listing_identify", identifierHash: string, limit: number, windowSeconds: number): Promise<boolean> {
    const sql = database();
    return sql.begin(async (transaction) => {
      await transaction`select pg_advisory_xact_lock(hashtext(${`${kind}:${identifierHash}`}))`;
      const [count] = await transaction<{ count: number }[]>`select count(*)::int as count from lead_submission_attempts where attempt_kind = ${kind} and identifier_hash = ${identifierHash} and created_at > now() - (${windowSeconds} * interval '1 second')`;
      if ((count?.count ?? limit) >= limit) return false;
      await transaction`insert into lead_submission_attempts (attempt_kind, identifier_hash) values (${kind}, ${identifierHash})`;
      return true;
    });
  }

  async upsertLead(input: ValidatedOptIn, consent: { textVersion: string; source: string; timestamp: Date }): Promise<StoredLead> {
    const sql = database();
    return sql.begin(async (transaction) => {
      const [row] = await transaction<LeadRow[]>`
        insert into leads (first_name, email_normalized, marketing_consent, consent_timestamp, consent_text_version, consent_source)
        values (${input.firstName}, ${input.emailNormalized}, ${input.marketingConsent}, ${input.marketingConsent ? consent.timestamp : null}, ${input.marketingConsent ? consent.textVersion : null}, ${input.marketingConsent ? consent.source : null})
        on conflict (email_normalized) do update set
          first_name = excluded.first_name,
          marketing_consent = leads.marketing_consent or excluded.marketing_consent,
          consent_timestamp = case when excluded.marketing_consent then excluded.consent_timestamp else leads.consent_timestamp end,
          consent_text_version = case when excluded.marketing_consent then excluded.consent_text_version else leads.consent_text_version end,
          consent_source = case when excluded.marketing_consent then excluded.consent_source else leads.consent_source end,
          updated_at = now(), last_access_at = now()
        returning id, first_name, email_normalized, marketing_consent, consent_timestamp, consent_source`;
      if (!row) throw new Error("LEAD_UPSERT_FAILED");
      if (input.marketingConsent) await transaction`insert into consent_events (lead_id, action, consent_text_version, consent_source, occurred_at) values (${row.id}, 'granted', ${consent.textVersion}, ${consent.source}, ${consent.timestamp})`;
      return mapLead(row);
    });
  }

  async touchLead(leadId: string): Promise<boolean> {
    const rows = await database()`update leads set last_access_at = now(), updated_at = now() where id = ${leadId} returning id`;
    return rows.length === 1;
  }

  async recordFunnelEvent(event: FunnelEventName, funnelId: string, leadId?: string): Promise<void> {
    await database()`insert into funnel_events (event_name, funnel_id, lead_id) values (${event}, ${funnelId}, ${leadId ?? null})`;
  }

  async listMarketingLeads(): Promise<MarketingLead[]> {
    const rows = await database()<LeadRow[]>`select first_name, email_normalized, consent_timestamp, consent_source, id, marketing_consent from leads where marketing_consent = true and consent_timestamp is not null order by consent_timestamp desc`;
    return rows.map((row) => ({ firstName: row.first_name, emailNormalized: row.email_normalized, consentTimestamp: row.consent_timestamp, consentSource: row.consent_source }));
  }

  async revokeMarketingConsent(leadId: string, source: string, timestamp: Date): Promise<boolean> {
    const sql = database();
    return sql.begin(async (transaction) => {
      const rows = await transaction`update leads set marketing_consent = false, updated_at = now() where id = ${leadId} returning id`;
      if (!rows.length) return false;
      await transaction`insert into consent_events (lead_id, action, consent_source, occurred_at) values (${leadId}, 'revoked', ${source}, ${timestamp})`;
      return true;
    });
  }
}

export const leadRepository = new PostgresLeadRepository();
