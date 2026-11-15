-- When the doctor last finalized a report. Null while it is still a draft.
alter table reports add column finalized_at timestamptz;
