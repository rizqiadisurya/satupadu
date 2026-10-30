// Helper bersama untuk fungsi serverless Sakara (tanpa dependensi npm).
const crypto = require('crypto');
const env = (k, d = '') => process.env[k] || d;
const SB_URL = () => env('SUPABASE_URL').replace(/\/$/, '');
const SERVICE = () => env('SUPABASE_SERVICE_ROLE_KEY');
const ANON = () => env('SUPABASE_ANON_KEY');
const IS_PROD = () => env('MIDTRANS_IS_PRODUCTION') === 'true';

const PLANS = { undangan: { name: 'Paket Undangan', price: 129000 }, tamu: { name: 'Paket Undangan + Tamu', price: 349000 } };
const UPGRADE_PRICE = 220000;
const VOUCHERS = { SAKARA10: { type: 'pct', v: 10 }, NIKAHHEMAT: { type: 'amt', v: 25000 } };

async function sb(path, { method = 'GET', body, headers = {}, key = SERVICE(), token } = {}) {
  const r = await fetch(`${SB_URL()}${path}`, {
    method,
    headers: { apikey: key, ...((token || !key.startsWith('sb_')) ? { Authorization: `Bearer ${token || key}` } : {}), 'Content-Type': 'application/json', Prefer: 'return=representation', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }
  if (!r.ok) { const err = new Error((json && (json.message || json.msg || json.error_description)) || `Supabase ${r.status}`); err.status = r.status; throw err; }
  return json;
}
async function userFromReq(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  try { return await sb('/auth/v1/user', { key: ANON() || SERVICE(), token }); } catch (e) { return null; }
}
// Daftar paket dari panel admin (app_config.prices.packages). Jatuh ke paket bawaan bila belum diatur.
async function loadPackages() {
  const ok = n => Number.isInteger(n) && n >= 1000 && n <= 50000000;
  let v = {};
  try { const rows = await sb('/rest/v1/app_config?key=eq.prices&select=value'); v = (rows && rows[0] && rows[0].value) || {}; } catch (e) {}
  const out = {};
  if (Array.isArray(v.packages) && v.packages.length) {
    v.packages.forEach(p => { if (p && /^[a-z0-9][a-z0-9-]{1,29}$/.test(p.id) && p.id !== 'coba' && ok(Math.round(+p.price))) out[p.id] = { name: String(p.name || p.id).slice(0, 60), price: Math.round(+p.price), hidden: !!p.hidden }; });
  } else {
    out.undangan = { name: PLANS.undangan.name.replace(/^Paket /, ''), price: ok(v.undangan) ? v.undangan : PLANS.undangan.price };
    out.tamu = { name: PLANS.tamu.name.replace(/^Paket /, ''), price: ok(v.tamu) ? v.tamu : PLANS.tamu.price };
  }
  return out;
}
// Hitung harga. Sudah tayang = upgrade: bayar selisih ke paket yang lebih mahal.
function priceFor(inv, plan, voucher, pk) {
  pk = pk || { undangan: { name: 'Undangan', price: PLANS.undangan.price }, tamu: { name: 'Undangan + Tamu', price: PLANS.tamu.price } };
  const target = pk[plan];
  if (!target) throw Object.assign(new Error('Paket tidak dikenal'), { status: 400 });
  let price = target.price, item = 'Paket ' + target.name, upgrade = false;
  if (inv.published) {
    const cur = pk[inv.plan]; const cp = cur ? cur.price : (inv.plan === 'coba' ? 0 : null);
    if (cp === null) throw Object.assign(new Error('Paketmu saat ini tidak bisa di-upgrade otomatis. Hubungi kami.'), { status: 400 });
    if (target.price <= cp) throw Object.assign(new Error('Pilih paket yang lebih lengkap dari paketmu sekarang'), { status: 400 });
    price = target.price - cp; item = 'Upgrade ke ' + target.name; upgrade = true;
  } else if (target.hidden) throw Object.assign(new Error('Paket ini sedang tidak tersedia'), { status: 400 });
  const v = VOUCHERS[String(voucher || '').toUpperCase()];
  let discount = 0;
  if (v) discount = v.type === 'pct' ? Math.round(price * v.v / 100) : v.v;
  discount = Math.min(discount, price - 1000);
  return { item, price, discount, voucher: v ? String(voucher).toUpperCase() : '', total: price - discount, upgrade, plan };
}
const sha512 = s => crypto.createHash('sha512').update(s).digest('hex');
const send = (res, status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise(resolve => { let d = ''; req.on('data', c => d += c); req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } }); });
}
module.exports = { env, SB_URL, SERVICE, ANON, IS_PROD, sb, userFromReq, priceFor, loadPackages, sha512, send, readBody, PLANS, UPGRADE_PRICE };
