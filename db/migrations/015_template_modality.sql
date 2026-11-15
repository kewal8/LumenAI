-- Templates are written in an open editor: the document is kept as written,
-- with the study type it belongs to.
alter table templates add column modality text;
alter table templates add column doc jsonb;
