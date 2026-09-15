# Elton Carvalho — versão inspirada na referência Lucas Pavanato

Projeto estático pronto para Vercel, mantendo a identidade oficial de Elton Carvalho.

## Estrutura
- `index.html` na raiz
- `css/style.css`
- `js/app.js`
- `js/map-actions.js`
- `js/maps-config.js`
- `assets/brand/` com logos e pattern oficiais

## Google Maps
Para ativar marcadores e filtros no mapa, edite `js/maps-config.js` e insira uma chave válida da Google Maps JavaScript API. Sem a chave, o site usa o mapa incorporado como fallback.

## Direção visual
- Teko em títulos e destaques
- Lexend em textos e navegação
- Azul, verde e amarelo da identidade oficial
- Pattern aplicado como assinatura gráfica
- Gabinete Digital preservado
- Mapa interativo preservado e integrado ao novo layout

## Atualização Gabinete Digital / Admin

Esta versão inclui painel em `/admin/`, CMS editável, banco de demandas, anexos privados, notificações por e-mail/WhatsApp e scripts de configuração do Supabase. Consulte `SETUP-GABINETE-DIGITAL.md`.


## Atualizações desta versão
- Upload de imagens no Admin agora salva automaticamente a nova URL no CMS após o envio.
- Gabinete Digital: aba exclusiva vermelha `Denúncia Causa Animal`.
- `Causa Animal` não aparece mais como categoria nas solicitações.
- Na denúncia de Causa Animal o campo Categoria fica oculto e o sistema registra automaticamente `Causa Animal`.

## V10 — Protocolo Ouvidoria + Dashboard de Relatórios
- Novo campo opcional `Protocolo Ouvidoria` para Solicitação e Denúncia Causa Animal.
- O protocolo pode ser vinculado/alterado também pelo painel administrativo.
- Botão `Gerar relatório` no painel e nova seção `Relatórios`.
- Dashboard com filtros por período, tipo e status; indicadores, distribuição por status/categoria/bairro, CSV e impressão/PDF.
- Antes de publicar, execute uma única vez `supabase/migration-v10-ouvidoria.sql` no SQL Editor do Supabase existente.


## V11 — Dashboard avançado
Antes de publicar esta versão, execute no SQL Editor do Supabase o arquivo `supabase/migration-v11-dashboard.sql`. Ele adiciona `resolved_at`, usado para calcular o tempo médio até a resolução.

O dashboard de relatórios agora inclui: demandas por mês, tempo médio até resolução, taxa de resolução e funil de Causa Animal (recebidas, encaminhadas e resolvidas).

## v14 — Integração automática com a Câmara Municipal

A seção **O mandato em números** agora possui contadores legislativos separados para:
- Projetos de Lei apresentados;
- Requerimentos apresentados;
- Ofícios encaminhados.

### Como ativar
1. No Supabase SQL Editor, execute `supabase/migration-v14-legislative-stats.sql`.
2. Faça o redeploy na Vercel.
3. No painel `/admin`, abra **Dados da Câmara** e clique em **Sincronizar agora**.
4. A Vercel também executará `/api/camara-sync` a cada 6 horas pelo Cron configurado em `vercel.json`.
5. Em Vercel > Settings > Environment Variables, crie `CRON_SECRET` com uma senha longa e aleatória para proteger a sincronização agendada.

### Fontes
PLs e Requerimentos são lidos do perfil oficial de Elton Carvalho:
`https://camarasaocarlos.sp.gov.br/vereador/?a=legislacao&id=176&p=detalhe`

A Câmara não apresenta atualmente Ofícios como categoria própria na página de publicações do vereador. Por isso, o contador de Ofícios fica editável no Admin até existir uma fonte oficial individualizada. Caso seja identificada uma URL oficial com uma listagem exclusiva, configure `CAMARA_OFICIOS_URL` na Vercel; a sincronização passa a tentar obter automaticamente a quantidade informada nessa página.


## V15 — Instagram integrado às Últimas Atualizações
- Card do Instagram mantido ao lado das Últimas Atualizações no desktop.
- Foto circular de perfil do Elton adicionada ao cabeçalho do card.
- @eltoncarvalho10192 e acesso ao perfil em destaque discreto.
- Layout responsivo: no mobile, Últimas Atualizações aparecem primeiro e Instagram logo abaixo.
- Mantido o carrossel de últimos posts e toda a integração da V14 com a Câmara.
