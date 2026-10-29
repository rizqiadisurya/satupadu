// Webhook notifikasi Midtrans. Atur URL ini di Midtrans Dashboard → Settings → Payment → Notification URL.
const { env, sb, sha512, send, readBody } = require('../_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 200, { ok: true, info: 'SatuPadu Midtrans webhook' });
  try {
    const n = await readBody(req);
    const expected = sha512(`${n.order_id}${n.status_code}${n.gross_amount}${env('MIDTRANS_SERVER_KEY')}`);
    if (!n.order_id || n.signature_key !== expected) return send(res, 403, { error: 'Signature tidak valid' });
    const rows = await sb(`/rest/v1/invoices?id=eq.${encodeURIComponent(n.order_id)}&select=*`);
    const inv = rows && rows[0];
    if (!inv) return send(res, 404, { error: 'Tagihan tidak ditemukan' });
    if (Math.round(Number(n.gross_amount)) !== inv.total) return send(res, 400, { error: 'Jumlah tidak cocok' });
    const st = n.transaction_status, fraud = n.fraud_status;
    const paid = (st === 'settlement') || (st === 'capture' && fraud === 'accept');
    if (paid && inv.status !== 'paid') {
      await sb(`/rest/v1/invoices?id=eq.${encodeURIComponent(inv.id)}`, { method: 'PATCH', body: { status: 'paid', paid_at: new Date().toISOString(), method: n.payment_type || inv.method } });
      await sb(`/rest/v1/invitations?id=eq.${inv.invitation_id}`, { method: 'PATCH', body: { plan: inv.plan, published: true } });
    } else if (['expire', 'cancel', 'deny', 'failure'].includes(st) && inv.status === 'pending') {
      await sb(`/rest/v1/invoices?id=eq.${encodeURIComponent(inv.id)}`, { method: 'PATCH', body: { status: st === 'expire' ? 'expired' : 'failed' } });
    }
    send(res, 200, { ok: true });
  } catch (e) { send(res, 500, { error: e.message }); }
};
