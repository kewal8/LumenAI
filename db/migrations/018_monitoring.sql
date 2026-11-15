-- Things that went wrong on the server, so staff can see them on the admin
-- dashboard instead of finding out from a doctor. Only the address (without
-- its search words), the kind of failure and a shortened message are kept.
-- Rows older than 30 days are removed by the nightly clean-up.
create table error_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  -- 'page' (rendering a screen), 'api' (a request from the app) or 'ai' (the report model).
  source      text not null,
  method      text,
  path        text,
  message     text not null,
  digest      text
);
create index error_events_created_idx on error_events (created_at desc);

-- How long each AI report update took, to watch it as usage grows.
alter table usage_events add column duration_ms integer;
