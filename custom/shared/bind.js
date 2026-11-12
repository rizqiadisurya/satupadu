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
          if (empty(v)) { n.removeAttribute("src"); n.classList.add("is-empty"); }
          else { if (n.getAttribute("src") !== v) n.src = v; n.classList.remove("is-empty"); }
        }
        else if (a === "href") { if (empty(v)) n.removeAttribute("href"); else n.href = v; }
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
    const g = data.couple?.groom || {}, b = data.couple?.bride || {};
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
        const msg = e.data || {};
        if (msg.type === "invite:update") { this.set(msg.data); root.style.visibility = ""; }
        if (msg.type === "invite:focus") this.focus(msg.section);
      });
      if (window.parent !== window) window.parent.postMessage({ type: "invite:ready", theme }, "*");
    },
    set(data) {
      this.data = derive(structuredClone(data), this.locale);
      renderLists(document, this.data);
      bindNode(document.body, this.data, false);
      this.hooks.forEach(fn => { try { fn(this.data); } catch (err) { console.error(err); } });
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
})();
