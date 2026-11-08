// Konfigurasi publik untuk frontend. Hanya kunci yang memang aman dibuka (anon key & client key).
const { env, send, IS_PROD } = require('./_lib');
module.exports = (req, res) => {
  send(res, 200, {
    supabaseUrl: env('SUPABASE_URL'),
    supabaseAnonKey: env('SUPABASE_ANON_KEY'),
    midtransClientKey: env('MIDTRANS_CLIENT_KEY'),
    midtransProduction: IS_PROD(),
    googleLogin: env('GOOGLE_LOGIN') === 'true',
    // SEMENTARA (hanya Preview): bentuk kunci server untuk diagnosa, tanpa isi kuncinya.
    ...(process.env.VERCEL_ENV === 'preview' ? { _diag: ['SUPABASE_SERVICE_ROLE_KEY', 'MIDTRANS_SERVER_KEY', 'MIDTRANS_SIGNATURE_KEY'].map(k => { const v = process.env[k] || ''; return { k, len: v.length, head: v.slice(0, v.startsWith('sb_') ? 10 : 9), ws: /\s/.test(v), odd: /[^\x21-\x7e]/.test(v) }; }) } : {}),
  });
};
