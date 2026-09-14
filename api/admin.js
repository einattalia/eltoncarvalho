const { cors, json, db, requireAdmin, env, secretKey } = require('./_lib');
module.exports = async function handler(req, res) {
  cors(res, 'GET,POST,PUT,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const access = await requireAdmin(req);
    if (!access) return json(res, 401, { error: 'Acesso administrativo não autorizado.' });
    const action = (req.query?.action || req.body?.action || '').toString();

    if (req.method === 'GET' && action === 'demands') {
      const rows = await db('demands?select=id,protocol,created_at,kind,name,phone,category,neighborhood,address,message,attachments,status,priority,internal_notes,email_notified,whatsapp_notified&order=created_at.desc&limit=500');
      return json(res, 200, { demands: rows || [] });
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
      const { id, status, priority, internal_notes } = req.body || {};
      if (!id) return json(res, 400, { error: 'ID ausente.' });
      const rows = await db(`demands?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status, priority, internal_notes: String(internal_notes || '').slice(0, 4000), updated_at: new Date().toISOString() }) });
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
