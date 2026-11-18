-- The report screen's working canvas. True (the default) shows the report on
-- A4 pages, with a mark where each printed page ends. False is an open canvas:
-- one continuous sheet with no page marks.
alter table users add column a4_canvas boolean not null default true;
