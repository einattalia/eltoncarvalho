-- v15.1 — compatibilidade e recuperação do painel Admin
-- Seguro para executar mais de uma vez.

alter table if exists public.demands add column if not exists ouvidoria_protocol text;
alter table if exists public.demands add column if not exists resolved_at timestamptz;
alter table if exists public.demands add column if not exists email_notified boolean not null default false;
alter table if exists public.demands add column if not exists whatsapp_notified boolean not null default false;

create index if not exists demands_ouvidoria_protocol_idx on public.demands(ouvidoria_protocol);
create index if not exists demands_resolved_at_idx on public.demands(resolved_at);

create table if not exists public.legislative_stats (
  stat_key text primary key check (stat_key in ('projects','requirements','offices')),
  stat_value integer not null default 0 check (stat_value >= 0),
  source_mode text not null default 'automatic' check (source_mode in ('automatic','manual')),
  source_url text,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.legislative_stats enable row level security;
revoke all on public.legislative_stats from anon, authenticated;
grant all on public.legislative_stats to service_role;

insert into public.legislative_stats(stat_key,stat_value,source_mode,source_url)
values ('offices',0,'manual',null)
on conflict (stat_key) do nothing;
