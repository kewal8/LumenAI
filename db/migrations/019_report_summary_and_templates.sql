-- 1. The Reports list no longer opens each report to show or search it.
--
-- The first impression line and the number of abnormal lines are kept beside
-- the report, worked out by the database whenever a report is saved, so they
-- can never disagree with it.

create function report_findings(content jsonb) returns integer
language sql immutable
as $$
  select count(*)::int
  from jsonb_array_elements(
         case when jsonb_typeof(content->'sections') = 'array' then content->'sections' else '[]'::jsonb end
       ) as section,
       jsonb_array_elements(
         case when jsonb_typeof(section->'lines') = 'array' then section->'lines' else '[]'::jsonb end
       ) as line
  where line->>'status' <> 'normal'
$$;

alter table reports
  add column impression text generated always as (coalesce(content->'impression'->>0, '')) stored,
  add column findings integer generated always as (report_findings(content)) stored;

-- 2. A report's copy of its template is stored once, however many reports use it.
--
-- Every report keeps the template as it was when written. Hundreds of reports
-- from one template used to hold hundreds of identical copies; now each holds
-- the copy's fingerprint, and the copy itself is kept once here.
-- Reports saved before this keep their own copy in `template`.

create table report_templates (
  hash        text primary key,
  body        jsonb not null,
  created_at  timestamptz not null default now()
);

alter table reports
  alter column template drop not null,
  add column template_hash text references report_templates (hash),
  add constraint reports_template_kept check (template is not null or template_hash is not null);

-- For the nightly clean-up, which removes copies no report uses any more.
create index reports_template_hash_idx on reports (template_hash) where template_hash is not null;
