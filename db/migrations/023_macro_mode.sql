-- How a spoken macro shows in the dictation box: 'expand' writes its full text
-- straight away; 'keep' leaves the short form (such as "CSV"), with its full
-- text a hover away, and expands it when the report is written.
alter table users add column macro_mode text not null default 'expand'
  check (macro_mode in ('expand', 'keep'));
