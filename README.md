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
