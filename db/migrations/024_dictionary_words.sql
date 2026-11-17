-- Words an account has added to its spelling dictionary (names, local terms,
-- abbreviations the radiology list does not have). Shared by everyone on the
-- account and used on every device.
create table dictionary_words (
  org_id      uuid not null references organizations(id) on delete cascade,
  word        text not null check (length(word) between 2 and 40),
  added_by    uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (org_id, word)
);
