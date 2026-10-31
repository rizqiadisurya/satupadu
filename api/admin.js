// API panel admin Sakara. Semua aksi lewat POST { action, ... }.
// Login: username + sandi (hash scrypt di tabel admins). Token ditandatangani HMAC, berlaku 12 jam.
// Bootstrap: selama tabel admins masih kosong, admin/admin diterima SEKALI lalu wajib ganti sandi.
const crypto = require('crypto');
const { sb, send, readBody, SERVICE, ANON, SB_URL } = require('./_lib');

const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const secret = () => crypto.createHash('sha256').update('sakara-admin:' + SERVICE()).digest();
const sign = obj => { const p = b64u(JSON.stringify(obj)); return p + '.' + b64u(crypto.createHmac('sha256', secret()).update(p).digest()); };
function verify(tok) {
  if (!tok || !tok.includes('.')) return null;
  const [p, s] = tok.split('.');
  const want = b64u(crypto.createHmac('sha256', secret()).update(p).digest());
  if (s.length !== want.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want))) return null;
  try { const o = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()); return o.exp > Date.now() ? o : null; } catch (e) { return null; }
}
const hashPass = pw => { const salt = crypto.randomBytes(16); const h = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 }); return `scrypt$${salt.toString('hex')}$${h.toString('hex')}`; };
function checkPass(pw, stored) {
  const [alg, salt, hex] = String(stored || '').split('$'); if (alg !== 'scrypt' || !salt || !hex) return false;
  const h = crypto.scryptSync(pw, Buffer.from(salt, 'hex'), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(hex, 'hex'); return want.length === h.length && crypto.timingSafeEqual(h, want);
}
const ERR = (status, msg) => Object.assign(new Error(msg), { status });
const okUser = u => /^[a-z0-9._-]{3,40}$/.test(u);
const okPass = p => typeof p === 'string' && p.length >= 8 && p.length <= 200 && p.toLowerCase() !== 'admin' && !/^admin\d*$/i.test(p);
const enc = encodeURIComponent;
const tokenFor = a => sign({ aid: a.id, u: a.username, mc: !!a.must_change, exp: Date.now() + 12 * 3600e3 });
const pub = a => ({ id: a.id, username: a.username, email: a.email, must_change: a.must_change, created_at: a.created_at, last_login: a.last_login });
const CONFIG_KEYS = ['themes', 'features', 'prices'];

async function auth(req) {
  const h = req.headers.authorization || '';
  const t = verify(h.startsWith('Bearer ') ? h.slice(7) : '');
  if (!t) throw ERR(401, 'Sesi admin berakhir. Silakan masuk lagi.');
  const rows = await sb(`/rest/v1/admins?id=eq.${t.aid}&select=*`);
  const a = rows && rows[0]; if (!a) throw ERR(401, 'Akun admin tidak ditemukan');
  return a;
}

const actions = {
  async login(b) {
    const username = String(b.username || '').trim().toLowerCase(), password = String(b.password || '');
    let rows = await sb(`/rest/v1/admins?username=eq.${enc(username)}&select=*`);
    let a = rows && rows[0];
    if (!a) {
      const all = await sb('/rest/v1/admins?select=id&limit=1');
      if ((!all || !all.length) && username === 'admin' && password === 'admin') {
        const ins = await sb('/rest/v1/admins', { method: 'POST', body: { username: 'admin', pass_hash: hashPass('admin'), must_change: true } });
        a = ins[0];
      }
    } else if (!checkPass(password, a.pass_hash)) a = null;
    if (!a) { await new Promise(r => setTimeout(r, 600)); throw ERR(401, 'Username atau sandi salah'); }
    await sb(`/rest/v1/admins?id=eq.${a.id}`, { method: 'PATCH', body: { last_login: new Date().toISOString() } });
    return { token: tokenFor(a), admin: pub(a) };
  },
  // Masuk otomatis: pengguna yang login Google dengan email yang sama seperti salah satu admin.
  async sso(b) {
    const tok = String(b.sb_token || ''); if (!tok) throw ERR(401, 'Belum login');
    let user = null; try { user = await sb('/auth/v1/user', { key: ANON() || SERVICE(), token: tok }); } catch (e) {}
    const email = String(user && user.email || '').trim().toLowerCase();
    if (!email || !(user.email_confirmed_at || user.confirmed_at)) throw ERR(403, 'Bukan admin');
    const rows = await sb(`/rest/v1/admins?email=ilike.${enc(email.replace(/[%_*]/g, ''))}&select=*`);
    const a = (rows || []).find(r => String(r.email).trim().toLowerCase() === email);
    if (!a) throw ERR(403, 'Bukan admin');
    await sb(`/rest/v1/admins?id=eq.${a.id}`, { method: 'PATCH', body: { last_login: new Date().toISOString() } });
    return { token: tokenFor(a), admin: pub(a) };
  },
  async me(b, a) { return { admin: pub(a) }; },
  async change_password(b, a) {
    if (!checkPass(String(b.old || ''), a.pass_hash)) throw ERR(400, 'Sandi lama salah');
    if (!okPass(b.new)) throw ERR(400, 'Sandi baru minimal 8 karakter dan tidak boleh "admin"');
    const upd = { pass_hash: hashPass(b.new), must_change: false };
    if (b.username && b.username !== a.username) { const u = String(b.username).trim().toLowerCase(); if (!okUser(u)) throw ERR(400, 'Username 3–40 karakter: huruf kecil, angka, titik, strip'); upd.username = u; }
    if (typeof b.email === 'string') upd.email = b.email.trim().slice(0, 120);
    const rows = await sb(`/rest/v1/admins?id=eq.${a.id}`, { method: 'PATCH', body: upd });
    return { token: tokenFor(rows[0]), admin: pub(rows[0]) };
  },
  async admins_list() { return { admins: (await sb('/rest/v1/admins?select=*&order=id')).map(pub) }; },
  async admin_add(b) {
    const u = String(b.username || '').trim().toLowerCase();
    if (!okUser(u)) throw ERR(400, 'Username 3–40 karakter: huruf kecil, angka, titik, strip');
    if (!okPass(b.password)) throw ERR(400, 'Sandi minimal 8 karakter dan tidak boleh "admin"');
    const ex = await sb(`/rest/v1/admins?username=eq.${enc(u)}&select=id`); if (ex && ex.length) throw ERR(400, `Username "${u}" sudah dipakai`);
    const rows = await sb('/rest/v1/admins', { method: 'POST', body: { username: u, email: String(b.email || '').trim().slice(0, 120), pass_hash: hashPass(b.password), must_change: !!b.must_change } });
    return { admin: pub(rows[0]) };
  },
  async admin_remove(b, a) {
    if (+b.id === a.id) throw ERR(400, 'Tidak bisa menghapus akunmu sendiri');
    const all = await sb('/rest/v1/admins?select=id'); if (all.length <= 1) throw ERR(400, 'Minimal harus ada satu admin');
    await sb(`/rest/v1/admins?id=eq.${+b.id}`, { method: 'DELETE' }); return { ok: true };
  },
  async upload(b) {
    const m = String(b.data || '').match(/^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw ERR(400, 'Format gambar tidak didukung');
    const buf = Buffer.from(m[2], 'base64'); if (buf.length > 3 * 1024 * 1024) throw ERR(400, 'Gambar terlalu besar (maks. 3 MB)');
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    const path = `admin/tema-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const key = SERVICE();
    const r = await fetch(`${SB_URL()}/storage/v1/object/photos/${path}`, { method: 'POST', headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': `image/${m[1]}`, 'Cache-Control': 'public, max-age=31536000', 'x-upsert': 'false' }, body: buf });
    if (!r.ok) { const t = await r.text(); throw ERR(502, 'Gagal menyimpan gambar: ' + t.slice(0, 120)); }
    return { url: `${SB_URL()}/storage/v1/object/public/photos/${path}` };
  },
  async config_get() { const rows = await sb('/rest/v1/app_config?select=*'); const o = {}; rows.forEach(r => o[r.key] = r.value); return { config: o }; },
  async config_set(b, a) {
    if (!CONFIG_KEYS.includes(b.key)) throw ERR(400, 'Kunci konfigurasi tidak dikenal');
    if (!b.value || typeof b.value !== 'object' || JSON.stringify(b.value).length > 200000) throw ERR(400, 'Nilai konfigurasi tidak valid');
    await sb('/rest/v1/app_config', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: { key: b.key, value: b.value, updated_at: new Date().toISOString(), updated_by: a.username } });
    return { ok: true };
  },
  async users(b) {
    const q = String(b.q || '').trim();
    let path = '/rest/v1/admin_users?select=*&order=created_at.desc&limit=500';
    if (q) path += `&or=(email.ilike.*${enc(q)}*,slug.ilike.*${enc(q)}*,bride.ilike.*${enc(q)}*,groom.ilike.*${enc(q)}*,name.ilike.*${enc(q)}*)`;
    return { users: await sb(path) };
  },
  async inv_update(b) {
    const upd = {};
    if (typeof b.published === 'boolean') upd.published = b.published;
    if (/^[a-z0-9][a-z0-9-]{1,29}$/.test(b.plan || '')) upd.plan = b.plan;
    if (!Object.keys(upd).length || !/^[0-9a-f-]{36}$/.test(b.invitation_id || '')) throw ERR(400, 'Perubahan tidak valid');
    const rows = await sb(`/rest/v1/invitations?id=eq.${b.invitation_id}`, { method: 'PATCH', body: upd });
    return { invitation: rows && rows[0] && { id: rows[0].id, plan: rows[0].plan, published: rows[0].published } };
  },
  async user_ban(b) {
    if (!/^[0-9a-f-]{36}$/.test(b.user_id || '')) throw ERR(400, 'Pengguna tidak valid');
    await sb(`/auth/v1/admin/users/${b.user_id}`, { method: 'PUT', body: { ban_duration: b.ban ? '876000h' : 'none' } });
    return { ok: true };
  },
  async finance() {
    const inv = await sb('/rest/v1/invoices?status=eq.paid&select=id,item,plan,price,discount,voucher,total,method,created_at,paid_at,owner,invitation_id&order=paid_at.desc&limit=5000');
    const users = await sb('/rest/v1/admin_users?select=id,email,name,slug,bride,groom');
    const by = {}; users.forEach(u => by[u.id] = u);
    return { invoices: inv.map(i => { const u = by[i.owner] || {}; return { ...i, email: u.email || '', name: u.name || '', slug: u.slug || '', couple: [u.bride, u.groom].filter(Boolean).join(' & ') }; }) };
  },
  async stats() {
    const day = 864e5, now = Date.now();
    const users = await sb('/rest/v1/admin_users?select=id,created_at,published,plan,paid_total,guests,theme');
    const inv = await sb('/rest/v1/invoices?select=id,item,plan,total,discount,voucher,method,status,created_at,paid_at,owner&order=created_at.desc&limit=60');
    let demo = [], feats = [];
    try { demo = await sb('/rest/v1/demo_summary?select=*&limit=14'); feats = await sb('/rest/v1/demo_features?select=*&limit=12'); } catch (e) {}
    const since = d => users.filter(u => now - new Date(u.created_at) < d * day).length;
    const paid = inv.filter(i => i.status === 'paid');
    const themes = {}; users.forEach(u => { if (u.theme) themes[u.theme] = (themes[u.theme] || 0) + 1; });
    const signups = {}; users.forEach(u => { const k = new Date(new Date(u.created_at).getTime() + 7 * 3600e3).toISOString().slice(0, 10); signups[k] = (signups[k] || 0) + 1; });
    const emails = {}; (await sb('/rest/v1/admin_users?select=id,email')).forEach(u => emails[u.id] = u.email);
    return {
      users: users.length, new7: since(7), new30: since(30),
      published: users.filter(u => u.published).length, byPlan: users.reduce((o, u) => { const k = u.plan || 'coba'; o[k] = (o[k] || 0) + 1; return o; }, {}),
      revenue: paid.reduce((s, i) => s + i.total, 0), paidCount: paid.length, guests: users.reduce((s, u) => s + (u.guests || 0), 0),
      themes, signups, invoices: inv.map(i => ({ ...i, email: emails[i.owner] || '' })), demo, demoFeatures: feats,
    };
  },
};
const OPEN = ['login', 'sso'];
const ALLOW_WHEN_MUST_CHANGE = ['me', 'change_password'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Gunakan POST' });
  try {
    const b = await readBody(req);
    const fn = actions[b.action]; if (!fn) throw ERR(400, 'Aksi tidak dikenal');
    let a = null;
    if (!OPEN.includes(b.action)) {
      a = await auth(req);
      if (a.must_change && !ALLOW_WHEN_MUST_CHANGE.includes(b.action)) throw ERR(403, 'Ganti sandi dulu sebelum memakai panel admin');
    }
    send(res, 200, await fn(b, a));
  } catch (e) {
    const msg = /relation .* does not exist|Could not find the table/i.test(e.message || '') ? 'Tabel admin belum dibuat. Jalankan supabase/migration-005-admin.sql di Supabase.' : (e.message || 'Terjadi kesalahan');
    send(res, e.status && e.status < 600 ? e.status : 500, { error: msg });
  }
};
