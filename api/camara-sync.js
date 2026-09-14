const { json } = require('./_lib');
const legislative = require('./legislative');
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const secret = process.env.CRON_SECRET || '';
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) return json(res, 401, { error: 'Cron não autorizado.' });
    req.method = 'POST';
    // O endpoint legislativo exige admin para POST; o cron usa uma chamada interna direta simplificada.
    try {
      const profile = 'https://camarasaocarlos.sp.gov.br/vereador/?a=legislacao&id=176&p=detalhe';
      const r = await fetch(profile, { headers: { 'User-Agent': 'Mozilla/5.0 EltonCarvalhoSite/1.0' } });
      if (!r.ok) throw new Error(`Câmara respondeu ${r.status}`);
      const html = (await r.text()).replace(/&nbsp;/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
      const n = label => { const m=html.match(new RegExp(`${label}\\s*(\\d[\\d.]*)`,'i')); return m?Number(m[1].replace(/\D/g,'')):0; };
      const { db } = require('./_lib');
      const now = new Date().toISOString();
      for (const [stat_key,stat_value] of [['projects',n('Projeto de Lei Ordinária')],['requirements',n('Requerimento')]]) {
        await db('legislative_stats?on_conflict=stat_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({stat_key,stat_value,source_mode:'automatic',source_url:profile,last_synced_at:now})});
      }
      return json(res,200,{ok:true,projects:n('Projeto de Lei Ordinária'),requirements:n('Requerimento'),syncedAt:now});
    } catch(error) { return json(res,500,{error:error.message}); }
  }
  return legislative(req,res);
};
