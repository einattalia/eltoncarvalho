const { cors, json, db, makeProtocol, env } = require('./_lib');

function clean(value, max = 3000) { return String(value || '').trim().slice(0, max); }
function displayKind(demand) { return demand.kind === 'Denúncia' && demand.category === 'Causa Animal' ? 'Denúncia Causa Animal' : demand.kind; }

async function notifyEmail(demand) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'RESEND_API_KEY ausente' };
  const to = process.env.DEMAND_EMAIL_TO || 'contato.eltoncarvalho@gmail.com';
  const from = process.env.DEMAND_EMAIL_FROM || 'Gabinete Digital <onboarding@resend.dev>';
  const attachmentText = (demand.attachments || []).map(a => `• ${a.name}`).join('\n') || 'Nenhum';
  const text = `Nova demanda recebida\n\nProtocolo: ${demand.protocol}\nTipo: ${displayKind(demand)}${demand.kind === 'Denúncia' ? '' : `\nCategoria: ${demand.category}`}\nNome: ${demand.name}\nWhatsApp: ${demand.phone}\nBairro: ${demand.neighborhood}\nLocal: ${demand.address || '-'}\n\nDescrição:\n${demand.message}\n\nAnexos:\n${attachmentText}\n\nConsulte os arquivos e altere o status pelo painel administrativo.`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: `[${demand.protocol}] ${displayKind(demand)}${demand.kind === 'Denúncia' ? '' : ` — ${demand.category}`}`, text })
  });
  return { sent: response.ok, status: response.status };
}

async function notifyWhatsApp(demand) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = (process.env.WHATSAPP_GABINETE_NUMBER || '5516992934352').replace(/\D/g, '');
  const message = `Nova demanda ${demand.protocol}\n${displayKind(demand)}${demand.kind === 'Denúncia' ? '' : ` • ${demand.category}`}\nNome: ${demand.name}\nTelefone: ${demand.phone}\nBairro: ${demand.neighborhood}\nLocal: ${demand.address || '-'}\nDescrição: ${demand.message.slice(0, 700)}\nAnexos: ${(demand.attachments || []).length}`;
  if (!token || !phoneNumberId) {
    return { sent: false, whatsappUrl: `https://wa.me/${recipient}?text=${encodeURIComponent(message)}` };
  }
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: recipient, type: 'text', text: { body: message } })
  });
  return { sent: response.ok, status: response.status };
}

module.exports = async function handler(req, res) {
  cors(res, 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
  try {
    const b = req.body || {};
    const allowedKinds = ['Solicitação', 'Denúncia'];
    const kind = allowedKinds.includes(b.kind) ? b.kind : 'Solicitação';
    const submittedCategory = clean(b.category, 80);
    const category = kind === 'Denúncia' ? 'Causa Animal' : submittedCategory;
    if (kind === 'Solicitação' && category === 'Causa Animal') {
      return json(res, 400, { error: 'Para denúncias de Causa Animal, utilize o campo exclusivo Denúncia Causa Animal.' });
    }
    const demand = {
      external_ref: clean(b.requestId, 64),
      protocol: makeProtocol(),
      kind,
      name: clean(b.name, 120), phone: clean(b.phone, 30), category,
      neighborhood: clean(b.neighborhood, 100), address: clean(b.address, 180), message: clean(b.message, 3000),
      attachments: Array.isArray(b.attachments) ? b.attachments.slice(0, 5) : [], consent: b.consent === true,
      status: 'Nova', priority: 'Média', source: 'site'
    };
    if (!demand.external_ref || !demand.name || !demand.phone || !demand.category || !demand.neighborhood || !demand.message || !demand.consent) {
      return json(res, 400, { error: 'Preencha todos os campos obrigatórios e confirme a autorização.' });
    }
    const inserted = await db('demands', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(demand) });
    const row = inserted?.[0] || demand;
    const [email, whatsapp] = await Promise.allSettled([notifyEmail(row), notifyWhatsApp(row)]);
    const emailResult = email.status === 'fulfilled' ? email.value : { sent: false };
    const waResult = whatsapp.status === 'fulfilled' ? whatsapp.value : { sent: false };
    await db(`demands?protocol=eq.${encodeURIComponent(demand.protocol)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ email_notified: !!emailResult.sent, whatsapp_notified: !!waResult.sent })
    }).catch(() => {});
    return json(res, 201, { protocol: demand.protocol, saved: true, emailNotified: !!emailResult.sent, whatsappNotified: !!waResult.sent, whatsappUrl: waResult.whatsappUrl || null });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'Não foi possível registrar a demanda. Verifique a configuração do Supabase.' });
  }
};
