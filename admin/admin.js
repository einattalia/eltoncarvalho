const state = { config: null, token: localStorage.getItem('ec_admin_token') || '', user: null, demands: [], content: [], legislative: null };
const $ = (s) => document.querySelector(s);
const loginView = $('#loginView'), appView = $('#appView'), panel = $('#panel'), pageTitle = $('#pageTitle');

async function config(){ if(state.config) return state.config; const r=await fetch('/api/config'); if(!r.ok) throw new Error('Servidor não configurado.'); return state.config=await r.json(); }
async function api(action, options={}, params={}){ const qs=new URLSearchParams({action,...params}); const url=`/api/admin?${qs.toString()}`; const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${state.token}`,...(options.headers||{})}}); const d=await r.json().catch(()=>({})); if(r.status===401){logout(); throw new Error('Sessão expirada.');} if(!r.ok) throw new Error(d.error||'Erro no painel.'); return d; }
async function login(email,password){ const c=await config(); const r=await fetch(`${c.supabaseUrl}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:c.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})}); const d=await r.json(); if(!r.ok) throw new Error(d.error_description||d.msg||'Login inválido.'); state.token=d.access_token; localStorage.setItem('ec_admin_token',state.token); await boot(); }
function logout(){localStorage.removeItem('ec_admin_token');state.token='';appView.hidden=true;loginView.hidden=false;}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();$('#loginFeedback').textContent='Entrando…';try{await login($('#email').value,$('#password').value);$('#loginFeedback').textContent='';}catch(err){$('#loginFeedback').textContent=err.message;}});
$('#logoutBtn').addEventListener('click',logout);
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));

async function boot(){ try{ await Promise.all([loadDemands(),loadContent(),loadLegislative()]); loginView.hidden=true;appView.hidden=false;showPage('dashboard'); }catch(err){ if(state.token) $('#loginFeedback').textContent=err.message; else logout(); } }
async function loadDemands(){state.demands=(await api('demands')).demands||[];}
async function loadContent(){state.content=(await api('content')).content||[];}
async function loadLegislative(){try{const r=await fetch('/api/legislative',{headers:{Accept:'application/json'}});state.legislative=r.ok?await r.json():null;}catch(_){state.legislative=null;}}
function activate(page){document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function isAnimal(d){return d.kind==='Denúncia'&&d.category==='Causa Animal';}
function kindLabel(d){return isAnimal(d)?'Denúncia Causa Animal':d.kind;}
function showPage(page){activate(page);if(page==='dashboard')renderDashboard();if(page==='demands')renderDemands();if(page==='reports')renderReports();if(page==='content')renderContent();if(page==='legislative')renderLegislative();}

function renderDashboard(){
  pageTitle.textContent='Visão geral';
  const total=state.demands.length;
  const open=state.demands.filter(d=>!['Resolvida','Arquivada'].includes(d.status)).length;
  const resolved=state.demands.filter(d=>d.status==='Resolvida').length;
  const today=new Date().toISOString().slice(0,10);
  const todayCount=state.demands.filter(d=>String(d.created_at).slice(0,10)===today).length;
  panel.innerHTML=`<div class="cards"><div class="metric"><strong>${total}</strong><span>Total de demandas</span></div><div class="metric"><strong>${todayCount}</strong><span>Recebidas hoje</span></div><div class="metric"><strong>${open}</strong><span>Em aberto</span></div><div class="metric"><strong>${resolved}</strong><span>Resolvidas</span></div></div><div class="dashboard-actions"><button class="primary" id="quickReport">Gerar relatório</button></div><div class="section-label">Últimas demandas</div>${demandTable(state.demands.slice(0,8))}`;
  $('#quickReport')?.addEventListener('click',()=>showPage('reports'));
  bindDemandButtons();
}

function demandTable(rows){
  return `<div class="table-wrap"><table><thead><tr><th>Protocolo</th><th>Ouvidoria</th><th>Data</th><th>Nome</th><th>Telefone</th><th>Categoria</th><th>Bairro</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(d=>`<tr class="${isAnimal(d)?'animal-demand':''}"><td><b>${esc(d.protocol)}</b></td><td>${esc(d.ouvidoria_protocol||'—')}</td><td>${new Date(d.created_at).toLocaleString('pt-BR')}</td><td>${esc(d.name)}</td><td>${esc(d.phone)}</td><td>${isAnimal(d)?'Denúncia Causa Animal':esc(d.category)}</td><td>${esc(d.neighborhood)}</td><td><span class="pill">${esc(d.status)}</span></td><td><button class="open-btn" data-demand-id="${d.id}">Abrir</button></td></tr>`).join('')||'<tr><td colspan="9">Nenhuma demanda registrada.</td></tr>'}</tbody></table></div>`;
}

function renderDemands(){
  pageTitle.textContent='Denúncias e demandas';
  panel.innerHTML=`<div class="toolbar"><div><strong>Atendimentos registrados</strong><span>Consulte, acompanhe e vincule protocolos da Ouvidoria.</span></div><button class="primary" id="reportBtn">Gerar relatório</button></div>${demandTable(state.demands)}`;
  $('#reportBtn')?.addEventListener('click',()=>showPage('reports'));
  bindDemandButtons();
}
function bindDemandButtons(){document.querySelectorAll('[data-demand-id]').forEach(b=>b.onclick=()=>openDemand(b.dataset.demandId));}

function openDemand(id){
  const d=state.demands.find(x=>x.id===id); if(!d)return;
  const modal=document.createElement('div'); modal.className='modal';
  modal.innerHTML=`<div class="modal-card ${isAnimal(d)?'animal-demand-modal':''}"><div class="modal-top"><div><small>${esc(d.protocol)}</small><h2>${esc(kindLabel(d))}${isAnimal(d)?'':` — ${esc(d.category)}`}</h2></div><button data-close>×</button></div><div class="details"><div><b>Nome</b><span>${esc(d.name)}</span></div><div><b>Telefone</b><span>${esc(d.phone)}</span></div><div><b>Bairro</b><span>${esc(d.neighborhood)}</span></div><div><b>Local</b><span>${esc(d.address||'-')}</span></div><div><b>Protocolo do site</b><span>${esc(d.protocol)}</span></div><div><b>Protocolo Ouvidoria</b><span>${esc(d.ouvidoria_protocol||'Não informado')}</span></div></div><p>${esc(d.message)}</p><div class="attachments">${(d.attachments||[]).map((a,i)=>`<button class="open-btn attachment-btn" data-path="${esc(a.path)}">📎 ${esc(a.name||('Anexo '+(i+1)))}</button>`).join('')||'<span>Sem anexos</span>'}</div><div class="demand-editor"><div class="row"><label>Status<select id="mStatus">${['Nova','Em análise','Encaminhada','Aguardando órgão','Resolvida','Arquivada'].map(x=>`<option ${d.status===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Prioridade<select id="mPriority">${['Baixa','Média','Alta','Urgente'].map(x=>`<option ${d.priority===x?'selected':''}>${x}</option>`).join('')}</select></label></div><label>Protocolo Ouvidoria <span class="field-help">opcional</span><input id="mOuvidoria" maxlength="120" value="${esc(d.ouvidoria_protocol||'')}" placeholder="Vincule o protocolo da Ouvidoria/Canil"></label><label>Observações internas<textarea id="mNotes" rows="5">${esc(d.internal_notes||'')}</textarea></label><button class="primary" id="saveDemand">Salvar alterações</button></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close]').onclick=()=>modal.remove();
  modal.onclick=e=>{if(e.target===modal)modal.remove()};
  modal.querySelectorAll('.attachment-btn').forEach(btn=>btn.onclick=async()=>{try{const result=await api('attachment',{}, {path:btn.dataset.path});window.open(result.url,'_blank','noopener');}catch(err){alert(err.message);}});
  modal.querySelector('#saveDemand').onclick=async()=>{const btn=modal.querySelector('#saveDemand');btn.disabled=true;btn.textContent='Salvando…';try{await api('demand',{method:'PUT',body:JSON.stringify({id:d.id,status:modal.querySelector('#mStatus').value,priority:modal.querySelector('#mPriority').value,ouvidoria_protocol:modal.querySelector('#mOuvidoria').value,internal_notes:modal.querySelector('#mNotes').value})});await loadDemands();modal.remove();renderDemands();}catch(err){alert(err.message);}finally{btn.disabled=false;btn.textContent='Salvar alterações';}};
}

function countBy(rows,keyFn){const out={};rows.forEach(r=>{const k=keyFn(r)||'Não informado';out[k]=(out[k]||0)+1;});return Object.entries(out).sort((a,b)=>b[1]-a[1]);}
function chartBlock(title,items,total){const max=Math.max(1,...items.map(x=>x[1]));return `<div class="report-card"><h3>${esc(title)}</h3><div class="bar-list">${items.slice(0,10).map(([label,value])=>`<div class="bar-row"><div class="bar-label"><span>${esc(label)}</span><b>${value}</b></div><div class="bar-track"><i style="width:${Math.max(4,Math.round(value/max*100))}%"></i></div><small>${total?Math.round(value/total*100):0}% do período</small></div>`).join('')||'<p class="empty-report">Sem dados no período.</p>'}</div></div>`;}
function reportFilters(rows){
  const start=$('#reportStart')?.value||''; const end=$('#reportEnd')?.value||''; const type=$('#reportType')?.value||''; const status=$('#reportStatus')?.value||'';
  return rows.filter(d=>{const day=String(d.created_at).slice(0,10);if(start&&day<start)return false;if(end&&day>end)return false;if(type==='animal'&&!isAnimal(d))return false;if(type==='request'&&d.kind!=='Solicitação')return false;if(status&&d.status!==status)return false;return true;});
}
function renderReports(){
  pageTitle.textContent='Relatório de demandas';
  panel.innerHTML=`<div class="report-filters"><label>De<input type="date" id="reportStart"></label><label>Até<input type="date" id="reportEnd"></label><label>Tipo<select id="reportType"><option value="">Todos</option><option value="animal">Denúncia Causa Animal</option><option value="request">Solicitação</option></select></label><label>Status<select id="reportStatus"><option value="">Todos</option>${['Nova','Em análise','Encaminhada','Aguardando órgão','Resolvida','Arquivada'].map(x=>`<option>${x}</option>`).join('')}</select></label><button class="primary" id="applyReport">Atualizar dashboard</button></div><div id="reportDashboard"></div>`;
  $('#applyReport').onclick=()=>renderReportDashboard(reportFilters(state.demands));
  renderReportDashboard(state.demands);
}
function averageResolutionDays(rows){
  const resolved=rows.filter(d=>d.status==='Resolvida'&&(d.resolved_at||d.updated_at));
  if(!resolved.length)return null;
  const values=resolved.map(d=>Math.max(0,(new Date(d.resolved_at||d.updated_at)-new Date(d.created_at))/86400000)).filter(Number.isFinite);
  if(!values.length)return null;
  return values.reduce((a,b)=>a+b,0)/values.length;
}
function formatDays(value){
  if(value==null)return '—';
  if(value<1)return `${Math.max(1,Math.round(value*24))} h`;
  return `${value.toFixed(value<10?1:0).replace('.',',')} dias`;
}
function monthlySeries(rows){
  const map={};
  rows.forEach(d=>{const dt=new Date(d.created_at);if(Number.isNaN(dt.getTime()))return;const key=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;map[key]=(map[key]||0)+1;});
  const keys=Object.keys(map).sort();
  return keys.slice(-12).map(k=>{const [y,m]=k.split('-').map(Number);return [new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.',''),map[k]];});
}
function monthlyChart(items){
  const max=Math.max(1,...items.map(x=>x[1]));
  return `<div class="report-card report-card-wide"><div class="report-card-title"><div><span>Evolução</span><h3>Demandas por mês</h3></div><small>Últimos ${items.length||0} meses com registros</small></div><div class="month-chart">${items.map(([label,value])=>`<div class="month-col"><b>${value}</b><div class="month-track"><i style="height:${Math.max(8,Math.round(value/max*100))}%"></i></div><span>${esc(label)}</span></div>`).join('')||'<p class="empty-report">Sem dados no período.</p>'}</div></div>`;
}
function animalFlow(rows){
  const animalRows=rows.filter(isAnimal);
  const received=animalRows.length;
  const forwarded=animalRows.filter(d=>['Encaminhada','Aguardando órgão','Resolvida','Arquivada'].includes(d.status)).length;
  const resolved=animalRows.filter(d=>d.status==='Resolvida').length;
  const pct=(v)=>received?Math.round(v/received*100):0;
  return `<div class="report-card animal-flow-card"><div class="report-card-title"><div><span>Causa Animal</span><h3>Recebidas × encaminhadas × resolvidas</h3></div><small>Acompanhamento do fluxo</small></div><div class="flow-steps"><div class="flow-step received"><strong>${received}</strong><span>Recebidas</span><small>100%</small></div><i></i><div class="flow-step forwarded"><strong>${forwarded}</strong><span>Encaminhadas</span><small>${pct(forwarded)}%</small></div><i></i><div class="flow-step resolved"><strong>${resolved}</strong><span>Resolvidas</span><small>${pct(resolved)}%</small></div></div></div>`;
}
function renderReportDashboard(rows){
  const target=$('#reportDashboard'); if(!target)return;
  const total=rows.length, animal=rows.filter(isAnimal).length, requests=rows.filter(d=>d.kind==='Solicitação').length, linked=rows.filter(d=>String(d.ouvidoria_protocol||'').trim()).length, resolved=rows.filter(d=>d.status==='Resolvida').length;
  const avgDays=averageResolutionDays(rows), resolutionRate=total?Math.round(resolved/total*100):0;
  const byStatus=countBy(rows,d=>d.status); const byNeighborhood=countBy(rows,d=>d.neighborhood); const byCategory=countBy(rows,d=>isAnimal(d)?'Denúncia Causa Animal':d.category);
  const months=monthlySeries(rows);
  target.innerHTML=`<div class="report-head"><div><span>Dashboard consolidado</span><h2>Relatório de demandas</h2><p>${total} registro(s) no período selecionado.</p></div><div class="report-actions"><button class="open-btn" id="csvReport">Exportar CSV</button><button class="primary" id="printReport">Imprimir / PDF</button></div></div>
  <div class="cards report-metrics advanced-metrics"><div class="metric"><strong>${total}</strong><span>Total</span></div><div class="metric animal-metric"><strong>${animal}</strong><span>Denúncias Causa Animal</span></div><div class="metric"><strong>${requests}</strong><span>Solicitações</span></div><div class="metric"><strong>${linked}</strong><span>Com protocolo Ouvidoria</span></div><div class="metric"><strong>${resolved}</strong><span>Resolvidas</span></div><div class="metric"><strong>${resolutionRate}%</strong><span>Taxa de resolução</span></div><div class="metric time-metric"><strong>${formatDays(avgDays)}</strong><span>Tempo médio até resolução</span></div></div>
  <div class="advanced-grid">${monthlyChart(months)}${animalFlow(rows)}</div>
  <div class="report-grid">${chartBlock('Por status',byStatus,total)}${chartBlock('Por categoria',byCategory,total)}${chartBlock('Por bairro',byNeighborhood,total)}</div><div class="section-label">Demandas do relatório</div>${demandTable(rows)}`;
  $('#printReport')?.addEventListener('click',()=>window.print());
  $('#csvReport')?.addEventListener('click',()=>downloadReportCSV(rows));
  bindDemandButtons();
}
function downloadReportCSV(rows){
  const headers=['Protocolo Site','Protocolo Ouvidoria','Data','Tipo','Categoria','Nome','Telefone','Bairro','Endereço','Status','Prioridade'];
  const cells=rows.map(d=>[d.protocol,d.ouvidoria_protocol||'',new Date(d.created_at).toLocaleString('pt-BR'),kindLabel(d),d.category,d.name,d.phone,d.neighborhood,d.address||'',d.status,d.priority]);
  const csv=[headers,...cells].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`relatorio-demandas-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
}

function renderContent(){pageTitle.textContent='Conteúdo do site';const groups={};state.content.forEach(i=>(groups[i.section||'Geral']??=[]).push(i));panel.innerHTML=Object.entries(groups).map(([section,items])=>`<div class="section-label">${esc(section)}</div><div class="editor-list">${items.map(i=>`<div class="editor" data-content-id="${i.id}"><div class="editor-head"><strong>${esc(i.label||i.content_key)}</strong><span>${esc(i.content_key)} • ${esc(i.content_type)}</span></div>${i.content_type==='text'||i.content_type==='html'?`<textarea>${esc(i.value||'')}</textarea>`:`<input value="${esc(i.value||'')}">`}${i.content_type==='image'?'<input type="file" class="image-upload" accept="image/jpeg,image/png,image/webp" style="margin-top:8px">':''}<div class="editor-actions"><button class="primary save-content">Salvar</button></div></div>`).join('')}</div>`).join('');document.querySelectorAll('.save-content').forEach(btn=>btn.onclick=()=>saveContent(btn.closest('.editor')));document.querySelectorAll('.image-upload').forEach(input=>input.onchange=()=>uploadSiteImage(input));}
async function saveContent(box){const id=box.dataset.contentId,value=(box.querySelector('textarea')||box.querySelector('input:not([type=file])')).value;const btn=box.querySelector('.save-content');btn.disabled=true;btn.textContent='Salvando…';try{await api('content',{method:'PUT',body:JSON.stringify({id,value})});await loadContent();btn.textContent='Salvo ✓';setTimeout(()=>btn.textContent='Salvar',1000);}catch(err){alert(err.message);btn.textContent='Salvar';}finally{btn.disabled=false;}}
function loadImageForOptimization(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Não foi possível processar esta imagem. Tente JPG, PNG ou WebP.'))};img.src=url;});}
async function optimizeSiteImage(file){if(!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error('Formato não suportado. Use JPG, PNG ou WebP.');const img=await loadImageForOptimization(file);const srcW=img.naturalWidth||img.width,srcH=img.naturalHeight||img.height,targetBytes=750*1024;let maxSide=Math.min(1800,Math.max(srcW,srcH)),quality=.82,blob=null;for(let pass=0;pass<10;pass++){const scale=Math.min(1,maxSide/Math.max(srcW,srcH)),width=Math.max(1,Math.round(srcW*scale)),height=Math.max(1,Math.round(srcH*scale)),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);blob=await new Promise(r=>canvas.toBlob(r,'image/webp',quality));if(blob&&blob.size<=targetBytes)break;if(quality>.58)quality-=.07;else{maxSide=Math.max(900,Math.round(maxSide*.84));quality=.74;}}if(!blob)throw new Error('Não foi possível otimizar a imagem.');if(blob.size>950*1024)throw new Error('A foto ainda ficou muito grande após a otimização. Tente outra imagem ou faça uma captura de tela dela antes de enviar.');return new File([blob],(file.name.replace(/\.[^.]+$/,'')||'imagem')+'.webp',{type:'image/webp'});}
async function uploadSiteImage(input){const original=input.files?.[0];if(!original)return;const box=input.closest('.editor'),textInput=box.querySelector('input:not([type=file])'),btn=box.querySelector('.save-content');try{if(btn){btn.disabled=true;btn.textContent='Otimizando imagem…';}const file=await optimizeSiteImage(original);if(btn)btn.textContent=`Enviando ${(file.size/1024).toFixed(0)} KB…`;const c=await config();const path=`cms/${Date.now()}-${crypto.randomUUID()}.webp`;const r=await fetch(`${c.supabaseUrl}/storage/v1/object/${c.siteMediaBucket}/${path}`,{method:'POST',headers:{apikey:c.supabasePublishableKey,Authorization:`Bearer ${state.token}`,'Content-Type':file.type,'x-upsert':'false'},body:file});if(!r.ok){const detail=await r.text().catch(()=> '');let msg=detail||'Falha ao enviar imagem.';if(r.status===413)msg=`A imagem foi otimizada para ${(file.size/1024).toFixed(0)} KB, mas o Storage recusou o envio. Verifique o limite do bucket site-media no Supabase.`;throw new Error(msg);}textInput.value=`${c.supabaseUrl}/storage/v1/object/public/${c.siteMediaBucket}/${path}`;input.value='';if(btn)btn.textContent='Salvando imagem…';await api('content',{method:'PUT',body:JSON.stringify({id:box.dataset.contentId,value:textInput.value})});await loadContent();if(btn){btn.textContent='Imagem salva ✓';setTimeout(()=>btn.textContent='Salvar',1800);}}catch(err){alert(err.message);if(btn)btn.textContent='Salvar';}finally{if(btn)btn.disabled=false;}}
if(state.token) boot();


// v14 — integração Câmara Municipal
function legislativeNumber(v){return Number(v||0).toLocaleString('pt-BR');}
async function legislativeRequest(method='GET',body){
  const r=await fetch('/api/legislative',{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${state.token}`},body:body?JSON.stringify(body):undefined});
  const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||'Falha na integração com a Câmara.'); return d;
}
function renderLegislative(){
  pageTitle.textContent='Dados da Câmara';
  const d=state.legislative||{}, s=d.stats||{};
  const updated=d.lastSynced?new Date(d.lastSynced).toLocaleString('pt-BR'):'Ainda não sincronizado';
  panel.innerHTML=`<div class="toolbar"><div><strong>Produção legislativa oficial</strong><span>Contadores vinculados ao perfil de Elton Carvalho na Câmara Municipal de São Carlos.</span></div><button class="primary" id="syncChamber">Sincronizar agora</button></div>
  <div class="cards legislative-admin-cards"><div class="metric"><strong>${legislativeNumber(s.projects)}</strong><span>Projetos de Lei apresentados</span></div><div class="metric"><strong>${legislativeNumber(s.requirements)}</strong><span>Requerimentos apresentados</span></div><div class="metric"><strong>${legislativeNumber(s.offices)}</strong><span>Ofícios encaminhados</span></div><div class="metric"><strong>${legislativeNumber(s.total)}</strong><span>Total exibido no site</span></div></div>
  <div class="integration-card"><div><small>FONTE OFICIAL</small><h3>Câmara Municipal de São Carlos</h3><p>Projetos de Lei e Requerimentos são lidos automaticamente da área de Legislação do perfil do vereador.</p><p><b>Última sincronização:</b> ${esc(updated)}</p><a href="${esc(d.chamberUrl||'https://camarasaocarlos.sp.gov.br/vereador/?a=legislacao&id=176&p=detalhe')}" target="_blank" rel="noopener">Abrir perfil oficial ↗</a></div><span class="integration-status">● Conectado</span></div>
  <div class="section-label">Ofícios</div><div class="office-setting"><div><strong>${d.officesAutomatic?'Sincronização automática ativa':'Acompanhamento pelo gabinete'}</strong><p>${d.officesAutomatic?'A fonte oficial configurada permite atualizar este contador automaticamente.':'O portal da Câmara não apresenta hoje uma categoria própria de Ofícios no perfil do vereador. Informe o total oficial abaixo; ele permanecerá separado dos Requerimentos.'}</p></div><label>Total oficial de ofícios<input id="officeCount" type="number" min="0" step="1" value="${Number(s.offices||0)}"></label><button class="primary" id="saveOffices">Salvar total</button></div>`;
  $('#syncChamber')?.addEventListener('click',async()=>{const b=$('#syncChamber');b.disabled=true;b.textContent='Sincronizando…';try{await legislativeRequest('POST');await loadLegislative();renderLegislative();}catch(err){alert(err.message);b.disabled=false;b.textContent='Sincronizar agora';}});
  $('#saveOffices')?.addEventListener('click',async()=>{const b=$('#saveOffices');b.disabled=true;b.textContent='Salvando…';try{await legislativeRequest('PUT',{offices:$('#officeCount').value});await loadLegislative();renderLegislative();}catch(err){alert(err.message);b.disabled=false;b.textContent='Salvar total';}});
}
