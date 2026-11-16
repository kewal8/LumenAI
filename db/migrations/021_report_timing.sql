-- How long a report takes, for the doctor's Insights.
--
-- created_at is the first save, which is often the moment of finalizing, so it
-- cannot time a report. started_at is when the doctor first changed this
-- report (sent by the report screen), and first_finalized_at is kept once:
-- finalizing again after an edit does not move it.

alter table reports
  add column started_at timestamptz,
  add column first_finalized_at timestamptz;

update reports set first_finalized_at = finalized_at where finalized_at is not null;

create index reports_insights_idx on reports (user_id, first_finalized_at) where first_finalized_at is not null;
