-- Lookups that would otherwise read a whole table as accounts and usage grow.

-- Members of an organisation: the team page, the admin account lists and searches.
-- (The primary key starts with user_id, so it does not help a lookup by organisation.)
create index memberships_org_idx on memberships (org_id);

-- One person's recent usage: the per-minute limit on AI updates and the admin's per-person figures.
create index usage_events_user_idx on usage_events (user_id, created_at);
