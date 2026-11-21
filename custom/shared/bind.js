/*
 * bind.js — tiny data binding shared by every theme.
 *
 *   data-k="a.b"        → textContent (use CSS white-space:pre-line for line breaks)
 *   data-src="a.b"      → <img src>; hidden when empty
 *   data-href="a.b"     → href
 *   data-bgc="a.b"      → style.background
 *   data-show="a.b"     → element hidden when value is falsy / empty
 *   data-list="a.b"     → repeat the element's <template> once per array item;
 *                          inside it, paths starting with "$" read from the item ("$" = item itself)
 *
 * A theme calls Invite.init({ theme, locale, onRender }) once. Data arrives from
 * the editor through postMessage, or falls back to the theme's defaults.
 */
(function () {
  const get = (obj, path) => {
    if (path === "$" ) return obj;
    return path.replace(/^\$\.?/, "").split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  };
  const empty = v => v == null || v === "" || v === false || (Array.isArray(v) && v.length === 0);

  function bindNode(el, scope, isItem) {
    const attrs = ["k", "src", "href", "bgc", "show"];
    const nodes = [el, ...el.querySelectorAll(attrs.map(a => `[data-${a}]`).join(","))];
    for (const n of nodes) {
      for (const a of attrs) {
        const p = n.dataset[a];
        if (!p) continue;
        const local = p.startsWith("$");
        if (local !== isItem) continue;
        const v = get(scope, p);
        if (a === "k") n.textContent = v == null ? "" : String(v);
        else if (a === "src") {
          if (empty(v) || /^\s*javascript:/i.test(String(v))) { n.removeAttribute("src"); n.classList.add("is-empty"); }
          else { if (n.getAttribute("src") !== v) n.src = v; n.classList.remove("is-empty"); }
        }
        else if (a === "href") { const ok = !empty(v) && /^(https?:|mailto:|tel:|#|\/(?!\/))/i.test(String(v).trim()); if (!ok) n.removeAttribute("href"); else n.href = v; }
        else if (a === "bgc") n.style.background = v || "";
        else if (a === "show") n.hidden = empty(v);
      }
    }
  }

  function renderLists(root, scope) {
    for (const host of root.querySelectorAll("[data-list]")) {
      const tpl = host.querySelector(":scope > template");
      if (!tpl) continue;
      const items = get(scope, host.dataset.list) || [];
      host.querySelectorAll(":scope > [data-gen]").forEach(n => n.remove());
      items.forEach((item, i) => {
        const frag = tpl.content.cloneNode(true);
        [...frag.children].forEach(c => { c.dataset.gen = ""; c.style.setProperty("--i", i); bindNode(c, item, true); });
        host.appendChild(frag);
      });
    }
  }

  const ID_DAYS = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const ID_MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const EN_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const EN_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function derive(data, locale) {
    const [y, m, d] = String(data.event?.date || "").split("-").map(Number);
    const ok = y && m && d;
    const dt = ok ? new Date(y, m - 1, d) : null;
    const D = locale === "en" ? EN_DAYS : ID_DAYS, M = locale === "en" ? EN_MONTHS : ID_MONTHS;
    const pad = n => String(n).padStart(2, "0");
    data._date = ok ? {
      y, m, d, iso: data.event.date,
      day: pad(d), month: M[m - 1], monthUpper: M[m - 1].toUpperCase(), year: String(y),
      weekday: D[dt.getDay()],
      long: `${D[dt.getDay()]}, ${d} ${M[m - 1]} ${y}`,
      short: locale === "en" ? `${D[dt.getDay()].toUpperCase()}, ${M[m-1].slice(0,3).toUpperCase()} ${d}` : `${D[dt.getDay()]}, ${d} ${M[m-1]}`,
      dots: `${pad(d)} · ${pad(m)} · ${y}`,
      dotsPlain: `${pad(d)}.${pad(m)}.${y}`,
      mini: `${d}.${m}.${String(y).slice(-2)}`
    } : {};
    /* tanggal panjang per acara (akad & resepsi bisa beda hari) dan waktu mulai acara untuk hitung mundur */
    const longOf = iso => { const [yy, mm, dd] = String(iso || "").split("-").map(Number); if (!(yy && mm && dd)) return ""; const t = new Date(yy, mm - 1, dd); return `${D[t.getDay()]}, ${dd} ${M[mm - 1]} ${yy}`; };
    const shortOf = iso => { const [yy, mm, dd] = String(iso || "").split("-").map(Number); if (!(yy && mm && dd)) return ""; const t = new Date(yy, mm - 1, dd); return locale === "en" ? `${D[t.getDay()].toUpperCase()}, ${M[mm-1].slice(0,3).toUpperCase()} ${dd}` : `${D[t.getDay()]}, ${dd} ${M[mm-1]}`; };
    const at = e => { if (!e) return 0; const [yy, mm, dd] = String(e.date || data.event?.date || "").split("-").map(Number); if (!(yy && mm && dd)) return 0;
      const [h, mi] = String(e.start || "").split(/[.:]/).map(Number); const off = +e.off || 7;
      return Date.UTC(yy, mm - 1, dd, (isNaN(h) ? 8 : h) - off, isNaN(mi) ? 0 : mi); };
    if (data.event) {
      ["akad", "resepsi"].forEach(k => { const e = data.event[k]; if (!e) return; e.long = longOf(e.date) || data._date.long || ""; e.short = shortOf(e.date) || data._date.short || ""; if (e.maps === undefined) e.maps = k === "resepsi" ? (data.event.mapsUrl || "") : ""; });
      { const a = data.event.akad, r = data.event.resepsi; if (a && r && a.maps && a.maps === r.maps) a.maps = "";
        if (a && r && a.venue && a.long !== r.long) { a.note = a.long; }
        if (r) r.mapLabel = a && a.maps ? "Lokasi resepsi" : "Petunjuk lokasi"; }
      const ts = ["akad", "resepsi"].map(k => data.event[k]).filter(e => e && (e.venue || e.time)).map(at).filter(Boolean);
      data._at = ts.length ? Math.min(...ts) : (ok ? Date.UTC(y, m - 1, d, 1) : 0);
    }
    /* blok tanpa isi tidak ditampilkan ke tamu */
    const sec = data.sections || {}, txt = v => String(v || "").trim();
    if (sec.quote && !txt(data.quote?.text)) sec.quote = false;
    if (sec.dresscode && !txt(data.dresscode?.text) && !(data.dresscode?.colors || []).length) sec.dresscode = false;
    if (data.gift) {
      const gf = data.gift, acc = (gf.accounts || []).filter(x => x && txt(x.number)), con = (gf.contacts || []).filter(x => x && txt(x.phone)), adr = txt(gf.address);
      if (!con.length && !adr) gf.shipText = "";
      if (sec.gift && !acc.length && !con.length && !adr) sec.gift = false;
    }
    const g = data.couple?.groom || {}, b = data.couple?.bride || {};
    /* orang tua: baris yang kosong tidak ditampilkan ("Bapak  & Ibu" tanpa nama) */
    [g, b].forEach(p => { const f = String(p.father || "").trim(), mo = String(p.mother || "").trim(), en = locale === "en";
      p.dad = f ? (en ? "Mr. " : "Bapak ") + f : ""; p.mom = mo ? (en ? "Mrs. " : "Ibu ") + mo : ""; p.amp = f && mo ? "& " : ""; p.dan = f && mo ? (en ? "and " : "dan ") : "";
      p.pl = f || mo ? (p.parentsLine || "") : (/\b(dari|of)\s*$/i.test(p.parentsLine || "") ? "" : (p.parentsLine || "")); });
    [g, b].forEach(p => { const h = String(p.instagram || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, ""); p.igUrl = /^[A-Za-z0-9._]{1,30}$/.test(h) ? "https://instagram.com/" + h : ""; });
    data._names = { gb: `${g.short || ""} & ${b.short || ""}`, bg: `${b.short || ""} & ${g.short || ""}` };
    return data;
  }

  const Invite = {
    data: null, theme: null, locale: "id", hooks: [],
    init({ theme, locale = "id", onRender }) {
      this.theme = theme; this.locale = locale;
      if (onRender) this.hooks.push(onRender);
      const defaults = (window.INVITE_DEFAULTS || {})[theme];
      let initial = defaults ? structuredClone(defaults) : {};
      if (location.hash === "#draft") { try { const s = localStorage.getItem("invite:preview"); if (s) initial = JSON.parse(s); } catch (e) {} }
      const embedded = location.hash === "#preview" && window.parent !== window;
      const root = document.documentElement;
      if (embedded) { root.style.visibility = "hidden"; setTimeout(() => root.style.visibility = "", 1500); }
      this.set(initial);
      window.addEventListener("message", e => {
        /* hanya dari editor/halaman Sakara yang membingkai tema ini, bukan dari situs lain */
        if (e.origin !== location.origin || (e.source !== window.parent && e.source !== window)) return;
        const msg = e.data || {};
        if (msg.type === "invite:update") { this.set(msg.data); root.style.visibility = ""; }
        if (msg.type === "invite:focus") this.focus(msg.section);
      });
      if (window.parent !== window) window.parent.postMessage({ type: "invite:ready", theme }, location.origin);
    },
    set(data) {
      this.data = derive(structuredClone(data), this.locale);
      /* undangan asli tanpa lagu (musik dimatikan): sembunyikan pemutar & tombol musik */
      document.documentElement.classList.toggle("no-music", !!this.data._host && !(this.data.music && this.data.music.src));
      renderLists(document, this.data);
      bindNode(document.body, this.data, false);
      this.hooks.forEach(fn => { try { fn(this.data); } catch (err) { console.error(err); } });
      pastTick();
    },
    focus(section) {
      document.dispatchEvent(new CustomEvent("invite:skipcover"));
      const el = document.querySelector(`[data-section="${section}"]`);
      if (el && !el.hidden) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    get,
    /* "2:17" or "137" → seconds; used to start the couple's own song mid-track */
    musicStart() {
      const v = String(this.data?.music?.start ?? "").trim(); if (!v) return 0;
      const p = v.split(":").map(Number); return p.some(isNaN) ? 0 : p.reduce((a, n) => a * 60 + n, 0);
    }
  };
  window.Invite = Invite;
  /* setelah acara mulai: hitung mundur diganti ucapan terima kasih, tidak berhenti di 00 selamanya */
  function pastTick() {
    const d = Invite.data; if (!d) return;
    const cd = document.querySelector("[data-cd]"); if (!cd) return;
    const box = cd.parentElement && cd.parentElement.parentElement; if (!box) return;
    const past = !!d._at && Date.now() >= d._at;
    box.classList.toggle("cd-hide", past);
    let note = box.nextElementSibling && box.nextElementSibling.classList.contains("cd-past") ? box.nextElementSibling : null;
    if (past && !note) { note = document.createElement("p"); note.className = "cd-past"; box.after(note); }
    if (note) { note.hidden = !past; note.textContent = Invite.locale === "en" ? "The celebration has taken place. Thank you for your prayers and wishes." : "Acara telah berlangsung. Terima kasih atas doa dan ucapannya."; }
  }
  setInterval(pastTick, 30000);
  /* lightbox bersama untuk tema yang belum punya: ketuk foto galeri untuk memperbesar */
  function sharedLightbox() {
    if (document.querySelector(".lightbox")) return;
    const pics = () => [...document.querySelectorAll('[data-section="gallery"] .photo img[src]')].filter(i => !i.closest("[hidden]"));
    const box = document.createElement("div"); box.className = "sk-lb"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Foto");
    box.innerHTML = '<img alt=""><button class="x" aria-label="Tutup">×</button><button class="p" aria-label="Sebelumnya">‹</button><button class="n" aria-label="Berikutnya">›</button>';
    document.body.appendChild(box); let i = 0;
    const show = k => { const L = pics(); if (!L.length) return; i = (k + L.length) % L.length; box.querySelector("img").src = L[i].src; box.classList.add("on"); };
    document.addEventListener("click", e => { const im = e.target.closest('[data-section="gallery"] .photo'); if (!im) return; const L = pics(), k = L.indexOf(im.querySelector("img")); if (k >= 0) show(k); });
    box.addEventListener("click", e => { if (e.target.classList.contains("p")) show(i - 1); else if (e.target.classList.contains("n")) show(i + 1); else if (e.target === box || e.target.classList.contains("x")) box.classList.remove("on"); });
    document.addEventListener("keydown", e => { if (!box.classList.contains("on")) return; if (e.key === "Escape") box.classList.remove("on"); if (e.key === "ArrowLeft") show(i - 1); if (e.key === "ArrowRight") show(i + 1); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sharedLightbox); else sharedLightbox();
  /* jumlah tamu tidak melebihi jatah undangan */
  Invite.hooks.push(d => { const q = +d._quota || 0, sel = document.getElementById("fPax"); if (!sel) return;
    [...sel.options].forEach(o => { o.hidden = q > 0 && parseInt(o.value || o.text) > q; }); if (sel.selectedOptions[0] && sel.selectedOptions[0].hidden) sel.selectedIndex = 0; });
  { const st = document.createElement("style"); st.textContent = ".sk-lb{position:fixed;inset:0;z-index:80;background:rgba(10,6,6,.92);display:none;align-items:center;justify-content:center;padding:20px}.sk-lb.on{display:flex}.sk-lb img{max-width:100%;max-height:86vh;object-fit:contain}.sk-lb button{position:absolute;background:none;border:0;color:#fff;font-size:36px;line-height:1;padding:12px;cursor:pointer}.sk-lb .x{top:8px;right:10px}.sk-lb .p{left:6px;top:50%;transform:translateY(-50%)}.sk-lb .n{right:6px;top:50%;transform:translateY(-50%)}[data-section=gallery] .photo{cursor:zoom-in}.cd-hide{display:none!important}.cd-past{text-align:center;margin:18px auto 6px;max-width:30ch;font-size:15px;line-height:1.5}html.no-music .fab,html.no-music .player,html.no-music .player-wrap{display:none!important}"; document.head.appendChild(st); }
  /* tamu pindah ke WhatsApp/aplikasi lain: musik dijeda, lalu lanjut saat kembali */
  let resumeOnShow = false;
  document.addEventListener("visibilitychange", () => {
    const M = window.Music; if (!M) return;
    if (document.hidden) { resumeOnShow = M.playing; if (M.playing) M.pause(); }
    else if (resumeOnShow) { resumeOnShow = false; M.play(); }
  });
})();
