const crypto = require('crypto');

function env(name, required = true) {
  const value = process.env[name];
  if (required && !value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value || '';
}

function cors(res, methods = 'GET,POST,PUT,OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, status, body) {
  res.status(status).json(body);
}

function secretKey() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Variável de ambiente ausente: SUPABASE_SECRET_KEY');
  return key;
}

function supabaseHeaders(extra = {}) {
  const key = secretKey();
  return { apikey: key, 'Content-Type': 'application/json', ...extra };
}

async function db(path, options = {}) {
  const url = `${env('SUPABASE_URL')}/rest/v1/${path}`;
  const response = await fetch(url, { ...options, headers: { ...supabaseHeaders(), ...(options.headers || {}) } });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Supabase ${response.status}`);
    error.status = response.status;
    error.detail = data;
    throw error;
  }
  return data;
}

function makeProtocol() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `EC-${day}-${suffix}`;
}

async function getAuthUser(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const response = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: env('SUPABASE_PUBLISHABLE_KEY'), Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return null;
  return response.json();
}

async function requireAdmin(req) {
  const user = await getAuthUser(req);
  if (!user?.id) return null;
  const rows = await db(`app_admins?select=user_id,email,active&user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&limit=1`);
  return rows?.length ? { user, admin: rows[0] } : null;
}

module.exports = { env, cors, json, db, makeProtocol, getAuthUser, requireAdmin, secretKey };
