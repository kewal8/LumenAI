-- Per-user paste format for reports copied into PACS (font, size, headings, lines).
alter table users add column paste_profile jsonb;
