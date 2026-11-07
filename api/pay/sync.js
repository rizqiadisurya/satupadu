// Menyamakan paket undangan dengan tagihan lunas terakhir milik pengguna.
// Dipanggil halaman saat paket di undangan berbeda dengan tagihan lunas terbaru (mis. webhook gagal menyimpan paket).
const { sb, userFromReq, send } = require('../_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Gunakan POST' });
  try {
    const user = await userFromReq(req);
    if (!user || !user.id) return send(res, 401, { error: 'Silakan masuk dulu' });
    const invs = await sb(`/rest/v1/invitations?owner=eq.${user.id}&select=id,plan,published`);
    const inv = invs && invs[0]; if (!inv) return send(res, 404, { error: 'Undangan belum dibuat' });
    const paid = await sb(`/rest/v1/invoices?invitation_id=eq.${inv.id}&status=eq.paid&select=id,plan,paid_at&order=paid_at.desc&limit=1`);
    const last = paid && paid[0];
    if (!last || (last.plan === inv.plan && inv.published)) return send(res, 200, { plan: inv.plan, published: inv.published, changed: false });
    const rows = await sb(`/rest/v1/invitations?id=eq.${inv.id}`, { method: 'PATCH', body: { plan: last.plan, published: true } });
    const now = rows && rows[0];
    if (!now || now.plan !== last.plan) return send(res, 500, { error: `Paket ${last.plan} belum bisa disimpan ke undangan (tersimpan: ${now ? now.plan : '-'})` });
    send(res, 200, { plan: now.plan, published: now.published, changed: true });
  } catch (e) { send(res, e.status || 500, { error: e.message || 'Terjadi kesalahan' }); }
};
