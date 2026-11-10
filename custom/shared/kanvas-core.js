/*
 * kanvas-core.js — model & render elemen kanvas, dipakai editor kanvas dan halaman tema.
 *
 * Dokumen kanvas (disimpan di S.cx.kv[dir]):
 *   { v:1, sections:[ { id, type:'canvas'|'feature', bg, h, name, key, els:[...] } ] }
 *   - section 'canvas'  : latar tema + elemen bebas, tinggi h (px, lebar desain 390)
 *   - section 'feature' : bagian interaktif asli tema (RSVP, hadiah, galeri, ...), elemen boleh ditumpuk di atasnya
 *   - elemen: { id, type:'text'|'img'|'photo'|'svg'|'btn', x, y (relatif ke section), w, h, r, opacity, ... }
 *     teks boleh punya bind "{p.nick} & {w.nick}" yang diisi dari data undangan.
 */
(function () {
  const W = 390;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const getPath = (o, p) => String(p).split(".").reduce((a, k) => (a == null ? a : a[k]), o);

  const DAYS = { id: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
  const MONTHS = { id: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"], en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] };
  function dateParts(iso, lang) {
    const L = lang === "en" ? "en" : "id";
    const [y, m, d] = String(iso || "").split("-").map(Number);
    if (!y || !m || !d) return { long: L === "en" ? "Date to be set" : "Tanggal belum diisi", dots: "·· · ·· · ··", day: L === "en" ? "Day" : "Hari", month: "", year: "", d: "" };
    const dt = new Date(y, m - 1, d), p = n => String(n).padStart(2, "0");
    const D = DAYS[L][dt.getDay()], M = MONTHS[L][m - 1];
    return { long: L === "en" ? `${D}, ${M} ${d}, ${y}` : `${D}, ${d} ${M} ${y}`, dots: `${p(d)} · ${p(m)} · ${String(y).slice(2)}`, full: `${p(d)} · ${p(m)} · ${y}`, day: D, month: M, year: String(y), d: String(d) };
  }

  /* Data tema (bentuk INVITE_DEFAULTS, dari cxData Sakara) → token kanvas */
  function ctx(d, opt) {
    d = d || {}; opt = opt || {};
    const lang = d._lang || opt.lang || "id";
    const ini = s => (String(s || "").trim().charAt(0).toUpperCase() || "?");
    const par = x => lang === "en"
      ? [x.parentsLine, [x.father ? "Mr. " + x.father : "", x.mother ? "Mrs. " + x.mother : ""].filter(Boolean).join(" & ")].filter(Boolean).join("\n")
      : [x.parentsLine, x.father ? "Bapak " + x.father : "", x.mother ? "& Ibu " + x.mother : ""].filter(Boolean).join("\n");
    const g = (d.couple || {}).groom || {}, b = (d.couple || {}).bride || {}, ev = d.event || {};
    const person = x => ({ nick: x.short || "", full: x.name || "", parents: par(x), father: x.father || "", mother: x.mother || "", ig: x.instagram ? "@" + x.instagram : "", known: x.knownFor || "", bio: x.bio || "", i: ini(x.short), line: x.name || "" });
    const evo = e => ({ time: (e || {}).time || "", place: (e || {}).venue || "", addr: (e || {}).address || "" });
    const o = d._opening || {};
    return {
      p: person(g), w: person(b), mono: ini(g.short) + ini(b.short),
      date: { iso: ev.date || "", ...dateParts(ev.date, lang) },
      akad: evo(ev.akad), resepsi: evo(ev.resepsi),
      quote: { text: (d.quote || {}).text || "", source: (d.quote || {}).source || "" },
      opening: { salam: o.salam || "", text: o.text || "" },
      closing: (d.closing || {}).text || "",
      guest: d._guest || d.guestDefault || "",
      hashtag: d.hashtag || "",
      mapsUrl: ev.mapsUrl || "",
      photos: d.photos || {},
      lang
    };
  }
  function resolve(t, C, depth) {
    return String(t || "").replace(/\{([\w.]+)\}/g, (_, p) => {
      const v = getPath(C, p);
      if (v == null || v === "") return /\.(title|ig)$/.test(p) ? "" : "…";
      return (depth || 0) < 2 && /\{/.test(v) ? resolve(String(v), C, (depth || 0) + 1) : v;
    });
  }

  /* ---------- CSS elemen (sama di editor & tema) ---------- */
  const CSS = `
.kv-el{position:absolute;transform-origin:50% 50%;user-select:none;-webkit-user-select:none;box-sizing:border-box}
.kv-el.el-text{white-space:pre-wrap;overflow-wrap:break-word;outline:none}
.kv-el.el-svg svg{width:100%;height:100%;display:block;overflow:visible}
.kv-el.el-img img{width:100%;height:100%;display:block;-webkit-user-drag:none;user-select:none;max-width:none}
.kv-el.el-img{filter:drop-shadow(0 8px 10px rgba(10,0,2,.35))}
.kv-el.el-img.flat{filter:none}
.kv-el.el-photo{overflow:hidden;background:linear-gradient(160deg,#76323b,#2b0a10);box-shadow:0 10px 24px rgba(20,0,5,.45)}
.kv-el.el-photo.frame{border:5px solid #efe6d6}
.kv-el.el-photo.arch{border-radius:999px 999px 4px 4px}
.kv-el.el-photo.oval{border-radius:50%}
.kv-el.el-photo.rect{border-radius:3px}
.kv-el.el-photo.polaroid{border:8px solid #fbf8f3;border-bottom-width:30px;border-radius:0;background:#d9d4cc;box-shadow:0 8px 18px rgba(0,0,0,.28)}
.kv-el.el-box{pointer-events:none}
.kv-el.el-photo img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;max-width:none}
.kv-el.el-photo .ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:13%;color:rgba(255,240,235,.8);font:500 11px/1.35 Inter,system-ui,sans-serif;text-align:center}
.kv-el.el-photo .ph .pi{position:absolute;left:50%;top:42%;width:42%;transform:translate(-50%,-50%);opacity:.3}
.kv-el.el-photo .ph b{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);padding:5px 10px;border-radius:99px;font-weight:500;margin-top:6px}
.kv-el.el-photo .ph b svg{width:13px;height:13px}
.kv-el.el-btn{display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;border-radius:99px;font:500 13px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;cursor:pointer}
.kv-el.el-btn svg{width:16px;height:16px;flex:none}
`;
  function css(doc) {
    doc = doc || document;
    if (doc.getElementById("kv-core-css")) return;
    const s = doc.createElement("style"); s.id = "kv-core-css"; s.textContent = CSS; (doc.head || doc.documentElement).appendChild(s);
  }

  const PERSON = '<svg class="pi" viewBox="0 0 100 100"><circle cx="50" cy="34" r="17" fill="#fff"/><path d="M14 100c2-26 17-38 36-38s34 12 36 38z" fill="#fff"/></svg>';
  const CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';

  /* opts: { cfg, C (ctx), pv (tampilan tamu), editing (id), base (awalan url aset & foto contoh) } */
  function fontOf(cfg, f) { return ((cfg && cfg.fonts) || {})[f] || f || "inherit"; }
  function styleText(n, el, cfg) {
    Object.assign(n.style, {
      fontFamily: fontOf(cfg, el.font), fontSize: el.size + "px", color: el.color, textAlign: el.align, letterSpacing: (el.ls || 0) + "em",
      lineHeight: el.lh, fontWeight: el.weight || 400, fontStyle: el.italic ? "italic" : "normal", textTransform: el.upper ? "uppercase" : "none"
    });
  }
  const textOf = (el, C) => (el.bind ? resolve(el.bind, C) : el.text || "");
  const url = (v, base) => (!v ? "" : /^(data:|blob:|https?:|\/)/.test(v) ? v : (base || "") + v);
  const photoSrc = (el, o) => url(el.bind ? (o.C.photos || {})[el.bind] : el.src, o.base);
  function fill(n, el, o) {
    const cfg = o.cfg || {}, A = cfg.assets || {};
    n.className = "kv-el el-" + el.type + (el.locked ? " locked" : "") + (!o.pv && el.id === o.editing ? " editing" : "");
    if (el.type === "text") { if (el.id !== o.editing || o.pv) n.textContent = textOf(el, o.C); styleText(n, el, cfg); }
    else if (el.type === "svg") { const s = (cfg.ornaments || {})[el.key]; n.innerHTML = s ? s.svg : ""; }
    else if (el.type === "img") { const a = A[el.key]; if (a && a.flat) n.classList.add("flat"); n.innerHTML = a ? `<img src="${esc(url((cfg.assetDir || "assets/") + a.src, o.base))}" alt="" draggable="false">` : ""; }
    else if (el.type === "photo") {
      n.classList.add(el.shape || "rect"); if (el.frame) n.classList.add("frame");
      const src = photoSrc(el, o);
      n.innerHTML = src ? `<img src="${esc(src)}" alt="" draggable="false">` : o.pv ? `<div class="ph">${PERSON}</div>` : `<div class="ph">${PERSON}<span>${esc(el.label || "Foto")}</span><b>${CAM}Tambah foto</b></div>`;
    }
    else if (el.type === "box") {
      const f = (cfg.fills || {})[el.fill] || {};
      n.style.background = String(f.css || el.fill || "#fff").replace(/url\((?!["']?(data:|https?:|\/))/g, "url(" + (o.base || ""));
      n.style.boxShadow = f.shadow || ""; n.style.borderRadius = (el.rad || 0) + "px"; n.innerHTML = "";
    }
    else if (el.type === "btn") {
      const B = cfg.button || {};
      Object.assign(n.style, { background: el.bg || B.bg || "#f5eee3", color: el.color || B.color || "#3a080d", fontFamily: fontOf(cfg, el.font || B.font || "sans") });
      n.innerHTML = `${(el.icon ?? "pin") === "pin" ? PIN : ""}<span>${esc(el.label || "Petunjuk Lokasi")}</span>`;
      if (o.pv && n.tagName === "A") { const h = el.href === "maps" ? o.C.mapsUrl : el.href; if (h) { n.href = h; n.target = "_blank"; n.rel = "noopener"; } else n.removeAttribute("href"); }
    }
  }
  function box(n, el) {
    const s = n.style; s.left = el.x + "px"; s.top = el.y + "px"; s.width = el.w + "px";
    s.height = el.type === "text" ? "auto" : el.h + "px"; s.transform = el.r ? `rotate(${el.r}deg)` : ""; s.opacity = el.opacity == null ? 1 : el.opacity;
  }
  function makeNode(el, o) {
    const n = document.createElement(o.pv && el.type === "btn" ? "a" : "div");
    n.dataset.id = el.id; fill(n, el, o); box(n, el); return n;
  }

  /* doc (y relatif per section) ⇄ susunan editor (y global, section bertumpuk) */
  function flatten(doc, featH) {
    const sections = [], els = []; let top = 0;
    ((doc && doc.sections) || []).forEach(s => {
      const h = s.type === "feature" ? (featH || 320) : s.h;
      const { els: E, ...meta } = s; sections.push({ ...meta, h });
      (E || []).forEach(e => els.push({ ...e, y: e.y + top }));
      top += h;
    });
    return { sections, els };
  }
  function split(sections, els) {
    const tops = []; let t = 0; sections.forEach(s => { tops.push(t); t += s.h; });
    const out = sections.map(s => ({ ...s, els: [] }));
    out.forEach(s => { if (s.type === "feature") delete s.h; });
    els.forEach(e => {
      const m = e.y + (e.h || 0) / 2; let i = 0; tops.forEach((v, k) => { if (v <= m) i = k; });
      out[i].els.push({ ...e, y: Math.round((e.y - tops[i]) * 10) / 10 });
    });
    return { v: 1, sections: out };
  }

  window.KV = { W, uid, esc, getPath, dateParts, ctx, resolve, css, fill, box, makeNode, styleText, textOf, photoSrc, url, flatten, split, PERSON, CAM };
})();
