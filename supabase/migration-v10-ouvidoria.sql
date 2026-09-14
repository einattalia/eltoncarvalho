-- V10 — adiciona protocolo opcional da Ouvidoria às demandas existentes
alter table public.demands
  add column if not exists ouvidoria_protocol text;

create index if not exists demands_ouvidoria_protocol_idx
  on public.demands(ouvidoria_protocol);
