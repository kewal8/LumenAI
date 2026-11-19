-- Feedback sent from inside the app ("Send feedback" on the new-report
-- screen). LumenAI staff read it in the admin panel. The sender's name, email
-- and account are copied in, so a message still says who wrote it after that
-- person or account is removed.
create table feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete set null,
  org_id        uuid references organizations(id) on delete set null,
  sender_name   text not null,
  sender_email  text not null,
  org_name      text,
  message       text not null check (length(message) between 1 and 4000),
  -- The screen it was sent from, such as /report.
  page          text,
  created_at    timestamptz not null default now()
);

create index feedback_created_at_idx on feedback (created_at desc);
