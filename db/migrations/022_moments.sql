-- One-time greetings and reminders a person has seen or put off: the first
-- finalised report card, and the renewal reminders. A renewal moment's name
-- carries the plan's end date ("renew-7:2026-11-24"), so the next period's
-- reminders show again.
create table user_moments (
  user_id       uuid not null references users(id) on delete cascade,
  moment        text not null,
  seen_at       timestamptz,
  -- "Remind me tomorrow": not shown again until this time.
  snooze_until  timestamptz,
  primary key (user_id, moment)
);
