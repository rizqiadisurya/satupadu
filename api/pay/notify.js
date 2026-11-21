// Webhook notifikasi Midtrans. Atur URL ini di Midtrans Dashboard → Settings → Payment → Notification URL.
const { env, sb, sha512, send, readBody, applyBestPlan, invoiceStatus } = require('../_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 200, { ok: true, info: 'Sakara Midtrans webhook' });
  try {
    const n = await readBody(req);
    // Dashboard Midtrans baru memisahkan "Signature Secret Key" dari Server Key; terima tanda tangan dari salah satunya.
    const sig = k => k ? sha512(`${n.order_id}${n.status_code}${n.gross_amount}${k}`) : null;
    const ok = [env('MIDTRANS_SERVER_KEY'), env('MIDTRANS_SIGNATURE_KEY')].map(k => String(k || '').trim()).filter(Boolean).some(k => n.signature_key === sig(k));
    if (!n.order_id || !ok) return send(res, 403, { error: 'Signature tidak valid' });
    const rows = await sb(`/rest/v1/invoices?id=eq.${encodeURIComponent(n.order_id)}&select=*`);
    const inv = rows && rows[0];
    if (!inv) return send(res, 404, { error: 'Tagihan tidak ditemukan' });
    if (Math.round(Number(n.gross_amount)) !== inv.total) return send(res, 400, { error: 'Jumlah tidak cocok' });
    const next = invoiceStatus(n.transaction_status, n.fraud_status);
    const patch = { status: next };
    if (next === 'paid' && inv.status !== 'paid') { patch.paid_at = new Date().toISOString(); patch.method = n.payment_type || inv.method; }
    // Tagihan yang sudah lunas tidak kembali ke gagal/kedaluwarsa; refund hanya untuk tagihan lunas.
    const allowed = (next === 'paid' && !['refunded', 'partial_refund'].includes(inv.status)) || (['expired', 'failed'].includes(next) && inv.status === 'pending') || (['refunded', 'partial_refund'].includes(next) && ['paid', 'partial_refund'].includes(inv.status));
    if (next && allowed && (next !== inv.status || next === 'paid')) {
      if (next !== inv.status) await sb(`/rest/v1/invoices?id=eq.${encodeURIComponent(inv.id)}`, { method: 'PATCH', body: patch });
      // Selalu samakan paket dengan tagihan lunas, juga saat notifikasi diulang, supaya kegagalan sebelumnya bisa pulih.
      if (next === 'paid' || next === 'refunded') await applyBestPlan(inv.invitation_id);
    }
    send(res, 200, { ok: true });
  } catch (e) { send(res, 500, { error: e.message }); }
};
