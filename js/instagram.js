(() => {
  const track = document.getElementById('instagramTrack');
  if (!track) return;

  const feed = document.getElementById('instagramFeed');
  const viewport = feed.querySelector('.instagram-viewport');
  const prev = feed.querySelector('.instagram-prev');
  const next = feed.querySelector('.instagram-next');
  const dots = document.getElementById('instagramDots');
  const status = document.getElementById('instagramStatus');
  let items = [];
  let index = 0;
  let timer = null;
  let startX = 0;
  let lastX = 0;

  const escapeHtml = (value='') => String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const shortCaption = (caption='') => {
    const clean = String(caption || '').replace(/\s+/g,' ').trim();
    return clean || 'Confira esta atualização do mandato no Instagram.';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(timestamp)); }
    catch { return ''; }
  };

  const cardHtml = (post) => {
    const image = post.thumbnail_url || post.media_url || '';
    const type = String(post.media_type || '').toUpperCase();
    const icon = type === 'VIDEO' ? 'play' : type === 'CAROUSEL_ALBUM' ? 'images' : 'instagram';
    const label = type === 'VIDEO' ? 'Reel/Vídeo' : type === 'CAROUSEL_ALBUM' ? 'Carrossel' : 'Post';
    const caption = shortCaption(post.caption);
    const title = caption.length > 72 ? caption.slice(0,69) + '…' : caption;
    return `<a class="instagram-post" href="${escapeHtml(post.permalink || 'https://instagram.com/eltoncarvalho10192')}" target="_blank" rel="noopener" aria-label="Abrir post no Instagram">
      <div class="instagram-media">
        ${image ? `<img src="${escapeHtml(image)}" alt="Publicação do Instagram de Elton Carvalho" loading="lazy" referrerpolicy="no-referrer">` : `<div class="instagram-placeholder"><i data-lucide="instagram"></i></div>`}
        <span class="instagram-media-badge"><i data-lucide="${icon}"></i>${label}</span>
      </div>
      <div class="instagram-post-copy">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(caption)}</p>
        <span class="instagram-post-meta">${escapeHtml(formatDate(post.timestamp))}</span>
      </div>
    </a>`;
  };

  const perView = () => window.innerWidth <= 680 ? 1 : window.innerWidth <= 1000 ? 2 : 3;
  const maxIndex = () => Math.max(0, items.length - perView());

  function renderDots(){
    const count = maxIndex() + 1;
    dots.innerHTML = Array.from({length: count},(_,i)=>`<button class="instagram-dot${i===index?' active':''}" type="button" tabindex="-1" data-ig-dot="${i}"></button>`).join('');
    dots.querySelectorAll('[data-ig-dot]').forEach(btn => btn.addEventListener('click',()=>go(Number(btn.dataset.igDot), true)));
  }

  function go(nextIndex, manual=false){
    if (!items.length) return;
    const max = maxIndex();
    index = Math.max(0, Math.min(nextIndex, max));
    const first = track.querySelector('.instagram-post');
    const gap = 14;
    const width = first ? first.getBoundingClientRect().width : viewport.clientWidth;
    track.style.transform = `translateX(-${index * (width + gap)}px)`;
    prev.disabled = index === 0;
    next.disabled = index === max;
    renderDots();
    if (manual) restart();
  }

  function advance(){
    const max = maxIndex();
    go(index >= max ? 0 : index + 1);
  }

  function restart(){
    clearInterval(timer);
    if (items.length > perView()) timer = setInterval(advance, 3000);
  }

  prev.addEventListener('click',()=>go(index-1,true));
  next.addEventListener('click',()=>go(index+1,true));
  feed.addEventListener('mouseenter',()=>clearInterval(timer));
  feed.addEventListener('mouseleave',restart);
  feed.addEventListener('focusin',()=>clearInterval(timer));
  feed.addEventListener('focusout',restart);
  viewport.addEventListener('touchstart',e=>{startX=lastX=e.touches[0].clientX;clearInterval(timer)},{passive:true});
  viewport.addEventListener('touchmove',e=>{lastX=e.touches[0].clientX},{passive:true});
  viewport.addEventListener('touchend',()=>{const dx=lastX-startX;if(Math.abs(dx)>45) go(index+(dx<0?1:-1),true);else restart()},{passive:true});
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{index=Math.min(index,maxIndex());go(index);restart()},120)});

  async function load(){
    status.textContent = 'Carregando as últimas publicações…';
    try{
      const response = await fetch('/api/instagram', {headers:{Accept:'application/json'}});
      const data = await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error || 'Instagram indisponível');
      items = Array.isArray(data.data) ? data.data.filter(p=>p && p.permalink) : [];
      if(!items.length) throw new Error('Nenhuma publicação encontrada');
      track.innerHTML = items.map(cardHtml).join('');
      index=0;
      status.textContent='';
      if(window.lucide) window.lucide.createIcons();
      requestAnimationFrame(()=>{go(0);restart()});
    }catch(error){
      items=[];
      status.textContent='Acompanhe as atualizações diretamente no Instagram.';
      prev.style.display='none'; next.style.display='none'; dots.innerHTML='';
    }
  }
  load();
})();
