// Menyamakan paket undangan dengan tagihan lunas terakhir milik pengguna.
// Juga mengecek status tagihan yang masih menunggu ke Midtrans.
// Dipanggil halaman saat paket di undangan berbeda dengan tagihan lunas terbaru (mis. webhook gagal menyimpan paket).
const { env, sb, userFromReq, send, IS_PROD } = require('../_lib');

// Tanya Midtrans langsung untuk tagihan yang masih menunggu (dipakai bila notifikasi webhook tidak sampai, mis. di staging).
async function checkPending(invId) {
  const key = env('MIDTRANS_SERVER_KEY'); if (!key) return;
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const pend = await sb(`/rest/v1/invoices?invitation_id=eq.${invId}&status=eq.pending&created_at=gte.${since}&select=id,total,method`);
  const api = IS_PROD() ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
  for (const p of pend || []) {
    try {
      const r = await fetch(`${api}/v2/${encodeURIComponent(p.id)}/status`, { headers: { Accept: 'application/json', Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64') } });
      const t = await r.json().catch(() => ({}));
      if (Math.round(Number(t.gross_amount)) !== p.total) continue;
      const st = t.transaction_status;
      if (st === 'settlement' || (st === 'capture' && t.fraud_status === 'accept')) await sb(`/rest/v1/invoices?id=eq.${encodeURIComponent(p.id)}`, { method: 'PATCH', body: { status: 'paid', paid_at: t.settlement_time ? new Date(t.settlement_time.replace(' ', 'T') + '+07:00').toISOString() : new Date().toISOString(), method: t.payment_type || p.method } });
      else if (['expire', 'cancel', 'deny', 'failure'].includes(st)) await sb(`/rest/v1/invoices?id=eq.${encodeURIComponent(p.id)}`, { method: 'PATCH', body: { status: st === 'expire' ? 'expired' : 'failed' } });
    } catch (e) { console.warn('midtrans status', p.id, e.message); }
  }
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Gunakan POST' });
  try {
    const user = await userFromReq(req);
    if (!user || !user.id) return send(res, 401, { error: 'Silakan masuk dulu' });
    const invs = await sb(`/rest/v1/invitations?owner=eq.${user.id}&select=id,plan,published`);
    const inv = invs && invs[0]; if (!inv) return send(res, 404, { error: 'Undangan belum dibuat' });
    await checkPending(inv.id);
    const paid = await sb(`/rest/v1/invoices?invitation_id=eq.${inv.id}&status=eq.paid&select=id,plan,paid_at&order=paid_at.desc&limit=1`);
    const last = paid && paid[0];
    if (!last || (last.plan === inv.plan && inv.published)) return send(res, 200, { plan: inv.plan, published: inv.published, changed: false });
    const rows = await sb(`/rest/v1/invitations?id=eq.${inv.id}`, { method: 'PATCH', body: { plan: last.plan, published: true } });
    const now = rows && rows[0];
    if (!now || now.plan !== last.plan) return send(res, 500, { error: `Paket ${last.plan} belum bisa disimpan ke undangan (tersimpan: ${now ? now.plan : '-'})` });
    send(res, 200, { plan: now.plan, published: now.published, changed: true });
  } catch (e) { send(res, e.status || 500, { error: e.message || 'Terjadi kesalahan' }); }
};
