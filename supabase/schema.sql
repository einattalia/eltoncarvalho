-- Elton Carvalho | CMS + Gabinete Digital
-- Execute no SQL Editor do projeto Supabase e depois crie o primeiro usuário em Authentication > Users.

create extension if not exists pgcrypto;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.demands (
  id uuid primary key default gen_random_uuid(),
  external_ref text not null unique,
  protocol text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  kind text not null check (kind in ('Solicitação','Denúncia')),
  name text not null,
  phone text not null,
  category text not null,
  neighborhood text not null,
  address text,
  ouvidoria_protocol text,
  message text not null,
  attachments jsonb not null default '[]'::jsonb,
  consent boolean not null default false,
  status text not null default 'Nova',
  priority text not null default 'Média',
  internal_notes text,
  source text not null default 'site',
  email_notified boolean not null default false,
  whatsapp_notified boolean not null default false
);

create index if not exists demands_created_at_idx on public.demands(created_at desc);
create index if not exists demands_status_idx on public.demands(status);
create index if not exists demands_category_idx on public.demands(category);
create index if not exists demands_neighborhood_idx on public.demands(neighborhood);
create index if not exists demands_ouvidoria_protocol_idx on public.demands(ouvidoria_protocol);

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  value text not null default '',
  content_type text not null default 'text' check (content_type in ('text','html','image','url')),
  label text,
  section text not null default 'Geral',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_admins enable row level security;
alter table public.demands enable row level security;
alter table public.site_content enable row level security;

-- As tabelas são consumidas pelas funções server-side com service_role.
-- Nenhum dado de denúncia fica legível diretamente pelo navegador público.
revoke all on public.app_admins from anon, authenticated;
revoke all on public.demands from anon, authenticated;
revoke all on public.site_content from anon, authenticated;
grant all on public.app_admins to service_role;
grant all on public.demands to service_role;
grant all on public.site_content to service_role;

-- O usuário autenticado só pode consultar a própria autorização de admin.
grant select on public.app_admins to authenticated;
drop policy if exists "admin can read own authorization" on public.app_admins;
create policy "admin can read own authorization" on public.app_admins for select to authenticated
using (user_id = auth.uid() and active);

insert into public.site_content(content_key,value,content_type,label,section,sort_order) values
('hero.kicker','Vereador de São Carlos • 3º mandato','text','Linha superior','Hero',10),
('hero.title','TRABALHO QUE VOCÊ VÊ.<br><span>PRESENÇA QUE VOCÊ SENTE.</span>','html','Título principal','Hero',20),
('hero.subtitle','Um mandato próximo, presente nos bairros e focado em saúde, causa animal, infraestrutura e qualidade de vida.','text','Texto principal','Hero',30),
('hero.image','https://eltoncarvalho.netlify.app/assets/animal.jpg','image','Foto principal','Hero',40),
('stats.resources','+ R$ 4 mi','text','Recursos conquistados','Números',10),
('stats.requests','+ 200','text','Ofícios e requerimentos','Números',20),
('stats.protocols','+ 600','text','Protocolos','Números',30),
('numbers.resources','+ R$ 4 mi','text','Recursos — transparência','Números',40),
('numbers.requests','+ 200','text','Ofícios — transparência','Números',50),
('numbers.protocols','+ 600','text','Protocolos — transparência','Números',60),
('numbers.projects','+ 110','text','Projetos de lei','Números',70),
('about.title','POLÍTICA FEITA PERTO DAS PESSOAS.','text','Título','Sobre',10),
('about.text','Servidor público no SUS há 17 anos, Elton Carvalho une experiência na saúde, gestão pública e trabalho de rua para transformar demandas em ações concretas.','text','Texto','Sobre',20),
('about.image','https://eltoncarvalho.netlify.app/assets/saude.jpeg','image','Foto','Sobre',30),
('gabinete.title','GABINETE DIGITAL.','text','Título','Gabinete Digital',10),
('gabinete.text','Envie sua solicitação ou denúncia diretamente ao mandato. A demanda fica registrada, recebe protocolo e é encaminhada ao gabinete.','text','Descrição','Gabinete Digital',20),
('final.title','SÃO CARLOS É FEITA DE HISTÓRIAS.<br>A MINHA É TRABALHAR POR ELAS.','html','Chamada final','Rodapé',10),
('footer.text','Mandato presente, transparente e conectado com São Carlos.','text','Descrição do rodapé','Rodapé',20),
('about.kicker','Minha trajetória','text','Linha superior','Sobre',5),
('numbers.kicker','Transparência','text','Linha superior','Números',5),
('numbers.title','O MANDATO EM NÚMEROS.','text','Título da seção','Números',6),
('numbers.text','Indicadores reunidos para facilitar a prestação de contas e mostrar o volume de trabalho realizado.','text','Descrição da seção','Números',7),
('areas.kicker','Principais ações','text','Linha superior','Atuação',5),
('areas.title','ONDE O MANDATO ATUA.','text','Título da seção','Atuação',10),
('areas.text','Frentes de trabalho que concentram fiscalização, proposições, recursos e atendimento às demandas da população.','text','Descrição da seção','Atuação',15),
('areas.health.title','Saúde','text','Título — Saúde','Atuação',20),
('areas.health.text','Fiscalização das unidades, melhoria no atendimento e busca de recursos para ampliar a estrutura do SUS.','text','Descrição — Saúde','Atuação',21),
('areas.animal.title','Causa Animal','text','Título — Causa Animal','Atuação',30),
('areas.animal.text','Proteção, combate aos maus-tratos, políticas de adoção, atendimento veterinário e fortalecimento do bem-estar animal.','text','Descrição — Causa Animal','Atuação',31),
('areas.infra.title','Infraestrutura','text','Título — Infraestrutura','Atuação',40),
('areas.infra.text','Manutenção urbana, vias, iluminação, descarte irregular, mato alto e melhorias nos bairros.','text','Descrição — Infraestrutura','Atuação',41),
('areas.social.title','Área Social','text','Título — Área Social','Atuação',50),
('areas.social.text','Apoio a famílias, entidades e iniciativas que ampliam oportunidades e fortalecem a rede de proteção social.','text','Descrição — Área Social','Atuação',51),
('transparency.kicker','Mandato aberto','text','Linha superior','Transparência',5),
('transparency.title','ACOMPANHE O TRABALHO.','text','Título','Transparência',10),
('transparency.text','Uma área pensada para organizar projetos, requerimentos, recursos e ações do gabinete de maneira simples para o cidadão.','text','Descrição','Transparência',20),
('news.kicker','Acompanhe o mandato','text','Linha superior','Atualizações',5),
('news.title','ÚLTIMAS ATUALIZAÇÕES.','text','Título','Atualizações',10),
('news.text','Notícias, fiscalizações, projetos e ações do dia a dia.','text','Descrição','Atualizações',20),
('news.card1.title','Veja notícias e ações do mandato em São Carlos','text','Card 1 — título','Atualizações',30),
('news.card1.text','Acompanhe as publicações mais recentes sobre projetos, fiscalizações e resultados.','text','Card 1 — texto','Atualizações',31),
('news.card2.title','Atualizações sobre a atuação de Elton Carvalho','text','Card 2 — título','Atualizações',40),
('news.card2.text','Informação local com acompanhamento das ações do Legislativo.','text','Card 2 — texto','Atualizações',41),
('news.instagram.title','@eltoncarvalho10192','text','Instagram — título','Atualizações',50),
('news.instagram.text','Bastidores, agenda, fiscalização, saúde e causa animal.','text','Instagram — texto','Atualizações',51)
on conflict (content_key) do nothing;

-- Buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('demand-attachments','demand-attachments',false,10485760,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update set public=false, file_size_limit=10485760;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media','site-media',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=10485760;

-- Visitantes podem apenas CRIAR anexos em pasta aleatória; não podem ler, listar, atualizar ou apagar.
drop policy if exists "public can upload demand attachments" on storage.objects;
create policy "public can upload demand attachments" on storage.objects for insert to anon
with check (bucket_id = 'demand-attachments');

-- Administradores autenticados podem gerir imagens do CMS.
drop policy if exists "admins can upload site media" on storage.objects;
create policy "admins can upload site media" on storage.objects for insert to authenticated
with check (bucket_id = 'site-media' and exists (select 1 from public.app_admins a where a.user_id = auth.uid() and a.active));

drop policy if exists "admins can update site media" on storage.objects;
create policy "admins can update site media" on storage.objects for update to authenticated
using (bucket_id = 'site-media' and exists (select 1 from public.app_admins a where a.user_id = auth.uid() and a.active))
with check (bucket_id = 'site-media' and exists (select 1 from public.app_admins a where a.user_id = auth.uid() and a.active));

drop policy if exists "admins can delete site media" on storage.objects;
create policy "admins can delete site media" on storage.objects for delete to authenticated
using (bucket_id = 'site-media' and exists (select 1 from public.app_admins a where a.user_id = auth.uid() and a.active));

-- Depois de criar o usuário administrador em Authentication > Users, rode:
-- insert into public.app_admins(user_id,email) values ('UUID_DO_USUARIO','email@exemplo.com');
