/* Konfigurasi kanvas tema Drapery Emerald (desain awal = "Tirai Zamrud") */
(function () {
  const CREAM = "#f5eee3", GOLD = "#d9b98a", INK = "#2b1410", WINE = "#5b0f16";
  const uid = () => Math.random().toString(36).slice(2, 9);
  const T = (text, x, y, w, o = {}) => ({ id: uid(), type: "text", text, x, y, w, h: 40, r: 0, opacity: 1, font: "serif", size: 18, color: CREAM, align: "center", ls: 0, lh: 1.3, weight: 400, italic: false, upper: false, ...o });
  const B = (bind, x, y, w, o = {}) => T("", x, y, w, { bind, ...o });
  const A = (key, x, y, w, h, o = {}) => ({ id: uid(), type: "img", key, x, y, w, h, r: 0, opacity: 1, locked: true, ...o });
  const S = (key, x, y, w, h, o = {}) => ({ id: uid(), type: "svg", key, x, y, w, h, r: 0, opacity: 1, locked: true, ...o });
  const P = (x, y, w, h, o = {}) => ({ id: uid(), type: "photo", x, y, w, h, r: 0, opacity: 1, src: null, shape: "arch", frame: true, label: "Foto", ...o });
  const BTN = (x, y, w, h, o = {}) => ({ id: uid(), type: "btn", x, y, w, h, r: 0, opacity: 1, label: "Petunjuk Lokasi", href: "maps", icon: "pin", ...o });

  function start() {
    const caps = { font: "caps", upper: true, ls: .3, size: 12, color: GOLD }, det = { size: 15.5, color: INK, lh: 1.45 };
    const t1 = 844, t2 = t1 + 1270, t3 = t2 + 1000, m = 70;
    const canvas = [
      { id: uid(), type: "canvas", bg: "velvet", h: 844, name: "Sampul" },
      { id: uid(), type: "canvas", bg: "suede", h: 1270, name: "Mempelai" },
      { id: uid(), type: "canvas", bg: "moss", h: 1000, name: "Acara" },
      { id: uid(), type: "canvas", bg: "velvet", h: 844, name: "Penutup" }
    ];
    const els = [
      A("flora-1", -34, 70, 140, 204), A("valance", -10, -8, 410, 156),
      T("The Wedding of", 45, 178, 300, caps),
      B("{p.nick} & {w.nick}", 5, 200, 380, { font: "script", size: 58, lh: 1.1 }),
      B("{date.dots}", 45, 292, 300, { font: "caps", size: 15, ls: .3, color: CREAM }),
      A("butterfly", 296, 340, 56, 42, { r: 16 }),
      A("envBack", 30, 440, 330, 322), A("doily-cream", 82, 368, 226, 275, { r: -4 }),
      T("save the date", 125, 440, 140, { font: "caps", upper: true, ls: .22, size: 9.5, color: "#7a5a48", r: -4 }),
      B("{date.dots}", 125, 458, 140, { size: 24, color: INK, weight: 500, r: -4 }),
      B("{date.day}", 125, 492, 140, { size: 15, color: "#6b4a3a", italic: true, r: -4 }),
      A("envFront", 30, 440, 330, 322), A("wax-seal", 166, 608, 58, 58),
      A("flora-2", 255, 575, 150, 193),

      A("flora-3", 298, t1 - 14, 96, 205),
      B("{quote.text}", 40, t1 + 60, 310, { italic: true, size: 15.5, lh: 1.5 }),
      B("{quote.source}", 45, t1 + 238, 300, caps),
      B("{opening.text}", 40, t1 + 280, 310, { size: 16, lh: 1.45 }),
      P(110, t1 + 350 + m, 170, 226, { bind: "bride", label: "Foto mempelai wanita" }),
      B("{w.full}", 20, t1 + 590 + m, 350, { font: "script", size: 40, lh: 1.1 }),
      B("{w.parents}", 45, t1 + 645 + m, 300, { size: 15, lh: 1.4 }),
      T("&", 145, t1 + 730 + m, 100, { font: "script", size: 52, color: GOLD }),
      A("calla-lily", -24, t1 + 735 + m, 140, 89, { r: -8 }),
      P(110, t1 + 810 + m, 170, 226, { bind: "groom", label: "Foto mempelai pria" }),
      B("{p.full}", 20, t1 + 1050 + m, 350, { font: "script", size: 40, lh: 1.1 }),
      B("{p.parents}", 45, t1 + 1105 + m, 300, { size: 15, lh: 1.4 }),

      A("tassel-wine", 44, t2 - 12, 40, 118), A("tassel-green", 316, t2 - 12, 40, 88),
      A("doily-cream", 12, t2 + 50, 366, 446),
      T("Akad Nikah", 85, t2 + 132, 220, { font: "caps", upper: true, ls: .25, size: 13, color: WINE }),
      B("{date.long}", 85, t2 + 156, 220, { italic: true, size: 16, color: "#6b4a3a" }),
      B("{akad.time}\n{akad.place}\n{akad.addr}", 90, t2 + 184, 210, { ...det, size: 14.5 }),
      S("divider", 135, t2 + 290, 120, 12),
      T("Resepsi", 85, t2 + 312, 220, { font: "caps", upper: true, ls: .25, size: 13, color: WINE }),
      B("{resepsi.time}\n{resepsi.place}\n{resepsi.addr}", 90, t2 + 338, 210, { ...det, size: 14.5 }),
      BTN(105, t2 + 510, 180, 42),
      A("venue", 45, t2 + 575, 300, 270, { opacity: .9 }),
      A("flora-4", -30, t2 + 800, 140, 201),

      A("flora-1", 280, t3 + 70, 130, 190), A("valance", -10, t3 - 8, 410, 156),
      A("butterfly", 58, t3 + 250, 54, 40, { r: -18 }),
      A("envBack", 30, t3 + 436, 330, 322), A("doily-wine", 85, t3 + 296, 220, 293, { r: -4 }),
      T("Terima\nKasih", 120, t3 + 362, 150, { font: "script", size: 36, lh: 1, color: CREAM, r: -4 }),
      T("Doa restu dan kehadiran Anda adalah hadiah terindah bagi kami.", 126, t3 + 440, 138, { size: 12.5, lh: 1.4, color: "#f2dcdc", r: -4 }),
      A("envFront", 30, t3 + 436, 330, 322), A("wax-seal", 166, t3 + 604, 58, 58),
      B("{closing}", 40, t3 + 768, 310, { italic: true, size: 15, lh: 1.5 })
    ];
    const doc = window.KV.split(canvas, els);
    const F = k => ({ id: uid(), type: "feature", key: k, name: KV_THEME.features[k].label, els: [] });
    const [c1, c2, c3, c4] = doc.sections;
    doc.sections = [c1, F("music"), c2, c3, F("countdown"), F("dresscode"), F("gift"), F("rsvp"), F("story"), F("gallery"), c4];
    return doc;
  }

  window.KV_THEME = {
    dir: "drapery", name: "Drapery Emerald", design: "Tirai Zamrud",
    assetDir: "assets/",
    fontsHref: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Marcellus&family=Inter:wght@400;500;600&family=Pinyon+Script&display=swap",
    fonts: { script: "'Pinyon Script', cursive", serif: "'Cormorant Garamond', Georgia, serif", caps: "Marcellus, Georgia, serif", sans: "Inter, system-ui, sans-serif" },
    viewFonts: { script: "var(--script)", serif: "var(--serif)", caps: "var(--caps)", sans: "Inter, system-ui, sans-serif" },
    fontNames: { script: "Pinyon Script", serif: "Cormorant Garamond", caps: "Marcellus", sans: "Inter" },
    swatches: ["#f5eee3", "#ffffff", "#d9b98a", "#e7b9c6", "#ad9a8b", "#7a1f27", "#5b0f16", "#3a080d", "#4a6a45", "#30492f", "#2b1410", "#6b4a3a"],
    button: { bg: "#f5eee3", color: "#3a080d", font: "sans" },
    thumbBg: "#1d2f1e url(assets/velvet.webp) center/cover",
    assets: {
      valance: { name: "Valance tirai", src: "valance.webp", w: 410, h: 156 },
      "flora-1": { name: "Rangkaian bunga 1", src: "flora-1.webp", w: 140, h: 204, sway: 1 },
      "flora-2": { name: "Rangkaian bunga 2", src: "flora-2.webp", w: 150, h: 193, sway: 1 },
      "flora-3": { name: "Rangkaian bunga 3", src: "flora-3.webp", w: 96, h: 205, sway: 1 },
      "flora-4": { name: "Rangkaian bunga 4", src: "flora-4.webp", w: 140, h: 201, sway: 1 },
      envBack: { name: "Amplop (belakang)", src: "envelope-back.webp", w: 330, h: 322 },
      envFront: { name: "Amplop (depan)", src: "envelope-front.webp", w: 330, h: 322 },
      "doily-cream": { name: "Renda krem", src: "doily-cream.webp", w: 220, h: 268 },
      "doily-wine": { name: "Renda marun", src: "doily-wine.webp", w: 220, h: 293 },
      "wax-seal": { name: "Segel lilin", src: "wax-seal.webp", w: 60, h: 60 },
      "tassel-wine": { name: "Rumbai marun", src: "tassel-wine.webp", w: 40, h: 118, sway: 1 },
      "tassel-green": { name: "Rumbai hijau", src: "tassel-green.webp", w: 40, h: 88, sway: 1 },
      butterfly: { name: "Kupu-kupu", src: "butterfly.webp", w: 56, h: 42 },
      "calla-lily": { name: "Bunga lili", src: "calla-lily.webp", w: 140, h: 89 },
      venue: { name: "Sketsa gedung", src: "venue.webp", w: 300, h: 270, flat: 1 },
      giftbox: { name: "Sketsa kado", src: "giftbox.webp", w: 90, h: 88, flat: 1 }
    },
    ornaments: {
      divider: { name: "Pembatas", w: 120, h: 12, svg: '<svg viewBox="0 0 240 24"><g fill="none" stroke="#b89766" stroke-width="1.4"><path d="M8 12H98M142 12H232"/><path d="M120 3l9 9-9 9-9-9z"/></g><circle cx="104" cy="12" r="2.2" fill="#b89766"/><circle cx="136" cy="12" r="2.2" fill="#b89766"/></svg>' }
    },
    /* latar section kanvas: cls = kelas permukaan di halaman tema (ikut palet warna), css = tampilan di editor */
    bgs: {
      velvet: { label: "Tirai beludru", cls: "velvet", css: "url(assets/velvet.webp) center top/cover #0e2a1c" },
      suede: { label: "Suede marun", cls: "suede", css: "url(assets/suede-wine.webp) 0 0/390px repeat #5b0f16" },
      moss: { label: "Plester hijau", cls: "plaster", css: "url(assets/plaster-moss.webp) 0 0/390px repeat #6f7f4f" },
      damask: { label: "Damask marun", cls: "", css: "url(assets/damask.webp) 0 0/260px repeat #5b0f16" },
      cream: { label: "Krem polos", cls: "", css: "radial-gradient(ellipse at 30% 20%,#f8f2e8,#efe6d6 75%)" }
    },
    /* bagian interaktif asli tema yang bisa ditaruh di antara section kanvas */
    features: {
      music: { label: "Pemutar lagu", desc: "Tombol putar lagu kalian", sel: [".damask", ".damask + .suede.center"], bg: "damask", h: 150 },
      countdown: { label: "Hitung mundur", desc: "Hari, jam, menit menuju hari H", sel: ["#countdown"], wrap: "plaster center", pad: "48px 28px", bg: "moss", h: 170 },
      dresscode: { label: "Dress code", desc: "Warna & keterangan busana", sel: ['[data-section="dresscode"]'], wrap: "plaster", pad: "40px 28px", bg: "moss", h: 220 },
      gift: { label: "Wedding gift", desc: "Rekening, alamat kirim kado", sel: ["#gift"], bg: "suede", h: 620 },
      rsvp: { label: "RSVP & ucapan", desc: "Form kehadiran dan dinding ucapan", sel: ["#rsvp"], bg: "suede", h: 640 },
      story: { label: "Cerita", desc: "Perjalanan cinta kalian", sel: ["#story"], bg: "moss", h: 560 },
      gallery: { label: "Galeri", desc: "Foto-foto kalian", sel: ["#gallery"], bg: "suede", h: 600 }
    },
    photoSlots: [["bride", "Mempelai wanita"], ["groom", "Mempelai pria"], ["couple", "Berdua"]],
    start
  };
})();
