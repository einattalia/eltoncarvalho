-- V11 — métricas avançadas do dashboard
alter table public.demands
  add column if not exists resolved_at timestamptz;

-- Para registros já resolvidos, usa a última atualização como referência inicial.
update public.demands
set resolved_at = coalesce(resolved_at, updated_at)
where status = 'Resolvida' and resolved_at is null;

create index if not exists demands_resolved_at_idx
  on public.demands(resolved_at);
