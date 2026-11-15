-- Open sign-up: a doctor creates their own account and confirms their email
-- with a six-digit code. Until the code is entered nothing is created; the
-- details wait here.
create table signup_codes (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  first_name     text not null,
  last_name      text not null,
  phone          text not null,
  password_hash  text not null,
  -- Only a hash of the code is stored.
  code_hash      text not null,
  attempts       int not null default 0,
  expires_at     timestamptz not null,
  used_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index signup_codes_email_idx on signup_codes (lower(email), created_at);

alter table users add column phone text;

-- 'unpaid': an account made through sign-up that has no plan yet. Its editor
-- stays locked until a plan is active. Accounts with no row stay on the pilot.
alter table subscriptions drop constraint subscriptions_status_check;
alter table subscriptions add constraint subscriptions_status_check
  check (status in ('pilot', 'unpaid', 'active', 'cancelled'));
