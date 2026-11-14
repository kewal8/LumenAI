-- Report templates. Each belongs to the person who made it; an owner or admin
-- can share one with the whole organisation.
create table templates (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references organizations(id) on delete cascade,
  owner_id           uuid not null references users(id) on delete cascade,
  shared             boolean not null default false,
  name               text not null,
  title              text not null,
  sections           jsonb not null,   -- [{ heading, lines: [text] }]
  normal_impression  jsonb not null,   -- [text]
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index templates_org_idx on templates (org_id);
create index templates_owner_idx on templates (owner_id);
