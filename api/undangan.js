// Halaman undangan tamu (/u/<slug>) dengan pratinjau link milik pasangan.
// Tanpa ini, link undangan yang dibagikan ke WhatsApp akan menampilkan gambar promosi Sakara.
// Isi halamannya tetap index.html yang sama; hanya blok <!--og:start-->…<!--og:end--> yang diganti.
const fs = require('fs');
const path = require('path');
const { env, sb, ANON, SERVICE } = require('./_lib');

let HTML = null;
function page() {
  if (HTML) return HTML;
  for (const p of [path.join(process.cwd(), 'index.html'), path.join(__dirname, '..', 'index.html')]) {
    try { HTML = fs.readFileSync(p, 'utf8'); return HTML; } catch (e) {}
  }
  throw new Error('index.html tidak ditemukan');
}

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function tanggal(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${HARI[d.getUTCDay()]}, ${+m[3]} ${BULAN[+m[2] - 1]} ${m[1]}`;
}
const httpsUrl = u => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : '');

function metaBlock({ title, desc, url, image, imageW, imageH, alt }) {
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="robots" content="noindex">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Undangan Pernikahan">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    imageW ? `<meta property="og:image:width" content="${imageW}">` : '',
    imageH ? `<meta property="og:image:height" content="${imageH}">` : '',
    `<meta property="og:image:alt" content="${esc(alt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].filter(Boolean).join('\n');
}

module.exports = async (req, res) => {
  const site = env('SITE_URL', `https://${req.headers['x-forwarded-host'] || req.headers.host || 'undangansakara.vercel.app'}`).replace(/\/$/, '');
  const q = new URL(req.url, site).searchParams;
  const slug = String(q.get('slug') || '').toLowerCase();
  const code = String(q.get('to') || '').slice(0, 40);
  const fallbackImg = `${site}/assets/og/undangan-og.jpg?v=2`;

  let meta = {
    title: 'Undangan Pernikahan',
    desc: 'Dengan penuh sukacita, kami mengundang Anda untuk hadir di hari bahagia kami.',
    url: `${site}/u/${slug}`,
    image: fallbackImg, imageW: 1200, imageH: 630,
    alt: 'Undangan pernikahan',
  };

  if (/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug) && env('SUPABASE_URL')) {
    try {
      const inv = await sb('/rest/v1/rpc/get_public_invitation', { method: 'POST', body: { p_slug: slug, p_code: code || null }, key: ANON() || SERVICE() });
      if (inv && inv.data) {
        const d = inv.data;
        const n1 = (d.bride && (d.bride.nick || d.bride.name)) || '';
        const n2 = (d.groom && (d.groom.nick || d.groom.name)) || '';
        const pair = [n1, n2].filter(Boolean).join(' & ');
        const ev = (Array.isArray(d.events) ? d.events : []).find(e => e && e.date);
        const tgl = ev ? tanggal(ev.date) : '';
        const guest = inv.guest && inv.guest.name;
        const photo = httpsUrl(d.coverPhoto) || httpsUrl(Array.isArray(d.gallery) && d.gallery.find(httpsUrl)) || httpsUrl(d.bride && d.bride.photo) || httpsUrl(d.groom && d.groom.photo);
        meta = {
          title: pair ? `Undangan Pernikahan ${pair}` : meta.title,
          desc: [guest ? `Kepada Yth. ${guest}.` : '', tgl ? `${tgl}.` : '', 'Dengan penuh sukacita, kami mengundang Anda untuk hadir di hari bahagia kami.'].filter(Boolean).join(' '),
          url: `${site}/u/${slug}${code ? `?to=${encodeURIComponent(code)}` : ''}`,
          image: photo || fallbackImg,
          imageW: photo ? 0 : 1200, imageH: photo ? 0 : 630,
          alt: pair ? `Undangan pernikahan ${pair}` : meta.alt,
        };
      }
    } catch (e) { /* data gagal dimuat: pakai pratinjau umum, halaman tetap jalan */ }
  }

  let html;
  try { html = page(); } catch (e) {
    // Cadangan bila index.html tidak ikut terbawa ke fungsi: ambil versi statisnya dari situs sendiri.
    try { const r = await fetch(`${site}/index.html`); if (!r.ok) throw new Error(String(r.status)); html = HTML = await r.text(); }
    catch (e2) { res.statusCode = 503; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end('<!doctype html><meta charset="utf-8"><p>Undangan sedang dimuat. Coba muat ulang halaman ini sebentar lagi.</p>'); return; }
  }
  const a = html.indexOf('<!--og:start-->'), b = html.indexOf('<!--og:end-->');
  const out = a >= 0 && b > a ? html.slice(0, a) + '<!--og:start-->\n' + metaBlock(meta) + '\n' + html.slice(b) : html;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  res.end(out);
};
