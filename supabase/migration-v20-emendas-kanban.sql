-- v20 — Emendas Parlamentares em Kanban + documentos
create table if not exists public.parliamentary_amendments (
  id uuid primary key default gen_random_uuid(), title text not null, year int not null default extract(year from now()),
  status text not null default 'Em articulação' check (status in ('Em articulação','Indicada','Confirmada','Aguardando liberação','Recurso recebido','Executada','Cancelada/Arquivada')),
  area text, sphere text, parliamentarian text, party text, beneficiary text, municipality text default 'São Carlos/SP', purpose text,
  amendment_number text, requested_value numeric(14,2) not null default 0, approved_value numeric(14,2) not null default 0, received_value numeric(14,2) not null default 0,
  indication_date date, expected_payment_date date, received_date date, internal_owner text, articulation_origin text, notes text, is_public boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id)
);
create table if not exists public.amendment_history (
 id uuid primary key default gen_random_uuid(), amendment_id uuid not null references public.parliamentary_amendments(id) on delete cascade,
 event_type text not null, description text, from_status text, to_status text, created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create table if not exists public.amendment_documents (
 id uuid primary key default gen_random_uuid(), amendment_id uuid not null references public.parliamentary_amendments(id) on delete cascade,
 document_type text not null default 'Outro', office_number text, document_date date, description text, file_name text not null, storage_path text not null,
 mime_type text, file_size bigint default 0, is_public boolean not null default false, created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
alter table public.parliamentary_amendments enable row level security;
alter table public.amendment_history enable row level security;
alter table public.amendment_documents enable row level security;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('amendment-documents','amendment-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "admins upload amendment docs" on storage.objects;
create policy "admins upload amendment docs" on storage.objects for insert to authenticated with check (bucket_id='amendment-documents' and exists(select 1 from public.app_admins a where a.user_id=auth.uid() and a.active=true));
