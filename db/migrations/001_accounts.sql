-- Accounts: organisations, users, memberships, invites, sessions.
-- A solo radiologist is an organisation of one, so centres and individuals
-- share the same shape.

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null default 'solo' check (kind in ('solo', 'centre')),
  created_at  timestamptz not null default now()
);

create table users (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  name               text not null,
  password_hash      text not null,
  is_platform_admin  boolean not null default false,
  disabled_at        timestamptz,
  last_login_at      timestamptz,
  created_at         timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));

create table memberships (
  user_id     uuid not null references users(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  role        text not null check (role in ('owner', 'admin', 'radiologist')),
  created_at  timestamptz not null default now(),
  primary key (user_id, org_id)
);

-- Sign-up is invite only. org_id null means the invitee gets their own
-- solo organisation when they accept.
create table invites (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  org_id             uuid references organizations(id) on delete cascade,
  org_name           text,
  role               text not null default 'owner' check (role in ('owner', 'admin', 'radiologist')),
  is_platform_admin  boolean not null default false,
  token_hash         text not null unique,
  invited_by         uuid references users(id) on delete set null,
  expires_at         timestamptz not null,
  accepted_at        timestamptz,
  created_at         timestamptz not null default now()
);
create index invites_email_idx on invites (lower(email));

-- Only a hash of the session token is stored; the token lives in the cookie.
create table sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,
  user_agent  text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index sessions_user_idx on sessions (user_id);

create table password_resets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- Used to slow down password guessing.
create table login_attempts (
  id          bigint generated always as identity primary key,
  email       text not null,
  ip          text,
  succeeded   boolean not null,
  created_at  timestamptz not null default now()
);
create index login_attempts_email_idx on login_attempts (lower(email), created_at);
