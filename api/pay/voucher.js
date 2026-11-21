// Cek kode voucher di server, supaya daftar kode tidak tertulis di kode halaman.
const { VOUCHERS, send } = require('../_lib');

module.exports = async (req, res) => {
  const code = String((req.query && req.query.code) || '').trim().toUpperCase().slice(0, 32);
  const v = VOUCHERS[code];
  res.setHeader('Cache-Control', 'no-store');
  if (!v) return send(res, 404, { error: 'Kode tidak berlaku' });
  const label = v.type === 'pct' ? `Diskon ${v.v}%` : `Potongan Rp${Number(v.v).toLocaleString('id-ID')}`;
  return send(res, 200, { code, type: v.type, v: v.v, label });
};
