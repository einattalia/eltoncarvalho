const { cors, json, db, requireAdmin } = require('./_lib');

const CHAMBER_PROFILE = 'https://camarasaocarlos.sp.gov.br/vereador/?a=legislacao&id=176&p=detalhe';

function cleanNumber(value) {
  const n = Number(String(value ?? '').replace(/\D/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parseProfile(html) {
  const normalized = html.replace(/&nbsp;/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const pick = (label) => {
    const re = new RegExp(`${label}\\s*(\\d[\\d.]*)`, 'i');
    const m = normalized.match(re);
    return m ? cleanNumber(m[1]) : 0;
  };
  return {
    projects: pick('Projeto de Lei Ordinária'),
    requirements: pick('Requerimento')
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 EltonCarvalhoSite/1.0', Accept: 'text/html' } });
  if (!response.ok) throw new Error(`Câmara respondeu ${response.status}`);
  return response.text();
}

async function liveStats() {
  const html = await fetchHtml(CHAMBER_PROFILE);
  const base = parseProfile(html);
  let offices = null;
  const officeUrl = process.env.CAMARA_OFICIOS_URL || '';
  if (officeUrl) {
    try {
      const officeHtml = await fetchHtml(officeUrl);
      const text = officeHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const m = text.match(/Foram encontrados\s*([\d.]+)\s*resultados/i);
      offices = m ? cleanNumber(m[1]) : null;
    } catch (_) { offices = null; }
  }
  return { ...base, offices, source_url: CHAMBER_PROFILE, checked_at: new Date().toISOString() };
}

async function cachedStats() {
  try {
    const rows = await db('legislative_stats?select=stat_key,stat_value,source_mode,source_url,last_synced_at&order=stat_key.asc');
    return Object.fromEntries((rows || []).map(r => [r.stat_key, r]));
  } catch (_) { return {}; }
}

async function saveStat(key, value, mode, url) {
  await db('legislative_stats?on_conflict=stat_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ stat_key: key, stat_value: Number(value || 0), source_mode: mode, source_url: url || null, last_synced_at: new Date().toISOString() })
  });
}

module.exports = async function handler(req, res) {
  cors(res, 'GET,POST,PUT,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const cache = await cachedStats();
      let live = null;
      if (!cache.projects || !cache.requirements) {
        try { live = await liveStats(); } catch (_) {}
      }
      const projects = cache.projects?.stat_value ?? live?.projects ?? 0;
      const requirements = cache.requirements?.stat_value ?? live?.requirements ?? 0;
      const offices = cache.offices?.stat_value ?? live?.offices ?? 0;
      const lastSynced = cache.projects?.last_synced_at || cache.requirements?.last_synced_at || live?.checked_at || null;
      return json(res, 200, {
        stats: { projects, requirements, offices, total: projects + requirements + offices },
        lastSynced,
        chamberUrl: CHAMBER_PROFILE,
        officesAutomatic: cache.offices?.source_mode === 'automatic' || Boolean(live?.offices)
      });
    }

    const access = await requireAdmin(req);
    if (!access) return json(res, 401, { error: 'Acesso administrativo não autorizado.' });

    if (req.method === 'POST') {
      const live = await liveStats();
      await saveStat('projects', live.projects, 'automatic', CHAMBER_PROFILE);
      await saveStat('requirements', live.requirements, 'automatic', CHAMBER_PROFILE);
      if (live.offices !== null) await saveStat('offices', live.offices, 'automatic', process.env.CAMARA_OFICIOS_URL);
      const cache = await cachedStats();
      return json(res, 200, { ok: true, live, officesAutomatic: cache.offices?.source_mode === 'automatic' });
    }

    if (req.method === 'PUT') {
      const value = cleanNumber(req.body?.offices);
      await saveStat('offices', value, 'manual', null);
      return json(res, 200, { ok: true, offices: value });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || 'Falha ao consultar os dados legislativos.' });
  }
};
