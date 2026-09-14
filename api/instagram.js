const { json, setCors } = require('./_lib');

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID || 'me';
  const version = process.env.INSTAGRAM_GRAPH_VERSION || 'v24.0';
  if (!token) return json(res, 503, { error: 'Instagram ainda não configurado.' });

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username';
  const url = new URL(`https://graph.instagram.com/${version}/${encodeURIComponent(userId)}/media`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', '12');
  url.searchParams.set('access_token', token);

  try {
    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Instagram API error', response.status, payload?.error?.message || payload);
      return json(res, 502, { error: 'Não foi possível carregar o Instagram.' });
    }

    const data = Array.isArray(payload.data) ? payload.data.map(post => ({
      id: post.id,
      caption: post.caption || '',
      media_type: post.media_type || '',
      media_url: post.media_url || '',
      thumbnail_url: post.thumbnail_url || '',
      permalink: post.permalink || '',
      timestamp: post.timestamp || '',
      username: post.username || ''
    })) : [];

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return json(res, 200, { data });
  } catch (error) {
    console.error('Instagram request failed', error);
    return json(res, 502, { error: 'Não foi possível carregar o Instagram.' });
  }
};
