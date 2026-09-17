const { cors, json, db, requireAdmin, env, secretKey } = require('./_lib');
function amendmentPayload(b, userId) {
  const allowed=['Em articulação','Indicada','Confirmada','Aguardando liberação','Recurso recebido','Executada','Cancelada/Arquivada'];
  return { title:String(b.title||'').trim().slice(0,200), year:Number(b.year)||new Date().getFullYear(), status:allowed.includes(b.status)?b.status:'Em articulação', area:String(b.area||'').slice(0,100), sphere:String(b.sphere||'').slice(0,50), parliamentarian:String(b.parliamentarian||'').slice(0,180), party:String(b.party||'').slice(0,50), beneficiary:String(b.beneficiary||'').slice(0,220), municipality:String(b.municipality||'São Carlos/SP').slice(0,150), purpose:String(b.purpose||'').slice(0,1000), amendment_number:String(b.amendment_number||'').slice(0,120), requested_value:Number(b.requested_value)||0, approved_value:Number(b.approved_value)||0, received_value:Number(b.received_value)||0, indication_date:b.indication_date||null, expected_payment_date:b.expected_payment_date||null, received_date:b.received_date||null, internal_owner:String(b.internal_owner||'').slice(0,180), articulation_origin:String(b.articulation_origin||'').slice(0,220), notes:String(b.notes||'').slice(0,4000), is_public:!!b.is_public, updated_at:new Date().toISOString(), updated_by:userId, created_by:userId };
}

module.exports = async function handler(req, res) {
  cors(res, 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const access = await requireAdmin(req);
    if (!access) return json(res, 401, { error: 'Acesso administrativo não autorizado.' });
    const action = (req.query?.action || req.body?.action || '').toString();

    if (req.method === 'GET' && action === 'demands') {
      const rows = await db('demands?select=id,protocol,created_at,updated_at,resolved_at,kind,name,phone,category,neighborhood,address,ouvidoria_protocol,message,attachments,status,priority,internal_notes,email_notified,whatsapp_notified&order=created_at.desc&limit=500');
      return json(res, 200, { demands: rows || [] });
    }
    if (req.method === 'GET' && action === 'amendments') {
      const rows = await db('parliamentary_amendments?select=*&order=created_at.desc');
      const docs = await db('amendment_documents?select=*&order=created_at.desc');
      return json(res, 200, { amendments: rows || [], documents: docs || [] });
    }
    if (req.method === 'GET' && action === 'amendment-document') {
      const path = String(req.query?.path || '');
      if (!path || path.includes('..')) return json(res, 400, { error: 'Documento inválido.' });
      const bucket = process.env.SUPABASE_AMENDMENT_BUCKET || 'amendment-documents';
      const key = secretKey();
      const response = await fetch(`${env('SUPABASE_URL')}/storage/v1/object/sign/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 300 })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return json(res, response.status, { error: 'Não foi possível abrir o documento.' });
      const signed = data.signedURL || data.signedUrl || '';
      return json(res, 200, { url: signed.startsWith('http') ? signed : `${env('SUPABASE_URL')}/storage/v1${signed}` });
    }
    if (req.method === 'POST' && action === 'amendment') {
      const b = req.body || {};
      const payload = amendmentPayload(b, access.user.id);
      const rows = await db('parliamentary_amendments', { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify(payload) });
      const item = rows?.[0];
      if (item) await db('amendment_history', {method:'POST',body:JSON.stringify({amendment_id:item.id,event_type:'created',description:'Emenda cadastrada',to_status:item.status,created_by:access.user.id})});
      return json(res, 201, { amendment:item || null });
    }
    if (req.method === 'PUT' && action === 'amendment') {
      const b=req.body||{}; if(!b.id) return json(res,400,{error:'ID ausente.'});
      const old=(await db(`parliamentary_amendments?select=id,status&id=eq.${encodeURIComponent(b.id)}&limit=1`))?.[0];
      const payload=amendmentPayload(b, access.user.id); delete payload.created_by;
      const rows=await db(`parliamentary_amendments?id=eq.${encodeURIComponent(b.id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
      if(old && old.status!==payload.status) await db('amendment_history',{method:'POST',body:JSON.stringify({amendment_id:b.id,event_type:'status_changed',description:`Status alterado de ${old.status} para ${payload.status}`,from_status:old.status,to_status:payload.status,created_by:access.user.id})});
      return json(res,200,{amendment:rows?.[0]||null});
    }
    if (req.method === 'POST' && action === 'amendment-document') {
      const b=req.body||{}; if(!b.amendment_id||!b.storage_path||!b.file_name) return json(res,400,{error:'Dados do documento incompletos.'});
      const rows=await db('amendment_documents',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({amendment_id:b.amendment_id,document_type:String(b.document_type||'Outro').slice(0,100),office_number:String(b.office_number||'').slice(0,100),document_date:b.document_date||null,description:String(b.description||'').slice(0,1000),file_name:String(b.file_name).slice(0,255),storage_path:String(b.storage_path).slice(0,600),mime_type:String(b.mime_type||'application/pdf').slice(0,100),file_size:Number(b.file_size||0),is_public:!!b.is_public,created_by:access.user.id})});
      return json(res,201,{document:rows?.[0]||null});
    }
    if (req.method === 'DELETE' && action === 'amendment-document') {
      const id=String(req.query?.id||''); if(!id) return json(res,400,{error:'ID ausente.'});
      const doc=(await db(`amendment_documents?select=id,storage_path&id=eq.${encodeURIComponent(id)}&limit=1`))?.[0];
      if(doc?.storage_path){const bucket=process.env.SUPABASE_AMENDMENT_BUCKET||'amendment-documents';await fetch(`${env('SUPABASE_URL')}/storage/v1/object/${bucket}/${doc.storage_path.split('/').map(encodeURIComponent).join('/')}`,{method:'DELETE',headers:{apikey:secretKey(),Authorization:`Bearer ${secretKey()}`}});}
      await db(`amendment_documents?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'}); return json(res,200,{ok:true});
    }
    if (req.method === 'GET' && action === 'content') {
      const rows = await db('site_content?select=id,content_key,value,content_type,label,section,sort_order&order=section.asc,sort_order.asc');
      return json(res, 200, { content: rows || [] });
    }
    if (req.method === 'GET' && action === 'attachment') {
      const path = String(req.query?.path || '');
      if (!path || path.includes('..')) return json(res, 400, { error: 'Anexo inválido.' });
      const bucket = process.env.SUPABASE_DEMAND_BUCKET || 'demand-attachments';
      const key = secretKey();
      const response = await fetch(`${env('SUPABASE_URL')}/storage/v1/object/sign/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 300 })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return json(res, response.status, { error: 'Não foi possível abrir o anexo.' });
      const signed = data.signedURL || data.signedUrl || '';
      return json(res, 200, { url: signed.startsWith('http') ? signed : `${env('SUPABASE_URL')}/storage/v1${signed}` });
    }
    if (req.method === 'PUT' && action === 'demand') {
      const { id, status, priority, internal_notes, ouvidoria_protocol } = req.body || {};
      if (!id) return json(res, 400, { error: 'ID ausente.' });
      const now = new Date().toISOString();
      const patch = { status, priority, ouvidoria_protocol: String(ouvidoria_protocol || '').trim().slice(0,120), internal_notes: String(internal_notes || '').slice(0, 4000), updated_at: now };
      if (status === 'Resolvida') patch.resolved_at = now;
      else patch.resolved_at = null;
      const rows = await db(`demands?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
      return json(res, 200, { demand: rows?.[0] || null });
    }
    if (req.method === 'PUT' && action === 'content') {
      const { id, value } = req.body || {};
      if (!id) return json(res, 400, { error: 'ID ausente.' });
      const rows = await db(`site_content?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ value: String(value ?? ''), updated_at: new Date().toISOString(), updated_by: access.user.id }) });
      return json(res, 200, { item: rows?.[0] || null });
    }
    return json(res, 404, { error: 'Ação administrativa não encontrada.' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || 'Erro no painel administrativo.' });
  }
};
