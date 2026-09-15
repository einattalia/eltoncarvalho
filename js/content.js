(() => {
  async function loadSiteContent() {
    try {
      const response = await fetch('/api/content', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const payload = await response.json();
      const content = payload.content || {};
      document.querySelectorAll('[data-content-key]').forEach((el) => {
        const key = el.dataset.contentKey;
        let item = content[key];
        if(key==='areas.infra.title' && item?.value==='Infraestrutura') item={...item,value:'Segurança Pública'};
        if(key==='areas.infra.text' && /Manutenção urbana|vias, iluminação/i.test(item?.value||'')) item={...item,value:'Investimentos e fiscalização para fortalecer a segurança: câmeras de monitoramento, equipamentos para a Guarda Municipal, apoio à fiscalização e cobrança por reforço do policiamento nos bairros.'};
        if (!item || item.value == null || item.value === '') return;
        const type = el.dataset.contentType || item.type || 'text';
        if (type === 'image' && el.tagName === 'IMG') el.src = item.value;
        else if (type === 'html') el.innerHTML = item.value;
        else el.textContent = item.value;
      });
      if (window.lucide) window.lucide.createIcons();
    } catch (_) {
      // O site continua com o conteúdo estático de fallback quando a API ainda não foi configurada.
    }
  }
  document.addEventListener('DOMContentLoaded', loadSiteContent);
})();
