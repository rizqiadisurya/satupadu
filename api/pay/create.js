// Membuat tagihan + transaksi Midtrans Snap. Harga selalu dihitung di server.
const { env, sb, userFromReq, priceFor, send, readBody, IS_PROD } = require('../_lib');
const METHODS = { qris: ['other_qris', 'gopay', 'shopeepay'], va: ['bca_va', 'bni_va', 'bri_va', 'echannel', 'permata_va', 'other_va'], ewallet: ['gopay', 'shopeepay'] };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Gunakan POST' });
  try {
    if (!env('MIDTRANS_SERVER_KEY')) return send(res, 503, { error: 'Pembayaran belum dikonfigurasi (MIDTRANS_SERVER_KEY kosong)' });
    const user = await userFromReq(req);
    if (!user || !user.id) return send(res, 401, { error: 'Silakan masuk dulu' });
    const body = await readBody(req);
    const plan = body.plan === 'undangan' ? 'undangan' : 'tamu';
    const invs = await sb(`/rest/v1/invitations?owner=eq.${user.id}&select=id,slug,plan,published,data`);
    const inv = invs && invs[0];
    if (!inv) return send(res, 404, { error: 'Undangan belum dibuat' });
    const p = priceFor(inv, plan, body.voucher);
    const orderId = `SP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await sb('/rest/v1/invoices', { method: 'POST', body: { id: orderId, invitation_id: inv.id, owner: user.id, item: p.item, plan: p.upgrade ? 'tamu' : plan, price: p.price, discount: p.discount, voucher: p.voucher, total: p.total, method: body.method || '', status: 'pending' } });
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    const site = /\.vercel\.app$|^localhost/.test(host) ? `https://${host}` : (env('SITE_URL') || `https://${host}`);
    const items = [{ id: p.upgrade ? 'upgrade' : plan, price: p.price, quantity: 1, name: p.item.slice(0, 50) }];
    if (p.discount) items.push({ id: 'voucher', price: -p.discount, quantity: 1, name: `Voucher ${p.voucher}` });
    const payload = {
      transaction_details: { order_id: orderId, gross_amount: p.total },
      item_details: items,
      customer_details: { first_name: (user.user_metadata && user.user_metadata.name) || user.email.split('@')[0], email: user.email },
      callbacks: { finish: `${site}/#checkout` },
      expiry: { unit: 'minutes', duration: 60 },
    };
    if (METHODS[body.method]) payload.enabled_payments = METHODS[body.method];
    const base = IS_PROD() ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
    const r = await fetch(`${base}/snap/v1/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Override-Notification': `${site}/api/pay/notify`, Authorization: 'Basic ' + Buffer.from(env('MIDTRANS_SERVER_KEY').trim() + ':').toString('base64') }, body: JSON.stringify(payload) });
    const raw = await r.text();
    let snap = {}; try { snap = JSON.parse(raw); } catch (e) {}
    if (!r.ok || !snap.token) {
      console.error('Midtrans Snap error', r.status, raw.slice(0, 500));
      await sb(`/rest/v1/invoices?id=eq.${orderId}`, { method: 'PATCH', body: { status: 'failed' } });
      return send(res, 502, { error: ((snap.error_messages && snap.error_messages.join(', ')) || snap.status_message || 'Gagal membuat transaksi Midtrans') + ` (Midtrans ${r.status})` });
    }
    send(res, 200, { orderId, token: snap.token, redirectUrl: snap.redirect_url, total: p.total });
  } catch (e) { send(res, e.status || 500, { error: e.message || 'Terjadi kesalahan' }); }
};
