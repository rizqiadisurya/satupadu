// Konfigurasi publik untuk frontend. Hanya kunci yang memang aman dibuka (anon key & client key).
const { env, IS_PROD } = require('./_lib');
module.exports = (req, res) => {
  // boleh di-cache di tepi: isinya hanya kunci publik yang jarang berubah
  res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
  res.end(JSON.stringify({
    supabaseUrl: env('SUPABASE_URL'),
    supabaseAnonKey: env('SUPABASE_ANON_KEY'),
    midtransClientKey: env('MIDTRANS_CLIENT_KEY'),
    midtransProduction: IS_PROD(),
    googleLogin: env('GOOGLE_LOGIN') === 'true',
  }));
};
