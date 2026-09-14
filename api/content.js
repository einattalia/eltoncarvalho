const { cors, json, db } = require('./_lib');
module.exports = async function handler(req, res) {
  cors(res, 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });
  try {
    const rows = await db('site_content?select=content_key,value,content_type,label,section&order=section.asc,sort_order.asc');
    const content = Object.fromEntries((rows || []).map(row => [row.content_key, { value: row.value, type: row.content_type, label: row.label, section: row.section }]));
    return json(res, 200, { content });
  } catch (error) {
    return json(res, 200, { content: {}, warning: 'CMS ainda não configurado.' });
  }
};
