/* Konfigurasi kanvas tema Coretan Merah */
(function () {
  const RED = "#8c1c13", INK = "#2b1d1a";
  const uid = () => Math.random().toString(36).slice(2, 9);
  const T = (text, x, y, w, o = {}) => ({ id: uid(), type: "text", text, x, y, w, h: 40, r: 0, opacity: 1, font: "hand", size: 18, color: INK, align: "center", ls: 0, lh: 1.35, weight: 400, italic: false, upper: false, ...o });
  const B = (bind, x, y, w, o = {}) => T("", x, y, w, { bind, ...o });
  const A = (key, x, y, w, h, o = {}) => ({ id: uid(), type: "img", key, x, y, w, h, r: 0, opacity: 1, locked: true, ...o });
  const P = (x, y, w, h, o = {}) => ({ id: uid(), type: "photo", x, y, w, h, r: 0, opacity: 1, src: null, shape: "oval", frame: false, label: "Foto", ...o });
  const BTN = (x, y, w, h, o = {}) => ({ id: uid(), type: "btn", x, y, w, h, r: 0, opacity: 1, label: "Lihat Lokasi", href: "maps", icon: "", ...o });
  const name = { font: "name", color: RED, ls: .06 };

  function start() {
    const t1 = 760, t2 = t1 + 1080, t3 = t2 + 780;
    const canvas = [
      { id: uid(), type: "canvas", bg: "paper", h: 760, name: "Sampul" },
      { id: uid(), type: "canvas", bg: "paper", h: 1080, name: "Mempelai" },
      { id: uid(), type: "canvas", bg: "paper", h: 780, name: "Acara" },
      { id: uid(), type: "canvas", bg: "paper", h: 520, name: "Penutup" }
    ];
    const els = [
      T("Save\nthe\ndate!", 45, 40, 300, { font: "marker", size: 62, color: RED, lh: .95, upper: true, ls: .02 }),
      A("hands", 0, 250, 390, 181),
      B("{p.nick} + {w.nick}", 20, 420, 350, { ...name, size: 32 }),
      B("{quote.text}", 32, 490, 326, { size: 16.5, lh: 1.4 }),
      B("{quote.source}", 45, 660, 300, { size: 16 }),
      A("heart", 300, 120, 44, 44, { r: 12 }),
      A("sparkles", 40, 140, 48, 57),

      B("{opening.salam}", 30, t1 + 40, 330, { size: 17 }),
      B("{opening.text}", 30, t1 + 100, 330, { size: 17, lh: 1.4 }),
      T("Bride & Groom", 45, t1 + 210, 300, { ...name, size: 36, ls: .08 }),
      P(92.4, t1 + 300.5, 205.2, 166, { bind: "couple", label: "Foto berdua" }),
      A("frame-oval", 60, t1 + 260, 270, 225),
      B("{w.full}", 20, t1 + 510, 350, { ...name, size: 32 }),
      B("{w.parents}", 45, t1 + 560, 300, { size: 17, lh: 1.35 }),
      T("&", 145, t1 + 650, 100, { ...name, size: 38 }),
      B("{p.full}", 20, t1 + 720, 350, { ...name, size: 32 }),
      B("{p.parents}", 45, t1 + 770, 300, { size: 17, lh: 1.35 }),
      A("ring", 300, t1 + 900, 52, 81, { r: 10 }),
      A("bow", 40, t1 + 930, 72, 68, { r: -8 }),

      A("candles", 168, t2 + 30, 54, 84),
      T("Akad", 95, t2 + 124, 200, { ...name, size: 32 }),
      B("{date.long}\n{akad.time}", 45, t2 + 172, 300, { size: 17 }),
      B("{akad.place}", 45, t2 + 226, 300, { size: 18, weight: 700 }),
      B("{akad.addr}", 55, t2 + 254, 280, { size: 16 }),
      A("heels", 160, t2 + 360, 70, 61),
      T("Resepsi", 95, t2 + 430, 200, { ...name, size: 32 }),
      B("{date.long}\n{resepsi.time}", 45, t2 + 478, 300, { size: 17 }),
      B("{resepsi.place}", 45, t2 + 532, 300, { size: 18, weight: 700 }),
      B("{resepsi.addr}", 55, t2 + 560, 280, { size: 16 }),
      BTN(115, t2 + 660, 160, 42),

      A("cheers", 158, t3 + 30, 74, 78, { r: 10 }),
      B("{closing}", 35, t3 + 140, 320, { size: 18, lh: 1.4 }),
      B("{p.nick} + {w.nick}", 20, t3 + 300, 350, { ...name, size: 30 }),
      A("underline", 95, t3 + 340, 200, 87, { opacity: .9 }),
      B("{hashtag}", 45, t3 + 450, 300, { size: 15, color: "#9a8a82" })
    ];
    const doc = window.KV.split(canvas, els);
    const F = k => ({ id: uid(), type: "feature", key: k, name: KV_THEME.features[k].label, els: [] });
    const [c1, c2, c3, c4] = doc.sections;
    doc.sections = [c1, F("music"), c2, F("savedate"), c3, F("dresscode"), F("rsvp"), F("gift"), F("story"), F("countdown"), F("gallery"), c4];
    return doc;
  }

  window.KV_THEME = {
    dir: "coretan", name: "Coretan Merah", design: "Coretan Merah",
    assetDir: "assets/",
    fontsHref: "https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Gochi+Hand&family=Permanent+Marker&family=Inter:wght@400;500;600&display=swap",
    fonts: { marker: "'Permanent Marker', cursive", name: "'Gochi Hand', cursive", hand: "Gaegu, 'Comic Sans MS', cursive", sans: "Inter, system-ui, sans-serif" },
    viewFonts: { marker: "var(--marker)", name: "var(--name)", hand: "var(--hand)", sans: "Inter, system-ui, sans-serif" },
    fontNames: { marker: "Permanent Marker", name: "Gochi Hand", hand: "Gaegu", sans: "Inter" },
    swatches: ["#8c1c13", "#a3281d", "#2b1d1a", "#5b4a44", "#9a8a82", "#fffdfb", "#f6f2ee", "#e8b4a8", "#1f3a6b", "#285238", "#d9a24a", "#000000"],
    button: { bg: "#8c1c13", color: "#fffdfb", font: "name" },
    thumbBg: "#f6f2ee url(assets/paper.webp) center/400px",
    textDefault: { font: "hand", color: "#2b1d1a" },
    textPresets: [["Judul coretan", { font: "marker", size: 54, color: RED, upper: true, lh: .95 }, "Judul baru"], ["Nama & judul", { font: "name", size: 34, color: RED, ls: .06 }, "Judul baru"], ["Paragraf biasa", { font: "hand", size: 18, lh: 1.4, color: INK }, "Tulis paragraf di sini."]],
    assets: {
      hands: { name: "Tangan bergandengan", src: "hands.webp", w: 390, h: 181, flat: 1 },
      "frame-oval": { name: "Bingkai pita", src: "frame-oval.webp", w: 270, h: 225, flat: 1 },
      disco: { name: "Bola disko", src: "disco.webp", w: 94, h: 142, flat: 1, sway: 1 },
      candles: { name: "Lilin", src: "candles.webp", w: 54, h: 84, flat: 1 },
      heels: { name: "Sepatu", src: "heels.webp", w: 70, h: 61, flat: 1 },
      cake: { name: "Kue", src: "cake.webp", w: 103, h: 90, flat: 1 },
      cheers: { name: "Bersulang", src: "cheers.webp", w: 74, h: 78, flat: 1 },
      ring: { name: "Cincin", src: "ring.webp", w: 52, h: 81, flat: 1 },
      bow: { name: "Pita", src: "bow.webp", w: 72, h: 68, flat: 1 },
      heart: { name: "Hati", src: "heart.webp", w: 44, h: 44, flat: 1 },
      sparkles: { name: "Kilau", src: "sparkles.webp", w: 48, h: 57, flat: 1 },
      circle: { name: "Lingkaran coretan", src: "circle.webp", w: 120, h: 110, flat: 1 },
      underline: { name: "Garis bawah", src: "underline.webp", w: 200, h: 87, flat: 1 },
      "frame-ticket": { name: "Bingkai tiket", src: "frame-ticket.webp", w: 300, h: 178, flat: 1 },
      couple: { name: "Ilustrasi pasangan", src: "couple.webp", w: 160, h: 240, flat: 1 }
    },
    ornaments: {},
    bgs: {
      paper: { label: "Kertas", cls: "", css: "url(assets/paper.webp) 0 0/600px repeat #f6f2ee", view: "transparent" },
      white: { label: "Putih", cls: "", css: "#fffdfb" },
      blush: { label: "Merah muda", cls: "", css: "#f3e1dc" },
      red: { label: "Merah tua", cls: "", css: "#8c1c13" }
    },
    features: {
      music: { label: "Pemutar lagu", desc: "Kartu lagu dengan foto kalian", sel: [".player", ".player + .hint"], pad: "10px 26px 34px", bg: "paper", h: 190 },
      savedate: { label: "Save the date", desc: "Bola disko dan tiga hari di sekitar hari H", sel: ['[data-section="date"] > [data-show="sections.date"]'], pad: "40px 26px 10px", bg: "paper", h: 330 },
      dresscode: { label: "Dress code", desc: "Warna & keterangan busana", sel: [".dress"], pad: "10px 26px 40px", bg: "paper", h: 200 },
      rsvp: { label: "Ucapan & kehadiran", desc: "Form kehadiran dan dinding ucapan", sel: ["section.rsvp"], bg: "paper", h: 640 },
      gift: { label: "Wedding gift", desc: "Rekening, alamat kirim kado", sel: ["section.gift"], bg: "paper", h: 560 },
      story: { label: "Cerita", desc: "Perjalanan cinta kalian", sel: ["section.story"], bg: "paper", h: 420 },
      countdown: { label: "Hitung mundur", desc: "Hari, jam, menit menuju hari H", sel: ['section.end > [data-show="sections.countdown"]'], pad: "40px 26px 10px", bg: "paper", h: 220 },
      gallery: { label: "Strip foto", desc: "Tiga foto photobooth", sel: [".strip-wrap"], pad: "10px 26px 30px", bg: "paper", h: 560 }
    },
    photoSlots: [["couple", "Berdua"], ["bride", "Mempelai wanita"], ["groom", "Mempelai pria"]],
    start
  };
})();
