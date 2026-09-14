# Configuração — Gabinete Digital e Admin

## 1. Supabase
1. Abra o projeto correto no Supabase.
2. SQL Editor > New query.
3. Cole e execute `supabase/schema.sql`.
4. Authentication > Users: crie o usuário que terá acesso ao `/admin/`.
5. Copie o UUID do usuário e execute no SQL Editor:
   `insert into public.app_admins(user_id,email) values ('UUID_DO_USUARIO','EMAIL_DO_ADMIN');`

> Importante: em projetos Supabase recentes, tabelas novas podem não ser expostas automaticamente pela Data API. O script já concede acesso ao `service_role`; confirme em Data API Settings que o schema `public` está exposto.

## 2. Vercel
Em Project > Settings > Environment Variables, cadastre as variáveis presentes em `.env.example`.

Obrigatórias:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

Depois faça um novo deploy.

## 3. E-mail
O código usa a API do Resend no servidor. Cadastre:
- `RESEND_API_KEY`
- `DEMAND_EMAIL_TO=contato.eltoncarvalho@gmail.com`
- `DEMAND_EMAIL_FROM` com um remetente/domínio verificado no Resend.

Sem `RESEND_API_KEY`, a demanda continua sendo salva, mas o e-mail não é enviado.

## 4. WhatsApp
Há dois modos:
- **Fallback imediato:** sem credenciais da API, após protocolar o site abre uma conversa `wa.me` com a mensagem pronta.
- **Automático:** configure WhatsApp Business Cloud API com `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`.

## 5. Painel
Acesse `/admin/` e entre com o usuário criado no Supabase Auth.

O painel permite:
- visualizar todas as demandas;
- ver protocolo, nome, telefone, categoria, bairro, endereço, descrição e anexos;
- alterar status, prioridade e observações internas;
- editar textos, números e imagens cadastrados no CMS.

## 6. Privacidade
Os anexos de denúncias ficam em bucket privado. O site público pode criar arquivos, mas não possui política para listar ou ler esses anexos. O conteúdo editorial (`site-media`) é público porque precisa ser exibido na página.

## Admin na Vercel
Os arquivos do painel usam caminhos absolutos (`/admin/admin.css` e `/admin/admin.js`) para funcionar tanto em `/admin` quanto em `/admin/` com `cleanUrls` da Vercel.
