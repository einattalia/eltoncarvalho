-- v20.3 — novo modelo financeiro das Emendas Parlamentares
-- Seguro para dados existentes: preserva colunas antigas e migra o que for possível.

alter table public.parliamentary_amendments drop constraint if exists parliamentary_amendments_status_check;
update public.parliamentary_amendments set status = case
  when status in ('Executada') then 'Executada'
  when status in ('Recurso recebido','Confirmada','Indicada','Aguardando liberação') then 'Protocolada'
  else 'Em andamento' end;
alter table public.parliamentary_amendments alter column status set default 'Em andamento';
alter table public.parliamentary_amendments add constraint parliamentary_amendments_status_check check (status in ('Em andamento','Protocolada','Executada','Alterada'));

alter table public.parliamentary_amendments add column if not exists protocol_number text;
alter table public.parliamentary_amendments add column if not exists allocated_value numeric(14,2) not null default 0;
alter table public.parliamentary_amendments add column if not exists amendment_type text not null default 'Livre';
alter table public.parliamentary_amendments drop constraint if exists parliamentary_amendments_amendment_type_check;
alter table public.parliamentary_amendments add constraint parliamentary_amendments_amendment_type_check check (amendment_type in ('Saúde','Livre'));

-- Aproveita dados antigos na primeira migração.
update public.parliamentary_amendments set protocol_number = amendment_number where coalesce(protocol_number,'')='' and coalesce(amendment_number,'')<>'';
update public.parliamentary_amendments set allocated_value = case when approved_value > 0 then approved_value else requested_value end where allocated_value=0;
update public.parliamentary_amendments set parliamentarian='Elton Carvalho Porto';

create table if not exists public.amendment_budgets (
  year int primary key,
  initial_value numeric(14,2) not null default 0 check (initial_value >= 0),
  health_percentage numeric(5,2) not null default 0 check (health_percentage >= 0 and health_percentage <= 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.amendment_budgets enable row level security;
