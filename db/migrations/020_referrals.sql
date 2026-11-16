-- Referrals. Every person has a code made from their first name (ANITA, then
-- ANITA2, ANITA3 when taken). Someone who signs up or pays with that code is
-- "referred"; when their account's first paid plan is activated, the
-- referrer's account gets bonus AI updates worth half a month of that plan.

-- Upper-case letters and digits of the first name, without a leading "Dr".
create function referral_code_base(full_name text) returns text
language plpgsql immutable as $$
declare
  words text[] := regexp_split_to_array(trim(coalesce(full_name, '')), '\s+');
  word text := coalesce(words[1], '');
begin
  if upper(regexp_replace(word, '[^A-Za-z]', '', 'g')) in ('DR', 'DOCTOR') and array_length(words, 1) > 1 then
    word := words[2];
  end if;
  word := left(upper(regexp_replace(word, '[^A-Za-z0-9]', '', 'g')), 12);
  if length(word) < 2 then
    word := 'LUMEN';
  end if;
  return word;
end;
$$;

-- The first free code for this name: the name itself, then the name with 2, 3...
create function next_referral_code(full_name text) returns text
language plpgsql as $$
declare
  base text := referral_code_base(full_name);
  candidate text := base;
  n int := 1;
begin
  while exists (select 1 from users where referral_code = candidate) loop
    n := n + 1;
    candidate := base || n;
  end loop;
  return candidate;
end;
$$;

alter table users add column referral_code text;

-- Existing people get theirs now, oldest first, so the earliest Anita is ANITA.
do $$
declare
  person record;
begin
  for person in select id, name from users where referral_code is null order by created_at, id loop
    update users set referral_code = next_referral_code(person.name) where id = person.id;
  end loop;
end;
$$;

alter table users alter column referral_code set not null;
create unique index users_referral_code_key on users (referral_code);

-- Every new person, however they joined (sign-up, invite, script), gets a code.
create function users_set_referral_code() returns trigger
language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := next_referral_code(new.name);
  end if;
  return new;
end;
$$;
create trigger users_referral_code before insert on users
  for each row execute function users_set_referral_code();

-- A code typed at sign-up waits here with the other details until the email is confirmed.
alter table signup_codes add column referral_code text;

-- One row per referred account. An account can be referred once; the code can
-- be changed until its first plan is activated, then the row is final.
create table referrals (
  id                uuid primary key default gen_random_uuid(),
  code              text not null,
  referrer_user_id  uuid references users(id) on delete set null,
  referrer_org_id   uuid references organizations(id) on delete set null,
  referred_org_id   uuid not null unique references organizations(id) on delete cascade,
  referred_user_id  uuid references users(id) on delete set null,
  -- Where the code was entered: 'signup' or 'plans'.
  source            text not null check (source in ('signup', 'plans')),
  created_at        timestamptz not null default now(),
  -- Set when the referred account's first plan was activated and the reward given.
  rewarded_at       timestamptz,
  reward_plan       text,
  reward_credits    int
);
create index referrals_referrer_idx on referrals (referrer_user_id, created_at desc);
create index referrals_created_idx on referrals (created_at desc);

-- Bonus AI updates. They do not reset each day: they are used only after the
-- day's plan allowance runs out, the one ending soonest first, and lapse on
-- their date.
create table bonus_credits (
  id           bigint generated always as identity primary key,
  org_id       uuid not null references organizations(id) on delete cascade,
  referral_id  uuid references referrals(id) on delete set null,
  granted      int not null check (granted > 0),
  remaining    int not null check (remaining >= 0),
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);
create index bonus_credits_open_idx on bonus_credits (org_id, expires_at) where remaining > 0;
