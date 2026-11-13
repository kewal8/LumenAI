-- Requests sent from the public "Book a demo" page.
create table demo_requests (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  email              text not null,
  phone              text not null,
  designation        text,
  organisation       text,
  organisation_type  text,
  location           text,
  message            text,
  status             text not null default 'new' check (status in ('new', 'contacted', 'done', 'spam')),
  ip                 text,
  user_agent         text,
  created_at         timestamptz not null default now()
);
create index demo_requests_created_idx on demo_requests (created_at desc);
