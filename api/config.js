// Konfigurasi publik untuk frontend. Hanya kunci yang memang aman dibuka (anon key & client key).
const { env, send, IS_PROD } = require('./_lib');
module.exports = (req, res) => {
  send(res, 200, {
    supabaseUrl: env('SUPABASE_URL'),
    supabaseAnonKey: env('SUPABASE_ANON_KEY'),
    midtransClientKey: env('MIDTRANS_CLIENT_KEY'),
    midtransProduction: IS_PROD(),
    googleLogin: env('GOOGLE_LOGIN') === 'true',
  });
};
