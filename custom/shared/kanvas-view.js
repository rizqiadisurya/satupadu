/*
 * kanvas-view.js — mode "Edit bebas" di halaman tema.
 * Bila data undangan membawa _kv (dokumen kanvas), bagian visual tema disembunyikan dan diganti section kanvas;
 * bagian interaktif (RSVP, hadiah, galeri, pemutar lagu, ...) dipindahkan utuh ke posisi yang dipilih di kanvas,
 * jadi seluruh fungsinya tetap jalan. Tanpa _kv, tema tampil seperti biasa.
 */
(function () {
  const cfg = window.KV_THEME;
  if (!cfg || !window.KV) return;
  const KV = window.KV;
  let root = null, io = null;
  const homes = new Map();

  function css() {
    if (document.getElementById("kv-view-css")) return;
    const s = document.createElement("style"); s.id = "kv-view-css";
    s.textContent = `
.kv-off{display:none!important}
#kv{position:relative;overflow:hidden}
.kv-sec{position:relative;width:100%}
.kv-sec.kv-f{padding:0}
.kv-layer{position:absolute;left:0;top:0;width:390px;height:0;transform-origin:0 0;z-index:3;pointer-events:none}
.kv-layer .kv-el{pointer-events:none}
.kv-layer .kv-el.el-btn{pointer-events:auto}
.kv-layer .kv-rv{opacity:0;translate:0 22px;transition:opacity .9s ease,translate 1s cubic-bezier(.2,.7,.2,1)}
.kv-layer .kv-rv.shown{opacity:var(--op,1);translate:0 0}
.kv-layer .kv-rv.shown.kv-sway{animation:kvsway 6s ease-in-out infinite alternate}
@keyframes kvsway{to{rotate:2.5deg}}
html.sk-edit .kv-layer .kv-rv,html.kv-now .kv-layer .kv-rv{opacity:var(--op,1);translate:0 0;transition:none}
@media (prefers-reduced-motion:reduce){.kv-layer .kv-rv{opacity:var(--op,1);translate:0 0;transition:none}.kv-layer .kv-sway{animation:none}}`;
    document.head.appendChild(s);
  }
  const main = () => document.querySelector("main") || document.body;

  /* ambil node bagian fitur dari tempat asalnya (diberi penanda supaya bisa dikembalikan) */
  function take(key) {
    const f = (cfg.features || {})[key]; if (!f) return [];
    let list = homes.get(key);
    if (!list) {
      list = [];
      (f.sel || []).forEach(sel => {
        const n = document.querySelector(sel);
        if (n && !list.some(x => x.node === n)) { const ph = document.createComment("kv:" + key); n.parentNode.insertBefore(ph, n); list.push({ node: n, ph }); }
      });
      homes.set(key, list);
    }
    return list;
  }
  function restore() {
    homes.forEach(list => list.forEach(({ node, ph }) => { if (ph.parentNode) { ph.parentNode.insertBefore(node, ph); ph.remove(); } }));
    homes.clear();
    if (root) root.remove(); root = null;
    document.querySelectorAll(".kv-off").forEach(n => n.classList.remove("kv-off"));
  }
  function scale() {
    if (!root) return;
    const k = (root.clientWidth || KV.W) / KV.W;
    root.querySelectorAll(":scope > .kv-sec").forEach(sec => {
      if (sec.classList.contains("kv-c")) sec.style.height = (+sec.dataset.h * k) + "px";
      const l = sec.querySelector(":scope > .kv-layer"); if (l) l.style.transform = `scale(${k})`;
    });
  }
  function observe() {
    if (io) io.disconnect();
    if (!("IntersectionObserver" in window)) { root.querySelectorAll(".kv-rv").forEach(n => n.classList.add("shown")); return; }
    io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("shown"); io.unobserve(x.target); } }), { threshold: .12 });
    root.querySelectorAll(".kv-rv:not(.shown)").forEach(n => io.observe(n));
  }

  function render(d) {
    const doc = d && d._kv;
    if (!doc || !Array.isArray(doc.sections)) { if (root || homes.size) restore(); return; }
    css(); KV.css();
    const M = main();
    const o = { cfg: Object.assign({}, cfg, { fonts: cfg.viewFonts || cfg.fonts }), C: KV.ctx(d), pv: true, base: "" };
    const shown = new Set(root ? [...root.querySelectorAll(".kv-rv.shown")].map(n => n.dataset.id) : []);
    if (!root) { root = document.createElement("div"); root.id = "kv"; M.insertBefore(root, M.firstChild); }
    [...M.children].forEach(n => { if (n !== root) n.classList.add("kv-off"); });
    root.textContent = "";
    doc.sections.forEach(s => {
      let sec;
      if (s.type === "feature") {
        const f = (cfg.features || {})[s.key], nodes = take(s.key);
        if (!f || !nodes.length) return;
        sec = document.createElement("div");
        sec.className = "kv-sec kv-f " + (f.wrap || "");
        if (f.pad) sec.style.padding = f.pad;
        nodes.forEach(({ node }) => { node.classList.remove("kv-off"); sec.appendChild(node); });
        if (nodes.every(({ node }) => node.hidden)) sec.style.display = "none";
      } else {
        const bg = (cfg.bgs || {})[s.bg] || {};
        sec = document.createElement("div");
        sec.className = "kv-sec kv-c " + (bg.cls || "");
        if (!bg.cls && (bg.view || bg.css)) sec.style.background = bg.view || bg.css;
        sec.dataset.h = s.h;
      }
      const layer = document.createElement("div"); layer.className = "kv-layer";
      (s.els || []).forEach(el => {
        const n = KV.makeNode(el, o);
        n.style.setProperty("--op", el.opacity == null ? 1 : el.opacity); n.style.removeProperty("opacity");
        n.classList.add("kv-rv"); if (shown.has(el.id)) n.classList.add("shown");
        n.style.transitionDelay = (0.05 + (el.x / KV.W) * .25).toFixed(2) + "s";
        const a = (cfg.assets || {})[el.key]; if (el.type === "img" && a && a.sway) n.classList.add("kv-sway");
        layer.appendChild(n);
      });
      sec.appendChild(layer); root.appendChild(sec);
    });
    scale(); observe();
  }

  document.addEventListener("sakara:render", e => { try { render(e.detail); } catch (err) { console.warn("kanvas", err); } });
  addEventListener("resize", scale);
  document.addEventListener("invite:skipcover", () => document.documentElement.classList.add("kv-now"));
})();
