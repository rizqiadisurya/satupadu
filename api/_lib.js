// Helper bersama untuk fungsi serverless Satu Padu Kita (tanpa dependensi npm).
const crypto = require('crypto');
const env = (k, d = '') => process.env[k] || d;
const SB_URL = () => env('SUPABASE_URL').replace(/\/$/, '');
const SERVICE = () => env('SUPABASE_SERVICE_ROLE_KEY');
const ANON = () => env('SUPABASE_ANON_KEY');
const IS_PROD = () => env('MIDTRANS_IS_PRODUCTION') === 'true';

const PLANS = { undangan: { name: 'Paket Undangan', price: 179000 }, tamu: { name: 'Paket Undangan + Tamu', price: 399000 } };
const UPGRADE_PRICE = 220000;
const VOUCHERS = { SATUPADU10: { type: 'pct', v: 10 }, NIKAHHEMAT: { type: 'amt', v: 25000 } };

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
function priceFor(inv, plan, voucher) {
  const upgrade = inv.published && inv.plan === 'undangan' && plan === 'tamu';
  if (!upgrade && inv.published && inv.plan === 'tamu') throw Object.assign(new Error('Paket sudah paling lengkap'), { status: 400 });
  if (!upgrade && inv.published && inv.plan === 'undangan' && plan === 'undangan') throw Object.assign(new Error('Paket Undangan sudah aktif. Pilih Undangan + Tamu untuk upgrade.'), { status: 400 });
  const item = upgrade ? 'Upgrade ke Undangan + Tamu' : PLANS[plan]?.name;
  const price = upgrade ? UPGRADE_PRICE : PLANS[plan]?.price;
  if (!price) throw Object.assign(new Error('Paket tidak dikenal'), { status: 400 });
  const v = VOUCHERS[String(voucher || '').toUpperCase()];
  let discount = 0;
  if (v) discount = v.type === 'pct' ? Math.round(price * v.v / 100) : v.v;
  discount = Math.min(discount, price - 1000);
  return { item, price, discount, voucher: v ? String(voucher).toUpperCase() : '', total: price - discount, upgrade };
}
const sha512 = s => crypto.createHash('sha512').update(s).digest('hex');
const send = (res, status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise(resolve => { let d = ''; req.on('data', c => d += c); req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } }); });
}
module.exports = { env, SB_URL, SERVICE, ANON, IS_PROD, sb, userFromReq, priceFor, sha512, send, readBody, PLANS };
