/* sakara-bridge.js — menyambungkan tema Custom ke Sakara.
   Data tambahan dari Sakara (semuanya opsional, tema tetap jalan sendiri tanpa ini):
   _order    urutan bagian           _guest   nama tamu
   _wishes   daftar ucapan           _host    true bila dibuka di dalam Sakara
   _lang     "id" | "en"             _palette id palet warna     _font id paduan huruf
   _opening  {salam, text, arabic}   _extras  susunan acara & siaran langsung per acara
   _quota    jatah kursi tamu        _mem     halaman kenangan setelah acara */
(function () {
  const embedded = window.parent !== window;
  const THEME = (location.pathname.match(/custom\/([^/]+)\//) || [])[1] || "";
  const A = THEME ? "" : "";

  /* ---------- palet warna: ganti variabel CSS + tekstur/ilustrasi yang sudah diwarnai ulang ---------- */
  const PALETTES = {
    drapery: {
      navy:  { vars: { "--velvet": "#0e1a2e", "--moss": "#22324d", "--moss-deep": "#141f33", "--moss-soft": "#3a4f72" }, files: ["velvet", "valance", "tassel-green", "plaster-moss"] },
      arang: { vars: { "--velvet": "#151515", "--moss": "#2e2c2a", "--moss-deep": "#1c1b1a", "--moss-soft": "#4a4744" }, files: ["velvet", "valance", "tassel-green", "plaster-moss"] }
    },
    photobox: {
      navy:  { vars: { "--wine": "#101b33", "--wine-2": "#17254a", "--red": "#2a3f73" }, files: ["paper-wine", "heart-doodle", "circle-doodle"] },
      hutan: { vars: { "--wine": "#0f2a1c", "--wine-2": "#173a28", "--red": "#2f5a3f" }, files: ["paper-wine", "heart-doodle", "circle-doodle"] }
    },
    coretan: {
      biru:  { vars: { "--red": "#1f3a6b", "--red-2": "#2b4c85" }, files: "*" },
      hijau: { vars: { "--red": "#285238", "--red-2": "#336644" }, files: "*" }
    }
  };
  const FONTS = {
    drapery: {
      great:      { gf: "family=Great+Vibes&family=Cinzel:wght@400;500", vars: { "--script": "'Great Vibes', cursive", "--caps": "'Cinzel', Georgia, serif" } },
      parisienne: { gf: "family=Parisienne&family=EB+Garamond:ital,wght@0,400;0,500;1,400", vars: { "--script": "'Parisienne', cursive", "--serif": "'EB Garamond', Georgia, serif" } }
    },
    photobox: {
      dancing: { gf: "family=Dancing+Script:wght@500;700&family=Reenie+Beanie&family=Playfair+Display:wght@500;700", vars: { "--brush": "'Dancing Script', cursive", "--hand": "'Reenie Beanie', cursive", "--serif": "'Playfair Display', Georgia, serif" } },
      satisfy: { gf: "family=Satisfy&family=Shadows+Into+Light&family=Abril+Fatface", vars: { "--brush": "'Satisfy', cursive", "--hand": "'Shadows Into Light', cursive", "--serif": "'Abril Fatface', Georgia, serif" } }
    },
    coretan: {
      rock:   { gf: "family=Rock+Salt&family=Patrick+Hand", vars: { "--marker": "'Rock Salt', cursive", "--hand": "'Patrick Hand', cursive", "--name": "'Patrick Hand', cursive" } },
      amatic: { gf: "family=Amatic+SC:wght@700&family=Kalam:wght@400;700", vars: { "--marker": "'Amatic SC', cursive", "--hand": "'Kalam', cursive", "--name": "'Kalam', cursive" } }
    }
  };

  /* ---------- bahasa: teks bawaan tema diterjemahkan, isi dari pasangan tidak disentuh ---------- */
  const I18N = {
    photobox: { id: {
      "Dear,": "Kepada,", "Open Invitation": "Buka Undangan", "Our": "Lagu", "Song": "Kami", "tap the play button": "ketuk tombol putar", "to hear our song..": "untuk mendengar lagu kami..",
      "Meet the Leads": "Kenalan Dulu", "Introducing the": "Perkenalkan,", "Groom!": "Mempelai pria!", "Name": "Nama", "Known for": "Dikenal sebagai", "Dad": "Ayah", "Mom": "Ibu",
      "And here’s the": "Dan ini dia,", "Bride!": "Mempelai wanita!", "Save the Date": "Simpan Tanggalnya", "MON": "SEN", "TUE": "SEL", "WED": "RAB", "THU": "KAM", "FRI": "JUM", "SAT": "SAB", "SUN": "MIN",
      "See Location": "Lihat Lokasi", "See you there!": "Sampai jumpa!", "Copy": "Salin", "Copied": "Tersalin",
      "RSVP": "Kehadiran", "Will you join us?": "Kamu bisa datang?", "Attending": "Hadir", "Can't make it": "Berhalangan", "Your wishes": "Ucapan & doa", "Send": "Kirim", "Thank you, we got your wishes!": "Makasih, ucapanmu sudah kami terima!", "Guests": "Jumlah tamu",
      "Thank you": "Terima kasih", "Open Memories": "Buka Kenangan", "Photos from our guests": "Foto dari tamu", "Open the album": "Buka album", "Order of the day": "Susunan acara", "Live stream": "Siaran langsung", "Watch live": "Tonton siaran langsung", "Watch the recording": "Tonton rekaman", "Can't be there? Follow along from anywhere.": "Belum bisa hadir? Ikuti momennya dari mana saja.", "Live now": "Sedang tayang", "person": "orang", "people": "orang", "Up to": "Maksimal", "seats reserved for you": "kursi disiapkan untukmu", "Account name:": "Atas nama:", "just now": "baru saja", "1 person": "1 orang", "2 people": "2 orang", "3 people": "3 orang"
    } },
    drapery: { en: {
      "The Wedding of": "The Wedding of", "Kepada Yth. Bapak/Ibu/Saudara/i": "Dear", "Buka Undangan": "Open Invitation", "ketuk pemutar untuk mendengarkan lagu kami": "tap the player to hear our song",
      "Bapak": "Mr.", "& Ibu": "& Mrs.", "Hari": "Days", "Jam": "Hours", "Menit": "Minutes", "Detik": "Seconds", "Akad Nikah": "Holy Matrimony", "Akad": "Ceremony", "Resepsi": "Reception",
      "Petunjuk Lokasi": "Get Directions", "Kehadiran": "RSVP", "Mohon konfirmasi kehadiran Anda dan titipkan doa untuk kami.": "Please let us know if you can come, and leave your wishes for us.",
      "Nama": "Name", "Konfirmasi": "Attendance", "Akan hadir": "Attending", "Berhalangan": "Can't make it", "Jumlah tamu": "Guests", "1 orang": "1 guest", "2 orang": "2 guests", "3 orang": "3 guests",
      "Ucapan & doa": "Wishes", "Kirim": "Send", "Hadir": "Attending", "Salin": "Copy", "Tersalin": "Copied", "Terima kasih, ucapan Anda sudah kami terima.": "Thank you, we got your wishes.",
      "Terima kasih": "Thank you", "Buka Kenangan": "Open Memories", "Foto dari tamu": "Photos from our guests", "Buka album": "Open the album", "Susunan acara": "Order of the day", "Siaran langsung": "Live stream", "Tonton siaran langsung": "Watch live", "Tonton rekaman": "Watch the recording", "Belum bisa hadir? Ikuti momennya dari mana saja.": "Can't be there? Follow along from anywhere.", "Sedang tayang": "Live now", "orang": "guests", "Maksimal": "Up to", "kursi disiapkan untukmu": "seats reserved for you"
    } },
    coretan: { en: {
      "Kepada Yth.": "Dear", "Buka Undangan": "Open Invitation", "Ketuk tombol putar untuk mendengarkan lagu kami..": "Tap play to hear our song..", "Bapak": "Mr.", "dan Ibu": "& Mrs.",
      "Akad": "Ceremony", "Resepsi": "Reception", "Lihat Lokasi": "See Location", "Ucapan & Kehadiran": "Wishes & RSVP", "Hadir": "Attending", "Berhalangan": "Can't make it", "Nama": "Name",
      "Ucapan": "Wishes", "Kehadiran": "Attendance", "Kirim Ucapan": "Send", "Menuju": "Counting", "hari H": "down", "HARI": "DAYS", "JAM": "HRS", "MENIT": "MINS", "DETIK": "SECS", "Sampai": "See", "jumpa di": "you at",
      "Salin": "Copy", "Tersalin": "Copied", "Makasih! Ucapanmu sudah masuk.": "Thanks! We got your wishes.", "Minggu": "Sun", "Senin": "Mon", "Selasa": "Tue", "Rabu": "Wed", "Kamis": "Thu", "Jumat": "Fri", "Sabtu": "Sat",
      "Terima kasih": "Thank you", "Buka Kenangan": "Open Memories", "Foto dari tamu": "Photos from our guests", "Buka album": "Open the album", "Susunan acara": "Order of the day", "Siaran langsung": "Live stream", "Tonton siaran langsung": "Watch live", "Tonton rekaman": "Watch the recording", "Belum bisa hadir? Ikuti momennya dari mana saja.": "Can't be there? Follow along from anywhere.", "Sedang tayang": "Live now", "orang": "guests", "Maksimal": "Up to", "kursi disiapkan untukmu": "seats reserved for you"
    } }
  };
  const BASE_LANG = { drapery: "id", photobox: "en", coretan: "id" }[THEME] || "id";
  let LANG = BASE_LANG;
  const dict = () => (LANG === BASE_LANG ? null : ((I18N[THEME] || {})[LANG] || null));
  /* t(): teks bawaan (bahasa asli tema) ke bahasa yang dipilih. tx(): teks Sakara (ditulis dalam bahasa Indonesia) ke bahasa tampilan. */
  const t = s => { const d = dict(); return (d && d[s] != null) ? d[s] : s; };
  const tx = s => { if (LANG === "id") { const d = (I18N[THEME] || {}).id; if (BASE_LANG !== "id" && d) { const k = Object.keys(d).find(k => d[k] === s); if (k) return d[k]; } return s; }
    const d = (I18N[THEME] || {}).en || null; if (d && d[s] != null) return d[s]; const r = (I18N[THEME] || {}).id; if (r) { const k = Object.keys(r).find(k => r[k] === s); if (k) return k; } return s; };

  function translate() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) {
      const el = n.parentElement; if (!el || el.closest("[data-k],script,style,template,.sk-own,#wall")) continue;
      if (n.__sk == null) { const raw = n.nodeValue.trim(); if (!raw) continue; n.__sk = n.nodeValue; n.__skKey = raw; }
      const v = t(n.__skKey); n.nodeValue = v === n.__skKey ? n.__sk : n.__sk.replace(n.__skKey, v);
    }
    document.querySelectorAll("option").forEach(o => { if (o.__sk == null) o.__sk = o.textContent; o.textContent = t(o.__sk); });
    document.querySelectorAll("[placeholder]").forEach(o => { if (o.__skp == null) o.__skp = o.getAttribute("placeholder"); o.setAttribute("placeholder", t(o.__skp)); });
    document.documentElement.lang = LANG;
  }

  /* ---------- palet & huruf ---------- */
  let styleOrig = null, curPal = "", curFont = "";
  function applyLook(pal, font) {
    pal = pal || ""; font = font || ""; if (pal === curPal && font === curFont) return; curPal = pal; curFont = font;
    const st = document.querySelector("head style"); if (st && styleOrig == null) styleOrig = st.textContent;
    const P = (PALETTES[THEME] || {})[pal], F = (FONTS[THEME] || {})[font];
    const has = f => P && (P.files === "*" || P.files.includes(f));
    const swap = s => s.replace(/assets\/([a-z0-9-]+)\.webp/g, (m, f) => has(f) ? `assets/pal-${pal}/${f}.webp` : m);
    if (st) st.textContent = swap(styleOrig);
    document.querySelectorAll("img").forEach(im => { const a = im.getAttribute("data-sk-src") || im.getAttribute("src") || ""; if (!/^assets\/[a-z0-9-]+\.webp$/.test(a)) return; if (!im.hasAttribute("data-sk-src")) im.setAttribute("data-sk-src", a); const v = swap(a); if (im.getAttribute("src") !== v) im.setAttribute("src", v); });
    let ov = document.getElementById("sk-look"); if (!ov) { ov = document.createElement("style"); ov.id = "sk-look"; document.head.appendChild(ov); }
    const vars = Object.assign({}, P ? P.vars : {}, F ? F.vars : {});
    ov.textContent = Object.keys(vars).length ? ":root{" + Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";") + "}" : "";
    if (F && !document.getElementById("sk-font-" + font)) { const l = document.createElement("link"); l.id = "sk-font-" + font; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?" + F.gf + "&display=swap"; document.head.appendChild(l); }
  }

  /* ---------- urutan bagian ---------- */
  const fixed = { quote: -1, closing: 1e3 };
  function reorder(order) {
    if (!Array.isArray(order) || !order.length) return;
    const groups = new Map();
    document.querySelectorAll("section[data-section]").forEach(el => { const p = el.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(el); });
    groups.forEach(list => {
      if (list.length < 3) return;
      const rank = (el, i) => { const id = el.dataset.section; if (id in fixed) return fixed[id]; const k = order.indexOf(id); return k < 0 ? 500 + i : k; };
      const sorted = list.map((el, i) => [el, rank(el, i)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
      const anchor = list[list.length - 1].nextSibling, parent = list[0].parentElement;
      sorted.forEach(el => parent.insertBefore(el, anchor));
    });
  }

  /* ---------- tambahan dari Sakara: salam pembuka, susunan acara, siaran langsung, jatah kursi, kenangan ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function css() {
    if (document.getElementById("sk-css")) return;
    const s = document.createElement("style"); s.id = "sk-css";
    s.textContent = `.sk-x{margin:22px auto 0;max-width:340px;text-align:left;display:grid;gap:14px}
.sk-xb{border:1px solid currentColor;border-color:color-mix(in srgb,currentColor 28%,transparent);border-radius:12px;padding:14px 16px}
.sk-xl{display:block;font-size:11px;letter-spacing:.16em;text-transform:uppercase;opacity:.75;margin-bottom:8px}
.sk-rd{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:15px}.sk-rd li{display:grid;grid-template-columns:64px 1fr;gap:10px}.sk-rd b{font-weight:600;white-space:nowrap}
.sk-btn{display:inline-block;margin-top:10px;padding:9px 16px;border-radius:999px;border:1px solid currentColor;color:inherit;text-decoration:none;font-size:14px}
.sk-on{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:99px;background:#c0392b;color:#fff;font-size:10px;letter-spacing:.08em}
.sk-quota{font-size:13px;opacity:.8;margin:6px 0 0}
.sk-mem{padding:64px 24px;text-align:center}.sk-mem h2{margin:0 0 12px;font-size:34px;font-weight:400}.sk-mem p{max-width:340px;margin:0 auto 18px;line-height:1.6;white-space:pre-line}
.sk-ph{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:340px;margin:0 auto 16px}.sk-ph img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;display:block}
.sk-hide{display:none!important}
.sk-edit [data-section]{cursor:pointer}.sk-edit section[data-section].sk-sel,.sk-edit div[data-section].sk-sel{outline:2px solid #A4535E;outline-offset:-2px}`;
    document.head.appendChild(s);
  }
  function opening(o) {
    const lead = document.querySelector("[data-sk=opening]"), bism = document.querySelector("[data-sk=bism]");
    if (!lead) return;
    if (lead.__sk == null) lead.__sk = lead.innerHTML;
    if (!o) { lead.innerHTML = lead.__sk; if (bism) bism.hidden = false; return; }
    if (bism) bism.hidden = !o.arabic;
    lead.innerHTML = (o.salam ? esc(o.salam) + "<br><br>" : "") + esc(o.text);
  }
  function extras(list) {
    document.querySelectorAll(".sk-x").forEach(n => n.remove());
    const ev = document.querySelector("[data-section=event]"); if (!ev || !Array.isArray(list) || !list.length) return;
    const many = list.length > 1;
    const html = list.map(e => [
      e.rundown && e.rundown.length ? `<div class="sk-xb"><span class="sk-xl">${esc(tx("Susunan acara"))}${many ? " · " + esc(e.label) : ""}</span><ol class="sk-rd">${e.rundown.map(r => `<li><b>${esc(r.t || "")}</b><span>${esc(r.x)}</span></li>`).join("")}</ol></div>` : "",
      e.live ? `<div class="sk-xb"><span class="sk-xl">${esc(tx("Siaran langsung"))}${many ? " · " + esc(e.label) : ""}${e.liveNow ? ` <em class="sk-on">${esc(tx("Sedang tayang"))}</em>` : ""}</span><div>${esc(tx("Belum bisa hadir? Ikuti momennya dari mana saja."))}</div><a class="sk-btn" href="${esc(e.live)}" target="_blank" rel="noopener">${esc(tx(e.past ? "Tonton rekaman" : "Tonton siaran langsung"))}</a></div>` : ""
    ].join("")).join("");
    if (!html) return;
    const box = document.createElement("div"); box.className = "sk-x sk-own"; box.innerHTML = html; ev.appendChild(box);
  }
  function quota(n) {
    const sel = document.getElementById("fPax");
    document.querySelectorAll(".sk-quota").forEach(x => x.remove());
    if (!sel) return;
    if (sel.__sk == null) sel.__sk = sel.innerHTML;
    if (!n) { sel.innerHTML = sel.__sk; return; }
    const unit = c => c === 1 ? tx("orang") : tx("orang");
    sel.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1} ${esc(unit(i + 1))}</option>`).join("");
    const p = document.createElement("p"); p.className = "sk-quota sk-own"; p.textContent = `${tx("Maksimal")} ${n} ${tx("kursi disiapkan untukmu")}.`; sel.insertAdjacentElement("afterend", p);
  }
  function memory(m) {
    document.querySelectorAll(".sk-mem").forEach(n => n.remove());
    document.querySelectorAll("[data-section=rsvp],[data-show='sections.countdown']").forEach(el => el.classList.toggle("sk-hide", !!m));
    if (!m) return;
    const q = document.querySelector("section[data-section=quote]"); if (!q) return;
    const s = document.createElement("section"); s.className = "sk-mem sk-own " + (q.className || ""); s.setAttribute("data-section", "memory");
    s.innerHTML = `<h2>${esc(tx("Terima kasih"))}</h2><p>${esc(m.msg || "")}</p>${(m.photos || []).length ? `<div class="sk-ph">${m.photos.slice(0, 6).map(u => `<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div>` : ""}${m.album ? `<a class="sk-btn" href="${esc(m.album)}" target="_blank" rel="noopener">${esc(tx("Buka album"))}</a>` : ""}`;
    q.insertAdjacentElement("beforebegin", s);
  }

  window.SakaraBridge = {
    embedded, t, tx,
    host: () => !!(window.Invite && Invite.data && Invite.data._host),
    wishes: () => (window.Invite && Invite.data && Array.isArray(Invite.data._wishes)) ? Invite.data._wishes : null,
    send(entry) { if (embedded) window.parent.postMessage({ type: "invite:rsvp", entry }, "*"); }
  };

  function hook(d) {
    css();
    applyLook(d._palette, d._font);
    reorder(d._order);
    opening(d._opening);
    extras(d._extras);
    quota(d._quota || 0);
    memory(d._mem || null);
    translate();
    if (d._mem) document.querySelectorAll("#openBtn,[data-open]").forEach(b => { const sp = b.querySelector("span") || b; const k = BASE_LANG === "en" ? "Open Memories" : "Buka Kenangan"; if (!sp.__skm) sp.__skm = 1; [...sp.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim()).forEach(n => { n.nodeValue = " " + t(k); }); });
    if (d._guest) { const g = document.getElementById("guestName"); if (g) g.textContent = d._guest; }
    document.dispatchEvent(new CustomEvent("sakara:render", { detail: d }));
  }
  /* Tema dirancang untuk lebar HP 390px. Di layar yang lebih sempit (pratinjau editor, HP kecil) seluruh tampilan diperkecil
     secara proporsional supaya tata letaknya tetap persis seperti rancangan, bukan teksnya patah-patah. */
  const DESIGN_W = 390;
  function fit() { const w = document.documentElement.clientWidth || innerWidth; const z = w < DESIGN_W ? w / DESIGN_W : 1;
    document.documentElement.style.zoom = z === 1 ? "" : String(z); document.documentElement.style.setProperty("--sk-z", z); }
  fit(); addEventListener("resize", fit);
  /* mode editor: klik bagian untuk mengeditnya, bagian yang sedang diedit diberi garis */
  let editMode = false;
  addEventListener("message", e => { const m = e.data || {}; if (m.type !== "sakara:mark") return; editMode = true; css();
    document.documentElement.classList.add("sk-edit");
    document.querySelectorAll("[data-section]").forEach(el => el.classList.toggle("sk-sel", (m.sections || []).includes(el.dataset.section)));
    const first = (m.sections || []).map(k => document.querySelector(`[data-section="${k}"]`)).find(el => el && el.offsetParent !== null);
    if (first && m.scroll) { document.dispatchEvent(new CustomEvent("invite:skipcover")); first.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  document.addEventListener("click", e => { if (!editMode || !embedded) return; if (e.target.closest("a,button,input,textarea,select,label,#cover")) return; const sec = e.target.closest("[data-section]"); if (!sec) return; window.parent.postMessage({ type: "invite:pick", section: sec.dataset.section }, "*"); }, true);
  const boot = () => {
    if (!window.Invite) return setTimeout(boot, 0);
    const set = Invite.set.bind(Invite);
    Invite.set = function (data) { LANG = (data && data._lang) || BASE_LANG; this.locale = LANG; return set(data); };
    Invite.hooks.push(hook);
  };
  boot();
})();
