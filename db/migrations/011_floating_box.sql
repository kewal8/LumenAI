-- Whether the small always-on-top dictation window opens by itself when the
-- doctor starts speaking. On unless they turn it off in Settings.
alter table users add column floating_box boolean not null default true;
