(() => {
  const mapEl=document.getElementById('googleMap');
  const fallback=document.getElementById('mapFallback');
  const listEl=document.getElementById('mapActionList');
  const titleEl=document.getElementById('mapPanelTitle');
  const textEl=document.getElementById('mapPanelText');
  let map, geocoder, infoWindow, solutions=[], groups=[], markers=[];

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=s=>s?new Date(s).toLocaleDateString('pt-BR'):'Data não informada';

  function groupSolutions(){
    const by=new Map();
    solutions.forEach(s=>{
      const key=s.neighborhood.trim().toLocaleLowerCase('pt-BR');
      if(!by.has(key)) by.set(key,{neighborhood:s.neighborhood,items:[]});
      by.get(key).items.push(s);
    });
    groups=[...by.values()].sort((a,b)=>b.items.length-a.items.length||a.neighborhood.localeCompare(b.neighborhood,'pt-BR'));
  }
  function renderList(active=''){
    const total=solutions.length;
    titleEl.textContent=total?`${total} demanda${total===1?'':'s'} solucionada${total===1?'':'s'}.`:'Resultados do mandato.';
    textEl.textContent=total?`Soluções registradas em ${groups.length} bairro${groups.length===1?'':'s'} de São Carlos. A lista é atualizada automaticamente pelo painel administrativo.`:'Quando uma demanda for marcada como Resolvida no painel, o bairro e a categoria aparecerão aqui automaticamente.';
    if(!groups.length){ listEl.innerHTML='<div class="map-empty">Ainda não há demandas solucionadas publicadas no mapa.</div>'; return; }
    listEl.innerHTML=groups.map((g,i)=>`<button class="map-action-item${active===String(i)?' active':''}" type="button" data-group="${i}"><span class="map-action-dot"></span><span><strong>${esc(g.neighborhood)}</strong><small>${g.items.length} solução${g.items.length===1?'':'ões'} • ${esc([...new Set(g.items.map(x=>x.category))].slice(0,2).join(' · '))}</small></span><i data-lucide="chevron-right"></i></button>`).join('');
    if(window.lucide) lucide.createIcons();
    listEl.querySelectorAll('[data-group]').forEach(b=>b.addEventListener('click',()=>focusGroup(Number(b.dataset.group))));
  }
  function infoHtml(g){
    const latest=g.items.slice(0,4).map(x=>`<li><b>${esc(x.category)}</b><span>Solucionada em ${date(x.resolvedAt)}</span></li>`).join('');
    return `<div class="map-info"><strong>${esc(g.neighborhood)}</strong><span>${g.items.length} demanda${g.items.length===1?'':'s'} solucionada${g.items.length===1?'':'s'}</span><ul>${latest}</ul></div>`;
  }
  function focusGroup(i){
    const g=groups[i]; if(!g)return; renderList(String(i));
    const pair=markers.find(x=>x.index===i);
    if(pair?.marker?.getPosition()){ map.panTo(pair.marker.getPosition()); map.setZoom(Math.max(map.getZoom()||13,14)); infoWindow.setContent(infoHtml(g)); infoWindow.open({map,anchor:pair.marker}); }
  }
  function initFallback(){ if(mapEl)mapEl.style.display='none'; if(fallback)fallback.hidden=false; renderList(); }
  function initGoogleMap(){
    if(!window.google?.maps||!mapEl)return initFallback();
    map=new google.maps.Map(mapEl,{center:{lat:-22.0174,lng:-47.8860},zoom:12,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,gestureHandling:'cooperative',clickableIcons:false});
    geocoder=new google.maps.Geocoder(); infoWindow=new google.maps.InfoWindow();
    if(!groups.length)return;
    const bounds=new google.maps.LatLngBounds(); let done=0;
    groups.forEach((g,index)=>geocoder.geocode({address:`${g.neighborhood}, São Carlos, SP`},(results,status)=>{
      done++;
      if(status==='OK'&&results?.[0]){ const marker=new google.maps.Marker({map,position:results[0].geometry.location,title:`${g.neighborhood} — ${g.items.length} solucionada(s)`}); marker.addListener('click',()=>focusGroup(index)); markers.push({marker,index}); bounds.extend(marker.getPosition()); }
      if(done===groups.length&&markers.length)map.fitBounds(bounds,60);
    }));
  }
  async function loadSolutions(){
    try{ const r=await fetch('/api/resolved-demands',{headers:{Accept:'application/json'},cache:'no-store'}); if(!r.ok)throw new Error(); const d=await r.json(); solutions=Array.isArray(d.solutions)?d.solutions:[]; groupSolutions(); renderList(); }
    catch(_){ solutions=[]; groups=[]; listEl.innerHTML='<div class="map-empty">Não foi possível carregar as soluções agora.</div>'; }
  }
  async function boot(){
    await loadSolutions();
    const key=window.GOOGLE_MAPS_API_KEY;
    if(!key||key==='COLE_SUA_CHAVE_AQUI')return initFallback();
    window.__initEltonMap=initGoogleMap;
    const script=document.createElement('script'); script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__initEltonMap&v=weekly`; script.async=true; script.defer=true; script.onerror=initFallback; document.head.appendChild(script);
  }
  boot();
})();
