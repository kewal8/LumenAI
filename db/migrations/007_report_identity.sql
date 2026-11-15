-- What a doctor puts on their reports: sign-off text, signature image and
-- letterhead. Images are small data URLs, kept out of the users table so
-- ordinary account queries stay light.
create table report_identity (
  user_id uuid primary key references users (id) on delete cascade,
  signature_text text not null default '',
  signature_image text,
  header_image text,
  footer_image text,
  letterhead_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
