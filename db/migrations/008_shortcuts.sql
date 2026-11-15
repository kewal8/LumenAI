-- Per-user keyboard shortcuts for the report screen. Null means the defaults.
alter table users add column shortcuts jsonb;
