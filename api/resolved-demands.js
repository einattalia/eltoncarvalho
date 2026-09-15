const { cors, json, db } = require('./_lib');

module.exports = async function handler(req, res) {
  cors(res, 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });
  try {
    // Endpoint público propositalmente mínimo: nunca expõe nome, telefone,
    // endereço, protocolo, anexos, mensagem ou observações internas.
    const rows = await db('demands?select=id,kind,category,neighborhood,resolved_at,updated_at&status=eq.Resolvida&order=resolved_at.desc.nullslast,updated_at.desc&limit=100');
    const solutions = (rows || []).map(d => ({
      id: d.id,
      neighborhood: String(d.neighborhood || '').trim(),
      category: d.kind === 'Denúncia' && d.category === 'Causa Animal' ? 'Causa Animal' : String(d.category || 'Demanda').trim(),
      resolvedAt: d.resolved_at || d.updated_at || null
    })).filter(d => d.neighborhood);
    return json(res, 200, { solutions });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'Não foi possível carregar as soluções.' });
  }
};
