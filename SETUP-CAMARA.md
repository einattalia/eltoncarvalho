# Integração Câmara Municipal de São Carlos

## O que está automático
- Projetos de Lei Ordinária de Elton Carvalho: listagem oficial `tipo=15`.
- Requerimentos de Elton Carvalho: listagem oficial `tipo=30`.
- O total é extraído do texto oficial “Foram encontrados N resultados”.
- O botão **Dados da Câmara > Sincronizar agora** força atualização imediata.
- `/api/camara-sync` atualiza o cache via Vercel Cron a cada 6 horas.
- O site lê os totais de `legislative_stats` no Supabase e anima os contadores.

## Ofícios
O portal público não oferece, neste projeto, uma listagem específica de Ofícios equivalente às duas categorias acima. Por isso o total fica manual no Admin para não inventar dados. Quando houver uma URL oficial própria, ela pode ser automatizada.

## Antes do deploy
1. Rode `supabase/migration-v14-legislative-stats.sql` no SQL Editor do Supabase.
2. No Vercel, mantenha `SUPABASE_URL` e `SUPABASE_SECRET_KEY` configurados.
3. Crie `CRON_SECRET` no Vercel com uma senha longa e aleatória.
4. Faça Redeploy.
5. Entre em `/admin`, abra **Dados da Câmara** e clique **Sincronizar agora**.

## Teste esperado
Depois da sincronização, `/api/legislative` deve responder JSON com `projects`, `requirements`, `offices`, `total` e `lastSynced`.
