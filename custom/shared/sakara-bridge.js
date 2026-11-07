/* sakara-bridge.js — menyambungkan tema Custom ke Sakara.
   - Urutan bagian (d._order) dan nama tamu (d._guest) dari editor/undangan Sakara.
   - Ucapan & RSVP: kalau tema dibuka di dalam Sakara, ucapan dikirim ke Sakara (yang menyimpannya ke database)
     dan daftar ucapan diambil dari d._wishes. Dibuka sendiri, tema memakai contoh bawaan. */
(function () {
  const embedded = window.parent !== window;
  const fixed = { quote: -1, closing: 1e3 };
  function reorder(order) {
    if (!Array.isArray(order) || !order.length) return;
    const groups = new Map();
    document.querySelectorAll("section[data-section]").forEach(el => {
      const p = el.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(el);
    });
    groups.forEach(list => {
      if (list.length < 3) return;
      const rank = (el, i) => { const id = el.dataset.section; if (id in fixed) return fixed[id]; const k = order.indexOf(id); return k < 0 ? 500 + i : k; };
      const sorted = list.map((el, i) => [el, rank(el, i)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
      const anchor = list[list.length - 1].nextSibling, parent = list[0].parentElement;
      sorted.forEach(el => parent.insertBefore(el, anchor));
    });
  }
  window.SakaraBridge = {
    embedded,
    host: () => !!(window.Invite && Invite.data && Invite.data._host),
    wishes: () => (window.Invite && Invite.data && Array.isArray(Invite.data._wishes)) ? Invite.data._wishes : null,
    send(entry) { if (embedded) window.parent.postMessage({ type: "invite:rsvp", entry }, "*"); }
  };
  function hook(d) {
    reorder(d._order);
    if (d._guest) { const g = document.getElementById("guestName"); if (g) g.textContent = d._guest; }
    document.dispatchEvent(new CustomEvent("sakara:render", { detail: d }));
  }
  const tryHook = () => { if (window.Invite) Invite.hooks.push(hook); else setTimeout(tryHook, 0); };
  tryHook();
})();
