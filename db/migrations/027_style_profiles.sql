-- Each radiologist's own reporting style: the phrases they use for positive
-- and negative findings, how they word certainty, how they lay out the
-- impression. Learned from their finalized reports and shown in Settings,
-- where they can edit or reset it. Every dictation is written in it.
-- It holds wording only, never a patient's details.
create table style_profiles (
  user_id         uuid primary key references users(id) on delete cascade,
  profile         text not null default '' check (length(profile) <= 8000),
  -- Finalized reports it was last built from, so it is rebuilt every few new ones.
  built_from      int not null default 0,
  built_at        timestamptz,
  -- When the doctor last changed it by hand; a rebuild keeps what they wrote.
  edited_at       timestamptz,
  updated_at      timestamptz not null default now()
);
