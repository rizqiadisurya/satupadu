/* Konfigurasi kanvas tema Photobox Archives */
(function () {
  const RED = "#8e1c22", INK = "#2a1a17", WHITE = "#fbf8f3";
  const uid = () => Math.random().toString(36).slice(2, 9);
  const T = (text, x, y, w, o = {}) => ({ id: uid(), type: "text", text, x, y, w, h: 40, r: 0, opacity: 1, font: "mono", size: 14, color: INK, align: "center", ls: 0, lh: 1.5, weight: 400, italic: false, upper: false, ...o });
  const B = (bind, x, y, w, o = {}) => T("", x, y, w, { bind, ...o });
  const A = (key, x, y, w, h, o = {}) => ({ id: uid(), type: "img", key, x, y, w, h, r: 0, opacity: 1, locked: true, ...o });
  const BOX = (x, y, w, h, o = {}) => ({ id: uid(), type: "box", fill: "card", x, y, w, h, r: 0, opacity: 1, rad: 0, locked: true, ...o });
  const P = (x, y, w, h, o = {}) => ({ id: uid(), type: "photo", x, y, w, h, r: 0, opacity: 1, src: null, shape: "polaroid", frame: false, label: "Foto", ...o });

  function profile(top, who, side) {
    const k = who === "groom" ? "p" : "w", left = side === "l";
    return [
      BOX(28, top, 334, 600),
      T(who === "groom" ? "Introducing the" : "And here’s the", 50, top + 28, 290, { font: "serif", size: 26, color: RED, align: "left", lh: 1.1 }),
      T(who === "groom" ? "Groom!" : "Bride!", 50, top + 60, 290, { font: "serif", size: 30, color: RED, align: "left", weight: 700, lh: 1.1 }),
      T("NAME", 50, top + 124, 70, { size: 9, align: "right", ls: .1 }), B(`{${k}.full}`, 132, top + 118, 208, { size: 12, weight: 700, upper: true, align: "left", ls: .06, lh: 1.35 }),
      T("KNOWN FOR", 50, top + 168, 70, { size: 9, align: "right", ls: .1 }), B(`{${k}.known}`, 132, top + 162, 208, { size: 12, weight: 700, upper: true, align: "left", ls: .06, lh: 1.35 }),
      T("DAD", 50, top + 212, 70, { size: 9, align: "right", ls: .1 }), B(`{${k}.father}`, 132, top + 206, 208, { size: 12, weight: 700, upper: true, align: "left", ls: .06, lh: 1.35 }),
      T("MOM", 50, top + 246, 70, { size: 9, align: "right", ls: .1 }), B(`{${k}.mother}`, 132, top + 240, 208, { size: 12, weight: 700, upper: true, align: "left", ls: .06, lh: 1.35 }),
      P(left ? 22 : 212, top + 300, 160, 192, { bind: who, r: left ? -4 : 4, label: who === "groom" ? "Foto mempelai pria" : "Foto mempelai wanita" }),
      A(left ? "tape-2" : "tape-1", left ? 10 : 252, top + 288, 110, left ? 61 : 23, { r: left ? -24 : 22 }),
      B(`{${k}.bio}`, left ? 196 : 86, top + 310, left ? 112 : 116, { size: 11.5, align: "left", lh: 1.45 }),
      B(`{${k}.nick}`, left ? 238 : -48, top + 400, 200, { font: "serif", size: 40, color: RED, r: left ? 90 : -90, upper: true, ls: .04 })
    ];
  }

  function start() {
    const t1 = 420, t2 = t1 + 1460, t3 = t2 + 180;
    const canvas = [
      { id: uid(), type: "canvas", bg: "wine", h: 420, name: "Ayat" },
      { id: uid(), type: "canvas", bg: "wine", h: 1460, name: "Mempelai" },
      { id: uid(), type: "canvas", bg: "paper", h: 180, name: "Save the Date" },
      { id: uid(), type: "canvas", bg: "wine", h: 560, name: "Penutup" }
    ];
    const els = [
      B("{quote.text}", 34, 40, 322, { size: 13, color: WHITE, lh: 1.6 }),
      B("{quote.source}", 45, 236, 300, { size: 13, color: WHITE }),
      A("sparkle", 300, 300, 50, 48, { r: 14 }),

      T("Meet the Leads", 20, t1 + 40, 350, { font: "serif", size: 42, color: WHITE, lh: 1.1 }),
      ...profile(t1 + 130, "groom", "l"),
      ...profile(t1 + 790, "bride", "r"),

      T("Save the Date", 0, t2 + 50, 390, { font: "brush", size: 64, color: RED, lh: 1 }),

      T("See you there!", 20, t3 + 50, 350, { font: "brush", size: 54, color: WHITE, lh: 1 }),
      B("{p.nick} & {w.nick}", 20, t3 + 150, 350, { font: "serif", size: 32, color: WHITE, lh: 1.1 }),
      B("{date.full}", 45, t3 + 200, 300, { size: 14, color: WHITE, ls: .3 }),
      B("{closing}", 40, t3 + 260, 310, { size: 13, color: WHITE, lh: 1.55 }),
      A("underline-doodle", 105, t3 + 420, 180, 57, { opacity: .9 }),
      A("sparkle", 46, t3 + 60, 44, 42, { r: -10 }),
      A("heart-doodle", 260, t3 + 470, 70, 32)
    ];
    const doc = window.KV.split(canvas, els);
    const F = k => ({ id: uid(), type: "feature", key: k, name: KV_THEME.features[k].label, els: [] });
    const [c1, c2, c3, c4] = doc.sections;
    doc.sections = [F("music"), c1, F("story"), c2, c3, F("calendar"), F("dresscode"), F("gift"), F("rsvp"), F("gallery"), F("film"), c4];
    return doc;
  }

  window.KV_THEME = {
    dir: "photobox", name: "Photobox Archives", design: "Photobox Archives",
    assetDir: "assets/",
    fontsHref: "https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Yellowtail&family=Caveat:wght@500&family=DM+Serif+Display&family=Inter:wght@400;500;600&display=swap",
    fonts: { brush: "Yellowtail, cursive", serif: "'DM Serif Display', Georgia, serif", mono: "'Courier Prime', 'Courier New', monospace", hand: "Caveat, cursive", sans: "Inter, system-ui, sans-serif" },
    viewFonts: { brush: "var(--brush)", serif: "var(--serif)", mono: "var(--mono)", hand: "var(--hand)", sans: "Inter, system-ui, sans-serif" },
    fontNames: { brush: "Yellowtail", serif: "DM Serif Display", mono: "Courier Prime", hand: "Caveat", sans: "Inter" },
    swatches: ["#fbf8f3", "#efe9df", "#2a1a17", "#8e1c22", "#4a0b11", "#5c1219", "#c9a27a", "#9aa88a", "#101b33", "#0f2a1c", "#000000", "#ffffff"],
    button: { bg: "#8e1c22", color: "#fbf8f3", font: "mono" },
    thumbBg: "#4a0b11 url(assets/paper-wine.webp) center/400px",
    textDefault: { font: "mono", color: "#fbf8f3" },
    textPresets: [["Judul kuas", { font: "brush", size: 56, color: "#fbf8f3", lh: 1 }, "Judul baru"], ["Judul serif", { font: "serif", size: 34, color: "#fbf8f3", lh: 1.1 }, "Judul Baru"], ["Tulisan mesin ketik", { font: "mono", size: 14, color: "#fbf8f3", lh: 1.5 }, "Tulis paragraf di sini."], ["Tulisan tangan", { font: "hand", size: 26, color: "#fbf8f3", lh: 1.2 }, "catatan kecil"]],
    assets: {
      earphones: { name: "Earphone", src: "earphones.webp", w: 160, h: 178 },
      vinyl: { name: "Piringan hitam", src: "vinyl.webp", w: 150, h: 150 },
      "tape-1": { name: "Selotip 1", src: "tape-1.webp", w: 110, h: 23, flat: 1 },
      "tape-2": { name: "Selotip 2", src: "tape-2.webp", w: 110, h: 61, flat: 1 },
      paperclip: { name: "Penjepit kertas", src: "paperclip.webp", w: 30, h: 118 },
      "frame-doodle": { name: "Bingkai coretan", src: "frame-doodle.webp", w: 300, h: 308, flat: 1 },
      "heart-doodle": { name: "Hati coretan", src: "heart-doodle.webp", w: 70, h: 32, flat: 1 },
      "circle-doodle": { name: "Lingkaran coretan", src: "circle-doodle.webp", w: 90, h: 86, flat: 1 },
      "oval-doodle": { name: "Oval coretan", src: "oval-doodle.webp", w: 180, h: 97, flat: 1 },
      "underline-doodle": { name: "Garis bawah", src: "underline-doodle.webp", w: 180, h: 57, flat: 1 },
      scribble: { name: "Coretan", src: "scribble.webp", w: 100, h: 65, flat: 1 },
      sparkle: { name: "Kilau", src: "sparkle.webp", w: 50, h: 48, flat: 1 },
      "paint-swatch": { name: "Sapuan cat", src: "paint-swatch.webp", w: 200, h: 93, flat: 1 }
    },
    ornaments: {},
    fills: {
      card: { label: "Kertas krem", css: "url(assets/paper-cream.webp) center/400px #f6f1e8", shadow: "0 10px 28px rgba(0,0,0,.35)" },
      white: { label: "Putih", css: "#fbf8f3", shadow: "0 8px 18px rgba(0,0,0,.28)" },
      wine: { label: "Marun", css: "url(assets/paper-wine.webp) center/400px #4a0b11", shadow: "0 10px 28px rgba(0,0,0,.35)" }
    },
    bgs: {
      wine: { label: "Kertas marun", cls: "wine", css: "url(assets/paper-wine.webp) 0 0/600px repeat #4a0b11" },
      paper: { label: "Kertas krem", cls: "paper", css: "url(assets/paper-cream.webp) 0 0/600px repeat #efe9df" },
      ink: { label: "Hitam", cls: "", css: "#1b1210" }
    },
    features: {
      music: { label: "Pemutar lagu", desc: "Kartu “Our Song” dengan piringan hitam", sel: [".player-wrap"], wrap: "wine", pad: "90px 26px 20px", bg: "wine", h: 420 },
      story: { label: "Cerita", desc: "Polaroid dan cerita kalian", sel: ["section.story"], bg: "paper", h: 640 },
      calendar: { label: "Kalender & lokasi", desc: "Kalender bulan pernikahan, jam, dan tombol lokasi", sel: [".cal"], wrap: "paper", pad: "10px 26px 60px", bg: "paper", h: 560 },
      dresscode: { label: "Dress code", desc: "Warna & keterangan busana", sel: ["section.dress"], bg: "wine", h: 300 },
      gift: { label: "Wedding gift", desc: "Rekening, alamat kirim kado", sel: ["section.gift"], bg: "paper", h: 640 },
      rsvp: { label: "RSVP", desc: "Form kehadiran dan dinding ucapan", sel: ["section.rsvp"], bg: "wine", h: 600 },
      gallery: { label: "Galeri polaroid", desc: "Empat foto polaroid", sel: ['[data-section="gallery"]'], bg: "paper", h: 560 },
      film: { label: "Strip film", desc: "Empat foto dalam rol film", sel: [".filmstrip"], wrap: "wine", pad: "40px 26px 10px", bg: "wine", h: 420 }
    },
    photoSlots: [["groom", "Mempelai pria"], ["bride", "Mempelai wanita"]],
    start
  };
})();
