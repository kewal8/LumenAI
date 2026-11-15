-- The patient and study a report is for, asked for when it is first saved.
-- Kept in their own columns so the Reports list can show and search them.
-- During the pilot these hold test details only, until data agreements are in place.
alter table reports add column patient_name text;
alter table reports add column patient_age integer;
alter table reports add column patient_age_unit text;
alter table reports add column patient_sex text;
alter table reports add column study text;
alter table reports add column modality text;
