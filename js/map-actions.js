(() => {
  const mapEl = document.getElementById('googleMap');
  const fallback = document.getElementById('mapFallback');
  const listEl = document.getElementById('mapActionList');
  const titleEl = document.getElementById('mapPanelTitle');
  const textEl = document.getElementById('mapPanelText');
  const filterButtons = [...document.querySelectorAll('[data-map-filter]')];

  const actions = [
    { id:'santa-felicia', title:'UPA Santa Felícia', region:'Norte', category:'Saúde', query:'UPA Santa Felícia, São Carlos, SP', note:'Demandas e fiscalização de melhorias no atendimento e estrutura.' },
    { id:'jockey', title:'USF Jockey Clube', region:'Norte', category:'Saúde', query:'USF Jockey Clube, São Carlos, SP', note:'Acompanhamento de melhorias e reinauguração da unidade.' },
    { id:'sao-jose', title:'UBS São José', region:'Centro', category:'Saúde', query:'UBS São José, São Carlos, SP', note:'Acompanhamento e reinauguração da unidade de saúde.' },
    { id:'guanabara', title:'USF Guanabara', region:'Sul', category:'Saúde', query:'USF Guanabara, São Carlos, SP', note:'Acompanhamento de melhorias e reinauguração da unidade.' },
    { id:'cidade-aracy', title:'Cidade Aracy', region:'Sul', category:'Cidade', query:'Cidade Aracy, São Carlos, SP', note:'Demandas de infraestrutura e serviços públicos nos bairros.' },
    { id:'sao-carlos-viii', title:'São Carlos VIII', region:'Norte', category:'Cidade', query:'São Carlos VIII, São Carlos, SP', note:'Atuação em demandas urbanas e serviços públicos.' },
    { id:'redencao', title:'Redenção', region:'Oeste', category:'Cidade', query:'Redenção, São Carlos, SP', note:'Encaminhamento de solicitações de moradores e infraestrutura.' },
    { id:'vila-sao-jose', title:'Vila São José', region:'Centro', category:'Cidade', query:'Vila São José, São Carlos, SP', note:'Presença do mandato e acompanhamento de demandas locais.' },
    { id:'agua-vermelha', title:'Água Vermelha', region:'Norte', category:'Cidade', query:'Água Vermelha, São Carlos, SP', note:'Acompanhamento de demandas do distrito e região.' }
  ];

  let map;
  let geocoder;
  let markers = [];
  let selectedRegion = 'Todos';
  let infoWindow;

  const mapsUrl = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

  function visibleActions(){
    return selectedRegion === 'Todos' ? actions : actions.filter(a => a.region === selectedRegion);
  }

  function renderList(activeId=''){
    const items = visibleActions();
    titleEl.textContent = selectedRegion === 'Todos' ? 'São Carlos inteira.' : `Região ${selectedRegion}`;
    textEl.textContent = selectedRegion === 'Todos'
      ? 'Selecione uma região ou clique em um marcador para conhecer algumas ações realizadas pelo mandato.'
      : `${items.length} ponto${items.length === 1 ? '' : 's'} de atuação em destaque nesta região.`;
    listEl.innerHTML = items.map(a => `
      <button class="map-action-item${a.id===activeId?' active':''}" type="button" data-action-id="${a.id}">
        <span class="map-action-dot"></span>
        <span><strong>${a.title}</strong><small>${a.category} • ${a.region}</small></span>
        <i data-lucide="chevron-right"></i>
      </button>`).join('');
    if (window.lucide) lucide.createIcons();
    listEl.querySelectorAll('[data-action-id]').forEach(btn => btn.addEventListener('click', () => focusAction(btn.dataset.actionId)));
  }

  function setFilter(region){
    selectedRegion = region;
    filterButtons.forEach(b => b.classList.toggle('active', b.dataset.mapFilter === region));
    renderList();
    if (!map) return;
    const bounds = new google.maps.LatLngBounds();
    let count = 0;
    markers.forEach(({marker, action}) => {
      const show = region === 'Todos' || action.region === region;
      marker.setVisible(show);
      if (show && marker.getPosition()) { bounds.extend(marker.getPosition()); count++; }
    });
    if (count) map.fitBounds(bounds, 70);
  }

  function focusAction(id){
    const pair = markers.find(m => m.action.id === id);
    const action = actions.find(a => a.id === id);
    if (!action) return;
    renderList(id);
    if (pair?.marker?.getPosition()) {
      map.panTo(pair.marker.getPosition());
      map.setZoom(Math.max(map.getZoom() || 14, 15));
      infoWindow.setContent(`<div class="map-info"><strong>${action.title}</strong><span>${action.category} • ${action.region}</span><p>${action.note}</p><a href="${mapsUrl(action.query)}" target="_blank" rel="noopener">Abrir no Google Maps</a></div>`);
      infoWindow.open({map, anchor:pair.marker});
    } else {
      window.open(mapsUrl(action.query), '_blank', 'noopener');
    }
  }

  function initFallback(){
    if (mapEl) mapEl.style.display = 'none';
    if (fallback) fallback.hidden = false;
    renderList();
    listEl.querySelectorAll('[data-action-id]').forEach(btn => btn.addEventListener('click', () => {
      const action = actions.find(a => a.id === btn.dataset.actionId);
      if (action) window.open(mapsUrl(action.query), '_blank', 'noopener');
    }));
  }

  function initGoogleMap(){
    if (!window.google?.maps || !mapEl) return initFallback();
    map = new google.maps.Map(mapEl, {
      center:{lat:-22.0174,lng:-47.8860}, zoom:12,
      mapTypeControl:false, streetViewControl:false, fullscreenControl:true,
      gestureHandling:'cooperative', clickableIcons:true
    });
    geocoder = new google.maps.Geocoder();
    infoWindow = new google.maps.InfoWindow();

    let completed = 0;
    actions.forEach(action => {
      geocoder.geocode({address:action.query}, (results, status) => {
        completed++;
        if (status === 'OK' && results?.[0]) {
          const marker = new google.maps.Marker({
            map,
            position:results[0].geometry.location,
            title:action.title,
            animation:google.maps.Animation.DROP
          });
          marker.addListener('click', () => focusAction(action.id));
          markers.push({marker, action});
        }
        if (completed === actions.length) setFilter(selectedRegion);
      });
    });
    renderList();
  }

  filterButtons.forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.mapFilter)));

  const key = window.GOOGLE_MAPS_API_KEY;
  if (!key || key === 'COLE_SUA_CHAVE_AQUI') return initFallback();
  window.__initEltonMap = initGoogleMap;
  const script=document.createElement('script');
  script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__initEltonMap&v=weekly`;
  script.async=true; script.defer=true; script.onerror=initFallback;
  document.head.appendChild(script);
})();
