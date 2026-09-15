const { json } = require('./_lib');
const legislative = require('./legislative');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });
  const secret = process.env.CRON_SECRET || '';
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return json(res, 401, { error: 'Cron não autorizado.' });
  }
  try {
    const live = await legislative.persistLive(await legislative.liveStats());
    return json(res, 200, { ok: true, projects: live.projects, requirements: live.requirements, syncedAt: live.checked_at });
  } catch (error) {
    console.error('[camara-sync]', error);
    return json(res, 500, { error: error.message || 'Falha na sincronização com a Câmara.' });
  }
};
