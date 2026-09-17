-- v20.2 — Etiquetas coloridas do Kanban
alter table public.parliamentary_amendments add column if not exists labels text[] not null default '{}';
