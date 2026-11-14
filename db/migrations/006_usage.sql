-- One row per paid call: a Claude request or a stretch of dictation.
create table usage_events (
  id             bigint generated always as identity primary key,
  user_id        uuid references users(id) on delete set null,
  org_id         uuid references organizations(id) on delete set null,
  provider       text not null check (provider in ('claude', 'deepgram')),
  purpose        text not null,          -- report, template, dictation
  model          text,
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  seconds        integer not null default 0,
  created_at     timestamptz not null default now()
);
create index usage_events_created_idx on usage_events (created_at);
create index usage_events_org_idx on usage_events (org_id, created_at);
