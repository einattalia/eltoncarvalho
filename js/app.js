document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  const nav = document.getElementById('mainNav');
  const menuBtn = document.getElementById('menuBtn');
  menuBtn?.addEventListener('click', () => {
    nav.classList.toggle('open');
    const open = nav.classList.contains('open');
    menuBtn.innerHTML = `<i data-lucide="${open ? 'x' : 'menu'}"></i>`;
    if (window.lucide) lucide.createIcons();
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

  const regions = {
    'Norte':'Vila Nery, Tijuco Preto, Santa Maria, Jacobucci, Vila São José e Portal do Sol',
    'Sul':'Vila Prado, Cruzeiro do Sul, Gonzaga, Beatriz, Boa Vista e Pacaembu',
    'Leste':'São Carlos VIII, Tangará, Douradinho, Santa Maria II, Astolpho e Coqueiros',
    'Oeste':'Santa Felícia, Parque Faber, Cidade Jardim, Parque Iguatemi e Romeu Tortorelli',
    'Centro':'Centro, Mercado, Estação, Vila Pureza, Lagoa Serena e entorno central',
    'Sul / Sudoeste':'Cidade Aracy, Antenor Garcia, Presidente Collor, Zavaglia e Abdelnur'
  };
  document.querySelectorAll('[data-region]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-region]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const region = btn.dataset.region;
    document.getElementById('regionTitle').textContent = region;
    document.getElementById('regionText').textContent = regions[region];
  }));

  document.querySelectorAll('[data-kind]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-kind]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('kind').value = btn.dataset.kind;
  }));

  const form = document.getElementById('protocolForm');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);
    const protocol = `EC-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const files = data.getAll('files').filter(f => f && f.name);
    const text = [
      `Olá, gabinete do vereador Elton Carvalho.`,
      ``,
      `*Protocolo:* ${protocol}`,
      `*Tipo:* ${data.get('kind')}`,
      `*Nome:* ${data.get('name')}`,
      `*WhatsApp:* ${data.get('phone')}`,
      `*Assunto:* ${data.get('message')}`,
      files.length ? `*Anexos:* ${files.length} arquivo(s) selecionado(s). Vou enviá-los nesta conversa.` : ''
    ].filter(Boolean).join('\n');
    document.getElementById('feedback').textContent = `Protocolo ${protocol} criado. Abrindo o WhatsApp…`;
    window.open(`https://wa.me/5516992934352?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
});
