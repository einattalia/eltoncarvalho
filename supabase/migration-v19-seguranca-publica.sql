-- V19: atualiza o conteúdo editável do antigo card Infraestrutura
update public.site_content set value='Segurança Pública', updated_at=now() where content_key='areas.infra.title';
update public.site_content set value='Investimentos e fiscalização para fortalecer a segurança: câmeras de monitoramento, equipamentos para a Guarda Municipal, apoio à fiscalização e cobrança por reforço do policiamento nos bairros.', updated_at=now() where content_key='areas.infra.text';
