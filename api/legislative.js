const { cors, json, db, requireAdmin } = require('./_lib');

const SOURCES = {
  projects: 'https://camarasaocarlos.sp.gov.br/vereador/?id=176&p=documento&tipo=15',
  requirements: 'https://camarasaocarlos.sp.gov.br/vereador/?id=176&p=documento&tipo=30'
};
const CHAMBER_PROFILE = 'https://camarasaocarlos.sp.gov.br/vereador/?id=176&p=detalhe';

function cleanNumber(value) {
  const n = Number(String(value ?? '').replace(/\D/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function parseResultCount(html, label) {
  const text = String(html || '').replace(/&nbsp;/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const match = text.match(/Foram encontrados\s*([\d.]+)\s*resultados/i);
  if (!match) throw new Error(`Não foi possível identificar o total de ${label} no portal da Câmara.`);
  return cleanNumber(match[1]);
}
async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 EltonCarvalhoSite/2.0', Accept: 'text/html,application/xhtml+xml' }
  });
  if (!response.ok) throw new Error(`Câmara respondeu HTTP ${response.status}`);
  return response.text();
}
async function liveStats() {
  const [projectsHtml, requirementsHtml] = await Promise.all([
    fetchHtml(SOURCES.projects), fetchHtml(SOURCES.requirements)
  ]);
  return {
    projects: parseResultCount(projectsHtml, 'Projetos de Lei'),
    requirements: parseResultCount(requirementsHtml, 'Requerimentos'),
    checked_at: new Date().toISOString()
  };
}
async function cachedStats() {
  try {
    const rows = await db('legislative_stats?select=stat_key,stat_value,source_mode,source_url,last_synced_at&order=stat_key.asc');
    return Object.fromEntries((rows || []).map(r => [r.stat_key, r]));
  } catch (_) { return {}; }
}
async function saveStat(key, value, mode, url, syncedAt = new Date().toISOString()) {
  await db('legislative_stats?on_conflict=stat_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ stat_key: key, stat_value: Number(value || 0), source_mode: mode, source_url: url || null, last_synced_at: syncedAt, updated_at: syncedAt })
  });
}
async function persistLive(live) {
  await Promise.all([
    saveStat('projects', live.projects, 'automatic', SOURCES.projects, live.checked_at),
    saveStat('requirements', live.requirements, 'automatic', SOURCES.requirements, live.checked_at)
  ]);
  return live;
}
function payload(cache, extra = {}) {
  const projects = Number(cache.projects?.stat_value || 0);
  const requirements = Number(cache.requirements?.stat_value || 0);
  const offices = Number(cache.offices?.stat_value || 0);
  const dates = [cache.projects?.last_synced_at, cache.requirements?.last_synced_at].filter(Boolean).sort();
  return {
    stats: { projects, requirements, offices, total: projects + requirements + offices },
    lastSynced: dates.at(-1) || null,
    chamberUrl: CHAMBER_PROFILE,
    sources: SOURCES,
    officesAutomatic: cache.offices?.source_mode === 'automatic',
    ...extra
  };
}

async function handler(req, res) {
  cors(res, 'GET,POST,PUT,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      let cache = await cachedStats();
      if (!cache.projects || !cache.requirements) {
        try { await persistLive(await liveStats()); cache = await cachedStats(); }
        catch (error) { return json(res, 200, payload(cache, { sourceStatus: 'cache', sourceError: error.message })); }
      }
      return json(res, 200, payload(cache, { sourceStatus: 'cache' }));
    }

    const access = await requireAdmin(req);
    if (!access) return json(res, 401, { error: 'Acesso administrativo não autorizado.' });

    if (req.method === 'POST') {
      const live = await persistLive(await liveStats());
      const cache = await cachedStats();
      return json(res, 200, payload(cache, { ok: true, sourceStatus: 'live', checkedAt: live.checked_at }));
    }
    if (req.method === 'PUT') {
      const value = cleanNumber(req.body?.offices);
      await saveStat('offices', value, 'manual', null);
      const cache = await cachedStats();
      return json(res, 200, payload(cache, { ok: true }));
    }
    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    console.error('[legislative]', error);
    return json(res, 500, { error: error.message || 'Falha ao consultar os dados legislativos.' });
  }
}
handler.liveStats = liveStats;
handler.persistLive = persistLive;
handler.cachedStats = cachedStats;
handler.SOURCES = SOURCES;
module.exports = handler;
