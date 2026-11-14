-- Reports a doctor chose to save. `template` is a copy of the template as it
-- was when the report was written, so a saved report still opens and edits
-- correctly after the template is changed or deleted.
create table reports (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  user_id        uuid not null references users(id) on delete cascade,
  template_name  text not null,
  title          text not null,
  template       jsonb not null,
  content        jsonb not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index reports_user_idx on reports (user_id, updated_at desc);
