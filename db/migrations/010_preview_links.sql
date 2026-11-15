-- Links that open the editor preview without an account, for showing work in
-- progress to someone outside. Staff create them, can turn them off, and see
-- whether they were opened. Only a hash of the link's secret is stored.
create table preview_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  token_hash text not null unique,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  opens integer not null default 0,
  last_opened_at timestamptz
);
