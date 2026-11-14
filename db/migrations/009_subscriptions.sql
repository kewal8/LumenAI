-- One row per organisation once it has a plan or has asked for one. An
-- organisation with no row is on the pilot.
create table subscriptions (
  org_id           uuid primary key references organizations(id) on delete cascade,
  plan             text not null default 'pilot',
  cycle            text check (cycle in ('monthly', 'yearly')),
  status           text not null default 'pilot' check (status in ('pilot', 'active', 'cancelled')),
  period_end       timestamptz,
  -- A plan the organisation asked for. LumenAI activates it by hand until
  -- online payment is connected.
  requested_plan   text,
  requested_cycle  text check (requested_cycle in ('monthly', 'yearly')),
  requested_by     uuid references users(id) on delete set null,
  requested_at     timestamptz,
  updated_at       timestamptz not null default now()
);
