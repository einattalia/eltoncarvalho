-- v14 — Contadores legislativos sincronizados com a Câmara Municipal de São Carlos
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
