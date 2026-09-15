const { env, cors, json, publicKey } = require('./_lib');
module.exports = async function handler(req, res) {
  cors(res, 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });
  try {
    return json(res, 200, {
      supabaseUrl: env('SUPABASE_URL'),
      supabasePublishableKey: publicKey(),
      demandBucket: process.env.SUPABASE_DEMAND_BUCKET || 'demand-attachments',
      siteMediaBucket: process.env.SUPABASE_SITE_MEDIA_BUCKET || 'site-media'
    });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
};
