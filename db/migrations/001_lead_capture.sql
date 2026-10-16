create extension if not exists pgcrypto;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  first_name varchar(80) not null,
  email_normalized varchar(254) not null unique,
  marketing_consent boolean not null default false,
  consent_timestamp timestamptz,
  consent_text_version varchar(80),
  consent_source varchar(80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_access_at timestamptz not null default now(),
  check (marketing_consent = false or (consent_timestamp is not null and consent_text_version is not null and consent_source is not null))
);

create unique index if not exists leads_email_normalized_idx on leads (email_normalized);
create index if not exists leads_marketing_consent_idx on leads (marketing_consent, consent_timestamp desc) where marketing_consent = true;

create table if not exists consent_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  action varchar(16) not null check (action in ('granted', 'revoked')),
  consent_text_version varchar(80),
  consent_source varchar(80) not null,
  occurred_at timestamptz not null default now()
);
create index if not exists consent_events_lead_idx on consent_events (lead_id, occurred_at desc);

create table if not exists funnel_events (
  id bigint generated always as identity primary key,
  event_name varchar(40) not null,
  funnel_id uuid not null,
  lead_id uuid references leads(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists funnel_events_name_created_idx on funnel_events (event_name, created_at desc);

create table if not exists lead_submission_attempts (
  id bigint generated always as identity primary key,
  attempt_kind varchar(24) not null,
  identifier_hash char(64) not null,
  created_at timestamptz not null default now()
);
create index if not exists lead_attempts_rate_limit_idx on lead_submission_attempts (attempt_kind, identifier_hash, created_at desc);
