-- Postgres schema for the reporting MVP. Not applied anywhere yet.
-- No patient identifiers are stored: reports hold report text only.

create table orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table users (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id),
  email       text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table templates (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id),
  name        text not null,
  modality    text not null,
  body_part   text not null,
  raw_text    text not null,          -- template as pasted by the radiologist
  schema      jsonb not null,         -- sections with default normal text
  created_at  timestamptz not null default now()
);

create table reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id),
  template_id   uuid not null references templates(id),
  generated     jsonb not null default '{}',  -- sections: text, source span, status
  final_text    text,
  status        text not null default 'draft' check (status in ('draft', 'signed')),
  created_at    timestamptz not null default now(),
  signed_at     timestamptz
);

-- One thread per report: each dictation or typed instruction and the patch it produced.
create table report_messages (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references reports(id) on delete cascade,
  transcript  text not null,
  patch       jsonb not null,
  created_at  timestamptz not null default now()
);

-- Generated vs signed text per section: the correction-rate metric and teaching feedback.
create table report_edits (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references reports(id) on delete cascade,
  section     text not null,
  generated   text not null,
  signed      text not null,
  created_at  timestamptz not null default now()
);

create table audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references users(id),
  action      text not null,
  report_id   uuid,
  created_at  timestamptz not null default now()
);
