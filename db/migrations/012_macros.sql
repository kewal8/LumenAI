-- A doctor's own short forms: saying or typing the short form puts the full
-- text into the dictation, such as "CSV" for a standard sentence.
create table macros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  short_form text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create unique index macros_user_short_form on macros (user_id, lower(short_form));
