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

  const kindInput = document.getElementById('kind');
  const categoryField = document.getElementById('categoryField');
  const categorySelect = document.getElementById('categorySelect');

  function setDemandKind(kind) {
    document.querySelectorAll('[data-kind]').forEach(b => b.classList.toggle('active', b.dataset.kind === kind));
    if (kindInput) kindInput.value = kind;

    const animalComplaint = kind === 'Denúncia';
    if (categoryField) categoryField.hidden = animalComplaint;
    if (categorySelect) {
      categorySelect.required = !animalComplaint;
      categorySelect.value = '';
    }
  }

  document.querySelectorAll('[data-kind]').forEach(btn => btn.addEventListener('click', () => setDemandKind(btn.dataset.kind)));
  setDemandKind(kindInput?.value || 'Denúncia');

  const form = document.getElementById('protocolForm');
  const feedback = document.getElementById('feedback');
  const submit = document.getElementById('submitDemand');

  function setFeedback(message, mode = '') {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `feedback ${mode}`.trim();
  }

  async function getPublicConfig() {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Configuração do servidor indisponível.');
    return res.json();
  }

  async function uploadAttachment(config, file, requestId, index) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeName = `${String(index + 1).padStart(2, '0')}-${crypto.randomUUID()}.${ext}`;
    const path = `${requestId}/${safeName}`;
    const endpoint = `${config.supabaseUrl}/storage/v1/object/${config.demandBucket}/${path}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: config.supabasePublishableKey,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false'
      },
      body: file
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Falha ao enviar o anexo ${file.name}. ${detail}`.trim());
    }
    return { path, name: file.name, type: file.type, size: file.size };
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const files = data.getAll('files').filter(f => f && f.name);

    if (files.length > 5) return setFeedback('Envie no máximo 5 arquivos por protocolo.', 'error');
    const oversized = files.find(file => file.size > 10 * 1024 * 1024);
    if (oversized) return setFeedback(`O arquivo ${oversized.name} ultrapassa o limite de 10 MB.`, 'error');

    submit.disabled = true;
    setFeedback('Registrando sua demanda…');

    try {
      const requestId = crypto.randomUUID();
      const config = await getPublicConfig();
      const attachments = [];
      for (let i = 0; i < files.length; i += 1) {
        setFeedback(`Enviando anexo ${i + 1} de ${files.length}…`);
        attachments.push(await uploadAttachment(config, files[i], requestId, i));
      }

      setFeedback('Salvando protocolo e notificando o gabinete…');
      const response = await fetch('/api/demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          kind: data.get('kind'),
          name: String(data.get('name') || '').trim(),
          phone: String(data.get('phone') || '').trim(),
          category: String(data.get('kind') === 'Denúncia' ? 'Causa Animal' : (data.get('category') || '')).trim(),
          neighborhood: String(data.get('neighborhood') || '').trim(),
          address: String(data.get('address') || '').trim(),
          ouvidoria_protocol: String(data.get('ouvidoria_protocol') || '').trim(),
          message: String(data.get('message') || '').trim(),
          attachments,
          consent: data.get('consent') === 'on'
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível registrar a demanda.');

      setFeedback(`Demanda registrada com sucesso. Seu protocolo é ${result.protocol}.`, 'success');
      form.reset();
      setDemandKind('Denúncia');

      if (result.whatsappConfigured === false) {
        console.warn('WhatsApp Cloud API não configurada no servidor. A demanda foi salva, mas não houve notificação automática no WhatsApp.');
      }
    } catch (error) {
      setFeedback(error.message || 'Ocorreu um erro ao registrar sua demanda.', 'error');
    } finally {
      submit.disabled = false;
    }
  });
});

// v14 — contadores legislativos sincronizados com a Câmara Municipal
(() => {
  function formatPt(value){ return Number(value || 0).toLocaleString('pt-BR'); }
  function animateCounter(el, target){
    if(!el) return;
    target = Math.max(0, Number(target || 0));
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){ el.textContent=formatPt(target); return; }
    const start=performance.now(), duration=1100;
    function frame(now){
      const p=Math.min(1,(now-start)/duration), eased=1-Math.pow(1-p,3);
      el.textContent=formatPt(Math.round(target*eased));
      if(p<1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  async function loadLegislativeStats(){
    try{
      const r=await fetch('/api/legislative',{headers:{Accept:'application/json'}});
      if(!r.ok) throw new Error('indisponível');
      const data=await r.json(), stats=data.stats||{};
      animateCounter(document.getElementById('counterProjects'),stats.projects);
      animateCounter(document.getElementById('counterRequirements'),stats.requirements);
      animateCounter(document.getElementById('counterOffices'),stats.offices);
      animateCounter(document.getElementById('heroLegislativeTotal'),stats.total);
      const updated=document.getElementById('legislativeUpdated');
      if(updated && data.lastSynced){ updated.textContent=`Última atualização: ${new Date(data.lastSynced).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}.`; }
      const officeNote=document.getElementById('officesCounterNote');
      if(officeNote && !data.officesAutomatic) officeNote.textContent='Valor acompanhado pelo gabinete até existir uma listagem oficial própria de ofícios no portal da Câmara.';
    }catch(_){
      const updated=document.getElementById('legislativeUpdated');
      if(updated) updated.textContent='Sincronização temporariamente indisponível.';
    }
  }
  document.addEventListener('DOMContentLoaded',loadLegislativeStats);
})();
