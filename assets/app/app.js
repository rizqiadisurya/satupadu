(function(){
'use strict';

/* ---------- Utilities ---------- */
const LIBS={xlsx:'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', jsqr:'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'};
const libP={};
function loadLib(k){ if(libP[k]) return libP[k]; libP[k]=new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src=LIBS[k]; sc.async=true; sc.onload=()=>res(); sc.onerror=()=>{ delete libP[k]; rej(new Error('lib')); }; document.head.appendChild(sc); }); return libP[k]; }
const CLOUD = {on:false, sb:null, cfg:null, uid:null, inv:null, guestMode:false, pinMode:false, slug:null, pin:null, code:null, guest:null, lastG:new Map()};
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico = (id, cls='icon') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const rupiah = n => 'Rp' + n.toLocaleString('id-ID');
const store = {
  get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
};
function toast(msg, undo){
  const r = $('#toastRoot');
  r.innerHTML = `<div class="toast" role="status">${ico('check')}${esc(msg)}${undo?'<button type="button" class="toast-undo">Urungkan</button>':''}</div>`;
  if(undo) r.querySelector('.toast-undo').onclick=()=>{ r.innerHTML=''; clearTimeout(toast.t); undo(); };
  clearTimeout(toast.t); toast.t = setTimeout(()=> r.innerHTML='', undo?6500:2600);
}
/* tombol hapus dua ketukan: ketuk pertama minta konfirmasi */
function armed(el, label){ if(el.dataset.sure==='1') return true; const t=el.textContent; el.dataset.sure='1'; el.textContent=label||'Yakin hapus? Ketuk lagi'; el.classList.add('is-armed'); setTimeout(()=>{ if(el.isConnected){ el.dataset.sure=''; el.textContent=t; el.classList.remove('is-armed'); } },3500); return false; }
async function copyText(t){
  try{ await navigator.clipboard.writeText(t); toast('Tersalin'); }
  catch(e){ toast('Salin manual: ' + t); }
}
const fmtDate = d => { try{ return new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T00:00:00')); }catch(e){ return d; } };
const fmtShort = d => { try{ return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T00:00:00')); }catch(e){ return d; } };
const initials = n => n.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();

/* ---------- Themes ---------- */
const THEMES = [
  {id:'kawung', name:'Kawung Sogan', region:'Jawa', tags:['Adat'], bg:'#F4ECE1', fg:'#3B2416', accent:'#8A5A2B', soft:'#EADCC8', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`radial-gradient(ellipse 9px 14px at 50% 0, ${t.accent}33 98%, transparent), radial-gradient(ellipse 9px 14px at 50% 100%, ${t.accent}33 98%, transparent), radial-gradient(ellipse 14px 9px at 0 50%, ${t.accent}33 98%, transparent), radial-gradient(ellipse 14px 9px at 100% 50%, ${t.accent}33 98%, transparent)`, size:'34px 34px'},
  {id:'songket', name:'Songket Minang', region:'Sumatera Barat', tags:['Adat'], bg:'#3E0B18', fg:'#F6E7C8', accent:'#D4A64A', soft:'#561525', font:"'Marcellus', Georgia, serif",
    pat:(t)=>`repeating-linear-gradient(45deg, ${t.accent}2e 0 1.5px, transparent 1.5px 16px), repeating-linear-gradient(-45deg, ${t.accent}2e 0 1.5px, transparent 1.5px 16px)`, size:'auto'},
  {id:'melati', name:'Melati Putih', region:'Nasional', tags:['Minimalis','Religi'], bg:'#FFFFFF', fg:'#2A2326', accent:'#7D1D3F', soft:'#F7EEF1', font:"'Bodoni Moda', Georgia, serif",
    pat:(t)=>`radial-gradient(circle at 50% 50%, ${t.accent}14 1.5px, transparent 2px)`, size:'22px 22px'},
  {id:'taman', name:'Taman Kenanga', region:'Nasional', tags:['Floral'], bg:'#FBF1F0', fg:'#4A2A33', accent:'#B4566E', soft:'#F4DDE2', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`radial-gradient(circle at 20% 30%, ${t.accent}26 0 5px, transparent 6px), radial-gradient(circle at 70% 70%, #9DB68C38 0 7px, transparent 8px), radial-gradient(circle at 80% 20%, ${t.accent}1a 0 3px, transparent 4px)`, size:'60px 60px'},
  {id:'lontar', name:'Lontar Mappacci', region:'Sulawesi Selatan', tags:['Adat'], bg:'#F1EBDD', fg:'#2E3B2A', accent:'#6B7F3A', soft:'#DFE3CB', font:"'Marcellus', Georgia, serif",
    pat:(t)=>`repeating-linear-gradient(0deg, ${t.accent}22 0 1px, transparent 1px 12px), linear-gradient(90deg, transparent 48%, ${t.accent}1f 48% 52%, transparent 52%)`, size:'auto, 80px 100%'},
  {id:'ulos', name:'Ulos Ragi', region:'Sumatera Utara', tags:['Adat'], bg:'#2A1414', fg:'#F3E6DA', accent:'#D2553B', soft:'#43201D', font:"'Marcellus', Georgia, serif",
    pat:(t)=>`repeating-linear-gradient(90deg, ${t.accent}38 0 3px, transparent 3px 10px, #F3E6DA1c 10px 11px, transparent 11px 26px)`, size:'auto'},
  {id:'senja', name:'Senja Kota', region:'Nasional', tags:['Modern'], bg:'#1D1A2B', fg:'#F2ECF4', accent:'#E9A8B8', soft:'#2D2942', font:"'Bodoni Moda', Georgia, serif",
    pat:(t)=>`radial-gradient(120% 60% at 50% 0%, ${t.accent}33, transparent 60%), radial-gradient(circle, #ffffff22 1px, transparent 1.5px)`, size:'auto, 40px 40px'},
  {id:'peranakan', name:'Peranakan Tegel', region:'Peranakan', tags:['Adat','Floral'], bg:'#F3F5F2', fg:'#1F3A3A', accent:'#2F6F6B', soft:'#DCE8E3', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`radial-gradient(circle at 50% 50%, #C76B7E33 0 5px, transparent 6px), radial-gradient(circle at 0 0, ${t.accent}2e 0 12px, transparent 13px), radial-gradient(circle at 100% 100%, ${t.accent}2e 0 12px, transparent 13px), radial-gradient(circle at 100% 0, ${t.accent}2e 0 12px, transparent 13px), radial-gradient(circle at 0 100%, ${t.accent}2e 0 12px, transparent 13px)`, size:'44px 44px'},
  {id:'sakinah', name:'Sakinah', region:'Nasional', tags:['Religi','Minimalis'], bg:'#F2F4EF', fg:'#20352B', accent:'#3D6B4F', soft:'#DDE7DE', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`conic-gradient(from 45deg at 50% 50%, ${t.accent}18 0 25%, transparent 0 50%, ${t.accent}18 0 75%, transparent 0)`, size:'26px 26px'},
  {id:'endek', name:'Endek Bali', region:'Bali', tags:['Adat'], bg:'#F3EEE3', fg:'#2B2A22', accent:'#B0412E', soft:'#E8DFCB', font:"'Marcellus', Georgia, serif",
    pat:(t)=>`repeating-linear-gradient(60deg, ${t.accent}26 0 2px, transparent 2px 18px), repeating-linear-gradient(-60deg, ${t.accent}26 0 2px, transparent 2px 18px), linear-gradient(90deg, transparent 49%, #C9A24A33 49% 51%, transparent 51%)`, size:'auto, auto, 36px 100%'},
  {id:'megamendung', name:'Mega Mendung', region:'Cirebon, Jawa Barat', tags:['Adat'], bg:'#EAF0F5', fg:'#17304A', accent:'#2F5D8A', soft:'#D5E1EC', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`radial-gradient(circle at 0 100%, transparent 0 9px, ${t.accent}33 9px 12px, transparent 12px 17px, ${t.accent}26 17px 19px, transparent 19px 24px, ${t.accent}1c 24px 26px, transparent 26px), radial-gradient(circle at 100% 100%, transparent 0 9px, ${t.accent}33 9px 12px, transparent 12px 17px, ${t.accent}26 17px 19px, transparent 19px)`, size:'56px 32px'},
  {id:'gigibalang', name:'Gigi Balang', region:'Betawi', tags:['Adat','Modern'], bg:'#FFF6E8', fg:'#3A2410', accent:'#C2541E', soft:'#F5E1C4', font:"'Bodoni Moda', Georgia, serif",
    pat:(t)=>`linear-gradient(135deg, ${t.accent}2b 25%, transparent 25%), linear-gradient(225deg, ${t.accent}2b 25%, transparent 25%), radial-gradient(circle at 50% 70%, #2F7A5A22 0 3px, transparent 4px)`, size:'22px 22px, 22px 22px, 44px 44px'}
];
const TAGS = ['Semua','Draperi','Ilustrasi','Adat','Minimalis','Floral','Modern','Religi'];
const ACCENTS = ['#7D1D3F','#8A5A2B','#D4A64A','#B4566E','#2F6F6B','#3D6B4F','#1F3A5F'];
const themeById = id => THEMES.find(t=>t.id===id) || cxTheme(id) || THEMES[0];
const DP_BF = `<svg viewBox="0 0 40 30" aria-hidden="true"><g class="w"><path class="wl" d="M20 15C13 2 3 1 4 9c1 6 8 7 16 6z"/><path class="wl" d="M20 15c-6 3-12 8-9 12 3 3 8-4 9-12z"/></g><g class="w" style="animation-delay:-.12s"><path class="wl" d="M20 15c7-13 17-14 16-6-1 6-8 7-16 6z"/><path class="wl" d="M20 15c6 3 12 8 9 12-3 3-8-4-9-12z"/></g><path d="M19.4 9h1.2v13h-1.2z" fill="#6B5537"/></svg>`;
const DP_PETALS = Array.from({length:9},(_,i)=>`<span class="dp-pt" style="left:${(i*11+4)%96}%;--s:${8+(i*5)%7}px;--d:${10+(i*7)%9}s;--dl:-${(i*3.7).toFixed(1)}s"></span>`).join('');
const DP_SPARK = [[22,18],[74,22],[16,46],[84,40],[50,12],[30,62],[68,60]].map(([x,y],i)=>`<span class="dp-sp" style="left:${x}%;top:${y}%;--dl:-${(i*.9).toFixed(1)}s"></span>`).join('');
const DG_STK = {
  spark:`<svg viewBox="0 0 24 24"><path d="M12 0C13 8 16 11 24 12 16 13 13 16 12 24 11 16 8 13 0 12 8 11 11 8 12 0Z" fill="#F2C53D"/></svg>`,
  flower:`<svg viewBox="0 0 24 24"><g fill="#7B3F8C">${[0,60,120,180,240,300].map(r=>`<ellipse cx="12" cy="6" rx="2.6" ry="6" transform="rotate(${r} 12 12)"/>`).join('')}</g><circle cx="12" cy="12" r="2.2" fill="#5B2142"/></svg>`,
  swirl:`<svg viewBox="0 0 24 24"><path d="M3 20C1 9 15 4 17 12c1.6 6.5-8 7-6.6 0C12 5 21 4 21.5 13" fill="none" stroke="#6F8FE8" stroke-width="2.8" stroke-linecap="round"/></svg>`,
  sun:`<svg viewBox="0 0 24 24" fill="none" stroke="#7C8FB0" stroke-width="1.4" stroke-linecap="round"><path d="M12 12c.8 0 1 1 .2 1.4-1.4.6-2.6-1-1.8-2.4 1-1.8 3.8-1.4 4.4.6.8 2.4-1.6 4.4-4 3.8"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>`,
  twin:`<svg viewBox="0 0 24 24" fill="none" stroke="#A3336A" stroke-width="1.6" stroke-linejoin="round"><path d="M8 2c.6 4.5 2 6 6 7-4 1-5.4 2.5-6 7-.6-4.5-2-6-6-7 4-1 5.4-2.5 6-7Z"/><path d="M18 13c.4 2.6 1.2 3.4 3.6 4-2.4.6-3.2 1.4-3.6 4-.4-2.6-1.2-3.4-3.6-4 2.4-.6 3.2-1.4 3.6-4Z"/></svg>`,
  heart:`<svg viewBox="0 0 24 24"><path d="M12 21C5 15.5 2 12 2 8.2 2 5.3 4.3 3 7.1 3c2 0 3.6 1.1 4.9 3 1.3-1.9 2.9-3 4.9-3C19.7 3 22 5.3 22 8.2c0 3.8-3 7.3-10 12.8Z" fill="#E98DAF"/></svg>`
};
const dgStk = (k,x,y,sz,an,dl) => `<i class="dg-st k-${an}" style="left:${x}%;top:${y}%;width:${sz}px;--dl:${dl}s">${DG_STK[k]}</i>`;
const DG_BODY = [['spark',86,4,26,'tw',0],['flower',6,9,22,'spin',-2],['swirl',88,15,24,'bob',-1],['twin',8,21,26,'tw',-1.5],['sun',84,28,28,'spin',-3],['spark',5,34,22,'tw',-.6],['flower',90,41,20,'spin',-4],['heart',7,47,18,'bob',-2],['swirl',86,54,22,'bob',-3],['spark',10,60,24,'tw',-2.4],['twin',88,66,24,'tw',-.3],['flower',6,72,22,'spin',-1],['sun',86,79,26,'spin',-2],['spark',8,86,22,'tw',-1.2],['heart',88,92,18,'bob',-.8]].map(a=>dgStk(...a)).join('');
const GO_SP = c => `<svg viewBox="0 0 24 24"><path d="M12 1c.7 6.6 3.4 9.3 10 10-6.6.7-9.3 3.4-10 10-.7-6.6-3.4-9.3-10-10 6.6-.7 9.3-3.4 10-10Z" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const goSt = (x,y,sz,dl) => `<i class="go-sp" style="left:${x}%;top:${y}%;width:${sz}px;--dl:${dl}s">${GO_SP('#A3261E')}</i>`;
function goCal(d){ if(!d) return ''; const base=new Date(d+'T00:00:00'); const cell=o=>{ const x=new Date(base); x.setDate(x.getDate()+o); return {wd:new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(x), dd:x.getDate()}; };
  return `<div class="go-cal" aria-hidden="true">${[-1,0,1].map(o=>{ const c=cell(o); return `<div class="${o?'':'on'}"><span>${esc(c.wd)}</span><b>${c.dd}${o?'':`<svg viewBox="0 0 100 80"><path d="M52 6C22 4 6 22 8 42c2 22 26 34 48 32 24-2 38-18 36-38C90 16 70 4 44 9" fill="none" stroke="#A3261E" stroke-width="3.2" stroke-linecap="round"/></svg>`}</b>${o?'':'<em>Hari H!!</em>'}</div>`; }).join('')}</div>`; }
function goStrip(t){ const g=(S.gallery||[]).filter(Boolean); const ph=g.length?g:[coverPhoto(t)]; return `<div class="go-strip" aria-hidden="true">${[0,1,2].map(i=>`<span style="background-image:url('${ph[i%ph.length]}')"></span>`).join('')}</div>`; }
const dpVars = t => { const d=t.dp, A='/assets/draperi/'; return `--fab:${t.fabric};--dp-v:url(${A}velvet-${d.k}.webp);--dp-f:url(${A}bunga-${d.k}.webp);--dp-stage:url(${t.stage});--dp-seal:${d.seal}%;--dp-cy:${d.cy}%;--dp-ch:${d.ch}%;--dp-ink:${d.ink};--dp-name:${d.name};--dp-tul:${d.tul};`; };
function themeStyle(t, accent, font){
  const a = accent || t.accent; const tt = {...t, accent:a};
  return `--t-bg:${t.bg};--t-fg:${t.fg};--t-accent:${a};--t-soft:${t.soft};--t-font:${font||t.font};--t-pattern:${t.pat(tt)};--t-size:${t.size};${fontPairVars()}${t.dp?dpVars(t):''}`;
}
/* ---------- Tema berlayout khusus (sampul unik + ilustrasi SVG orisinal) ---------- */
const svgData = s => 'data:image/svg+xml,'+encodeURIComponent(s);
function sceneSVG(p){
  // pemandangan orisinal: langit, matahari, bukit, rerumputan, dua sosok bergandeng tangan
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky1}"/><stop offset=".62" stop-color="${p.sky2}"/><stop offset="1" stop-color="${p.sky3}"/></linearGradient>
  <radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${p.sun}" stop-opacity=".95"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="520" fill="url(#s)"/>
  <circle cx="268" cy="250" r="120" fill="url(#g)"/><circle cx="268" cy="250" r="34" fill="${p.sun}" opacity=".9"/>
  <path d="M0 300 C70 270 130 282 190 296 C260 312 320 280 400 288 V520 H0Z" fill="${p.h1}"/>
  <path d="M0 340 C90 318 160 336 230 330 C300 324 350 344 400 336 V520 H0Z" fill="${p.h2}"/>
  <path d="M0 392 C80 376 170 398 260 386 C320 378 360 392 400 388 V520 H0Z" fill="${p.h3}"/>
  <g fill="${p.fig}"><circle cx="176" cy="323" r="7.5"/><path d="M168 332 q8 -4 16 0 l5 44 h-26z"/><path d="M171 376 h6 l-1 26 h-4z M180 376 h6 l-1 26 h-4z"/>
  <circle cx="212" cy="318" r="8"/><path d="M203 328 q9 -4 18 0 l2 46 h-22z"/><path d="M205 374 h6 v28 h-5z M214 374 h6 v28 h-5z"/>
  <path d="M188 345 q6 4 15 0" stroke="${p.fig}" stroke-width="3" fill="none"/></g>
  <g stroke="${p.grass}" stroke-width="1.4" opacity=".7">${Array.from({length:46},(_,i)=>{const x=i*9+((i*37)%7);const h=10+((i*53)%14);return `<path d="M${x} 520 q2 -${h} ${(i%2?3:-3)} -${h+8}"/>`;}).join('')}</g>
  </svg>`;
}
const ART = {
  bouquet:(a)=>`<svg class="cv-bouquet" viewBox="0 0 200 260" aria-hidden="true">
    <g fill="none" stroke="${a}" stroke-width="2.2" stroke-linecap="round">
      <path d="M100 252 C98 200 92 150 70 96"/><path d="M100 252 C102 196 108 140 128 82"/><path d="M100 252 C100 190 100 130 100 58"/>
      <path d="M100 252 C94 210 80 176 52 150"/><path d="M100 252 C108 214 124 186 150 166"/></g>
    <g fill="${a}" opacity=".85"><path d="M84 150 q-22 -6 -30 -24 q20 2 30 24z"/><path d="M116 140 q22 -8 32 -26 q-22 2 -32 26z"/><path d="M98 196 q-20 -2 -30 -16 q18 -2 30 16z"/><path d="M104 182 q18 -6 26 -20 q-18 0 -26 20z"/></g>
    ${[[70,94,15],[128,80,14],[100,56,16],[52,148,12],[150,164,12]].map(([x,y,r])=>`<g transform="translate(${x} ${y})">${[0,72,144,216,288].map(d=>`<ellipse rx="${r*.42}" ry="${r*.8}" cy="${-r*.62}" transform="rotate(${d})" fill="#FFFDF7" stroke="${a}" stroke-width="1.1"/>`).join('')}<circle r="${r*.22}" fill="#E8C66A"/></g>`).join('')}
    ${[[86,118],[114,110],[100,92]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="4.5" ry="9" fill="#FFFDF7" stroke="${a}" stroke-width="1.1"/>`).join('')}
  </svg>`,
  kamboja:(c='#FFFFFF', core='#F2C14E')=>`<svg viewBox="-20 -20 40 40" aria-hidden="true">${[0,72,144,216,288].map(d=>`<path d="M0 0 C-7 -6 -6 -17 0 -18 C6 -17 7 -6 0 0Z" transform="rotate(${d}) rotate(14)" fill="${c}"/>`).join('')}<circle r="3.4" fill="${core}"/></svg>`,
  sprig:(a)=>`<svg class="cv-sprig" viewBox="0 0 220 90" aria-hidden="true"><path d="M8 70 C60 40 120 34 212 46" fill="none" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    ${Array.from({length:9},(_,i)=>{const x=24+i*21, y=60-i*2.6-(i>4?(i-4)*-1.2:0);return `<ellipse cx="${x}" cy="${y-9}" rx="7" ry="11" transform="rotate(${-28+i*3} ${x} ${y})" fill="${a}" opacity="${.55+(i%3)*.15}"/><ellipse cx="${x+6}" cy="${y+8}" rx="6" ry="10" transform="rotate(${148+i*3} ${x+6} ${y})" fill="${a}" opacity="${.45+(i%2)*.2}"/>`;}).join('')}
    <g transform="translate(116 30)">${[0,60,120,180,240,300].map(d=>`<ellipse rx="5" ry="10" cy="-9" transform="rotate(${d})" fill="#FFFFFF" stroke="${a}" stroke-width=".8"/>`).join('')}<circle r="4" fill="#E9D7A5"/></g></svg>`,
  florets:(c1,c2)=>`<svg class="cv-florets" viewBox="0 0 160 120" aria-hidden="true">${[[34,70,13,c1],[62,52,15,c2],[92,66,12,c1],[56,86,11,'#FFFFFF'],[118,50,11,'#FFFFFF'],[82,34,10,c1],[128,78,9,c2],[20,94,9,'#FFFFFF']].map(([x,y,r,c])=>`<g transform="translate(${x} ${y})">${Array.from({length:7},(_,k)=>{const ang=k*51.4, rr=r*.55; const cx=Math.cos(ang*Math.PI/180)*rr, cy=Math.sin(ang*Math.PI/180)*rr; return `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})">${[0,90,180,270].map(d=>`<ellipse rx="${(r*.2).toFixed(1)}" ry="${(r*.34).toFixed(1)}" cy="${(-r*.26).toFixed(1)}" transform="rotate(${d+k*13})" fill="${c}" opacity=".93"/>`).join('')}</g>`;}).join('')}<circle r="${(r*.18).toFixed(1)}" fill="#F3EBD9"/></g>`).join('')}
    <g fill="none" stroke="#8C9A7A" stroke-width="1.2" stroke-linecap="round"><path d="M10 112 C30 96 44 90 60 88"/><path d="M150 104 C138 94 128 88 118 84"/><path d="M4 60 C14 66 22 70 30 72"/></g>
    <g fill="#FFFFFF" opacity=".9">${[[8,52],[14,46],[150,40],[144,34],[154,58],[26,104],[140,96]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.8"/>`).join('')}</g></svg>`,
  swag:(f)=>`<svg class="dp-swag" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="dpg${f.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".35" stop-color="#fff" stop-opacity=".16"/><stop offset=".75" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient><linearGradient id="dpgs${f.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <rect width="400" height="22" fill="${f}"/><rect width="400" height="22" fill="#000" opacity=".25"/>
    ${[0,1,2].map(i=>{const x=i*133.3; return `<path d="M${x} 14 Q${x+66.6} 118 ${x+133.3} 14 Z" fill="${f}"/><path d="M${x} 14 Q${x+66.6} 118 ${x+133.3} 14 Z" fill="url(#dpg${f.slice(1)})"/><path d="M${x+2} 16 Q${x+66.6} 116 ${x+131.3} 16" fill="none" stroke="#D9C38F" stroke-width="1.6" opacity=".85"/><path d="M${x+8} 22 Q${x+66.6} 98 ${x+125} 22" fill="none" stroke="url(#dpgs${f.slice(1)})" stroke-width="7"/><path d="M${x+18} 30 Q${x+66.6} 82 ${x+115} 30" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="5"/>`;}).join('')}
    ${[0,133.3,266.6,400].map(x=>`<g transform="translate(${x} 16)"><circle r="7" fill="${f}"/><circle r="7" fill="#000" opacity=".2"/><path d="M-3 4 L-4 34 M0 4 L0 38 M3 4 L4 34" stroke="#D9C38F" stroke-width="1.4"/><circle r="3.2" cy="2" fill="#D9C38F"/></g>`).join('')}</svg>`,
  line:(a)=>`<svg class="cv-line" viewBox="0 0 160 14" aria-hidden="true"><path d="M0 7 H66 M94 7 H160" stroke="${a}" stroke-width="1"/><path d="M80 1 L86 7 L80 13 L74 7Z" fill="none" stroke="${a}" stroke-width="1"/></svg>`
};
const LAYOUT_THEMES = [
  {id:'sekar', layout:'sekar', name:'Sekar Ayu', region:'Nasional', tags:['Floral','Minimalis'], bg:'#F7F3EA', fg:'#2F3326', accent:'#7E8A55', soft:'#ECE8D6', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`radial-gradient(circle at 20% 30%, #2F332608 0 .6px, transparent 1px), radial-gradient(circle at 70% 80%, #2F33260a 0 .7px, transparent 1.1px)`, size:'7px 7px, 11px 11px', thumb:(t)=>`radial-gradient(120% 60% at 50% 105%, ${t.accent} 0 46%, transparent 47%), ${t.bg}`},
  {id:'kamboja', layout:'kamboja', name:'Kamboja Senja', region:'Bali', tags:['Floral','Modern'], bg:'#FBF5F0', fg:'#1E2B57', accent:'#E07A5F', soft:'#F4E4DA', font:"'Oswald', 'Plus Jakarta Sans', sans-serif",
    pat:(t)=>`radial-gradient(circle at 30% 40%, ${t.accent}12 0 2px, transparent 2.5px)`, size:'38px 38px', thumb:()=>`linear-gradient(180deg,#24388F,#4A6CD4 50%,#F2B8A2)`, sky:['#22357F','#4766CF','#F3B7A1']},
  {id:'lentera', layout:'lentera', name:'Lentera Hijau', region:'Nasional', tags:['Modern','Floral'], bg:'#F6F2E7', fg:'#1E3A2B', accent:'#2E5A41', soft:'#E5ECDD', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`linear-gradient(90deg, ${t.accent}08 1px, transparent 1px)`, size:'28px 28px', photo:true, thumb:(t)=>`linear-gradient(180deg, ${t.bg} 0 34%, #C9D3B8 34% 100%)`,
    scene:{sky1:'#F3E6CF',sky2:'#E9C9A0',sky3:'#C9B68E',sun:'#FFF2D6',h1:'#A9B58C',h2:'#8C9C6E',h3:'#6F8355',fig:'#3A3328',grass:'#56693F'}},
  {id:'arunika', layout:'arunika', name:'Arunika', region:'Nasional', tags:['Modern','Minimalis'], bg:'#E3DCCB', fg:'#2A251C', accent:'#7A6545', soft:'#D3CAB5', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`radial-gradient(circle, ${t.fg}0d 0 .7px, transparent 1px)`, size:'9px 9px', photo:true, script:true, thumb:()=>`linear-gradient(180deg,#8F8670,#3A3427)`,
    scene:{sky1:'#B9B19C',sky2:'#D9C7A4',sky3:'#C2A97F',sun:'#FFF1D2',h1:'#8D8166',h2:'#6E6450',h3:'#4E473A',fig:'#26221B',grass:'#3E392D'}},
  {id:'atelier', layout:'atelier', name:'Atelier Zaitun', region:'Nasional', tags:['Modern','Minimalis'], bg:'#F2EEE6', fg:'#1F2A22', accent:'#4A5E48', soft:'#E3E2D5', font:"'Bodoni Moda', Georgia, serif",
    pat:(t)=>`linear-gradient(0deg, ${t.fg}06 1px, transparent 1px)`, size:'100% 34px', photo:true, thumbFg:'#F3EEE4', thumb:(t)=>`linear-gradient(180deg,rgba(31,42,34,.35),rgba(31,42,34,.82)), url('${svgData(sceneSVG(t.scene))}') center 70%/cover`,
    scene:{sky1:'#C9CBB4',sky2:'#A9B095',sky3:'#7E8A6C',sun:'#F3EEDD',h1:'#5E6D50',h2:'#46553D',h3:'#2F3B2B',fig:'#1A2219',grass:'#2A3426'}},
  {id:'kebun-lila', layout:'kebun', kbSet:'/assets/kebun/lila/', name:'Kebun Lila', region:'Nasional', tags:['Ilustrasi','Floral'], bg:'#F7EFE0', fg:'#4A2C40', accent:'#A8325E', soft:'#EFE3F2', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`radial-gradient(circle, #9C86CF22 0 1.2px, transparent 1.6px)`, size:'18px 18px', thumb:()=>`url(/assets/thumbs/kebun-lila.webp) center/cover`},
  {id:'kebun-sage', layout:'kebun', kb:'sage', kbSet:'/assets/kebun/sage/', kbSh:'#6F8A64', kbAmp:'#F2D68A', kbPet:['#F2B8A0','#E9C46A','#FFFDF8','#C9706B','#B3C29A'], name:'Kebun Sage', region:'Nasional', tags:['Ilustrasi','Floral'], bg:'#F6F1E6', fg:'#3E4A38', accent:'#6F8A64', soft:'#E6EDDF', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`radial-gradient(circle, #8FA88622 0 1.2px, transparent 1.6px)`, size:'18px 18px', thumb:()=>`url(/assets/thumbs/kebun-sage.webp) center/cover`},
  {id:'kebun-biru', layout:'kebun', kb:'biru', kbSet:'/assets/kebun/biru/', kbSh:'#5D78A8', kbAmp:'#F3C969', kbPet:['#A9BEE0','#F3C969','#FFFFFF','#F2B3BF','#6F8CC2'], name:'Kebun Biru', region:'Nasional', tags:['Ilustrasi','Floral'], bg:'#F4F1EA', fg:'#24324F', accent:'#3F5E96', soft:'#E3EAF4', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`radial-gradient(circle, #6F8CC222 0 1.2px, transparent 1.6px)`, size:'18px 18px', thumb:()=>`url(/assets/thumbs/kebun-biru.webp) center/cover`},
  {id:'kebun-senja', layout:'kebun', kb:'senja', kbSet:'/assets/kebun/senja/', kbSh:'#B85E45', kbAmp:'#FFF1D6', kbPet:['#F08A4B','#F2CF63','#FFFDF8','#C7A6DA','#D06470'], name:'Kebun Senja', region:'Nasional', tags:['Ilustrasi','Floral'], bg:'#FBF0E4', fg:'#4A2620', accent:'#B23A48', soft:'#F8E1D3', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`radial-gradient(circle, #D9795F22 0 1.2px, transparent 1.6px)`, size:'18px 18px', thumb:()=>`url(/assets/thumbs/kebun-senja.webp) center/cover`},
  {id:'kebun-mawar', layout:'kebun', kbSet:'/assets/kebun/mawar/', kbSh:'#B5656F', kbAmp:'#F3D18A', kbPet:['#E8B4B8','#F3D18A','#FFFDF8','#C98A93','#D9A441'], name:'Kebun Mawar', region:'Nasional', tags:['Ilustrasi','Floral'], bg:'#FBF3EF', fg:'#4A2A33', accent:'#A4535E', soft:'#F5E3E3', font:"'Cormorant Garamond', Georgia, serif",
    pat:(t)=>`radial-gradient(circle, #B5656F22 0 1.2px, transparent 1.6px)`, size:'18px 18px', thumb:()=>`url(/assets/thumbs/kebun-mawar.webp) center/cover`},
  {id:'draperi-biru', layout:'draperi', name:'Draperi Biru Kabut', region:'Nasional', tags:['Draperi','Floral','Modern'], bg:'#EEF1F5', fg:'#1D2A40', accent:'#4D6893', soft:'#DDE4EE', font:"'Cormorant Garamond', Georgia, serif",
    fabric:'#2E4466', fl:['#9DB3D6','#C9D6EA'], stage:'/assets/draperi/biru.webp', dp:{k:'biru', seal:82.75, cy:84.6, ch:4.9, ink:'#C9D3E4', name:'#2E4466', tul:'#BEBCBF'}, pat:(t)=>`radial-gradient(circle, ${t.accent}12 0 .8px, transparent 1.2px)`, size:'14px 14px', thumb:()=>`repeating-linear-gradient(90deg,#24385A 0 9px,#3A557E 14px,#24385A 22px)`},
  {id:'draperi-zamrud', layout:'draperi', name:'Draperi Zamrud', region:'Nasional', tags:['Draperi','Floral','Adat'], bg:'#F1F0E8', fg:'#1B2B22', accent:'#7B2D33', soft:'#E2E5D6', font:"'Cormorant Garamond', Georgia, serif",
    fabric:'#1E3B2E', fl:['#D98C6E','#E8B9A4'], stage:'/assets/draperi/zamrud.webp', dp:{k:'zamrud', seal:79, cy:81.2, ch:5.4, ink:'#F0C9B8', name:'#1E3B2E', tul:'#C6AB8F'}, pat:(t)=>`radial-gradient(circle, ${t.accent}12 0 .8px, transparent 1.2px)`, size:'14px 14px', thumb:()=>`repeating-linear-gradient(90deg,#16301F 0 9px,#2C5340 14px,#16301F 22px)`},
  {id:'draperi-mawar', layout:'draperi', name:'Draperi Mawar', region:'Nasional', tags:['Draperi','Floral','Minimalis'], bg:'#FAF2F2', fg:'#3E2229', accent:'#9C4D61', soft:'#F2DFE3', font:"'Cormorant Garamond', Georgia, serif",
    fabric:'#9A5468', fl:['#F2C7D0','#FFFFFF'], stage:'/assets/draperi/mawar.webp', dp:{k:'mawar', seal:79, cy:81.2, ch:5.4, ink:'#F6D3DC', name:'#7A3A4E', tul:'#CAB8B6'}, pat:(t)=>`radial-gradient(circle, ${t.accent}10 0 .8px, transparent 1.2px)`, size:'14px 14px', thumb:()=>`repeating-linear-gradient(90deg,#84465A 0 9px,#B26C80 14px,#84465A 22px)`},
  {id:'dongeng-pink', layout:'dongeng', name:'Dongeng Pink', region:'Nasional', tags:['Ilustrasi','Modern'], bg:'#F7F2EA', fg:'#5B2142', accent:'#A3336A', soft:'#F5DDE6', font:"'Itim', 'Mali', cursive",
    pat:(t)=>`radial-gradient(circle, ${t.accent}10 0 .8px, transparent 1.2px)`, size:'16px 16px', thumb:()=>`linear-gradient(90deg,#E99AB5 0 22%,#F7F2EA 22% 78%,#E99AB5 78%)`},
  {id:'teras', layout:'teras', name:'Teras Kamboja', region:'Nasional', tags:['Ilustrasi','Floral'], bg:'#FBF5EC', fg:'#4A2A20', accent:'#C2573F', soft:'#F6E4D8', font:"'Cormorant Garamond', Georgia, serif", side:'/assets/teras/sampul2.webp',
    pat:(t)=>`radial-gradient(circle, #C2573F12 0 1px, transparent 1.4px)`, size:'20px 20px', thumb:()=>`url(/assets/thumbs/teras.webp) center/cover`},
  {id:'joglo', layout:'teras', ilDir:'/assets/joglo/', name:'Joglo Sogan', region:'Jawa', tags:['Ilustrasi','Adat'], bg:'#FBF3E2', fg:'#3E2A1C', accent:'#7A4A2A', soft:'#F1E3C8', font:"'Cormorant Garamond', Georgia, serif", side:'/assets/joglo/sampul2.webp',
    pat:(t)=>`radial-gradient(circle, #7A4A2A12 0 1px, transparent 1.4px)`, size:'20px 20px', thumb:()=>`url(/assets/thumbs/joglo.webp) center/cover`,
    ilVars:"--il-tegel:url(/assets/joglo/tegel.webp);--il-bingkai:url(/assets/joglo/bingkai.webp);--il-jalan:url(/assets/joglo/jalan.webp);--tr-k:url(/assets/joglo/kartu.webp) 127 146 187 138 fill / 25px 29px 37px 27px round;--tr-ink:#5A3A22;--il-nm:#7A4A2A;--il-amp:#2F5D3A;--il-bg:#FBF3E2;--il-bar:244/420;--il-bw:clamp(54px,15cqi,78px);--il-ini:#F3D9A0;--il-iy:8%;--il-topbg:radial-gradient(48% 46% at 50% 56%,rgba(251,243,226,.92),rgba(251,243,226,.7) 55%,rgba(251,243,226,0) 100%);--il-far:474/720;--il-fl:19%;--il-ft:5.5%;--il-fw:66%;--il-fh:83%",
    ilGate:{'--il-tegel':'url(/assets/joglo/tegel.webp)','--il-lencana':'url(/assets/joglo/lencana.webp)','--il-bg':'#FBF3E2','--il-amp':'#2F5D3A','--il-nm':'#7A4A2A','--il-ini':'#F3D9A0','--il-gw':'124px','--il-gh':'214px'}},
  {id:'rumah-gadang', layout:'teras', ilDir:'/assets/minang/', gate:'minang', name:'Rumah Gadang', region:'Sumatera Barat', tags:['Ilustrasi','Adat'], bg:'#F6EBD6', fg:'#3B1A14', accent:'#8E1B1B', soft:'#EFDDBF', font:"'Cormorant Garamond', Georgia, serif", side:'/assets/minang/sampul2.webp',
    pat:(t)=>`radial-gradient(circle, #8E1B1B12 0 1px, transparent 1.4px)`, size:'20px 20px', thumb:()=>`url(/assets/thumbs/rumah-gadang.webp) center/cover`,
    ilVars:"--il-tegel:url(/assets/minang/tegel.webp);--il-bingkai:url(/assets/minang/bingkai.webp);--il-jalan:url(/assets/minang/jalan.webp);--tr-k:url(/assets/minang/kartu.webp) 80 95 95 84 fill / 22px 26px 26px 23px round;--tr-ink:#5A1F17;--il-nm:#8E1B1B;--il-amp:#B8862A;--il-bg:#F6EBD6;--il-bar:244/499;--il-bw:clamp(52px,14cqi,74px);--il-ini:#F3D9A0;--il-iy:24%;--il-topbg:radial-gradient(48% 46% at 50% 56%,rgba(246,235,214,.92),rgba(246,235,214,.7) 55%,rgba(246,235,214,0) 100%);--il-far:474/665;--il-fl:18.8%;--il-ft:16.8%;--il-fw:62.2%;--il-fh:66.9%",
    ilGate:{'--il-tegel':'url(/assets/minang/tegel.webp)','--il-lencana':'url(/assets/minang/lencana.webp)','--il-bg':'#F6EBD6','--il-amp':'#B8862A','--il-nm':'#8E1B1B','--il-ini':'#F3D9A0','--il-gw':'120px','--il-gh':'245px'}},
  {id:'adat-batak', layout:'teras', ilDir:'/assets/batak/', gate:'batak', name:'Rumah Bolon', region:'Sumatera Utara', tags:['Ilustrasi','Adat'], bg:'#F4EAD8', fg:'#2B1A17', accent:'#9B1C1C', soft:'#EADCC4', font:"'Cormorant Garamond', Georgia, serif", side:'/assets/batak/sampul2.webp',
    pat:(t)=>`radial-gradient(circle, #9B1C1C12 0 1px, transparent 1.4px)`, size:'20px 20px', thumb:()=>`url(/assets/thumbs/adat-batak.webp) center/cover`,
    ilVars:"--il-tegel:url(/assets/batak/tegel.webp);--il-bingkai:url(/assets/batak/bingkai.webp);--il-jalan:url(/assets/batak/jalan.webp);--tr-k:url(/assets/batak/kartu.webp) 59 59 59 59 fill / 18px 18px 18px 18px round;--tr-ink:#9B1C1C;--il-nm:#9B1C1C;--il-amp:#B8862A;--il-bg:#F4EAD8;--il-bar:244/329;--il-bw:clamp(52px,14cqi,74px);--il-ini:#F4EAD8;--il-iy:44%;--il-topbg:radial-gradient(48% 46% at 50% 56%,#F4EAD8eb,#F4EAD8b3 55%,#F4EAD800 100%);--il-far:426/720;--il-fl:19.2%;--il-ft:14.9%;--il-fw:62.4%;--il-fh:71.7%",
    ilGate:{'--il-tegel':'url(/assets/batak/tegel.webp)','--il-lencana':'url(/assets/batak/lencana.webp)','--il-bg':'#F4EAD8','--il-amp':'#B8862A','--il-nm':'#9B1C1C','--il-ini':'#F4EAD8','--il-gw':'120px','--il-gh':'162px'}},
  {id:'adat-betawi', layout:'teras', ilDir:'/assets/betawi/', gate:'betawi', name:'Kembang Kelapa', region:'DKI Jakarta', tags:['Ilustrasi','Adat'], bg:'#F7EEDC', fg:'#2A1A14', accent:'#B8262B', soft:'#EFE0C6', font:"'Cormorant Garamond', Georgia, serif", side:'/assets/betawi/sampul2.webp',
    pat:(t)=>`radial-gradient(circle, #B8262B12 0 1px, transparent 1.4px)`, size:'20px 20px', thumb:()=>`url(/assets/thumbs/adat-betawi.webp) center/cover`,
    ilVars:"--il-tegel:url(/assets/betawi/tegel.webp);--il-bingkai:url(/assets/betawi/bingkai.webp);--il-jalan:url(/assets/betawi/jalan.webp);--tr-k:url(/assets/betawi/kartu.webp) 54 53 53 53 fill / 16px 16px 16px 16px round;--tr-ink:#B8262B;--il-nm:#B8262B;--il-amp:#C79A2E;--il-bg:#F7EEDC;--il-bar:244/409;--il-bw:clamp(52px,14cqi,74px);--il-ini:#F7EEDC;--il-iy:40%;--il-topbg:radial-gradient(48% 46% at 50% 56%,#F7EEDCeb,#F7EEDCb3 55%,#F7EEDC00 100%);--il-far:474/643;--il-fl:16.5%;--il-ft:13.7%;--il-fw:66.9%;--il-fh:72.5%",
    ilGate:{'--il-tegel':'url(/assets/betawi/tegel.webp)','--il-lencana':'url(/assets/betawi/lencana.webp)','--il-bg':'#F7EEDC','--il-amp':'#C79A2E','--il-nm':'#B8262B','--il-ini':'#F7EEDC','--il-gw':'120px','--il-gh':'201px'}},
  {id:'adat-bugis', layout:'teras', ilDir:'/assets/bugis/', gate:'bugis', name:'Rumah Panggung', region:'Sulawesi Selatan', tags:['Ilustrasi','Adat'], bg:'#F5ECDD', fg:'#22262A', accent:'#2A7C8C', soft:'#E8DECB', font:"'Cormorant Garamond', Georgia, serif", side:'/assets/bugis/sampul2.webp',
    pat:(t)=>`radial-gradient(circle, #2A7C8C12 0 1px, transparent 1.4px)`, size:'20px 20px', thumb:()=>`url(/assets/thumbs/adat-bugis.webp) center/cover`,
    ilVars:"--il-tegel:url(/assets/bugis/tegel.webp);--il-bingkai:url(/assets/bugis/bingkai.webp);--il-jalan:url(/assets/bugis/jalan.webp);--tr-k:url(/assets/bugis/kartu.webp) 73 76 74 75 fill / 22px 23px 22px 22px round;--tr-ink:#2A7C8C;--il-nm:#2A7C8C;--il-amp:#C2407A;--il-bg:#F5ECDD;--il-bar:244/485;--il-bw:clamp(52px,14cqi,74px);--il-ini:#F5ECDD;--il-iy:46%;--il-topbg:radial-gradient(48% 46% at 50% 56%,#F5ECDDeb,#F5ECDDb3 55%,#F5ECDD00 100%);--il-far:458/720;--il-fl:16.2%;--il-ft:13.9%;--il-fw:67.5%;--il-fh:73.1%",
    ilGate:{'--il-tegel':'url(/assets/bugis/tegel.webp)','--il-lencana':'url(/assets/bugis/lencana.webp)','--il-bg':'#F5ECDD','--il-amp':'#C2407A','--il-nm':'#2A7C8C','--il-ini':'#F5ECDD','--il-gw':'120px','--il-gh':'239px'}},
  {id:'kebun-teh', layout:'teras', ilDir:'/assets/kebunteh/', name:'Kebun Teh', region:'Nasional', tags:['Ilustrasi','Floral'], bg:'#F6F4EA', fg:'#2F3B2C', accent:'#3F6B45', soft:'#E6EBDD', font:"'Cormorant Garamond', Georgia, serif", side:'/assets/kebunteh/sampul2.webp',
    pat:(t)=>`radial-gradient(circle, #3F6B4512 0 1px, transparent 1.4px)`, size:'20px 20px', thumb:()=>`url(/assets/thumbs/kebun-teh.webp) center/cover`,
    ilVars:"--il-tegel:url(/assets/kebunteh/tegel.webp);--il-bingkai:url(/assets/kebunteh/bingkai.webp);--il-jalan:url(/assets/kebunteh/jalan.webp);--tr-k:url(/assets/kebunteh/kartu.webp) 130 139 200 137 fill / 26px 28px 40px 27px round;--tr-ink:#3E4B3A;--il-nm:#6B5B9A;--il-amp:#5E8358;--il-bg:#F6F4EA;--il-bar:413/420;--il-ini:#FFFDF6;--il-iy:3%;--il-topbg:radial-gradient(48% 46% at 50% 56%,rgba(246,244,234,.8),rgba(246,244,234,.45) 55%,rgba(246,244,234,0) 100%);--il-far:486/720;--il-fl:14%;--il-ft:9.5%;--il-fw:70%;--il-fh:80.5%",
    ilGate:{'--il-tegel':'url(/assets/kebunteh/tegel.webp)','--il-lencana':'url(/assets/kebunteh/lencana.webp)','--il-bg':'#F6F4EA','--il-amp':'#5E8358','--il-nm':'#6B5B9A','--il-ini':'#FFFDF6','--il-gw':'176px','--il-gh':'179px'}},
  {id:'taman-wisteria', layout:'teras', ilMode:'taman', ilDir:'/assets/tamanbunga/', name:'Taman Wisteria', region:'Nasional', tags:['Floral','Foto'], bg:'#EEF5F8', fg:'#3F5560', accent:'#B5566C', soft:'#E2ECF1', font:"'Cormorant Garamond', Georgia, serif", side:'/assets/tamanbunga/foto.webp',
    pat:(t)=>`radial-gradient(circle, #3F556010 0 1px, transparent 1.4px)`, size:'20px 20px', thumb:()=>`url(/assets/thumbs/taman-wisteria.webp) center/cover`,
    ilVars:"--il-bingkai:url(/assets/tamanbunga/bingkai.webp);--tr-ink:#3F5560;--il-nm:#B5566C;--il-amp:#7C8FA0;--il-bg:#EEF5F8;--il-bar:477/480;--il-ini:#B5566C;--il-iy:2%;--il-far:680/1000;--il-fl:19%;--il-ft:20%;--il-fw:62%;--il-fh:59%",
    ilGate:{'--il-lencana':'url(/assets/tamanbunga/lencana.webp)','--il-bg':'#EEF5F8','--il-amp':'#3F5560','--il-nm':'#B5566C','--il-ini':'#B5566C','--il-gw':'190px','--il-gh':'191px'}},
  {id:'taman-keraton', layout:'teras', ilMode:'taman', ilDir:'/assets/keraton/', name:'Taman Keraton', region:'Jawa', tags:['Adat','Floral'], bg:'#F4EEDF', fg:'#5B2A2E', accent:'#7A2E35', soft:'#EDE3CC', font:"'Cormorant Garamond', Georgia, serif", side:'/assets/keraton/foto.webp',
    pat:(t)=>`radial-gradient(circle, #7A2E3510 0 1px, transparent 1.4px)`, size:'20px 20px', thumb:()=>`url(/assets/thumbs/taman-keraton.webp) center/cover`,
    tm:{cls:'tm-keraton', cover:'gate', ground:'depan', bf:['p6'], pet:['p3','p1','p2','p5'], tops:['c','none','wis','none','wis','none'], files:{wis:'melati',sak:'kamboja',kal:'kalung',bangku:'bangku',arch:'gerbang',lencana:'gunungan'},
      scenes:[
        [['rumpun',-2,26,14,'w tall'],['lentera',30,46,16,'v'],['samping-r',78,24,14,'w']],
        [['palem',-10,40,12,'tr'],['teratai',30,50,16,'v'],['pilar',78,22,12,'']],
        [['pohon',-12,46,12,'tr'],['kuntul',34,40,16,'v'],['rumpun-r',76,26,14,'w tall']],
        [['janur',4,18,12,'tr'],['sesaji',28,46,18,''],['pilar',80,22,12,'']],
        [['palem-r',68,40,12,'tr'],['mawar',4,46,14,'w'],['pilar',50,20,12,'']],
      ]},
    ilVars:"--il-bingkai:url(/assets/keraton/bingkai.webp);--tm-cd:url(/assets/keraton/sesaji.webp);--tr-ink:#5B2A2E;--il-nm:#7A2E35;--il-amp:#9C7A3C;--il-bg:#F4EEDF;--il-bar:243/420;--il-ini:#FFF6E0;--il-iy:-12%;--il-far:664/1000;--il-fl:17%;--il-ft:25%;--il-fw:64%;--il-fh:55%",
    ilGate:{'--il-lencana':'url(/assets/keraton/gunungan.webp)','--tm-g1':'url(/assets/keraton/sudut.webp)','--tm-g1r':'url(/assets/keraton/sudut-r.webp)','--tm-g2':'url(/assets/keraton/depan.webp)','--il-bg':'#F4EEDF','--il-amp':'#9C7A3C','--il-nm':'#7A2E35','--il-ini':'#FFF6E0','--il-gw':'124px','--il-gh':'214px','--gini-sh':'0 1px 6px rgba(70,30,10,.85)','--gini-fs':'44px','--gini-y':'-14px'}},
  {id:'beludru', layout:'beludru', ilDir:'/assets/beludru/', name:'Beludru Anggur', region:'Nasional', tags:['Floral','Klasik'], bg:'#5B0F16', fg:'#F5EEE3', accent:'#D9B98A', soft:'#4A0B10', font:"'Cormorant Garamond', Georgia, serif", side:'/assets/beludru/side.webp',
    pat:(t)=>`radial-gradient(circle, #F5EEE30a 0 1px, transparent 1.4px)`, size:'20px 20px', thumb:()=>`url(/assets/thumbs/beludru.webp) center/cover`},
  {id:'goresan-merah', layout:'goresan', name:'Goresan Merah', region:'Nasional', tags:['Ilustrasi','Minimalis'], bg:'#F3EFEA', fg:'#2B1B17', accent:'#A3261E', soft:'#F1E1DC', font:"'Patrick Hand', cursive",
    pat:(t)=>`radial-gradient(circle, ${t.accent}0c 0 .8px, transparent 1.2px)`, size:'16px 16px', thumb:()=>`linear-gradient(180deg,#F3EFEA 0 60%,#A3261E 60% 62%,#F3EFEA 62%)`}
];
THEMES.unshift(...LAYOUT_THEMES);
/* thumbnail = cuplikan sampul asli */
const THUMB_IMG=new Set(["kawung", "songket", "melati", "taman", "lontar", "ulos", "senja", "peranakan", "sakinah", "endek", "megamendung", "gigibalang", "sekar", "kamboja", "lentera", "arunika", "atelier", "kebun-lila", "kebun-sage", "kebun-biru", "kebun-senja", "kebun-mawar", "draperi-biru", "draperi-zamrud", "draperi-mawar", "dongeng-pink", "goresan-merah", "teras", "joglo", "kebun-teh", "taman-wisteria", "taman-keraton", "beludru", "rumah-gadang", "adat-bugis", "adat-betawi", "adat-batak"]);
THEMES.forEach(t=>{ if(THUMB_IMG.has(t.id)){ t.thumbNoTxt=true; t.thumbImg=`/assets/thumbs/${t.id}.webp`; } });
TAGS.includes('Foto') || TAGS.push('Foto');
LAYOUT_THEMES.filter(t=>t.photo).forEach(t=>t.tags.push('Foto'));
function coverPhoto(t){ return S.coverPhoto || (S.gallery&&S.gallery[0]) || S.bride.photo || svgData(sceneSVG(t.scene||LAYOUT_THEMES[2].scene)); }
function coverHTML(t, d){
  const a = d.accent; const L = t.layout;
  const open = d.gate ? `<button class="open cv-in" style="--i:6" data-act="open-inv">${ico('mail')}<span>Buka undangan</span></button>` : '';
  const to = `<div class="to cv-in" style="--i:5">Kepada Yth.<b data-guestname>${esc(d.guest)}</b></div>`;
  if(L==='sekar') return `<section class="cover cv-sekar" id="${d.id}-cover">
      <div class="k-label cv-in" style="--i:0" data-scramble="${esc(d.dateLong)}">Undangan pernikahan</div>
      <div class="names cv-in" style="--i:1">${esc(d.n1)}<span class="amp">&amp;</span>${esc(d.n2)}</div>
      <div class="cv-stage cv-in" style="--i:2"><div class="sun"></div>${ART.bouquet(a)}<div class="tape"></div></div>
      <div class="cv-slot">${to}${open}</div>
    </section>`;
  if(L==='kamboja'){
    const [s1,s2,s3] = t.sky; const petals = Array.from({length:14},(_,i)=>`<i style="--x:${(i*37+11)%100}%;--y:${(i*53)%90}%;--d:${(i*0.73)%7}s;--t:${7+(i%5)*1.6}s;--s:${.5+(i%4)*.18};--r:${(i*47)%360}deg">${ART.kamboja('#FFFFFF','#F2C14E')}</i>`).join('');
    const cluster = (cls) => `<div class="cl ${cls}">${[[0,0,1.25,10],[34,18,.95,40],[8,44,.8,70],[52,52,.7,20]].map(([x,y,s,r])=>`<span style="left:${x}px;top:${y}px;transform:scale(${s}) rotate(${r}deg)">${ART.kamboja('#FFF8F3','#F2C14E')}</span>`).join('')}</div>`;
    return `<section class="cover cv-kamboja" id="${d.id}-cover" style="--sky1:${s1};--sky2:${s2};--sky3:${s3}">
      <div class="petals" aria-hidden="true">${petals}</div>${cluster('tr')}${cluster('bl')}
      <div class="k-label cv-in" style="--i:0" data-scramble="${esc(d.dateLong)}">The wedding of</div>
      <div class="names cv-in" style="--i:1"><span>${esc(d.n1)}</span><span class="amp">&amp;</span><span>${esc(d.n2)}</span></div>
      <div class="vline cv-in" style="--i:2"></div>
      <div class="cv-slot">${to}${open}</div>
    </section>`;
  }
  if(L==='lentera') return `<section class="cover cv-lentera" id="${d.id}-cover">
      <div class="pill cv-in" style="--i:0" data-scramble="${esc(d.dateLong)}">The wedding of</div>
      <div class="names cv-in" style="--i:1">${esc(d.n1)} <span class="amp">&amp;</span> ${esc(d.n2)}</div>
      <div class="date cv-in" style="--i:2">${esc(d.dateLong)}</div>
      <div class="cv-card cv-in" style="--i:3"><div class="cv-photo" style="background-image:url('${d.photo}')"></div>${ART.sprig(a)}
        <div class="cv-guest"><div class="cv-slot">${to.replace('cv-in','')}${open.replace('cv-in','')}</div></div></div>
    </section>`;
  if(L==='goresan') return `<section class="cover cv-goresan" id="${d.id}-cover">
      <div class="go-cvst" aria-hidden="true">${goSt(12,14,22,0)}${goSt(82,20,18,-1.2)}${goSt(8,58,16,-.6)}${goSt(86,62,22,-2)}${goSt(70,8,14,-1.6)}</div>
      <div class="go-std cv-in" style="--i:0" data-scramble="${esc(d.dateLong)}">Save<br>the<br>date!</div>
      <div class="go-hands cv-in" style="--i:1" aria-hidden="true"><i class="go-heart"><svg viewBox="0 0 24 24"><path d="M12 21C5 15.5 2 12 2 8.2 2 5.3 4.3 3 7.1 3c2 0 3.6 1.1 4.9 3 1.3-1.9 2.9-3 4.9-3C19.7 3 22 5.3 22 8.2c0 3.8-3 7.3-10 12.8Z" fill="#A3261E"/></svg></i></div>
      <div class="names cv-in" style="--i:2">${esc(d.n1)} <span class="amp">+</span> ${esc(d.n2)}</div>
      <div class="date cv-in" style="--i:3">${esc(d.dateLong)}</div>
      <div class="cv-slot">${to}${open}</div>
    </section>`;
  if(L==='dongeng') return `<section class="cover cv-dongeng" id="${d.id}-cover">
      <div class="dg-tirai l" aria-hidden="true"></div><div class="dg-tirai r" aria-hidden="true"></div>
      <div class="dg-cvstk" aria-hidden="true">${dgStk('spark',20,24,22,'tw',0)}${dgStk('twin',74,30,24,'tw',-1)}${dgStk('flower',24,70,20,'spin',-2)}${dgStk('swirl',72,74,22,'bob',-1)}${dgStk('heart',50,15,16,'bob',-2)}</div>
      <svg class="dg-arc cv-in" style="--i:0" viewBox="0 0 300 70" aria-hidden="true"><path id="${d.id}-arc" d="M30 62 Q150 -6 270 62" fill="none"/><text><textPath href="#${d.id}-arc" startOffset="50%" text-anchor="middle">The wedding of</textPath></text></svg>
      <div class="names cv-in" style="--i:1"><span>${esc(d.n1)}</span><span class="amp">&amp;</span><span>${esc(d.n2)}</span></div>
      <div class="date cv-in" style="--i:2" data-scramble="${esc(d.dateLong)}">${esc(d.dateLong)}</div>
      <div class="cv-slot">${to}${open}</div>
    </section>`;
  if(L==='draperi' && t.stage) return `<section class="cover cv-draperi dp-photo" id="${d.id}-cover" style="--fab:${t.fabric}">
      <div class="dp-box"><div class="dp-stage" style="background-image:url('${t.stage}')">
        <div class="dp-fly" aria-hidden="true">${DP_PETALS}${DP_SPARK}<span class="dp-bf" style="top:30%;--d:19s;--dl:-4s"><i>${DP_BF}</i></span><span class="dp-bf rev" style="top:58%;--d:24s;--dl:-13s;width:24px"><i>${DP_BF}</i></span></div>
        <div class="dp-txt">
          <div class="k-label cv-in" style="--i:0" data-scramble="${esc(d.dateLong)}">The wedding of</div>
          <div class="names cv-in" style="--i:1">${esc(d.n1)}<span class="amp">&amp;</span>${esc(d.n2)}</div>
          <div class="date cv-in" style="--i:2">${esc(d.dateLong)}</div>
          <div class="cv-slot dp-open">${open}</div>
          <div class="dp-to">${to.replace('--i:5','--i:4')}</div>
        </div>
        <span class="dp-ini" aria-hidden="true">${esc((d.n1||'?')[0])}${esc((d.n2||'?')[0])}</span>
      </div></div>
    </section>`;
  if(L==='draperi') return `<section class="cover cv-draperi" id="${d.id}-cover" style="--fab:${t.fabric}">
      <div class="dp-velvet" aria-hidden="true"></div>${ART.swag(t.fabric)}
      <div class="dp-side l" aria-hidden="true"></div><div class="dp-side r" aria-hidden="true"></div>
      <div class="k-label cv-in" style="--i:0" data-scramble="${esc(d.dateLong)}">The wedding of</div>
      <div class="names cv-in" style="--i:1">${esc(d.n1)}<span class="amp">&amp;</span>${esc(d.n2)}</div>
      <div class="date cv-in" style="--i:2">${esc(d.dateLong)}</div>
      <div class="dp-env cv-in" style="--i:3"><div class="dp-fl a">${ART.florets(t.fl[0],t.fl[1])}</div><div class="dp-fl b">${ART.florets(t.fl[0],t.fl[1])}</div>
        <div class="dp-paper"><div class="dp-flap"></div><span class="dp-seal">${esc((d.n1||'?')[0])}${esc((d.n2||'?')[0])}</span>
          <div class="cv-slot">${to.replace('cv-in','')}</div></div></div>
      <div class="cv-slot dp-open">${open}</div>
      <div class="dp-tulle" aria-hidden="true"></div>
    </section>`;
  if(L==='beludru'){ const A=t.ilDir||'/assets/beludru/';
    return `<section class="cover cv-beludru" id="${d.id}-cover">
      <img class="bl-val" src="${A}valance.webp" alt="" aria-hidden="true" decoding="async">
      <img class="bl-fl bl-fl1" src="${A}flora-1.webp" alt="" aria-hidden="true" decoding="async">
      <i class="bl-bf" aria-hidden="true" style="left:70%;top:24%"><img src="${A}butterfly.webp" alt=""></i>
      <div class="bl-top">
        <div class="k-label cv-in" style="--i:0" data-scramble="${esc(d.dateLong)}">The wedding of</div>
        <div class="names cv-in" style="--i:1">${esc(d.n1)}<span class="amp">&amp;</span>${esc(d.n2)}</div>
        <div class="date cv-in" style="--i:2">${esc(d.dateDots||d.dateLong)}</div>
      </div>
      <div class="bl-env cv-in" style="--i:3">
        <img class="bk" src="${A}envelope-back.webp" alt="" aria-hidden="true" decoding="async">
        <div class="bl-doily"><img src="${A}doily-cream.webp" alt="" aria-hidden="true" decoding="async"><div class="bl-dtx">${to.replace('cv-in','')}</div></div>
        <img class="ft" src="${A}envelope-front.webp" alt="" aria-hidden="true" decoding="async">
        <img class="bl-tas" src="${A}tassel-wine.webp" alt="" aria-hidden="true" decoding="async">
      </div>
      <div class="cv-slot bl-open">${open}</div>
      <img class="bl-fl bl-fl2" src="${A}flora-2.webp" alt="" aria-hidden="true" decoding="async">
    </section>`;
  }
  if(L==='teras'){
    const A=t.ilDir||'/assets/teras/', ini=esc((d.n1||'?')[0])+esc((d.n2||'?')[0]);
    const pet=[[12,6,20,0],[70,8,14,-4],[38,7,18,-8],[86,6,22,-11],[24,8,16,-14],[58,7,20,-2]].map(([x,f,w,dl],i)=>`<img src="${A}bunga${f}.webp" alt="" style="--x:${x}%;--w:${w}px;--d:${dl}s;--t:${13+i*1.6}s" decoding="async">`).join('');
    if(t.ilMode==='taman'){ const ph=S.coverPhoto || (S.gallery||[]).filter(Boolean)[0] || A+'foto.webp'; const tk=t.tm||{}, BF=tk.bf||['b1','b3'];
      const bf=[[14,30,0,0],[78,22,1,-3],[66,58,0,-6]].map(([x,y,f,dl],i)=>`<i class="tm-bf" style="--x:${x}%;--y:${y}%;--d:${dl}s;--t:${9+i*2}s"><img src="${A}${BF[f%BF.length]}.webp" alt=""></i>`).join('');
      const pet2=(tk.pet||[]).length?[[12,0,20,0],[70,1,14,-4],[38,2,18,-8],[86,0,22,-11],[24,1,16,-14],[58,2,20,-2]].map(([x,f,w,dl],i)=>`<img src="${A}${tk.pet[f%tk.pet.length]}.webp" alt="" style="--x:${x}%;--w:${w}px;--d:${dl}s;--t:${13+i*1.6}s" decoding="async">`).join(''):pet;
      return `<section class="cover cv-teras cv-taman${tk.cover==='gate'?' tm-cg':''}" id="${d.id}-cover">
      <img class="tr-bg" src="${A}sampul2.webp" alt="" decoding="async" aria-hidden="true">
      ${tk.cover==='gate'?`<img class="tm-gate" src="${A}gerbang.webp" alt="" decoding="async" aria-hidden="true"><img class="tm-sd l g" src="${A}samping.webp" alt="" decoding="async" aria-hidden="true"><img class="tm-sd r g" src="${A}samping-r.webp" alt="" decoding="async" aria-hidden="true">`:`<img class="tm-sd l" src="${A}sudut.webp" alt="" decoding="async" aria-hidden="true"><img class="tm-sd r" src="${A}sudut-r.webp" alt="" decoding="async" aria-hidden="true">
      <div class="tm-arch cv-in" style="--i:3" aria-hidden="true"><div class="ph" style="background-image:url('${esc(ph)}')"></div></div>`}
      <div class="tm-depan" aria-hidden="true">${['l','m','r'].map(k=>`<img class="tm-dp ${k}" src="${A}depan.webp" alt="" decoding="async">`).join('')}</div>
      <div class="tr-pet" aria-hidden="true">${pet2}${bf}</div>
      <div class="tr-top"><div class="k-label cv-in" style="--i:0" data-scramble="${esc(d.dateLong)}">The wedding of</div>
        <div class="names cv-in" style="--i:1">${esc(d.n1)}<span class="amp">&amp;</span>${esc(d.n2)}</div>
        <div class="date cv-in" style="--i:2">${esc(d.dateDots)}</div></div>
      <div class="tr-card"><div class="cv-slot">${to}${open}</div></div>
    </section>`; }
    return `<section class="cover cv-teras" id="${d.id}-cover">
      <img class="tr-bg" src="${A}sampul2.webp" alt="" decoding="async" aria-hidden="true">
      <img class="tr-cpl" src="${A}pasangan.webp" alt="" decoding="async" aria-hidden="true">
      <img class="tr-dahan" src="${A}dahan.webp" alt="" decoding="async" aria-hidden="true">
      <div class="tr-pet" aria-hidden="true">${pet}</div>
      <div class="tr-top"><div class="tr-badge cv-in" style="--i:0" aria-hidden="true"><img src="${A}lencana.webp" alt=""><span>${ini}</span></div>
        <div class="k-label cv-in" style="--i:1" data-scramble="${esc(d.dateLong)}">The wedding of</div>
        <div class="names cv-in" style="--i:2">${esc(d.n1)}<span class="amp">&amp;</span>${esc(d.n2)}</div>
        <div class="date cv-in" style="--i:3">${esc(d.dateDots)}</div></div>
      <div class="tr-card"><div class="cv-slot">${to}${open}</div></div>
    </section>`;
  }
  if(L==='kebun'){
    const A='/assets/kebun/'+(t.kb?t.kb+'/':''), im=(f,c)=>`<img class="kb-l ${c}" src="${A}${f}.webp" alt="" decoding="async">`;
    const cols=t.kbPet||['#EBA0BA','#F2CF63','#FFFDF8','#B7A5DD','#F6C9D6'];
    const pet=Array.from({length:12},(_,i)=>`<i style="--x:${(i*37+7)%96}%;--d:${(i*0.9)%9}s;--t:${8+(i%5)*1.5}s;--s:${.6+(i%3)*.25};--c:${cols[i%5]}"></i>`).join('');
    return `<section class="cover cv-kebun${t.kbImg||t.kbSet?' kb-img':''}${t.kbSet?' kb-set':''}" id="${d.id}-cover" style="--kb-sh:${t.kbSh||'#8E6FC0'};--kb-amp:${t.kbAmp||'#F2CF63'}">
      <div class="kb-frame" aria-hidden="true">${t.kbSet?['latar:kb-latar','bed-b:kb-bedb','pria:kb-pria','wanita:kb-wanita','kiri:kb-bk','kanan:kb-bn','bed-d:kb-bedd','atas:kb-atas'].map(x=>{const [f,c]=x.split(':'); return `<img class="kb-l kb-lap ${c}" src="${t.kbSet}${f}.webp" alt="" decoding="async">`;}).join(''):t.kbImg?`<img class="kb-l kb-lukis" src="${t.kbImg}" alt="" decoding="async">`:im('latar','kb-latar')+im('pasangan','kb-psg')+im('sudut-kiri','kb-sk')+im('sudut-kanan','kb-sn')}
        <div class="kb-txt"><div class="k-label cv-in" style="--i:0">The wedding of</div>
        <div class="names cv-in" style="--i:1">${esc(d.n1)}<span class="amp">&amp;</span>${esc(d.n2)}</div>
        <div class="date cv-in" style="--i:2">${esc(d.dateDots)}</div></div></div>
      ${t.kbImg||t.kbSet?'':`<div class="kb-bush" aria-hidden="true">${im('semak-kiri','kb-bk')}${im('semak-kanan','kb-bn')}</div>`}
      <div class="kb-pet" aria-hidden="true">${pet}</div>
      ${t.kbSet?`<div class="kb-flies" aria-hidden="true">${[[12,44,0,1],[78,40,-3,4],[30,58,-6,7],[66,62,-2,2],[18,30,-8,9],[84,56,-5,5]].map(([x,y,d,n],i)=>`<i class="kb-fly${i%2?' r':''}" style="--x:${x}%;--y:${y}%;--d:${d}s;--t:${11+i*1.7}s"><img src="${t.kbSet}kupu/${((n+(d.n1||'').length)%10)+1}.webp" alt=""></i>`).join('')}</div>`:''}
      <span class="sr">Undangan pernikahan ${esc(d.n1)} dan ${esc(d.n2)}, ${esc(d.dateLong)}</span>
      <div class="cv-slot kb-card">${to}${open}</div>
    </section>`;
  }
  if(L==='atelier'){
    const spl=(w,o)=>[...(w||'')].map((c,i)=>`<span class="at-l" style="--l:${o+i}">${c===' '?'&nbsp;':esc(c)}</span>`).join('');
    const n1=d.n1||'', n2=d.n2||'';
    return `<section class="cover cv-atelier" id="${d.id}-cover">
      <div class="at-ph"><div class="cv-photo" style="background-image:url('${d.photo}')"></div></div><div class="shade"></div>
      <div class="at-load" aria-hidden="true"><span class="at-lk">Sakara</span><b data-atpct>100</b><i>%</i></div>
      <div class="at-top cv-in" style="--i:0"><span>The wedding of</span><span>${esc(d.dateDots)}</span></div>
      <div class="at-mid">
        <div class="names" aria-label="${esc(n1)} dan ${esc(n2)}"><span class="at-w" aria-hidden="true">${spl(n1,0)}</span><span class="at-w amp" aria-hidden="true"><span class="at-l" style="--l:${[...n1].length}">&amp;</span></span><span class="at-w" aria-hidden="true">${spl(n2,[...n1].length+1)}</span></div>
        <div class="at-date cv-in" style="--i:3">${esc(d.dateLong)}</div>
      </div>
      <div class="cv-slot">${to}${open}</div>
    </section>`;
  }
  if(L==='arunika') return `<section class="cover cv-arunika" id="${d.id}-cover">
      <div class="cv-photo" style="background-image:url('${d.photo}')"></div><div class="shade"></div>
      <div class="top cv-in" style="--i:0"><span class="k-label">Wedding day</span><b class="num" data-scramble="${esc(d.dateLong)}">${esc(d.dateDots)}</b></div>
      <div class="names cv-in" style="--i:1">${esc(d.n1)}<span class="amp">&amp;</span>${esc(d.n2)}</div>
      ${ART.line('#F3E9D6').replace('class="cv-line"','class="cv-line cv-in" style="--i:2"')}
      <div class="cv-slot">${to}${open}</div>
    </section>`;
  return '';
}
const dateDots = d => { if(!d) return ''; const [y,m,dd]=d.split('-'); return `${dd}.${m}.${y.slice(2)}`; };

/* ---------- State ---------- */
const DEFAULT = {
  v:3,
  groom:{name:'Raka Pratama', nick:'Raka', parents:'Putra kedua Bapak Hendra Wijaya & Ibu Sari Utami', ig:'rakapratama'},
  bride:{name:'Sarah Amalia', nick:'Sarah', parents:'Putri pertama Bapak Agus Santoso & Ibu Ratna Dewi', ig:'sarahamalia'},
  events:[
    {type:'Akad Nikah', date:'2027-02-14', start:'08.00', end:'10.00', venue:'Masjid Agung Al-Azhar', address:'Jl. Sisingamangaraja, Kebayoran Baru, Jakarta Selatan'},
    {type:'Resepsi', date:'2027-02-14', start:'11.00', end:'14.00', venue:'Graha Sawala', address:'Jl. Medan Merdeka Barat No. 7, Jakarta Pusat'}
  ],
  opening:'islam',
  theme:'kawung', accent:null,
  gift:{on:true, bank:'BCA', acct:'8720112345', holder:'Sarah Amalia'},
  wishesOn:true, music:true, musicSrc:{type:'lib', id:'piano-senja'}, musicStart:0, gallery:[], galleryOn:true,
  slug:'raka-sarah', plan:'tamu', published:false,
  order:['salam','acara','galeri','rsvp','hadiah','kado','ucapan'], font:'tema', groups:null, user:null, invoices:[], giftNo:0,
  step:0
};
let S = Object.assign(structuredClone(DEFAULT), store.get('sp-state') || {});
// Data contoh lama (Nadia & Rizky) yang belum pernah diubah pengguna ikut berganti ke contoh baru (Sarah & Raka)
if(!S.published){ const D=DEFAULT;
  if(S.bride && S.bride.name==='Nadia Larasati' && S.bride.nick==='Nadia') S.bride={...S.bride, name:D.bride.name, nick:D.bride.nick, ig:S.bride.ig==='nadialaras'?D.bride.ig:S.bride.ig};
  if(S.groom && S.groom.name==='Rizky Pratama' && S.groom.nick==='Rizky') S.groom={...S.groom, name:D.groom.name, nick:D.groom.nick, ig:S.groom.ig==='rizkypratama'?D.groom.ig:S.groom.ig};
  if(S.gift && S.gift.holder==='Nadia Larasati') S.gift={...S.gift, holder:D.gift.holder};
  if(S.slug==='rizky-nadia') S.slug=D.slug;
  if(Array.isArray(S.groups)) S.groups=S.groups.map(g=>({'Keluarga Nadia':'Keluarga Sarah','Keluarga Rizky':'Keluarga Raka','Kantor Rizky':'Kantor Raka'})[g]||g); }
if(S.v !== DEFAULT.v) S = structuredClone(DEFAULT);
const DEMO = {on:false, saved:null, sid:null, t0:0, src:'', nudged:{}, lastNudge:0};
const save = () => { try{ edTrack(); }catch(e){} if(DEMO.on) return; if(CLOUD.guestMode||CLOUD.pinMode||CLOUD.famMode||CLOUD.catMode) return; cloudSave(); if(!store.set('sp-state', S) && !save.warned){ save.warned=1; toast('Memori browser penuh: foto tetap tampil, tapi hilang saat halaman ditutup'); } const el = $('#saveState'); if(el) el.textContent = 'Tersimpan otomatis'; };

const OPENINGS = {
  islam:{salam:'Assalamu’alaikum Warahmatullahi Wabarakatuh', text:'Dengan memohon rahmat dan ridha Allah SWT, kami bermaksud menyelenggarakan pernikahan putra-putri kami.', quote:'“Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya.” — QS. Ar-Rum: 21'},
  kristen:{salam:'Salam sejahtera dalam kasih Tuhan', text:'Dengan penuh syukur kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberi doa restu pada pernikahan kami.', quote:'“Demikianlah mereka bukan lagi dua, melainkan satu.” — Matius 19:6'},
  umum:{salam:'Dengan penuh sukacita', text:'Kami mengundang Bapak/Ibu/Saudara/i untuk merayakan hari bahagia kami bersama keluarga dan sahabat.', quote:'“Rumah adalah tempat di mana kita saling menemukan, setiap hari.”'}
};

/* sample data */
const FIRST = ['Ani','Budi','Citra','Dimas','Eka','Fajar','Gita','Hendra','Indah','Joko','Kartika','Lukman','Maya','Nanda','Oki','Putri','Rahmat','Sinta','Taufik','Utami','Vina','Wahyu','Yudi','Zahra','Arif','Bella','Doni','Fitri','Galih','Hana','Irfan','Laras','Mira','Rudi','Sari','Tono','Wulan','Yoga','Dewi','Bagas'];
const LAST = ['Wulandari','Santoso','Lestari','Saputra','Pratiwi','Nugroho','Hidayat','Siregar','Rahayu','Kusuma','Harahap','Wibowo','Permata','Setiawan','Gunawan','Simanjuntak','Anggraini','Putra','Halim','Darmawan'];
const GROUPS = ['Keluarga Sarah','Keluarga Raka','Kantor Raka','Teman kampus','Tetangga'];
const GROUPS_REAL = ['Keluarga mempelai wanita','Keluarga mempelai pria','Teman','Rekan kerja','Tetangga'];
function seedGuests(){
  let x = 7; const rnd = () => (x = (x*9301+49297)%233280)/233280;
  const g = [];
  for(let i=0;i<64;i++){
    const r = rnd();
    const status = r < .52 ? 'hadir' : r < .65 ? 'tidak' : 'belum';
    const sent = status !== 'belum' || rnd() < .55;
    g.push({id:'g'+i, name:`${FIRST[i%FIRST.length]} ${LAST[(i*7)%LAST.length]}`, group:GROUPS[i%GROUPS.length], phone:'08'+(1200000000+Math.floor(rnd()*899999999)), status: sent?status:'belum', pax: status==='hadir'? (1+Math.floor(rnd()*3)) : 0, sent});
  }
  g[0].name='Ani Wulandari'; g[0].status='hadir'; g[0].pax=2; g[0].sent=true;
  return g;
}
let G = store.get('sp-guests') || seedGuests();
function makeCode(g){ const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let h=7; for(const c of (g.id+g.name)) h=(h*31+c.charCodeAt(0))>>>0; let code; do{ let x=h, s=''; for(let i=0;i<4;i++){ s+=A[x%32]; x=Math.floor(x/32); } code='SP-'+s; h=(h*1103515245+12345)>>>0; } while(G.some(o=>o!==g && o.code===code)); return code; }
G.forEach(g=>{ if(!Array.isArray(g.sessions)) g.sessions = (S.events.length>1 && /Kantor|Tetangga/.test(g.group)) ? [S.events.length-1] : S.events.map((e,i)=>i); if(!g.code) g.code=makeCode(g); });
if(!S.groups) S.groups=[...GROUPS];
let G_ALL = null;
const saveG = () => { if(DEMO.on||CLOUD.guestMode||CLOUD.pinMode||CLOUD.famMode||CLOUD.catMode) return; if(!CLOUD.uid) store.set('sp-guests', G); cloudSyncGuests(); };
saveG();
let W = store.get('sp-wishes') || [
  {n:'Ani Wulandari', t:'2 jam lalu', m:'Selamat Sarah & Raka! Semoga jadi keluarga yang sakinah, mawaddah, warahmah. Sampai ketemu di Graha Sawala ya.', att:true, show:true},
  {n:'Om Darmawan', t:'5 jam lalu', m:'Barakallah, semoga lancar sampai hari H. Salam untuk Bapak dan Ibu.', att:true, show:true},
  {n:'Teman kantor Raka', t:'kemarin', m:'Congrats bro! Akhirnya. Kami datang rombongan setelah Jumatan, aman.', att:true, show:true},
  {n:'Bella Permata', t:'kemarin', m:'Maaf belum bisa hadir karena di luar kota, doa terbaik untuk kalian berdua.', att:false, show:true},
  {n:'Hana Halim', t:'2 hari lalu', m:'Happy wedding Sarah sayang, cantik banget undangannya!', att:true, show:true}
];
const saveW = () => { if(DEMO.on||CLOUD.guestMode||CLOUD.pinMode||CLOUD.famMode||CLOUD.catMode||CLOUD.uid) return; store.set('sp-wishes', W); };
let GIFTS = [
  {n:'Om Darmawan', bank:'BCA', amt:500000, t:'Hari ini, 09.12'},
  {n:'Fitri Rahayu', bank:'BCA', amt:250000, t:'Kemarin, 20.41'},
  {n:'Keluarga Halim', bank:'BCA', amt:1000000, t:'Kemarin, 18.05'}
];

/* ---------- Invitation renderer ---------- */
const SECTION_LABELS = {salam:'Salam & mempelai', acara:'Waktu & tempat', galeri:'Galeri foto', rsvp:'Konfirmasi kehadiran', hadiah:'Tanda kasih', kado:'Kado patungan', cerita:'Kisah cinta', ucapan:'Ucapan & doa'};
const FONTS = {tema:['Bawaan tema',null], bodoni:['Bodoni Moda',"'Bodoni Moda', Georgia, serif"], cormorant:['Cormorant Garamond',"'Cormorant Garamond', Georgia, serif"], marcellus:['Marcellus',"'Marcellus', Georgia, serif"], script:['Great Vibes',"'Great Vibes', 'Cormorant Garamond', cursive"]};
const FONT_PAIRS = {
  klasik:{name:'Klasik & Mewah', note:'Timeless', h:"'Playfair Display', Georgia, serif", sub:"'Montserrat', 'Plus Jakarta Sans', sans-serif", body:"'Lora', Georgia, serif", gf:'family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Montserrat:wght@500;600&family=Lora:ital,wght@0,400;0,500;1,400'},
  modern:{name:'Modern & Minimalis', note:'Contemporary', h:"'Great Vibes', cursive", sub:"'Plus Jakarta Sans', system-ui, sans-serif", body:"'Inter', system-ui, sans-serif", script:true, gf:'family=Great+Vibes&family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600'},
  romantis:{name:'Romantis & Manis', note:'Romantic', h:"'Parisienne', cursive", sub:"'Lato', system-ui, sans-serif", body:"'Open Sans', system-ui, sans-serif", script:true, gf:'family=Parisienne&family=Lato:wght@400;700&family=Open+Sans:wght@400;500;600'}
};
const fontPair = () => FONT_PAIRS[S.fontPair] || null;
const fpLoaded = new Set();
function loadFontPair(k){ const fp=FONT_PAIRS[k]; if(!fp || fpLoaded.has(k)) return; fpLoaded.add(k); const l=document.createElement('link'); l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?'+fp.gf+'&display=swap'; document.head.appendChild(l); }
const fontOf = () => { const fp=fontPair(); if(fp){ loadFontPair(S.fontPair); return fp.h; } return (FONTS[S.font]||FONTS.tema)[1]; };
const fontPairVars = () => { const fp=fontPair(); return fp ? `--t-body:${fp.body};--t-sub:${fp.sub};` : ''; };
function qrSVG(text, px=168){
  try{ if(typeof qrcode==='function'){ const q=qrcode(0,'M'); q.addData(String(text)); q.make(); const n=q.getModuleCount(); const cs=Math.max(2,Math.floor(px/(n+4))); return q.createSvgTag({cellSize:cs, margin:cs*2, scalable:true}); } }catch(e){}
  return `<div class="qr-fallback" role="img" aria-label="Kode ${esc(text)}" data-qr="${esc(text)}" data-px="${+px||168}">${esc(text)}</div>`;
}
/* skrip QR dimuat belakangan (tidak menahan tampilan pertama): ganti kotak sementara begitu siap */
window.qrReady=()=>{ document.querySelectorAll('.qr-fallback[data-qr]').forEach(el=>{ const t=document.createElement('div'); t.innerHTML=qrSVG(el.dataset.qr, +el.dataset.px||168); const n=t.firstElementChild; if(n && !n.classList.contains('qr-fallback')) el.replaceWith(n); }); };
/* ---------- Info acara: zona waktu, susunan acara, dress code, siaran langsung ---------- */
const TZ_OFF = {WIB:7, WITA:8, WIT:9};
const evTz = e => TZ_OFF[e&&e.tz] ? e.tz : 'WIB';
const tzName = off => ({7:'WIB',8:'WITA',9:'WIT'})[off] || 'waktu setempat';
function guestOffset(d){ try{ return -new Date((d||new Date().toISOString().slice(0,10))+'T12:00:00').getTimezoneOffset()/60; }catch(e){ return 7; } }
function shiftHM(hm, h){ const m=toMin(hm); if(m==null) return hm; return fromMin(((m+Math.round(h*60))%1440+1440)%1440); }
// Waktu acara dalam UTC (ms); dipakai kalender, status siaran langsung
function evUTC(e, hm){ const m=toMin(hm); if(!e||!e.date||m==null) return null; const [y,mo,d]=e.date.split('-').map(Number); return Date.UTC(y,mo-1,d,0,m) - TZ_OFF[evTz(e)]*36e5; }
function evTimeHTML(e){
  if(!e.start) return {main:'', alt:''};
  const tz=evTz(e), g=guestOffset(e.date), diff=g-TZ_OFF[tz];
  const main=`${esc(e.start)}${e.end?` – ${esc(e.end)}`:' – selesai'} ${tz}`;
  const alt = diff ? `<span class="ev-tz">${ico('pin')}Di zona waktu Anda pukul ${shiftHM(e.start,diff)}${e.end?` – ${shiftHM(e.end,diff)}`:''} ${tzName(g)}</span>` : '';
  return {main, alt};
}
function rundownItems(e){ return String((e&&e.rundown)||'').split('\n').map(l=>l.trim()).filter(Boolean).slice(0,12).map(l=>{ const m=l.match(/^(\d{1,2}[.:]\d{2})(?:\s*[-–]\s*(\d{1,2}[.:]\d{2}))?\s*[-–:|]?\s*(.*)$/); return m ? {t:m[1].replace(':','.')+(m[2]?' – '+m[2].replace(':','.'):''), x:m[3]} : {t:'', x:l}; }); }
const DC_COLORS = [['#F4EDE1','Krem'],['#E8C9C3','Dusty pink'],['#C98B8B','Mauve'],['#9E3D4D','Marun'],['#B9C7A8','Sage'],['#5E7A5B','Hijau zaitun'],['#B7C9DD','Biru muda'],['#2F4A6B','Navy'],['#D9B26A','Emas'],['#B07A54','Terakota'],['#8C7B6B','Cokelat susu'],['#2B2B2B','Hitam']];
const dcName = c => (DC_COLORS.find(x=>x[0].toLowerCase()===String(c).toLowerCase())||[0,c])[1];
const liveUrl = u => { u=String(u||'').trim(); if(!u) return ''; if(!/^https?:\/\//i.test(u)) u='https://'+u; return /^https?:\/\/[^\s"'<>]+\.[^\s"'<>]+$/i.test(u) ? u : ''; };
function evLiveNow(e){ const a=evUTC(e,e.start); if(a==null) return false; const b=evUTC(e,e.end)||a+3*36e5, n=Date.now(); return n>=a-30*6e4 && n<=b+60*6e4; }
function evExtraHTML(e){
  const rd=rundownItems(e), dc=String(e.dress||'').trim(), cols=(e.dcol||[]).filter(c=>/^#[0-9a-f]{6}$/i.test(c)), live=liveUrl(e.live);
  if(!rd.length && !dc && !cols.length && !live) return '';
  return `<div class="ev-x">
    ${rd.length?`<div class="ev-xb"><span class="ev-xl">Susunan acara</span><ol class="ev-rd">${rd.map(r=>`<li>${r.t?`<b class="num">${esc(r.t)}</b>`:'<b></b>'}<span>${esc(r.x)}</span></li>`).join('')}</ol></div>`:''}
    ${dc||cols.length?`<div class="ev-xb"><span class="ev-xl">Dress code</span>${dc?`<p>${esc(dc)}</p>`:''}${cols.length?`<div class="ev-dc">${cols.map(c=>`<span><i style="background:${c}"></i>${esc(dcName(c))}</span>`).join('')}</div>`:''}</div>`:''}
    ${live?`<div class="ev-xb"><span class="ev-xl">Siaran langsung${evLiveNow(e)?' <em class="ev-on">Sedang tayang</em>':''}</span><p>Belum bisa hadir? Ikuti momennya dari mana saja.</p><a class="ibtn" href="${esc(live)}" target="_blank" rel="noopener">${ico('play')}Tonton siaran langsung</a></div>`:''}
  </div>`;
}
/* ---------- Halaman kenangan: setelah acara selesai, undangan berubah jadi halaman terima kasih ---------- */
function memEnd(){ const ev=S.events.filter(e=>e&&e.date); if(!ev.length) return null; return Math.max(...ev.map(e=> evUTC(e,e.end) || ((evUTC(e,e.start)||evUTC(e,'08.00'))+3*36e5))); }
function memActive(opts){ if(opts && opts.mem) return true; const m=S.memMode||'auto'; if(m==='on') return true; if(m==='off') return false; const t=memEnd(); return t!=null && Date.now() > t + 3*36e5; }
const MEM_MSG = 'Setiap doa, ucapan, dan foto dari kalian kami simpan di sini, supaya hari itu bisa kami buka lagi kapan pun.';
function memAlbumHref(){ try{ return CLOUD.guestMode ? `/u/${CLOUD.slug}/album` : albumLink(); }catch(e){ return '#album'; } }
function memSecHTML(id, guest){
  const ws=W.filter(w=>w.show), first=S.events.find(e=>e.date);
  const msg=String(S.memMsg||'').trim()||MEM_MSG;
  return `<section id="${id}-kenangan" class="p-mem">
    <span class="kick">Kenangan</span>
    <h3>Terima kasih sudah menjadi bagian dari cerita kami</h3>
    <p class="lead">${esc(msg)}</p>
    <div class="mem-stats"><div><b class="num">${ws.length>=30?'30+':ws.length}</b><small>doa &amp; ucapan</small></div><div><b class="num" data-memcount>…</b><small>foto dari tamu</small></div>${first?`<div><b class="num mem-d">${esc(dateDots(first.date))}</b><small>hari bahagia</small></div>`:''}</div>
    <div class="mem-photos" data-memphotos></div>
    ${ws.length?`<div class="mem-wish">${ws.slice(0,6).map(w=>`<figure><blockquote>${esc(w.m)}</blockquote><figcaption>${esc(w.n)}</figcaption></figure>`).join('')}</div>`:''}
    <div class="acts"><a class="ibtn solid" href="${esc(memAlbumHref())}" target="_blank" rel="noopener">${ico('camera')}Lihat &amp; tambah foto</a><button type="button" class="ibtn" data-act="souvenir" data-guest="${esc(guest)}">${ico('down')}Simpan kartu kenangan</button></div>
  </section>`;
}
let MEM_PH = null;
async function memPhotos(){
  if(CLOUD.on && CLOUD.guestMode){ if(!MEM_PH) MEM_PH = CLOUD.sb.rpc('album_info',{p_slug:CLOUD.slug}).then(({data})=>((data&&data.photos)||[]).map(p=>({url:CLOUD.sb.storage.from('album').getPublicUrl(p.path).data.publicUrl, name:p.name}))).catch(()=>[]); return MEM_PH; }
  return (typeof ALB!=='undefined'?ALB:[]).filter(p=>!p.hidden).map(p=>({url:alUrl(p), name:p.name})).filter(p=>p.url);
}
async function memFill(root){
  const box=root.querySelector('[data-memphotos]'); if(!box || box.dataset.done) return; box.dataset.done=1;
  const ph=await memPhotos(); const c=root.querySelector('[data-memcount]'); if(c) c.textContent=ph.length>=400?'400+':ph.length;
  box.innerHTML = ph.length ? ph.slice(0,9).map((p,i)=>`<a href="${esc(memAlbumHref())}" target="_blank" rel="noopener" style="background-image:url('${esc(p.url)}')" aria-label="Foto ${i+1}${p.name?' dari '+esc(p.name):''}">${i===8&&ph.length>9?`<span>+${ph.length-9}</span>`:''}</a>`).join('')
    : `<p class="mem-empty">${ico('camera')}Belum ada foto dari tamu. Punya foto dari hari itu? Bagikan di album, ya.</p>`;
}
/* ---------- Kuota tamu per undangan ---------- */
const guestQuota = g => { if(!g) return 0; const own = S.seats && S.seats[g.id]; const n = own!=null && own!=='' ? +own : +(S.seatsDefault||0); return n>0 ? Math.min(n,12) : 0; };
function guestEvents(g){
  const ev = S.events.map((e,i)=>({...e,i})).filter(e=>e.type||e.date||e.venue);
  if(!g || !Array.isArray(g.sessions) || !g.sessions.length) return ev;
  const f = ev.filter(e=>g.sessions.includes(e.i)); return f.length?f:ev;
}
function sessionNames(g){
  const valid = S.events.map((e,i)=>i);
  if(!g.sessions || !g.sessions.length || valid.every(i=>g.sessions.includes(i))) return 'Semua acara';
  return g.sessions.map(i=>S.events[i]?.type).filter(Boolean).join(' + ') || 'Semua acara';
}
function passHTML(g){
  return `<div class="pass"><div class="k-label" style="color:#7D1D3F">Kartu masuk</div><div class="qr">${qrSVG(g.code)}</div><b class="pc">${esc(g.code)}</b><p>Tunjukkan ke penerima tamu saat datang${g.pax?` · ${g.pax} orang`:''}.</p></div>`;
}
function rsvpDone(g, att, pax){
  return `<div class="ok-box"><b style="font-family:var(--t-font);font-size:24px">Terima kasih, ${esc(g?g.name:'')}</b><p style="margin-top:6px;font-size:14px">${att==='hadir'?`Kami catat ${pax} orang akan hadir${g&&g.arrive?`, perkiraan datang pukul ${esc(g.arrive)}`:''}. Sampai jumpa di hari bahagia kami.`:'Terima kasih sudah mengabari. Doa Anda tetap sangat berarti bagi kami.'}</p>${att==='hadir'&&g?passHTML(g):''}<button class="ibtn" style="margin-top:12px" data-act="rsvp-again" data-gid="${g?esc(g.id):''}">Ubah jawaban</button></div>`;
}
/* ---------- Koleksi Custom: tema foto yang dirender di iframe /custom/<dir>/, data diambil dari undangan Sakara ---------- */
var CX_THEMES = [
  {id:'cx-drapery', dir:'drapery', name:'Drapery Emerald', region:'Custom', lang:'id', tags:['Custom','Klasik'], desc:'Tirai beludru yang terbuka, renda keluar dari amplop, dan rangkaian bunga kering. Klasik dan khidmat.', bg:'#13301f', fg:'#efe6d6', accent:'#5b0f16', soft:'#1d4430', font:"'Cormorant Garamond', Georgia, serif"},
  {id:'cx-photobox', dir:'photobox', name:'Photobox Archives', region:'Custom', lang:'en', tags:['Custom','Santai'], desc:'Polaroid bertempel selotip, profil mempelai seperti formulir, dan kalender dengan coretan tangan. Santai dan jenaka.', thumbPos:'center 42%', bg:'#4a0b11', fg:'#efe9df', accent:'#8e1c22', soft:'#5c1219', font:"'Cormorant Garamond', Georgia, serif"},
  {id:'cx-encore', dir:'encore', name:'Encore', region:'Custom', lang:'id', tags:['Custom','Meriah'], desc:'Malam pertunjukan di bawah langit ungu: tiket bioskop yang disobek, pita berjalan, papan acara bioskop, dan gulungan film. Meriah dan sinematik.', bg:'#120a26', fg:'#fbf7ff', accent:'#c04a85', soft:'#241040', font:"'Poiret One', Georgia, serif"},
  {id:'cx-tepilaut', dir:'tepilaut', name:'Tepi Laut', region:'Custom', lang:'id', tags:['Custom','Interaktif'], desc:'Undangan geser bercerita: satu hari di pantai, dari matahari terbit, senja jingga, sampai bulan purnama. Langit dan laut berganti waktu setiap tamu menggeser halaman.', bg:'#f3e2c4', fg:'#1f2d3a', accent:'#2e7d8c', soft:'#fff8ee', font:"'Fraunces', Georgia, serif"},
  {id:'cx-lembarharian', dir:'lembarharian', name:'Lembar Harian', region:'Custom', lang:'id', tags:['Custom','Interaktif'], desc:'Undangan berupa buku harian yang dibalik halaman demi halaman: tulisan tangan, polaroid bertempel washi tape, dan bunga kering di kertas bergaris.', bg:'#fbf3e4', fg:'#2c3550', accent:'#b36a6e', soft:'#efe3cc', font:"'Caveat', cursive"},
  {id:'cx-pasarmalam', dir:'pasarmalam', name:'Pasar Malam', region:'Custom', lang:'id', tags:['Custom','Interaktif'], desc:'Undangan meriah ala pasar malam: sobek karcis untuk masuk gerbang, lampu bohlam berkelip, balon yang bisa diletuskan, dan bianglala di ujung malam.', bg:'#1e2140', fg:'#2b2234', accent:'#b8322e', soft:'#fbefd9', font:"'Pacifico', cursive"},
  {id:'cx-jendelabulan', dir:'jendelabulan', name:'Jendela Bulan', region:'Custom', lang:'id', tags:['Custom','Interaktif'], desc:'Undangan islami yang elegan di balik jendela lengkung: lentera berayun, bintang segi delapan, dan bulan yang perlahan menjadi purnama selama tamu membaca.', bg:'#fbf7ee', fg:'#233a33', accent:'#1f4d3f', soft:'#f3ebd9', font:"'Pinyon Script', cursive"},
  {id:'cx-lipatkertas', dir:'lipatkertas', name:'Lipat Kertas', region:'Custom', lang:'id', tags:['Custom','Interaktif'], desc:'Undangan origami yang manis: amplop kertas dibuka dan surat keluar, setiap lembar terbuka saat digulir, bangau kertas terbang lewat, dan hati origami bisa diterbangkan tamu.', bg:'#fffdf9', fg:'#3a3438', accent:'#c9767b', soft:'#f7f4ef', font:"'DM Serif Display', Georgia, serif"},
  {id:'cx-kolase', dir:'kolase', name:'Kolase', region:'Custom', lang:'id', tags:['Custom','Modern'], desc:'Potongan kertas berlapis ala kolase Matisse: daun terakota, gumpalan sage, dan matahari mustard di atas kertas krem. Hangat, artistik, dan ceria.', bg:'#f3ebdd', fg:'#3a2a22', accent:'#c2623f', soft:'#ece0cc', font:"'DM Serif Display', Georgia, serif"},
  {id:'cx-coretan', dir:'coretan', name:'Coretan Merah', region:'Custom', lang:'id', tags:['Custom','Jenaka'], desc:'Ilustrasi tangan bertinta merah dan foto masa kecil di dalam bingkai. Untuk pasangan yang sudah kenal sejak bocil.', bg:'#f6f2ee', fg:'#2b1d1a', accent:'#8c1c13', soft:'#efe6df', font:"'Cormorant Garamond', Georgia, serif"}
];
const CX_LOOK = {
  drapery:{pal:[['','Emerald','#13301f'],['navy','Biru malam','#0e1a2e'],['arang','Arang','#1c1b1a']], font:[['','Bawaan',"'Pinyon Script', cursive"],['great','Great Vibes',"'Great Vibes', cursive"],['parisienne','Parisienne',"'Parisienne', cursive"]]},
  photobox:{pal:[['','Wine','#4a0b11'],['navy','Navy','#101b33'],['hutan','Hijau hutan','#0f2a1c']], font:[['','Bawaan',"'Yellowtail', cursive"],['dancing','Dancing Script',"'Dancing Script', cursive"],['satisfy','Satisfy',"'Satisfy', cursive"]]},
  tepilaut:{pal:[['','Biru laut','#2e7d8c']], font:[['','Bawaan',"'Fraunces', Georgia, serif"]]},
  lembarharian:{pal:[['','Dusty pink','#b36a6e']], font:[['','Bawaan',"'Caveat', cursive"]]},
  pasarmalam:{pal:[['','Merah karnaval','#b8322e']], font:[['','Bawaan',"'Pacifico', cursive"]]},
  jendelabulan:{pal:[['','Hijau zamrud','#1f4d3f']], font:[['','Bawaan',"'Pinyon Script', cursive"]]},
  lipatkertas:{pal:[['','Merah muda','#c9767b']], font:[['','Bawaan',"'DM Serif Display', Georgia, serif"]]},
  kolase:{pal:[['','Terakota','#c2623f'],['laut','Biru laut','#2f5f96'],['zaitun','Hijau zaitun','#5e7036']], font:[['','Bawaan',"'DM Serif Display', Georgia, serif"]]},
  encore:{pal:[['','Ungu malam','#241040']], font:[['','Bawaan',"'Yellowtail', cursive"]]},
  coretan:{pal:[['','Merah','#8c1c13'],['biru','Biru','#1f3a6b'],['hijau','Hijau','#285238']], font:[['','Bawaan',"'Permanent Marker', cursive"],['rock','Rock Salt',"'Rock Salt', cursive"],['amatic','Amatic SC',"'Amatic SC', cursive"]]}
};
const CX_OPEN_EN = {islam:{salam:'Assalamu’alaikum Warahmatullahi Wabarakatuh', text:'By the grace of Allah, we joyfully invite you to celebrate our wedding.', quote:'“And among His signs is that He created for you spouses from among yourselves, that you may find tranquility in them; and He placed between you affection and mercy.” — QS. Ar-Rum: 21'}, kristen:{salam:'Grace and peace to you', text:'With grateful hearts, we invite you to witness and bless our marriage.', quote:'“So they are no longer two, but one flesh.” — Matthew 19:6'}, umum:{salam:'With great joy', text:'We invite you to celebrate our wedding day with our families and friends.', quote:'“Home is where we find each other, every single day.”'}};
const cxLook = t => (((S.cx||{}).look||{})[t.dir])||{};
const cxLang = t => ((S.cx||{}).lang && (S.cx||{}).lang[t.dir]) || t.lang;
CX_THEMES.forEach(t=>{ t.cx=true; t.pat=()=>'none'; t.size='auto'; t.thumbImg=`/assets/thumbs/${t.id}.webp`; });
function cxTheme(id){ return (CX_THEMES||[]).find(t=>t.id===id) || null; }
function isCx(id){ return !!cxTheme(id); }
/* Bagian tema Custom yang bisa diurutkan & disembunyikan (quote selalu di atas, penutup selalu di bawah) */
const CX_SECTIONS = [['couple','Mempelai'],['date','Tanggal & acara'],['dresscode','Dress code'],['gift','Wedding gift'],['rsvp','RSVP & ucapan'],['story','Cerita'],['gallery','Galeri']];
function cxParents(p){ p=String(p||'').trim(); const m=p.match(/^(.*?)\s*(?:Bapak|Bpk\.?)\s+(.+?)\s*(?:&|dan)\s*(?:Ibu\.?)\s+(.+)$/i);
  if(!m) return {line:p, father:'', mother:''}; const l=m[1].trim().replace(/\s+dari$/i,''); return {line:l?l+' dari':'', father:m[2].trim(), mother:m[3].trim()}; }
function cxTime(e){ if(!e) return ''; const tz=(typeof evTz==='function'?evTz(e):'WIB'); return e.start ? `${e.start}${e.end?' – '+e.end:''} ${tz}` : ''; }
function cxData(id){
  const t=cxTheme(id), D=structuredClone(((window.INVITE_DEFAULTS||{})[t.dir])||{}), X=S.cx||{};
  const d=Object.assign(D, {theme:t.dir, slug:S.slug});
  const person=(w)=>{ const p=S[w]||{}, pr=cxParents(p.parents), x=(X.couple||{})[w]||{};
    return {...D.couple[w], name:p.name||'', short:p.nick||'', instagram:(p.ig||'').replace(/^@/,''), parentsLine:pr.line, father:pr.father, mother:pr.mother, knownFor:x.knownFor||'', bio:x.bio||''}; };
  d.couple={bride:person('bride'), groom:person('groom')};
  const ev=S.events||[], akad=ev.find(e=>/akad|pemberkatan|holy|janji|sakramen/i.test(e.type||'')), res=ev.find(e=>/resepsi|reception|pesta/i.test(e.type||''))||ev.filter(e=>e!==akad).slice(-1)[0];
  const evMap=e=>e&&e.venue ? 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(`${e.venue} ${e.address||''}`) : '';
  const evo=e=>e?{time:cxTime(e), venue:e.venue||'', address:e.address||'', date:e.date||'', start:e.start||'', off:({WIB:7,WITA:8,WIT:9})[typeof evTz==='function'?evTz(e):'WIB']||7, maps:evMap(e)}:{time:'',venue:'',address:'',date:'',start:'',maps:''};
  const main=res||akad||ev[0];
  d.event={date:(ev.find(e=>e.date)||{}).date||D.event.date, akad:evo(akad), resepsi:evo(res||(!akad?ev[0]:null)), mapsUrl: main&&main.venue ? 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(`${main.venue} ${main.address||''}`) : ''};
  const g=S.gift||{}, xg=X.gift||{};
  d.gift={...D.gift, ...xg, address:xg.address||'', contacts:Object.values(xg.contacts||{}).filter(c=>c&&(c.name||c.phone)), accounts:[...(g.acct?[{bank:g.bank||'', number:String(g.acct).replace(/(\d{4})(?=\d)/g,'$1 '), holder:g.holder||''}]:[]), ...Object.values(xg.extra||{}).filter(a=>a&&(a.bank||a.number)).map(a=>({bank:a.bank||'', number:String(a.number||'').replace(/(\d{4})(?=\d)/g,'$1 '), holder:a.holder||''}))]};
  const q=(cxLang(t)==='en' && S.quoteMode!=='custom' && S.quoteMode!=='none') ? ((CX_OPEN_EN[S.opening||'islam']||CX_OPEN_EN.umum).quote) : quoteText(); if(X.quote) d.quote=X.quote; else if(q){ const i=q.lastIndexOf('—'); d.quote = i>0 ? {text:q.slice(0,i).trim(), source:q.slice(i+1).trim()} : {text:q, source:''}; } else d.quote={text:'',source:''};
  const st=S.story&&S.story.on&&(S.story.items||[]).length ? {title:(X.story&&X.story.title)||D.story.title, items:S.story.items.map(it=>({title:[it.title,it.date].filter(Boolean).join(' · '), text:it.text||'', img:it.img||''}))} : {title:D.story.title, items:[]};
  d.story=st;
  d.dresscode={...D.dresscode, text:'', label:'', colors:[]}; d.gallery={...D.gallery, caption:''};
  ['dresscode','closing','gallery'].forEach(k=>{ if(X[k]) d[k]={...d[k], ...X[k]}; });
  d.hashtag = '#'+[S.bride.nick,S.groom.nick].filter(Boolean).map(n=>String(n).replace(/\s+/g,'')).join('Dan');
  ['hashtag','guestDefault','coverTitle'].forEach(k=>{ if(X[k]!==undefined) d[k]=X[k]; });
  /* foto: unggahan pasangan menggantikan contoh; foto Sakara (galeri, sampul, mempelai) dipakai bila foto khusus belum diisi */
  const ph={...D.photos}, gal=(S.gallery||[]).filter(Boolean);
  Object.keys(ph).forEach((k,i)=>{ const m=k.match(/^(g|strip|row|story)(\d)$/); if(m && gal.length){ const n=+m[2]-1; if(m[1]==='g' && gal[n]) ph[k]=gal[n]; } });
  if(S.bride.photo) ph.bride=S.bride.photo; if(S.groom.photo) ph.groom=S.groom.photo;
  Object.assign(ph, X.photos||{}); d.photos=ph;
  const sec={...D.sections, ...(X.sections||{})}; sec.rsvp = S.wishesOn!==false; sec.gift = S.gift?S.gift.on!==false:true; sec.story = !!(S.story&&S.story.on&&(S.story.items||[]).length); d.sections=sec;
  { const P0=cxPh0(t); d._sample = Object.keys(P0).filter(k=>ph[k]===P0[k]); } d._editor = !CLOUD.guestMode;
  d.music={src: S.music===false ? '' : musicURL(), start: +S.musicStart||0};
  d._order = X.order || null;
  const lk=cxLook(t), lang=cxLang(t); d._palette=lk.pal||''; d._font=lk.font||''; d._lang=lang;
  const op=S.opening||'islam', O=(lang==='en'?CX_OPEN_EN:OPENINGS)[op]||(lang==='en'?CX_OPEN_EN.umum:OPENINGS.umum); d._opening={salam:O.salam||'', text:O.text||'', arabic:op==='islam'};
  const past = memEnd()!=null && Date.now()>memEnd();
  d._extras = ev.filter(e=>e.type||e.date||e.venue).map(e=>({label:e.type||'', rundown:rundownItems(e), live:liveUrl(e.live), liveNow:(()=>{ try{ return evLiveNow(e); }catch(_){ return false; } })(), past})).filter(x=>x.rundown.length||x.live);
  const dcE=ev.find(e=>String(e.dress||'').trim()||(e.dcol||[]).length);
  if(dcE){ const cols=(dcE.dcol||[]).filter(c=>/^#[0-9a-f]{6}$/i.test(c)); d.dresscode={...d.dresscode, text:String(dcE.dress||'').trim()||(d.dresscode||{}).text||'', colors:cols.length?cols:(d.dresscode||{}).colors||[], label:cols.length?cols.map(dcName).join(' · '):((d.dresscode||{}).label||'')}; }
  try{ const g=guestObj(); d._quota = g ? guestQuota(g) : 0; }catch(_){ d._quota=0; }
  d._mem = memActive({mem: typeof EDIT!=='undefined' && EDIT.on && EDIT.panel==='kenangan'}) ? {msg:String(S.memMsg||'').trim()||MEM_MSG, album:memAlbumHref(), photos:(CX_MEMPH||[]).slice(0,6)} : null;
  d._host = true;
  d._wishes = (W||[]).filter(w=>w.show!==false).map(w=>({n:w.n||'', a:w.att==='tidak'||w.att===false?'tidak':'hadir', m:w.m||'', t:w.t||''}));
  return d;
}
let CX_MEMPH=[];
function cxMemLoad(){ if(!memActive()) return; Promise.resolve(memPhotos()).then(l=>{ CX_MEMPH=(l||[]).map(p=>p.url||p).filter(Boolean); cxPostAll(); }).catch(()=>{}); }
const CX_SEC2PANEL = {quote:'cx:sampul', couple:'cx:couple', date:'cx:date', event:'cx:date', dresscode:'cx:dresscode', gift:'cx:gift', rsvp:'cx:rsvp', story:'cx:story', gallery:'cx:gallery', closing:'cx:closing', memory:'kenangan'};
const CX_PANEL2SEC = {mempelai:['couple'], acara:['date','event','dresscode'], hadiah:['gift'], rsvp:['rsvp'], ucapan:['rsvp'], cerita:['story'], galeri:['gallery'], salam:['quote'], kenangan:['memory'], tema:[], urutan:[], musik:['music'], link:[], kado:[]};
let CX_PICKED=false;
function cxEdMark(){ const f=$('#edScreen iframe.cx-frame'); if(!f||!f.contentWindow) return; const sc=!CX_PICKED; CX_PICKED=false; const secs = String(EDIT.panel).startsWith('cx:') ? ((CX_PANEL_DEF[EDIT.panel.slice(3)]||[])[2]||[]) : (CX_PANEL2SEC[EDIT.panel]||[]); try{ f.contentWindow.postMessage({type:'sakara:mark', sections:secs, scroll:sc}, '*'); }catch(e){} }
/* Foto contoh yang memang tampil di tema (Coretan tidak memakai foto mempelai satu per satu) */
const CX_PH_UNUSED = {coretan:['bride','groom']};
/* Isian editor disembunyikan bila tema Custom yang dipakai tidak menampilkannya */
const cxDir = () => isCx(S.theme) ? (cxTheme(S.theme)||{}).dir : '';
const cxNoIG = () => cxDir()==='photobox';
const cxNoSolo = () => cxDir()==='coretan';
function cxPh0(t){ const P=Object.assign({}, (((window.INVITE_DEFAULTS||{})[t.dir])||{}).photos||{}); (CX_PH_UNUSED[t.dir]||[]).forEach(k=>delete P[k]); return P; }
function cxSampleLeft(){ const t=cxTheme(S.theme); if(!t) return 0; const D=cxPh0(t), d=cxData(t.id); return Object.keys(D).filter(k=>d.photos[k]===D[k]).length; }
function cxFrameHTML(id, opts={}){
  setTimeout(cxMemLoad, 0);
  const t=cxTheme(id); const demo = !!opts.demo, to = opts.guest || '';
  return `<iframe class="cx-frame" data-cx="${t.id}" ${demo?'data-cxdemo="1"':''} title="Undangan ${esc(t.name)}" allow="autoplay; clipboard-write" src="/custom/${t.dir}/index.html${to?'?to='+encodeURIComponent(to):''}${demo?'':'#preview'}"></iframe>`;
}
function cxPost(f){ try{ if(!f || f.dataset.cxdemo || !f.contentWindow) return; f.contentWindow.postMessage({type:'invite:update', data:cxData(f.dataset.cx)}, location.origin); }catch(e){ console.warn('cx', e); } }
const cxPostAll = () => $$('iframe.cx-frame').forEach(cxPost);
addEventListener('message', async e=>{
  const m=e.data||{}; const f=$$('iframe.cx-frame').find(x=>x.contentWindow===e.source); if(!f) return;
  if(m.type==='invite:ready'){ cxPost(f); if(EDIT.on && f.closest('#edScreen')) setTimeout(cxEdMark, 300); }
  if(m.type==='invite:pick' && EDIT.on && f.closest('#edScreen')){ const k=CX_SEC2PANEL[m.section]; if(k && edPanel(k)[0]===k){ CX_PICKED=true; edSelect(k, true); } }
  if(m.type==='invite:rsvp' && m.entry){ const x=m.entry, n=String(x.n||'').slice(0,60), msg=String(x.m||'').slice(0,400), att=x.a==='tidak'?'tidak':'hadir';
    if(CLOUD.on && CLOUD.guestMode){
      /* tamu tanpa kode: kode hasil RSVP pertama diingat, jadi RSVP berikutnya memperbarui data yang sama, bukan menambah tamu baru */
      const r = await CLOUD.sb.rpc('rsvp',{p_slug:CLOUD.slug, p_code:rsvpCode(n), p_name:n, p_status:att, p_pax:att==='hadir'?Math.max(1,+x.pax||1):0, p_arrive:''});
      if(r.error) toast('Konfirmasi gagal terkirim: '+r.error.message); else rsvpRemember(r.data);
      if(msg){ const w = await CLOUD.sb.rpc('add_wish',{p_slug:CLOUD.slug, p_name:n, p_message:msg, p_code:rsvpCode(n), p_attending:att==='hadir'}); if(w.error) toast('Ucapan gagal terkirim: '+w.error.message); }
    }
    W.unshift({n, m:msg, t:'baru saja', att, show:true}); if(!CLOUD.guestMode){ try{ store.set('sp-wishes', W); }catch(_){} }
    cxPost(f);
  }
});
/* ---------- Editor Custom: susunan bagian, foto per bingkai, teks khusus tema ---------- */
const CX_PH_LBL_DIR = {lipatkertas:{scene1:'Foto di penutup'}, jendelabulan:{scene1:'Foto di bingkai penutup'}, pasarmalam:{scene1:'Foto di penutup'}, lembarharian:{scene1:'Polaroid penutup'}, tepilaut:{scene1:'Foto di penutup'}, kolase:{cover:'Foto di bingkai pembuka', scene1:'Polaroid tanggal', scene2:'Polaroid cerita', scene3:'Foto di bingkai penutup'}};
const CX_PH_LABEL = k => (CX_PH_LBL_DIR[cxDir()]||{})[k] || ({scene1:'Polaroid pembuka 1', scene2:'Polaroid pembuka 2', scene3:'Polaroid tanggal', scene4:'Polaroid cerita', scene5:'Polaroid penutup', cover:'Sampul', couple:'Berdua', player:'Pemutar lagu', bride:'Pengantin wanita', groom:'Pengantin pria'})[k] || ((m=>m?({g:'Galeri ',strip:'Strip ',row:'Cerita ',story:'Cerita '})[m[1]]+m[2]:k)(k.match(/^(g|strip|row|story)(\d)$/)));
/* Drag untuk ubah urutan bagian (mouse & sentuh). Tombol panah tetap ada untuk keyboard. */
function secSortCommit(list){
  const keys=[...list.children].map(li=>li.dataset.k).filter(Boolean);
  if(list.dataset.sort==='cx'){ cxSetPath('order', keys); } else { S.order=keys; }
  save(); renderStep(); if(EDIT.on) edRail(); refreshPreview();
}
document.addEventListener('pointerdown', e=>{
  const h=e.target.closest('[data-sort] .drag'); if(!h) return;
  const li=h.closest('[data-k]'), list=li && li.parentElement; if(!list) return; e.preventDefault();
  const cs=getComputedStyle(list), horiz=cs.display.includes('flex') && cs.flexDirection.startsWith('row');
  const start=[...list.children].map(x=>x.dataset.k).join();
  li.classList.add('dragging'); list.classList.add('sorting');
  const sc=li.closest('.ed-insp-b, .ed-rail');
  let v=null, raf=0;
  const place=()=>{ if(v==null) return; const sibs=[...list.children].filter(x=>x!==li && x.dataset.k);
    const after=sibs.find(x=>{ const r=x.getBoundingClientRect(); return horiz ? v < r.left + r.width/2 : v < r.top + r.height/2; });
    if(after){ if(li.nextElementSibling!==after) list.insertBefore(li, after); } else if(list.lastElementChild!==li) list.appendChild(li); };
  const tick=()=>{ if(v!=null){ const R=sc?sc.getBoundingClientRect():{top:0,bottom:innerHeight,left:0,right:innerWidth}, T=sc||window;
      const lo=horiz?Math.max(R.left,0):Math.max(R.top,0), hi=horiz?Math.min(R.right,innerWidth):Math.min(R.bottom,innerHeight), edge=horiz?44:52;
      const d = v < lo+edge ? -Math.ceil((lo+edge-v)/4) : v > hi-edge ? Math.ceil((v-hi+edge)/4) : 0;
      if(d){ horiz ? T.scrollBy(d,0) : T.scrollBy(0,d); place(); } }
    raf=requestAnimationFrame(tick); };
  raf=requestAnimationFrame(tick);
  const move=ev=>{ v=horiz?ev.clientX:ev.clientY; place(); };
  const end=()=>{ cancelAnimationFrame(raf); document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',end); document.removeEventListener('pointercancel',end);
    li.classList.remove('dragging'); list.classList.remove('sorting');
    if([...list.children].map(x=>x.dataset.k).join()!==start) secSortCommit(list); };
  document.addEventListener('pointermove',move); document.addEventListener('pointerup',end); document.addEventListener('pointercancel',end);
});
function cxOrder(){ const ids=CX_SECTIONS.map(x=>x[0]); const o=((S.cx||{}).order||[]).filter(k=>ids.includes(k)); return o.concat(ids.filter(k=>!o.includes(k))); }
function cxSecOn(k){ const t=cxTheme(S.theme), D=((window.INVITE_DEFAULTS||{})[t.dir]||{}).sections||{}, X=((S.cx||{}).sections)||{}; if(k==='rsvp' && S.wishesOn===false) return false; return X[k]!==undefined ? !!X[k] : D[k]!==false; }
function cxPhotoSrc(t, v){ return !v ? '' : /^(data:|https?:|\/)/.test(v) ? v : `/custom/${t.dir}/${v}`; }
function cxEditorHTML(){
  if(!document.getElementById('cx-fontprev')){ const l=document.createElement('link'); l.id='cx-fontprev'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Great+Vibes&family=Parisienne&family=Yellowtail&family=Dancing+Script:wght@600&family=Satisfy&family=Permanent+Marker&family=Rock+Salt&family=Amatic+SC:wght@700&display=swap'; document.head.appendChild(l); }
  const t=cxTheme(S.theme); if(!t) return ''; const D=(window.INVITE_DEFAULTS||{})[t.dir]||{}, d=cxData(t.id), X=S.cx||{};
  const has=k=>!!document && true;
  const ord=cxOrder();
  const rows=ord.map((k,i)=>{ const lab=(CX_SECTIONS.find(x=>x[0]===k)||[k,k])[1], on=cxSecOn(k), sup = false;
    return `<li class="${on&&!sup?'':'off'}" data-k="${k}"><span class="drag" aria-hidden="true" title="Geser untuk pindah"><svg viewBox="0 0 10 16" width="10" height="16"><g fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/></g></svg></span><b>${lab}</b>${sup?'<small class="muted">Tidak ada di tema ini</small>':''}<span class="mv"><label class="switch"><input type="checkbox" data-cxsec="${k}" ${on?'checked':''} ${sup?'disabled':''} aria-label="Tampilkan ${lab}"><span></span></label><button type="button" class="btn btn-ghost btn-sm" data-cxmv="${k}" data-dir="-1" ${i===0?'disabled':''} aria-label="Naikkan ${lab}">↑</button><button type="button" class="btn btn-ghost btn-sm" data-cxmv="${k}" data-dir="1" ${i===ord.length-1?'disabled':''} aria-label="Turunkan ${lab}">↓</button></span></li>`; }).join('');
  const keys=Object.keys(D.photos||{});
  const phs=keys.map(k=>{ const mine=!!(X.photos||{})[k], v=cxPhotoSrc(t, d.photos[k]); return `<div class="cx-ph${mine?' mine':''}"><label><img src="${esc(v)}" alt="" loading="lazy"><input type="file" accept="image/*" data-cxph="${k}" hidden><span class="cx-ph-l">${esc(CX_PH_LABEL(k))}</span><span class="cx-ph-b">${mine?'Ganti':'Unggah'}</span></label>${mine?`<button type="button" class="linkbtn" data-cxphx="${k}">Pakai contoh</button>`:'<small class="muted">Contoh</small>'}</div>`; }).join('');
  const fx=(k,l,v,o={})=>`<div class="field"><label for="cx-${k.replace(/\W/g,'-')}">${l}${o.opt?' <span class="opt-l">opsional</span>':''}</label>${o.area?`<textarea class="input" rows="${o.rows||3}" id="cx-${k.replace(/\W/g,'-')}" data-cxk="${k}">${esc(v||'')}</textarea>`:`<input class="input" id="cx-${k.replace(/\W/g,'-')}" data-cxk="${k}" value="${esc(v||'')}">`}${o.hint?`<span class="hint">${o.hint}</span>`:''}</div>`;
  const texts=[
    t.dir==='coretan'?fx('coverTitle','Judul sampul',d.coverTitle,{hint:'Tulisan besar di sampul, mis. “Dua bocil ini resmi nikah!”'}):'',
    fx('guestDefault','Sapaan tamu bawaan',d.guestDefault,{hint:'Diganti otomatis dengan nama tamu dari link.'}),
    fx('hashtag','Hashtag',d.hashtag,{opt:1}),
    t.dir==='photobox'?fx('couple.groom.knownFor','Known for (pria)',d.couple.groom.knownFor,{opt:1})+fx('couple.groom.bio','Bio singkat (pria)',d.couple.groom.bio,{area:1,opt:1})+fx('couple.bride.knownFor','Known for (wanita)',d.couple.bride.knownFor,{opt:1})+fx('couple.bride.bio','Bio singkat (wanita)',d.couple.bride.bio,{area:1,opt:1}):'',
    fx('dresscode.text','Dress code',d.dresscode&&d.dresscode.text,{opt:1}),
    fx('gift.shipText','Teks kirim kado',d.gift.shipText,{area:1,opt:1}),
    fx('gift.address','Alamat kirim kado',d.gift.address,{area:1,opt:1,hint:'Kosongkan kalau alamat dibagikan lewat WhatsApp.'}),
    fx('closing.text','Teks penutup',d.closing&&d.closing.text,{area:1,rows:4})
  ].join('');
  const L=CX_LOOK[t.dir]||{pal:[],font:[]}, lk=cxLook(t), lang=cxLang(t);
  const look=`<div class="field"><span style="font-weight:700;font-size:13.5px">Warna</span><div class="cx-pal" role="group" aria-label="Warna tema">${L.pal.map(([k,l,c])=>`<button type="button" data-cxpal="${k}" aria-pressed="${(lk.pal||'')===k}"><i style="background:${c}"></i>${esc(l)}</button>`).join('')}</div></div>
    <div class="field" style="margin-top:16px"><span style="font-weight:700;font-size:13.5px">Huruf nama &amp; judul</span><div class="cx-pal" role="group" aria-label="Huruf">${L.font.map(([k,l,f])=>`<button type="button" data-cxfont="${k}" aria-pressed="${(lk.font||'')===k}"><span style="font-family:${f};font-size:19px">${esc(S.bride.nick||'Sarah')}</span><small>${esc(l)}</small></button>`).join('')}</div></div>
    <div class="field" style="margin-top:16px"><span style="font-weight:700;font-size:13.5px">Bahasa undangan</span><div class="seg" role="group" aria-label="Bahasa">${[['id','Indonesia'],['en','English']].map(([k,l])=>`<button type="button" data-cxlang="${k}" aria-pressed="${lang===k}">${l}</button>`).join('')}</div><span class="hint">Mengganti teks bawaan tema (judul bagian, tombol, hari). Isi yang kalian tulis sendiri tidak ikut diterjemahkan.</span></div>`;
  return `<div class="cx-ed">
    ${look}
    <div class="field" style="margin-top:22px"><span style="font-weight:700;font-size:13.5px">Susunan undangan</span><ol class="sec-order" data-sort="cx">${rows}</ol><span class="hint">Sampul dan ayat selalu di atas, penutup selalu di bawah. Matikan bagian yang tidak kalian pakai.</span></div>
    <div class="field" style="margin-top:22px"><span style="font-weight:700;font-size:13.5px">Foto di setiap bingkai</span><div class="cx-phs">${phs}</div><span class="hint">Yang bertanda “Contoh” masih memakai foto contoh. Ganti semuanya sebelum dibagikan, ya.</span></div>
    <div style="margin-top:22px"><span style="font-weight:700;font-size:13.5px;display:block;margin-bottom:8px">Teks khusus tema ini</span>${texts}</div>
  </div>`;
}
function cxSetPath(path, v){ S.cx=S.cx||{}; const ks=path.split('.'); let o=S.cx; ks.slice(0,-1).forEach(k=>{ o[k]=o[k]&&typeof o[k]==='object'?o[k]:{}; o=o[k]; }); o[ks[ks.length-1]]=v; }
let cxT;
document.addEventListener('input', e=>{ const k=e.target.dataset && e.target.dataset.cxk; if(!k) return; cxSetPath(k, e.target.value); clearTimeout(cxT); cxT=setTimeout(()=>{ save(); refreshPreview(); },250); });
document.addEventListener('change', async e=>{ const t=e.target;
  if(t.dataset && t.dataset.cxtog){ const tp=t.dataset.cxtog; if(tp.startsWith('cx.')) cxSetPath(tp.slice(3), t.checked); else setPath(S, tp, t.checked); save(); renderStep(); if(EDIT.on) edRail(); refreshPreview(); return; }
  if(t.dataset && t.dataset.cxsec){ cxSetPath('sections.'+t.dataset.cxsec, t.checked); if(t.dataset.cxsec==='rsvp' && t.checked) S.wishesOn=true; save(); renderStep(); refreshPreview(); return; }
  if(t.dataset && t.dataset.cxph && t.files && t.files[0]){ const k=t.dataset.cxph; try{ const d=await shrink(t.files[0], 1400, .8); const url=await storePhoto(d); if(url){ cxSetPath('photos.'+k, url); save(); renderStep(); refreshPreview(); } }catch(err){ toast('Foto gagal diunggah: '+(err.message||'coba lagi')); } }
});
document.addEventListener('click', e=>{
  const mv=e.target.closest('[data-cxmv]'); if(mv){ const o=cxOrder(), i=o.indexOf(mv.dataset.cxmv), j=i+(+mv.dataset.dir); if(i<0||j<0||j>=o.length) return; [o[i],o[j]]=[o[j],o[i]]; cxSetPath('order', o); save(); renderStep(); if(EDIT.on) edRail(); refreshPreview(); return; }
  const px=e.target.closest('[data-cxphx]'); if(px){ if(S.cx&&S.cx.photos) delete S.cx.photos[px.dataset.cxphx]; save(); renderStep(); refreshPreview(); return; }
  const pk=e.target.closest('[data-pickkind]'); if(pk){ PICK_KIND=pk.dataset.pickkind; renderStep(); return; }
  const cp=e.target.closest('[data-cxpal],[data-cxfont],[data-cxlang]'); if(cp){ const t=cxTheme(S.theme); if(!t) return; S.cx=S.cx||{};
    if(cp.dataset.cxlang!==undefined){ S.cx.lang=S.cx.lang||{}; S.cx.lang[t.dir]=cp.dataset.cxlang; }
    else { S.cx.look=S.cx.look||{}; const l=S.cx.look[t.dir]=S.cx.look[t.dir]||{}; if(cp.dataset.cxpal!==undefined) l.pal=cp.dataset.cxpal; else l.font=cp.dataset.cxfont; }
    save(); renderStep(); refreshPreview(); return; }
});
let PICK_KIND=null;
/* ---------- Mode Custom di editor & halaman pembuatan ---------- */
/* Foto tiap tema dikelompokkan ke bagian undangan tempat foto itu tampil */
const CX_PHOTO_SEC = {
  drapery:{bride:'couple', groom:'couple', story1:'story', story2:'story', g1:'gallery', g2:'gallery', g3:'gallery', g4:'gallery', g5:'gallery', g6:'gallery'},
  photobox:{strip1:'sampul', strip2:'sampul', strip3:'sampul', strip4:'sampul', player:'sampul', bride:'couple', groom:'couple', row1:'story', row2:'story', row3:'story', row4:'story', g1:'gallery', g2:'gallery', g3:'gallery', g4:'gallery'},
  tepilaut:{bride:'couple', groom:'couple', scene1:'closing', g1:'gallery', g2:'gallery', g3:'gallery', g4:'gallery', g5:'gallery', g6:'gallery'},
  lembarharian:{bride:'couple', groom:'couple', scene1:'closing', g1:'gallery', g2:'gallery', g3:'gallery', g4:'gallery', g5:'gallery', g6:'gallery'},
  pasarmalam:{bride:'couple', groom:'couple', scene1:'closing', g1:'gallery', g2:'gallery', g3:'gallery', g4:'gallery', g5:'gallery', g6:'gallery'},
  jendelabulan:{bride:'couple', groom:'couple', scene1:'closing', g1:'gallery', g2:'gallery', g3:'gallery', g4:'gallery', g5:'gallery', g6:'gallery'},
  lipatkertas:{bride:'couple', groom:'couple', scene1:'closing', g1:'gallery', g2:'gallery', g3:'gallery', g4:'gallery', g5:'gallery', g6:'gallery'},
  kolase:{cover:'sampul', bride:'couple', groom:'couple', scene1:'date', scene2:'story', scene3:'closing', g1:'gallery', g2:'gallery', g3:'gallery', g4:'gallery', g5:'gallery', g6:'gallery'},
  encore:{cover:'sampul', scene1:'sampul', scene2:'sampul', bride:'couple', groom:'couple', scene3:'date', scene4:'story', scene5:'closing', g1:'gallery', g2:'gallery', g3:'gallery', g4:'gallery', g5:'gallery', g6:'gallery'},
  coretan:{cover:'sampul', player:'sampul', bride:'couple', groom:'couple', couple:'couple', strip1:'gallery', strip2:'gallery', strip3:'gallery'}
};
const CX_PANEL_DEF = {
  sampul:['Sampul & pembuka','mail',['quote'], null],
  couple:['Mempelai','heart',['couple'],'cx.sections.couple'],
  date:['Tanggal & acara','cal',['date','event'],'cx.sections.date'],
  dresscode:['Dress code','users',['dresscode'],'cx.sections.dresscode'],
  gift:['Wedding gift','gift',['gift'],'gift.on'],
  rsvp:['RSVP & ucapan','rsvp',['rsvp'],'wishesOn'],
  story:['Cerita','heart',['story'],'story.on'],
  gallery:['Galeri','camera',['gallery'],'cx.sections.gallery'],
  closing:['Penutup','text',['closing'],'cx.sections.closing']
};
const cxDraft = () => isCx(S.theme) && S.published && S.plan!=='custom';
function cxEnsure(){ const t=cxTheme(S.theme); if(!t) return; S.cx=S.cx||{}; const D=((window.INVITE_DEFAULTS||{})[t.dir]||{}).sections||{}; const sec=S.cx.sections=S.cx.sections||{};
  ['couple','date','dresscode','gallery','closing'].forEach(k=>{ if(sec[k]===undefined) sec[k]=D[k]!==false; }); }
function cxEdPanels(){
  const mid=cxOrder().map(k=>'cx:'+k);
  const list=['cx:sampul', ...mid, 'cx:closing'].map(k=>{ const id=k.slice(3), d=CX_PANEL_DEF[id]; return [k, d[0], d[1], 'Isi undangan', d[3], d[2], null, mid.includes(k)?id:null]; });
  const orig=k=>ED_PANELS.find(p=>p[0]===k);
  const na = cxNA().map(k=>{ const d=CX_NA_DEF[k]; return ['na:'+k, d[0], d[1], 'Belum tersedia di tema ini', null, [], 'na']; });
  return [['cx:tampilan','Tema, warna & bahasa','eye','Tampilan', null, []]].concat(list, ['musik','kenangan','link'].map(orig).filter(Boolean).map(p=>{ const q=p.slice(); q[3]='Pengaturan'; return q; }), na);
}
/* Fitur tema Lukisan yang belum didukung tiap tema Custom. Tema baru cukup didaftarkan di CX_NA. */
const CX_NA_DEF = {
  kado:['Kado patungan','gift', ()=>!!(S.wishlist && S.wishlist.on && (S.wishlist.items||[]).length)]
};
const CX_NA = {drapery:['kado'], photobox:['kado'], coretan:['kado'], encore:['kado'], kolase:['kado']};
function cxNA(id){ const t=cxTheme(id||S.theme); return t ? (CX_NA[t.dir] || Object.keys(CX_NA_DEF)) : []; }
function naPanelHTML(k){
  const key=k.slice(3), d=CX_NA_DEF[key], t=cxTheme(S.theme); if(!d||!t) return '';
  const has=d[2]();
  return `<div class="ed-na">${karaImg('bingung','')}<p><b>${esc(d[0])} belum tersedia di tema ${esc(t.name)}.</b></p>
    <p class="muted">${has?'Yang sudah kalian isi tetap tersimpan, tapi tidak tampil ke tamu selama memakai tema ini. Pindah ke tema Lukisan kalau fitur ini penting buat kalian.':'Fitur ini ada di semua tema Lukisan. Kalau penting buat kalian, pertimbangkan pindah ke tema Lukisan.'}</p>
    <button type="button" class="btn btn-ghost btn-sm" data-ed="cx:tampilan">${ico('eye')}Lihat pilihan tema</button></div>`;
}
const LK_SEC2PANEL = {salam:'mempelai', acara:'acara', cerita:'cerita', galeri:'galeri', hadiah:'hadiah', kado:'kado', ucapan:'ucapan', rsvp:'rsvp'};
function lkEdPanels(){
  const P=k=>ED_PANELS.find(p=>p[0]===k), used=new Set();
  const isi=secOrder().map(sk=>{ const p=P(LK_SEC2PANEL[sk]); if(!p) return null; used.add(p[0]); const q=p.slice(); q[6]=null; q[7]=sk; return q; }).filter(Boolean);
  const rest=ED_PANELS.filter(p=>p[3]==='Isi undangan' && !used.has(p[0]) && p[0]!=='musik');
  const musik=P('musik').slice(); musik[3]='Pengaturan';
  return ED_PANELS.filter(p=>p[3]==='Tampilan' && p[0]!=='urutan').concat(isi, rest, [musik], ED_PANELS.filter(p=>p[3]==='Pengaturan'));
}
const edPanels = () => isCx(S.theme) ? cxEdPanels() : lkEdPanels();
function cxPhotoKeys(sec){ const t=cxTheme(S.theme); if(!t) return []; const D=cxPh0(t), M=CX_PHOTO_SEC[t.dir]||{}; return Object.keys(D).filter(k=>(M[k]||'gallery')===sec); }
function cxPhotosHTML(keys, opts={}){
  const t=cxTheme(S.theme); if(!t||!keys.length) return ''; const d=cxData(t.id), X=S.cx||{}, D=((window.INVITE_DEFAULTS||{})[t.dir]||{}).photos||{};
  const phs=keys.map(k=>{ const mine=d.photos[k]!==D[k], v=cxPhotoSrc(t, d.photos[k]); return `<div class="cx-ph${mine?' mine':''}"><label><img src="${esc(v)}" alt="" loading="lazy"><input type="file" accept="image/*" data-cxph="${k}" hidden><span class="cx-ph-l">${esc(CX_PH_LABEL(k))}</span><span class="cx-ph-b">${mine?'Ganti':'Unggah'}</span></label>${(X.photos||{})[k]?`<button type="button" class="linkbtn" data-cxphx="${k}">Hapus</button>`:mine?'<small class="muted">Dari foto kalian</small>':'<small class="cx-sample">Contoh</small>'}</div>`; }).join('');
  return `<div class="field"><span style="font-weight:700;font-size:13.5px">${opts.title||'Foto'}</span><div class="cx-phs">${phs}</div>${opts.hint?`<span class="hint">${opts.hint}</span>`:''}</div>`;
}
const cxFx=(k,l,v,o={})=>`<div class="field"><label for="cx-${k.replace(/\W/g,'-')}">${l}${o.opt?' <span class="opt-l">opsional</span>':''}</label>${o.area?`<textarea class="input" rows="${o.rows||3}" id="cx-${k.replace(/\W/g,'-')}" data-cxk="${k}" placeholder="${esc(o.ph||'')}">${esc(v||'')}</textarea>`:`<input class="input" id="cx-${k.replace(/\W/g,'-')}" data-cxk="${k}" value="${esc(v||'')}" placeholder="${esc(o.ph||'')}">`}${o.hint?`<span class="hint">${o.hint}</span>`:''}</div>`;
function cxSecHead(id){
  const def=CX_PANEL_DEF[id]; if(!def || !def[3]) return '';
  const ord=cxOrder(), i=ord.indexOf(id), on=!!getPath(S, def[3]) && (id!=='story' || (S.story.items||[]).length>0 || !S.story.on);
  const mv = i<0 ? '' : `<span class="mv"><button type="button" class="btn btn-ghost btn-sm" data-cxmv="${id}" data-dir="-1" ${i===0?'disabled':''} aria-label="Naikkan ${def[0]}">↑</button><button type="button" class="btn btn-ghost btn-sm" data-cxmv="${id}" data-dir="1" ${i===ord.length-1?'disabled':''} aria-label="Turunkan ${def[0]}">↓</button></span>`;
  if(['gift.on','wishesOn','story.on'].includes(def[3])) return mv ? `<div class="cx-sechead"><span>Urutan di undangan</span>${mv}</div>` : '';
  return `<div class="cx-sechead"><label class="switch"><input type="checkbox" data-cxtog="${def[3]}" ${getPath(S,def[3])?'checked':''} aria-label="Tampilkan ${def[0]}"><span></span></label><span>${getPath(S,def[3])?'Tampil di undangan':'Disembunyikan dari tamu'}</span>${mv}</div>`;
}
function cxLookHTML(){
  if(!document.getElementById('cx-fontprev')){ const l=document.createElement('link'); l.id='cx-fontprev'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Great+Vibes&family=Parisienne&family=Yellowtail&family=Dancing+Script:wght@600&family=Satisfy&family=Permanent+Marker&family=Rock+Salt&family=Amatic+SC:wght@700&display=swap'; document.head.appendChild(l); }
  const t=cxTheme(S.theme); if(!t) return ''; const L=CX_LOOK[t.dir]||{pal:[],font:[]}, lk=cxLook(t), lang=cxLang(t);
  return `<div class="cx-ed"><div class="field"><span style="font-weight:700;font-size:13.5px">Warna</span><div class="cx-pal" role="group" aria-label="Warna tema">${L.pal.map(([k,l,c])=>`<button type="button" data-cxpal="${k}" aria-pressed="${(lk.pal||'')===k}"><i style="background:${c}"></i>${esc(l)}</button>`).join('')}</div></div>
    <div class="field"><span style="font-weight:700;font-size:13.5px">Huruf nama &amp; judul</span><div class="cx-pal" role="group" aria-label="Huruf">${L.font.map(([k,l,f])=>`<button type="button" data-cxfont="${k}" aria-pressed="${(lk.font||'')===k}"><span style="font-family:${f};font-size:19px">${esc(S.bride.nick||'Sarah')}</span><small>${esc(l)}</small></button>`).join('')}</div></div>
    <div class="field"><span style="font-weight:700;font-size:13.5px">Bahasa undangan</span><div class="seg" role="group" aria-label="Bahasa">${[['id','Indonesia'],['en','English']].map(([k,l])=>`<button type="button" data-cxlang="${k}" aria-pressed="${lang===k}">${l}</button>`).join('')}</div><span class="hint">Mengganti teks bawaan tema (judul bagian, tombol, hari). Isi yang kalian tulis sendiri tidak ikut diterjemahkan.</span></div></div>`;
}
function cxPick(html, sel){ const d=document.createElement('div'); d.innerHTML=html; const n=d.querySelector(sel); return n ? n.outerHTML : ''; }
function cxPanelBody(id){
  const t=cxTheme(S.theme); if(!t) return ''; const d=cxData(t.id), X=S.cx||{};
  if(id==='sampul') return [t.dir==='coretan'?cxFx('coverTitle','Judul sampul',d.coverTitle,{hint:'Tulisan besar di sampul, mis. “Dua bocil ini resmi nikah!”'}):'',
    cxFx('guestDefault','Sapaan tamu bawaan',d.guestDefault,{hint:'Diganti otomatis dengan nama tamu dari link.'}),
    cxFx('hashtag','Hashtag',d.hashtag,{opt:1}),
    cxPhotosHTML(cxPhotoKeys('sampul'),{title:'Foto sampul & pemutar lagu'}),
    `<div class="field">${edPanelHTML0('salam')}</div>`].join('');
  if(id==='couple') return stepBody(0) + cxCoupleExtra();
  if(id==='date') return stepBody(1) + (['drapery','coretan'].includes(t.dir) ? `<div class="field cx-sechead" style="margin-top:18px"><label class="switch"><input type="checkbox" data-cxtog="cx.sections.countdown" ${(d.sections||{}).countdown?'checked':''} aria-label="Tampilkan hitung mundur"><span></span></label><span>Hitung mundur ke hari H</span></div>` : '') + (cxPhotoKeys('date').length ? cxPhotosHTML(cxPhotoKeys('date'),{title:'Foto di bagian tanggal'}) : '');
  if(id==='dresscode'){ const e=S.events[0]||{}; const more=evMoreHTML(e,0); return `${cxPick(more,'.field:has([data-bind="events.0.dress"])')}${cxPick(more,'.field:has(.dc-pick)')}<p class="hint">Dress code ini ikut tampil di semua tema. Untuk acara lain, isi di panel Tanggal &amp; acara.</p>`; }
  if(id==='gift'){ const c=Object.values((X.gift||{}).contacts||{}), ex=(X.gift||{}).extra||{}; return cxFx('gift.intro','Kalimat pengantar',d.gift.intro,{area:1,rows:3,hint:'Tampil di atas daftar rekening.'}) + edPanelHTML0('hadiah')
      + `<fieldset class="fieldset"><legend>Rekening atau e-wallet lain</legend><p class="hint" style="margin:0 0 6px">Tema ini bisa menampilkan lebih dari satu rekening. Kosongkan kalau cukup satu.</p>${[0,1].map(i=>`<div class="fgrid" style="margin-top:8px">${cxFx(`gift.extra.${i}.bank`,'Bank / e-wallet',(ex[i]||{}).bank,{ph:i?'mis. GoPay':'mis. BCA'})}${cxFx(`gift.extra.${i}.number`,'Nomor',(ex[i]||{}).number)}</div>${cxFx(`gift.extra.${i}.holder`,'Atas nama',(ex[i]||{}).holder)}`).join('<hr class="cx-hr">')}</fieldset>` + cxFx('gift.shipText','Teks kirim kado',d.gift.shipText,{area:1,opt:1}) + cxFx('gift.address','Alamat kirim kado',d.gift.address,{area:1,opt:1,hint:'Kosongkan kalau alamat dibagikan lewat WhatsApp.'})
      + `<div class="field"><span style="font-weight:700;font-size:13.5px">Kontak konfirmasi kado <span class="opt-l">opsional</span></span>${[0,1].map(i=>`<div class="fgrid" style="margin-top:8px">${cxFx(`gift.contacts.${i}.name`,'Nama',(c[i]||{}).name)}${cxFx(`gift.contacts.${i}.phone`,'No. WhatsApp',(c[i]||{}).phone,{ph:'0812…'})}</div>`).join('')}</div>`; }
  if(id==='rsvp') return edPanelHTML0('rsvp') + edPanelHTML0('ucapan');
  if(id==='story') return cxFx('story.title','Judul bagian cerita',d.story&&d.story.title,{hint:'Tampil di atas daftar cerita, mis. “Our Story” atau “Perjalanan Kami”.'}) + edPanelHTML0('cerita') + cxPhotosHTML(cxPhotoKeys('story'),{title:'Foto polaroid cerita'});
  if(id==='gallery') return cxPhotosHTML(cxPhotoKeys('gallery'),{title:'Foto galeri'}) + (t.dir==='photobox'?cxFx('gallery.caption','Keterangan galeri',d.gallery&&d.gallery.caption,{area:1,opt:1}):'');
  if(id==='closing') return cxFx('closing.text','Teks penutup',d.closing&&d.closing.text,{area:1,rows:4}) + (cxPhotoKeys('closing').length ? cxPhotosHTML(cxPhotoKeys('closing'),{title:'Foto penutup'}) : '');
  if(id==='tampilan') return stepBody(2);
  return '';
}
function cxCoupleExtra(){ const t=cxTheme(S.theme); if(!t) return ''; const d=cxData(t.id); return cxPhotosHTML(cxPhotoKeys('couple').filter(k=>k==='couple'),{title:'Foto berdua'}) + (t.dir==='photobox' ? `<fieldset class="fieldset"><legend>Profil singkat</legend>${cxFx('couple.groom.knownFor','Dikenal sebagai (pria)',d.couple.groom.knownFor,{opt:1,ph:'Fixing things at 2 a.m.'})}${cxFx('couple.groom.bio','Bio singkat (pria)',d.couple.groom.bio,{area:1,opt:1})}${cxFx('couple.bride.knownFor','Dikenal sebagai (wanita)',d.couple.bride.knownFor,{opt:1,ph:'Planning trips, not packing'})}${cxFx('couple.bride.bio','Bio singkat (wanita)',d.couple.bride.bio,{area:1,opt:1})}</fieldset>` : ''); }
function cxPanelHTML(k){ const id=k.slice(3); return cxSecHead(id) + cxPanelBody(id); }
function cxSampleList(){ const t=cxTheme(S.theme); if(!t) return []; const D=cxPh0(t), d=cxData(t.id), M=CX_PHOTO_SEC[t.dir]||{}; return Object.keys(D).filter(k=>d.photos[k]===D[k]).map(k=>({k, sec:M[k]||'gallery'})); }
function cxStep4HTML(){
  const t=cxTheme(S.theme), left=cxSampleList(), total=Object.keys(cxPh0(t)).length;
  const secs=['sampul', ...cxOrder().filter(k=>!['couple','date'].includes(k)), 'closing'];
  return `<span class="eyebrow">Langkah 4 dari 5</span><h2>Foto &amp; isi undangan</h2><p class="sub">Diurutkan sesuai undangan dari atas ke bawah. Matikan bagian yang tidak kalian pakai.</p>
    <div class="cx-prog${left.length?'':' ok'}"><b>${total-left.length} dari ${total} foto sudah diganti</b><i style="--p:${total?(total-left.length)/total*100:100}%"></i>${left.length?'<span>Foto bertanda “Contoh” masih foto contoh. Ganti sebelum dibagikan, ya.</span>':'<span>Semua foto sudah foto kalian.</span>'}</div>
    ${secs.map((id,i)=>{ const def=CX_PANEL_DEF[id], n=left.filter(x=>x.sec===id).length, on=def[3]?!!getPath(S,def[3]):true;
      return `<details class="cx-acc" ${i===0||n?'open':''}><summary><b>${def[0]}</b><span class="cx-acc-s">${on?'':'Disembunyikan · '}${n?`${n} foto contoh`:'Siap'}</span></summary><div class="cx-acc-b">${cxPanelHTML('cx:'+id)}</div></details>`; }).join('')}
    <details class="cx-acc"><summary><b>Musik latar</b><span class="cx-acc-s">${S.music?'Menyala':'Mati'}</span></summary><div class="cx-acc-b">${edPanelHTML0('musik')}</div></details>`;
}
/* Pindah koleksi: konfirmasi dulu, sebutkan apa yang terbawa */
function cxSwitch(id, done){
  const toCx=isCx(id), fromCx=isCx(S.theme);
  if(toCx===fromCx){ done(); return; }
  const nt=themeById(id), live=S.published ? themeById(S.theme) : null;
  const tryMode = toCx && S.published && S.plan!=='custom';
  openModal(`<h2 class="display" style="font-size:28px">Pindah ke koleksi ${toCx?'Custom':'Lukisan'}?</h2>
    <p class="muted" style="margin:8px 0 14px">Nama, orang tua, acara, rekening, ayat, dan cerita kalian tetap terbawa.${toCx?'':' Foto dan pengaturan tema Custom tetap disimpan kalau nanti kalian kembali.'}</p>
    ${toCx?(()=>{ const na=cxNA(id); if(!na.length) return ''; const used=na.filter(k=>CX_NA_DEF[k][2]()), names=na.map(k=>CX_NA_DEF[k][0]).join(', '); return `<div class="ed-note warn" style="margin-bottom:14px">${ico('gift')}<div><b>${used.length?esc(used.map(k=>CX_NA_DEF[k][0]).join(', '))+' yang sudah kalian isi tidak akan tampil':'Belum tersedia di tema ini: '+esc(names)}</b><span class="muted">${used.length?'Datanya tetap tersimpan dan muncul lagi kalau kalian kembali ke tema Lukisan.':'Fitur lainnya tetap sama seperti tema Lukisan.'}</span></div></div>`; })():''}
    ${tryMode?`<div class="ed-note" style="margin-bottom:16px">${ico('eye')}<div><b>Coba dulu, gratis</b><span class="muted">Tamu tetap melihat tema ${esc(live.name)} sampai kalian upgrade ke paket Custom. Atur sepuasnya, lalu terapkan kalau sudah cocok.</span></div></div>`:''}
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" data-act="cx-switch-go" data-t="${esc(id)}">${toCx?(tryMode?'Coba '+esc(nt.name):'Pakai '+esc(nt.name)):'Pakai '+esc(nt.name)}</button><button class="btn btn-ghost" data-act="close">Batal</button></div>`);
  CX_SWITCH_DONE = done;
}
let CX_SWITCH_DONE = null;
function cxApplyTheme(id){
  if(isCx(id)){ if(S.published && S.plan!=='custom' && !isCx(S.theme)) S.liveTheme=S.theme; if(!S.published){ if(S.plan!=='custom') S.planPrev=S.plan; S.plan='custom'; } S.theme=id; cxEnsure(); }
  else { S.theme=id; delete S.liveTheme; /* draf kembali ke tema Lukisan: paket ikut kembali, tidak terkunci di Custom */ if(!S.published && S.plan==='custom'){ S.plan=S.planPrev||'coba'; } delete S.planPrev; }
  S.accent=null; PICK_KIND=null; if(EDIT.on && !edPanels().some(p=>p[0]===EDIT.panel)) EDIT.panel = isCx(id) ? 'cx:tampilan' : 'tema';
}
function cxDraftBar(){
  if(!cxDraft()) return ''; const live=themeById(S.liveTheme||''), cp=planOf('custom'), cur=planOf(S.plan);
  return `<div class="cx-try">${ico('eye')}<span><b>Mode coba</b> Tamu masih melihat tema ${esc(S.liveTheme?live.name:'sebelumnya')}.</span><button class="btn btn-primary btn-sm" data-act="co-upgrade-custom">Terapkan · upgrade${cp&&cur?' +'+rupiah(cp.price-cur.price):''}</button>${S.liveTheme?`<button class="btn btn-ghost btn-sm" data-act="cx-try-back">Kembali ke ${esc(live.name)}</button>`:''}</div>`;
}
function invHTML(opts={}){
  if(isCx(opts.theme||S.theme)) return cxFrameHTML(opts.theme||S.theme, {demo:!!opts.theme && opts.theme!==S.theme, guest: opts.idp==='g' ? guestLabel() : ''});
  const t = themeById(opts.theme || S.theme), o = themeOv(t.id);
  const kOld = {...P_KICK}; if(o.kick) Object.entries(o.kick).forEach(([k,v])=>{ if(typeof v==='string') P_KICK[k]=v; });
  let html; try{ html = invHTML0(opts); } finally { Object.assign(P_KICK, kOld); }
  if(memActive(opts)) html = html.replace(/Buka undangan/g, 'Buka kenangan').replace(/>Tonton siaran langsung</g, '>Tonton rekaman<');
  const hide = new Set([...(o.hide||[]), ...SEC_FEATS.filter(k=>!ff(k))]);
  hide.forEach(k=>{ html = html.replace(new RegExp(`<section id="[^"]*-${k}"[^>]*>[\\s\\S]*?</section>`), ''); });
  Object.entries(o.titles||{}).forEach(([k,v])=>{ if(!v) return; html = html.replace(new RegExp(`(<section id="[^"]*-${k}"[^>]*>[\\s\\S]*?<h3[^>]*>)[\\s\\S]*?(</h3>)`), (m,a,b)=>a+esc(v)+b); });
  const nd = (o.nodeco||[]).map(k=>' nd-'+k).join('') + (ff('musik')?'':' ff-nomusic');
  if(nd) html = html.replace('<div class="inv', '<div class="inv'+nd);
  const bgs = o.imgs || {}; const okUrl = u => typeof u==='string' && /^https?:\/\/[^'"()\s]+$/.test(u);
  const withBg = (tag, attr, u) => { const v = attr==='data-pbg' ? '--pbg' : '--sbg'; return /\sstyle="/.test(tag) ? tag.replace(/\sstyle="/, ` ${attr} style="${v}:url('${u}');`) : tag.replace(/>$/, ` ${attr} style="${v}:url('${u}')">`); };
  Object.entries(bgs).forEach(([k,u])=>{ if(!okUrl(u)) return;
    if(k==='page'){ html = html.replace(/<div class="inv[^>]*>/, m=>withBg(m,'data-pbg',u)); return; }
    const re = k==='penutup' ? /<section class="p-end"[^>]*>/ : new RegExp(`<section[^>]*\\sid="[^"]*-${k}"[^>]*>`);
    html = html.replace(re, m=>withBg(m,'data-sbg',u)); });
  return html;
}
function invHTML0(opts={}){
  const t = themeById(opts.theme || S.theme);
  const gobj = opts.guestObj || null;
  const guest = opts.guest ?? gobj?.name ?? 'Bapak/Ibu/Saudara/i';
  const op = {...(OPENINGS[S.opening] || OPENINGS.umum), quote: quoteText()};
  const ev = guestEvents(gobj);
  const first = ev.find(e=>e.date);
  const mem = memActive(opts), firstC = mem ? null : first;
  const nick1 = S.bride.nick || S.bride.name.split(' ')[0] || 'Mempelai';
  const nick2 = S.groom.nick || S.groom.name.split(' ')[0] || 'Mempelai';
  const mapUrl = e => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${e.venue} ${e.address}`);
  const calUrl = e => { const iso = x => new Date(x).toISOString().replace(/[-:]|\.\d{3}/g,''); const a=evUTC(e, e.start||'08.00'), b=evUTC(e, e.end)||a+2*36e5; const det=[rundownItems(e).map(r=>(r.t?r.t+' ':'')+r.x).join('\n'), e.dress?'Dress code: '+e.dress:'', liveUrl(e.live)?'Siaran langsung: '+liveUrl(e.live):''].filter(Boolean).join('\n\n'); return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${e.type} ${nick1} & ${nick2}`)}&dates=${iso(a)}/${iso(b)}${det?'&details='+encodeURIComponent(det):''}&location=${encodeURIComponent(e.venue+', '+e.address)}`; };
  const id = opts.idp || 'p';
  const big = opts.big ? ' big' : '';
  const op2 = ['senja','songket','ulos'].includes(t.id) ? .9 : .6;
  const sec = {};
  sec.salam = `<section id="${id}-salam">
      <svg class="orn" width="120" height="20" aria-hidden="true"><use href="#i-orn"/></svg>
      <h3>${esc(op.salam)}</h3>
      <p class="lead">${esc(op.text)}</p>
      <div class="couple2"><div class="pics">
        <figure class="pic"><div class="ph" ${S.bride.photo?`style="background:url(${S.bride.photo}) center/cover"`:''}>${S.bride.photo?'':esc(initials(S.bride.name)||'?')}</div></figure>
        <figure class="pic"><div class="ph" ${S.groom.photo?`style="background:url(${S.groom.photo}) center/cover"`:''}>${S.groom.photo?'':esc(initials(S.groom.name)||'?')}</div></figure></div>
        <div class="person"><h4>${esc(S.bride.name||'Nama mempelai wanita')}</h4><p>${esc(S.bride.parents)}</p></div>
        <div class="and">&amp;</div>
        <div class="person"><h4>${esc(S.groom.name||'Nama mempelai pria')}</h4><p>${esc(S.groom.parents)}</p></div></div>
      ${op.quote?`<p class="lead" style="margin-top:28px;font-style:italic">${esc(op.quote)}</p>`:''}
    </section>`;
  sec.acara = `<section id="${id}-acara">
      <h3>Waktu &amp; tempat</h3>
      ${gobj && ev.length < S.events.filter(e=>e.type||e.date||e.venue).length ? `<p class="lead" style="margin-bottom:6px">Kami mengundang ${esc(gobj.name)} ke acara berikut.</p>`:''}
      ${firstC ? `<div class="count" data-count="${esc(first.date)}">${countHTML(first.date)}</div>`:''}
      ${ev.map(e=>`
        <div class="ev">
          <div class="ty">${esc(e.type||'Acara')}</div>
          ${e.date?`<div class="dd">${esc(fmtDate(e.date))}</div>`:''}
          ${e.start?(()=>{ const t=evTimeHTML(e); return `<div class="tt">Pukul ${t.main}</div>${t.alt}`; })():''}
          ${e.venue?`<div class="vv">${esc(e.venue)}</div>`:''}
          ${e.address?`<div class="aa2">${esc(e.address)}</div>`:''}
          <div class="acts">
            ${e.venue?`<a class="ibtn solid" href="${mapUrl(e)}" target="_blank" rel="noopener">${ico('pin')}Buka peta</a>`:''}
            ${e.date?`<a class="ibtn" href="${calUrl(e)}" target="_blank" rel="noopener">${ico('cal')}Simpan ke kalender</a>`:''}
          </div>${evExtraHTML(e)}
        </div>`).join('')}
      ${(()=>{ const me=mainEvent(gobj); return me ? `<div class="crowd" data-crowd data-ev="${me.i}" hidden></div>` : ''; })()}
    </section>`;
  if(S.galleryOn && S.gallery.length) sec.galeri = `<section id="${id}-galeri"><h3>Galeri</h3><p class="lead">Potongan cerita kami menuju hari ini.</p><div class="gal">${S.gallery.map((g,k)=>`<button type="button" data-act="zoom" data-k="${k}" style="background-image:url(${g})" aria-label="Perbesar foto ${k+1}"></button>`).join('')}</div></section>`;
  const answered = gobj && gobj.status!=='belum';
  sec.rsvp = `<section id="${id}-rsvp">
      <h3>Konfirmasi kehadiran</h3>
      <p class="lead">Mohon kabari kami sebelum ${first?esc(fmtShort(addDays(first.date,-7))):'H-7'} agar kami dapat menyiapkan tempat terbaik untuk Anda.</p>
      ${guestQuota(gobj)?`<p class="rv-quota">${ico('users')}<span>Undangan ini berlaku untuk <b>${guestQuota(gobj)} orang</b>. Mohon tidak meneruskan link ini ke orang lain, ya.</span></p>`:''}
      <div data-rsvp data-gid="${gobj?esc(gobj.id):''}">${answered ? rsvpDone(gobj, gobj.status, gobj.pax) : rsvpForm(guest, gobj)}</div>
    </section>`;
  if(S.gift.on) sec.hadiah = `<section id="${id}-hadiah">
      <h3>Tanda kasih</h3>
      <p class="lead">Doa restu Anda adalah hadiah terindah bagi kami. Bila ingin memberi tanda kasih, bisa melalui rekening berikut.</p>
      <div class="bank">
        <div class="bn">${esc(S.gift.bank)}</div>
        <div class="row"><div class="ac">${esc(S.gift.acct.replace(/(\d{4})(?=\d)/g,'$1 '))}</div></div>
        <div style="font-size:13px;opacity:.8">a.n. ${esc(S.gift.holder)}</div>
        <button class="ibtn bank-copy" data-act="copy" data-v="${esc(S.gift.acct)}" aria-label="Salin nomor rekening">${ico('copy')}Salin</button>
      </div>
      <p class="gift-note">Tidak perlu konfirmasi. Cukup tulis nama Anda di berita transfer supaya kami bisa mengenali dan berterima kasih.</p>
      <div data-giftconfirm><button class="gift-opt" data-act="gift-confirm" data-name="${esc(guest==='Bapak/Ibu/Saudara/i'?'':guest)}">Ingin menitipkan nama dan doa? <span>(opsional)</span></button></div>
    </section>`;
  { const k=kadoSecHTML(id); if(k) sec.kado=k; }
  if(S.wishesOn) sec.ucapan = `<section id="${id}-ucapan">
      <h3>Ucapan &amp; doa</h3>
      <form class="form" data-wishform>
        <label for="${id}-wn">Nama</label><input class="in" id="${id}-wn" value="${esc(guest==='Bapak/Ibu/Saudara/i'?'':guest)}" required>
        <label for="${id}-wm">Ucapan</label><textarea class="in" id="${id}-wm" rows="3" placeholder="Tulis doa untuk ${esc(nick1)} & ${esc(nick2)}" required></textarea>
        <button class="ibtn solid" style="justify-content:center">Kirim ucapan</button>
      </form>
      <div data-wishlist style="margin-top:18px">${wishList()}</div>
    </section>`;
  const prem = !!t.layout;
  { const c=storySecHTML(id); if(c) sec.cerita=c; }
  if(prem){ sec.salam=premSalam(id, op); sec.acara=premAcara(id, ev, firstC, gobj, mapUrl, calUrl); if(sec.galeri) sec.galeri=premGaleri(id); premDecorate(sec); }
  if(mem){ delete sec.rsvp; sec.kenangan = memSecHTML(id, guest); }
  const order = mem ? ['kenangan', ...secOrder().filter(k=>sec[k] && k!=='acara' && k!=='kenangan'), 'acara'].filter(k=>sec[k]) : secOrder().filter(k=>sec[k]);
  // Tema Kebun: aset lukisan ikut menghiasi setiap bagian (untaian bunga, rumpun di sudut, kupu-kupu)
  if(t.layout==='kebun' && t.kbSet){ const A=t.kbSet, im=(c,f,st)=>`<img class="${c}" src="${A}${f}" alt=""${st?` style="${st}"`:''} loading="lazy" decoding="async">`;
    const BX=[6,86,10,84,5,88,12,82], BY=[16,28,22,12,34,20,30,14];
    order.forEach((k,i)=>{ const top=i%2===0;
      const deco=`<div class="kb-deco" aria-hidden="true">${top?im('kb-gar','s-atas.webp'):im('kb-ck kb-ck-l','s-kiri.webp')+im('kb-ck kb-ck-r','s-kanan.webp')}${im('kb-bf','kupu/'+((i*3)%10+1)+'.webp',`--x:${BX[i%8]}%;--y:${BY[i%8]}%;--d:${(-i*1.3).toFixed(1)}s`)}</div>`;
      sec[k]=sec[k].replace(/^(\s*<section\b)([^>]*)>/, (m,a,b)=>{ const c='kb-s'+(top?'a':'b'); return a+(/\sclass="/.test(b)?b.replace(/\sclass="/,' class="'+c+' '):b+' class="'+c+'"')+'>'+deco; });
    });
  }
  // Tema Beludru: permukaan beludru, suede & plester berganti per bagian, rangkaian bunga di sudut
  if(t.layout==='beludru'){ const A=t.ilDir, im=(c,f,st)=>`<img class="${c}" src="${A}${f}.webp" alt=""${st?` style="${st}"`:''} loading="lazy" decoding="async">`;
    const SURF=['su','pl','su','sd','pl','su','sd'];
    const FL=[[['bl-c tl','flora-3'],['bl-c br','flora-4']],[['bl-c tr','flora-4'],['bl-c bl','flora-3']],[['bl-c tlx','flora-1'],['bl-c trx','flora-2']],[['bl-c tr','flora-2']],[['bl-c tl','flora-1'],['bl-c br','flora-3']],[['bl-c trx','flora-4']],[['bl-c tlx','flora-2']]];
    order.forEach((k,i)=>{ const f=FL[i%FL.length].map(([c,n])=>im(c,n)).join('');
      const bf = i%3===1 ? `<i class="bl-bf" style="left:${i%2?12:74}%;top:${18+i*7%30}%;--d:${-i*2}s"><img src="${A}butterfly.webp" alt="" loading="lazy"></i>` : '';
      const band = i===0 ? `<div class="bl-dam"></div>` : '';
      sec[k]=sec[k].replace(/^(\s*<section\b)([^>]*)>/, (m,a,b)=>{ const c='bl-s bl-'+SURF[i%SURF.length]+(i===0?' bl-first':''); return a+(/\sclass="/.test(b)?b.replace(/\sclass="/,' class="'+c+' '):b+' class="'+c+'"')+'>'+band+`<div class="bl-deco" aria-hidden="true">${f}${bf}</div>`; });
    });
    if(sec.acara){ sec.acara=sec.acara.replace(/(<h3>[\s\S]*?<\/h3>)/, `$1${im('bl-lily','calla-lily')}`).replace(/<\/section>\s*$/, `${im('bl-venue','venue')}</section>`); }
    if(sec.hadiah) sec.hadiah=sec.hadiah.replace(/(<h3[^>]*>[\s\S]*?<\/h3>)/, `$1${im('bl-gift','giftbox')}`);
    if(sec.cerita) sec.cerita=sec.cerita.replace(/(<h3[^>]*>[\s\S]*?<\/h3>)/, `${im('bl-seal','wax-seal')}$1`);
  }
  // Tema Teras: pita taman hijau bergelombang di bawah bagian berselang-seling
  if(t.layout==='teras' && t.ilMode==='taman'){ const A=t.ilDir, tk=t.tm||{}, F=Object.assign({wis:'pita',sak:'sakura',kal:'kalung',bangku:'bangku'},tk.files||{}), BF=tk.bf||['b1','b3'], PT=tk.pet||['bunga6','bunga7','bunga8'];
    if(sec.acara) sec.acara=sec.acara.replace(/<\/section>\s*$/, `<img class="tm-bangku" src="${A}${F.bangku}.webp" alt="" aria-hidden="true" loading="eager" decoding="async"></section>`);
    // tiap bagian punya pemandangan taman sendiri di dasarnya: [berkas, kiri%, lebar%, bawah%, kelas]
    const SC=tk.scenes||[
      [['rumpun',-6,30,0,'w tall'],['mawar',18,46,0,'w'],['hortensia',58,48,0,'w']],
      [['willow',-16,52,0,'tr'],['minumburung',30,56,0,''],['rumpun-r',76,30,0,'w tall']],
      [['mawar',-8,48,0,'w'],['kucing',34,40,1,''],['pohon',66,46,0,'tr']],
      [['rumahburung',-4,40,0,''],['hortensia',30,46,0,'w'],['willow-r',62,52,0,'tr']],
      [['pohon',-14,40,10,'tr'],['depan',-6,112,0,'w']],
    ];
    const TOPS=tk.tops||['c','wis','sak','wis','c','sak'];
    order.forEach((k,i)=>{ const top=TOPS[i%TOPS.length], hasBed=k!=='acara';
      const bf=[0,1].map(q=>{ const BX=[[8,22],[80,40],[14,58],[76,18],[6,44],[84,62],[20,30],[70,52]]; const [x,y]=BX[(i*2+q)%8]; return `<i class="tm-bf" style="--x:${x}%;--y:${y}%;--d:${-(i*1.7+q*3).toFixed(1)}s;--t:${10+q*3+i%3}s"><img src="${A}${BF[(i+q)%BF.length]}.webp" alt="" loading="lazy"></i>`; }).join('');
      const pet=[0,1,2].map(q=>`<img class="tm-pt2" src="${A}${PT[(i+q)%PT.length]}.webp" alt="" loading="lazy" style="--x:${(i*29+q*31+11)%86+4}%;--d:${-(i*2.3+q*4.1).toFixed(1)}s;--t:${14+q*3}s">`).join('');
      const head = top==='none' ? '' : top==='wis' ? `<img class="tm-wis" src="${A}${F.wis}.webp" alt="" loading="lazy" decoding="async">` : top==='sak' ? `<img class="tm-sak" src="${A}${F.sak}.webp" alt="" loading="lazy" decoding="async">` : top==='kal' ? `<img class="tm-kal" src="${A}${F.kal}.webp" alt="" loading="lazy" decoding="async">` : `<img class="tm-c l" src="${A}sudut.webp" alt="" loading="lazy" decoding="async"><img class="tm-c r" src="${A}sudut-r.webp" alt="" loading="lazy" decoding="async">`;
      const gr = tk.ground ? `<div class="tm-gr">${['l','m','r'].map(q=>`<img class="tm-dp ${q}" src="${A}${tk.ground}.webp" alt="" loading="lazy" decoding="async">`).join('')}</div>` : '';
      const scene = hasBed ? `<div class="tm-scene${tk.ground?' has-gr':''}" aria-hidden="true">${gr}${SC[i%SC.length].map(([f,l,w,bt,c],q)=>`<img class="tm-it ${c}" src="${A}${f}.webp" alt="" loading="lazy" decoding="async" style="left:${l}%;width:${w}%;bottom:${bt}%;--d:${-(q*1.3+i).toFixed(1)}s;z-index:${c.includes('tr')?1:2+q}">`).join('')}</div>` : '';
      sec[k]=sec[k].replace(/^(\s*<section\b)([^>]*)>/, (m,a,b)=>{ const c='tm-s tm-h-'+top+(hasBed?' tm-hb':''); return a+(/\sclass="/.test(b)?b.replace(/\sclass="/,' class="'+c+' '):b+' class="'+c+'"')+'>'+`<div class="tm-deco" aria-hidden="true">${head}${bf}${pet}</div>`; });
      if(hasBed) sec[k]=sec[k].replace(/<\/section>\s*$/, scene+'</section>');
    });
  } else if(t.layout==='teras'){
    order.forEach((k,i)=>{ if(i%2) return; sec[k]=sec[k].replace(/^(\s*<section\b)([^>]*)>/, (m,a,b)=>a+(/\sclass="/.test(b)?b.replace(/\sclass="/,' class="tr-pb '):b+' class="tr-pb"')+'>').replace(/<\/section>\s*$/, `<img class="tr-pita" src="${t.ilDir||'/assets/teras/'}pita.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"></section>`); });
  }
  return `
  <div class="inv${big}${t.layout?' lay-'+t.layout+' prem':''}${t.ilMode?' il-'+t.ilMode:''}${t.tm&&t.tm.cls?' '+t.tm.cls:''}" style="${themeStyle(t, S.accent, fontOf())};--t-op:${op2}${t.layout==='teras'&&t.ilVars?';'+t.ilVars:''}${t.layout==='kebun'&&t.kbSet?`;--kb-langit:url('${t.kbSet}s-langit.webp');--kb-sh2:${t.kbSh||'#8E6FC0'}`:''}" data-fp="${fontPair()?S.fontPair:'tema'}" data-inv>
    <div class="pat"></div>${t.layout==='dongeng'?`<div class="dg-stk" aria-hidden="true">${DG_BODY}</div>`:''}${t.layout==='goresan'?`<div class="go-stk" aria-hidden="true">${[[6,6,20,0],[90,12,16,-1],[5,24,14,-2],[92,33,20,-.5],[7,45,18,-1.4],[90,55,14,-2.2],[6,68,20,-.8],[91,78,16,-1.8],[8,90,14,-.3]].map(a=>goSt(...a)).join('')}</div>`:''}${t.dp?`<div class="dp-fly dp-body" aria-hidden="true"><span class="dp-bf" style="top:22%;--d:26s;--dl:-6s"><i>${DP_BF}</i></span><span class="dp-bf rev" style="top:48%;--d:30s;--dl:-18s;width:26px"><i>${DP_BF}</i></span><span class="dp-bf" style="top:74%;--d:28s;--dl:-11s"><i>${DP_BF}</i></span><span class="dp-bf rev" style="top:93%;--d:22s;--dl:-2s;width:26px"><i>${DP_BF}</i></span></div>`:''}
    ${opts.watermark ? `<span class="wm">Pratinjau · belum dipublikasikan</span>`:''}
    ${t.layout ? coverHTML(t, {id, guest, n1:nick1, n2:nick2, dateLong:first?fmtShort(first.date):'', dateDots:first?dateDots(first.date):'', accent:S.accent||t.accent, gate:opts.gate, photo:t.photo?coverPhoto(t):''}) : `
    <section class="cover" id="${id}-cover">
      <div class="card">
        <div class="k-label" data-scramble="${first ? esc(fmtShort(first.date)) : ''}">Undangan Pernikahan</div>
        <div class="names">${esc(nick1)}<span class="amp">&amp;</span>${esc(nick2)}</div>
        <div class="date">${first ? esc(fmtShort(first.date)) : 'Tanggal acara'}</div>
        <div class="cv-slot"><div class="to">Kepada Yth.<b data-guestname>${esc(guest)}</b></div>
        ${opts.gate ? `<button class="open" data-act="open-inv">${ico('mail')}<span>Buka undangan</span></button>` : ''}</div>
      </div>
    </section>`}
    ${order.map(k=>sec[k]).join('')}
    <section class="p-end">
      ${t.layout==='teras'?`<div class="tr-akhir" aria-hidden="true"><img class="bg" src="${t.ilDir||'/assets/teras/'}sampul2.webp" alt="" loading="lazy" decoding="async"><img class="cp" src="${t.ilDir||'/assets/teras/'}${t.ilMode==='taman'?'depan':'pasangan'}.webp" alt="" loading="lazy" decoding="async">${t.ilMode==='taman'?`<img class="tm-arch2" src="${t.ilDir}${(t.tm&&t.tm.files&&t.tm.files.arch)||'lengkung'}.webp" alt="" loading="lazy">`:''}<div class="tr-badge"><img src="${t.ilDir||'/assets/teras/'}${(t.tm&&t.tm.files&&t.tm.files.lencana)||'lencana'}.webp" alt=""><span>${esc((nick1||'?')[0])}${esc((nick2||'?')[0])}</span></div></div>`:''}
      ${t.layout==='kebun'&&t.kbSet?`<div class="kb-akhir"><img src="${t.kbSet}s-akhir.webp" alt="" loading="lazy" decoding="async"><span class="kb-akhir-t">Terima kasih</span></div>`:''}
      ${t.layout==='goresan'?`<div class="go-see">Sampai jumpa${first?`<br>di ${esc(dateDots(first.date))}`:''}</div>${goStrip(t)}`:''}
      ${t.layout==='dongeng'?`<div class="dg-win" aria-hidden="true"><div class="ph" style="background-image:url('${coverPhoto(t)}')"></div></div>`:''}
      ${t.layout==='beludru'?`<img class="bl-c tlx" src="${t.ilDir}flora-1.webp" alt="" aria-hidden="true" loading="lazy"><img class="bl-c trx" src="${t.ilDir}flora-2.webp" alt="" aria-hidden="true" loading="lazy"><i class="bl-bf" aria-hidden="true" style="right:18%;top:20%"><img src="${t.ilDir}butterfly.webp" alt="" loading="lazy"></i><div class="bl-frame">`:''}
      <h3>Terima kasih</h3>
      <p class="lead">Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.</p>
      <div class="names" style="font-size:38px">${esc(nick1)} <span style="color:var(--t-accent);font-style:italic">&amp;</span> ${esc(nick2)}</div>${t.layout==='beludru'?`</div><div class="bl-env bl-env2" aria-hidden="true"><img class="bk" src="${t.ilDir}envelope-back.webp" alt="" loading="lazy"><img class="ft" src="${t.ilDir}envelope-front.webp" alt="" loading="lazy"><img class="bl-tas" src="${t.ilDir}tassel-green.webp" alt="" loading="lazy"></div>`:''}
      <button type="button" class="ibtn sv-btn" data-act="souvenir" data-guest="${esc(guest)}">${ico('down')}Simpan kartu kenangan</button>
    </section>
    <a class="foot" href="/?ref=undangan" target="_blank" rel="noopener">Dibuat dengan Sakara</a>
  </div>`;
}
/* ---------- Kartu kenangan digital: PNG 1080×1350 bergaya tema, berisi nama tamu ---------- */
async function souvenirCard(btn){
  if(btn.dataset.busy) return; btn.dataset.busy=1; const lbl=btn.lastChild, old=lbl.textContent; lbl.textContent='Menyiapkan kartu…';
  try{
    const inv=btn.closest('.inv')||document.querySelector('.inv'); const cs=getComputedStyle(inv);
    const v=(k,f)=>{ const x=cs.getPropertyValue(k).trim(); return x||f; };
    const bg=v('--t-bg','#FBF7F2'), fg=v('--t-fg','#3A2A2E'), ac=v('--t-accent','#B5656F'), soft=v('--t-soft','#F3E9E4');
    const font=v('--t-font',"'Cormorant Garamond', serif"), body="'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif";
    const n1=S.bride.nick||S.bride.name.split(' ')[0]||'', n2=S.groom.nick||S.groom.name.split(' ')[0]||'';
    const first=S.events.find(e=>e.date); const guest=(btn.dataset.guest||'').trim(); const named=guest && guest!=='Bapak/Ibu/Saudara/i' && guest!=='Tamu undangan';
    try{ await Promise.all([document.fonts.load(`500 120px ${font}`), document.fonts.load(`italic 500 60px ${font}`), document.fonts.load(`600 30px ${body}`)]); }catch(e){}
    const W=1080, H=1350, c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
    const paint=(col,fb)=>{ x.fillStyle=fb; x.fillStyle=col; };
    paint(bg,'#FBF7F2'); x.fillRect(0,0,W,H);
    // bingkai ganda
    x.strokeStyle=ac; x.globalAlpha=.55; x.lineWidth=3; x.strokeRect(54,54,W-108,H-108); x.globalAlpha=.25; x.lineWidth=1.5; x.strokeRect(74,74,W-148,H-148); x.globalAlpha=1;
    // lingkaran lembut di atas
    paint(soft,'#F3E9E4'); x.globalAlpha=.7; x.beginPath(); x.arc(W/2,370,150,0,Math.PI*2); x.fill(); x.globalAlpha=1;
    x.textAlign='center'; x.textBaseline='middle';
    paint(ac,'#B5656F'); x.font=`600 26px ${body}`; x.letterSpacing='8px'; x.fillText('KARTU KENANGAN', W/2, 150); x.letterSpacing='0px';
    // monogram
    paint(fg,'#3A2A2E'); x.font=`500 132px ${font}`; x.fillText(`${(n1[0]||'').toUpperCase()}${(n2[0]||'').toUpperCase()}`, W/2, 376);
    const fit=(txt,max,size,wt,fam,it)=>{ let z=size; do{ x.font=`${it?'italic ':''}${wt} ${z}px ${fam}`; z-=4; }while(x.measureText(txt).width>max && z>24); };
    paint(fg,'#3A2A2E'); fit(`${n1} & ${n2}`, W-240, 104, 500, font); x.fillText(`${n1} & ${n2}`, W/2, 620);
    if(first){ paint(fg,'#3A2A2E'); x.globalAlpha=.75; x.font=`500 30px ${body}`; x.fillText(fmtShort(first.date)+(first.venue?` · ${first.venue}`:''), W/2, 690, W-240); x.globalAlpha=1; }
    // ornamen garis
    paint(ac,'#B5656F'); x.fillRect(W/2-150,770,110,2); x.fillRect(W/2+40,770,110,2); x.beginPath(); x.moveTo(W/2,756); x.lineTo(W/2+14,770); x.lineTo(W/2,784); x.lineTo(W/2-14,770); x.closePath(); x.fill();
    paint(ac,'#B5656F'); fit(named?`Terima kasih, ${guest}`:'Terima kasih', W-220, 64, 500, font, true); x.fillText(named?`Terima kasih, ${guest}`:'Terima kasih', W/2, 880);
    paint(fg,'#3A2A2E'); x.globalAlpha=.85; x.font=`500 32px ${body}`;
    ['telah menjadi bagian dari','hari bahagia kami.'].forEach((l,i)=>x.fillText(l, W/2, 970+i*48)); x.globalAlpha=1;
    paint(fg,'#3A2A2E'); x.globalAlpha=.5; x.font=`600 22px ${body}`; x.letterSpacing='4px'; x.fillText('DIBUAT DENGAN SAKARA', W/2, H-130); x.letterSpacing='0px'; x.globalAlpha=1;
    const blob=await new Promise(r=>c.toBlob(r,'image/png')); const name=`kartu-kenangan-${(n1+'-'+n2).toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;
    const file=new File([blob], name, {type:'image/png'});
    if(navigator.canShare && navigator.canShare({files:[file]}) && matchMedia('(pointer:coarse)').matches){ try{ await navigator.share({files:[file], title:`Kartu kenangan ${n1} & ${n2}`}); return; }catch(e){ if(e && e.name==='AbortError') return; } }
    const u=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000);
    toast('Kartu kenangan tersimpan');
  }catch(e){ toast('Kartu belum bisa dibuat. Coba lagi, ya.'); }
  finally{ delete btn.dataset.busy; lbl.textContent=old; }
}
function addDays(d,n){ const x=new Date(d+'T00:00:00'); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); }
function countHTML(d){
  const diff = Math.max(0, new Date(d+'T08:00:00') - new Date());
  const D=Math.floor(diff/864e5), H=Math.floor(diff/36e5)%24, M=Math.floor(diff/6e4)%60;
  return `<div><b class="num">${D}</b><small>hari</small></div><div><b class="num">${H}</b><small>jam</small></div><div><b class="num">${M}</b><small>menit</small></div>`;
}
let rvSeq=0;
function rsvpForm(guest, g){
  const k = ++rvSeq; const q = guestQuota(g); const pax = q ? Math.min(g?.pax || Math.min(2,q), q) : (g?.pax || 2);
  return `<form class="form" data-rsvpform${q?` data-max="${q}"`:''}>
    <label for="rv-n${k}">Nama</label>
    <input class="in" id="rv-n${k}" value="${esc(guest==='Bapak/Ibu/Saudara/i'?'':guest)}" required>
    <span style="font-size:13px;font-weight:700">Apakah akan hadir?</span>
    <div class="opt" role="group" aria-label="Kehadiran"><button type="button" data-att="hadir" aria-pressed="true">Hadir</button><button type="button" data-att="tidak" aria-pressed="false">Tidak bisa</button></div>
    <div data-paxwrap><span style="font-size:13px;font-weight:700">Jumlah orang</span>
    ${q===1?`<div class="pax pax-one"><output data-paxv>1</output><small>sesuai undangan</small></div>`:`<div class="pax"><button type="button" data-pax="-1" aria-label="Kurangi">−</button><output data-paxv>${pax}</output><button type="button" data-pax="1" aria-label="Tambah">+</button></div>${q?`<small class="pax-max">Maksimal ${q} orang</small>`:''}`}
    ${(()=>{ if(S.arriveOn===false) return ''; const me=mainEvent(g); const sl=slotsFor(me); if(!sl.length) return ''; return `<span style="font-size:13px;font-weight:700;display:block;margin-top:12px">Perkiraan jam datang ke ${esc(me.type||'acara')} <span style="font-weight:500;opacity:.7">(opsional)</span></span><div class="arr" role="group" aria-label="Perkiraan jam datang" style="margin-top:8px">${sl.map(x=>`<button type="button" data-arr="${x}" aria-pressed="${!!(g&&g.arrive===x)}">${x}</button>`).join('')}</div><span class="arr-note">Supaya kami bisa menyambut Anda tanpa antre panjang.</span>`; })()}</div>
    <button class="ibtn solid" style="justify-content:center;margin-top:6px">Kirim konfirmasi</button>
  </form>`;
}
function wishList(){
  return W.filter(w=>w.show).slice(0,6).map(w=>`<div class="wish"><b>${esc(w.n)}</b>${w.att?'<span class="att">Hadir</span>':''}<small>${esc(w.t)}</small><p>${esc(w.m)}</p></div>`).join('');
}
function bindInv(root){
  renderCrowd(root); memFill(root);
  root.querySelectorAll('[data-rsvpform]').forEach(f=>{
    if(f.dataset.bound) return; f.dataset.bound=1;
    let att='hadir', pax=+f.querySelector('[data-paxv]').textContent||2, arrive=(f.querySelector('[data-arr][aria-pressed=true]')||{}).dataset?.arr||'';
    f.addEventListener('click',e=>{
      const a = e.target.closest('[data-att]'); const p = e.target.closest('[data-pax]');
      if(a){ att=a.dataset.att; f.querySelectorAll('[data-att]').forEach(b=>b.setAttribute('aria-pressed', b===a)); f.querySelector('[data-paxwrap]').hidden = att!=='hadir'; }
      if(p){ const mx=+f.dataset.max||6; pax=Math.min(mx,Math.max(1,pax+ +p.dataset.pax)); f.querySelector('[data-paxv]').textContent=pax; if(+p.dataset.pax>0 && pax===mx && f.dataset.max) toast(`Undangan ini untuk maksimal ${mx} orang`); }
      const ar = e.target.closest('[data-arr]'); if(ar){ arrive = arrive===ar.dataset.arr ? '' : ar.dataset.arr; f.querySelectorAll('[data-arr]').forEach(b=>b.setAttribute('aria-pressed', b.dataset.arr===arrive)); }
    });
    f.addEventListener('submit',async e=>{
      e.preventDefault();
      const n = f.querySelector('input').value.trim();
      if(!n){ f.querySelector('input').focus(); return; }
      if(CLOUD.guestMode){
        const btn=f.querySelector('button.solid'); btn.disabled=true; btn.textContent='Mengirim…';
        const { data, error } = await CLOUD.sb.rpc('rsvp',{p_slug:CLOUD.slug, p_code:rsvpCode(n), p_name:n, p_status:att, p_pax:pax, p_arrive: att==='hadir'?arrive:''});
        if(error){ btn.disabled=false; btn.textContent='Kirim konfirmasi'; toast('Gagal mengirim: '+error.message); return; }
        rsvpRemember(data); G=[CLOUD.guest];
        if(!CLOUD.code){ CLOUD.code=data.code; try{ history.replaceState(null,'',`/u/${CLOUD.slug}?to=${data.code}`); }catch(err){} }
        f.parentElement.dataset.gid = CLOUD.guest.id; f.parentElement.innerHTML = rsvpDone(CLOUD.guest, att, data.pax); return;
      }
      const gid = f.closest('[data-rsvp]')?.dataset.gid;
      let g = (gid && G.find(x=>x.id===gid)) || G.find(x=>x.name.toLowerCase()===n.toLowerCase());
      if(g){ g.status=att; g.pax= att==='hadir'?pax:0; g.arrive = att==='hadir'?arrive:''; }
      else { g = {id:'g'+Date.now(),name:n,group:'Lewat undangan',phone:'',status:att,pax:att==='hadir'?pax:0,sent:true,sessions:S.events.map((e,i)=>i),arrive:att==='hadir'?arrive:''}; g.code=makeCode(g); G.unshift(g); }
      saveG();
      f.parentElement.dataset.gid = g.id;
      f.parentElement.innerHTML = rsvpDone(g, att, pax);
    });
  });
  root.querySelectorAll('[data-wishform]').forEach(f=>{
    if(f.dataset.bound) return; f.dataset.bound=1;
    f.addEventListener('submit',async e=>{
      e.preventDefault();
      const [n,m] = [f.querySelector('input').value.trim(), f.querySelector('textarea').value.trim()];
      if(!n||!m){ (n?f.querySelector('textarea'):f.querySelector('input')).focus(); return; }
      if(CLOUD.guestMode){ const { error } = await CLOUD.sb.rpc('add_wish',{p_slug:CLOUD.slug, p_name:n, p_message:m, p_code:CLOUD.guest?.code||null}); if(error){ toast('Ucapan gagal terkirim: '+error.message); return; } }
      W.unshift({n,m,t:'baru saja',att:CLOUD.guest?.status==='hadir',show:true}); saveW();
      f.querySelector('textarea').value='';
      root.querySelectorAll('[data-wishlist]').forEach(l=>l.innerHTML=wishList());
      toast('Terima kasih, ucapan Anda sudah terkirim 🙏');
    });
  });
}

/* ---------- Hero ---------- */
const heroThemes = () => [...new Set([S.theme,'kawung','lentera','kamboja','songket','sekar','arunika'])].filter(id=>THEMES.some(t=>t.id===id)).slice(0,6);
let heroIdx=0, heroT=null;
// Nama pasangan di hero: yang diketik pengunjung, kalau kosong pakai nama di undangannya (atau contoh)
const DEF_NICK = () => [DEFAULT.bride.nick, DEFAULT.groom.nick];
const heroNames = () => { const a=$('#tryN1'), b=$('#tryN2'); return [(a&&a.value.trim())||S.bride.nick||DEF_NICK()[0], (b&&b.value.trim())||S.groom.nick||DEF_NICK()[1]]; };
let heroHold=0;
function heroPrefill(){ const a=$('#tryN1'), b=$('#tryN2'); if(!a||!b||a.value||b.value||document.activeElement===a||document.activeElement===b) return;
  if(S.bride.nick && S.bride.nick!==DEFAULT.bride.nick) a.value=S.bride.nick; if(S.groom.nick && S.groom.nick!==DEFAULT.groom.nick) b.value=S.groom.nick; }
function renderHero(){
  const s = $('#heroScreen'); const ids = heroThemes(); if(heroIdx>=ids.length) heroIdx=0;
  heroPrefill();
  const [n1,n2] = heroNames(), S0 = S;
  let html;
  try{ S = {...S0, bride:{...S0.bride, nick:n1}, groom:{...S0.groom, nick:n2}};
    html = ids.map((id,i)=>`<div class="hs${i===heroIdx?' on':''}" data-hs="${i}" aria-hidden="${i!==heroIdx}">${invHTML({theme:id, idp:'h'+i, guest:'Bapak Budi & Keluarga'})}</div>`).join(''); }
  finally{ S = S0; }
  s.innerHTML = html + `<button type="button" class="hs-hit" data-act="demo" data-t="${ids[heroIdx]}" aria-label="Lihat demo tema ${esc(themeById(ids[heroIdx]).name)}"></button>`;
  heroCap(ids);
  clearInterval(heroT); if(!REDUCED()) heroT = setInterval(heroNext, 3800);
}
function heroCap(ids){ const c=$('#heroCap'); if(!c) return; c.innerHTML = `<span class="hc-name">${esc(themeById(ids[heroIdx]).name)}</span><span class="hc-dots" role="group" aria-label="Pilih tema contoh">${ids.map((id,i)=>`<button type="button" data-hero="${i}" aria-pressed="${i===heroIdx}" aria-label="${esc(themeById(id).name)}"></button>`).join('')}</span>`; }
function heroGo(i){
  const ids=heroThemes(); const s=$('#heroScreen'); if(!s) return; heroIdx=(i+ids.length)%ids.length;
  $$('.hs', s).forEach((el,k)=>{ el.classList.toggle('on', k===heroIdx); el.setAttribute('aria-hidden', k!==heroIdx); });
  const hit=$('.hs-hit', s); if(hit){ hit.dataset.t=ids[heroIdx]; hit.setAttribute('aria-label','Lihat demo tema '+themeById(ids[heroIdx]).name); }
  heroCap(ids);
}
function heroNext(){ const s=$('#heroScreen'); if(!s || s.closest('[hidden]') || document.hidden || s.parentElement.matches(':hover')) return;
  const f=document.activeElement; if(f && (f.id==='tryN1'||f.id==='tryN2')) return; if(Date.now()-heroHold<9000) return; heroGo(heroIdx+1); }
document.addEventListener('click', e=>{ const b=e.target.closest('[data-hero]'); if(!b) return; heroGo(+b.dataset.hero); clearInterval(heroT); if(!REDUCED()) heroT=setInterval(heroNext, 3800); });
// Ketik nama: sampul ikut berubah, putaran tema berhenti dulu supaya perubahannya kelihatan
let heroTyping=null;
['tryN1','tryN2'].forEach(id=>$('#'+id)?.addEventListener('input', ()=>{ heroHold=Date.now(); clearTimeout(heroTyping); heroTyping=setTimeout(renderHero, 220); }));
// Bawa nama ke editor saat klik "Buat undangan gratis"
$('#tryGo')?.addEventListener('click', ()=>{
  const n1=$('#tryN1').value.trim(), n2=$('#tryN2').value.trim(); if(!n1 && !n2) return;
  const set=(p,n,D)=>{ if(!n) return; p.nick=n; if(!p.name || p.name===D.name) p.name=n; };
  set(S.bride,n1,DEFAULT.bride); set(S.groom,n2,DEFAULT.groom); save();
  const ed=$('#editor'); if(ed) delete ed.dataset.built;
  sessionStorage.setItem('sp-hero-names','1');
});

/* ---------- Theme cards ---------- */
/* K3: tema yang baru ditambahkan diberi label Baru di katalog */
const NEW_THEMES = new Set(['rumah-gadang','adat-batak','adat-betawi','adat-bugis','cx-kolase','cx-tepilaut','cx-lembarharian','cx-pasarmalam','cx-jendelabulan','cx-lipatkertas','cx-kertasriang']);
/* K2: sampul kartu bisa diketuk untuk membuka demo, tombol tinggal satu (Pakai) */
const tcPeek = t => `${NEW_THEMES.has(t.id)?'<span class="tc-new">Baru</span>':''}<span class="tc-peek" aria-hidden="true">${ico('eye')}Lihat demo</span>`;
const tcCoverAttr = t => `role="button" tabindex="0" data-act="demo" data-t="${t.id}" aria-label="Lihat demo tema ${esc(t.name)}"`;
function tcard(t){
  return `<article class="tcard">
    ${t.layout ? `<div class="cover tc-wrap" ${tcCoverAttr(t)} style="${themeStyle(t)}">${tcPeek(t)}<div class="tc-live" data-tclive>${tcLive(t)}</div></div>` : `<div class="cover" ${tcCoverAttr(t)} style="${themeStyle(t)}">${tcPeek(t)}<div class="frame"></div>
      <div class="inner"><small>The Wedding of</small><div class="nm">${esc(S.bride.nick||'Sarah')}<i>&amp;</i>${esc(S.groom.nick||'Raka')}</div><small>${esc(fmtShort(S.events[0].date||'2027-02-14'))}</small></div>
    </div>`}
    <div class="meta">
      <div class="top"><h3>${esc(t.name)}</h3>${t.region&&t.region!=='Nasional'?`<span class="reg">${esc(t.region)}</span>`:''}</div>
      <div class="chips">${t.tags.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div>
      <div class="acts"><button class="btn btn-primary btn-sm" data-act="use-theme" data-t="${t.id}">Pakai tema ini</button></div>
    </div>
  </article>`;
}
function tcLive(t){ const d0=S.events.find(e=>e.date)?.date||'2027-02-14'; return `<div class="inv lay-${t.layout}" style="${themeStyle(t)}"><div class="pat"></div>${coverHTML(t,{id:'tc'+t.id, guest:'Tamu undangan', n1:S.bride.nick||'Sarah', n2:S.groom.nick||'Raka', dateLong:fmtShort(d0), dateDots:dateDots(d0), accent:t.accent, gate:false, photo:t.photo?coverPhoto(t):''}).replace(/data-act="open-inv"/g,'tabindex="-1" aria-hidden="true"').replace(/ id="tc[a-z]+-cover"/,'')}</div>`; }
function fitLive(root){ $$('[data-tclive]', root||document).forEach(el=>{ const w=el.parentElement.clientWidth, h=el.parentElement.clientHeight; if(w) el.style.setProperty('--tcs', Math.max(w/360, h/450)); }); }
addEventListener('resize', ()=>fitLive());
function renderStrip(){ $('#themeStrip').innerHTML = themeOrder(['sekar','kamboja','lentera','arunika'].map(themeById)).concat(themeOrder(THEMES)).filter((t,i,a)=>a.indexOf(t)===i).slice(0,4).map(tcard).join(''); fitLive($('#themeStrip')); }
/* Galeri tema di beranda: isinya sama dengan halaman Tema (urutan & sembunyi dari admin ikut).
   Tema yang punya sampul potret di /assets/home/<id>.webp memakai gambar itu, sisanya memakai sampul langsung. */
const HOME_COVER=new Set(['rumah-gadang','beludru','teras','joglo','kebun-teh','taman-wisteria','taman-keraton','kebun-lila','kebun-senja','draperi-mawar','kawung','kebun-mawar','songket','atelier','draperi-zamrud','dongeng-pink','kebun-biru','kamboja','goresan-merah','kebun-sage']);
function homeCard(t){
  const rg=(t.region||'').split(',')[0].trim(), lbl=[t.tags[0], rg&&rg!=='Nasional'&&rg.length<=12?rg:''].filter(Boolean).join(' · ');
  const n1=esc(S.bride.nick||'Sarah'), n2=esc(S.groom.nick||'Raka');
  const ph = HOME_COVER.has(t.id) ? `<img loading="lazy" src="/assets/home/${t.id}.webp" alt="Sampul tema ${esc(t.name)}">`
    : t.layout ? `<div class="e-live" style="${themeStyle(t)}"><div class="tc-live" data-tclive>${tcLive(t)}</div></div>`
    : `<div class="tcard e-live"><div class="cover" style="${themeStyle(t)}"><div class="frame"></div><div class="inner"><small>The Wedding of</small><div class="nm">${n1}<i>&amp;</i>${n2}</div><small>${esc(fmtShort(S.events[0].date||'2027-02-14'))}</small></div></div></div>`;
  return `<article class="e-card" role="button" tabindex="0" data-act="demo" data-t="${t.id}" aria-label="Lihat demo tema ${esc(t.name)}"><div class="e-ph">${ph}</div><div class="e-meta"><b>${esc(t.name)}</b><small>${esc(lbl)}</small></div></article>`;
}
/* Slider beranda cuma menampilkan HOME_MAX tema pertama; sisanya lewat kartu penutup "Lihat semua tema" ke halaman #tema */
const HOME_MAX=10;
function homeAllCard(all, shown){
  const rest=all.length-shown.length;
  const pics=all.slice(shown.length).concat(shown).filter(t=>HOME_COVER.has(t.id)).slice(0,3);
  const fan=pics.map((t,i)=>`<img loading="lazy" src="/assets/home/${t.id}.webp" alt="" style="--i:${i}">`).join('');
  const arrow='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  return `<a class="e-card e-all" href="#tema" aria-label="Lihat semua ${all.length} tema"><div class="e-ph"><div class="e-all-fan" aria-hidden="true">${fan}</div><div class="e-all-txt"><span class="e-all-n">+${rest}</span><b>Lihat semua<br><i>tema</i></b><span class="e-all-go" aria-hidden="true">${arrow}</span></div></div><div class="e-meta"><b>Semua tema</b><small>${all.length} tema</small></div></a>`;
}
function renderHomeThemes(){ const tr=$('#e-track'); if(!tr) return; const all=themeOrder(THEMES), shown=all.slice(0,HOME_MAX); tr.innerHTML=shown.map(homeCard).join('')+(all.length>shown.length?homeAllCard(all,shown):''); fitLive(tr); window.EDH&&EDH.gallery&&EDH.gallery(); }
let catTag='Semua', catQ='';
let catKind='lukisan';
function cxCard(t){
  return `<article class="tcard cx-card"><div class="cover" ${tcCoverAttr(t)}>${tcPeek(t)}<img loading="lazy" decoding="async" src="${t.thumbImg}" alt="Sampul tema ${esc(t.name)}"></div>
    <div class="meta"><div class="top"><h3>${esc(t.name)}</h3><span class="cx-badge">Paket Custom</span></div>
      <p class="cx-desc">${esc(t.desc)}</p>
      <div class="chips">${t.tags.filter(x=>x!=='Custom').map(x=>`<span class="chip">${esc(x)}</span>`).join('')}<span class="chip">Indonesia &amp; English</span></div>
      <div class="acts"><button class="btn btn-primary btn-sm" data-act="use-theme" data-t="${t.id}">Pakai tema ini</button></div></div></article>`;
}
function renderCatalog(){
  const kt=$('#kindTabs'); if(kt) kt.innerHTML = [['lukisan','Lukisan','Tanpa foto, digambar khusus'],['custom','Custom','Pakai foto kalian · Paket Custom']].map(([k,l,d])=>`<button type="button" role="tab" data-kind="${k}" aria-selected="${catKind===k}"><b>${l}</b><small>${d}</small></button>`).join('');
  const lede=$('#catLede'), tb=$('#catToolbar');
  if(catKind==='custom'){ if(tb) tb.hidden=true; if(lede) lede.textContent='Tema penuh foto kalian. Urutan bagian, bagian yang tampil, dan foto di setiap bingkai bebas diatur. Dipublikasikan dengan paket Custom.';
    $('#themeGrid').innerHTML = `<p class="cat-count">${CX_THEMES.filter(t=>!themeHidden(t.id)).length} tema Custom</p>` + CX_THEMES.filter(t=>!themeHidden(t.id)).map(cxCard).join('') + `<div class="cx-note"><span>Mau desain dari nol, khusus kalian?</span><a class="btn btn-ghost btn-sm" href="${customWaUrl()}" data-wa-custom target="_blank" rel="noopener">Ngobrol dengan kami</a></div>`;
    setTimeout(()=>aniScan($('[data-view=tema]')),0); return; }
  if(tb) tb.hidden=false; if(lede) lede.textContent='Tema yang digambar khusus, tanpa perlu foto. Bisa dipakai di paket apa pun, warna dan hurufnya bisa diganti.';
  $('#tagFilter').innerHTML = TAGS.map(t=>`<button type="button" data-tag="${t}" aria-pressed="${t===catTag}">${t}</button>`).join('');
  const q = catQ.toLowerCase();
  const list = themeOrder(THEMES).filter(t => (catTag==='Semua'||t.tags.includes(catTag)) && (!q || (t.name+' '+t.region+' '+t.tags.join(' ')).toLowerCase().includes(q) || (q.includes('jawa')&&t.id==='kawung') || (q.includes('minang')&&t.id==='songket') || (q.includes('batak')&&t.id==='ulos') || (q.includes('bugis')&&t.id==='lontar')));
  setTimeout(()=>{ fitLive($('#themeGrid')); aniScan($('[data-view=tema]')); },0); $('#themeGrid').innerHTML = list.length ? `<p class="cat-count">${list.length} tema${catTag!=='Semua'||catQ?' cocok':''}</p>`+list.map(tcard).join('') : `<div class="empty">${karaImg('bingung','kara-empty')}<b style="color:var(--ink)">Belum ada tema untuk “${esc(catQ)}”.</b><br>Coba kata lain, atau <button class="btn btn-ghost btn-sm" data-act="clear-filter" style="margin-top:10px">tampilkan semua tema</button></div>`;
}
$('#kindTabs').addEventListener('click',e=>{ const b=e.target.closest('[data-kind]'); if(!b) return; catKind=b.dataset.kind; history.replaceState(null,'',location.pathname+location.search+(catKind==='custom'?'#tema-custom':'#tema')); renderCatalog(); });
$('#tagFilter').addEventListener('click',e=>{ const b=e.target.closest('[data-tag]'); if(!b) return; catTag=b.dataset.tag; renderCatalog(); });
$('#themeSearch').addEventListener('input',e=>{ catQ=e.target.value; renderCatalog(); });

/* ---------- Pricing ---------- */
const PLANS = [
  {id:'coba', name:'Coba', price:0, note:'gratis', tag:'Gratis dicoba', fit:'Untuk kalian yang ingin melihat hasilnya dulu sebelum memutuskan.', sum:'Semua tema · Pratinjau penuh', cta:'Mulai gratis'},
  {id:'undangan', name:'Undangan', price:129000, note:'sekali bayar', tag:'Cantik & berkesan', fit:'Untuk kalian yang ingin undangan cantik, lengkap dengan cerita dan kenangan dari tamu.', sum:'Semua tema Lukisan · Ucapan, doa & amplop · Album foto dari tamu', cta:'Pilih Undangan'},
  {id:'tamu', name:'Undangan Lengkap', price:349000, note:'sekali bayar', tag:'Paling lengkap', fit:'Buat acara besar. Semua beres, dari sebar undangan sampai sambut tamu di hari H.', feature:1, sum:'Semua di Undangan · Kirim WA berurutan · Pengingat · QR check-in', cta:'Pilih Undangan Lengkap'},
  {id:'custom', name:'Custom', price:499000, note:'sekali bayar', tag:'Tema Custom', fit:'Buat kalian yang mau undangan penuh foto dan bebas diatur: urutan bagian, bagian yang tampil, sampai foto di setiap bingkai.', sum:'Fitur Undangan Lengkap (tanpa kado patungan) · Tema Custom · Editor bebas atur', cta:'Pilih Custom'}
];
const PLAN_RANK = {coba:0, undangan:1, tamu:2, custom:3};
/* Nomor WA Sakara (format 62…, tanpa + dan spasi). Dipakai untuk yang ingin desain dibuat dari nol. */
const SAKARA_WA = '6281995050125';
const customWaUrl = () => `https://wa.me/${SAKARA_WA}?text=${encodeURIComponent('Halo Sakara! Saya ingin membuat undangan dengan desain dari nol, khusus untuk kami. Boleh berdiskusi soal konsep dan harganya?')}`;
document.querySelectorAll('[data-wa-custom]').forEach(a=>a.href=customWaUrl());
/* [label, coba, undangan, tamu, tampil di kartu?]  nilai: 1 ada, 0 tidak, atau teks */
const FEATS = [
  ['Tampilan undangan', [
    ['Semua tema Lukisan, warna & paduan huruf', 1,1,1, 1],
    ['Tema Custom & editor bebas atur', 0,0,0, 1],
    ['Pratinjau penuh sebelum bayar', 1,1,1],
    ['Musik latar, galeri foto & kisah cinta', 1,1,1],
    ['Bagikan undangan ke tamu', 0,1,1],
    ['Link personal dengan nama tiap tamu', 0,1,1, 1],
    ['Aktif selamanya', 0,1,1],
    ['Bebas edit sampai 30 hari setelah acara', 0,1,1]
  ]],
  ['Tamu & konfirmasi', [
    ['RSVP, ucapan & doa', 0,1,1],
    ['Amplop digital', 0,1,1],
    ['Kado patungan (tema Lukisan)', 0,1,1],
    ['Daftar tamu & status per nama', 0,1,1, 1],
    ['Akun keluarga (keluarga tambah tamu sendiri)', 0,1,1],
    ['Import tamu dari Excel/CSV', 0,0,1],
    ['Grup tamu (keluarga, kantor, dst.)', 0,0,1]
  ]],
  ['Kirim undangan', [
    ['Kirim WhatsApp satu per satu', 0,1,1],
    ['Tulis sendiri template pesan WhatsApp', 0,1,1],
    ['Kirim WhatsApp berurutan ke semua tamu', 0,0,1, 1],
    ['Pengingat untuk tamu yang belum menjawab', 0,0,1]
  ]],
  ['Hari H & sesudahnya', [
    ['Hitungan porsi katering', 0,1,1],
    ['Album foto dari tamu & buku kenangan', 0,1,1],
    ['QR check-in & buku tamu digital', 0,0,1, 1]
  ]]
];
const PLAN_COL = {coba:1, undangan:2, tamu:3, custom:3};
/* Mesin paket: tiap paket punya daftar fitur sendiri (bisa diatur dari panel admin) */
const FEAT_LOCK_KEY = {'Tema Custom & editor bebas atur':'custom','Import tamu dari Excel/CSV':'import','Grup tamu (keluarga, kantor, dst.)':'groups','Kirim WhatsApp berurutan ke semua tamu':'bulk','Pengingat untuk tamu yang belum menjawab':'remind','QR check-in & buku tamu digital':'qr'};
const FEAT_LOCKS = {custom:'Tema Custom', import:'Import tamu dari Excel/CSV', groups:'Kelola grup tamu', bulk:'Kirim WhatsApp berurutan & kartu cetak', remind:'Pengingat tamu yang belum menjawab', qr:'Halaman penerima tamu & QR check-in'};
const fslug = t => t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
FEATS.forEach(g=>g[1].forEach(r=>{ r.key = FEAT_LOCK_KEY[r[0]] || fslug(r[0]); }));
const FEAT_ROWS = () => FEATS.flatMap(g=>g[1]);
const CARD_DEFAULT = FEAT_ROWS().filter(r=>r[4]).map(r=>r.key);
let CARD_KEYS = CARD_DEFAULT.slice();
const PKG_DEFAULT = PLANS.map(p=>({...p, feats:Object.fromEntries(FEAT_ROWS().map(r=>[r.key, r[PLAN_COL[p.id]]]))}));
PKG_DEFAULT.forEach(p=>{ if(p.id==='custom'){ p.feats.custom=1; p.feats['kado-patungan-tema-lukisan']=0; } });
const planOf = id => PLANS.find(p=>p.id===id) || null;
/* fitur yang belum ada di pengaturan paket dari admin memakai nilai bawaan paket itu */
const planFeat = (p, k) => { if(!p) return 1; const v = p.feats ? p.feats[k] : undefined; if(v!==undefined) return v; const d=PKG_DEFAULT.find(x=>x.id===p.id); return d && d.feats[k]!==undefined ? d.feats[k] : 0; };
const planRank = id => { const p=planOf(id); return p ? (p.id==='coba' ? -1 : p.price) : 1e12; };
const planSum = p => { const rows=FEAT_ROWS().filter(r=>(CARD_KEYS.includes(r.key)||FEAT_LOCKS[r.key]) && planFeat(p,r.key)); const cx=rows.find(r=>r.key==='custom'); return (cx?[cx].concat(rows.filter(r=>r!==cx).slice(-2)):rows.slice(-3)).map(r=>r[0]).join(' · '); };
const shownPlans = () => PLANS.filter(p=>!p.hidden);
const upgradeTargets = () => { const cur=planOf(S.plan); const cp = cur ? cur.price : Infinity; return shownPlans().filter(p=>p.price>cp && p.id!=='coba'); };
const canUpgrade = () => S.published && upgradeTargets().length>0;
const cheapestWith = k => shownPlans().filter(p=>p.id!=='coba' && planFeat(p,k)).sort((a,b)=>a.price-b.price)[0] || null;
const featCell = (v, dark) => v===1 ? `<span class="fc yes" role="img" aria-label="Ada">${ico('check')}</span>` : v===0 ? `<span class="fc no" role="img" aria-label="Tidak ada">${ico('x')}</span>` : `<span class="fc txt">${esc(v)}</span>`;
function myPlan(){ const r=(DEMO.on&&DEMO.saved)?DEMO.saved.S:S; if(!r.user) return null; return r.published ? (r.plan||'tamu') : 'coba'; }
function planCta(p, short){
  const cur=myPlan(), cls=`btn ${p.feature?'btn-primary':'btn-ghost'} btn-block`;
  /* di tabel Bandingkan versi HP, label panjang diganti label pendek */
  const L=(full,sm)=> short ? `<span class="cta-l">${full}</span><span class="cta-s" aria-hidden="true">${sm}</span>` : full;
  if(!cur) return `<a class="${cls}" href="${p.id==='custom'?'#tema-custom':'#buat'}" data-plan="${p.id}"${short?` aria-label="${esc(p.cta)}"`:''}>${L(p.cta,'Pilih')}</a>`;
  if(p.id===cur) return `<span class="btn btn-block plan-state is-cur" role="note">${ico('check')}${L('Paket kalian sekarang','Aktif')}</span>`;
  if(planRank(p.id)<planRank(cur)) return `<span class="btn btn-block plan-state" role="note">${L('Sudah termasuk di paket kalian','Termasuk')}</span>`;
  if(cur==='coba') return `<a class="${cls}" href="${p.id==='custom'?'#tema-custom':'#buat'}" data-plan="${p.id}"${short?` aria-label="${esc(p.cta)}"`:''}>${L(p.cta,'Pilih')}</a>`;
  return `<button type="button" class="${cls}" data-act="upgrade"${short?` aria-label="Naik ke ${esc(p.name)}"`:''}>${ico('up')}${L(`Naik ke ${esc(p.name)}`,'Naik')}</button>`;
}
function renderCompare(){
  const ps=shownPlans(), cur=myPlan();
  const head = `<tr class="cmp-head"><th scope="col"><span class="sr">Fitur</span></th>${ps.map(p=>`<th scope="col" class="${p.feature?'feat':''}${p.id===cur?' mine':''}"><span class="cmp-tag">${p.id===cur?'Paket kalian':p.tag}</span><b>${p.name}</b><span class="cmp-price num">${p.price?rupiah(p.price):'Gratis'}</span><span class="cmp-note">${p.price?'sekali bayar':'tanpa daftar'}</span><div class="cmp-cta">${planCta(p,true)}</div></th>`).join('')}</tr>`;
  const body = FEATS.map(([g,rows])=>`<tr class="cmp-group"><th scope="rowgroup" colspan="${ps.length+1}">${g}</th></tr>`+rows.map(r=>`<tr><th scope="row">${r[0]}</th>${ps.map(p=>`<td class="${p.feature?'feat':''}">${featCell(planFeat(p,r.key))}</td>`).join('')}</tr>`).join('')).join('');
  $('#bandingkan').innerHTML = `<div class="page-head"><a class="linkbtn" href="#harga">← Kembali ke harga</a><h1>Bandingkan semua paket</h1><p>Semua paket dibayar sekali, tanpa biaya per tamu. Mulai dari Coba dulu, lalu naik paket kapan saja tanpa mengulang dari awal.</p></div>
    <div class="cmp-wrap"><table class="cmp" style="--plan-n:${ps.length}"><thead>${head}</thead><tbody>${body}</tbody></table></div>
    <p class="muted" style="margin-top:18px;font-size:14px">Mau naik paket nanti? Cukup bayar selisih harganya, tanpa mengulang dari awal. <a href="/syarat">Garansi uang kembali 7 hari</a> berlaku untuk semua paket berbayar.</p>
    <div class="panel-c" style="margin-top:24px;display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><b>Mau desain dari nol, khusus kalian?</b><div class="muted" style="font-size:14px">Ceritakan konsepnya, kami bantu buatkan. Harga dibahas langsung lewat chat.</div></div><a class="btn btn-primary btn-sm" href="${customWaUrl()}" data-wa-custom target="_blank" rel="noopener">Chat di WhatsApp</a></div>`;
}
function planCardHTML(p, cur, preview){
  return `<div class="plan${p.feature?' feature':''}${p.id===cur?' mine':''}">
      ${(p.id===cur||p.tag)?`<span class="tag">${p.id===cur?'Paket kalian':esc(p.tag)}</span>`:''}
      <h3>${esc(p.name)}</h3>
      <div class="price num">${p.price?rupiah(p.price):'Rp0'} <small>${esc(p.note||'')}</small></div>
      ${p.fit?`<p class="plan-fit">${esc(p.fit)}</p>`:''}
      <ul>${FEAT_ROWS().filter(r=>CARD_KEYS.includes(r.key)).map(r=>{ const on=planFeat(p,r.key); return `<li class="${on?'':'off'}">${ico(on?'check':'x')}${esc(r[0])}</li>`; }).join('')}</ul>
      ${preview?`<span class="btn ${p.feature?'btn-primary':'btn-ghost'} btn-block">${esc(p.cta||'Pilih paket')}</span>`:planCta(p)}
      <a class="plan-more" href="#bandingkan"${preview?' tabindex="-1"':''}>Lihat detail paket →</a>
    </div>`;
}
function renderPlans(){
  const cur=myPlan();
  $('#plans').style.setProperty('--plan-n', shownPlans().length);
  $('#plans').innerHTML = shownPlans().map(p=>planCardHTML(p, cur)).join('');
}
document.addEventListener('click',e=>{ const a=e.target.closest('[data-plan]'); if(a && a.dataset.plan!=='coba' && !S.published && !DEMO.on){ S.plan=a.dataset.plan; save(); } });

/* ---------- Builder ---------- */
const STEPS_CX = [
  {k:'Mempelai', d:'Nama, orang tua & foto'},
  {k:'Acara', d:'Tanggal dan lokasi'},
  {k:'Tampilan', d:'Tema, warna & bahasa'},
  {k:'Foto & isi', d:'Per bagian undangan'},
  {k:'Publikasi', d:'Link dan paket'}
];
const stepsNow = () => isCx(S.theme) ? STEPS_CX : STEPS;
const STEPS = [
  {k:'Mempelai', d:'Nama dan orang tua'},
  {k:'Acara', d:'Tanggal dan lokasi'},
  {k:'Tema', d:'Tampilan dan warna'},
  {k:'Sentuhan akhir', d:'Salam, hadiah, ucapan'},
  {k:'Publikasi', d:'Link dan paket'}
];
function quoteText(){ const d=(OPENINGS[S.opening]||OPENINGS.umum).quote; return S.quoteMode==='none' ? '' : S.quoteMode==='custom' && String(S.quote||'').trim() ? String(S.quote).trim() : d; }
const QUOTE_PRESETS = [
  '“Dan segala sesuatu Kami ciptakan berpasang-pasangan agar kamu mengingat kebesaran Allah.” — QS. Adz-Dzariyat: 49',
  '“Kasih itu sabar; kasih itu murah hati.” — 1 Korintus 13:4',
  'Dua cerita, satu halaman baru. Terima kasih sudah menjadi bagian dari kisah kami.',
  'Dari kebetulan kecil, tumbuh rumah yang ingin kami jaga selamanya.'
];
function quoteFieldHTML(){
  const m=S.quoteMode||'';
  return `<div class="field" id="quoteWrap" style="margin-top:16px"><label for="quoteMode">Kutipan pembuka</label><select class="input" id="quoteMode" data-bind="quoteMode">
      <option value="" ${!m?'selected':''}>Ikuti salam pembuka</option><option value="custom" ${m==='custom'?'selected':''}>Tulis sendiri atau pilih kutipan lain</option><option value="none" ${m==='none'?'selected':''}>Tanpa kutipan</option></select>
    ${m==='custom'?`<textarea class="input" id="quoteTxt" data-bind="quote" rows="3" style="margin-top:10px" placeholder="Tulis kalimat pembuka kalian">${esc(S.quote||'')}</textarea>
    <div class="q-pre">${QUOTE_PRESETS.map((q,i)=>`<button type="button" class="chip" data-quote="${i}">${esc(q.length>46?q.slice(0,44)+'…':q)}</button>`).join('')}</div><span class="hint">Ketuk salah satu untuk memakainya, lalu ubah sesuai keinginan.</span>`:''}</div>`;
}
const EV_OPEN = new Set();
function evMoreHTML(e,k){
  const n = [e.rundown, e.dress, (e.dcol||[]).length, e.live, e.tz&&e.tz!=='WIB'].filter(Boolean).length;
  const cols = e.dcol||[];
  return `<details class="ev-more" data-evmore="${k}" ${EV_OPEN.has(k)?'open':''}><summary><span><b>Info tambahan untuk tamu <span class="opt-l">opsional</span></b><small>Zona waktu, susunan acara, dress code, siaran langsung</small></span>${n?`<em class="chip">${n} diisi</em>`:''}</summary>
    <div class="fgrid">
      <div class="field"><label for="ez${k}">Zona waktu</label><select class="input" id="ez${k}" data-bind="events.${k}.tz">${['WIB','WITA','WIT'].map(z=>`<option value="${z}" ${evTz(e)===z?'selected':''}>${z}</option>`).join('')}</select><span class="hint">Tamu dari zona lain otomatis melihat jam versi tempatnya.</span></div>
      <div class="field"><label for="el${k}">Link siaran langsung</label><input class="input" id="el${k}" data-bind="events.${k}.live" value="${esc(e.live||'')}" type="url" inputmode="url" placeholder="youtube.com/live/…" autocomplete="off"><span class="hint">YouTube, Instagram Live, atau Zoom. Kosongkan kalau tidak ada.</span></div>
      <div class="field full"><label for="er${k}">Susunan acara</label><textarea class="input" id="er${k}" data-bind="events.${k}.rundown" rows="4" placeholder="${esc('08.00 Akad nikah\n09.00 Sungkeman & foto keluarga\n09.30 Ramah tamah')}">${esc(e.rundown||'')}</textarea><span class="hint">Satu baris satu kegiatan, diawali jamnya.</span></div>
      <div class="field full"><label for="eo${k}">Dress code</label><input class="input" id="eo${k}" data-bind="events.${k}.dress" value="${esc(e.dress||'')}" placeholder="Semi-formal, nyaman untuk taman. Hindari warna putih, ya." autocomplete="off"></div>
      <div class="field full"><span class="lbl-s">Palet warna dress code <span class="muted" style="font-weight:500">(pilih sampai 4)</span></span><div class="dc-pick" role="group" aria-label="Palet warna dress code">${DC_COLORS.map(([c,nm])=>`<button type="button" data-dcol="${k}" data-c="${c}" aria-pressed="${cols.includes(c)}" title="${nm}"><i style="background:${c}"></i><span>${nm}</span></button>`).join('')}</div></div>
    </div></details>`;
}
/* Isian yang masih sama dengan data contoh (Sarah & Raka). Tidak boleh ikut tayang, terutama nomor rekening. */
function sampleLeft(){
  const D=DEFAULT, out=[], ev=D.events.flatMap(e=>[e.venue,e.address]);
  if(S.bride.name===D.bride.name || S.groom.name===D.groom.name || S.bride.nick===D.bride.nick&&S.groom.nick===D.groom.nick) out.push(['Nama mempelai', 0]);
  if(S.bride.parents===D.bride.parents || S.groom.parents===D.groom.parents) out.push(['Nama orang tua', 0]);
  if((S.events||[]).some(e=>ev.includes(e.venue)||ev.includes(e.address))) out.push(['Tempat & alamat acara', 1]);
  if(S.gift && S.gift.on!==false && String(S.gift.acct||'').replace(/\D/g,'')===D.gift.acct) out.push(['Nomor rekening amplop digital', 3]);
  return out;
}
function stepDone(i){
  if(i===0) return !!(S.bride.name && S.groom.name) && !sampleLeft().some(x=>x[1]===0);
  if(i===1) return S.events.some(e=>e.date && e.venue) && !sampleLeft().some(x=>x[1]===1);
  if(i===2) return !!S.theme;
  if(i===3) return true;
  return S.published;
}
function renderStepper(){
  S.stepMax = Math.max(S.stepMax||0, S.step||0); const seen = i => i <= S.stepMax;
  $('#stepper').innerHTML = `<p class="save"><i></i><span id="saveState">Tersimpan otomatis</span></p>` + (stepDone(0)&&stepDone(1)?`<a class="ed-open" href="#edit">${ico('edit')}<span>Buka editor lengkap<small>Edit bebas per bagian</small></span></a>`:'') + stepsNow().map((s,i)=>`
    <button type="button" data-step="${i}" ${i===S.step?'aria-current="step"':''} class="${i!==S.step&&seen(i)&&stepDone(i)?'done':''}">
      <span class="k">${i!==S.step&&seen(i)&&stepDone(i)?ico('check'):i+1}</span><span>${s.k}<small>${s.d}</small></span>
    </button>`).join('');
  $('#mobileProgress').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:13.5px;font-weight:700"><span>Langkah ${S.step+1} dari 5 · ${stepsNow()[S.step].k}</span><span class="muted" style="font-weight:600">Tersimpan otomatis</span></div><div class="stack" style="height:6px;margin-bottom:18px"><span style="width:${(S.step+1)*20}%;background:var(--beet)"></span></div>`;
}
/* kolom yang masih berisi data contoh tampil kosong dengan contoh sebagai placeholder; pratinjau tetap memakai contoh */
const SAMPLE_BIND = /^(bride|groom)\.(name|nick|parents|ig)$|^events\.\d+\.(venue|address)$|^gift\.(acct|holder)$/;
const sampleOf = b => { if(!b || !SAMPLE_BIND.test(b)) return ''; try{ const v=b.split('.').reduce((o,k)=>o==null?o:o[k], DEFAULT); return typeof v==='string'?v:''; }catch(_){ return ''; } };
const fld = (id,label,val,opt={}) => { const smp=sampleOf(opt.bind); if(smp && val===smp){ val=''; opt={...opt, ph:'Contoh: '+smp, smp:1}; } return fld0(id,label,val,opt); };
const fld0 = (id,label,val,opt={}) => `<div class="field ${opt.full?'full':''}"><label for="${id}">${label}${opt.req||opt.star?'<span class="req" aria-hidden="true">*</span>':''}</label>${opt.area?`<textarea class="input" id="${id}" data-bind="${opt.bind}" ${opt.smp?'data-sample="1"':''} rows="2" placeholder="${esc(opt.ph||'')}">${esc(val)}</textarea>`:`<input class="input" id="${id}" data-bind="${opt.bind}" ${opt.smp?'data-sample="1"':''} value="${esc(val)}" type="${opt.type||'text'}" placeholder="${esc(opt.ph||'')}" ${opt.req?'required':''} autocomplete="off">`}${opt.hint?`<span class="hint">${opt.hint}</span>`:''}<span class="err" hidden></span></div>`;
const photoFld = (who,label) => { const ph=S[who].photo; return `<div class="field full"><label>${label} <span class="opt-l">opsional</span></label><div class="up"><span class="thumb" ${ph?`style="background-image:url(${ph})"`:''}>${ph?'':esc(initials(S[who].name)||'?')}</span><label class="btn btn-soft btn-sm" for="up-${who}" style="cursor:pointer">${ico('up')}${ph?'Ganti foto':'Pilih foto'}</label><input type="file" id="up-${who}" data-photo="${who}" accept="image/*" hidden>${ph?`<button type="button" class="btn btn-ghost btn-sm" data-act="rm-photo" data-who="${who}">Hapus</button>`:''}</div><span class="hint">Foto otomatis dikecilkan agar undangan cepat terbuka. Tidak memakai foto? Inisial kalian yang tampil.</span></div>`; };
function renderStep(){
  if(EDIT.on){ const p=edPanel(EDIT.panel); $('#edInspT').textContent=p[1]; $('#edInspG').textContent=p[3]; $('#stepForm').innerHTML = edPanelHTML(p[0]) || '<p class="muted">Tidak ada pengaturan.</p>'; return; }
  renderStepCore();
}
function renderStepCore(onlyHTML, iOverride){
  const f = $('#stepForm'); const i = iOverride ?? S.step; let h='';
  if(i===0){
    h = `<span class="eyebrow">Langkah 1 dari 5</span><h2>Siapa yang akan menikah? 💍</h2><p class="sub">Nama panggilan akan menyapa tamu di sampul dan pesan WhatsApp. Tenang, semuanya bisa diubah nanti.</p>
    ${EDIT.on?'':`<div class="quick-note">${ico('check')}<div><b>Cukup 3 hal untuk mulai</b><span>Nama kalian, tanggal, dan lokasi acara. Yang bertanda <b class="req">*</b> wajib diisi. Sisanya boleh dilewati dan dilengkapi kapan saja, bahkan setelah undangan dibagikan.</span></div></div>`}
    <fieldset class="fieldset"><legend>Mempelai wanita</legend><div class="fgrid">
      ${fld('bn','Nama lengkap',S.bride.name,{bind:'bride.name',req:1,ph:'Sarah Amalia'})}
      ${fld('bk','Nama panggilan <span class="opt-l">opsional</span>',S.bride.nick,{bind:'bride.nick',ph:'Sarah'})}
      ${fld('bp','Keterangan orang tua <span class="opt-l">opsional</span>',S.bride.parents,{bind:'bride.parents',full:1,ph:'Putri pertama Bapak … & Ibu …'})}
      ${cxNoIG()?'':fld('bi','Instagram <span class="opt-l">opsional</span>',S.bride.ig||'',{bind:'bride.ig',full:1,ph:'@sarahamalia',hint:'Kosongkan kalau tidak ingin ditampilkan di undangan.'})}
      ${cxNoSolo()?'':photoFld('bride','Foto mempelai wanita')}
    </div></fieldset>
    <fieldset class="fieldset"><legend>Mempelai pria</legend><div class="fgrid">
      ${fld('gn','Nama lengkap',S.groom.name,{bind:'groom.name',req:1,ph:'Raka Pratama'})}
      ${fld('gk','Nama panggilan <span class="opt-l">opsional</span>',S.groom.nick,{bind:'groom.nick',ph:'Raka'})}
      ${fld('gp','Keterangan orang tua <span class="opt-l">opsional</span>',S.groom.parents,{bind:'groom.parents',full:1,ph:'Putra kedua Bapak … & Ibu …'})}
      ${cxNoIG()?'':fld('gi','Instagram <span class="opt-l">opsional</span>',S.groom.ig||'',{bind:'groom.ig',full:1,ph:'@rakapratama',hint:'Kosongkan kalau tidak ingin ditampilkan di undangan.'})}
      ${cxNoSolo()?'':photoFld('groom','Foto mempelai pria')}
    </div></fieldset>`;
  }
  if(i===0 && isCx(S.theme) && !onlyHTML) h += cxCoupleExtra();
  if(i===1){
    h = `<span class="eyebrow">Langkah 2 dari 5</span><h2>Kapan dan di mana acaranya?</h2><p class="sub">Tiap acara punya tombol peta dan simpan ke kalender. Tamu anti nyasar, anti lupa tanggal.</p>${cxDir()==='photobox'?`<div class="ed-note" style="margin-bottom:14px">${ico('cal')}<div><b>Tema Photobox menampilkan satu acara utama</b><span class="muted">Yang tampil acara resepsi (atau acara pertama kalau tidak ada resepsi). Susunan acara dan siaran langsung dari acara lain tetap ikut tampil.</span></div></div>`:''}
    ${S.events.map((e,k)=>`<fieldset class="fieldset"><legend>Acara ${k+1}</legend><div class="fgrid">
      ${fld('et'+k,'Nama acara',e.type,{bind:`events.${k}.type`,ph:'Akad Nikah / Pemberkatan / Resepsi'})}
      ${fld('ed'+k,'Tanggal',e.date,{bind:`events.${k}.date`,type:'date',star:1})}
      ${fld('es'+k,'Mulai',e.start,{bind:`events.${k}.start`,ph:'08.00'})}
      ${fld('ee'+k,'Selesai <span class="opt-l">opsional</span>',e.end,{bind:`events.${k}.end`,ph:'10.00',hint:'Kosongkan bila sampai selesai'})}
      ${fld('ev'+k,'Nama tempat',e.venue,{bind:`events.${k}.venue`,full:1,star:1,ph:'Gedung / masjid / rumah'})}
      ${fld('ea'+k,'Alamat',e.address,{bind:`events.${k}.address`,full:1,area:1,ph:'Alamat lengkap untuk peta'})}
      ${evMoreHTML(e,k)}
    </div>${S.events.length>1?`<button type="button" class="btn btn-ghost btn-sm" data-act="del-event" data-k="${k}" style="justify-self:start">Hapus acara ini</button>`:''}</fieldset>`).join('')}
    ${S.events.length<4?`<button type="button" class="btn btn-soft" data-act="add-event">${ico('plus')}Tambah acara (misal Ngunduh Mantu)</button>`:''}`;
  }
  if(i===2){
    const t = themeById(S.theme);
    h = `<span class="eyebrow">Langkah 3 dari 5</span><h2>Pilih tampilan yang paling kalian sukai</h2><p class="sub">Pilih koleksinya dulu, lalu temanya. Ganti kapan saja, isi undangannya tetap aman.</p>
    <div class="kind-tabs sm" role="tablist" aria-label="Koleksi tema">${[['lukisan','Lukisan','Tanpa foto'],['custom','Custom','Pakai foto · Paket Custom']].map(([k,l,dd])=>`<button type="button" role="tab" data-pickkind="${k}" aria-selected="${(PICK_KIND||(isCx(S.theme)?'custom':'lukisan'))===k}"><b>${l}</b><small>${dd}</small></button>`).join('')}</div>
    <p class="kind-desc">${(PICK_KIND||(isCx(S.theme)?'custom':'lukisan'))==='custom'?'Tema penuh foto kalian, susunan dan fotonya bebas diatur. Dipublikasikan dengan paket Custom.':'Digambar khusus, tanpa perlu foto. Bisa dipakai di paket apa pun.'}</p>
    ${(PICK_KIND||(isCx(S.theme)?'custom':'lukisan'))==='custom' ? `<div class="theme-pick" role="group" aria-label="Tema Custom">${CX_THEMES.filter(x=>!themeHidden(x.id)||x.id===S.theme).map(x=>`<button type="button" data-pick="${x.id}" aria-pressed="${x.id===S.theme}"><div class="tp" style="background:url(${x.thumbImg}) ${x.thumbPos||'top'}/cover"></div><span>${esc(x.name)}</span></button>`).join('')}</div>${isCx(S.theme)?cxLookHTML():`<p class="hint" style="margin-top:14px">Pilih salah satu tema di atas untuk mulai.</p>`}` : `${t.photo?`<p class="hint" style="margin:-6px 0 14px">${ico('camera')} Tema ${esc(t.name)} memakai foto pertama di galeri sebagai sampul. Belum ada foto? Kami tampilkan ilustrasi dulu.</p>`:''}
    <div class="theme-pick" role="group" aria-label="Tema">${themeOrder(THEMES).concat(THEMES.filter(x=>themeHidden(x.id)&&x.id===S.theme)).map(x=>`<button type="button" data-pick="${x.id}" aria-pressed="${x.id===S.theme}"><div class="tp" style="${themeStyle(x)}${x.thumbImg?`background:url(${x.thumbImg}) center/cover;`:x.thumb?`background:${x.thumb(x)};`:''}${x.thumbFg?`color:${x.thumbFg};`:''}">${x.thumbNoTxt?'':`${esc((S.bride.nick||'N')[0])}&amp;${esc((S.groom.nick||'R')[0])}`}</div><span>${esc(x.name)}</span></button>`).join('')}</div>
    <div class="field" style="margin-top:26px"><label>Warna aksen</label><div class="swatches" role="group" aria-label="Warna aksen">
      <button type="button" class="sw" style="background:${t.accent}" data-acc="" aria-pressed="${!S.accent}" aria-label="Warna bawaan tema"></button>
      ${ACCENTS.filter(a=>a!==t.accent).map(a=>`<button type="button" class="sw" style="background:${a}" data-acc="${a}" aria-pressed="${S.accent===a}" aria-label="Aksen ${a}"></button>`).join('')}
    </div><span class="hint">Lingkaran pertama adalah warna asli tema ${esc(t.name)}.</span></div>
    <div class="field" style="margin-top:22px"><label id="fpLbl">Paduan huruf</label>${(Object.keys(FONT_PAIRS).forEach(loadFontPair),"")}<div class="fpair" role="group" aria-labelledby="fpLbl">${[['tema',null]].concat(Object.entries(FONT_PAIRS)).map(([k,fp])=>{ const on=(S.fontPair||'tema')===k; const h=fp?fp.h:t.font, sb=fp?fp.sub:'inherit', bd=fp?fp.body:'inherit'; return `<button type="button" data-fpair="${k}" aria-pressed="${on}"><span class="fp-h" style="font-family:${h}">${esc(S.bride.nick||'Sarah')} &amp; ${esc(S.groom.nick||'Raka')}</span><span class="fp-s" style="font-family:${sb}">${esc(S.events[0]&&S.events[0].date?fmtShort(S.events[0].date):'14 Februari 2027')}</span><span class="fp-b" style="font-family:${bd}">Kami mengundang Anda untuk hadir dan memberi doa restu.</span><small><b>${fp?esc(fp.name):'Bawaan tema'}</b>${fp?` · ${esc(fp.note)}`:''}</small></button>`; }).join('')}</div><span class="hint">Mengatur tiga lapis huruf sekaligus: nama &amp; judul, tanggal &amp; label kecil, serta teks isi.</span></div>`}`;
  }
  if(i===3 && isCx(S.theme) && !onlyHTML){ h = cxStep4HTML(); }
  else if(i===3){
    h = `<span class="eyebrow">Langkah 4 dari 5</span><h2>Sentuhan akhir agar makin lengkap</h2><p class="sub">Nyalakan yang kalian butuhkan saja. Bagian yang dimatikan tidak akan tampil di undangan.</p>
    <div class="field"><label for="opening">Salam pembuka</label><select class="input" id="opening" data-bind="opening">
      <option value="islam" ${S.opening==='islam'?'selected':''}>Islami (Assalamu’alaikum + QS. Ar-Rum: 21)</option>
      <option value="kristen" ${S.opening==='kristen'?'selected':''}>Kristiani (Matius 19:6)</option>
      <option value="umum" ${S.opening==='umum'?'selected':''}>Umum</option></select></div>
    ${quoteFieldHTML()}
    <div style="margin-top:18px">
      <div class="toggle-row"><div><b>Amplop digital</b><div class="muted" style="font-size:14px">Tamu tinggal menyalin nomor rekening, tidak perlu repot konfirmasi ke kalian.</div></div><label class="switch"><input type="checkbox" data-bind="gift.on" ${S.gift.on?'checked':''} aria-label="Amplop digital"><span></span></label></div>
      <div class="fgrid" ${S.gift.on?'':'hidden'} style="padding:6px 0 16px">
        ${fld('gb','Bank / e-wallet',S.gift.bank,{bind:'gift.bank',ph:'BCA / Mandiri / GoPay'})}
        ${fld('ga','Nomor rekening',S.gift.acct,{bind:'gift.acct',ph:'1234567890'})}
        ${fld('gh','Atas nama',S.gift.holder,{bind:'gift.holder',full:1})}
      </div>
      <div class="toggle-row"><div><b>Ucapan &amp; doa</b><div class="muted" style="font-size:14px">Doa dan ucapan tamu tampil di undangan. Ada yang kurang pas? Sembunyikan saja dari dashboard.</div></div><label class="switch"><input type="checkbox" data-bind="wishesOn" ${S.wishesOn?'checked':''} aria-label="Ucapan dan doa"><span></span></label></div>
      <div class="toggle-row" style="flex-wrap:wrap"><div><b>Galeri foto</b><div class="muted" style="font-size:14px">Pilih sampai 8 foto favorit. Foto pertama akan tampil paling besar.</div></div><label class="switch"><input type="checkbox" data-bind="galleryOn" ${S.galleryOn?'checked':''} aria-label="Galeri foto"><span></span></label>
        ${S.galleryOn?`<div class="gal-edit" style="width:100%">${S.gallery.map((g,k)=>`<div class="g" style="background-image:url(${g})"><button type="button" data-act="rm-gal" data-k="${k}" aria-label="Hapus foto ${k+1}">${ico('x')}</button></div>`).join('')}${S.gallery.length<8?`<label class="add" for="up-gal">${ico('plus')}<span>Tambah foto<br><span style="font-weight:500;color:var(--muted)">${S.gallery.length}/8</span></span></label><input type="file" id="up-gal" data-photo="gallery" accept="image/*" multiple hidden>`:''}</div>`:''}</div>
      <div class="toggle-row" style="flex-wrap:wrap"><div><b>Musik latar</b><div class="muted" style="font-size:14px">Musik mengalun pelan saat tamu membuka undangan. Mau hening? Tamu bisa matikan sekali ketuk.</div></div><label class="switch"><input type="checkbox" data-bind="music" ${S.music?'checked':''} aria-label="Musik latar"><span></span></label>
        ${S.music?musicPickerHTML():''}</div>
    </div>
    <div class="field" style="margin-top:22px"><span style="font-weight:700;font-size:13.5px">Urutan bagian undangan</span><ol class="sec-order" data-sort="lk">${secOrder().map((k,i,arr)=>{ const off=(k==='galeri'&&(!S.galleryOn||!S.gallery.length))||(k==='hadiah'&&!S.gift.on)||(k==='kado'&&!(S.wishlist&&S.wishlist.on&&S.wishlist.items.length))||(k==='cerita'&&!(S.story&&S.story.on&&S.story.items.length))||(k==='ucapan'&&!S.wishesOn); return `<li class="${off?'off':''}" data-k="${k}"><span class="drag" aria-hidden="true" title="Geser untuk pindah"><svg viewBox="0 0 10 16" width="10" height="16"><g fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/></g></svg></span><span class="num muted">${i+1}</span><b>${SECTION_LABELS[k]}</b>${off?'<span class="chip">Tidak tampil</span>':''}<span class="mv"><button type="button" class="btn btn-ghost btn-sm" data-move="${k}" data-dir="-1" ${i===0?'disabled':''} aria-label="Naikkan ${SECTION_LABELS[k]}">↑</button><button type="button" class="btn btn-ghost btn-sm" data-move="${k}" data-dir="1" ${i===arr.length-1?'disabled':''} aria-label="Turunkan ${SECTION_LABELS[k]}">↓</button></span></li>`; }).join('')}</ol><span class="hint">Sampul selalu di paling atas, ucapan terima kasih selalu di paling bawah.</span></div>`;
  }
  if(i===4){
    const sl = sampleLeft();
    const checks = [['Nama kedua mempelai', !!(S.bride.name&&S.groom.name), 0],['Minimal satu acara dengan tanggal & tempat', S.events.some(e=>e.date&&e.venue), 1],['Tema dipilih', !!S.theme, 2],['Rekening amplop digital', !S.gift.on || !!S.gift.acct, 3],
      ...sl.map(([l,k])=>[`${l} masih contoh, ganti dengan milik kalian`, false, k])];
    const ready = checks.every(c=>c[1]);
    h = `<span class="eyebrow">Langkah 5 dari 5</span><h2>${S.published?'Undangan kalian sudah tayang':'Siap disebar ke tamu? 🎉'}</h2><p class="sub">${S.published?'Undangan kalian sudah bisa dibuka tamu. Kirim dari dashboard, dan ubah isinya kapan saja perlu.':'Cek sekali lagi, lalu pilih alamat link kalian. Habis bayar, undangan langsung bisa dikirim ke semua tamu. Tidak cocok? Ada garansi uang kembali 7 hari.'}</p>
    <ul class="check-list">${checks.map(([l,ok,k])=>`<li>${ok?`<span class="status s-ok" style="padding:4px">${ico('check')}</span>`:`<span class="status s-wait" style="padding:4px">!</span>`}${l}<span class="st">${ok?'<span class="muted">Lengkap</span>':`<button type="button" class="btn btn-soft btn-sm" data-step="${k}">Lengkapi</button>`}</span></li>`).join('')}</ul>
    <div class="field"><label for="slug">Alamat undangan</label><div class="slug"><span>${pubHost()}</span><input id="slug" data-bind="slug" value="${esc(S.slug)}" autocomplete="off" aria-describedby="slugHint"></div><span class="hint" id="slugHint">Pakai huruf kecil, angka, dan tanda strip. Link ini yang dilihat tamu, jadi buat yang mudah diingat.</span><span class="err" hidden></span></div>
    ${S.published?'':`<div class="field" style="margin-top:22px"><span style="font-weight:700;font-size:13.5px">Paket</span><div class="plan-pick">
      ${PLANS.filter(p=>p.price).map(p=>`<label><input type="radio" name="plan" value="${p.id}" ${S.plan===p.id?'checked':''}><span><b>${p.name}</b><small>${esc(p.sum)}</small></span><b class="num">${rupiah(p.price)}</b></label>`).join('')}
    </div></div>`}
    ${ready?'':'<p class="err" style="margin-top:14px;color:var(--warn);font-weight:600">Lengkapi yang bertanda ! dulu, agar tamu tidak melihat bagian yang masih kosong.</p>'}`;
  }
  if(onlyHTML) return h;
  const last = i===4;
  h += `<div class="form-foot">
    ${i>0?`<button type="button" class="btn btn-ghost" data-act="prev">Kembali</button>`:'<span></span>'}
    ${last ? (S.published ? `<a class="btn btn-primary" href="#dashboard">Buka dashboard</a>` : `<button type="button" class="btn btn-primary" data-act="publish">Publikasikan · ${rupiah((PLANS.find(p=>p.id===S.plan)||PLANS[2]).price)}</button>`) : `<button type="submit" class="btn btn-primary">Lanjut ke ${stepsNow()[i+1].k}</button>`}
  </div>`;
  f.innerHTML = h;
  renderStepper();
}
function setPath(obj, path, val){ const ks=path.split('.'); let o=obj; ks.slice(0,-1).forEach(k=>o=o[k]); o[ks.at(-1)]=val; }
let pvT;
function refreshPreview(){ clearTimeout(pvT); pvT=setTimeout(()=>{ const cxs = EDIT.on ? $('#edScreen') : $('#builderScreen'); if(cxs && isCx(S.theme)){ const f=cxs.querySelector('iframe.cx-frame'); if(f && f.dataset.cx===S.theme){ cxPost(f); if(EDIT.on){ CX_PICKED=true; edMark(); } return; } } if(EDIT.on){ const s=$('#edScreen'); const top=s.scrollTop; s.innerHTML = invHTML({idp:'e', watermark:!S.published, guest:'Bapak Budi & Keluarga', mem:EDIT.panel==='kenangan'}); s.scrollTop=top; bindInv(s); edMark(); return; } const s=$('#builderScreen'); const top=s.scrollTop; s.innerHTML = invHTML({idp:'b', watermark:!S.published, guest:'Bapak Budi & Keluarga'}); s.scrollTop=top; bindInv(s); },120); }
$('#stepForm').addEventListener('input', e=>{
  const b = e.target.dataset.bind; if(!b) return;
  let v = e.target.type==='checkbox' ? e.target.checked : e.target.value;
  if(b==='slug'){ v = v.toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-'); }
  /* kolom contoh dikosongkan lagi: pratinjau kembali ke contoh, tanda "data contoh" tetap aktif */
  if(v==='' && sampleOf(b)) v = sampleOf(b);
  setPath(S,b,v);
  if(b==='gift.on' || b==='galleryOn' || b==='music' || b==='quoteMode' || b==='memMode'){ if(b==='music') stopPrev(); renderStep(); }
  e.target.removeAttribute('aria-invalid'); const err=e.target.closest('.field')?.querySelector('.err'); if(err) err.hidden=true;
  save(); refreshPreview();
});
async function shrink(file, max=900, q=.76){
  const url = URL.createObjectURL(file);
  try{
    const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
    const r = Math.min(1, max/Math.max(img.width,img.height));
    const c = document.createElement('canvas'); c.width=Math.round(img.width*r); c.height=Math.round(img.height*r);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',q);
  } finally { URL.revokeObjectURL(url); }
}
$('#stepForm').addEventListener('change', async e=>{
  const who = e.target.dataset.photo;
  if(who && e.target.files.length){
    const files=[...e.target.files].filter(f=>f.type.startsWith('image/'));
    if(!files.length){ toast('File itu bukan foto. Pilih JPG atau PNG.'); return; }
    try{
      if(who==='gallery'){ const room=8-S.gallery.length; for(const f of files.slice(0,room)){ const u=await storePhoto(await shrink(f, CLOUD.on&&CLOUD.uid?2200:1400, .84)); if(u) S.gallery.push(u); } if(files.length>room) toast(`Hanya ${room} foto yang ditambahkan, galeri maksimal 8`); }
      else { const u=await storePhoto(await shrink(files[0], 600)); if(u) S[who].photo=u; }
    }catch(err){ toast('Foto tidak bisa dibaca. Coba foto lain.'); return; }
    save(); renderStep(); refreshPreview(); return;
  } if(e.target.name==='plan'){ S.plan=e.target.value; save(); renderStep(); } if(e.target.id==='opening'){ S.opening=e.target.value; save(); refreshPreview(); } });
$('#stepForm').addEventListener('click', e=>{
  const b=e.target.closest('[data-dcol]'); if(!b) return; e.preventDefault();
  const ev=S.events[+b.dataset.dcol]; if(!ev) return; const c=b.dataset.c; let a=(ev.dcol||[]).slice();
  if(a.includes(c)) a=a.filter(x=>x!==c); else { if(a.length>=4){ toast('Maksimal 4 warna, ya'); return; } a.push(c); }
  ev.dcol=a; b.setAttribute('aria-pressed', a.includes(c)); save(); refreshPreview();
  const d=b.closest('details'); const ch=d&&d.querySelector('summary .chip'); const n=[ev.rundown, ev.dress, a.length, ev.live, ev.tz&&ev.tz!=='WIB'].filter(Boolean).length; if(d){ if(ch){ if(n) ch.textContent=n+' diisi'; else ch.remove(); } else if(n) d.querySelector('summary').insertAdjacentHTML('beforeend',`<em class="chip">${n} diisi</em>`); }
});
$('#stepForm').addEventListener('click', e=>{ const q=e.target.closest('[data-quote]'); if(!q) return; e.preventDefault(); S.quote=QUOTE_PRESETS[+q.dataset.quote]; const t=$('#quoteTxt'); if(t) t.value=S.quote; save(); refreshPreview(); });
$('#stepForm').addEventListener('toggle', e=>{ const d=e.target; if(d.dataset && d.dataset.evmore!=null){ const k=+d.dataset.evmore; if(d.open) EV_OPEN.add(k); else EV_OPEN.delete(k); } }, true);
$('#stepForm').addEventListener('submit', e=>{
  e.preventDefault();
  const req = $$('[required]', e.target).filter(x=>!x.value.trim());
  if(req.length){ req.forEach(x=>{ x.setAttribute('aria-invalid','true'); const er=x.closest('.field').querySelector('.err'); er.textContent='Wajib diisi supaya tampil di sampul undangan'; er.hidden=false; }); req[0].focus(); return; }
  goStep(S.step+1);
});
function goStep(n){ S.step=Math.max(0,Math.min(4,n)); save(); renderStep(); window.scrollTo({top:0,behavior:'smooth'}); }
$('#stepForm').addEventListener('click', e=>{
  const p=e.target.closest('[data-pick]'); if(p){ const id=p.dataset.pick; const go=()=>{ cxApplyTheme(id); save(); renderStep(); refreshPreview(); if(EDIT.on) edRail(); renderStepper&&!EDIT.on&&renderStepper(); }; if(isCx(id)!==isCx(S.theme)) cxSwitch(id, go); else go(); }
  const a=e.target.closest('[data-acc]'); if(a){ S.accent=a.dataset.acc||null; save(); renderStep(); refreshPreview(); }
  const fo=e.target.closest('[data-font]'); if(fo){ S.font=fo.dataset.font; save(); renderStep(); refreshPreview(); }
  const fpb=e.target.closest('[data-fpair]'); if(fpb){ const k=fpb.dataset.fpair; S.fontPair = k==='tema'?null:k; S.font='tema'; save(); renderStep(); refreshPreview(); }
});
$('#stepper').addEventListener('click', e=>{ const b=e.target.closest('[data-step]'); if(b) goStep(+b.dataset.step); });

/* ---------- Musik ---------- */
const MUSIC_LIB = [
  {id:'piano-senja', name:'Piano Senja', mood:'Romantis, pelan', dur:'1:15'},
  {id:'kotak-musik', name:'Kotak Musik', mood:'Manis dan ringan', dur:'1:08'},
  {id:'petik-akustik', name:'Petik Akustik', mood:'Hangat, santai', dur:'1:10'},
  {id:'gamelan-lembut', name:'Gamelan Lembut', mood:'Nuansa Jawa', dur:'1:12'},
  {id:'kecapi-suling', name:'Kecapi Suling', mood:'Nuansa Sunda', dur:'1:14'}
];
const BLOCKED_LINK = /(youtube\.com|youtu\.be|spotify\.com|music\.apple|joox\.com|soundcloud\.com|tiktok\.com|deezer\.com)/i;
let mTab = null, PREV = null, prevKey = null, mLinkState = null, BGM = null;
const musicBase = () => location.protocol==='file:' ? 'music/' : '/music/';
function musicURL(src){ src = src || S.musicSrc; if(!src) return ''; if(src.type==='lib') return musicBase()+(src.id||'piano-senja')+'.mp3'; return src.url||''; }
function musicLabel(src){ src = src || S.musicSrc || {}; if(src.type==='lib'){ const t=MUSIC_LIB.find(x=>x.id===src.id); return t?t.name:'Musik pilihan'; } return src.name || (src.type==='upload'?'Lagu unggahan':'Lagu dari link'); }
function normalizeLink(u){
  u = u.trim(); let m;
  if((m = u.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)) || (m = u.match(/drive\.google\.com\/open\?id=([^&#]+)/))) return 'https://drive.google.com/uc?export=download&id='+m[1];
  if(/dropbox\.com/.test(u)){ const x=u.replace(/([?&])dl=[01]&?/,'$1').replace(/[?&]$/,''); return x + (x.includes('?')?'&':'?') + 'raw=1'; }
  return u;
}
function probeAudio(url){
  return new Promise((res,rej)=>{ const a=new Audio(); let done=false; const fin=(ok,v)=>{ if(done) return; done=true; a.removeAttribute('src'); a.load(); ok?res(v):rej(v); };
    a.preload='metadata'; a.onloadedmetadata=()=>fin(true, a.duration); a.onerror=()=>fin(false,'error'); setTimeout(()=>fin(false,'timeout'), 12000); a.src=url; });
}
const fmtSec = s => !isFinite(s) ? '' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function stopPrev(){ if(PREV){ PREV.pause(); PREV.removeAttribute('src'); } PREV=null; prevKey=null; $$('.m-play.on').forEach(b=>{ b.classList.remove('on'); b.innerHTML=ico('play'); }); }
function togglePrev(key, url, start){
  if(prevKey===key){ stopPrev(); return; }
  stopPrev(); if(!url) return;
  stopBgm();
  PREV = new Audio(url); prevKey = key; PREV.volume = .8;
  PREV.addEventListener('loadedmetadata',()=>{ if(start && start < PREV.duration) PREV.currentTime = start; }, {once:true});
  PREV.addEventListener('ended', stopPrev);
  PREV.play().catch(()=>{ if(prevKey===key){ toast('Lagu tidak bisa diputar. Coba file atau link lain.'); stopPrev(); } });
  const b=$(`.m-play[data-mplay="${key}"]`); if(b){ b.classList.add('on'); b.innerHTML=ico('pause'); }
}
function musicPickerHTML(){
  const src = S.musicSrc || {type:'lib', id:'piano-senja'};
  const tab = mTab || src.type || 'lib';
  const playBtn = (key, label) => `<button type="button" class="m-play ${prevKey===key?'on':''}" data-mplay="${key}" aria-label="${prevKey===key?'Hentikan':'Dengarkan'} ${esc(label||'lagu')}">${ico(prevKey===key?'pause':'play')}</button>`;
  let body = '';
  if(tab==='lib'){
    body = `<div class="m-list" role="radiogroup" aria-label="Musik pilihan Sakara">${MUSIC_LIB.map(t=>{ const sel = src.type==='lib' && src.id===t.id;
      return `<div class="m-item ${sel?'sel':''}" data-mpick="${t.id}" role="radio" aria-checked="${sel}" tabindex="0">${playBtn('lib:'+t.id, t.name)}<div class="m-meta"><b>${t.name}</b><span>${t.mood} · ${t.dur}</span></div><span class="m-radio" aria-hidden="true"></span></div>`; }).join('')}</div>
      <p class="m-note">Instrumen asli racikan Sakara. Bebas dipakai, aman dari klaim hak cipta.</p>`;
  } else if(tab==='upload'){
    const has = src.type==='upload' && src.url;
    body = `${has?`<div class="m-item sel">${playBtn('cur', src.name)}<div class="m-meta"><b>${esc(src.name||'Lagu unggahan')}</b><span>${src.temp?'Mode demo: hilang setelah halaman dimuat ulang':'Tersimpan di akun kalian'}</span></div></div>`:''}
      <label class="m-drop" for="up-music">${ico(has?'edit':'up')}<b>${has?'Ganti lagu':'Pilih file lagu'}</b><span class="m-note">MP3 atau M4A, maksimal 15 MB</span></label>
      <input type="file" id="up-music" accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,.mp3,.m4a,.aac,.ogg,.wav" hidden>
      <p class="m-note">Dengan mengunggah, kalian menyatakan punya hak memakai lagu ini.</p>`;
  } else {
    const has = src.type==='link' && src.url;
    body = `<div class="field" style="margin:0"><label for="m-link">Link file audio</label><div style="display:flex;gap:8px"><input class="input" id="m-link" type="url" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://…/lagu.mp3" value="${has?esc(src.orig||src.url):''}" style="flex:1;min-width:0"><button type="button" class="btn btn-ghost" data-act="m-link-check">Pakai</button></div></div>
      ${mLinkState?`<div class="${mLinkState.ok?'m-ok':'m-warn'}" role="status">${mLinkState.msg}</div>`:''}
      ${has?`<div class="m-item sel">${playBtn('cur', src.name)}<div class="m-meta"><b>${esc(src.name)}</b><span>Dari link</span></div></div>`:''}
      <p class="m-note">Bisa link langsung ke file .mp3/.m4a, Google Drive (akses "Siapa saja yang memiliki link"), atau Dropbox. Link YouTube dan Spotify tidak bisa dipakai sebagai musik latar karena aturan platformnya.</p>`;
  }
  const showStart = src.type===tab && tab!=='lib';
  const start = `<div class="m-start"><label for="m-start">Mulai dari detik</label><input class="input" id="m-start" type="number" inputmode="numeric" min="0" max="900" step="1" value="${+S.musicStart||0}"><span class="m-note">Lewati intro panjang, misal langsung ke reff.</span></div>`;
  return `<div class="music-pick">
    <div class="m-tabs" role="tablist" aria-label="Sumber musik">${[['lib','Pilihan kami'],['upload','Unggah lagu'],['link','Pakai link']].map(([k,l])=>`<button type="button" role="tab" data-mtab="${k}" aria-selected="${tab===k}">${l}</button>`).join('')}</div>
    ${body}${showStart ? start : ''}
    <div class="m-note m-cur">Sedang dipakai: <b style="color:var(--ink)">${esc(musicLabel(src))}</b></div>
  </div>`;
}
async function storeMusic(file){
  if(CLOUD.on && CLOUD.uid){
    const ext=(file.name.split('.').pop()||'mp3').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)||'mp3';
    const path=`${CLOUD.uid}/${(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36))}.${ext}`;
    const { error } = await CLOUD.sb.storage.from('music').upload(path, file, {contentType:file.type||'audio/mpeg', upsert:false, cacheControl:'31536000'});
    if(error) throw error;
    return {url: CLOUD.sb.storage.from('music').getPublicUrl(path).data.publicUrl, temp:false};
  }
  return {url: URL.createObjectURL(file), temp:true};
}
async function handleMusicFile(file){
  if(!file) return;
  if(!/^audio\//.test(file.type) && !/\.(mp3|m4a|aac|ogg|wav)$/i.test(file.name)){ toast('File itu bukan lagu. Pilih MP3 atau M4A.'); return; }
  if(file.size > 15*1024*1024){ toast('Ukuran lagu maksimal 15 MB. Coba kompres ke MP3 dulu.'); return; }
  const lbl=$('label[for=up-music] b'); if(lbl) lbl.textContent='Mengunggah…';
  try{
    const r = await storeMusic(file);
    stopPrev(); S.musicSrc = {type:'upload', url:r.url, name:file.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').trim().slice(0,60), temp:r.temp}; S.musicStart=0; mTab='upload';
    save(); renderStep(); refreshPreview(); toast('Lagu terpasang! 🎵');
  }catch(e){ toast('Upload lagu gagal: '+(e.message||'coba lagi')); renderStep(); }
}
async function checkMusicLink(){
  const inp=$('#m-link'); if(!inp) return; const raw=inp.value.trim();
  if(!raw){ mLinkState={ok:false,msg:'Tempel link lagunya dulu.'}; renderStep(); return; }
  if(!/^https?:\/\//i.test(raw)){ mLinkState={ok:false,msg:'Link harus diawali https://'}; renderStep(); return; }
  if(BLOCKED_LINK.test(raw)){ mLinkState={ok:false,msg:'Link YouTube, Spotify, dan sejenisnya tidak bisa diputar sebagai musik latar. Unduh lagunya sebagai MP3 lalu pilih <b>Unggah lagu</b>, atau pakai link langsung ke file audio.'}; renderStep(); $('#m-link').value=raw; return; }
  const url = normalizeLink(raw); const b=$('[data-act=m-link-check]'); if(b){ b.disabled=true; b.textContent='Memeriksa…'; }
  try{
    const d = await probeAudio(url);
    let name = decodeURIComponent((raw.split('?')[0].split('/').pop()||'')).replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').trim();
    if(!name || /^(view|uc|open|edit)$/i.test(name) || name.length>60) name='Lagu dari link';
    stopPrev(); S.musicSrc={type:'link', url, orig:raw, name}; S.musicStart=0; mLinkState={ok:true,msg:`Link bisa diputar${fmtSec(d)?' · durasi '+fmtSec(d):''}. Sudah dipasang.`};
    save(); renderStep(); refreshPreview(); mLinkState=null;
  }catch(e){ mLinkState={ok:false,msg:'Link ini tidak bisa diputar. Pastikan link mengarah langsung ke file audio dan bisa dibuka tanpa login.'}; renderStep(); const i=$('#m-link'); if(i) i.value=raw; }
}
$('#stepForm').addEventListener('click', e=>{
  const t=e.target.closest('[data-mtab]'); if(t){ e.preventDefault(); stopPrev(); mTab=t.dataset.mtab; mLinkState=null; renderStep(); return; }
  const pl=e.target.closest('[data-mplay]'); if(pl){ e.preventDefault(); e.stopPropagation(); const k=pl.dataset.mplay;
    if(k.startsWith('lib:')){ const id=k.slice(4); togglePrev(k, musicURL({type:'lib',id}), (S.musicSrc&&S.musicSrc.type==='lib'&&S.musicSrc.id===id)?+S.musicStart||0:0); }
    else togglePrev(k, musicURL(), +S.musicStart||0); return; }
  const pk=e.target.closest('[data-mpick]'); if(pk){ const id=pk.dataset.mpick; if(!(S.musicSrc&&S.musicSrc.type==='lib'&&S.musicSrc.id===id)){ S.musicSrc={type:'lib', id}; S.musicStart=0; save(); refreshPreview(); renderStep(); } return; }
  if(e.target.closest('[data-act=m-link-check]')){ e.preventDefault(); checkMusicLink(); }
});
$('#stepForm').addEventListener('keydown', e=>{
  if(e.target.matches && e.target.matches('.m-item[data-mpick]') && (e.key===' '||e.key==='Enter')){ e.preventDefault(); e.target.click(); }
  if(e.target.id==='m-link' && e.key==='Enter'){ e.preventDefault(); checkMusicLink(); }
});
$('#stepForm').addEventListener('change', e=>{
  if(e.target.id==='up-music'){ handleMusicFile(e.target.files[0]); e.target.value=''; }
  if(e.target.id==='m-start'){ S.musicStart=Math.max(0,Math.min(900,Math.round(+e.target.value||0))); e.target.value=S.musicStart; save(); if(PREV) stopPrev(); }
});
let bgmFade=null;
function startBgm(){
  const url = musicURL(); if(!S.music || !guestMusic || !url || !ff('musik')) return;
  try{
    if(!BGM){ BGM = new Audio(); BGM.preload='auto'; BGM.addEventListener('ended',()=>{ BGM.currentTime=+S.musicStart||0; BGM.play().catch(()=>{}); }); }
    if(BGM.dataset.src!==url){ BGM.src=url; BGM.dataset.src=url; BGM.addEventListener('loadedmetadata',()=>{ const st=+S.musicStart||0; if(st && st<BGM.duration) BGM.currentTime=st; },{once:true}); }
    clearInterval(bgmFade); BGM.volume=0; const p=BGM.play(); if(p) p.catch(()=>{});
    let v=0; bgmFade=setInterval(()=>{ v=Math.min(.55, v+.03); try{ BGM.volume=v; }catch(e){} if(v>=.55) clearInterval(bgmFade); }, 120);
  }catch(e){}
}
function stopBgm(){ clearInterval(bgmFade); if(BGM){ BGM.pause(); } }
window.__spMusic = () => ({src:S.musicSrc, start:S.musicStart, prev: PREV?{paused:PREV.paused,t:PREV.currentTime}:null, bgm: BGM?{paused:BGM.paused,t:BGM.currentTime,vol:BGM.volume}:null});

/* ---------- Animasi undangan (ringan, tanpa library) ---------- */
const REDUCED = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
const SCR_CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function scramble(el, to, dur=900){
  if(!el) return; if(REDUCED()){ el.textContent=to; return; }
  const from = el.textContent; const len = Math.max(from.length, to.length); const t0 = performance.now();
  const step = now => { const p = Math.min(1, (now-t0)/dur); let out='';
    for(let i=0;i<len;i++){ const reveal = p*len*1.15 - i*0.9; const c = to[i]||'';
      out += reveal>=1 ? c : (c===' ' ? ' ' : (reveal>0 || i<from.length) ? SCR_CH[(Math.random()*SCR_CH.length)|0] : ''); }
    el.textContent = p>=1 ? to : out; if(p<1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function odometer(el){
  if(!el || el.dataset.odo) return; el.dataset.odo='1';
  const txt = el.textContent.trim(); if(!/^\d+$/.test(txt) || REDUCED()) return;
  el.innerHTML = [...txt].map((ch,i)=>`<span class="odo"><span class="odo-col" style="--d:${ch};--k:${i}">${'0123456789'.split('').map(n=>`<span>${n}</span>`).join('')}</span></span>`).join('');
  el.setAttribute('aria-label', txt);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('odo-go')));
}
function splitWords(h){
  if(h.dataset.split) return; h.dataset.split='1';
  const walk = node => { [...node.childNodes].forEach(c=>{ if(c.nodeType===3){ const parts=c.textContent.split(/(\s+)/); const f=document.createDocumentFragment();
        parts.forEach(w=>{ if(!w) return; if(/^\s+$/.test(w)){ f.appendChild(document.createTextNode(w)); return; } const o=document.createElement('span'); o.className='w'; const i=document.createElement('span'); i.textContent=w; o.appendChild(i); f.appendChild(o); });
        c.replaceWith(f); } else if(c.nodeType===1) walk(c); }); };
  walk(h); $$('.w > span', h).forEach((s,i)=>s.style.setProperty('--wi', i));
}
let invIO = null;
function fitCover(inv){
  const cv = inv && inv.querySelector(':scope > .cover'); if(!cv) return;
  const btn = cv.querySelector('[data-act=open-inv]'); if(!btn || !btn.offsetParent) return;
  const kids = [...cv.children].filter(k=>{ const p=getComputedStyle(k).position; return p!=='absolute' && p!=='fixed'; });
  if(!kids.length) return;
  cv.style.removeProperty('--fit');
  const vh = innerHeight, top = kids[0].getBoundingClientRect().top, cr = cv.getBoundingClientRect();
  if(cr.top < -2 || cr.height < vh*0.6) return; // hanya saat sampul memenuhi layar
  const bottom = btn.getBoundingClientRect().bottom, room = vh - 22 - Math.max(top, cr.top+12);
  const need = bottom - Math.max(top, cr.top+12);
  if(bottom > vh - 22 && need > 0){ const f = Math.max(.62, room/need); cv.style.setProperty('--fit', f.toFixed(3)); }
}
function enhanceInv(root){
  const inv = root.querySelector('[data-inv]'); if(!inv) return;
  requestAnimationFrame(()=>fitCover(inv)); (document.fonts && document.fonts.ready || Promise.resolve()).then(()=>fitCover(inv));
  if(!window._fitRs){ window._fitRs=1; addEventListener('resize', ()=>$$('[data-inv]').forEach(fitCover)); }
  shimmerImages(inv);
  if(REDUCED() || !('IntersectionObserver' in window)) return;
  inv.classList.add('anim');
  $$('.cv-kebun', inv).forEach(cv=>{
    let sc=cv.parentElement; while(sc && sc!==document.body){ const o=getComputedStyle(sc).overflowY; if((o==='auto'||o==='scroll') && sc.scrollHeight>sc.clientHeight+4) break; sc=sc.parentElement; }
    const tgt=(!sc||sc===document.body)?window:sc; let q=0;
    const upd=()=>{ q=0; if(!cv.isConnected){ tgt.removeEventListener('scroll',on); return; } const r=cv.getBoundingClientRect(), top=tgt===window?0:sc.getBoundingClientRect().top; const p=Math.min(1,Math.max(0,(top-r.top)/Math.max(1,r.height*.8))); cv.style.setProperty('--p',p.toFixed(3)); };
    const on=()=>{ if(!q) q=requestAnimationFrame(upd); };
    tgt.addEventListener('scroll',on,{passive:true}); upd(); });
  $$('.cv-atelier', inv).forEach(cv=>{ const run=()=>{ cv.classList.remove('at-wait'); $$('[data-atpct]', cv).forEach(el=>{ const t0=performance.now(); const f=n=>{ const p=Math.min(1,(n-t0)/1450); el.textContent=Math.round(100*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(f); }; el.textContent='0'; requestAnimationFrame(f); }); };
    const g=$('#gate'), up=()=>g && g.classList.contains('show') && !g.classList.contains('open') && g.style.display!=='none';
    cv.classList.add('at-wait'); if(up()){ const iv=setInterval(()=>{ if(!up()){ clearInterval(iv); run(); } },80); } else setTimeout(run, cv.closest('.modal, #modalRoot') ? 700 : 0); });
  $$('section:not(.cover)', inv).forEach(sec=>{
    let k=0;
    $$(':scope > h3', sec).forEach(h=>{ h.dataset.rv='up'; });
    $$(':scope > .orn', sec).forEach(o=>o.dataset.rv='draw');
    $$(':scope > .kick, .p-card, .qband, :scope > .cd4, .ev2, .tl li, :scope > .lead, :scope > .names, :scope > .and, :scope > .count, :scope > .ev, :scope > .bank, :scope > [data-rsvp], :scope > .form, :scope > [data-wishlist], :scope > [data-giftconfirm], .person h4, .person p', sec).forEach(e=>{ if(!e.dataset.rv){ e.dataset.rv='up'; e.style.setProperty('--rk', Math.min(k++,6)); } });
    $$('.person .ph, .pic .ph, .gal button', sec).forEach((e,i)=>{ e.dataset.rv='clip'; e.style.setProperty('--rk', Math.min(i,5)); });
    // variasi gerak saat digulir (semua tema)
    $$('.p-card, .ev2, .tl li', sec).forEach((e,i)=>{ e.dataset.rv = i%2 ? 'right' : 'left'; });
    $$('.kd-list > *, [data-wishlist] > *, .opt, .acts', sec).forEach((e,i)=>{ if(!e.dataset.rv){ e.dataset.rv='up'; e.style.setProperty('--rk', Math.min(i,6)); } });
    $$('.go-cal, .go-strip, .go-see, .dg-win, :scope > .cd4, :scope > .bank, .qband', sec).forEach(e=>{ e.dataset.rv='zoom'; });
    $$(':scope > h3', sec).forEach(h=>{ h.dataset.rv='rise'; });
  });
  if(!inv._secIO){ inv._secIO = new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('sec-in'); inv._secIO.unobserve(en.target); } }), {rootMargin:'0px 0px -12% 0px', threshold:.05}); }
  $$('section:not(.cover)', inv).forEach(sec=>inv._secIO.observe(sec));
  requestAnimationFrame(parTick);
  if(invIO) invIO.disconnect();
  // clip-path ikut memengaruhi perhitungan IntersectionObserver, jadi elemen clip/draw diamati lewat induknya
  const proxy = new Map();
  invIO = new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting){ const el=en.target; invIO.unobserve(el);
      const kids = proxy.get(el); if(kids){ kids.forEach(k=>k.classList.add('in')); if(!el.dataset.rv) return; }
      el.classList.add('in'); if(el.classList.contains('count')) $$('b.num', el).forEach(odometer); } }), {rootMargin:'0px 0px -8% 0px', threshold:.12});
  $$('[data-rv]', inv).forEach(e=>{ if(e.dataset.rv==='clip' || e.dataset.rv==='draw'){ const par=e.parentElement; if(!proxy.has(par)) proxy.set(par, []); proxy.get(par).push(e); invIO.observe(par); } else invIO.observe(e); });
}
function shimmerImages(inv){
  $$('.person .ph, .pic .ph, .gal button, .cv-photo', inv).forEach(el=>{
    const m = (el.getAttribute('style')||'').match(/url\((['"]?)(.*?)\1\)/); if(!m || el.dataset.sk) return;
    const src = m[2]; if(src.startsWith('data:image/svg')) return;
    el.dataset.sk='1'; el.classList.add('sk-img');
    const im = new Image(); im.onload = im.onerror = () => el.classList.add('sk-done'); im.src = src;
    if(im.complete) el.classList.add('sk-done');
  });
}
function openCover(){
  const cv = $('#g-cover'); if(!cv || cv.classList.contains('is-open')) return;
  cv.classList.add('is-open');

  const slot = cv.querySelector('.cv-slot') || cv.querySelector('.card');
  const first = guestEvents(guestObj()).find(e=>e.date);
  if(slot && first){
    const box = document.createElement('div'); box.className='cv-count count'; box.setAttribute('data-count', first.date); box.innerHTML = countHTML(first.date);
    const cue = document.createElement('div'); cue.className='cv-cue'; cue.innerHTML = `<span>Gulir ke bawah</span>${ico('down')}`;
    setTimeout(()=>{ slot.classList.add('swap'); setTimeout(()=>{ slot.replaceChildren(box, cue); slot.classList.remove('swap'); slot.classList.add('swapped'); $$('b.num', box).forEach(odometer); }, 320); }, 260);
  }
}

/* ---------- Editor undangan (untuk undangan yang sudah ada) ---------- */
const ED_PANELS = [
  ['tema','Tema, warna & huruf','eye','Tampilan', null, []],
  ['urutan','Urutan bagian','menu','Tampilan', null, []],
  ['mempelai','Mempelai','heart','Isi undangan', null, ['cover','salam']],
  ['acara','Acara','cal','Isi undangan', null, ['acara']],
  ['cerita','Kisah cinta','heart','Isi undangan', 'story.on', ['cerita']],
  ['galeri','Galeri foto','camera','Isi undangan', 'galleryOn', ['galeri']],
  ['hadiah','Amplop digital','gift','Isi undangan', 'gift.on', ['hadiah']],
  ['kado','Kado patungan','gift','Isi undangan', 'wishlist.on', ['kado']],
  ['ucapan','Ucapan & doa','chat','Isi undangan', 'wishesOn', ['ucapan']],
  ['rsvp','Konfirmasi hadir','rsvp','Isi undangan', null, ['rsvp']],
  ['musik','Musik latar','music','Isi undangan', 'music', []],
  ['salam','Salam pembuka','text','Pengaturan', null, []],
  ['kenangan','Halaman kenangan','heart','Pengaturan', null, ['kenangan']],
  ['link','Alamat link','copy','Pengaturan', null, []]
];
let EDIT = {on:false, panel:'mempelai', dev:'hp', undo:[], redo:[], last:null, snapT:null, restoring:false, sheet:false};
const CX_ED_MAP = {mempelai:'cx:couple', acara:'cx:date', hadiah:'cx:gift', rsvp:'cx:rsvp', ucapan:'cx:rsvp', cerita:'cx:story', galeri:'cx:gallery', tema:'cx:tampilan', urutan:'cx:sampul', salam:'cx:sampul', kado:'cx:gift'};
const edPanel = k => { const L=edPanels(); return L.find(p=>p[0]===k) || (isCx(S.theme) && L.find(p=>p[0]===CX_ED_MAP[k])) || L[0]; };
const getPath = (o,p) => p.split('.').reduce((a,k)=>a&&a[k], o);
function edSnapshot(){ return JSON.stringify(pickData()); }
function edTrack(){
  if(!EDIT.on || EDIT.restoring) return;
  clearTimeout(EDIT.snapT);
  EDIT.snapT = setTimeout(()=>{ const now=edSnapshot(); if(EDIT.last && now!==EDIT.last){ EDIT.undo.push(EDIT.last); if(EDIT.undo.length>60) EDIT.undo.shift(); EDIT.redo=[]; } EDIT.last=now; edTools(); }, 600);
  const st=$('#edSave'); if(st){ st.dataset.s='saving'; st.textContent='Menyimpan…'; clearTimeout(st._t); st._t=setTimeout(()=>{ st.dataset.s='ok'; st.textContent = DEMO.on ? 'Demo · tidak disimpan' : S.published ? 'Tersimpan · tayang' : 'Draf tersimpan'; st.title = S.published ? 'Perubahan langsung terlihat oleh tamu' : 'Belum dipublikasikan'; }, 900); }
}
function edRestore(json){
  EDIT.restoring=true; const d=JSON.parse(json); Object.assign(S, d); EDIT.last=json; save(); renderStep(); refreshPreview(); EDIT.restoring=false; edTools(); edRail();
}
function edTools(){ const u=$('[data-act=ed-undo]'), r=$('[data-act=ed-redo]'); if(u) u.disabled=!EDIT.undo.length; if(r) r.disabled=!EDIT.redo.length; }
function stepBody(i){ return renderStepCore(true, i).replace(/^\s*<span class="eyebrow">[\s\S]*?<\/span><h2>[\s\S]*?<\/h2><p class="sub">[\s\S]*?<\/p>/, ''); }
function pickPart(html, sel, withNext){ const d=document.createElement('div'); d.innerHTML=html; const el=d.querySelector(sel); if(!el) return ''; let out=el.outerHTML; if(withNext && el.nextElementSibling && el.nextElementSibling.matches(withNext)) out+=el.nextElementSibling.outerHTML; return out; }
function edPanelHTML(k){ if(k && k.startsWith('na:')) return naPanelHTML(k); if(k && k.startsWith('cx:')) return cxPanelHTML(k); return edPanelHTML0(k); }
function edPanelHTML0(k){
  const s3 = () => stepBody(3);
  const togRow = b => { const d=document.createElement('div'); d.innerHTML=s3(); const inp=d.querySelector(`[data-bind="${b}"]`); return inp ? inp.closest('.toggle-row') : null; };
  if(k==='kenangan'){ const t=memEnd(), on=memActive(), m=S.memMode||'auto';
    return `<p class="muted" style="font-size:14px;margin-bottom:16px">Setelah acara selesai, undangan berubah jadi halaman terima kasih: doa, ucapan, dan foto dari tamu tampil paling atas. RSVP dan hitung mundur disembunyikan. Pratinjau di samping sudah memakai tampilan ini.</p>
      <div class="field"><label for="memMode">Kapan tampil</label><select class="input" id="memMode" data-bind="memMode"><option value="auto" ${m==='auto'?'selected':''}>Otomatis setelah acara selesai</option><option value="on" ${m==='on'?'selected':''}>Tampilkan sekarang</option><option value="off" ${m==='off'?'selected':''}>Jangan tampilkan</option></select>
      <span class="hint">${m==='auto'?(t?`Aktif otomatis mulai ${esc(new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(t+3*36e5)))}.`:'Isi tanggal acara dulu supaya bisa aktif otomatis.'):m==='on'?'Tamu yang membuka undangan sekarang langsung melihat halaman kenangan.':'Undangan tetap tampil seperti biasa setelah acara.'}</span></div>
      <div class="field" style="margin-top:14px"><label for="memMsg">Pesan terima kasih</label><textarea class="input" id="memMsg" data-bind="memMsg" rows="4" placeholder="${esc(MEM_MSG)}">${esc(S.memMsg||'')}</textarea><span class="hint">Kosongkan untuk memakai pesan bawaan.</span></div>
      <div class="ed-note">${ico('eye')}<div><b>Status sekarang</b><span class="muted">${on?'Halaman kenangan sedang tampil ke tamu.':'Tamu masih melihat undangan biasa.'}</span></div></div>`; }
  if(k==='kado') return kadoPanelHTML();
  if(k==='cerita') return storyPanelHTML();
  if(k==='mempelai') return stepBody(0);
  if(k==='acara') return stepBody(1);
  if(k==='tema') return stepBody(2);
  if(k==='galeri'){ const r=togRow('galleryOn'); return r ? r.outerHTML : ''; }
  if(k==='musik'){ const r=togRow('music'); return r ? r.outerHTML : ''; }
  if(k==='ucapan'){ const r=togRow('wishesOn'); return (r?r.outerHTML:'') + `<p class="hint" style="margin-top:12px">Ucapan dari tamu bisa kalian sembunyikan satu per satu di <a href="#dashboard" data-dtab-go="ucapan">Dashboard → Ucapan</a>.</p>`; }
  if(k==='hadiah'){ const d=document.createElement('div'); d.innerHTML=s3(); const inp=d.querySelector('[data-bind="gift.on"]'); const row=inp.closest('.toggle-row'); return row.outerHTML + (row.nextElementSibling?row.nextElementSibling.outerHTML:''); }
  if(k==='urutan' && isCx(S.theme)){ const d=document.createElement('div'); d.innerHTML=cxEditorHTML(); const o=d.querySelector('.sec-order'); return o ? `<div class="field">${o.outerHTML}</div><p class="hint">Tahan dan geser titik-titik di kiri untuk pindah posisi. Sampul selalu di atas, penutup selalu di bawah.</p>` : ''; }
  if(k==='urutan'){ return pickPart(s3(), '.sec-order') ? `<div class="field">${pickPart(s3(), '.sec-order')}</div><p class="hint">Tahan dan geser titik-titik di kiri untuk pindah posisi. Bagian yang dimatikan tetap ada di urutan, tapi tidak tampil ke tamu.</p>` : ''; }
  if(k==='salam'){ const d=document.createElement('div'); d.innerHTML=s3(); const sel=d.querySelector('#opening'); return (sel ? sel.closest('.field').outerHTML : '') + quoteFieldHTML(); }
  if(k==='link'){ const d=document.createElement('div'); d.innerHTML=stepBody(4); const inp=d.querySelector('#slug'); return (inp ? inp.closest('.field').outerHTML : '') + (S.published?`<p class="hint" style="margin-top:12px">Hati-hati: kalau alamat diganti, link yang sudah terkirim ke tamu tidak berlaku lagi.</p>`:''); }
  if(k==='rsvp'){ const first=S.events.find(e=>e.date);
    return `<div class="toggle-row"><div><b>Tanya jam datang</b><div class="muted" style="font-size:14px">Tamu memilih perkiraan jam datang. Dipakai untuk grafik keramaian dan hitungan katering.</div></div><label class="switch"><input type="checkbox" data-bind="arriveOn" ${S.arriveOn!==false?'checked':''} aria-label="Tanya jam datang"><span></span></label></div>
      <div class="field" style="margin-top:14px"><label for="seatsDef">Batas orang per undangan</label><select class="input" id="seatsDef" data-bind="seatsDefault"><option value="" ${!S.seatsDefault?'selected':''}>Bebas (maksimal 6)</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${+S.seatsDefault===n?'selected':''}>${n} orang</option>`).join('')}</select><span class="hint">Tamu tidak bisa mengonfirmasi lebih dari batas ini. Atur per tamu di Dashboard → Tamu → klik nama.</span></div>
      <div class="ed-note">${ico('cal')}<div><b>Batas konfirmasi</b><span class="muted">${first?esc(fmtShort(addDays(first.date,-7))):'H-7'} (otomatis H-7 dari acara pertama)</span></div></div>
      <div class="ed-note">${ico('qr')}<div><b>Kartu masuk QR</b><span class="muted">Tamu yang menjawab hadir otomatis mendapat QR untuk check-in di hari H.</span></div></div>
      <a class="btn btn-soft btn-sm" href="#dashboard" data-dtab-go="tamu" style="margin-top:14px">Lihat jawaban tamu</a>`; }
  return '';
}
function edRail(){
  const rail=$('#edRail'); if(!rail) return; let grp='';
  { const tb=$('#cxTryBar'); if(tb) tb.innerHTML=cxDraftBar(); }
  const sortMode = isCx(S.theme) ? 'cx' : 'lk'; let inSort=false;
  rail.innerHTML = edPanels().map(([k,l,ic,g,tog,,na,sk])=>{ const on = tog ? !!getPath(S,tog) : true; let head = g!==grp ? `<div class="ed-grp">${g}</div>` : ''; grp=g;
    let pre=''; if(sk && !inSort){ pre=`<div class="ed-sort" data-sort="${sortMode}">`; inSort=true; } else if(!sk && inSort){ pre='</div>'; inSort=false; }
    head = pre.startsWith('</') ? pre+head : head+pre;
    const grip = !sk && g==='Isi undangan' ? '<span class="drag-sp" aria-hidden="true"></span>' : sk ? `<span class="drag" aria-hidden="true" title="Tahan dan geser untuk pindah posisi"><svg viewBox="0 0 10 16" width="10" height="16"><g fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/></g></svg></span>` : '';
    if(na) return `${head}<div class="ed-item na ${EDIT.panel===k?'sel':''}"><button type="button" class="ed-pick" data-ed="${k}" aria-current="${EDIT.panel===k}">${ico(ic)}<span>${l}</span></button></div>`;
    return `${head}<div class="ed-item ${EDIT.panel===k?'sel':''} ${on?'':'off'}" ${sk?`data-k="${sk}"`:''}>${grip}<button type="button" class="ed-pick" data-ed="${k}" aria-current="${EDIT.panel===k}">${ico(ic)}<span>${l}</span></button>${tog?`<button type="button" class="ed-vis" data-act="ed-vis" data-k="${tog}" aria-pressed="${on}" aria-label="${on?'Sembunyikan':'Tampilkan'} ${l}" title="${on?'Tampil di undangan':'Disembunyikan'}">${ico(on?'eye':'mute')}</button>`:''}</div>`; }).join('') + (inSort?'</div>':'');
}
function edSelect(k, fromPreview){
  const wasMem = EDIT.panel==='kenangan'; EDIT.panel=k; if(wasMem !== (k==='kenangan')) refreshPreview(); stopPrev(); renderStep(); edRail();
  if(innerWidth<900) edSheet(true);
  if(!fromPreview){ const p=edPanel(k); const id=p[5].map(x=>'e-'+x).find(x=>$('#'+x)); if(id) $('#'+id).scrollIntoView({behavior:'smooth', block:'start'}); }
  edMark();
}
function edMark(){ if(isCx(S.theme)){ cxEdMark(); return; } const p=edPanel(EDIT.panel); $$('#edScreen section[id]').forEach(s=>s.classList.toggle('ed-on', p[5].includes(s.id.replace(/^e-/,'')))); }
document.addEventListener('click', e=>{ if(document.body.classList.contains('ed-sheet-open') && (e.target===document.body || e.target===document.documentElement)) edSheet(false); });
function edSheet(open){ EDIT.sheet=open; const ins=$('#edInsp'); if(ins) ins.classList.toggle('open', open); document.body.classList.toggle('ed-sheet-open', open && innerWidth<900); }
function renderEditor(){
  const root=$('#editor');
  if(!root.dataset.built){ root.dataset.built=1;
    root.innerHTML = `<header class="ed-top">
        <a class="btn btn-ghost btn-sm ed-back" href="#dashboard" aria-label="Kembali ke dashboard">${ico('home')}<span>Dashboard</span></a>
        <div class="ed-title"><b>${esc(S.bride.nick)} &amp; ${esc(S.groom.nick)}</b><span class="ed-save" id="edSave" data-s="ok"></span></div>
        <div class="ed-tools">
          <button type="button" class="ed-ib" data-act="ed-undo" aria-label="Urungkan" title="Urungkan (Ctrl+Z)">${ico('undo')}</button>
          <button type="button" class="ed-ib" data-act="ed-redo" aria-label="Ulangi" title="Ulangi (Ctrl+Shift+Z)">${ico('redo')}</button>
          <div class="seg ed-dev" role="group" aria-label="Ukuran pratinjau"><button type="button" data-dev="hp" aria-pressed="true">HP</button><button type="button" data-dev="wide" aria-pressed="false">Layar lebar</button></div>
          <button type="button" class="btn btn-ghost btn-sm" data-act="view-as" data-id="">${ico('eye')}<span>Lihat sebagai tamu</span></button>
          <span id="edPub"></span>
        </div></header>
      <div class="ed-body">
        <nav class="ed-rail" id="edRail" aria-label="Bagian undangan"></nav>
        <div class="ed-canvas"><div id="cxTryBar"></div><div class="ed-device hp" id="edDevice"><div class="screen" id="edScreen"></div></div><p class="ed-hint">${ico('edit')}Klik bagian mana saja di pratinjau untuk mengeditnya</p></div>
        <aside class="ed-insp" id="edInsp" aria-label="Pengaturan bagian"><div class="ed-grab" aria-hidden="true"></div><div class="ed-insp-h"><div><span class="eyebrow" id="edInspG"></span><h2 id="edInspT"></h2></div><button type="button" class="btn btn-primary btn-sm ed-done" data-act="ed-done">Selesai</button></div><div class="ed-insp-b" id="edInspBody"></div></aside>
      </div>`;
    root.addEventListener('submit', e=>{ if(EDIT.on){ e.preventDefault(); e.stopPropagation(); } }, true);
    root.addEventListener('click', e=>{
      const pk=e.target.closest('[data-ed]'); if(pk){ edSelect(pk.dataset.ed); return; }
      const dv=e.target.closest('[data-dev]'); if(dv){ EDIT.dev=dv.dataset.dev; $('#edDevice').className='ed-device '+EDIT.dev; $$('[data-dev]').forEach(b=>b.setAttribute('aria-pressed', b===dv)); return; }
      const go=e.target.closest('[data-dtab-go]'); if(go){ dTab=go.dataset.dtabGo; }
    });
    $('#edScreen').addEventListener('click', e=>{
      const sec=e.target.closest('section[id]'); if(!sec) return; e.preventDefault(); e.stopPropagation();
      const key=sec.id.replace(/^e-/,''); const p=ED_PANELS.find(x=>x[5].includes(key)) || (key.startsWith('cover')?ED_PANELS[0]:null);
      if(p) edSelect(p[0], true);
    }, true);
  }
  const insp=$('#edInspBody'); const sf=$('#stepForm'); if(sf.parentElement!==insp) insp.appendChild(sf);
  $('#edPub').innerHTML = DEMO.on ? '' : S.published ? `<a class="btn btn-primary btn-sm" href="${esc(pubURL())}" target="_blank" rel="noopener" aria-label="Buka link undangan">${ico('eye')}<span>Buka link</span></a>` : `<button type="button" class="btn btn-primary btn-sm" data-act="ed-publish">Publikasikan</button>`;
  const st=$('#edSave'); if(st && (!st.textContent||DEMO.on||st.textContent.startsWith('Demo'))) st.textContent = DEMO.on ? 'Demo · tidak disimpan' : S.published ? 'Tersimpan · tayang' : 'Draf tersimpan'; st.title = S.published ? 'Perubahan langsung terlihat oleh tamu' : 'Belum dipublikasikan';
  EDIT.on=true; if(!EDIT.last) EDIT.last=edSnapshot();
  edRail(); renderStep(); refreshPreview(); edTools();
}
function edLeave(){ if(!EDIT.on) return; EDIT.on=false; edSheet(false); const sf=$('#stepForm'); const home=$('#stepHome'); if(sf && home && sf.parentElement!==home) home.appendChild(sf); }
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act]'); if(!el || !EDIT.on) return; const a=el.dataset.act;
  if(a==='ed-undo' && EDIT.undo.length){ EDIT.redo.push(edSnapshot()); edRestore(EDIT.undo.pop()); toast('Perubahan dibatalkan'); }
  if(a==='ed-redo' && EDIT.redo.length){ EDIT.undo.push(edSnapshot()); edRestore(EDIT.redo.pop()); }
  if(a==='ed-vis'){ const k=el.dataset.k; setPath(S,k,!getPath(S,k)); save(); edRail(); renderStep(); refreshPreview(); toast(getPath(S,k)?'Bagian ditampilkan':'Bagian disembunyikan dari tamu'); }
  if(a==='ed-done') edSheet(false);
  if(a==='ed-publish'){ S.step=4; save(); location.hash='buat'; }
});
document.addEventListener('keydown', e=>{
  if(!EDIT.on || !(e.ctrlKey||e.metaKey) || e.key.toLowerCase()!=='z') return;
  if(e.target.matches('input,textarea,select')) return;
  e.preventDefault(); $(`[data-act=${e.shiftKey?'ed-redo':'ed-undo'}]`)?.click();
});

/* ---------- Guest view ---------- */
let guestBig=false, guestMusic=true, guestId=null;
const guestObj = () => CLOUD.guestMode ? CLOUD.guest : (guestId ? G.find(g=>g.id===guestId) : null);
const guestLabel = () => guestObj()?.name || (CLOUD.guestMode ? 'Bapak/Ibu/Saudara/i' : 'Bapak Budi & Keluarga');
function renderGuest(){
  if(cxDraft() && !CLOUD.guestMode && S.liveTheme){ const keep=S.theme; S.theme=S.liveTheme; try{ return renderGuest(); } finally { S.theme=keep; } }
  const t = themeById(S.theme);
  const sh = $('#guestShell');
  if(isCx(S.theme)){ sh.removeAttribute('style'); const f=sh.querySelector('iframe.cx-frame'); if(f && f.dataset.cx===S.theme){ cxPost(f); return; } sh.innerHTML=`<div class="cx-guest">${cxFrameHTML(S.theme,{guest:CLOUD.guestMode?guestLabel():''})}</div>`; return; }
  sh.setAttribute('style', themeStyle(t,S.accent,fontOf()));
  const g = guestObj();
  sh.innerHTML = `${guestSide(t)}
    <div class="guest-col locked" id="guestCol">
      <div class="g-top">${CLOUD.guestMode?'<span></span>':`<a class="pill-btn" href="#${g?'dashboard':'beranda'}" aria-label="Kembali">← ${g?'Dashboard':'Sakara'}</a>`}
        <span style="display:flex;gap:8px"><button class="pill-btn" data-act="g-big" aria-pressed="${guestBig}" aria-label="Perbesar teks" style="${guestBig?'background:var(--beet);color:#fff':''}">Aa</button><button class="pill-btn" data-act="g-music" aria-pressed="${guestMusic}" aria-label="${guestMusic?'Matikan musik':'Nyalakan musik'}">${ico(guestMusic&&S.music?'music':'mute')}</button></span></div>
      <div id="guestInv" style="margin-top:-58px">${invHTML({gate:true, idp:'g', guest:guestLabel(), guestObj:g, big:guestBig})}</div>
      <nav class="g-nav" aria-label="Navigasi undangan">
        ${memActive()?`<button data-go="g-kenangan">${ico('heart')}Kenangan</button><button data-go="g-acara">${ico('cal')}Acara</button>`:`<button data-go="g-acara">${ico('cal')}Acara</button><button data-go="g-rsvp">${ico('rsvp')}RSVP</button>`}
        <button data-go="g-acara" data-map="1">${ico('pin')}Peta</button>
        ${S.gift.on?`<button data-go="g-hadiah">${ico('gift')}Hadiah</button>`:`<button data-go="g-salam">${ico('heart')}Mempelai</button>`}
        ${S.wishesOn?`<button data-go="g-ucapan">${ico('chat')}Ucapan</button>`:`<button data-go="g-cover">${ico('home')}Awal</button>`}
      </nav>
    </div>`;
  bindInv(sh); enhanceInv(sh); sideRes(sh);
  document.body.style.overflow='hidden';
  const gc=$('#g-cover'); gc.style.minHeight='100vh'; gc.style.minHeight='100lvh';
}
function guestSide(t){
  const real = S.coverPhoto || (S.gallery||[]).filter(Boolean)[0] || '';
  const art = !real && !t.side && HOME_COVER.has(t.id);
  const ph = real || (t.side && !art ? t.side : art ? `/assets/home/${t.id}.webp` : t.scene ? svgData(sceneSVG(t.scene)) : '');
  const mono = !ph || art;
  const d = (S.events.find(e=>e.date)||{}).date;
  const q = quoteText();
  return `<aside class="g-side${ph?'':' nophoto'}${art?' art':''}${mono?' mono-on':''}${!real&&!art&&ph?' scene':''}${t.layout?' gs-'+t.layout:''}${t.ilMode?' gs-'+t.ilMode:''}" aria-hidden="true">${ph?`<div class="ph" style="background-image:url('${esc(ph)}')"></div>`:''}
    <div class="tx">${mono?`<div class="mono">${esc((S.bride.nick||'')[0]||'')}${esc((S.groom.nick||'')[0]||'')}</div>`:''}<small>The Wedding of</small><h1>${esc(S.bride.nick)}<i>&amp;</i>${esc(S.groom.nick)}</h1>${d?`<div class="dt">${esc(fmtDate(d))}</div>`:''}${q?`<blockquote>${esc(q)}</blockquote>`:''}</div></aside>`;
}
// Foto lama yang resolusinya kecil jadi pecah kalau dibentang penuh: tampilkan sebagai foto berbingkai di atas latar foto yang diburamkan
function sideRes(sh){
  const side=sh.querySelector('.g-side:not(.art):not(.scene):not(.nophoto)'), ph=side&&side.querySelector('.ph'); if(!ph) return;
  const src=(ph.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)||[])[1]; if(!src) return;
  const im=new Image(); im.onload=()=>{
    const need=side.clientWidth*(devicePixelRatio||1)*.7, needH=side.clientHeight*(devicePixelRatio||1)*.7;
    if(im.naturalWidth>=need && im.naturalHeight>=needH*.8) return;
    side.classList.add('art','mono-on','lowres');
    const tx=side.querySelector('.tx'); if(tx && !tx.querySelector('.fr')) tx.insertAdjacentHTML('afterbegin',`<img class="fr" src="${esc(src)}" alt="">`);
  }; im.src=src;
}
function openGuest(){
  startBgm();
  const col=$('#guestCol'); if(!col.classList.contains('locked')) return; col.classList.remove('locked'); document.body.style.overflow='';
  openCover();
}

/* ---------- Dashboard ---------- */
let dTab='ringkasan', gQ='', gStatus='semua', gGroup='semua', sel=new Set();
/* daftar tamu ditampilkan bertahap supaya halaman HP tidak terlalu panjang; kembali ke awal bila filter berubah */
const GPAGE=30; let gLimit=GPAGE, gSig='';
const isPrep = () => !DEMO.on && !S.published && !!S.user;
const dtList = () => isPrep() ? DT.filter(([k])=>['tamu','keluarga'].includes(k)) : DT;
const DT = [['ringkasan','Ringkasan','home'],['tamu','Tamu','users'],['keluarga','Keluarga','family'],['katering','Katering','food'],['harih','Hari H','qr'],['ucapan','Ucapan','chat'],['kenangan','Kenangan','heart'],['hadiah','Hadiah','gift']];
const stLabel = {hadir:['Hadir','s-ok'],tidak:['Tidak hadir','s-no'],belum:['Belum menjawab','s-wait']};
const PRO = ['import','bulk','groups','harih','remind'];
const LOCK_OF = {import:'import', bulk:'bulk', groups:'groups', harih:'qr', remind:'remind'};
const isLocked = f => S.published && PRO.includes(f) && !planFeat(planOf(S.plan), LOCK_OF[f]||f);
const lockNote = (what, f='harih') => { const t=cheapestWith(LOCK_OF[f]||f), cur=planOf(S.plan); const diff = t&&cur ? t.price-cur.price : 0;
  return `<div class="lock-card">${ico('lock')}<div><b>${what} ada di paket ${esc(t?t.name:'yang lebih lengkap')}</b><p class="muted">${diff>0?`Cukup tambah ${rupiah(diff)} saja. `:''}Tamu dan isi undangan kalian tetap aman, tidak perlu mulai dari awal.</p></div><button class="btn btn-primary btn-sm" data-act="upgrade">Upgrade sekarang</button></div>`; };
function pubHost(){ return CLOUD.on ? location.host+'/u/' : 'undangansakara.vercel.app/u/'; }
function pubURL(){ return 'https://'+pubHost()+((CLOUD.inv&&CLOUD.inv.slug)||S.slug); }
function link(g){ return CLOUD.on ? `${location.origin}/u/${(CLOUD.inv&&CLOUD.inv.slug)||S.slug}?to=${g.code}` : `https://undangansakara.vercel.app/u/${S.slug}?to=${encodeURIComponent(g.code||g.name)}`; }
const WA_DEF = {
  invite:'Halo {nama},\n\nDengan penuh syukur, kami {pasangan} ingin berbagi kabar bahagia. Kami mengundang Anda untuk hadir di {acara} pernikahan kami pada {tanggal}.\n\nUndangan lengkap dan konfirmasi kehadiran bisa dibuka di sini:\n{link}\n\nKehadiran dan doa restu Anda akan sangat berarti bagi kami. Terima kasih 🙏',
  remind:'Halo {nama},\n\nSemoga sehat selalu. Kami {pasangan} ingin mengingatkan kembali bahwa {acara} kami akan berlangsung pada {tanggal}. Bila berkenan, mohon kabari kehadiran Anda lewat link berikut agar kami dapat menyiapkan tempat:\n{link}\n\nTerima kasih banyak 🙏'
};
const WA_TOKENS = [['{nama}','Nama tamu'],['{pasangan}','Nama kalian'],['{acara}','Acara'],['{tanggal}','Tanggal'],['{link}','Link undangan']];
const waTpl = kind => (kind==='remind' ? S.waTplR : S.waTpl) || WA_DEF[kind==='remind'?'remind':'invite'];
function waFill(tpl, g){
  const ev=guestEvents(g), d=(ev[0]||S.events[0]||{}).date;
  let out = tpl.replace(/\{nama\}/g, g.name||'').replace(/\{pasangan\}/g, `${S.bride.nick} & ${S.groom.nick}`).replace(/\{acara\}/g, ev.map(e=>e.type).filter(Boolean).join(' dan ')||'acara').replace(/\{tanggal\}/g, d?fmtDate(d):'').replace(/\{link\}/g, link(g));
  if(!/\{link\}/.test(tpl)) out += `\n\n${link(g)}`;
  return out;
}
/* Antrean kirim WhatsApp: satu tamu per ketukan (WhatsApp tidak mengizinkan kirim massal otomatis tanpa API bisnis) */
let WQ=null;
function wqRender(){
  if(!WQ) return; const n=WQ.ids.length;
  while(WQ.i<n && !G.find(x=>x.id===WQ.ids[WQ.i])) WQ.i++;
  if(WQ.i>=n){ const d=WQ.done; WQ=null; closeModal(); renderDash(); toast(d?`Selesai. ${d} pesan dibuka di WhatsApp.`:'Selesai.'); return; }
  const g=G.find(x=>x.id===WQ.ids[WQ.i]), ok=waNum(g.phone).length>=10;
  openModal(`<span class="eyebrow">${WQ.mode==='remind'?'Pengingat':'Kirim undangan'} · ${WQ.i+1} dari ${n}</span>
    <h2 class="display" style="font-size:28px;margin:8px 0">${esc(g.name)}</h2>
    <div class="wq-bar" aria-hidden="true"><i style="width:${Math.round(WQ.i/n*100)}%"></i></div>
    ${ok?`<div class="wa-bubble" style="margin:14px 0 8px">${esc(waMsg(g, WQ.mode))}</div>`:`<p class="warn-box" style="margin:14px 0">${ico('wa')}<span>Nomor WhatsApp ${esc(g.name)} belum diisi. Lewati dulu, atau isi nomornya di daftar tamu.</span></p>`}
    <div class="form-foot"><button class="btn btn-ghost" data-act="wq-stop">Berhenti</button><button class="btn btn-ghost" data-act="wq-skip">Lewati</button>${ok?`<a class="btn btn-primary" data-act="wq-open" href="${esc(waUrl(g, WQ.mode))}" target="_blank" rel="noopener">${ico('wa')}Buka WhatsApp</a>`:''}</div>`);
}
function waMsg(g, kind){ return waFill(waTpl(kind), g); }
/* nomor WhatsApp: hanya angka, 0/+62/8xx → 62xx */
const waNum = ph => { let d=String(ph||'').replace(/\D/g,''); if(d.startsWith('0')) d='62'+d.slice(1); else if(d.startsWith('8')) d='62'+d; return d; };
function waUrl(g, kind){ return `https://wa.me/${waNum(g.phone)}?text=${encodeURIComponent(waMsg(g, kind))}`; }
const filteredGuests = () => { const q=gQ.toLowerCase(); return G.filter(g=>(gStatus==='semua'||g.status===gStatus) && (gGroup==='semua'||g.group===gGroup) && (!q||g.name.toLowerCase().includes(q)||(g.phone||'').includes(q)||(g.code||'').toLowerCase().includes(q))); };
const sesChips = g => guestEvents(g).map(e=>`<span class="chip chip-ses">${esc(e.type)}</span>`).join(' ');
/* ---------- Akun keluarga · jam kedatangan · katering ---------- */
const genToken = () => { const A='abcdefghjkmnpqrstuvwxyz23456789'; const r=new Uint8Array(18); (crypto.getRandomValues?crypto.getRandomValues(r):r.forEach((_,i)=>r[i]=Math.random()*255)); return [...r].map(b=>A[b%A.length]).join(''); };
const isPending = g => g.approved===false;
const famById = id => (S.families||[]).find(f=>f.id===id);
const famUsed = f => G.filter(g=>g.fam===f.id).length;
function famLink(f){ return CLOUD.on ? `${location.origin}/u/${(CLOUD.inv&&CLOUD.inv.slug)||S.slug}/keluarga?k=${f.token}` : `${location.href.split('#')[0]}#keluarga-${f.token}`; }
function catToken(){ if(CLOUD.on && CLOUD.inv) return CLOUD.inv.catering_token; if(!S.cateringToken){ S.cateringToken=genToken(); save(); } return S.cateringToken; }
function catLink(){ return CLOUD.on ? `${location.origin}/u/${(CLOUD.inv&&CLOUD.inv.slug)||S.slug}/katering?k=${catToken()}` : `${location.href.split('#')[0]}#katering-${catToken()}`; }

/* jam kedatangan */
const toMin = t => { const m=String(t||'').match(/(\d{1,2})[.:](\d{2})/); return m ? (+m[1])*60+(+m[2]) : null; };
const fromMin = m => `${String(Math.floor(m/60)).padStart(2,'0')}.${String(m%60).padStart(2,'0')}`;
function slotsFor(e){ const a=toMin(e&&e.start); if(a==null) return []; let b=toMin(e.end); if(b==null||b<=a) b=a+180; const out=[]; for(let t=a; t<b; t+=30) out.push(fromMin(t)); return out.slice(0,14); }
function mainEvent(g){ const ev=guestEvents(g).filter(e=>e.start); return ev.length ? ev[ev.length-1] : null; }
function seedArrivals(){
  if(S.arrSeeded) return; const ev=S.events.filter(e=>e.start); const main=ev[ev.length-1]; const sl=slotsFor(main); if(!sl.length) return;
  const w=sl.map((_,i)=>Math.exp(-Math.pow((i-sl.length*0.45)/(sl.length*0.28),2)));
  G.forEach((g,k)=>{ if(g.status==='hadir' && g.arrive===undefined){ let x=((k*2654435761)>>>0)%1000/1000*w.reduce((a,b)=>a+b,0), i=0; while(x>w[i] && i<w.length-1){ x-=w[i]; i++; } g.arrive=sl[i]; } });
  S.arrSeeded=true;
}
function arrivalCounts(list, e){ const sl=slotsFor(e); const c=Object.fromEntries(sl.map(s=>[s,0])); list.forEach(g=>{ if(g.status==='hadir' && g.arrive && c[g.arrive]!==undefined) c[g.arrive]+=Math.max(1,g.pax||1); }); return {slots:sl, c}; }
function crowdBars(slots, c, opts={}){
  const max=Math.max(1,...slots.map(s=>c[s]||0)); const peak=slots.reduce((a,s)=>(c[s]||0)>(c[a]||0)?s:a, slots[0]);
  return `<div class="crowd-bars" role="img" aria-label="Perkiraan jumlah tamu per jam. Paling ramai sekitar pukul ${peak}.">${slots.map(s=>{ const v=c[s]||0, h=Math.max(4,Math.round(v/max*100)); const act=opts.actual?opts.actual[s]||0:null;
    return `<div class="cb ${s===peak&&v?'pk':''}"><div class="cb-col"><span style="height:${h}%"></span>${act!=null?`<i style="height:${Math.min(100,Math.round(act/max*100))}%"></i>`:''}</div><small>${s}</small></div>`; }).join('')}</div>`;
}
function crowdAdvice(slots, c){
  const tot=slots.reduce((a,s)=>a+(c[s]||0),0); if(tot<3) return '';
  const peak=slots.reduce((a,s)=>(c[s]||0)>(c[a]||0)?s:a, slots[0]);
  const calm=slots.filter(s=>s!==peak).reduce((a,s)=>(c[s]||0)<(c[a]||0)?s:a, slots.find(s=>s!==peak)||slots[0]);
  return `Paling ramai sekitar pukul <b>${peak}</b>. Ingin lebih leluasa? Datang sekitar <b>${calm}</b>.`;
}
let crowdCache={t:0, d:null};
async function crowdData(){
  if(CLOUD.guestMode){ if(Date.now()-crowdCache.t<55000 && crowdCache.d) return crowdCache.d; const { data } = await CLOUD.sb.rpc('crowd',{p_slug:CLOUD.slug}); crowdCache={t:Date.now(), d:data}; return data; }
  const slots={}; G.forEach(g=>{ if(!isPending(g) && g.status==='hadir' && g.arrive) slots[g.arrive]=(slots[g.arrive]||0)+Math.max(1,g.pax||1); });
  const now=Date.now(); const recent=G.filter(g=>g.checkin && now-g.checkin.ts<30*60000).reduce((a,g)=>a+(g.checkin.pax||1),0);
  return {slots, recent, arrived:G.filter(g=>g.checkin).reduce((a,g)=>a+(g.checkin.pax||1),0), now};
}
async function renderCrowd(root){
  const el=root.querySelector('[data-crowd]'); if(!el) return;
  const e=S.events[+el.dataset.ev]; if(!e) return; const sl=slotsFor(e); if(!sl.length){ el.remove(); return; }
  let d; try{ d=await crowdData(); }catch(err){ d=null; } if(!d){ el.hidden=true; return; }
  const c=Object.fromEntries(sl.map(s=>[s, (d.slots||{})[s]||0])); const tot=sl.reduce((a,s)=>a+c[s],0);
  const day = e.date===new Date(Date.now()+7*36e5).toISOString().slice(0,10);
  const nowMin = (()=>{ const x=new Date(); return x.getHours()*60+x.getMinutes(); })();
  const live = day && nowMin>=toMin(sl[0])-60 && nowMin<=toMin(sl[sl.length-1])+90;
  if(tot<3 && !live){ el.hidden=true; return; }
  let liveHTML='';
  if(live){ const cur=fromMin(Math.floor(nowMin/30)*30); const exp=Math.max(4, c[cur]||0, ...sl.map(s=>c[s]))*0.6; const r=d.recent/(exp||1);
    const lv = r<.4 ? ['Lengang','lv-ok','Pas untuk datang sekarang'] : r<.85 ? ['Sedang','lv-mid','Antrean salaman masih wajar'] : ['Ramai','lv-hi','Antrean salaman cukup panjang'];
    liveHTML = `<div class="crowd-live ${lv[1]}"><span class="dot"></span><div><b>Sekarang: ${lv[0]}</b><small>${lv[2]} · ${d.recent} tamu tiba dalam 30 menit terakhir</small></div></div>`; }
  el.hidden=false;
  el.innerHTML = `<div class="crowd-h">${ico('users')}<b>${live?'Keramaian di lokasi':'Perkiraan keramaian'}</b><span>${esc(e.type||'Acara')}</span></div>${liveHTML}${tot>=3?crowdBars(sl,c):''}<p>${tot>=3?crowdAdvice(sl,c):''} <small>Dari jam datang yang dipilih tamu saat konfirmasi.</small></p>`;
  if(live && !el.dataset.tick){ el.dataset.tick=1; setInterval(()=>{ if(document.body.contains(el)) renderCrowd(root); }, 60000); }
}

/* katering */
const catSet = () => Object.assign({rate:50, defPax:2, buffer:10}, S.catering||{});
function catCalc(st, set){
  const fromBelum = Math.round(st.belum*set.rate/100*set.defPax);
  const est = st.hadir_pax + fromBelum; const rec = est ? Math.ceil(est*(1+set.buffer/100)/10)*10 : 0;
  return {fromBelum, est, rec, extra: rec-est};
}
function catStatsLocal(){
  return S.events.map((e,i)=>{ const list=G.filter(g=>!isPending(g) && (!g.sessions||!g.sessions.length||g.sessions.includes(i)));
    return {i, invited:list.length, hadir:list.filter(g=>g.status==='hadir').length, hadir_pax:list.filter(g=>g.status==='hadir').reduce((a,g)=>a+(g.pax||0),0), belum:list.filter(g=>g.status==='belum').length, tidak:list.filter(g=>g.status==='tidak').length, checkin_pax:list.filter(g=>g.checkin&&(g.checkin.session||0)===i).reduce((a,g)=>a+(g.checkin.pax||0),0)}; });
}
function catCardsHTML(events, stats, set, vendor){
  return `<div class="cat-grid">${events.map((e,i)=>{ const st=stats.find(x=>x.i===i)||{invited:0,hadir:0,hadir_pax:0,belum:0,tidak:0,checkin_pax:0}; const k=catCalc(st,set); if(!(e.type||e.date||e.venue)) return '';
    return `<div class="cat-card"><div class="cat-top"><div><b>${esc(e.type||'Acara '+(i+1))}</b><small>${e.date?esc(fmtShort(e.date)):''}${e.start?` · ${esc(e.start)}${e.end?'–'+esc(e.end):''}`:''}${e.venue?` · ${esc(e.venue)}`:''}</small></div></div>
      <div class="cat-big"><span class="num">${k.rec}</span><small>porsi disarankan</small></div>
      <ul class="cat-break">
        <li><span>Pasti hadir</span><b class="num">${st.hadir_pax} orang</b></li>
        <li><span>Perkiraan dari ${st.belum} undangan yang belum menjawab</span><b class="num">+${k.fromBelum}</b></li>
        <li><span>Cadangan ${set.buffer}% untuk tamu tambahan</span><b class="num">+${k.extra}</b></li>
        ${st.checkin_pax?`<li class="act"><span>Sudah datang (check-in)</span><b class="num">${st.checkin_pax} orang</b></li>`:''}
      </ul>
      ${vendor?'':`<div class="cat-foot muted">${st.invited} undangan · ${st.hadir} konfirmasi hadir · ${st.tidak} tidak hadir</div>`}</div>`; }).join('')}</div>`;
}

/* tab Keluarga (dashboard) */
function famTabHTML(){
  const all = G_ALL || G; const fams = S.families||[]; const pend = all.filter(isPending);
  const card = f => { const used=all.filter(g=>g.fam===f.id).length, ok=all.filter(g=>g.fam===f.id && !isPending(g)).length, pd=used-ok, pct=Math.min(100,Math.round(used/(f.quota||1)*100));
    return `<div class="fam-card"><div class="fam-top"><div><b>${esc(f.name)}</b><small class="muted">${ok} disetujui${pd?` · <span style="color:var(--warn)">${pd} menunggu</span>`:''}</small></div><button class="btn btn-ghost btn-sm" data-act="fam-edit" data-f="${f.id}">Ubah</button></div>
      <div class="fam-meter"><span style="width:${pct}%;${pct>=100?'background:var(--no)':''}"></span></div><div class="fam-q num"><b>${used}</b> dari ${f.quota} jatah</div>
      <div class="fam-link"><input class="input" readonly value="${esc(famLink(f))}" aria-label="Link ${esc(f.name)}"><button class="btn btn-soft btn-sm" data-act="copy" data-v="${esc(famLink(f))}">${ico('copy')}Salin</button></div>
      <a class="btn btn-ghost btn-sm" style="width:100%;justify-content:center" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Assalamu'alaikum. Ini link untuk menambahkan tamu dari ${f.name} ke undangan pernikahan ${S.bride.nick} & ${S.groom.nick}. Jatahnya ${f.quota} tamu.\n\nCukup ketik nama (dan nomor WA kalau ada), satu per baris:\n${famLink(f)}\n\nTerima kasih 🙏`)}">${ico('wa')}Kirim link lewat WhatsApp</a></div>`; };
  return `<div class="fam-intro"><div><h3 style="font-family:var(--display);font-size:26px">Akun keluarga</h3><p class="muted" style="max-width:62ch;margin-top:6px">Agar orang tua dan keluarga besar bisa menambahkan tamu mereka sendiri lewat link khusus, tanpa perlu akun. Tiap keluarga punya jatah, dan nama yang mereka tambahkan baru masuk setelah kalian setujui. Daftar tamu tidak lagi tercecer di chat.</p></div><button class="btn btn-primary btn-sm" data-act="fam-add">${ico('plus')}Tambah keluarga</button></div>
    ${pend.length?`<div class="panel-c fam-pend"><h3>Menunggu persetujuan <span class="cnt num">${pend.length}</span><button class="btn btn-primary btn-sm" data-act="fam-approve-all" style="margin-left:auto">Setujui semua</button></h3>
      <ul>${pend.slice(0,60).map(g=>`<li><div><b>${esc(g.name)}</b><small class="muted">${esc(famById(g.fam)?.name||g.group)}${g.phone?' · '+esc(g.phone):''}</small></div><div class="fam-acts"><button class="btn btn-soft btn-sm" data-act="fam-ok" data-id="${g.id}">${ico('check')}Setujui</button><button class="btn btn-ghost btn-sm" data-act="fam-no" data-id="${g.id}" aria-label="Tolak ${esc(g.name)}">Tolak</button></div></li>`).join('')}</ul>${pend.length>60?`<p class="muted" style="font-size:13px">+${pend.length-60} lainnya</p>`:''}</div>`:''}
    ${fams.length?`<div class="fam-grid">${fams.map(card).join('')}</div>`:`<div class="empty">${karaImg('tidur','kara-empty')}<b style="color:var(--ink)">Belum ada akun keluarga.</b><br>Contoh: “Keluarga ${esc(S.bride.nick)}” jatah 150 dan “Keluarga ${esc(S.groom.nick)}” jatah 150.<br><button class="btn btn-primary btn-sm" data-act="fam-quick" style="margin-top:12px">Buat dua akun keluarga sekarang</button></div>`}`;
}
function famModal(id){
  const f = id ? famById(id) : {name:'', quota:100};
  openModal(`<div><span class="eyebrow">${id?'Ubah':'Tambah'} akun keluarga</span><h2 class="display" style="font-size:30px;margin:8px 0 16px">${id?esc(f.name):'Keluarga baru'}</h2>
    <form id="famForm" style="display:grid;gap:14px" novalidate>
      <div class="field"><label for="fm-n">Nama keluarga</label><input class="input" id="fm-n" value="${esc(f.name)}" placeholder="Keluarga ${esc(S.bride.nick)}" required></div>
      <div class="field"><label for="fm-q">Jatah tamu</label><input class="input" id="fm-q" type="number" inputmode="numeric" min="1" max="5000" value="${f.quota}"><span class="hint">Jumlah nama undangan yang boleh mereka tambahkan.</span></div>
      <button class="btn btn-primary btn-block">${id?'Simpan':'Buat link keluarga'}</button>
      ${id?`<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn btn-ghost btn-sm" data-act="fam-rotate" data-f="${id}">Ganti link (link lama tidak berlaku)</button><button type="button" class="btn btn-ghost btn-sm" style="color:var(--no)" data-act="fam-del" data-f="${id}">Hapus keluarga</button></div>`:''}
    </form></div>`);
  $('#famForm').addEventListener('submit', async ev=>{ ev.preventDefault(); const n=$('#fm-n').value.trim(); const q=Math.max(1,Math.min(5000,+$('#fm-q').value||100)); if(!n){ $('#fm-n').focus(); return; }
    const x = id ? Object.assign(f,{name:n, quota:q}) : {id:'f'+Date.now().toString(36), name:n, quota:q, token:genToken()};
    if(!id) (S.families=S.families||[]).push(x);
    if(await famPersist(x)){ save(); closeModal(); renderDash(); toast(id?'Tersimpan':'Link keluarga siap dibagikan'); } });
}
async function famPersist(f){
  if(!(CLOUD.on && CLOUD.inv)) return true;
  const { error } = await CLOUD.sb.from('families').upsert({invitation_id:CLOUD.inv.id, id:f.id, name:f.name, quota:f.quota, token:f.token}, {onConflict:'invitation_id,id'});
  if(error){ toast('Gagal menyimpan: '+error.message); return false; } return true;
}
async function famRemove(id){
  if(CLOUD.on && CLOUD.inv){ const { error } = await CLOUD.sb.from('families').delete().eq('invitation_id',CLOUD.inv.id).eq('id',id); if(error){ toast('Gagal menghapus: '+error.message); return; } }
  S.families=(S.families||[]).filter(f=>f.id!==id); G=G.filter(g=>!(g.fam===id && isPending(g))); G.forEach(g=>{ if(g.fam===id) g.fam=null; }); saveG(); save(); closeModal(); renderDash(); toast('Akun keluarga dihapus');
}
document.addEventListener('click', async e=>{
  const el=e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='fam-add') famModal(null);
  if(a==='fam-edit') famModal(el.dataset.f);
  if(a==='fam-quick'){ S.families=[{id:'f1',name:'Keluarga '+S.bride.nick,quota:150,token:genToken()},{id:'f2',name:'Keluarga '+S.groom.nick,quota:150,token:genToken()}]; for(const f of S.families) if(!(await famPersist(f))) return; save(); renderDash(); toast('Dua akun keluarga siap! Tinggal kirim linknya ke keluarga.'); }
  if(a==='fam-rotate'){ const f=famById(el.dataset.f); f.token=genToken(); if(await famPersist(f)){ save(); closeModal(); renderDash(); toast('Link baru dibuat. Kirim ulang ke keluarga.'); } }
  if(a==='fam-del'){ if(el.dataset.sure){ famRemove(el.dataset.f); } else { el.dataset.sure=1; el.textContent='Yakin? Ketuk sekali lagi'; } }
  if(a==='fam-ok'){ const g=G.find(x=>x.id===el.dataset.id); if(g){ g.approved=true; saveG(); renderDash(); toast(`${g.name} masuk daftar tamu 🎉`); } }
  if(a==='fam-no'){ const g=G.find(x=>x.id===el.dataset.id); if(g){ G=G.filter(x=>x!==g); saveG(); renderDash(); toast(`${g.name} tidak ditambahkan`); } }
  if(a==='fam-approve-all'){ const n=G.filter(isPending).length; G.forEach(g=>{ if(isPending(g)) g.approved=true; }); saveG(); renderDash(); toast(`${n} tamu disetujui`); }
  if(a==='cat-rotate' && CLOUD.on && CLOUD.inv){ const t=genToken(); const { error } = await CLOUD.sb.from('invitations').update({catering_token:t}).eq('id',CLOUD.inv.id); if(error){ toast('Belum berhasil: '+error.message); return; } CLOUD.inv.catering_token=t; renderDash(); toast('Link vendor diganti'); }
  else if(a==='cat-rotate'){ S.cateringToken=genToken(); save(); renderDash(); toast('Link vendor diganti'); }
  if(a==='fp-rm'){ famPageRemove(el.dataset.id); }
  if(a==='cat-print') window.print();
});

/* tab Katering (dashboard) */
function catTabHTML(){
  const set=catSet(); const st=catStatsLocal(); const tot=S.events.map((e,i)=>catCalc(st[i],set).rec);
  return `<div class="fam-intro"><div><h3 style="font-family:var(--display);font-size:26px">Hitungan katering</h3><p class="muted" style="max-width:62ch;margin-top:6px">Perkiraan porsi tiap sesi, dihitung dari konfirmasi tamu dan langsung update tiap ada jawaban baru. Atur asumsinya sesuai pengalaman keluarga, agar tidak ada tamu yang kehabisan makanan.</p></div></div>
    ${catCardsHTML(S.events, st, set, false)}
    <div class="dgrid" style="margin-top:20px">
      <div class="panel-c"><h3>Asumsi hitungan</h3>
        <div class="cat-ctl"><label for="cs-rate">Undangan yang belum menjawab, diperkirakan datang</label><div><input type="range" id="cs-rate" min="0" max="100" step="5" value="${set.rate}"><output class="num">${set.rate}%</output></div></div>
        <div class="cat-ctl"><label for="cs-pax">Rata-rata orang per undangan yang belum menjawab</label><div><input type="range" id="cs-pax" min="1" max="4" step="0.5" value="${set.defPax}"><output class="num">${set.defPax}</output></div></div>
        <div class="cat-ctl"><label for="cs-buf">Cadangan untuk tamu tambahan</label><div><input type="range" id="cs-buf" min="0" max="30" step="5" value="${set.buffer}"><output class="num">${set.buffer}%</output></div></div>
        <p class="muted" style="font-size:13px;margin-top:6px">Hasil dibulatkan ke atas per 10 porsi.</p></div>
      <div class="panel-c"><h3>Link untuk vendor katering</h3><p class="muted" style="font-size:14px">Vendor bisa pantau angka terbaru tanpa akun. Yang terlihat hanya jumlah per sesi, nama tamu tetap rahasia.</p>
        <div class="fam-link" style="margin-top:12px"><input class="input" readonly value="${esc(catLink())}" aria-label="Link vendor katering"><button class="btn btn-soft btn-sm" data-act="copy" data-v="${esc(catLink())}">${ico('copy')}Salin</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Halo, ini link perkiraan porsi katering untuk pernikahan ${S.bride.nick} & ${S.groom.nick}. Angkanya diperbarui otomatis dari konfirmasi tamu:\n${catLink()}`)}">${ico('wa')}Kirim ke vendor</a><button class="btn btn-ghost btn-sm" data-act="cat-rotate">Ganti link</button></div></div>
    </div>`;
}
let catT=null;
document.addEventListener('input', e=>{
  const m={'cs-rate':['rate','%'],'cs-pax':['defPax',''],'cs-buf':['buffer','%']}[e.target.id]; if(!m) return;
  S.catering=Object.assign(catSet(), {[m[0]]:+e.target.value}); e.target.nextElementSibling.textContent=e.target.value+m[1];
  $('.cat-grid').outerHTML = catCardsHTML(S.events, catStatsLocal(), catSet(), false);
  clearTimeout(catT); catT=setTimeout(save, 400);
});

/* halaman keluarga (untuk orang tua) */
let FP = {token:null, fam:null, guests:[], info:null, err:null};
async function famPageLoad(){
  if(CLOUD.on && CLOUD.famMode){ const { data, error } = await CLOUD.sb.rpc('fam_load',{p_slug:CLOUD.slug, p_token:FP.token}); if(error){ FP.err=error.message; return; }
    FP.fam=data.family; FP.guests=data.guests||[]; FP.info={bride:data.bride, groom:data.groom, date:data.date}; return; }
  const f=(S.families||[]).find(x=>x.token===FP.token); if(!f){ FP.err='Link keluarga tidak berlaku'; return; }
  FP.fam=f; FP.guests=G.filter(g=>g.fam===f.id).map(g=>({id:g.id,name:g.name,phone:g.phone,approved:!isPending(g),status:g.status})); FP.info={bride:S.bride.nick, groom:S.groom.nick, date:S.events[0]?.date};
}
function parseNames(txt){
  return txt.split(/\n+/).map(l=>l.trim()).filter(Boolean).map(l=>{ const m=l.match(/(\+?62|0)8[\d\s-]{7,15}\d/); const phone=m?m[0].replace(/[\s-]/g,''):''; const name=(m?l.replace(m[0],''):l).replace(/[,;|\t]+\s*$/,'').replace(/\s{2,}/g,' ').replace(/^[\d.)\-•*]+\s+/,'').trim(); return {name, phone}; }).filter(x=>x.name.length>1);
}
function renderFamPage(){
  const root=$('#keluarga');
  if(FP.err){ root.innerHTML=`<div class="fp"><div class="fp-card" style="text-align:center">${karaImg('bingung','kara-404')}<h1 class="display" style="font-size:30px">Link tidak berlaku</h1><p class="muted" style="margin-top:10px">${esc(FP.err)}. Mintalah link terbaru kepada pengantin, ya.</p></div></div>`; return; }
  const f=FP.fam, used=FP.guests.length, left=Math.max(0,f.quota-used), pct=Math.min(100,Math.round(used/(f.quota||1)*100)), pend=FP.guests.filter(g=>!g.approved).length;
  root.innerHTML = `<div class="fp">
    <div class="fp-head"><span class="logo-sm">Sakara</span><span class="eyebrow">Undangan ${esc(FP.info.bride)} &amp; ${esc(FP.info.groom)}${FP.info.date?' · '+esc(fmtShort(FP.info.date)):''}</span><h1 class="display">Daftar tamu ${esc(f.name)}</h1>
      <div class="fam-meter big"><span style="width:${pct}%"></span></div><p class="fp-q"><b class="num">${used}</b> dari ${f.quota} tamu · sisa <b class="num">${left}</b></p></div>
    <form class="fp-card" id="fpForm" novalidate><label for="fp-t"><b>Tambah tamu</b><span class="muted">Tulis satu nama per baris. Nomor WhatsApp boleh ditambahkan di belakang nama.</span></label>
      <textarea class="input" id="fp-t" rows="5" placeholder="Tulis atau tempel nama di sini…" ${left?'':'disabled'}></textarea>
      <div class="fp-ex" id="fpEx"><b>Contoh cara menulis</b>
        <div class="fp-ex-box"><span>Pak Haji Darmawan, 081234567890</span><span>Bu Siti dan keluarga</span><span>Om Bambang 0813 1111 2222</span></div>
        <p>Satu baris untuk satu undangan. Nomor boleh pakai spasi atau tanda strip, dan boleh juga dikosongkan.</p></div>
      <div class="fp-prev" id="fpPrev" aria-live="polite"></div>
      <button class="btn btn-primary btn-block" ${left?'':'disabled'}>${left?'Tambahkan ke daftar':'Jatah sudah penuh'}</button></form>
    <div class="fp-card"><h2>Tamu dari ${esc(f.name)} <span class="cnt num">${used}</span></h2>${pend?`<p class="muted" style="font-size:15px;margin:4px 0 10px">${pend} nama sedang dicek oleh ${esc(FP.info.bride)} &amp; ${esc(FP.info.groom)} sebelum undangannya dikirim.</p>`:''}
      ${FP.guests.length?`<ul class="fp-list">${FP.guests.map(g=>`<li><div><b>${esc(g.name)}</b>${g.phone?`<small class="muted num">${esc(g.phone)}</small>`:''}</div>${g.approved?`<span class="status ${g.status==='hadir'?'s-ok':g.status==='tidak'?'s-no':'s-mute'}">${g.status==='hadir'?'Akan hadir':g.status==='tidak'?'Tidak hadir':'Disetujui'}</span>`:`<span class="status s-wait">Menunggu</span><button class="btn btn-ghost btn-sm" data-act="fp-rm" data-id="${esc(g.id)}" aria-label="Hapus ${esc(g.name)}">Hapus</button>`}</li>`).join('')}</ul>`:`<div style="text-align:center">${karaImg('lambai','kara-sm')}<p class="muted">Belum ada nama. Mulai saja dari kerabat yang paling dekat.</p></div>`}</div>
    <p class="fp-foot muted">Halaman ini khusus untuk ${esc(f.name)}. Jangan bagikan link ke orang lain.</p></div>`;
  const ta=$('#fp-t'), pv=$('#fpPrev');
  ta && ta.addEventListener('input',()=>{ const p=parseNames(ta.value); const ex=$('#fpEx'); if(ex) ex.hidden=!!p.length; pv.innerHTML = p.length ? `<b>${p.length} nama akan ditambahkan</b>${p.length>left?` · <b style="color:var(--no)">melebihi sisa jatah ${left}</b>`:''}<ul class="fp-pl">${p.slice(0,8).map(x=>`<li><span>${esc(x.name)}</span>${x.phone?`<small class="num">${esc(x.phone)}</small>`:'<small>tanpa nomor</small>'}</li>`).join('')}${p.length>8?`<li class="more">dan ${p.length-8} nama lainnya</li>`:''}</ul>` : ''; });
  $('#fpForm').addEventListener('submit', async ev=>{ ev.preventDefault(); const p=parseNames(ta.value); if(!p.length){ ta.focus(); return; } if(p.length>left){ toast(`Sisa jatah ${left} nama. Kurangi dulu, ya.`); return; }
    const b=ev.target.querySelector('button'); b.disabled=true; b.textContent='Menyimpan…';
    if(CLOUD.on && CLOUD.famMode){ const { data, error } = await CLOUD.sb.rpc('fam_add',{p_slug:CLOUD.slug, p_token:FP.token, p_items:p}); if(error){ b.disabled=false; b.textContent='Tambahkan ke daftar'; toast(error.message); return; } FP.guests=data.guests||[]; }
    else { p.forEach((x,k)=>{ const g={id:'f'+Date.now().toString(36)+k, name:x.name, phone:x.phone, group:FP.fam.name, status:'belum', pax:0, sent:false, sessions:S.events.map((e,i)=>i), fam:FP.fam.id, approved:false}; g.code=makeCode(g); G.unshift(g); }); saveG(); await famPageLoad(); }
    toast(`${p.length} nama ditambahkan. Pengantin akan mengeceknya.`); renderFamPage(); });
}
async function famPageRemove(id){
  if(CLOUD.on && CLOUD.famMode){ const { error } = await CLOUD.sb.rpc('fam_remove',{p_slug:CLOUD.slug, p_token:FP.token, p_id:id}); if(error){ toast(error.message); return; } }
  else { G=G.filter(g=>!(g.id===id && isPending(g))); saveG(); }
  await famPageLoad(); renderFamPage();
}

/* halaman vendor katering */
let CP = {token:null, d:null, err:null};
async function catPageLoad(){
  if(CLOUD.on && CLOUD.catMode){ const { data, error } = await CLOUD.sb.rpc('catering',{p_slug:CLOUD.slug, p_token:CP.token}); if(error){ CP.err=error.message; return; } CP.d=data; return; }
  if(CP.token!==S.cateringToken){ CP.err='Link katering tidak berlaku'; return; }
  CP.d={bride:S.bride.nick, groom:S.groom.nick, events:S.events, settings:S.catering||{}, stats:catStatsLocal(), updated:new Date().toISOString()};
}
function renderCatPage(){
  const root=$('#katering');
  if(CP.err){ root.innerHTML=`<div class="fp"><div class="fp-card" style="text-align:center">${karaImg('bingung','kara-404')}<h1 class="display" style="font-size:30px">Link tidak berlaku</h1><p class="muted" style="margin-top:10px">${esc(CP.err)}. Mintalah link terbaru kepada pengantin, ya.</p></div></div>`; return; }
  const d=CP.d, set=Object.assign({rate:50,defPax:2,buffer:10}, d.settings||{});
  root.innerHTML = `<div class="fp wide"><div class="fp-head"><span class="logo-sm">Sakara</span><span class="eyebrow">Untuk vendor katering</span><h1 class="display">Pernikahan ${esc(d.bride)} &amp; ${esc(d.groom)}</h1><p class="muted">Perkiraan porsi dari konfirmasi tamu. Diperbarui otomatis setiap menit · terakhir ${esc(fmtDT(d.updated))}</p></div>
    ${catCardsHTML(d.events||[], d.stats||[], set, true)}
    <div class="fp-card" style="margin-top:16px"><b>Cara menghitung</b><p class="muted" style="font-size:15px;margin-top:6px">Tamu yang sudah konfirmasi hadir dihitung sesuai jumlah orangnya. Undangan yang belum menjawab diperkirakan ${set.rate}% datang dengan rata-rata ${set.defPax} orang. Lalu ditambah cadangan ${set.buffer}%, dibulatkan ke atas per 10 porsi.</p>
    <button class="btn btn-ghost btn-sm" data-act="cat-print" style="margin-top:12px">Cetak / simpan PDF</button></div>
    <p class="fp-foot muted">Nama tamu tidak ditampilkan di halaman ini.</p></div>`;
}

(function famSeed(){ if(S.famInit) return; S.famInit=true; S.families=[{id:'f1',name:'Keluarga '+S.bride.nick,quota:150,token:genToken()},{id:'f2',name:'Keluarga '+S.groom.nick,quota:120,token:genToken()}];
  [['Pak Haji Darmawan','081234567890','f1'],['Bu Siti Aminah','','f1'],['Om Bambang Sutejo','081311112222','f1'],['Tante Rina Kusuma','','f2']].forEach(([n,ph,f],k)=>{ const g={id:'fs'+k, name:n, phone:ph, group:famById(f).name, status:'belum', pax:0, sent:false, sessions:S.events.map((e,i)=>i), fam:f, approved:false}; g.code=makeCode(g); G.push(g); });
  G.slice(0,40).forEach((g,k)=>{ if(!g.fam && !isPending(g) && k%3===0) g.fam = k%2?'f2':'f1'; });
  seedArrivals(); saveG(); save(); })();
const dTile = (l,v,sub,ic,tn,hl) => `<div class="tile ic${hl?' hl':''}"><i class="adm-ic tn-${tn}">${ico(ic)}</i><div class="v">${v}</div><div class="l">${l}</div>${sub?`<div class="s">${sub}</div>`:''}</div>`;
const dPanel = (t,d,body,extra='',cls='') => `<section class="panel-c pn ${cls}"><header class="pn-h"><div><h3>${t}</h3>${d?`<p>${d}</p>`:''}</div>${extra}</header><div class="pn-b">${body}</div></section>`;
const dEmpty = (ic,t,d,tn='beet') => `<div class="adm-empty"><img class="kara kara-empty" src="/assets/kara/kara-tidur.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"><b>${t}</b>${d?`<p>${d}</p>`:''}</div>`;
function karaImg(n,c='kara-empty'){ return `<img class="kara ${c}" src="/assets/kara/kara-${n}.webp" alt="" aria-hidden="true" loading="lazy" decoding="async">`; }
function renderDash(){ const all=G; G_ALL=all; G=all.filter(g=>!isPending(g)); try{ renderDashCore(); } finally { G=all; }
  /* tab aktif selalu terlihat di baris tab yang bisa digeser (HP) */
  requestAnimationFrame(()=>{ $$('.dtabs, .dash-nav').forEach(bar=>{ const a=bar.querySelector('[aria-selected="true"]'); if(a && bar.scrollWidth>bar.clientWidth){ const l=a.offsetLeft-(bar.clientWidth-a.offsetWidth)/2; bar.scrollTo({left:Math.max(0,l), behavior:'smooth'}); } }); }); }
/* ---------- Sentuhan tambahan: saran opsional yang muncul sesuai waktu acara ---------- */
function touchTips(){
  const first=S.events.find(e=>e.date), days=first ? Math.ceil((new Date(first.date+'T00:00:00')-new Date())/864e5) : null;
  const evs=S.events.filter(e=>e.type||e.date||e.venue), off=S.tipsOff||[], t=[];
  if(memActive()) t.push({k:'mem', ic:'heart', h:'Halaman kenangan sudah aktif', p:'Kirim ucapan terima kasih ke tamu, sekalian ajak mereka melihat doa dan foto dari hari itu.', b:'Kirim terima kasih', act:'tip-thx'});
  else {
    if(isCx(S.theme)){ const left=cxSampleList(); if(left.length) t.push({k:'cxfoto', ic:'camera', h:`Masih ada ${left.length} foto contoh`, p:'Ganti dengan foto kalian sebelum dibagikan, supaya tamu tidak melihat foto orang lain.', b:'Ganti foto', panel:'cx:'+left[0].sec}); }
    if(!isCx(S.theme) && !(S.gallery||[]).length) t.push({k:'foto', ic:'camera', h:'Tambah beberapa foto kalian', p:'Undangan dengan foto terasa jauh lebih personal. Tiga sampai lima foto favorit sudah cukup.', b:'Tambah foto', panel:'galeri'});
    if(!(S.story && S.story.on && (S.story.items||[]).length && !S.story.demo)) t.push({k:'cerita', ic:'heart', h:'Ceritakan perjalanan kalian', p:'Dua atau tiga momen singkat sudah cukup membuat tamu tersenyum.', b:'Tulis kisah', panel:'cerita'});
    if(days!=null && days>=0 && days<=45 && evs.some(e=>!String(e.dress||'').trim() && !(e.dcol||[]).length)) t.push({k:'dress', ic:'users', h:'Sudah ada dress code?', p:'Ini pertanyaan yang paling sering ditanyakan tamu menjelang hari H.', b:'Tambah dress code', panel:'acara'});
    if(days!=null && days>=0 && days<=10 && !evs.some(e=>liveUrl(e.live))) t.push({k:'live', ic:'play', h:'Ada keluarga yang tidak bisa datang?', p:'Tempel link siaran langsung, tombolnya muncul sendiri di undangan.', b:'Tambah link', panel:'acara'});
    if(days!=null && days>=0 && days<=30 && G.length>=20 && !S.seatsDefault && !Object.keys(S.seats||{}).length) t.push({k:'kuota', ic:'users', h:'Batasi jumlah orang per undangan?', p:'Agar hitungan katering tetap aman dan link tidak diteruskan ke banyak orang.', b:'Atur batas', panel:'rsvp'});
  }
  return t.filter(x=>!off.includes(x.k)).slice(0,3);
}
function readyHTML(){
  const ready = S.bride.name && S.groom.name && S.events.some(e=>e.date && e.venue), tips = ready ? touchTips() : [];
  return `<section class="ready${ready?' ok':''}"><div class="ready-h"><span class="ready-ic">${ico(ready?'check':'edit')}</span><div><b>${!ready?'Tinggal sedikit lagi':S.published?'Undangan kalian sudah tayang':'Undangan kalian sudah siap dibagikan'}</b><span>${!ready?'Lengkapi nama, tanggal, dan lokasi acara, lalu undangannya siap dibagikan.':tips.length?`Mau membuat tamu makin senang? Ini ${tips.length} sentuhan tambahan, semuanya opsional.`:'Semuanya sudah lengkap. Tinggal nikmati prosesnya.'}</span></div>${ready?'':'<a class="btn btn-primary btn-sm" href="#buat">Lanjutkan</a>'}</div>
    ${tips.length?`<div class="tips">${tips.map(x=>`<article class="tip"><span class="tip-ic">${ico(x.ic)}</span><div><b>${x.h}</b><p>${x.p}</p><div class="tip-a"><button type="button" class="btn btn-soft btn-sm" data-act="${x.act||'tip-go'}" data-panel="${x.panel||''}">${x.b}</button><button type="button" class="linkbtn" data-act="tip-off" data-k="${x.k}">Nanti saja</button></div></div></article>`).join('')}</div>`:''}</section>`;
}
function renderDashCore(){
  const total=G.length, hadir=G.filter(g=>g.status==='hadir'), tidak=G.filter(g=>g.status==='tidak').length, belum=G.filter(g=>g.status==='belum').length, sent=G.filter(g=>g.sent).length;
  const pax = hadir.reduce((a,g)=>a+g.pax,0);
  const arrived = G.filter(g=>g.checkin);
  if(isPrep() && !dtList().some(([k])=>k===dTab)) dTab='tamu';
  const head = (DEMO.on ? demoBanner() : isPrep() ? prepBanner() : '') + `<div class="dash-head${dTab!=='ringkasan'?' is-compact':''}"><div><span class="eyebrow">${DEMO.on?'Demo · dashboard contoh':isPrep()?'Daftar tamu':'Dashboard pasangan'}</span><h1>${esc(S.bride.nick)} &amp; ${esc(S.groom.nick)}</h1>
    <div class="meta"><span class="status ${DEMO.on?'s-wait':S.published?'s-ok':'s-wait'}">${DEMO.on?'Data contoh':S.published?`Aktif selamanya · ${esc((planOf(S.plan)||{name:S.plan||'Paket'}).name)}`:'Belum dipublikasikan'}</span><span class="num">${esc(fmtDate(S.events[0].date))}</span>${DEMO.on?'':`<span>${S.published&&CLOUD.on?`<a href="${esc(pubURL())}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">${esc(pubHost()+S.slug)}</a>`:esc(pubHost()+S.slug)}</span>`}</div></div>
    <div class="dh-acts" style="display:flex;gap:10px;flex-wrap:wrap">${isPrep()?`<a class="btn btn-ghost btn-sm" href="#buat">${ico('edit')}Lanjutkan undangan</a>`:`<a class="btn btn-primary btn-sm" href="#edit">${ico('edit')}Edit undangan</a><button class="btn btn-ghost btn-sm" data-act="view-as" data-id="">${ico('eye')}Lihat sebagai tamu</button>${canUpgrade()&&!DEMO.on?`<button class="linkbtn dh-up" data-act="upgrade">${ico('up')}Naikkan paket</button>`:''}`}</div></div>
    <div class="dtabs" role="tablist">${dtList().map(([k,l])=>`<button role="tab" data-dtab="${k}" aria-selected="${dTab===k}">${l}${k==='tamu'?`<span class="cnt num">${total}</span>`:k==='ucapan'?`<span class="cnt num">${W.length}</span>`:k==='harih'&&arrived.length?`<span class="cnt num">${arrived.length}</span>`:k==='keluarga'&&(G_ALL||G).some(isPending)?`<span class="cnt num" style="background:var(--warn);color:#fff">${(G_ALL||G).filter(isPending).length}</span>`:''}</button>`).join('')}</div>`;
  let body='';
  if(dTab==='ringkasan'){
    const pct = n => (total? n/total*100 : 0).toFixed(1)+'%';
    const groups=[...new Set(G.map(g=>g.group))];
    body = `${readyHTML()}<div class="tiles">
      ${dTile('Undangan terkirim',`${sent}<span class="of">/${total}</span>`,`${total-sent} tamu belum dikirimi`,'mail','amber',1)}
      ${dTile('Akan hadir',pax,`orang, dari ${hadir.length} undangan`,'check','green')}
      ${dTile('Tidak hadir',tidak,'sudah mengabari','x','gray')}
      ${dTile('Belum menjawab',belum,isLocked('remind')?`<button class="btn btn-ghost btn-sm" data-act="upgrade">${ico('lock')}Kirim pengingat</button>`:`<button class="btn btn-soft btn-sm" data-act="remind">Kirim pengingat</button>`,'chat','blue')}
    </div>
    <div class="dgrid">
      ${dPanel('Jawaban per grup', total?`${hadir.length+tidak} dari ${total} undangan sudah menjawab.`:'Lihat siapa saja yang sudah membalas undangan.',
        total?`<div class="legend" style="margin:0 0 12px"><span><i style="background:var(--ok)"></i>Hadir</span><span><i style="background:var(--no)"></i>Tidak</span><span><i style="background:#E9D4A9"></i>Belum</span></div>
        <div class="stack" style="margin-bottom:18px"><span style="width:${pct(hadir.length)};background:var(--ok)"></span><span style="width:${pct(tidak)};background:var(--no)"></span><span style="width:${pct(belum)};background:#E9D4A9"></span></div>
        ${groups.map(gr=>{ const a=G.filter(g=>g.group===gr), n=a.length, h=a.filter(g=>g.status==='hadir').length, t=a.filter(g=>g.status==='tidak').length;
          return `<div class="grp-row"><span style="font-weight:600">${esc(gr)}</span><span class="track"><span style="width:${h/n*100}%;background:var(--ok)"></span><span style="width:${t/n*100}%;background:var(--no)"></span><span style="width:${(n-h-t)/n*100}%;background:#E9D4A9"></span></span><span class="num muted" style="text-align:right">${h}/${n}</span></div>`;}).join('')}`
        : dEmpty('users','Belum ada tamu.','Tambahkan tamu dulu, nanti jawabannya terkumpul di sini.'),
        `<button type="button" class="linkbtn" data-dtab="tamu">Lihat tamu</button>`)}
      ${dPanel('Per sesi acara','Tiap tamu hanya melihat acara yang memang untuknya.',
        S.events.map((e,i)=>{ const inv=G.filter(g=>guestEvents(g).some(x=>x.i===i)); const hp=inv.filter(g=>g.status==='hadir').reduce((a,g)=>a+g.pax,0); return `<div class="ses-row"><div><b>${esc(e.type||'Acara '+(i+1))}</b><small class="muted">${esc(e.venue||'')}${e.start?` · ${esc(e.start)}`:''}</small></div><div class="num"><b>${inv.length}</b><small class="muted">diundang</small></div><div class="num"><b>${hp}</b><small class="muted">orang hadir</small></div></div>`; }).join(''))}
    </div>`;
  }
  if(dTab==='tamu'){
    const all = filteredGuests(); { const sig=gQ+'|'+gStatus+'|'+gGroup; if(sig!==gSig){ gSig=sig; gLimit=GPAGE; } }
    const list = all.slice(0,gLimit), more = all.length-list.length;
    const groups=[...new Set([...(S.groups||[]), ...G.map(g=>g.group)])];
    body = `<div class="gtool">
      <label class="search"><svg class="icon"><use href="#i-search"/></svg><input class="input" id="gSearch" placeholder="Cari nama, nomor, atau kode" value="${esc(gQ)}" aria-label="Cari tamu"></label>
      <div class="seg" role="group" aria-label="Filter status">${[['semua','Semua'],['belum','Belum jawab'],['hadir','Hadir'],['tidak','Tidak']].map(([k,l])=>`<button type="button" data-gst="${k}" aria-pressed="${gStatus===k}">${l}</button>`).join('')}</div>
      <select class="input" id="gGroup" style="width:auto;min-width:160px" aria-label="Filter grup"><option value="semua">Semua grup</option>${groups.map(x=>`<option ${gGroup===x?'selected':''}>${esc(x)}</option>`).join('')}</select>
      <div class="right">
        ${isLocked('groups')?'':`<button class="btn btn-ghost btn-sm" data-act="groups">${ico('users')}Kelola grup</button>`}
        ${isLocked('import')?`<button class="btn btn-ghost btn-sm" data-act="upgrade">${ico('lock')}Import Excel</button>`:`<label class="btn btn-ghost btn-sm" for="importFile" style="cursor:pointer">${ico('up')}Import Excel/CSV</label><input type="file" id="importFile" accept=".xlsx,.xls,.csv,text/csv" hidden>`}
        <button class="btn btn-ghost btn-sm" data-act="wa-tpl" data-kind="invite">${ico('wa')}Pesan WhatsApp</button>
        <button class="btn btn-ghost btn-sm" data-act="${isLocked('bulk')?'upgrade':'cards-print'}">${ico(isLocked('bulk')?'lock':'qr')}Kartu cetak</button>
        <button class="btn btn-primary btn-sm" data-act="add-guest">${ico('plus')}Tambah tamu</button></div>
    </div>
    ${sel.size?`<div class="bulk"><span>${sel.size} tamu dipilih</span>
      <select class="input" id="bulkGroup" aria-label="Pindah ke grup" style="width:auto;min-height:36px;padding:6px 10px;color:var(--ink)"><option value="">Pindah ke grup…</option>${groups.map(x=>`<option>${esc(x)}</option>`).join('')}</select>
      <button class="btn btn-sm" style="background:#fff;color:var(--ink);margin-left:auto" data-act="${isLocked('bulk')?'upgrade':'bulk-send'}">${ico(isLocked('bulk')?'lock':'wa')}Kirim ke ${sel.size} tamu</button><button class="btn btn-sm" style="color:#fff;border-color:#ffffff55" data-act="${isLocked('bulk')?'upgrade':'cards-print'}">${ico(isLocked('bulk')?'lock':'qr')}Kartu cetak</button><button class="btn btn-sm" style="color:#fff;border-color:#ffffff55" data-act="bulk-clear">Batal</button></div>`:''}
    <div class="tbl-wrap"><table><thead><tr><th style="width:40px"><input type="checkbox" data-act="sel-all" aria-label="Pilih semua" ${all.length&&all.every(g=>sel.has(g.id))?'checked':''}></th><th>Nama</th><th>Grup</th><th>Sesi</th><th>Status</th><th class="num">Orang</th><th>Dikirim</th><th style="text-align:right">Aksi</th></tr></thead><tbody>
      ${list.map(g=>`<tr><td><input type="checkbox" data-sel="${g.id}" ${sel.has(g.id)?'checked':''} aria-label="Pilih ${esc(g.name)}"></td><td><div class="nm">${esc(g.name)}</div><div class="sub num">${esc(g.phone||'—')} · ${esc(g.code)}</div></td><td>${esc(g.group)}</td><td>${sesChips(g)}</td><td><span class="status ${stLabel[g.status][1]}">${stLabel[g.status][0]}</span>${g.checkin?' <span class="status s-mute">Sudah datang</span>':''}</td><td class="num">${g.pax||'—'}</td><td>${g.sent?'<span class="status s-mute">Terkirim</span>':'<span class="muted" style="font-size:13px">Belum</span>'}</td>
      <td class="acts"><a class="btn btn-soft btn-sm" href="${waUrl(g)}" target="_blank" rel="noopener" data-sent="${g.id}">${ico('wa')}${g.sent?'Kirim ulang':'Kirim WA'}</a> <button class="btn btn-ghost btn-sm" data-act="guest-menu" data-id="${g.id}" aria-label="Opsi ${esc(g.name)}">Opsi</button></td></tr>`).join('') || `<tr><td colspan="8"><div class="empty" style="border:0">Tidak ada tamu yang cocok. Coba ubah kata pencarian atau filternya.</div></td></tr>`}
    </tbody></table></div>
    <div class="gcards">${list.map(g=>`<div class="gcard"><label class="gsel"><input type="checkbox" data-sel="${g.id}" ${sel.has(g.id)?'checked':''} aria-label="Pilih ${esc(g.name)}"></label><div><div style="font-weight:700">${esc(g.name)}</div><div class="muted" style="font-size:13px">${esc(g.group)} · ${esc(sessionNames(g))}${g.pax?` · ${g.pax} orang`:''}</div></div><span class="status ${stLabel[g.status][1]}">${stLabel[g.status][0].replace(' menjawab','')}</span>
      <div class="acts"><a class="btn btn-soft btn-sm" href="${waUrl(g)}" target="_blank" rel="noopener" data-sent="${g.id}">${ico('wa')}${g.sent?'Kirim ulang':'Kirim WA'}</a><button class="btn btn-ghost btn-sm" data-act="guest-menu" data-id="${g.id}">Opsi</button></div></div>`).join('') || (G.length ? '<div class="empty">Tidak ada tamu yang cocok dengan pencarian atau filter ini.</div>' : `<div class="empty">${karaImg('lambai','kara-sm')}<b style="display:block;margin:8px 0 4px">Belum ada tamu</b>Tambahkan satu per satu, atau impor dari Excel kalau daftarnya sudah ada.<div style="margin-top:12px"><button class="btn btn-primary btn-sm" data-act="add-guest">${ico('plus')}Tambah tamu</button></div></div>`)}</div>
    ${more?`<div class="g-more"><button type="button" class="btn btn-ghost" data-act="g-more">Tampilkan ${Math.min(more,GPAGE)} tamu lagi</button></div>`:''}
    <p class="muted" style="font-size:13px;margin-top:12px">Menampilkan ${list.length} dari ${total} tamu. <button class="linkbtn" data-act="import-help">Lihat format file Excel</button></p>`;
  }
  if(dTab==='harih'){
    if(isLocked('harih')) body = lockNote('QR check-in hari H');
    else {
      const expect = hadir.filter(g=>!g.checkin);
      const ppl = arrived.reduce((a,g)=>a+g.checkin.pax,0);
      const gifts = arrived.filter(g=>g.checkin.gift).length;
      body = `<div class="harih-hero"><div><span class="eyebrow">Hari H</span><h2 class="display" style="font-size:34px;margin-top:8px">Buku tamu digital dengan QR</h2><p class="muted" style="max-width:56ch;margin-top:8px">Tiap tamu yang akan hadir mendapat kartu masuk QR di undangannya. Pas hari H, penerima tamu tinggal buka mode ini di HP atau tablet, lalu scan QR atau cari nama. Antre menulis buku tamu? Sudah bukan zamannya.</p></div><a class="btn btn-primary" href="#checkin">${ico('qr')}Buka mode penerima tamu</a></div>
      ${CLOUD.inv?`<div class="panel-c pin-card"><div><b>Link untuk penerima tamu</b><p class="muted" style="font-size:14px;margin-top:4px">Kirim ke petugas penerima tamu. Mereka tidak perlu akun, cukup link dan PIN ini. Bisa dibuka di beberapa HP sekaligus.</p></div><div class="pin-row"><span class="pin num">${esc(CLOUD.inv.checkin_pin)}</span><button class="btn btn-soft btn-sm" data-act="copy" data-v="${esc(`${location.origin}/u/${CLOUD.inv.slug}/checkin?pin=${CLOUD.inv.checkin_pin}`)}">${ico('copy')}Salin link</button><button class="btn btn-ghost btn-sm" data-act="pin-rotate" title="Link & PIN lama langsung tidak berlaku">Ganti PIN</button></div>${/^\d{6}$/.test(CLOUD.inv.checkin_pin||'')?`<p class="hint" style="margin-top:8px">PIN 6 angka mudah ditebak. Ganti ke PIN baru yang lebih aman, lalu kirim ulang link ke penerima tamu.</p>`:''}</div>`:''}
      <div class="tiles" style="margin-top:20px">
        ${dTile('Sudah datang',arrived.length,`undangan · ${ppl} orang`,'check','green',1)}
        ${dTile('Konfirmasi hadir, belum datang',expect.length,`${expect.reduce((a,g)=>a+g.pax,0)} orang diharapkan`,'cal','amber')}
        ${dTile('Kado & amplop tercatat',gifts,`nomor terakhir #${String(S.giftNo||0).padStart(3,'0')}`,'gift','plum')}
        ${dTile('Tamu tambahan',G.filter(g=>g.walkin).length,'tidak ada di daftar','plus','gray')}
      </div>
      ${(()=>{ const ev=S.events.filter(e=>e.start); const me=ev[ev.length-1]; const {slots,c}=arrivalCounts(G,me||{}); if(!slots.length) return ''; const act=Object.fromEntries(slots.map(x=>[x,0])); G.forEach(g=>{ if(g.checkin&&g.checkin.time){ const m=toMin(g.checkin.time); const k=fromMin(Math.floor(m/30)*30); if(act[k]!==undefined) act[k]+=g.checkin.pax||1; } });
        return dPanel(`Perkiraan kedatangan · ${esc(me.type||'Acara')}`, `${crowdAdvice(slots,c)||'Belum banyak tamu yang memilih jam datang.'} Tamu bisa melihat status ramai atau lengang di undangannya saat hari H.`, `<div class="legend" style="margin:0 0 12px"><span><i style="background:var(--beet)"></i>Rencana datang</span><span><i style="background:var(--ok)"></i>Sudah tiba</span></div>${crowdBars(slots,c,{actual:act})}`,'','arr-panel'); })()}
      ${dPanel('Daftar kedatangan','Tamu yang sudah check-in, paling baru di atas.', arrived.length?`<ul class="feed">${arrived.sort((a,b)=>b.checkin.ts-a.checkin.ts).map(g=>`<li><span class="av">${esc(initials(g.name))}</span><div><b>${esc(g.name)}</b> · ${g.checkin.pax} orang${g.checkin.gift?` · Kado #${String(g.checkin.gift).padStart(3,'0')}`:''}<small>${esc(g.checkin.time)} · ${esc(S.events[g.checkin.session]?.type||'')}${g.walkin?' · tamu tambahan':''}</small></div></li>`).join('')}</ul>`
        : dEmpty('inbox','Belum ada tamu yang datang.','Begitu penerima tamu mulai check-in, nama-namanya muncul di sini satu per satu.'),'','arr-list')}`;
    }
  }
  if(dTab==='keluarga') body = famTabHTML();
  if(dTab==='kenangan') body = knTabHTML();
  if(dTab==='katering') body = catTabHTML();
  if(dTab==='ucapan'){
    body = `<p class="muted" style="margin-bottom:16px">Ucapan yang kalian sembunyikan tidak tampil di undangan, tapi tetap tersimpan aman di sini.</p>${W.length?'':dEmpty('chat','Belum ada ucapan.','Ucapan dari tamu langsung masuk ke sini begitu mereka mengirimnya.')}<div class="wish-admin">${W.map((w,k)=>`<div class="w ${w.show?'':'hid'}"><div><b>${esc(w.n)}</b> ${w.att?'<span class="status s-ok">Hadir</span>':''} <span class="muted" style="font-size:13px">${esc(w.t)}</span><p style="margin-top:6px">${esc(w.m)}</p></div><button class="btn btn-ghost btn-sm" data-act="toggle-wish" data-k="${k}">${w.show?'Sembunyikan':'Tampilkan'}</button></div>`).join('')}</div>`;
  }
  if(dTab==='hadiah'){
    const sum = GIFTS.reduce((a,g)=>a+g.amt,0);
    body = `<div class="tiles t2">${dTile('Tamu menitipkan nama',GIFTS.length,'kirim hadiah lewat undangan','users','amber',1)}${dTile('Total dilaporkan tamu',rupiah(sum),'cek lagi di mutasi rekening','wallet','green')}</div>
    <p class="muted" style="margin:16px 0">Uang langsung masuk ke rekening ${esc(S.gift.bank)} ${esc(S.gift.holder)}. Tamu tidak diminta konfirmasi. Daftar ini hanya berisi tamu yang menitipkan nama secara sukarela, jadi tetap cek mutasi rekening kalian.</p>
    ${GIFTS.length?'':`<section class="panel-c">${dEmpty('gift','Belum ada titipan nama.','Saat tamu mengirim hadiah dan menitipkan namanya, catatannya muncul di sini.')}</section>`}<div class="tbl-wrap" style="display:block${GIFTS.length?'':';display:none'}"><table><thead><tr><th>Dari</th><th>Ke</th><th class="num">Jumlah</th><th>Waktu</th></tr></thead><tbody>${GIFTS.map(g=>`<tr><td class="nm">${esc(g.n)}</td><td>${esc(g.bank)}</td><td class="num">${g.amt?rupiah(g.amt):'—'}</td><td class="muted">${esc(g.t)}</td></tr>`).join('')}</tbody></table></div>` + kadoAdminHTML();
  }
  // Tata letak seperti panel admin: menu samping + isi
  const cnt = k => k==='tamu'?`<span class="cnt num">${total}</span>`:k==='ucapan'?`<span class="cnt num">${W.length}</span>`:k==='harih'&&arrived.length?`<span class="cnt num">${arrived.length}</span>`:k==='keluarga'&&(G_ALL||G).some(isPending)?`<span class="cnt num warn">${(G_ALL||G).filter(isPending).length}</span>`:'';
  const real = (DEMO.on && DEMO.saved) ? DEMO.saved.S : S, u = real.user;
  const side = `<aside class="adm-side dsh-side"><a class="adm-brand" href="#beranda" aria-label="Sakara beranda">${$('#siteHeader .logo')?.innerHTML||'Sakara'}</a><span class="adm-badge">${DEMO.on?'Demo':'Pasangan'}</span>
      <nav aria-label="Menu dashboard">${dtList().map(([k,l,i])=>`<button type="button" data-dtab="${k}" aria-current="${dTab===k}">${ico(i)}<span>${l}</span>${cnt(k)}</button>`).join('')}</nav>
      <a class="adm-home" href="#beranda">${ico('home')}<span>Ke beranda Sakara</span></a>
      <div class="adm-me">${DEMO.on?`<b>Mode demo</b><button type="button" class="btn btn-ghost btn-sm" data-act="demo-exit">Keluar demo</button>`:u?`<b title="${esc(u.email||'')}">${esc((u.name||'').split(' ')[0]||'Akun')}</b><button type="button" class="btn btn-ghost btn-sm" data-act="logout">Keluar</button>`:''}</div></aside>`;
  $('#dash').innerHTML = `<div class="adm dsh">${side}<main class="adm-main dsh-main">${head.replace(/<div class="dtabs"[\s\S]*$/,'')}${body}</main></div>`;
  requestAnimationFrame(()=>{ const b=$('.dsh-side nav [aria-current=true]'); if(b && b.scrollIntoView && innerWidth<=820) b.scrollIntoView({block:'nearest',inline:'nearest'}); });
  const dn=$('#dashNav'), dsl=dn.scrollLeft; dn.innerHTML = dtList().map(([k,l,i])=>`<button role="tab" data-dtab="${k}" aria-selected="${dTab===k}">${ico(i)}${l}</button>`).join(''); dn.scrollLeft=dsl;
  if(!dn._sc){ dn._sc=1; dn.addEventListener('scroll',()=>dn.classList.toggle('end', dn.scrollLeft+dn.clientWidth>=dn.scrollWidth-4),{passive:true}); }
  const dsel=dn.querySelector('[aria-selected=true]'); if(dsel && dn.scrollWidth>dn.clientWidth){ const r=dsel.offsetLeft, w=dsel.offsetWidth; if(r<dn.scrollLeft || r+w>dn.scrollLeft+dn.clientWidth) dn.scrollLeft=r-dn.clientWidth/2+w/2; }
}
document.addEventListener('input', e=>{ if(e.target.id==='gSearch'){ gQ=e.target.value; const pos=e.target.selectionStart; renderDash(); const s=$('#gSearch'); s.focus(); s.setSelectionRange(pos,pos); } });
document.addEventListener('change', e=>{
  if(e.target.id==='gGroup'){ gGroup=e.target.value; renderDash(); }
  if(e.target.id==='bulkGroup' && e.target.value){ const to=e.target.value; G.forEach(g=>{ if(sel.has(g.id)) g.group=to; }); saveG(); toast(`${sel.size} tamu dipindah ke ${to}`); sel.clear(); renderDash(); }
  if(e.target.dataset.sel){ e.target.checked?sel.add(e.target.dataset.sel):sel.delete(e.target.dataset.sel); renderDash(); }
  if(e.target.dataset.act==='sel-all'){ filteredGuests().forEach(g=> e.target.checked?sel.add(g.id):sel.delete(g.id)); renderDash(); }
  if(e.target.id==='importFile' && e.target.files[0]){ handleImport(e.target.files[0]); e.target.value=''; }
});

/* ---------- Import Excel / CSV ---------- */
function parseCSV(text){
  const rows=[]; let row=[], cell='', q=false; const d = (text.split('\n')[0].split(';').length > text.split('\n')[0].split(',').length) ? ';' : ',';
  for(let i=0;i<text.length;i++){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=c; }
    else if(c==='"') q=true; else if(c===d){ row.push(cell); cell=''; } else if(c==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; } else if(c!=='\r') cell+=c; }
  if(cell||row.length){ row.push(cell); rows.push(row); }
  return rows;
}
function parseSessions(txt){
  const all = S.events.map((e,i)=>i); const s=String(txt||'').toLowerCase().trim();
  if(!s || /semua|all|keduanya/.test(s)) return {ses:all, ok:true};
  const hit = S.events.map((e,i)=>({t:(e.type||'').toLowerCase(),i})).filter(x=>x.t && (s.includes(x.t) || s.includes(x.t.split(' ')[0]))).map(x=>x.i);
  return hit.length ? {ses:hit, ok:true} : {ses:all, ok:false};
}
let IMP = [];
async function handleImport(file){
  let rows = [];
  try{
    if(/\.xlsx?$/i.test(file.name)){
      if(typeof XLSX==='undefined'){ try{ toast('Menyiapkan pembaca Excel…'); await loadLib('xlsx'); }catch(e){ toast('Pembaca Excel gagal dimuat. Simpan file sebagai CSV, lalu coba lagi.'); return; } }
      const wb = XLSX.read(await file.arrayBuffer(), {type:'array'});
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1, defval:'', raw:false});
    } else rows = parseCSV(await file.text());
  }catch(err){ toast('File tidak bisa dibaca. Pastikan formatnya .xlsx atau .csv.'); return; }
  rows = rows.map(r=>r.map(c=>String(c??'').trim())).filter(r=>r.some(Boolean));
  let hi = rows.findIndex(r=>r.some(c=>/^(nama|name)/i.test(c)));
  let col = {n:0,p:1,g:2,s:3};
  if(hi>-1){ const h=rows[hi].map(c=>c.toLowerCase()); const f=re=>h.findIndex(c=>re.test(c)); col={n:f(/^(nama|name)/), p:f(/hp|nomor|whats|wa\b|telp|phone|no\.?/), g:f(/grup|group|kelompok|kategori/), s:f(/sesi|acara|session/)}; rows=rows.slice(hi+1); }
  const seenP=new Set(), seenN=new Set(); let skipped=0;
  IMP = [];
  rows.forEach(r=>{
    const name=(r[col.n]||'').trim(); if(!name){ skipped++; return; }
    const phone=col.p>-1?(r[col.p]||'').replace(/[^\d+]/g,'').replace(/^\+?62/,'0'):'';
    const group=(col.g>-1&&r[col.g])||'Tanpa grup';
    const ps=parseSessions(col.s>-1?r[col.s]:'');
    const issues=[]; let ok=true;
    if(phone && (phone.length<9||phone.length>14)) issues.push(['warn','Nomor HP terlihat tidak lengkap']);
    if(!ps.ok) issues.push(['warn','Sesi tidak dikenali, diundang ke semua acara']);
    const dupList = G.some(g=>(phone && g.phone.replace(/\D/g,'')===phone.replace(/\D/g,'')) || g.name.toLowerCase()===name.toLowerCase());
    const dupFile = (phone && seenP.has(phone)) || seenN.has(name.toLowerCase());
    if(dupList){ issues.push(['no','Sudah ada di daftar tamu']); ok=false; } else if(dupFile){ issues.push(['no','Muncul dua kali di file']); ok=false; }
    if(phone) seenP.add(phone); seenN.add(name.toLowerCase());
    IMP.push({name,phone,group,sessions:ps.ses,issues,on:ok});
  });
  if(!IMP.length){ openModal(`<h2 class="display" style="font-size:28px">Tidak ada tamu yang terbaca</h2><p class="muted" style="margin:10px 0 18px">Pastikan ada kolom <b>Nama</b> di baris pertama. ${skipped?`${skipped} baris tanpa nama dilewati.`:''}</p><button class="btn btn-primary" data-act="import-help">Lihat format file</button>`); return; }
  renderImportReview(skipped, file.name);
}
function renderImportReview(skipped, fname){
  const on = IMP.filter(x=>x.on).length, dup = IMP.filter(x=>x.issues.some(i=>i[0]==='no')).length;
  const knownGroups = new Set([...(S.groups||[]),...G.map(g=>g.group)]);
  const newGroups = [...new Set(IMP.filter(x=>x.on).map(x=>x.group))].filter(g=>!knownGroups.has(g));
  openModal(`<span class="eyebrow">${esc(fname||'Import')}</span><h2 class="display" style="font-size:30px;margin:6px 0 10px">Tinjau sebelum ditambahkan</h2>
    <div class="chips" style="margin-bottom:14px"><span class="status s-ok">${on} siap ditambahkan</span>${dup?`<span class="status s-no">${dup} duplikat dilewati</span>`:''}${skipped?`<span class="status s-mute">${skipped} baris tanpa nama</span>`:''}${newGroups.length?`<span class="status s-wait">Grup baru: ${esc(newGroups.join(', '))}</span>`:''}</div>
    <div class="tbl-wrap" style="display:block;max-height:340px"><table><thead><tr><th style="width:36px"></th><th>Nama</th><th>Nomor HP</th><th>Grup</th><th>Sesi</th><th>Catatan</th></tr></thead><tbody>
    ${IMP.map((x,k)=>`<tr><td><input type="checkbox" data-imp="${k}" ${x.on?'checked':''} aria-label="Sertakan ${esc(x.name)}"></td><td class="nm">${esc(x.name)}</td><td class="num">${esc(x.phone||'—')}</td><td>${esc(x.group)}</td><td style="font-size:13px">${esc(sessionNames(x))}</td><td>${x.issues.map(i=>`<span class="status ${i[0]==='no'?'s-no':'s-wait'}" style="margin:2px 0">${esc(i[1])}</span>`).join(' ')||'<span class="muted">—</span>'}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="form-foot"><button class="btn btn-ghost" data-act="close">Batal</button><button class="btn btn-primary" data-act="do-import" id="impGo">Tambahkan ${on} tamu</button></div>`, true);
}
document.addEventListener('change', e=>{ if(e.target.dataset.imp!=null){ IMP[+e.target.dataset.imp].on=e.target.checked; const b=$('#impGo'); if(b) b.textContent=`Tambahkan ${IMP.filter(x=>x.on).length} tamu`; } });
const TEMPLATE_CSV = 'Nama,Nomor HP,Grup,Sesi\nBapak Hendra & Keluarga,081234567890,Keluarga Raka,Semua\nSinta Rahayu,085711223344,Teman kampus,Resepsi\nPak RT Sukirman,081377788899,Tetangga,Akad Nikah';
function importHelp(){
  openModal(`<h2 class="display" style="font-size:30px">Format file tamu</h2><p class="muted" style="margin:8px 0 16px">Excel (.xlsx) atau CSV. Baris pertama berisi judul kolom. Hanya kolom Nama yang wajib, urutan kolom bebas.</p>
    <div class="tbl-wrap" style="display:block"><table><thead><tr><th>Nama</th><th>Nomor HP</th><th>Grup</th><th>Sesi</th></tr></thead><tbody>${TEMPLATE_CSV.split('\n').slice(1).map(r=>`<tr>${r.split(',').map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <ul class="muted" style="font-size:14px;margin:14px 0 0;padding-left:18px;display:grid;gap:6px"><li><b>Sesi</b>: tulis nama acara (${esc(S.events.map(e=>e.type).join(', '))}) atau "Semua". Kosong berarti semua acara.</li><li>Grup yang belum ada akan dibuat otomatis.</li><li>Nama atau nomor yang sudah ada di daftar tidak akan dobel.</li></ul>
    <div class="form-foot"><button class="btn btn-ghost" data-act="copy" data-v="${esc(TEMPLATE_CSV)}">${ico('copy')}Salin contoh CSV</button><button class="btn btn-primary" data-act="close">Mengerti</button></div>`);
}

/* ---------- Groups ---------- */
function groupsModal(){
  const groups=[...new Set([...(S.groups||[]),...G.map(g=>g.group)])];
  openModal(`<h2 class="display" style="font-size:30px">Kelola grup tamu</h2><p class="muted" style="margin:6px 0 16px">Grup membantu kirim undangan dan membaca rekap per keluarga atau kantor.</p>
    <div class="grp-list">${groups.map((g,k)=>{ const n=G.filter(x=>x.group===g).length; return `<div class="grp-item"><input class="input" value="${esc(g)}" data-grp-old="${esc(g)}" aria-label="Nama grup ${esc(g)}"><span class="muted num" style="min-width:70px;text-align:right">${n} tamu</span><button class="btn btn-ghost btn-sm" data-act="grp-del" data-g="${esc(g)}" aria-label="Hapus grup ${esc(g)}">${ico('x')}</button></div>`; }).join('')}</div>
    <form id="grpAdd" style="display:flex;gap:10px;margin-top:14px"><input class="input" id="grpNew" placeholder="Nama grup baru, misal Teman SMA" aria-label="Nama grup baru"><button class="btn btn-soft">${ico('plus')}Tambah</button></form>
    <div class="form-foot"><span class="muted" style="font-size:13px">Menghapus grup memindahkan tamunya ke "Tanpa grup".</span><button class="btn btn-primary" data-act="close">Selesai</button></div>`);
  $('#grpAdd').addEventListener('submit',ev=>{ ev.preventDefault(); const v=$('#grpNew').value.trim(); if(!v) return; S.groups=[...new Set([...(S.groups||[]),v])]; save(); groupsModal(); renderDash(); });
  $$('[data-grp-old]').forEach(inp=>inp.addEventListener('change',()=>{ const o=inp.dataset.grpOld, v=inp.value.trim(); if(!v||v===o) return; G.forEach(g=>{ if(g.group===o) g.group=v; }); S.groups=(S.groups||[]).map(x=>x===o?v:x); if(gGroup===o) gGroup=v; saveG(); save(); groupsModal(); renderDash(); toast('Grup diganti nama'); }));
}

/* ---------- Guest detail (sessions, QR) ---------- */
function guestModal(id){
  const g=G.find(x=>x.id===id); if(!g) return;
  openModal(`<div class="gm"><div><span class="eyebrow">${esc(g.group)}</span><h2 class="display" style="font-size:30px;margin:6px 0">${esc(g.name)}</h2><p class="muted num">${esc(g.phone||'Tanpa nomor')} · <span class="status ${stLabel[g.status][1]}">${stLabel[g.status][0]}</span></p>
    <fieldset class="fieldset" style="margin-top:18px"><legend>Diundang ke</legend>${S.events.map((e,i)=>`<label class="ck"><input type="checkbox" data-ses="${i}" ${guestEvents(g).some(x=>x.i===i)?'checked':''}> ${esc(e.type||'Acara '+(i+1))} <span class="muted">${esc(e.start||'')}</span></label>`).join('')}<span class="hint">Tamu hanya melihat acara yang dicentang.</span></fieldset>
    <div class="field"><label for="gm-seat">Kuota orang</label><input class="input" id="gm-seat" type="number" min="1" max="12" inputmode="numeric" value="${esc(S.seats&&S.seats[g.id]!=null?S.seats[g.id]:'')}" placeholder="${S.seatsDefault?`Ikuti bawaan (${S.seatsDefault} orang)`:'Bebas (maksimal 6)'}"><span class="hint">Jumlah orang yang boleh dibawa lewat undangan ini.</span></div>
    <div class="field"><label for="gm-grp">Grup</label><select class="input" id="gm-grp">${[...new Set([...(S.groups||[]),...G.map(x=>x.group)])].map(x=>`<option ${x===g.group?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px"><button class="btn btn-ghost btn-sm" data-act="view-as" data-id="${g.id}">${ico('eye')}Lihat undangannya</button><button class="btn btn-ghost btn-sm" data-act="copy" data-v="${esc(link(g))}">${ico('copy')}Salin link</button></div></div>
    <div class="gm-qr">${qrSVG(g.code,180)}<b class="num">${esc(g.code)}</b><small class="muted">Kartu masuk hari H. Muncul di undangan setelah tamu konfirmasi hadir.</small></div></div>
    <div class="form-foot"><button class="btn btn-ghost" data-act="del-guest" data-id="${g.id}" style="color:var(--no)">Hapus tamu</button><button class="btn btn-primary" data-act="close">Selesai</button></div>`, true);
  $$('[data-ses]').forEach(c=>c.addEventListener('change',()=>{ const s=$$('[data-ses]').filter(x=>x.checked).map(x=>+x.dataset.ses); if(!s.length){ c.checked=true; toast('Tamu harus diundang ke minimal satu acara'); return; } g.sessions=s; saveG(); renderDash(); }));
  $('#gm-grp').addEventListener('change',e=>{ g.group=e.target.value; saveG(); renderDash(); });
  $('#gm-seat').addEventListener('change',e=>{ const v=Math.round(+e.target.value); const m={...(S.seats||{})}; if(v>=1) m[g.id]=Math.min(v,12); else delete m[g.id]; S.seats=m; e.target.value=m[g.id]||''; save(); toast(v>=1?`Kuota ${g.name}: ${m[g.id]} orang`:'Kuota mengikuti bawaan'); });
}

/* ---------- Modals ---------- */
function openModal(html, wide){
  const ae=document.activeElement; if(!$('#modalRoot').contains(ae)) openModal.from = ae && ae!==document.body ? ae : null;
  const isAuth = html.startsWith('<div class="auth">');
  $('#modalRoot').innerHTML = `<div class="modal${isAuth?' modal-auth':''}" role="dialog" aria-modal="true"><div class="panel${isAuth?' auth-panel':''}" style="${wide||isAuth?'':'max-width:560px'}"><button class="close" data-act="close" aria-label="Tutup">${ico('x')}</button>${isAuth?'<div class="auth-art" aria-hidden="true"><img src="/assets/home/auth-amplop.webp" srcset="/assets/home/auth-amplop-s.webp 480w, /assets/home/auth-amplop.webp 960w" sizes="(max-width:760px) 100vw, 400px" alt=""></div>':''}${html}</div></div>`;
  setTimeout(()=> $('#modalRoot .close')?.focus({preventScroll:true}), 30);
}
function closeModal(){ const was=!!$('#modalRoot').firstElementChild; $('#modalRoot').innerHTML=''; const f=openModal.from; openModal.from=null; if(was && f && f.isConnected && typeof f.focus==='function') f.focus({preventScroll:true}); }
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ if($('#modalRoot').firstElementChild) closeModal(); else if(document.body.classList.contains('ed-sheet-open')) edSheet(false); return; }
  /* fokus tetap di dalam modal selama terbuka */
  if(e.key==='Tab'){ const m=$('#modalRoot .modal'); if(!m) return;
    const f=[...m.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null);
    if(!f.length) return; const first=f[0], last=f[f.length-1];
    if(!m.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
    else if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); } }
});
function demoModal(id){
  const t=themeById(id); const prevTheme=S.theme;
  openModal(`<div class="demo-grid"><div class="phone"><div class="screen" id="demoScreen">${invHTML({theme:id, idp:'d', guest:'Tamu undangan'})}</div></div>
    <div><span class="eyebrow">${t.cx?'Koleksi Custom':esc(t.region)+' · '+t.tags.join(', ')}</span><h2 class="display" style="font-size:40px;margin:10px 0 12px">${esc(t.name)}</h2>
    <p class="muted">${t.cx?'Demo ini memakai contoh foto dan cerita. Setelah dipakai, semuanya diganti dengan foto dan cerita kalian sendiri. Ketuk sampul untuk membuka undangan.':'Demo ini sudah memakai nama dan acara kalian. Gulir di dalam layar untuk melihat semua bagian, termasuk RSVP dan amplop digital.'}</p>
    <ul class="ticks" style="margin:20px 0 26px">${(t.cx?['Khusus paket Custom','Urutan bagian dan foto bebas diatur',t.lang==='en'?'Teks undangan berbahasa Inggris':'Teks undangan berbahasa Indonesia']:['Termasuk di semua paket','Warna aksen bisa diganti']).map(x=>`<li style="grid-template-columns:24px 1fr"><span style="color:var(--ok)">${ico('check')}</span><span style="color:var(--ink)">${x}</span></li>`).join('')}</ul>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" data-act="use-theme" data-t="${id}">Pakai tema ini</button><button class="btn btn-ghost" data-act="close">Tutup</button></div></div></div>`, true);
  bindInv($('#demoScreen')); enhanceInv($('#demoScreen'));
}

/* ---------- Global click actions ---------- */
document.addEventListener('click', e=>{
  const el = e.target.closest('[data-act],[data-go],[data-dtab],[data-gst],[data-sent],[data-step]');
  if(!el) return;
  if(el.dataset.step && el.closest('#stepForm')){ goStep(+el.dataset.step); return; }
  if(el.dataset.go){ const tgt=$('#'+el.dataset.go); if(tgt){ openGuest(); tgt.scrollIntoView({behavior:'smooth',block:'start'}); $$('.g-nav button').forEach(b=>b.classList.toggle('active',b===el)); } return; }
  if(el.dataset.dtab){ dTab=el.dataset.dtab; sel.clear(); renderDash(); window.scrollTo({top:0}); return; }
  if(el.dataset.gst){ gStatus=el.dataset.gst; renderDash(); return; }
  if(el.dataset.act==='g-more'){ gLimit+=GPAGE; renderDash(); return; }
  if(el.dataset.sent){ const g=G.find(x=>x.id===el.dataset.sent); if(g&&!g.sent){ g.sent=true; saveG(); setTimeout(renderDash,300); } return; }
  const a = el.dataset.act;
  if(a==='close') closeModal();
  if(a==='rm-photo'){ delete S[el.dataset.who].photo; save(); renderStep(); refreshPreview(); }
  if(a==='rm-gal'){ const k=+el.dataset.k, [ph]=S.gallery.splice(k,1); save(); renderStep(); refreshPreview(); toast('Foto dihapus dari galeri', ()=>{ S.gallery.splice(Math.min(k,S.gallery.length),0,ph); save(); renderStep(); refreshPreview(); }); }
  if(a==='souvenir'){ souvenirCard(el); return; }
  if(a==='tip-go'){ EDIT.panel=el.dataset.panel||'mempelai'; location.hash='#edit'; return; }
  if(a==='tip-thx'){ dTab='kenangan'; knTab='thx'; renderDash(); window.scrollTo({top:0}); return; }
  if(a==='tip-off'){ S.tipsOff=[...new Set([...(S.tipsOff||[]), el.dataset.k])]; save(); renderDash(); toast('Oke, saran ini kami sembunyikan'); return; }
  if(a==='zoom'){ const src=S.gallery[+el.dataset.k]; const lb=document.createElement('div'); lb.className='lightbox'; lb.setAttribute('role','dialog'); lb.setAttribute('aria-label','Foto galeri'); lb.innerHTML=`<button class="close" aria-label="Tutup">${ico('x')}</button><img src="${src}" alt="Foto galeri ${+el.dataset.k+1}">`; lb.addEventListener('click',()=>lb.remove()); document.body.appendChild(lb); lb.querySelector('.close').focus(); }
  if(a==='copy') copyText(el.dataset.v);
  if(a==='demo') demoModal(el.dataset.t);
  if(a==='use-theme' && isCx(el.dataset.t)!==isCx(S.theme) && !el.dataset.cxok){ const tid=el.dataset.t; cxSwitch(tid, ()=>{ const b=document.createElement('button'); b.dataset.act='use-theme'; b.dataset.t=tid; b.dataset.sure='1'; b.dataset.cxok='1'; b.hidden=true; document.body.appendChild(b); b.click(); b.remove(); }); return; }
  if(a==='cx-switch-go'){ closeModal(); const f=CX_SWITCH_DONE; CX_SWITCH_DONE=null; if(f) f(); return; }
  if(a==='cx-try-back'){ const lt=S.liveTheme; if(lt){ S.theme=lt; delete S.liveTheme; EDIT.panel='tema'; save(); renderStep(); edRail(); refreshPreview(); toast('Kembali ke tema '+themeById(lt).name); } return; }
  if(a==='use-theme' && S.published && !el.dataset.sure && el.dataset.t!==S.theme){ const nt=themeById(el.dataset.t); openModal(`<h2 class="display" style="font-size:28px">Ganti ke tema ${esc(nt.name)}?</h2><p class="muted" style="margin:8px 0 20px">Undangan kalian sudah tayang, jadi tamu akan langsung melihat tema baru. Isi undangan, tamu, dan ucapan tidak berubah. Kalian bisa kembali ke tema lama kapan saja dari editor.</p><div class="form-foot"><button class="btn btn-ghost" data-act="close">Batal</button><button class="btn btn-primary" data-act="use-theme" data-t="${esc(nt.id)}" data-sure="1">Ganti tema</button></div>`); return; }
  if(a==='co-upgrade-custom'){ closeModal(); CO.stage='form'; CO.plan='custom'; location.hash='checkout'; return; }
  if(a==='use-theme'){ cxApplyTheme(el.dataset.t); S.step=2; save(); closeModal(); if(S.published){ EDIT.panel=isCx(S.theme)?'cx:tampilan':'tema'; } location.hash = S.published ? 'edit' : 'buat'; toast('Tema '+themeById(S.theme).name+' dipakai'); }
  if(a==='clear-filter'){ catTag='Semua'; catQ=''; $('#themeSearch').value=''; renderCatalog(); }
  if(a==='prev') goStep(S.step-1);
  if(a==='add-event'){ S.events.push({type:'Ngunduh Mantu',date:'',start:'',end:'',venue:'',address:''}); save(); renderStep(); refreshPreview(); }
  if(a==='del-event'){ const k=+el.dataset.k, used=G.filter(g=>(g.sessions||[]).includes(k)).length;
    if(!armed(el, used?`Hapus? ${used} tamu diundang ke acara ini. Ketuk lagi`:'Yakin hapus acara ini? Ketuk lagi')) return;
    /* undangan tamu disimpan sebagai nomor urut acara: geser supaya tetap menunjuk acara yang sama */
    S.events.splice(k,1);
    G.forEach(g=>{ if(!Array.isArray(g.sessions)) return; const s=g.sessions.filter(i=>i!==k).map(i=>i>k?i-1:i); g.sessions = s.length ? s : S.events.map((e,i)=>i); });
    save(); saveG(); renderStep(); refreshPreview(); toast('Acara dihapus'); }
  if(a==='publish' && sampleLeft().length){ toast(sampleLeft().map(x=>x[0]).join(', ')+' masih contoh. Ganti dulu sebelum dipublikasikan, ya.'); return; }
  if(a==='publish'){ CO.stage='form'; CO.plan=S.plan; if(!S.user) openAuth(()=>{ location.hash='checkout'; },'publish'); else location.hash='checkout'; }
  if(a==='open-inv') openGuest();
  if(a==='g-big'){ guestBig=!guestBig; const y=window.scrollY; renderGuest(); openGuest(); window.scrollTo(0,y); }
  if(a==='g-music'){ guestMusic=!guestMusic; if(guestMusic){ if(!$('#guestCol')?.classList.contains('locked')) startBgm(); } else stopBgm(); el.innerHTML=ico(guestMusic&&S.music?'music':'mute'); el.setAttribute('aria-pressed',guestMusic); toast(guestMusic?'Musik dinyalakan':'Musik dimatikan'); }
  if(a==='rsvp-again'){ const box=el.closest('[data-rsvp]'); const g=G.find(x=>x.id===(el.dataset.gid||box.dataset.gid)); box.innerHTML = rsvpForm(g?g.name:guestLabel(), g); bindInv(box); }
  if(a==='gift-confirm'){
    el.parentElement.innerHTML = `<form class="form gift-form" data-giftform><p class="gift-fh">Pesan Anda akan sampai ke pengantin bersama tanda kasih Anda.</p><label for="gfn">Nama</label><input class="in" id="gfn" value="${esc(el.dataset.name||'')}" required placeholder="Nama Anda"><label for="gfm">Doa atau ucapan (opsional)</label><textarea class="in" id="gfm" rows="2" maxlength="300" placeholder="Selamat menempuh hidup baru"></textarea><div class="kd-acts"><button type="button" class="ibtn" data-act="gift-cancel">Batal</button><button class="ibtn solid">Titipkan</button></div></form>`;
    const f=$('[data-giftform]'); f.querySelector('#gfn').focus({preventScroll:true});
    f.addEventListener('submit',ev=>{ ev.preventDefault(); const n=f.querySelector('#gfn').value.trim(); if(!n){ f.querySelector('#gfn').focus(); return; } const m=f.querySelector('#gfm').value.trim();
      if(CLOUD.guestMode){ CLOUD.sb.rpc('add_gift',{p_slug:CLOUD.slug, p_name:n, p_amount:0}).then(({error})=>{ if(error) toast('Gagal mengirim: '+error.message); }); if(m) CLOUD.sb.rpc('add_wish',{p_slug:CLOUD.slug, p_name:n, p_message:m, p_code:CLOUD.code||null}).then(()=>{}); }
      else { GIFTS.unshift({n,bank:S.gift.bank,amt:0,t:'Baru saja'}); if(m){ W.unshift({n, m, t:'baru saja', att:false, show:true}); saveW(); } }
      f.outerHTML=`<div class="ok-box"><b style="font-family:var(--t-font);font-size:22px">Terima kasih, ${esc(n)}</b><p style="margin-top:6px;font-size:14px">Nama${m?' dan doa':''} Anda sudah kami sampaikan ke pengantin.</p></div>`; });
  }
  if(a==='gift-cancel'){ const box=el.closest('[data-giftconfirm]'); const nm=box.querySelector('#gfn')?.value||''; box.innerHTML=`<button class="gift-opt" data-act="gift-confirm" data-name="${esc(nm)}">Ingin menitipkan nama dan doa? <span>(opsional)</span></button>`; }

  if(a==='add-guest'){
    const groups=[...new Set([...(S.groups||[]),...G.map(g=>g.group)])];
    openModal(`<h2 class="display" style="font-size:30px">Tambah tamu</h2><p class="muted" style="margin:6px 0 18px">Nama ini yang akan menyapa tamu di sampul undangan.</p>
      <form id="addG" class="fgrid" novalidate><div class="field full"><label for="ag-n">Nama di undangan</label><input class="input" id="ag-n" required placeholder="Bapak Hendra & Keluarga"><span class="err" hidden>Isi nama tamu</span></div>
      <div class="field"><label for="ag-p">Nomor WhatsApp</label><input class="input" id="ag-p" inputmode="tel" placeholder="0812…"></div>
      <div class="field"><label for="ag-g">Grup</label><select class="input" id="ag-g">${groups.map(g=>`<option>${esc(g)}</option>`).join('')}</select></div>
      <fieldset class="fieldset full" style="grid-column:1/-1;margin:0"><legend>Diundang ke</legend>${S.events.map((e,i)=>`<label class="ck"><input type="checkbox" name="ag-s" value="${i}" checked> ${esc(e.type||'Acara '+(i+1))}</label>`).join('')}</fieldset>
      <div class="form-foot full" style="grid-column:1/-1"><button type="button" class="btn btn-ghost" data-act="close">Batal</button><button class="btn btn-primary">Simpan tamu</button></div></form>`);
    $('#addG').addEventListener('submit',ev=>{ ev.preventDefault(); const n=$('#ag-n').value.trim(); if(!n){ $('#ag-n').setAttribute('aria-invalid','true'); $('#addG .err').hidden=false; $('#ag-n').focus(); return; } const ses=$$('[name=ag-s]:checked').map(x=>+x.value); const g={id:'g'+Date.now(),name:n,phone:$('#ag-p').value.trim(),group:$('#ag-g').value,status:'belum',pax:0,sent:false,sessions:ses.length?ses:S.events.map((e,i)=>i)}; g.code=makeCode(g); G.unshift(g); saveG(); closeModal(); dTab='tamu'; renderDash(); toast(n+' ditambahkan'); });
  }
  if(a==='do-import'){ const add=IMP.filter(x=>x.on); add.forEach((x,k)=>{ const g={id:'i'+Date.now()+k,name:x.name,phone:x.phone,group:x.group,sessions:x.sessions,status:'belum',pax:0,sent:false}; g.code=makeCode(g); G.unshift(g); }); S.groups=[...new Set([...(S.groups||[]),...add.map(x=>x.group)])]; save(); saveG(); closeModal(); dTab='tamu'; renderDash(); toast(add.length+' tamu ditambahkan'); }
  if(a==='bulk-send' || a==='remind'){
    const targets = a==='remind' ? G.filter(g=>g.status==='belum') : G.filter(g=>sel.has(g.id));
    const ex = targets[0];
    openModal(`<span class="eyebrow">${a==='remind'?'Pengingat':'Kirim undangan'}</span><h2 class="display" style="font-size:30px;margin:8px 0">Kirim ke ${targets.length} tamu</h2><p class="muted">Setiap tamu menerima link dengan namanya sendiri. Contoh pesan untuk ${esc(ex?.name||'tamu')}:</p>
      <div class="wa-bubble" style="margin:16px 0 8px">${esc(ex?waMsg(ex, a==='remind'?'remind':'invite'):'')}</div><p style="margin:0 0 14px"><button class="linkbtn" data-act="wa-tpl" data-kind="${a==='remind'?'remind':'invite'}">Ubah isi pesan</button></p>
      <div class="form-foot"><button class="btn btn-ghost" data-act="close">Batal</button><button class="btn btn-primary" data-act="bulk-go" data-n="${targets.length}" data-mode="${a}">${ico('wa')}Mulai kirim</button></div>
      <p class="muted" style="font-size:12.5px">WhatsApp terbuka untuk tiap tamu secara berurutan dengan pesan yang sudah terisi. Kalian tinggal ketuk Kirim di WhatsApp, lalu kembali ke sini untuk tamu berikutnya.</p>`);
  }
  if(a==='bulk-go'){ const ids = el.dataset.mode==='remind' ? G.filter(g=>g.status==='belum').map(g=>g.id) : [...sel]; WQ={ids, i:0, mode:el.dataset.mode==='remind'?'remind':'invite', done:0}; sel.clear(); wqRender(); }
  if(a==='wq-open'){ const g=G.find(x=>x.id===WQ.ids[WQ.i]); if(g){ g.sent=true; WQ.done++; saveG(); } WQ.i++; setTimeout(wqRender, 400); return; }
  if(a==='wq-skip'){ WQ.i++; wqRender(); return; }
  if(a==='wq-stop'){ const n=WQ.done; WQ=null; closeModal(); renderDash(); if(n) toast(`${n} pesan dibuka di WhatsApp`); return; }
  if(a==='bulk-clear'){ sel.clear(); renderDash(); }
  if(a==='toggle-wish'){ const w=W[+el.dataset.k]; w.show=!w.show; saveW(); if(CLOUD.uid && w.id) CLOUD.sb.from('wishes').update({hidden:!w.show}).eq('id',w.id).then(({error})=>{ if(error) toast('Gagal menyimpan: '+error.message); }); renderDash(); }
});

/* Preview sheet on mobile builder */
$('#previewFab').addEventListener('click',()=>{
  openModal(`<div style="display:flex;justify-content:center"><div class="phone"><div class="screen" id="sheetScreen">${invHTML({idp:'m',watermark:!S.published,guest:'Bapak Budi & Keluarga'})}</div></div></div>`);
  bindInv($('#sheetScreen'));
});

/* Mobile menu */
$('#menuBtn').addEventListener('click',()=>{ const m=$('#mobileMenu'); const open=m.hidden; m.hidden=!open; $('#menuBtn').setAttribute('aria-expanded',open); });
$('#mobileMenu').addEventListener('click',e=>{ if(e.target.closest('a')){ $('#mobileMenu').hidden=true; $('#menuBtn').setAttribute('aria-expanded','false'); } });

/* ---------- Account ---------- */
let UPGRADE_PRICE = 220000;
/* kode voucher dicek di server (/api/pay/voucher); daftar lokal hanya untuk prototipe di localhost */
const VOUCHERS = {}; const PROTO_VOUCHERS = {SAKARA10:{type:'pct',v:10,label:'Diskon 10%'}};
function renderAuthSlot(){
  if($('#plans') && $('#plans').children.length) renderPlans();
  const real = (DEMO.on && DEMO.saved) ? DEMO.saved.S : S;
  const u=real.user;
  const html = u ? `<div class="acct"><button class="av-btn" data-act="acct-menu" aria-expanded="false" aria-label="Akun ${esc(u.name)}">${esc(initials(u.name)||'U')}</button><div class="acct-menu" id="acctMenu" hidden><div class="acct-id"><b>${esc(u.name)}</b><small class="muted">${esc(u.email)}</small></div><a href="#dashboard">${ico('home')}Dashboard</a><a href="${real.published?'#edit':'#buat'}">${ico('edit')}${real.published?'Edit undangan':'Undangan saya'}</a><a href="#tagihan">${ico('receipt')}Tagihan</a>${ADM.sso?`<a href="/admin">${ico('lock')}Panel admin</a>`:''}<button data-act="logout">${ico('logout')}Keluar</button></div></div>`
    : `<button class="btn btn-ghost btn-sm" data-act="login">Masuk</button>`;
  const a=$('#authSlot'); if(a) a.innerHTML=html;
  { const stage = !u ? 'visitor' : (real.published ? 'paid' : 'draft');
    ['#ctaTop','#ctaTopM'].forEach(id=>{ const c=$(id); if(c) c.hidden = !!u; });
    const set = (k, show, label, href) => $$(`[data-nav=${k}], [data-mnav=${k}]`).forEach(x=>{ x.hidden=!show; if(label) x.textContent=label; if(href) x.setAttribute('href', href); });
    set('demo', stage==='visitor');
    set('buat', stage!=='visitor', stage==='paid'?'Edit undangan':'Undangan saya', stage==='paid'?'#edit':'#buat');
    set('dashboard', stage!=='visitor', stage==='paid'?'Dashboard':'Daftar tamu', '#dashboard');
  }
  if(window.EDH) EDH.sync({user:u, stage:!u?'visitor':(real.published?'paid':'draft'), admin:!!(u&&ADM.sso)});
  const m=$('#authSlotM'); if(m) m.innerHTML = u ? `<a href="#tagihan">${ico('receipt')} Tagihan · ${esc(u.name)}</a>${ADM.sso?`<a href="/admin">${ico('lock')} Panel admin</a>`:''}<a href="#beranda" data-act="logout">Keluar</a>` : `<a href="#beranda" data-act="login">Masuk atau daftar</a>`;
}
let authNext=null;
const lsGet=k=>{ try{ return localStorage.getItem(k)||''; }catch(e){ return ''; } };
/* kode tamu untuk RSVP: dari link tamu, atau dari RSVP sebelumnya di HP ini dengan nama yang sama */
function rsvpCode(name){ if(CLOUD.code && CLOUD.guest) return CLOUD.guest.code; let m={}; try{ m=JSON.parse(lsGet('sp-rsvp:'+CLOUD.slug)||'{}'); }catch(e){}
  const same = n => String(n||'').trim().toLowerCase() === String(name||'').trim().toLowerCase();
  if(CLOUD.guest && (name==null || same(CLOUD.guest.name))) return CLOUD.guest.code; return m.code && (name==null || same(m.name)) ? m.code : null; }
function rsvpRemember(d){ if(!d||!d.code) return; CLOUD.guest = fromRow(d); if(!CLOUD.code) lsSet('sp-rsvp:'+CLOUD.slug, JSON.stringify({code:d.code, name:d.name})); }
const lsSet=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
function knownNames(){ try{ return JSON.parse(lsGet('sp-names')||'{}'); }catch(e){ return {}; } }
let authMode=null;
function openAuth(next, mode){
  if(next!==undefined) authNext = next || null; authMode = mode || null;
  const last=lsGet('sp-last-email');
  openModal(`<div class="auth"><span class="eyebrow">${mode==='publish'?'Satu langkah lagi':mode==='demo'?'Mulai undangan kalian':'Akun Sakara'}</span><h2 class="display" style="font-size:32px;margin:8px 0 6px">${mode==='publish'?'Simpan undangan <em>ke akun</em>':mode==='demo'?'Masuk, <em>gratis</em>':(last?'Selamat datang <em>kembali</em>':'Masuk atau <em>daftar</em>')}</h2>
    <p class="muted">${mode==='publish'?'Undangan yang sudah kalian buat ikut tersimpan. Tidak perlu mengisi ulang.':mode==='demo'?'Siapkan undangan dan daftar tamu dari sekarang. Bayarnya nanti saja, saat undangan siap dikirim.':'Pakai Google atau email. Tanpa kata sandi, dan akun baru langsung kami buatkan.'}</p>
    ${CLOUD.on && !CLOUD.cfg.googleLogin ? '' : `<div style="margin-top:20px"><button class="btn btn-google btn-block" data-act="google-login"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 5.9 12 5.9z"/></svg>Lanjut dengan Google</button><p class="g-hint">Pakai akun Google kantor atau kampus? Kadang diblokir admin‑nya. Masuk memakai Gmail pribadi atau lewat email di bawah saja.</p></div><div class="or"><span>atau pakai email</span></div>`}
    <form id="authForm" style="margin-top:${CLOUD.on && !CLOUD.cfg.googleLogin ? 20 : 0}px;display:grid;gap:14px" novalidate>
      <div class="field"><label for="au-mail">Email</label><input class="input" id="au-mail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="nama@email.com" value="${esc(last)}" required><span class="err" hidden></span></div>
      <button class="btn btn-primary btn-block">Kirim kode masuk</button>
    </form>

    <p class="muted" style="font-size:12.5px;margin-top:14px">Kalau lewat email, kami kirim kode 6 angka. Dengan melanjutkan, kalian setuju dengan <a href="/syarat" target="_blank" rel="noopener">Syarat</a> &amp; <a href="/privasi" target="_blank" rel="noopener">Kebijakan Privasi</a> Sakara.</p></div>`);
  setTimeout(()=>{ const m=$('#au-mail'); if(m && !(CLOUD.on && CLOUD.cfg.googleLogin) && matchMedia('(hover:hover)').matches){ m.focus(); m.select(); } },60);
  $('#authForm').addEventListener('submit',async ev=>{ ev.preventDefault(); const m=$('#au-mail'); const v=m.value.trim().toLowerCase(); const er=m.parentElement.querySelector('.err');
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ m.setAttribute('aria-invalid','true'); er.textContent='Masukkan email yang valid, misal sarah@gmail.com'; er.hidden=false; m.focus(); return; }
    const b=$('#authForm button'); b.disabled=true; b.textContent='Mengirim kode…';
    const err=await sendCode(v);
    if(err){ b.disabled=false; b.textContent='Kirim kode masuk'; er.textContent=err; er.hidden=false; return; }
    lsSet('sp-last-email', v); otpStep(v); });
}
const PROTO = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const OFFLINE_MSG = 'Server Sakara lagi tidak terhubung. Muat ulang halaman sebentar lagi, ya.';
async function sendCode(email){
  if(!CLOUD.on) return PROTO ? null : 'Server login lagi tidak terhubung, jadi kode belum bisa dikirim. Coba lagi sebentar, ya.';
  const { error } = await CLOUD.sb.auth.signInWithOtp({email, options:{shouldCreateUser:true, emailRedirectTo: location.origin+'/#'+(location.hash.slice(1)||'dashboard')}});
  if(!error) return null;
  const m = error.message||'';
  if(/rate|limit|seconds/i.test(m)) return 'Terlalu sering meminta kode. Tunggu sebentar lalu coba lagi.';
  if(/sending|smtp|not authorized|email address/i.test(m)) return 'Kode belum bisa dikirim ke email ini sekarang. Coba masuk dengan Google dulu, ya.';
  return m;
}
function otpStep(email){
  openModal(`<div class="auth"><span class="eyebrow">Verifikasi email</span><h2 class="display" style="font-size:32px;margin:8px 0 6px">Masukkan <em>kode</em></h2><p class="muted">Kode 6 angka sudah dikirim ke <b style="color:var(--ink)">${esc(email)}</b>. <button class="linkbtn" data-act="login">Ganti</button></p>
    <form id="otpForm" style="margin-top:20px;display:grid;gap:14px" novalidate><label for="otp" class="sr-only">Kode verifikasi</label><input class="input otp" id="otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••"><span class="err" hidden></span>
    <button class="btn btn-primary btn-block">Masuk</button></form>
    <p class="muted" style="font-size:13px;margin-top:14px">${CLOUD.on?'Kodenya belum nongol? Coba cek folder Spam atau Promosi.':'Prototype: ketik 6 angka apa saja.'} <button class="linkbtn" id="otpResend" disabled>Kirim ulang (60)</button></p></div>`);
  setTimeout(()=>$('#otp')?.focus(),60);
  let left=60; const rs=$('#otpResend');
  const tick=setInterval(()=>{ if(!document.body.contains(rs)) return clearInterval(tick); left--; if(left<=0){ clearInterval(tick); rs.disabled=false; rs.textContent='Kirim ulang kode'; } else rs.textContent=`Kirim ulang (${left})`; },1000);
  rs.addEventListener('click',async()=>{ rs.disabled=true; rs.textContent='Mengirim…'; const e=await sendCode(email); if(e){ toast(e); rs.disabled=false; rs.textContent='Kirim ulang kode'; return; } toast('Kode baru sudah dikirim. Silakan cek email kalian.'); otpStep(email); });
  $('#otp').addEventListener('input',e=>{ e.target.value=e.target.value.replace(/\D/g,'').slice(0,6); if(e.target.value.length===6) $('#otpForm').requestSubmit(); });
  $('#otpForm').addEventListener('submit',async ev=>{ ev.preventDefault(); const inp=$('#otp'); const v=inp.value; const er=$('#otpForm .err'); if(v.length<6){ er.textContent='Kode terdiri dari 6 angka'; er.hidden=false; return; }
    const b=$('#otpForm button'); b.disabled=true; b.textContent='Memeriksa…';
    if(CLOUD.on){
      const { data, error } = await CLOUD.sb.auth.verifyOtp({email, token:v, type:'email'});
      if(error){ b.disabled=false; b.textContent='Masuk'; er.textContent='Kode salah atau sudah kedaluwarsa. Coba lagi atau kirim ulang kode.'; er.hidden=false; inp.value=''; inp.focus(); return; }
      clearInterval(tick); demoAfterLogin(data.user.id); await ownerLoad(data.user); return afterLogin(!(data.user.user_metadata&&data.user.user_metadata.name)); }
    clearInterval(tick); const nm=knownNames()[email];
    S.user={name:nm||email.split('@')[0], email}; save(); afterLogin(!nm); });
}
function afterLogin(isNew){
  if(isNew) return nameStep();
  closeModal(); renderAuthSlot(); toast('Halo lagi, '+S.user.name.split(' ')[0]+'!'); const n=authNext; authNext=null; if(n) n(); else { if(!location.hash || location.hash==='#' || location.hash==='#beranda') location.hash='#dashboard'; route(); }
}
function nameStep(){
  const guess = S.bride.name && !['Sarah Amalia','Nadia Larasati'].includes(S.bride.name) ? S.bride.name : '';
  openModal(`<div class="auth"><span class="eyebrow">Akun baru</span><h2 class="display" style="font-size:32px;margin:8px 0 6px">Enaknya dipanggil <em>siapa?</em></h2><p class="muted">Agar kami bisa menyapa dengan benar. Bisa diganti kapan saja.</p>
    <form id="nameForm" style="margin-top:20px;display:grid;gap:14px" novalidate><div class="field"><label for="au-name">Nama panggilan</label><input class="input" id="au-name" autocomplete="name" autocapitalize="words" placeholder="Sarah Amalia" value="${esc(guess)}"><span class="err" hidden></span></div>
    <button class="btn btn-primary btn-block">Mulai</button></form></div>`);
  setTimeout(()=>$('#au-name')?.focus(),60);
  $('#nameForm').addEventListener('submit',async ev=>{ ev.preventDefault(); const i=$('#au-name'); const nm=i.value.trim().replace(/\s+/g,' ').slice(0,60); const er=$('#nameForm .err');
    if(!nm){ er.textContent='Isi nama dulu, ya'; er.hidden=false; i.focus(); return; }
    const b=$('#nameForm button'); b.disabled=true; b.textContent='Menyimpan…';
    if(CLOUD.on){ const { error } = await CLOUD.sb.auth.updateUser({data:{name:nm}}); if(error){ b.disabled=false; b.textContent='Mulai'; er.textContent='Gagal menyimpan. Coba lagi.'; er.hidden=false; return; } }
    else { const k=knownNames(); k[S.user.email]=nm; lsSet('sp-names', JSON.stringify(k)); }
    S.user.name=nm; save(); closeModal(); renderAuthSlot(); toast('Selamat datang, '+nm.split(' ')[0]+'!'); const n=authNext; authNext=null; if(n) n(); else { if(!location.hash || location.hash==='#' || location.hash==='#beranda') location.hash='#dashboard'; route(); } });
}
function finishLogin(name,email){ S.user={name,email}; save(); closeModal(); renderAuthSlot(); toast('Halo, '+name.split(' ')[0]+'!'); const n=authNext; authNext=null; if(n) n(); else { if(!location.hash || location.hash==='#' || location.hash==='#beranda') location.hash='#dashboard'; route(); } }

/* ---------- Checkout ---------- */
let CO = {method:'qris', bank:'BCA', wallet:'GoPay', voucher:'', applied:null, stage:'form', plan:null, timer:null, end:0};
const coMode = () => S.published ? (canUpgrade() ? 'upgrade' : 'done-already') : 'new';
function coItems(){
  const paid = shownPlans().filter(p=>p.price>0);
  if(isCx(S.theme)) CO.plan='custom';
  if(coMode()==='upgrade'){ const ts=upgradeTargets(); const t=ts.find(p=>p.id===CO.plan) || ts.find(p=>p.feature) || ts[0]; const cur=planOf(S.plan); return {name:'Naik ke '+t.name, price:t.price-(cur?cur.price:0), plan:t.id}; }
  const p = paid.find(x=>x.id===(CO.plan||S.plan)) || paid.find(x=>x.feature) || paid[paid.length-1]; return {name:'Paket '+p.name, price:p.price, plan:p.id};
}
function coTotals(){ const it=coItems(); let disc=0; const v=CO.applied&&VOUCHERS[CO.applied]; if(v) disc = v.type==='pct'? Math.round(it.price*v.v/100) : v.v; disc=Math.min(disc,it.price); return {...it, disc, total:it.price-disc}; }
function renderCheckout(){
  const root=$('#checkout'); clearInterval(CO.timer);
  if(!S.user){ root.innerHTML = `<div class="co-empty">${karaImg('bisik','kara-gate')}<span class="eyebrow">Satu langkah lagi</span><h1 class="display">Simpan dulu undangan kalian ke akun</h1><p class="muted">Semua yang sudah kalian isi ikut tersimpan, tidak perlu mengulang. Setelah itu langsung lanjut ke pembayaran.</p><button class="btn btn-primary" data-act="login-co">Masuk dan lanjutkan</button></div>`; return; }
  if(coMode()==='done-already' && CO.stage!=='done'){ root.innerHTML = `<div class="co-empty">${karaImg('rayakan','kara-gate')}<span class="status s-ok">Aktif selamanya</span><h1 class="display">Paket kalian sudah yang paling lengkap!</h1><p class="muted">${esc((planOf(S.plan)||{name:'Paket kalian'}).name)} sudah aktif untuk ${esc(pubHost())}${esc(S.slug)}.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="#dashboard">Buka dashboard</a><a class="btn btn-ghost" href="#tagihan">Lihat tagihan</a></div></div>`; return; }
  const T=coTotals();
  const steps = `<ol class="co-steps">${['Paket','Pembayaran','Selesai'].map((s,i)=>`<li class="${(CO.stage==='form'&&i===0)||(CO.stage==='pending'&&i===1)||(CO.stage==='done'&&i===2)?'on':''} ${(CO.stage==='pending'&&i<1)||(CO.stage==='done'&&i<2)?'ok':''}"><span>${i+1}</span>${s}</li>`).join('')}</ol>`;
  const summary = `<aside class="co-sum"><div class="co-inv${isCx(S.theme)?' cx-inv':''}" style="${themeStyle(themeById(S.theme),S.accent,fontOf())}${isCx(S.theme)?`background-image:url(${themeById(S.theme).thumbImg});`:''}"><div class="pat2"></div><small>The wedding of</small><b>${esc(S.bride.nick)} &amp; ${esc(S.groom.nick)}</b><small>${esc(fmtShort(S.events[0].date))}</small></div>
    <div class="line"><span>${esc(T.name)}</span><b class="num">${rupiah(T.price)}</b></div>
    ${T.disc?`<div class="line ok"><span>Voucher ${esc(CO.applied)}</span><b class="num">−${rupiah(T.disc)}</b></div>`:''}
    <div class="line total"><span>Total</span><b class="num">${rupiah(T.total)}</b></div>
    <ul class="co-trust"><li>${ico('check')}Sekali bayar, aktif selamanya</li><li>${ico('check')}${esc(pubHost())}${esc(S.slug)}</li><li>${ico('check')}Garansi uang kembali 7 hari</li></ul></aside>`;
  if(CO.stage==='form'){
    root.innerHTML = `<div class="co-head"><a class="linkbtn" href="#${S.published?'edit':'buat'}">← Kembali ke editor</a><h1 class="display">${coMode()==='upgrade'?'Naikkan paket':'Publikasikan undangan'}</h1></div>${steps}
    <div class="co-grid"><form class="form-card co-form" id="coForm" novalidate>
      ${coMode()==='upgrade' ? `<h2 class="co-h">Naik ke paket</h2><div class="plan-pick">${upgradeTargets().filter(p=>!isCx(S.theme)||p.id==='custom').map(p=>`<label><input type="radio" name="coPlan" value="${p.id}" ${T.plan===p.id?'checked':''}><span><b>${esc(p.name)}</b><small>${esc(planSum(p))}</small></span><b class="num">+${rupiah(p.price-((planOf(S.plan)||{}).price||0))}</b></label>`).join('')}</div>`
      : `${isCx(S.theme)&&cxSampleLeft()?`<div class="warn-box" style="margin-bottom:16px">${ico('camera')}<span>Masih ada ${cxSampleLeft()} foto contoh di undangan kalian. Ganti dulu dengan foto kalian di <a href="#${S.published?'edit':'buat'}" data-act="cx-go-photos">langkah Tema</a>, supaya tamu tidak melihat foto orang lain.</span></div>`:''}<h2 class="co-h">Paket</h2>${isCx(S.theme)?`<p class="hint" style="margin:-4px 0 10px">Tema ${esc(themeById(S.theme).name)} termasuk koleksi Custom, jadi dipublikasikan dengan paket Custom. Mau paket lain? <a href="#tema">Pilih tema Lukisan</a>.</p>`:''}<div class="plan-pick">${shownPlans().filter(p=>p.price && (!isCx(S.theme)||p.id==='custom')).map(p=>`<label><input type="radio" name="coPlan" value="${p.id}" ${T.plan===p.id?'checked':''}><span><b>${esc(p.name)}</b><small>${esc(planSum(p))}</small></span><b class="num">${rupiah(p.price)}</b></label>`).join('')}</div>`}
      ${(()=>{ if(coMode()!=='new' || isCx(S.theme)) return ''; const cur=planOf(T.plan), up=shownPlans().filter(p=>p.id!=='custom'&&p.price>(cur?cur.price:0)).sort((a,b)=>a.price-b.price)[0]; if(!cur||!up) return ''; const extra=FEAT_ROWS().filter(r=>planFeat(up,r.key)&&!planFeat(cur,r.key)).slice(0,3).map(r=>r[0].charAt(0).toLowerCase()+r[0].slice(1)); if(!extra.length) return '';
        return `<div class="co-upsell">${ico('up')}<span>Tambah ${rupiah(up.price-cur.price)} saja, kalian dapat ${esc(extra.join(', '))}. <button type="button" class="linkbtn" data-act="co-pick-plan" data-p="${esc(up.id)}">Pilih ${esc(up.name)}</button></span></div>`; })()}
      <h2 class="co-h">Kode voucher</h2>
      <div class="vrow"><input class="input" id="coV" placeholder="Masukkan kode" value="${esc(CO.voucher)}" aria-label="Kode voucher" autocomplete="off"><button type="button" class="btn btn-ghost" data-act="apply-voucher">Pakai</button></div>
      <p class="hint" id="coVmsg" style="margin-top:6px;font-size:13px;${CO.applied?'color:var(--ok);font-weight:700':'color:var(--muted)'}">${CO.applied?`${esc(VOUCHERS[CO.applied].label)} dipakai.`:'Tidak punya kode? Lewati saja.'}</p>
      <h2 class="co-h">Metode pembayaran</h2>
      <div class="pay-opts" role="radiogroup" aria-label="Metode pembayaran">
        ${[['qris','QRIS','Scan dari m-banking atau e-wallet apa pun','qr'],['va','Virtual Account','BCA, Mandiri, BNI, BRI','receipt'],['ewallet','E-wallet','GoPay, ShopeePay','wallet']].map(([k,l,d,i])=>`<label class="pay-opt"><input type="radio" name="coM" value="${k}" ${CO.method===k?'checked':''}><span class="pi">${ico(i)}</span><span><b>${l}</b><small>${d}</small></span></label>`).join('')}
      </div>
      ${CO.method==='va'?`<div class="seg" style="margin-top:12px" role="group" aria-label="Bank">${['BCA','Mandiri','BNI','BRI'].map(b=>`<button type="button" data-bank="${b}" aria-pressed="${CO.bank===b}">${b}</button>`).join('')}</div>`:''}
      ${CO.method==='ewallet'?`<div class="seg" style="margin-top:12px" role="group" aria-label="E-wallet">${['GoPay','ShopeePay'].map(b=>`<button type="button" data-wallet="${b}" aria-pressed="${CO.wallet===b}">${b}</button>`).join('')}</div>`:''}
      <div class="form-foot co-foot"><span class="muted" style="font-size:13px">Bukti bayar dikirim ke ${esc(S.user.email)}</span><button class="btn btn-primary">Bayar ${rupiah(T.total)}</button></div>
      ${CLOUD.on?`<p class="muted" style="font-size:12.5px">Pembayaran diproses aman oleh Midtrans${CLOUD.cfg.midtransProduction?'':' (mode uji coba / sandbox)'}.</p>`:'<p class="muted" style="font-size:12.5px">Prototype: tidak ada pembayaran sungguhan yang diproses.</p>'}
      ${CLOUD.pendingOrder?`<div class="warn-box" style="margin-top:12px">${ico('receipt')}<span>Ada pembayaran yang belum selesai (${esc(CLOUD.pendingOrder)}). <button type="button" class="linkbtn" data-act="co-resume">Lanjutkan pembayaran</button> · <button type="button" class="linkbtn" data-act="co-check">Cek status</button></span></div>`:''}
    </form>${summary}</div>`;
    $('#coForm').addEventListener('submit',ev=>{ ev.preventDefault(); if(coMode()!=='upgrade' && sampleLeft().length){ toast(sampleLeft().map(x=>x[0]).join(', ')+' masih contoh. Ganti dulu sebelum dipublikasikan, ya.'); return; } if(CLOUD.on){ cloudPay(ev.target.querySelector('.form-foot .btn-primary')); return; } if(!PROTO){ toast(OFFLINE_MSG); return; } CO.stage='pending'; CO.end=Date.now()+15*60*1000; renderCheckout(); window.scrollTo(0,0); });
    $('#coForm').addEventListener('change',ev=>{ if(ev.target.name==='coPlan'){ CO.plan=ev.target.value; renderCheckout(); } if(ev.target.name==='coM'){ CO.method=ev.target.value; renderCheckout(); } });
    $('#coV').addEventListener('keydown',ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); applyVoucher(); } });
  }
  if(CO.stage==='pending'){
    const va = (CO.bank==='BCA'?'39012':CO.bank==='Mandiri'?'89608':CO.bank==='BNI'?'98821':'12671') + '0812' + String(T.total).slice(0,5);
    root.innerHTML = `<div class="co-head"><button class="linkbtn" data-act="co-back">← Ganti metode</button><h1 class="display">Selesaikan pembayaran</h1></div>${steps}
    <div class="co-grid"><div class="form-card co-pay">
      ${CO.method==='qris'?`<h2 class="co-h">Scan QRIS</h2><p class="muted">Buka m-banking atau e-wallet, pilih scan QR, lalu bayar ${rupiah(T.total)}.</p><div class="qris">${qrSVG('SAKARA|'+S.slug+'|'+T.total,220)}<span class="num" id="coTimer">15:00</span><small class="muted">Berlaku sampai waktu habis</small></div>`:''}
      ${CO.method==='va'?`<h2 class="co-h">Virtual Account ${esc(CO.bank)}</h2><p class="muted">Transfer tepat ${rupiah(T.total)} ke nomor berikut.</p><div class="va"><span class="num">${va.replace(/(\d{4})(?=\d)/g,'$1 ')}</span><button class="btn btn-soft btn-sm" data-act="copy" data-v="${va}">${ico('copy')}Salin</button></div><ol class="howto"><li>Buka aplikasi ${esc(CO.bank)} atau ATM, pilih Transfer › Virtual Account.</li><li>Masukkan nomor di atas, periksa nama <b>Sakara · ${esc(S.user.name)}</b>.</li><li>Konfirmasi. Status berubah otomatis dalam 1 menit.</li></ol><p class="muted" style="font-size:13px">Sisa waktu <b class="num" id="coTimer">15:00</b></p>`:''}
      ${CO.method==='ewallet'?`<h2 class="co-h">Bayar dengan ${esc(CO.wallet)}</h2><p class="muted">Kami kirim notifikasi pembayaran ke aplikasi ${esc(CO.wallet)}. Buka aplikasinya dan setujui ${rupiah(T.total)}.</p><div class="va"><span>Menunggu persetujuan di ${esc(CO.wallet)}…</span></div><p class="muted" style="font-size:13px">Sisa waktu <b class="num" id="coTimer">15:00</b></p>`:''}
      <div class="form-foot"><button class="btn btn-ghost" data-act="co-back">Ganti metode</button><button class="btn btn-primary" data-act="co-paid">Saya sudah bayar</button></div>
      <p class="muted" style="font-size:12.5px">Prototype: tekan "Saya sudah bayar" untuk mensimulasikan pembayaran berhasil.</p>
    </div>${summary}</div>`;
    const tick=()=>{ const s=Math.max(0,Math.round((CO.end-Date.now())/1000)); const el=$('#coTimer'); if(el) el.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; if(!s){ clearInterval(CO.timer); CO.stage='form'; toast('Waktu pembayaran habis. Tidak apa-apa, silakan buat ulang.'); renderCheckout(); } };
    tick(); CO.timer=setInterval(tick,1000);
  }
  if(CO.stage==='waiting'){
    root.innerHTML = `<div class="co-head"><h1 class="display">Menunggu konfirmasi pembayaran</h1></div>${steps}
    <div class="co-done form-card"><img class="kara kara-wait" src="/assets/kara/kara-terbang.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"><h2 class="display" style="font-size:30px">Sebentar ya…</h2><p class="muted" style="max-width:46ch;margin:10px auto 0">Kami menunggu konfirmasi dari Midtrans. Untuk Virtual Account, selesaikan transfer dulu; halaman ini akan berubah otomatis begitu pembayaran diterima.</p><p class="muted num" style="margin-top:12px;font-size:13px">${esc(CLOUD.pendingOrder||'')}</p><div style="display:flex;gap:10px;justify-content:center;margin-top:20px"><button class="btn btn-ghost" data-act="co-back">Kembali</button><button class="btn btn-primary" data-act="co-check">Cek status sekarang</button></div></div>`;
  }
  if(CO.stage==='done'){
    const inv=(S.invoices||[])[0];
    root.innerHTML = `<div class="co-head"><h1 class="display">Pembayaran berhasil</h1></div>${steps}
    <div class="co-done form-card"><img class="kara kara-done" src="/assets/kara/kara-rayakan.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"><h2 class="display" style="font-size:34px">${inv&&inv.upgrade?`Paket ${esc((planOf(S.plan)||{name:'baru'}).name)} aktif`:'Undangan kalian sudah tayang'}</h2>
      <p class="muted" style="max-width:46ch;margin:10px auto 0">${esc(pubHost())}${esc(S.slug)} aktif selamanya. Bukti bayar ${esc(inv?.no||'')} sudah dikirim ke ${esc(S.user.email)}.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px"><button class="btn btn-ghost" data-act="copy" data-v="${esc(pubURL())}">${ico('copy')}Salin link</button><a class="btn btn-ghost" href="#tagihan">${ico('receipt')}Lihat tagihan</a><a class="btn btn-primary" href="#dashboard" data-act="co-reset">Mulai kirim ke tamu</a></div></div>`;
  }
}
async function applyVoucher(){ const c=($('#coV').value||'').trim().toUpperCase(); CO.voucher=c;
  if(c && !VOUCHERS[c]){ try{ if(CLOUD.on){ const r=await fetch('/api/pay/voucher?code='+encodeURIComponent(c)); if(r.ok){ const j=await r.json(); VOUCHERS[c]={type:j.type, v:j.v, label:j.label}; } } else if(PROTO && PROTO_VOUCHERS[c]) VOUCHERS[c]=PROTO_VOUCHERS[c]; }catch(_){} }
  if(VOUCHERS[c]){ CO.applied=c; renderCheckout(); toast(VOUCHERS[c].label+' dipakai'); } else { CO.applied=null; const m=$('#coVmsg'); m.textContent= c?`Kode "${c}" tidak berlaku. Periksa ejaannya.`:'Masukkan kode voucher dulu.'; m.style.color='var(--no)'; m.style.fontWeight='700'; } }
function completePayment(){
  const T=coTotals(); const up = coMode()==='upgrade';
  S.invoices = S.invoices||[]; const seq = String(S.invoices.length+1).padStart(4,'0');
  const mname = CO.method==='qris'?'QRIS':CO.method==='va'?`VA ${CO.bank}`:CO.wallet;
  S.invoices.unshift({no:`INV/2026/10/${seq}`, date:new Date().toISOString(), item:T.name, price:T.price, disc:T.disc, voucher:T.disc?CO.applied:'', total:T.total, method:mname, status:'Lunas', upgrade:up});
  S.plan = T.plan; S.published=true; save(); reapplyConfig(); clearInterval(CO.timer); CO.stage='done'; CO.applied=null; CO.voucher=''; renderCheckout(); window.scrollTo(0,0);
}

/* ---------- Tagihan ---------- */
const fmtDT = iso => { try{ return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)); }catch(e){ return iso; } };
function renderTagihan(){
  const root=$('#tagihan');
  if(!S.user){ root.innerHTML = `<div class="co-empty">${karaImg('lambai','kara-gate')}<span class="eyebrow">Akun</span><h1 class="display">Masuk untuk melihat tagihan</h1><button class="btn btn-primary" data-act="login">Masuk atau daftar</button></div>`; return; }
  const inv=S.invoices||[];
  root.innerHTML = `<div class="page-head" style="padding-bottom:20px"><span class="eyebrow">Akun</span><h1>Akun &amp; tagihan</h1></div>
  <div class="acct-grid"><div class="panel-c acct-card"><span class="av-btn big">${esc(initials(S.user.name))}</span><div><b style="font-size:18px">${esc(S.user.name)}</b><div class="muted">${esc(S.user.email)}</div></div>
    <div class="acct-stat"><span class="muted">Undangan</span>${S.published&&CLOUD.on?`<div class="acct-row"><a class="acct-link" href="${esc(pubURL())}" target="_blank" rel="noopener">${esc(pubHost())}<wbr>${esc(S.slug)}</a><button class="btn btn-ghost btn-sm" data-act="copy" data-v="${esc(pubURL())}" aria-label="Salin link undangan">${ico('copy')}</button></div>`:`<b>${esc(pubHost())}<wbr>${esc(S.slug)}</b>`}<span class="status ${S.published?'s-ok':'s-wait'}">${S.published?'Aktif selamanya · '+esc((PLANS.find(p=>p.id===S.plan)||{}).name||''):'Belum dipublikasikan'}</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${canUpgrade()?`<button class="btn btn-soft btn-sm" data-act="upgrade">Naikkan paket</button>`:''}${S.published?'':`<a class="btn btn-primary btn-sm" href="#buat">Lanjut ke editor</a>`}<button class="btn btn-ghost btn-sm" data-act="logout">${ico('logout')}Keluar</button></div></div>
  <div><h2 class="co-h" style="margin-top:0">Riwayat tagihan</h2>
  ${inv.length?`<div class="tbl-wrap" style="display:block"><table><thead><tr><th>Nomor</th><th>Tanggal</th><th>Item</th><th class="num">Total</th><th>Status</th></tr></thead><tbody>${inv.map((x,k)=>`<tr><td class="nm num"><button type="button" class="inv-no" data-act="inv" data-k="${k}" title="Lihat bukti pembayaran">${esc(x.no)}</button></td><td class="muted td-date">${(()=>{ const [d,t]=fmtDT(x.date).split(' pukul '); return `${esc(d)}${t?`<small>pukul ${esc(t)}</small>`:''}`; })()}</td><td class="td-item">${esc(x.item)}</td><td class="num td-total">${rupiah(x.total)}<small>${esc(methodName(x.method))}</small></td><td><span class="status s-ok">${esc(x.status)}</span></td></tr>`).join('')}</tbody></table></div>`
  :`<div class="empty"><img class="kara kara-empty" src="/assets/kara/kara-tidur.webp" alt="" aria-hidden="true" loading="lazy" decoding="async">Belum ada tagihan. Bukti bayar akan muncul di sini begitu undangan kalian dipublikasikan.<br><a class="btn btn-primary btn-sm" href="#buat" style="margin-top:14px">Lanjutkan undangan</a></div>`}</div></div>`;
}
function invoiceModal(k){
  const x=(S.invoices||[])[k]; if(!x) return;
  openModal(`<div class="invoice"><div class="inv-top"><span class="logo" style="pointer-events:none"><svg viewBox="0 0 100 100" aria-hidden="true" width="30" height="30"><g transform="rotate(0 50 50)"><path d="M50 41 C46.5 35 46.5 27 50 21 C53.5 27 53.5 35 50 41 Z" fill="none" stroke="#B5656F" stroke-width="3.6" stroke-linejoin="round"/></g><g transform="rotate(45 50 50)"><path d="M50 41 C46.5 35 46.5 27 50 21 C53.5 27 53.5 35 50 41 Z" fill="none" stroke="#B5656F" stroke-width="3.6" stroke-linejoin="round"/></g><g transform="rotate(90 50 50)"><path d="M50 41 C46.5 35 46.5 27 50 21 C53.5 27 53.5 35 50 41 Z" fill="none" stroke="#B5656F" stroke-width="3.6" stroke-linejoin="round"/></g><g transform="rotate(135 50 50)"><path d="M50 41 C46.5 35 46.5 27 50 21 C53.5 27 53.5 35 50 41 Z" fill="none" stroke="#B5656F" stroke-width="3.6" stroke-linejoin="round"/></g><g transform="rotate(180 50 50)"><path d="M50 41 C46.5 35 46.5 27 50 21 C53.5 27 53.5 35 50 41 Z" fill="none" stroke="#B5656F" stroke-width="3.6" stroke-linejoin="round"/></g><g transform="rotate(225 50 50)"><path d="M50 41 C46.5 35 46.5 27 50 21 C53.5 27 53.5 35 50 41 Z" fill="none" stroke="#B5656F" stroke-width="3.6" stroke-linejoin="round"/></g><g transform="rotate(270 50 50)"><path d="M50 41 C46.5 35 46.5 27 50 21 C53.5 27 53.5 35 50 41 Z" fill="none" stroke="#B5656F" stroke-width="3.6" stroke-linejoin="round"/></g><g transform="rotate(315 50 50)"><path d="M50 41 C46.5 35 46.5 27 50 21 C53.5 27 53.5 35 50 41 Z" fill="none" stroke="#B5656F" stroke-width="3.6" stroke-linejoin="round"/></g><g transform="rotate(22.5 50 50)"><circle cx="50" cy="20" r="2.4" fill="#D9A441"/></g><g transform="rotate(67.5 50 50)"><circle cx="50" cy="20" r="2.4" fill="#D9A441"/></g><g transform="rotate(112.5 50 50)"><circle cx="50" cy="20" r="2.4" fill="#D9A441"/></g><g transform="rotate(157.5 50 50)"><circle cx="50" cy="20" r="2.4" fill="#D9A441"/></g><g transform="rotate(202.5 50 50)"><circle cx="50" cy="20" r="2.4" fill="#D9A441"/></g><g transform="rotate(247.5 50 50)"><circle cx="50" cy="20" r="2.4" fill="#D9A441"/></g><g transform="rotate(292.5 50 50)"><circle cx="50" cy="20" r="2.4" fill="#D9A441"/></g><g transform="rotate(337.5 50 50)"><circle cx="50" cy="20" r="2.4" fill="#D9A441"/></g><circle cx="50" cy="50" r="5.5" fill="none" stroke="#B5656F" stroke-width="3.6"/><circle cx="50" cy="50" r="2.4" fill="#D9A441"/></svg><span>Sakara</span></span></div>
    <div class="inv-title"><h2 class="display" style="font-size:28px">Bukti pembayaran</h2><span class="status s-ok">${esc(x.status)}</span></div><p class="muted num">${esc(x.no)} · ${esc(fmtDT(x.date))}</p>
    <div class="inv-meta"><div><small class="muted">Ditagihkan ke</small><b>${esc(S.user.name)}</b><span class="muted">${esc(S.user.email)}</span></div><div><small class="muted">Undangan</small><b>${esc(pubHost())}<wbr>${esc(S.slug)}</b><span class="muted">${esc(S.bride.nick)} &amp; ${esc(S.groom.nick)}</span></div></div>
    <div class="line"><span>${esc(x.item)}</span><b class="num">${rupiah(x.price)}</b></div>${x.disc?`<div class="line ok"><span>Voucher ${esc(x.voucher)}</span><b class="num">−${rupiah(x.disc)}</b></div>`:''}<div class="line total"><span>Dibayar via ${esc(({qris:'QRIS',va:'Virtual Account',bank_transfer:'Transfer bank',gopay:'GoPay',ewallet:'E-wallet',shopeepay:'ShopeePay'})[String(x.method||'').toLowerCase()]||x.method)}</span><b class="num">${rupiah(x.total)}</b></div>
    <div class="form-foot"><button class="btn btn-ghost" data-act="copy" data-v="${esc(x.no)}">${ico('copy')}Salin nomor</button><button class="btn btn-primary" data-act="close">Tutup</button></div></div>`);
}

/* ---------- Check-in (hari H) ---------- */
let ciSession = null, ciQ='';
const methodName = m => ({qris:'QRIS',va:'Virtual Account',bank_transfer:'Transfer bank',gopay:'GoPay',ewallet:'E-wallet',shopeepay:'ShopeePay'})[String(m||'').toLowerCase()]||m||'';
const nowTime = () => new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit'}).format(new Date());
function defaultSession(){ const i=S.events.findIndex(e=>/resepsi/i.test(e.type)); return i>-1?i:0; }
/* ---------- Mode penerima tamu v2 ---------- */
let ciTab='belum', ciGreetOn = lsGet('sp-ci-greet')==='1', ciHelpSeen = lsGet('sp-ci-help')==='1', ciScanLoop=false, ciLastScan='', ciFromScan=false;
const giftNo = n => '#'+String(n).padStart(3,'0');
function renderCheckin(){
  const root=$('#checkin');
  if(CLOUD.pinMode && CLOUD.needPin){
    root.innerHTML = `<div class="ci2-pin"><div class="ci2-pin-card">
      ${karaImg(CLOUD.pinError?'kaget':'lambai','')}<span class="ci2-badge">${ico('qr')}Penerima tamu</span>
      <h1 class="display">Masuk ke buku tamu</h1>
      <p class="muted">Masukkan PIN dari pengantin. Anda tidak perlu akun.</p>
      <form id="pinF" novalidate><label for="pinI" class="sr-only">PIN</label><input class="input otp" id="pinI" inputmode="text" maxlength="10" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="PIN">
      ${CLOUD.pinError?`<span class="err">${/terlalu banyak/i.test(CLOUD.pinError)?esc(CLOUD.pinError):'PIN salah. Cek lagi ke pengantin.'}</span>`:''}
      <button class="btn btn-primary btn-block">Masuk</button></form></div></div>`;
    const inp=$('#pinI'); inp.addEventListener('input',()=>{ inp.value=inp.value.toUpperCase().replace(/[^0-9A-F]/g,'').slice(0,10); if(inp.value.length===10) $('#pinF').requestSubmit(); });
    $('#pinF').addEventListener('submit',async ev=>{ ev.preventDefault(); const b=ev.target.querySelector('button'); b.disabled=true; b.textContent='Memeriksa…'; CLOUD.pin=inp.value.trim(); CLOUD.pinError=null; await pinLoad(); if(!CLOUD.needPin){ try{ history.replaceState(null,'',`/u/${CLOUD.slug}/checkin?pin=${CLOUD.pin}`); }catch(e){} } renderCheckin(); });
    setTimeout(()=>inp.focus(),50); return;
  }
  if(isLocked('harih')){ root.innerHTML=`<div class="wrap" style="padding:60px 0">${lockNote('QR check-in hari H')}<p style="margin-top:16px"><a class="linkbtn" href="#dashboard">← Kembali ke dashboard</a></p></div>`; return; }
  if(ciSession==null || !S.events[ciSession]) ciSession=defaultSession();
  const ev=S.events[ciSession];
  const pool = G.filter(g=>!isPending(g));
  const inSes = g => guestEvents(g).some(e=>e.i===ciSession);
  const arrived = pool.filter(g=>g.checkin && g.checkin.session===ciSession).sort((a,b)=>b.checkin.ts-a.checkin.ts);
  const ppl = arrived.reduce((a,g)=>a+(g.checkin.pax||1),0);
  const expectAll = pool.filter(g=>inSes(g) && g.status==='hadir');
  const notYet = expectAll.filter(g=>!g.checkin);
  const pct = expectAll.length ? Math.round((expectAll.length-notYet.length)/expectAll.length*100) : 0;
  const q=ciQ.trim().toLowerCase(); const qd=q.replace(/\D/g,'');
  const match = g => g.name.toLowerCase().includes(q) || (g.code||'').toLowerCase()===q || (g.code||'').toLowerCase().includes(q) && q.length>=4 || (qd.length>=4 && (g.phone||'').replace(/\D/g,'').endsWith(qd));
  let list, title;
  if(q){ list = pool.filter(match).sort((a,b)=>(!!a.checkin)-(!!b.checkin)).slice(0,30); title = `${list.length} hasil untuk “${esc(ciQ)}”`; }
  else if(ciTab==='sudah'){ list = arrived; title = ''; }
  else if(ciTab==='semua'){ list = pool.filter(inSes).sort((a,b)=>a.name.localeCompare(b.name)); title=''; }
  else { list = notYet.sort((a,b)=>a.name.localeCompare(b.name)); title=''; }
  /* nama kembar: tampilkan kode tamu supaya tidak salah check-in */
  const dupN={}; pool.forEach(x=>{ const k=String(x.name||'').trim().toLowerCase(); dupN[k]=(dupN[k]||0)+1; });
  const row = g => { const c=g.checkin; const other = c && c.session!==ciSession; const dup = dupN[String(g.name||'').trim().toLowerCase()]>1;
    return `<li><button class="ci2-row ${c?'in':''}" data-act="ci-open" data-id="${esc(g.id)}">
      <span class="av">${c?ico('check'):esc(initials(g.name))}</span>
      <span class="ci2-info"><b>${esc(g.name)}</b><small>${dup&&g.code?`<span class="ci2-code">${esc(g.code)}</span> · `:''}${esc(g.group||'')}${g.status==='tidak'?' · RSVP tidak hadir':g.status==='hadir'?'':' · belum RSVP'}${g.walkin?' · tamu tambahan':''}</small></span>
      ${g.status==='hadir'?`<span class="ci2-pax" aria-label="${g.pax||1} orang"><b class="num">${g.pax||1}</b>org</span>`:''}
      <span class="ci2-st">${c?`<span class="ci2-in">Masuk ${esc(c.time)}${c.gift?` · ${giftNo(c.gift)}`:''}${other?` · ${esc(S.events[c.session]?.type||'')}`:''}</span>`:`<span class="ci2-pill">Check-in</span>`}</span></button></li>`; };
  const help = ciHelpSeen ? '' : `<div class="ci2-help"><b>Cara pakai</b><ol><li><span>1</span><p>Tamu datang, minta tunjukkan <b>QR di undangan</b> mereka.</p></li><li><span>2</span><p>Ketuk <b>Scan QR</b>. Tidak punya QR? <b>Cari namanya</b>.</p></li><li><span>3</span><p>Cek jumlah orang dan kado, lalu ketuk <b>Check-in</b>.</p></li></ol><button class="btn btn-soft btn-sm" data-act="ci-help-ok">Mengerti</button></div>`;
  root.innerHTML = `
    <header class="ci2-top"><div class="ci2-top-in">
      <div class="ci2-brand"><b>Buku tamu</b><span>${esc(S.bride.nick)} &amp; ${esc(S.groom.nick)}</span></div>
      <label class="ci2-ses"><span>Sesi</span><select id="ciSes" aria-label="Sesi acara">${S.events.map((e,i)=>`<option value="${i}" ${i===ciSession?'selected':''}>${esc(e.type||'Acara '+(i+1))}${e.start?' · '+esc(e.start):''}</option>`).join('')}</select></label>
      <button class="ci2-ib" data-act="ci-menu" aria-label="Pengaturan">${ico('menu')}</button>
    </div>
    <div class="ci2-prog"><div class="ci2-bar"><span style="width:${pct}%"></span></div><div class="ci2-nums"><span><b class="num">${expectAll.length-notYet.length}</b>/${expectAll.length} undangan datang</span><span><b class="num">${ppl}</b> orang di lokasi</span><span>Kado terakhir <b class="num">${giftNo(S.giftNo||0)}</b></span></div></div></header>
    <main class="ci2-main">
      <div class="ci2-col">
        ${help}
        <button class="ci2-scan" data-act="ci-scan">${ico('qr')}<span><b>Scan QR tamu</b><small>Arahkan kamera ke kartu masuk di undangan</small></span></button>
        <div class="ci2-search">${ico('search')}<input class="input" id="ciQ" placeholder="Atau cari nama / kode SP-…" value="${esc(ciQ)}" autocomplete="off" enterkeyhint="search" aria-label="Cari tamu atau kode">${ciQ?`<button class="ci2-clear" data-act="ci-clear" aria-label="Hapus pencarian">${ico('x')}</button>`:''}</div>
        ${q?`<p class="ci2-h">${title}</p>`:`<div class="ci2-tabs" role="tablist">${[['belum','Ditunggu',notYet.length],['sudah','Sudah datang',arrived.length],['semua','Semua',pool.filter(inSes).length]].map(([k,l,n])=>`<button role="tab" data-citab="${k}" aria-selected="${ciTab===k}">${l}<span class="num">${n}</span></button>`).join('')}</div>`}
        <ul class="ci2-list">${list.map(row).join('') || `<li class="ci2-empty">${q?`${karaImg('bingung','kara-sm')}Tidak ada tamu bernama “${esc(ciQ)}”.`:ciTab==='sudah'?`${karaImg('tidur','kara-sm')}Belum ada yang check-in.`:`${karaImg('rayakan','kara-sm')}Semua tamu yang konfirmasi hadir sudah datang 🎉`}</li>`}</ul>
        <button class="ci2-walk" data-act="ci-walkin">${ico('plus')}<span><b>Tamu tidak ada di daftar?</b><small>Catat sebagai tamu tambahan</small></span></button>
      </div>
      <aside class="ci2-side"><h3>Baru datang</h3>${arrived.length?`<ul class="ci2-feed">${arrived.slice(0,12).map(g=>`<li><span class="av">${esc(initials(g.name))}</span><div><b>${esc(g.name)}</b><small>${esc(g.checkin.time)} · ${g.checkin.pax} orang${g.checkin.gift?' · kado '+giftNo(g.checkin.gift):''}</small></div></li>`).join('')}</ul>`:'<p class="muted" style="font-size:14px">Tamu yang check-in muncul di sini.</p>'}</aside>
    </main>`;
}
function ciMenu(){
  openModal(`<span class="eyebrow">Pengaturan</span><h2 class="display" style="font-size:28px;margin:8px 0 14px">Buku tamu</h2>
    <div class="toggle-row"><div><b>Layar sapa untuk tamu</b><div class="muted" style="font-size:14px">Setelah check-in, tampilkan “Selamat datang, nama tamu” layar penuh. Cocok kalau tablet menghadap tamu.</div></div><label class="switch"><input type="checkbox" id="ciGreetT" ${ciGreetOn?'checked':''} aria-label="Layar sapa"><span></span></label></div>
    <div class="toggle-row"><div><b>Tampilkan panduan lagi</b><div class="muted" style="font-size:14px">Untuk petugas baru.</div></div><button class="btn btn-ghost btn-sm" data-act="ci-help-again">Tampilkan</button></div>
    ${CLOUD.pinMode?'':'<div style="margin-top:18px"><a class="btn btn-ghost btn-block" href="#dashboard">Keluar dari mode penerima tamu</a></div>'}`);
  $('#ciGreetT').addEventListener('change',e=>{ ciGreetOn=e.target.checked; lsSet('sp-ci-greet', ciGreetOn?'1':'0'); });
}
function ciOpen(id){
  const g=G.find(x=>x.id===id); if(!g) return;
  const c=g.checkin;
  if(c){
    openModal(`<div class="ci2-sheet"><div class="ci2-state warn">${ico('check')}<div><b>Sudah check-in</b><span>Masuk pukul ${esc(c.time)} · ${c.pax} orang${c.gift?' · kado '+giftNo(c.gift):''}${c.session!==ciSession?' · di '+esc(S.events[c.session]?.type||''):''}</span></div></div>
      <h2 class="ci2-name">${esc(g.name)}</h2><p class="muted">${esc(g.group||'')} · ${esc(g.code||'')}</p>
      <p class="ci2-note">Kalau ini orang yang sama, persilakan masuk. Tidak perlu check-in dua kali.</p>
      <div class="ci2-btns"><button class="btn btn-ghost" data-act="ci-undo" data-id="${esc(g.id)}">Batalkan check-in</button><button class="btn btn-primary" data-act="ci-next">OK</button></div></div>`);
    return;
  }
  const inS = guestEvents(g).some(e=>e.i===ciSession);
  let pax = Math.max(1, g.pax || 1), gift = false;
  const render = () => {
    $('#ciPax').textContent = pax; $('#ciGo').innerHTML = `${ico('check')}Check-in ${pax} orang${gift?` · kado ${giftNo((S.giftNo||0)+1)}`:''}`;
    $$('[data-gift]').forEach(b=>b.setAttribute('aria-pressed', String((b.dataset.gift==='1')===gift)));
    $('#ciPaxNote').textContent = g.status==='hadir' && pax!==g.pax ? `Berbeda dari RSVP (${g.pax} orang)` : '';
  };
  openModal(`<div class="ci2-sheet">
    <span class="eyebrow">${esc(g.group||'Tamu')} · ${esc(g.code||'')}</span>
    <h2 class="ci2-name">${esc(g.name)}</h2>
    <div class="ci2-chips">${g.status==='hadir'?`<span class="status s-ok">RSVP hadir · ${g.pax} orang</span>`:g.status==='tidak'?`<span class="status s-no">RSVP tidak hadir</span>`:`<span class="status s-wait">Belum RSVP</span>`}${g.arrive?`<span class="status s-mute">Rencana ${esc(g.arrive)}</span>`:''}</div>
    ${inS?'':`<div class="ci2-state warn">${ico('cal')}<div><b>Diundang ke ${esc(sessionNames(g))}</b><span>Bukan ${esc(S.events[ciSession]?.type||'')}. Tetap bisa check-in kalau memang diizinkan.</span></div></div>`}
    <div class="ci2-field"><span>Jumlah yang datang</span><div class="ci2-step"><button type="button" data-cp="-1" aria-label="Kurangi">−</button><output id="ciPax" class="num">${pax}</output><button type="button" data-cp="1" aria-label="Tambah">+</button></div><small id="ciPaxNote" class="ci2-diff"></small></div>
    <div class="ci2-field"><span>Membawa kado atau amplop?</span><div class="ci2-seg"><button type="button" data-gift="0" aria-pressed="true">Tidak</button><button type="button" data-gift="1" aria-pressed="false">Ya, beri nomor</button></div></div>
    <button class="btn btn-primary btn-block ci2-go" id="ciGo" data-act="ci-confirm" data-id="${esc(g.id)}"></button>
    <button class="btn btn-ghost btn-block" data-act="close" style="margin-top:8px">Batal</button></div>`);
  render();
  $('#modalRoot').addEventListener('click',e=>{ const b=e.target.closest('[data-cp]'); if(b){ pax=Math.max(1,Math.min(20,pax+ +b.dataset.cp)); render(); } const gb=e.target.closest('[data-gift]'); if(gb){ gift = gb.dataset.gift==='1'; render(); } });
  ciOpen.state = () => ({pax, gift});
}
async function ciConfirm(id){
  const g=G.find(x=>x.id===id); if(!g) return; const st = ciOpen.state ? ciOpen.state() : {pax:1,gift:false}; const {pax, gift} = st;
  const b=$('#ciGo'); if(b){ b.disabled=true; b.textContent='Menyimpan…'; }
  if(ciAuth()){ const r=await ciRpc('ci_checkin',{p_id:id, p_pax:pax, p_gift:!!gift, p_session:ciSession}); if(r.error){ if(b){ b.disabled=false; b.textContent='Coba lagi'; } return; }
    Object.assign(g, fromRow(r.data)); if(g.checkin && g.checkin.gift) S.giftNo=Math.max(S.giftNo||0, g.checkin.gift); if(CLOUD.inv) CLOUD.lastG.set(g.id, JSON.stringify(toRow(g))); }
  else { let no=null; if(gift){ S.giftNo=(S.giftNo||0)+1; no=S.giftNo; save(); } g.checkin={ts:Date.now(), time:nowTime(), pax, gift:no, session:ciSession}; if(g.status==='belum') g.status='hadir'; if(!g.pax) g.pax=pax; saveG(); }
  if(navigator.vibrate) try{ navigator.vibrate(60); }catch(e){}
  closeModal(); ciQ=''; renderCheckin();
  if(ciGreetOn) greet(g);
  ciDone(g);
}
function ciDone(g){
  const r=$('#toastRoot'); clearTimeout(toast.t);
  r.innerHTML = `<div class="toast ci2-toast">${ico('check')}<span><b>${esc(g.name)}</b> masuk${g.checkin.gift?` · kado <b>${giftNo(g.checkin.gift)}</b>`:''}</span><button class="linkbtn" data-act="ci-undo" data-id="${esc(g.id)}">Batalkan</button>${ciFromScan?`<button class="btn btn-sm" data-act="ci-scan" style="background:#fff;color:var(--ink)">Scan berikutnya</button>`:''}</div>`;
  toast.t = setTimeout(()=> r.innerHTML='', 7000);
}

/* scanner kamera langsung */
let ciStream=null, ciRaf=0;
async function ciScanOpen(){
  ciFromScan=true;
  const ov=document.createElement('div'); ov.className='ci2-cam'; ov.id='ciCam';
  ov.innerHTML = `<video playsinline muted autoplay></video><div class="ci2-mask"><div class="ci2-frame"><i></i><i></i><i></i><i></i><span class="ci2-line"></span></div></div>
    <div class="ci2-cam-top"><b>Scan kartu masuk</b><button class="ci2-ib light" data-act="ci-scan-close" aria-label="Tutup">${ico('x')}</button></div>
    <div class="ci2-cam-msg" id="ciCamMsg">Arahkan QR di HP tamu ke dalam kotak</div>
    <div class="ci2-cam-bot"><button class="btn" data-act="ci-scan-close" style="background:#fff;color:var(--ink)">${ico('search')}Cari nama saja</button><label class="btn" style="background:rgba(255,255,255,.16);color:#fff;cursor:pointer" for="ciScan">${ico('camera')}Pakai foto</label><input type="file" id="ciScan" accept="image/*" capture="environment" hidden></div>`;
  document.body.appendChild(ov); document.body.style.overflow='hidden';
  const msg = t => { const m=$('#ciCamMsg'); if(m) m.textContent=t; };
  if(!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){ msg('Kamera tidak tersedia di perangkat ini. Pakai foto atau cari nama.'); return; }
  try{
    ciStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}, width:{ideal:1280}, height:{ideal:720}}, audio:false});
    const v=ov.querySelector('video'); v.srcObject=ciStream; await v.play().catch(()=>{});
    const det = ('BarcodeDetector' in window) ? new BarcodeDetector({formats:['qr_code']}) : null;
    if(!det && typeof jsQR!=='function') loadLib('jsqr').catch(()=>{});
    const cv=document.createElement('canvas'), cx=cv.getContext('2d',{willReadFrequently:true}); let last=0; ciScanLoop=true;
    const tick = async ts => {
      if(!ciScanLoop) return; ciRaf=requestAnimationFrame(tick); if(ts-last<140 || v.readyState<2) return; last=ts;
      let val=null;
      try{
        if(det){ const r=await det.detect(v); if(r[0]) val=r[0].rawValue; }
        else if(typeof jsQR==='function'){ const w=Math.min(720, v.videoWidth), h=Math.round(v.videoHeight*w/v.videoWidth); cv.width=w; cv.height=h; cx.drawImage(v,0,0,w,h); const c=jsQR(cx.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'dontInvert'}); if(c) val=c.data; }
      }catch(e){}
      if(!val) return; val=String(val).trim();
      const m = val.match(/SP-[A-Z0-9]{4}/i); const code = m ? m[0].toUpperCase() : val.toUpperCase();
      const g = G.find(x=>x.code===code);
      if(!g){ if(ciLastScan!==code){ ciLastScan=code; msg('QR ini bukan kartu masuk undangan ini'); ov.classList.add('bad'); setTimeout(()=>ov.classList.remove('bad'),900); } return; }
      ciLastScan=''; ov.classList.add('ok'); if(navigator.vibrate) try{ navigator.vibrate(40); }catch(e){}
      ciScanClose(); ciOpen(g.id);
    };
    ciRaf=requestAnimationFrame(tick);
  }catch(e){ msg(e && e.name==='NotAllowedError' ? 'Izin kamera ditolak. Izinkan kamera di pengaturan browser, atau pakai foto / cari nama.' : 'Kamera tidak bisa dibuka. Pakai foto atau cari nama.'); }
}
function ciScanClose(){ ciScanLoop=false; cancelAnimationFrame(ciRaf); if(ciStream){ ciStream.getTracks().forEach(t=>t.stop()); ciStream=null; } $('#ciCam')?.remove(); document.body.style.overflow=''; }
document.addEventListener('click', e=>{
  const t=e.target.closest('[data-citab]'); if(t){ ciTab=t.dataset.citab; renderCheckin(); return; }
  const el=e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='ci-scan'){ $('#toastRoot').innerHTML=''; ciScanOpen(); }
  if(a==='ci-scan-close'){ ciFromScan=false; ciScanClose(); if(el.closest('.ci2-cam-bot')) setTimeout(()=>$('#ciQ')?.focus(),50); }
  if(a==='ci-clear'){ ciQ=''; renderCheckin(); $('#ciQ')?.focus(); }
  if(a==='ci-menu') ciMenu();
  if(a==='ci-help-ok'){ ciHelpSeen=true; lsSet('sp-ci-help','1'); renderCheckin(); }
  if(a==='ci-help-again'){ ciHelpSeen=false; lsSet('sp-ci-help','0'); closeModal(); renderCheckin(); }
  if(a==='ci-next'){ closeModal(); }
});
document.addEventListener('change', e=>{ if(e.target.id==='ciScan' && e.target.files[0] && $('#ciCam')){ const f=e.target.files[0]; ciScanClose(); ciScanFile(f); e.target.value=''; e.stopImmediatePropagation(); } }, true);

function greet(g){
  const t=themeById(S.theme); const el=document.createElement('div'); el.className='greet'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','Layar sapa tamu'); el.setAttribute('style', themeStyle(t,S.accent,fontOf()));
  el.innerHTML = `<div class="pat"></div><div class="greet-card"><div class="k-label">Selamat datang</div><div class="gname">${esc(g.name)}</div><p>Terima kasih telah hadir di hari bahagia<br><b>${esc(S.bride.nick)} &amp; ${esc(S.groom.nick)}</b></p>${g.checkin.gift?`<div class="gift-no"><small>Nomor kado</small><b class="num">#${String(g.checkin.gift).padStart(3,'0')}</b></div>`:''}<small class="muted-t">${g.checkin.pax} orang · ketuk untuk menutup</small></div>`;
  const close=()=>{ el.remove(); clearTimeout(t1); $('#ciQ')?.focus(); };
  el.addEventListener('click',close); document.body.appendChild(el); const t1=setTimeout(close,5000);
}
async function ciScanFile(file){
  try{
    if(typeof jsQR!=='function'){ try{ await loadLib('jsqr'); }catch(e){ toast('Pemindai QR gagal dimuat. Ketik kode di kartu tamu.'); return; } }
    const url=URL.createObjectURL(file); const img=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
    const max=1000, r=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*r); c.height=Math.round(img.height*r); const x=c.getContext('2d'); x.drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url);
    const d=x.getImageData(0,0,c.width,c.height); const code=jsQR(d.data,c.width,c.height,{inversionAttempts:'attemptBoth'});
    if(!code){ toast('QR tidak terbaca. Coba foto lebih dekat dan terang.'); return; }
    const g=G.find(x=>x.code===code.data.trim()); if(!g){ toast('QR bukan kartu masuk undangan ini'); return; }
    ciOpen(g.id);
  }catch(e){ toast('Foto belum bisa dibaca. Coba sekali lagi, ya.'); }
}
function ciWalkin(){
  openModal(`<h2 class="display" style="font-size:30px">Tamu tambahan</h2><p class="muted" style="margin:6px 0 18px">Untuk tamu yang tidak ada di daftar. Tercatat terpisah di dashboard.</p>
    <form id="wkF" class="fgrid" novalidate><div class="field full"><label for="wk-n">Nama tamu</label><input class="input" id="wk-n" required placeholder="Contoh: Bapak Sutrisno"><span class="err" hidden>Isi nama tamu</span></div>
    <div class="field"><label for="wk-g">Datang sebagai</label><select class="input" id="wk-g">${[...new Set([...(S.groups||[]),...G.map(g=>g.group)])].map(g=>`<option>${esc(g)}</option>`).join('')}<option selected>Tamu tambahan</option></select></div>
    <div class="form-foot full" style="grid-column:1/-1"><button type="button" class="btn btn-ghost" data-act="close">Batal</button><button class="btn btn-primary">Lanjut check-in</button></div></form>`);
  setTimeout(()=>$('#wk-n')?.focus(),60);
  $('#wkF').addEventListener('submit',ev=>{ ev.preventDefault(); const n=$('#wk-n').value.trim(); if(!n){ $('#wk-n').setAttribute('aria-invalid','true'); $('#wkF .err').hidden=false; return; }
    if(ciAuth()){ ciRpc('ci_walkin',{p_name:n, p_grp:$('#wk-g').value, p_session:ciSession}).then(r=>{ if(r.error) return; const g=fromRow(r.data); G.unshift(g); if(CLOUD.inv) CLOUD.lastG.set(g.id, JSON.stringify(toRow(g))); ciOpen(g.id); }); return; }
    const g={id:'w'+Date.now(),name:n,phone:'',group:$('#wk-g').value,status:'hadir',pax:1,sent:false,walkin:true,sessions:[ciSession]}; g.code=makeCode(g); G.unshift(g); saveG(); ciOpen(g.id); });
}
document.addEventListener('input',e=>{ if(e.target.id==='ciQ'){ ciQ=e.target.value; const p=e.target.selectionStart; renderCheckin(); const s=$('#ciQ'); s.focus(); s.setSelectionRange(p,p); } });
document.addEventListener('keydown',e=>{ if(e.target.id==='ciQ' && e.key==='Enter'){ const v=e.target.value.trim().toUpperCase(); const g=G.find(x=>x.code===v) || (ciQ && G.filter(x=>x.name.toLowerCase().includes(ciQ.toLowerCase())).length===1 ? G.find(x=>x.name.toLowerCase().includes(ciQ.toLowerCase())) : null); if(g) ciOpen(g.id); } });
document.addEventListener('change',e=>{ if(e.target.id==='ciSes'){ ciSession=+e.target.value; renderCheckin(); } if(e.target.id==='ciScan' && e.target.files[0]){ ciScanFile(e.target.files[0]); e.target.value=''; } });

/* ---------- Extra click actions ---------- */
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act],[data-bank],[data-wallet],[data-move]'); if(!el) return;
  if(el.dataset.bank){ CO.bank=el.dataset.bank; renderCheckout(); return; }
  if(el.dataset.wallet){ CO.wallet=el.dataset.wallet; renderCheckout(); return; }
  if(el.dataset.move){ const k=el.dataset.move, d=+el.dataset.dir; const o=[...(S.order||DEFAULT.order)]; const i=o.indexOf(k), j=i+d; if(j<0||j>=o.length) return; [o[i],o[j]]=[o[j],o[i]]; S.order=o; save(); renderStep(); refreshPreview(); setTimeout(()=>$(`[data-move="${k}"][data-dir="${d}"]`)?.focus(),0); return; }
  const a=el.dataset.act;
  if(a==='login'){ e.preventDefault(); openAuth(); }
  if(a==='login-co'){ openAuth(()=>renderCheckout(),'publish'); }
  if(a==='google-login' && CLOUD.on){ const hv=location.hash.slice(1); const dest = authMode==='publish' ? 'checkout' : (!hv||['beranda','harga'].includes(hv) ? 'dashboard' : hv); lsSet('sp-after-login', dest); el.disabled=true; el.lastChild.textContent='Menghubungkan ke Google…';
    CLOUD.sb.auth.signInWithOAuth({provider:'google', options:{redirectTo: location.origin+'/', queryParams:{prompt:'select_account'}}}).then(({error})=>{ if(error){ el.disabled=false; el.lastChild.textContent='Lanjut dengan Google'; toast('Login Google belum bisa: '+error.message); } }); return; }
  if(a==='google-login' && !PROTO){ toast(OFFLINE_MSG); return; }
  if(a==='google-login'){ finishLogin(S.bride.name||'Pengguna Google', (S.bride.nick||'pengguna').toLowerCase()+'@gmail.com'); }
  if(a==='logout' && CLOUD.uid){ e.preventDefault(); if(ADM.sso) admSetTok(''); signOutAll(); return; }
  if(a==='logout'){ S.user=null; save(); renderAuthSlot(); toast('Kalian sudah keluar. Sampai jumpa lagi! 👋'); if(['tagihan','checkout'].includes(location.hash.slice(1))) location.hash='beranda'; }
  if(a==='acct-menu'){ const m=$('#acctMenu'); m.hidden=!m.hidden; el.setAttribute('aria-expanded',!m.hidden); return; }
  if(a==='apply-voucher') applyVoucher();
  if(a==='co-back'){ clearInterval(CO.timer); CO.stage='form'; renderCheckout(); }
  if(a==='co-paid' && PROTO) completePayment();
  if(a==='co-resume' && CLOUD.pendingOrder){ snapResume(el); return; }
  if(a==='co-check' && CLOUD.pendingOrder){ clearTimeout(CO.waitT); CO.stage='waiting'; renderCheckout(); waitPaid(CLOUD.pendingOrder); }
  if(a==='co-reset'){ CO.stage='form'; }
  if(a==='co-pick-tamu' || a==='co-pick-plan'){ CO.plan=el.dataset.p||'tamu'; renderCheckout(); }
  if(a==='upgrade'){ closeModal(); CO.stage='form'; if(!S.user) openAuth(()=>{ location.hash='checkout'; },'publish'); else { location.hash='checkout'; if(location.hash==='#checkout') renderCheckout(); } }
  if(a==='inv') invoiceModal(+el.dataset.k);
  if(a==='ci-open') ciOpen(el.dataset.id);
  if(a==='ci-confirm') ciConfirm(el.dataset.id);
  if(a==='ci-walkin') ciWalkin();
  if(a==='pin-rotate' && CLOUD.on && CLOUD.inv){ if(el.dataset.sure!=='1'){ el.dataset.sure='1'; el.textContent='Yakin ganti? Link lama mati'; setTimeout(()=>{ if(el.isConnected){ el.dataset.sure=''; el.textContent='Ganti PIN'; } },3500); return; }
    el.disabled=true; CLOUD.sb.rpc('rotate_checkin_pin').then(({data,error})=>{ el.disabled=false; if(error){ toast('PIN belum bisa diganti: '+error.message); return; } CLOUD.inv.checkin_pin=data; toast('PIN baru siap. Kirim link barunya ke penerima tamu.'); renderDash(); }); return; }
  if(a==='ci-undo' && ciAuth()){ const g=G.find(x=>x.id===el.dataset.id); ciRpc('ci_undo',{p_id:el.dataset.id}).then(r=>{ if(r.error||!g) return; delete g.checkin; if(CLOUD.inv) CLOUD.lastG.set(g.id, JSON.stringify(toRow(g))); closeModal(); if(location.hash==='#checkin'||CLOUD.pinMode) renderCheckin(); else renderDash(); toast('Check-in '+g.name+' dibatalkan'); }); return; }
  if(a==='ci-undo'){ const g=G.find(x=>x.id===el.dataset.id); if(g){ delete g.checkin; saveG(); closeModal(); if(location.hash==='#checkin') renderCheckin(); else renderDash(); toast('Check-in '+g.name+' dibatalkan'); } }
  if(a==='groups') groupsModal();
  if(a==='grp-del'){ const gname=el.dataset.g, ids=G.filter(g=>g.group===gname).map(g=>g.id), had=(S.groups||[]).includes(gname);
    G.forEach(g=>{ if(g.group===gname) g.group='Tanpa grup'; }); S.groups=(S.groups||[]).filter(x=>x!==gname); if(gGroup===gname) gGroup='semua'; saveG(); save(); groupsModal(); renderDash();
    toast(`Grup ${gname} dihapus${ids.length?`, ${ids.length} tamu pindah ke Tanpa grup`:''}`, ()=>{ G.forEach(g=>{ if(ids.includes(g.id)) g.group=gname; }); if(had && !(S.groups||[]).includes(gname)) S.groups=[...(S.groups||[]), gname]; saveG(); save(); if($('.grp-list')) groupsModal(); renderDash(); }); }
  if(a==='guest-menu') guestModal(el.dataset.id);
  if(a==='del-guest'){ const i=G.findIndex(x=>x.id===el.dataset.id); if(i>-1){ const g=G[i]; G.splice(i,1); sel.delete(g.id); saveG(); closeModal(); renderDash(); toast(g.name+' dihapus', ()=>{ if(!G.some(x=>x.id===g.id)){ G.splice(Math.min(i,G.length),0,g); saveG(); renderDash(); toast(g.name+' dikembalikan'); } }); } }
  if(a==='view-as'){ guestId = el.dataset.id || null; closeModal(); location.hash='undangan'; if(location.hash==='#undangan') renderGuest(); }
  if(a==='import-help') importHelp();
});
document.addEventListener('click', e=>{ const m=$('#acctMenu'); if(m && !m.hidden && !e.target.closest('.acct')) m.hidden=true; });

/* ---------- Cloud: Supabase + Midtrans ---------- */
const DATA_KEYS = ['groom','bride','events','opening','theme','accent','font','order','gift','wishesOn','music','musicSrc','musicStart','catering','arriveOn','wishlist','story','fontPair','waTpl','waTplR','albumOn','thanksMsg','thanksMsg2','thanked','gallery','galleryOn','groups','slug','quote','quoteMode','seats','seatsDefault','memMode','memMsg','cx','liveTheme','oldSlugs'];
const pickData = () => { const d={}; DATA_KEYS.forEach(k=>{ if(S[k]!==undefined) d[k]=S[k]; }); return d; };
const toRow = g => ({invitation_id:CLOUD.inv.id, id:g.id, name:g.name, phone:g.phone||'', grp:g.group||'Tanpa grup', sessions:g.sessions||[], code:g.code, status:g.status, pax:g.pax||0, sent:!!g.sent, walkin:!!g.walkin, checkin:g.checkin||null, fam:g.fam||null, approved:g.approved!==false, arrive:g.arrive||''});
const fromRow = r => { const g={id:r.id, name:r.name, phone:r.phone||'', group:r.grp||'Tanpa grup', sessions:r.sessions||[], code:r.code, status:r.status||'belum', pax:r.pax||0, sent:!!r.sent, walkin:!!r.walkin, fam:r.fam||null, arrive:r.arrive||''}; if(r.approved===false) g.approved=false; if(r.checkin) g.checkin=r.checkin; return g; };
function relTime(iso){ const d=(Date.now()-new Date(iso))/1000; if(d<60) return 'baru saja'; if(d<3600) return Math.floor(d/60)+' menit lalu'; if(d<86400) return Math.floor(d/3600)+' jam lalu'; if(d<172800) return 'kemarin'; return fmtShort(String(iso).slice(0,10)); }
function loadScript(src, attrs={}){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; Object.entries(attrs).forEach(([k,v])=>s.setAttribute(k,v)); s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
const setSaveState = t => { const el=$('#saveState'); if(el) el.textContent=t; };
async function cloudInit(){
  if(!/^https?:$/.test(location.protocol)) return;
  /* konfigurasi publik: disisipkan server di halaman undangan (tanpa permintaan tambahan), selain itu dari /api/config (di-cache di tepi) */
  let cfg = window.__SK_CFG || null;
  if(!cfg){ try{ const r=await fetch('/api/config'); if(!r.ok) return; cfg=await r.json(); }catch(e){ return; } }
  if(!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
  if(!window.supabase){ try{ await loadScript('/assets/vendor/supabase.js'); }catch(e){ return; } }
  CLOUD.cfg=cfg; CLOUD.sb=window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}}); CLOUD.on=true;
  const m = location.pathname.match(/^\/u\/([a-z0-9-]+)(\/(?:checkin|keluarga|katering|album))?\/?$/);
  /* halaman tamu: pengaturan aplikasi, data undangan, dan progres kado diambil bersamaan */
  if(m && !m[2]){ CLOUD.slug=m[1]; const qs=new URLSearchParams(location.search); CLOUD.guestMode=true; CLOUD.code=(qs.get('to')||'').toUpperCase();
    CLOUD.wlpP = CLOUD.sb.rpc('wishlist_progress',{p_slug:CLOUD.slug}).then(r=>r.data||{}, ()=>({}));
    await Promise.all([loadAppConfig(), guestLoad()]); if(!CLOUD.notFound) reapplyConfig(); return; }
  await loadAppConfig();
  if(m){
    CLOUD.slug=m[1]; const qs=new URLSearchParams(location.search);
    if(m[2]==='/album'){ CLOUD.albumMode=true; await albumLoad(); setInterval(()=>{ if(!AP.busy && !document.querySelector('.al-lb') && document.activeElement?.id!=='alName') albumLoad().then(()=>{ if(!AP.err){ const n=$('#alName')?.value; renderAlbum(); if(n!==undefined && $('#alName')) $('#alName').value=n; } }); }, 30000); return; }
    if(m[2]==='/keluarga'){ CLOUD.famMode=true; FP.token=qs.get('k')||''; await famPageLoad(); return; }
    if(m[2]==='/katering'){ CLOUD.catMode=true; CP.token=qs.get('k')||''; await catPageLoad(); setInterval(()=>catPageLoad().then(()=>{ if(!CP.err) renderCatPage(); }), 60000); return; }
    if(m[2]){ CLOUD.pinMode=true; CLOUD.pin=qs.get('pin')||''; await pinLoad(); setInterval(()=>{ if(!CLOUD.needPin) pinLoad().then(liveRefresh); }, 8000); }
    else { CLOUD.guestMode=true; CLOUD.code=(qs.get('to')||'').toUpperCase(); await guestLoad(); }
    return;
  }
  const { data:{ session } } = await CLOUD.sb.auth.getSession();
  if(session){ await ownerLoad(session.user); await admSso(); }
  const after = lsGet('sp-after-login'); if(after){ try{ localStorage.removeItem('sp-after-login'); }catch(e){} if(session){ history.replaceState(null,'',location.pathname+'#'+after); } }
  // Pulang dari login Google: langsung tampilkan tujuan (dashboard), tanpa sempat lewat beranda
  if(document.documentElement.classList.contains('boot-oauth') && !session && /access_token=|[?&]code=/.test(location.hash+location.search)) history.replaceState(null,'',location.pathname+'#beranda');
  const oauthErr = new URLSearchParams(location.hash.slice(1)||location.search).get('error_description'); if(oauthErr){ history.replaceState(null,'',location.pathname+'#beranda'); setTimeout(()=>toast('Login belum berhasil. Coba sekali lagi, ya.'),400); }
  CLOUD.sb.auth.onAuthStateChange((ev, s)=>{ if(ev==='SIGNED_IN' && s && CLOUD.uid!==s.user.id){ demoAfterLogin(s.user.id); ownerLoad(s.user).then(()=>{ admSso(); if(!location.hash || location.hash==='#') location.hash='#dashboard'; route(); if(!(s.user.user_metadata&&s.user.user_metadata.name)) nameStep(); else { closeModal(); renderAuthSlot(); } }); } });
}
async function storePhoto(dataUrl){
  if(!(CLOUD.on && CLOUD.uid) || !String(dataUrl).startsWith('data:')) return dataUrl;
  try{
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${CLOUD.uid}/${(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2))}.jpg`;
    const { error } = await CLOUD.sb.storage.from('photos').upload(path, blob, {contentType:'image/jpeg', upsert:false, cacheControl:'31536000'});
    if(error) throw error;
    return CLOUD.sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
  }catch(e){ toast('Upload foto gagal: '+(e.message||'coba lagi')); return null; }
}
async function ownerLoad(user){
  const sb=CLOUD.sb; CLOUD.uid=user.id;
  S.user={id:user.id, name:(user.user_metadata&&user.user_metadata.name)||user.email.split('@')[0], email:user.email};
  let { data:inv } = await sb.from('invitations').select('*').eq('owner',user.id).maybeSingle();
  if(!inv){
    if(S.wishlist && S.wishlist.demo) S.wishlist={on:false, items:[]};
    if(S.story && S.story.demo) S.story={on:false, items:[]};
    for(const who of ['bride','groom']) if(S[who].photo) S[who].photo = await storePhoto(S[who].photo) || undefined;
    if(S.gallery && S.gallery.length) S.gallery = (await Promise.all(S.gallery.map(storePhoto))).filter(Boolean);
    let slug = (S.slug||'undangan').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/^-+/,'').slice(0,36) || 'undangan';
    if(slug.length<3) slug = slug+'-sp';
    for(let i=0;i<6 && !inv;i++){
      const r = await sb.from('invitations').insert({slug, data:{...pickData(), slug}}).select().single();
      if(!r.error){ inv=r.data; break; }
      if(r.error.code==='23505'){ slug=(S.slug||'undangan').slice(0,32)+'-'+Math.random().toString(36).slice(2,5); continue; }
      toast('Gagal menyimpan ke akun: '+r.error.message); return;
    }
    if(!inv) return;
    G=[]; W=[]; GIFTS=[]; S.invoices=[]; S.giftNo=0;
  }
  CLOUD.inv=inv;
  Object.assign(S, scrubUrls(inv.data||{}), {slug:inv.slug, published:inv.published, giftNo:inv.gift_no});
  if(!(inv.data||{}).wishlist) S.wishlist={on:false, items:[]};
  if(!(inv.data||{}).story) S.story={on:false, items:[]};
  if(!(inv.data||{}).thanked) S.thanked=[];
  if(inv.plan!=='coba') S.plan=inv.plan;
  setTimeout(reapplyConfig,0);
  const [g,w,gf,iv,fm] = await Promise.all([
    sb.from('guests').select('*').eq('invitation_id',inv.id).order('created_at',{ascending:false}),
    sb.from('wishes').select('*').eq('invitation_id',inv.id).order('created_at',{ascending:false}),
    sb.from('gift_confirmations').select('*').eq('invitation_id',inv.id).order('created_at',{ascending:false}),
    sb.from('invoices').select('*').order('created_at',{ascending:false}),
    sb.from('families').select('*').eq('invitation_id',inv.id).order('created_at')]);
  S.families = (fm.data||[]).map(x=>({id:x.id, name:x.name, quota:x.quota, token:x.token}));
  G = (g.data||[]).map(fromRow);
  /* grup contoh (Keluarga Sarah, Kantor Raka, …) tidak dipakai di akun asli bila belum ada tamu di dalamnya */
  if(Array.isArray(S.groups) && S.groups.some(x=>GROUPS.includes(x))){ const used=new Set(G.map(x=>x.group)); const keep=S.groups.filter(x=>!GROUPS.includes(x) || used.has(x)); if(keep.length!==S.groups.length){ S.groups = keep.length ? keep : [...GROUPS_REAL]; save(); } }
  if(Array.isArray(S.groups) && !S.groups.length) S.groups=[...GROUPS_REAL];
  CLOUD.lastG = new Map(G.map(x=>[x.id, JSON.stringify(toRow(x))]));
  W = (w.data||[]).map(x=>({id:x.id, n:x.name, m:x.message, t:relTime(x.created_at), att:x.attending, show:!x.hidden}));
  GIFTS = (gf.data||[]).map(x=>({n:x.name, bank:x.bank, amt:Number(x.amount), t:fmtDT(x.created_at)}));
  const ivs = iv.data||[];
  S.invoices = ivs.filter(x=>x.status==='paid').map(x=>({no:x.id, date:x.paid_at||x.created_at, item:x.item, price:x.price, disc:x.discount, voucher:x.voucher, total:x.total, method:x.method, status:'Lunas', upgrade:/Upgrade/.test(x.item)}));
  const pend = ivs.find(x=>x.status==='pending' && Date.now()-new Date(x.created_at) < 60*60*1000);
  CLOUD.pendingOrder = pend ? pend.id : null;
  { const lastPaid = ivs.filter(x=>x.status==='paid' && x.invitation_id===inv.id).sort((a,b)=>new Date(b.paid_at||b.created_at)-new Date(a.paid_at||a.created_at))[0];
    if(lastPaid && (lastPaid.plan!==inv.plan || !inv.published)) planSync(); }
  try{ await extraOwnerLoad(inv); }catch(e){ console.warn('extra load', e); }
  subscribeRealtime(); renderAuthSlot();
}
/* Paket di undangan belum sama dengan tagihan lunas terakhir (mis. konfirmasi pembayaran gagal menyimpan paket): minta server menyamakannya. */
async function planSync(){
  try{ const { data:{ session } } = await CLOUD.sb.auth.getSession(); if(!session) return;
    const r = await fetch('/api/pay/sync',{method:'POST', headers:{Authorization:'Bearer '+session.access_token}}); const j = await r.json().catch(()=>({}));
    if(!r.ok){ console.warn('plan sync', j.error); toast('Paket belum aktif: '+(j.error||'coba muat ulang halaman')); return; }
    if(j.plan){ S.plan=j.plan; S.published=!!j.published; if(j.plan==='custom'){ delete S.liveTheme; save(); } if(CLOUD.inv){ CLOUD.inv.plan=j.plan; CLOUD.inv.published=!!j.published; } store.set('sp-state',S); reapplyConfig(); if(j.changed) toast('Paket '+((planOf(j.plan)||{}).name||j.plan)+' sudah aktif'); route(); }
  }catch(e){ console.warn('plan sync', e); }
}
let csT;
function cloudSave(){
  if(!CLOUD.on || !CLOUD.inv || CLOUD.guestMode || CLOUD.pinMode) return;
  setSaveState('Menyimpan…'); clearTimeout(csT); csT=setTimeout(cloudSaveNow, 900);
}
async function cloudSaveNow(){
  if(!CLOUD.on || !CLOUD.inv) return; clearTimeout(csT);
  const r = await CLOUD.sb.from('invitations').update({data:pickData(), slug:S.slug}).eq('id',CLOUD.inv.id).select('slug').single();
  if(r.error){
    if(r.error.code==='23505') toast(`Alamat ${S.slug} sudah dipakai. Coba alamat lain.`);
    else if(r.error.code==='23514') toast('Alamat minimal 3 karakter, hanya huruf kecil, angka, dan strip');
    else toast('Gagal menyimpan: '+r.error.message);
    setSaveState('Belum tersimpan');
  } else { const old=CLOUD.inv.slug; CLOUD.inv.slug=r.data.slug; setSaveState('Tersimpan ke akun'); if(old!==r.data.slug){ $$('#edPub a[href]').forEach(a=>a.href=pubURL()); if(old && S.published){ S.oldSlugs=[...new Set([...(S.oldSlugs||[]), old])].filter(x=>x!==r.data.slug).slice(-10); save(); } } }
}
let cgT;
function cloudSyncGuests(){ if(!CLOUD.on || !CLOUD.inv || CLOUD.guestMode || CLOUD.pinMode) return; clearTimeout(cgT); cgT=setTimeout(cloudSyncGuestsNow, 500); }
async function cloudSyncGuestsNow(){
  if(!CLOUD.on || !CLOUD.inv) return; clearTimeout(cgT);
  const cur = new Map(G.map(g=>[g.id, JSON.stringify(toRow(g))]));
  const up=[]; for(const [id,j] of cur) if(CLOUD.lastG.get(id)!==j) up.push(JSON.parse(j));
  const del=[...CLOUD.lastG.keys()].filter(id=>!cur.has(id));
  const prev = CLOUD.lastG; CLOUD.lastG = cur;
  try{
    for(let i=0;i<up.length;i+=500){ const { error } = await CLOUD.sb.from('guests').upsert(up.slice(i,i+500), {onConflict:'invitation_id,id'}); if(error) throw error; }
    if(del.length){ const { error } = await CLOUD.sb.from('guests').delete().eq('invitation_id',CLOUD.inv.id).in('id',del); if(error) throw error; }
  }catch(e){ CLOUD.lastG = prev; toast('Daftar tamu gagal tersimpan: '+(e.message||'coba lagi')); }
}
function subscribeRealtime(){
  const sb=CLOUD.sb, id=CLOUD.inv.id;
  if(CLOUD.ch) sb.removeChannel(CLOUD.ch);
  CLOUD.ch = sb.channel('inv-'+id)
    .on('postgres_changes',{event:'*',schema:'public',table:'guests',filter:`invitation_id=eq.${id}`}, p=>{ if(DEMO.on) return;
      if(p.eventType==='DELETE'){ if(p.old&&p.old.id){ G=G.filter(x=>x.id!==p.old.id); CLOUD.lastG.delete(p.old.id); } }
      else { const g=fromRow(p.new); const i=G.findIndex(x=>x.id===g.id); if(i>-1) G[i]=g; else G.unshift(g); CLOUD.lastG.set(g.id, JSON.stringify(toRow(g))); }
      liveRefresh(); })
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'wishes',filter:`invitation_id=eq.${id}`}, p=>{ if(DEMO.on) return;
      if(!W.some(w=>w.id===p.new.id)) W.unshift({id:p.new.id, n:p.new.name, m:p.new.message, t:'baru saja', att:p.new.attending, show:!p.new.hidden}); liveRefresh(); })
    .subscribe();
}
function liveRefresh(){
  if($('#modalRoot').innerHTML) return;
  const h=location.hash.slice(1);
  if((h==='checkin' || CLOUD.pinMode) && document.activeElement?.id!=='ciQ' && !document.getElementById('ciCam')) renderCheckin();
  else if(h==='dashboard' && !['gSearch'].includes(document.activeElement?.id)) renderDash();
}
/* URL dari data undangan (foto, musik, peta) bisa ditulis siapa saja lewat API database:
   hanya skema aman yang dipakai, dan karakter yang bisa keluar dari atribut/CSS di-encode. */
const URL_KEY = /(photo|cover|gallery|galeri|src|img|image|url|music|foto|avatar|thumb)/i, URL_SKIP = /(title|text|caption|label|pos|start|fg|on|mode|name|alt|note)$/i;
function safeUrl(u){ u=String(u??'').trim(); if(!u) return ''; if(!/^(https?:\/\/|\/(?!\/)|data:image\/(png|jpe?g|webp|gif);base64,|blob:)/i.test(u)) return '';
  return u.replace(/[\s"'<>`\\()]/g, c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0').toUpperCase()); }
function scrubUrls(o, hint){
  if(Array.isArray(o)) return o.map(v=>scrubUrls(v, hint));
  if(o && typeof o==='object'){ const r={}; for(const k in o) r[k]=scrubUrls(o[k], URL_SKIP.test(k) ? false : (hint||URL_KEY.test(k))); return r; }
  return (hint && typeof o==='string') ? safeUrl(o) : o;
}
async function guestLoad(){
  const { data, error } = await CLOUD.sb.rpc('get_public_invitation',{p_slug:CLOUD.slug, p_code:CLOUD.code||null});
  if(error || !data){ CLOUD.notFound=true; return; }
  /* mulai dari data bawaan, bukan draf Sakara milik pengunjung yang kebetulan tersimpan di browsernya */
  for(const k of Object.keys(S)) delete S[k]; Object.assign(S, structuredClone(DEFAULT), {user:null});
  Object.assign(S, scrubUrls(data.data||{})); S.published=true; S.plan=data.plan; reapplyConfig();
  if(isCx(S.theme) && S.plan!=='custom' && S.liveTheme && !isCx(S.liveTheme)) S.theme=S.liveTheme;
  if(!(data.data||{}).wishlist) S.wishlist={on:false, items:[]};
  if(!(data.data||{}).story) S.story={on:false, items:[]};
  try{ await extraGuestLoad(); }catch(e){}
  W = (data.wishes||[]).map(x=>({n:x.name, m:x.message, t:relTime(x.created_at), att:x.attending, show:true}));
  CLOUD.guest = data.guest ? fromRow({...data.guest}) : null;
  G = CLOUD.guest ? [CLOUD.guest] : [];
  document.title = `Undangan ${S.bride.nick||''} & ${S.groom.nick||''}`;
}
async function pinLoad(){
  if(!CLOUD.pin){ CLOUD.needPin=true; return; }
  const { data, error } = await CLOUD.sb.rpc('ci_guests',{p_slug:CLOUD.slug, p_pin:CLOUD.pin});
  if(error){ CLOUD.pinError=error.message; CLOUD.needPin=true; return; }
  if(data && data.error){ CLOUD.pinError=data.error; CLOUD.needPin=true; return; }
  CLOUD.needPin=false; CLOUD.pinError=null;
  Object.assign(S, scrubUrls(data.data||{})); S.giftNo=data.gift_no; S.plan='tamu'; S.published=true;
  G = (data.guests||[]).map(fromRow);
}
const ciAuth = () => CLOUD.on ? (CLOUD.pinMode ? {p_slug:CLOUD.slug, p_pin:CLOUD.pin} : (CLOUD.inv ? {p_slug:CLOUD.inv.slug, p_pin:CLOUD.inv.checkin_pin} : null)) : null;
async function ciRpc(fn, args){ const a=ciAuth(); if(!a) return {local:true}; if(!CLOUD.pinMode) await cloudSyncGuestsNow(); const { data, error } = await CLOUD.sb.rpc(fn, {...a, ...args}); if(error){ toast(error.message); return {error}; } if(data && data.error){ toast(data.error==='PIN salah'?'PIN penerima tamu sudah diganti. Muat ulang halaman ini.':data.error); return {error:{message:data.error}}; } return {data}; }
function ensureSnap(){
  if(window.snap) return Promise.resolve();
  const src = CLOUD.cfg.midtransProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';
  return loadScript(src, {'data-client-key':CLOUD.cfg.midtransClientKey});
}
function snapOpen(token, orderId, reset){
  window.snap.pay(token, {
    onSuccess:()=>{ CO.stage='waiting'; renderCheckout(); waitPaid(orderId); },
    onPending:()=>{ CO.stage='waiting'; renderCheckout(); waitPaid(orderId); },
    onError:()=>{ reset&&reset(); toast('Pembayaran belum berhasil. Coba pakai metode lain, ya.'); },
    onClose:()=>{ reset&&reset(); renderCheckout(); toast('Pembayaran belum selesai. Kalian bisa melanjutkannya dari halaman ini.'); }
  });
}
async function snapResume(btn){
  const id=CLOUD.pendingOrder; if(!id) return; if(btn){ btn.disabled=true; }
  try{ const { data } = await CLOUD.sb.from('invoices').select('snap_token,status').eq('id',id).maybeSingle();
    if(!data || data.status!=='pending' || !data.snap_token){ if(btn) btn.disabled=false; toast('Pembayaran ini tidak bisa dilanjutkan. Tekan Bayar untuk membuat yang baru.'); CLOUD.pendingOrder=null; renderCheckout(); return; }
    await ensureSnap(); snapOpen(data.snap_token, id, ()=>{ if(btn) btn.disabled=false; });
  }catch(e){ if(btn) btn.disabled=false; toast('Gagal memuat pembayaran: '+(e.message||'periksa koneksi')); }
}
async function cloudPay(btn){
  if(!CLOUD.cfg.midtransClientKey){ toast('Pembayaran belum dikonfigurasi di server'); return; }
  const reset = () => { btn.disabled=false; btn.textContent=btn.dataset.label; };
  btn.dataset.label=btn.textContent; btn.disabled=true; btn.textContent='Menyiapkan pembayaran…';
  try{
    await cloudSaveNow();
    const { data:{ session } } = await CLOUD.sb.auth.getSession();
    if(!session){ reset(); openAuth(()=>renderCheckout(),'publish'); return; }
    const r = await fetch('/api/pay/create',{method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer '+session.access_token}, body:JSON.stringify({plan:coItems().plan, voucher:CO.applied||'', method:CO.method})});
    const j = await r.json().catch(()=>({}));
    if(!r.ok){ reset(); toast(j.error||'Gagal membuat pembayaran'); return; }
    await ensureSnap();
    CLOUD.pendingOrder=j.orderId;
    if(j.resumed) toast('Melanjutkan pembayaran yang belum selesai');
    snapOpen(j.token, j.orderId, reset);
  }catch(e){ reset(); toast('Gagal memuat pembayaran: '+(e.message||'periksa koneksi')); }
}
async function waitPaid(orderId, tries=0){
  const { data } = await CLOUD.sb.from('invoices').select('*').eq('id',orderId).maybeSingle();
  if(data && data.status==='paid'){
    let { data:inv } = await CLOUD.sb.from('invitations').select('*').eq('id',CLOUD.inv.id).single();
    for(let k=0; k<6 && inv && (inv.plan!==data.plan || !inv.published); k++){ await new Promise(r=>setTimeout(r,1500)); ({ data:inv } = await CLOUD.sb.from('invitations').select('*').eq('id',CLOUD.inv.id).single()); }
    S.plan = data.plan || (inv&&inv.plan) || S.plan; S.published = true; if(S.plan==='custom') delete S.liveTheme; if(inv) CLOUD.inv={...inv, plan:S.plan, published:true};
    S.invoices = [{no:data.id, date:data.paid_at||data.created_at, item:data.item, price:data.price, disc:data.discount, voucher:data.voucher, total:data.total, method:data.method, status:'Lunas', upgrade:/Upgrade/.test(data.item)}, ...(S.invoices||[]).filter(x=>x.no!==data.id)];
    CLOUD.pendingOrder=null; CO.stage='done'; store.set('sp-state',S); renderCheckout(); return;
  }
  if(data && ['expired','failed'].includes(data.status)){ CLOUD.pendingOrder=null; CO.stage='form'; toast('Pembayaran kedaluwarsa atau belum berhasil. Silakan buat ulang, ya.'); renderCheckout(); return; }
  /* Virtual Account berlaku 60 menit: cek tiap 3 detik di awal, lalu tiap 15 detik */
  if(tries>300) return;
  CO.waitT = setTimeout(()=>waitPaid(orderId, tries+1), tries<60 ? 3000 : 15000);
}

/* ================= Kado patungan · Album tamu · Buku kenangan · Terima kasih · Kartu cetak ================= */
const rpShort = n => { n=Math.round(n||0); if(n>=1e6){ const v=n/1e6; return 'Rp'+(v>=10?Math.round(v):(Math.round(v*100)/100)).toLocaleString('id-ID')+' jt'; } if(n>=1e3) return 'Rp'+Math.round(n/1e3).toLocaleString('id-ID')+' rb'; return 'Rp'+n; };
const digits = v => parseInt(String(v||'').replace(/\D/g,''),10)||0;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));
const THX_DEF = 'Halo {nama},\n\nTerima kasih sudah hadir di {sesi} kami. Doa dan kehadiran Anda membuat hari itu makin berarti untuk kami berdua.\n\nSalam hangat,\n{pasangan}';
const THX_DEF2 = 'Halo {nama},\n\nTerima kasih atas doa dan perhatian Anda untuk pernikahan kami. Semoga kita bisa segera bertemu, ya.\n\nSalam hangat,\n{pasangan}';
if(!S.wishlist) S.wishlist = {on:false, items:[]};
if(!S.wlInit){ S.wlInit=true; S.wishlist={on:true, demo:true, items:[{id:'k1',name:'Kulkas dua pintu',price:6000000,note:'Untuk dapur rumah baru kami'},{id:'k2',name:'Mesin cuci',price:4500000,note:''},{id:'k3',name:'Set alat masak',price:1500000,note:'Panci, wajan, dan pisau'}]}; }
if(S.albumOn===undefined) S.albumOn=true;
if(!S.thanked) S.thanked=[];
function secOrder(){ const o=S.order||(S.order=DEFAULT.order.slice()); if(!o.includes('kado')){ const i=o.indexOf('hadiah'); o.splice(i<0?o.length:i+1,0,'kado'); } if(!o.includes('cerita')){ const i=o.indexOf('acara'); o.splice(i<0?1:i+1,0,'cerita'); } return o; }
const PL_DEMO = [{id:'p1',item:'k1',name:'Om Darmawan',amount:1000000,msg:'Semoga awet seperti kulkasnya',t:new Date(Date.now()-864e5).toISOString()},{id:'p2',item:'k1',name:'Teman kantor Raka',amount:1500000,msg:'Patungan anak-anak divisi',t:new Date(Date.now()-36e5*5).toISOString()},{id:'p3',item:'k3',name:'Hana Halim',amount:500000,msg:'',t:new Date(Date.now()-36e5*2).toISOString()},{id:'p4',item:'k3',name:'Fitri Rahayu',amount:1000000,msg:'Selamat ya!',t:new Date(Date.now()-36e5).toISOString()}];
let PL = store.get('sp-pledges') || PL_DEMO;
let WLP = null;
let ALB = store.get('sp-album') || [];
const localMode = () => !DEMO.on && !CLOUD.uid && !CLOUD.guestMode && !CLOUD.albumMode;
const savePL = () => { if(localMode()) store.set('sp-pledges', PL); };
const saveALB = () => { if(localMode() && !store.set('sp-album', ALB)) toast('Memori browser penuh. Di versi online foto disimpan di server.'); };
function wlProg(id){
  if(WLP) return WLP[id] || {sum:0,n:0,names:[]};
  const a=PL.filter(p=>p.item===id && !p.hidden); return {sum:a.reduce((s,p)=>s+p.amount,0), n:a.length, names:a.map(p=>p.name.split(' ')[0])};
}

/* ---------- Kado patungan: bagian undangan ---------- */
function kadoCard(it){
  const p=wlProg(it.id), price=Math.max(1,it.price||0), pct=Math.min(100,Math.round(p.sum/price*100)), full=p.sum>=price;
  return `<div class="kd${full?' full':''}" data-kd="${esc(it.id)}">
    <div class="kd-top">${it.img?`<span class="kd-img" style="background-image:url(${esc(it.img)})"></span>`:`<span class="kd-img ph">${ico('gift')}</span>`}<div class="kd-t"><b>${esc(it.name)}</b>${it.note?`<small>${esc(it.note)}</small>`:''}</div></div>
    <div class="kd-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Terkumpul ${pct}%"><span style="width:${pct}%"></span></div>
    <div class="kd-meta"><span><b>${rpShort(p.sum)}</b> dari ${rpShort(price)}</span><span>${p.n?`${p.n} orang ikut`:'Belum ada yang ikut'}</span></div>
    ${full?`<div class="kd-done">${ico('check')}Sudah terpenuhi. Terima kasih semuanya!</div>`:`<button type="button" class="ibtn kd-go" data-act="kd-open" data-id="${esc(it.id)}">${ico('gift')}Ikut patungan</button>`}
    <div data-kdform></div></div>`;
}
function kadoSecHTML(id){
  const w=S.wishlist; if(!w || !w.on || !(w.items||[]).length) return '';
  return `<section id="${id}-kado"><h3>Kado patungan</h3><p class="lead">Kami sedang mulai mengisi rumah baru. Bila berkenan, Anda dapat ikut patungan untuk salah satu kebutuhan berikut, berapa pun nominalnya.</p>
    <div class="kd-list">${w.items.map(kadoCard).join('')}</div>
    <p class="kd-note">Progres terlihat oleh semua tamu, jadi tidak ada kado yang dobel. Nominal per orang tidak ditampilkan.</p></section>`;
}
let KD = {};
function kdStep(card, it, step){
  const box=card.querySelector('[data-kdform]'); const p=wlProg(it.id); const left=Math.max(0,(it.price||0)-p.sum);
  const guest = (guestObj && guestObj()) ? guestObj().name : '';
  if(step===1){
    const opts=[100000,250000,500000,1000000].filter(v=>v<left); if(left>=10000) opts.push(left);
    const amt = KD.amt || opts[1] || opts[0] || left;
    box.innerHTML = `<form class="form kd-f" data-kdf novalidate>
      <span class="kd-lbl">Mau ikut berapa?</span>
      <div class="kd-amts" role="group" aria-label="Pilih nominal">${opts.map(v=>`<button type="button" data-kdamt="${v}" aria-pressed="${v===amt}">${v===left?`Sisanya · ${rpShort(v)}`:rpShort(v)}</button>`).join('')}</div>
      <label for="kd-a">Atau tulis nominal</label><input class="in" id="kd-a" inputmode="numeric" value="${amt.toLocaleString('id-ID')}">
      <label for="kd-n">Nama</label><input class="in" id="kd-n" value="${esc(KD.name||guest||'')}" placeholder="Nama yang ditampilkan" required>
      <label for="kd-m">Pesan (opsional)</label><input class="in" id="kd-m" maxlength="140" value="${esc(KD.msg||'')}" placeholder="Semoga bermanfaat untuk rumah baru">
      <p class="kd-err" hidden></p>
      <div class="kd-acts"><button type="button" class="ibtn" data-act="kd-cancel">Batal</button><button class="ibtn solid">Lanjut</button></div></form>`;
    const f=box.querySelector('[data-kdf]'), a=f.querySelector('#kd-a');
    f.addEventListener('click',ev=>{ const b=ev.target.closest('[data-kdamt]'); if(!b) return; a.value=(+b.dataset.kdamt).toLocaleString('id-ID'); f.querySelectorAll('[data-kdamt]').forEach(x=>x.setAttribute('aria-pressed', x===b)); });
    a.addEventListener('input',()=>{ const v=digits(a.value); a.value=v?v.toLocaleString('id-ID'):''; f.querySelectorAll('[data-kdamt]').forEach(x=>x.setAttribute('aria-pressed', +x.dataset.kdamt===v)); });
    f.addEventListener('submit',ev=>{ ev.preventDefault(); const v=digits(a.value), n=f.querySelector('#kd-n').value.trim(), er=f.querySelector('.kd-err');
      if(v<10000){ er.textContent='Minimal Rp10.000'; er.hidden=false; a.focus(); return; }
      if(!n){ er.textContent='Tulis nama Anda supaya pengantin tahu dari siapa'; er.hidden=false; f.querySelector('#kd-n').focus(); return; }
      KD={id:it.id, amt:v, name:n, msg:f.querySelector('#kd-m').value.trim()}; kdStep(card,it,2); });
    setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'nearest'}),30);
  }
  if(step===2){
    const g=S.gift||{};
    box.innerHTML = `<div class="kd-pay"><span class="kd-lbl">Silakan transfer ${esc(rupiah(KD.amt))} ke</span>
      <div class="bank"><div class="bn">${esc(g.bank||'Rekening')}</div><div class="row"><div class="ac">${esc((g.acct||'—').replace(/(\d{4})(?=\d)/g,'$1 '))}</div></div><div style="font-size:13px;opacity:.8">a.n. ${esc(g.holder||'')}</div>${g.acct?`<button type="button" class="ibtn bank-copy" data-act="copy" data-v="${esc(g.acct)}" aria-label="Salin nomor rekening">${ico('copy')}Salin</button>`:''}</div>
      <p class="kd-hint">Setelah transfer, ketuk tombol di bawah supaya progres bertambah dan tamu lain tidak membeli barang yang sama.</p>
      <div class="kd-acts"><button type="button" class="ibtn" data-act="kd-back">Ubah</button><button type="button" class="ibtn solid" data-act="kd-confirm">Catat patungan saya</button></div></div>`;
  }
}
async function kdConfirm(card, it){
  const btn=card.querySelector('[data-act=kd-confirm]'); if(btn){ btn.disabled=true; btn.textContent='Menyimpan…'; }
  if(CLOUD.on && CLOUD.guestMode){
    const { data, error } = await CLOUD.sb.rpc('pledge',{p_slug:CLOUD.slug, p_item:it.id, p_name:KD.name, p_amount:KD.amt, p_message:KD.msg||''});
    if(error){ if(btn){ btn.disabled=false; btn.textContent='Catat patungan saya'; } toast('Gagal mencatat: '+error.message); return; }
    WLP=data||{};
  } else { PL.unshift({id:'p'+Date.now(), item:it.id, name:KD.name, amount:KD.amt, msg:KD.msg||'', t:new Date().toISOString()}); savePL(); }
  const done={...KD}; KD={};
  card.outerHTML = kadoCard(it); const nc=$(`[data-kd="${CSS.escape(it.id)}"]`);
  if(nc){ nc.querySelector('[data-kdform]').innerHTML = `<div class="ok-box kd-ok"><b>Terima kasih, ${esc(done.name)}!</b><p>Patungan Anda ${esc(rupiah(done.amt))} untuk ${esc(it.name)} sudah tercatat. Pengantin akan mencocokkannya dengan mutasi rekening.</p></div>`; const bar=nc.querySelector('.kd-bar span'); if(bar){ const w=bar.style.width; bar.style.width='0'; requestAnimationFrame(()=>requestAnimationFrame(()=>bar.style.width=w)); } }
}
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(!['kd-open','kd-cancel','kd-back','kd-confirm'].includes(a)) return;
  const card=el.closest('[data-kd]'); if(!card) return; const it=(S.wishlist.items||[]).find(x=>x.id===card.dataset.kd); if(!it) return;
  if(a==='kd-open'){ $$('[data-kdform]').forEach(b=>{ if(!card.contains(b)) b.innerHTML=''; }); $$('.kd-go').forEach(b=>b.hidden=false); el.hidden=true; if(KD.id!==it.id) KD={}; kdStep(card,it,1); }
  if(a==='kd-cancel'){ card.querySelector('[data-kdform]').innerHTML=''; const g=card.querySelector('.kd-go'); if(g){ g.hidden=false; g.focus(); } KD={}; }
  if(a==='kd-back') kdStep(card,it,1);
  if(a==='kd-confirm') kdConfirm(card,it);
});

/* ---------- Kado patungan: editor ---------- */
function kadoPanelHTML(){
  const w=S.wishlist;
  return `<div class="toggle-row"><div><b>Tampilkan kado patungan</b><div class="muted" style="font-size:14px">Tamu bisa ikut patungan sebagian untuk barang yang kalian butuhkan.</div></div><label class="switch"><input type="checkbox" data-bind="wishlist.on" ${w.on?'checked':''}><span></span></label></div>
  <div class="wl-ed">${(w.items||[]).map((it,i)=>`<div class="wl-it" data-wli="${i}">
    <label class="wl-img" title="Foto barang (opsional)" style="${it.img?`background-image:url(${esc(it.img)})`:''}">${it.img?'':ico('camera')}<input type="file" accept="image/*" data-wlimg="${i}" hidden><span class="sr">Foto ${esc(it.name||'barang')}</span></label>
    <div class="wl-f"><input class="input" data-wl="name" data-i="${i}" value="${esc(it.name)}" placeholder="Nama barang" aria-label="Nama barang">
      <div class="wl-row"><span class="wl-rp">Rp</span><input class="input" data-wl="price" data-i="${i}" inputmode="numeric" value="${it.price?it.price.toLocaleString('id-ID'):''}" placeholder="Harga" aria-label="Harga"></div>
      <input class="input" data-wl="note" data-i="${i}" value="${esc(it.note||'')}" placeholder="Catatan singkat (opsional)" aria-label="Catatan"></div>
    <button type="button" class="wl-del" data-act="wl-del" data-i="${i}" aria-label="Hapus ${esc(it.name||'barang')}">${ico('x')}</button>
    <div class="wl-p muted">${(()=>{ const p=wlProg(it.id); return p.n?`${rpShort(p.sum)} terkumpul dari ${p.n} orang`:'Belum ada patungan'; })()}</div></div>`).join('')}
    <button type="button" class="btn btn-ghost btn-block" data-act="wl-add">${ico('plus')}Tambah barang</button></div>
  <p class="hint" style="margin-top:12px">Uang patungan masuk langsung ke rekening di bagian Amplop digital. Daftar siapa saja yang ikut ada di <a href="#dashboard" data-dtab-go="hadiah">Dashboard → Hadiah</a>.</p>`;
}
let wlT;
document.addEventListener('input', e=>{
  const t=e.target; if(!t.dataset || t.dataset.wl===undefined) return; const it=S.wishlist.items[+t.dataset.i]; if(!it) return;
  if(t.dataset.wl==='price'){ const v=digits(t.value); it.price=v; const pos=t.value.length-t.selectionStart; t.value=v?v.toLocaleString('id-ID'):''; const np=Math.max(0,t.value.length-pos); t.setSelectionRange(np,np); }
  else it[t.dataset.wl]=t.value;
  delete S.wishlist.demo;
  save(); clearTimeout(wlT); wlT=setTimeout(()=>{ refreshPreview(); edRail(); }, 250);
});
document.addEventListener('change', async e=>{
  const t=e.target;
  if(t.dataset && t.dataset.bind==='wishlist.on'){ setTimeout(()=>{ renderStep(); edRail(); },0); }
  if(t.dataset && t.dataset.wlimg!==undefined && t.files && t.files[0]){ const it=S.wishlist.items[+t.dataset.wlimg]; const d=await shrink(t.files[0], 700); const url=await storePhoto(d); if(url){ it.img=url; save(); renderStep(); refreshPreview(); } }
});
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='wl-add'){ delete S.wishlist.demo; S.wishlist.items.push({id:'k'+Date.now().toString(36), name:'', price:0, note:''}); S.wishlist.on=true; save(); renderStep(); refreshPreview(); edRail(); const ins=$$('[data-wl=name]'); ins[ins.length-1]?.focus(); }
  if(a==='wl-del'){ const i=+el.dataset.i, it=S.wishlist.items[i]; const p=wlProg(it.id);
    if(p.n && !el.dataset.sure){ el.dataset.sure=1; el.classList.add('sure'); el.setAttribute('aria-label','Ketuk lagi untuk menghapus'); toast(`${it.name} sudah punya ${p.n} patungan. Ketuk sekali lagi untuk menghapus.`); return; }
    delete S.wishlist.demo; S.wishlist.items.splice(i,1); save(); renderStep(); refreshPreview(); edRail(); }
  if(a==='kd-manage'){ EDIT.panel='kado'; location.hash='#edit'; }
  if(a==='kd-enable'){ S.wishlist.on=true; if(!S.wishlist.items.length) S.wishlist.items.push({id:'k'+Date.now().toString(36), name:'', price:0, note:''}); save(); EDIT.panel='kado'; location.hash='#edit'; }
  if(a==='pl-hide'){ const p=PL.find(x=>String(x.id)===el.dataset.id); if(!p) return; p.hidden=!p.hidden; savePL(); if(CLOUD.uid) CLOUD.sb.from('pledges').update({hidden:p.hidden}).eq('id',p.id).then(({error})=>{ if(error) toast('Belum berhasil: '+error.message); }); renderDash(); }
});

/* ---------- Kado patungan: dashboard ---------- */
function kadoAdminHTML(){
  const w=S.wishlist, items=w.items||[];
  if(!w.on || !items.length) return `<div class="panel-c kd-empty"><div>${ico('gift')}</div><div><h3 style="margin:0 0 6px">Kado patungan</h3><p class="muted">Pasang daftar barang yang kalian butuhkan, misalnya kulkas atau mesin cuci. Tamu bisa ikut patungan sebagian, dan progresnya terlihat semua tamu supaya tidak ada kado yang dobel.</p><button class="btn btn-primary btn-sm" data-act="kd-enable" style="margin-top:14px">Buat daftar kado</button></div></div>`;
  const all=PL.filter(p=>items.some(i=>i.id===p.item)), tot=all.filter(p=>!p.hidden).reduce((s,p)=>s+p.amount,0);
  return `<div class="kd-adm"><div class="fam-intro" style="margin-bottom:14px"><div><h3 style="font-family:var(--display);font-size:26px">Kado patungan</h3><p class="muted" style="margin-top:4px">${rupiah(tot)} dilaporkan dari ${all.length} patungan. Cocokkan dengan mutasi rekening ${esc(S.gift.bank)}.</p></div><button class="btn btn-ghost btn-sm" data-act="kd-manage">${ico('edit')}Atur daftar kado</button></div>
    <div class="kd-grid">${items.map(it=>{ const p=wlProg(it.id), pct=Math.min(100,Math.round(p.sum/Math.max(1,it.price)*100)); return `<div class="panel-c kd-a"><div class="kd-a-h"><b>${esc(it.name||'Tanpa nama')}</b><span class="status ${pct>=100?'s-ok':'s-mute'}">${pct>=100?'Terpenuhi':pct+'%'}</span></div><div class="fam-meter"><span style="width:${pct}%"></span></div><div class="muted kd-a-m"><span class="num">${rpShort(p.sum)} / ${rpShort(it.price)}</span><span>${p.n} orang</span></div></div>`; }).join('')}</div>
    ${all.length?`<div class="tbl-wrap" style="display:block;margin-top:16px"><table><thead><tr><th>Dari</th><th>Untuk</th><th class="num">Jumlah</th><th>Pesan</th><th>Waktu</th><th></th></tr></thead><tbody>${all.map(p=>`<tr class="${p.hidden?'pl-hid':''}"><td class="nm">${esc(p.name)}</td><td>${esc((items.find(i=>i.id===p.item)||{}).name||'')}</td><td class="num">${rupiah(p.amount)}</td><td class="muted">${esc(p.msg||'—')}</td><td class="muted">${esc(fmtDT(p.t))}</td><td><button class="btn btn-ghost btn-sm" data-act="pl-hide" data-id="${esc(p.id)}" title="${p.hidden?'Hitung lagi':'Tidak masuk hitungan (mis. tidak ada transfernya)'}">${p.hidden?'Hitung lagi':'Abaikan'}</button></td></tr>`).join('')}</tbody></table></div>`:`<p class="muted" style="margin-top:14px;text-align:center">${karaImg('tidur','kara-sm')}Belum ada patungan. Bagian ini tampil di undangan setelah Tanda kasih.</p>`}</div>`;
}

/* ---------- Album dari tamu ---------- */
let AP = {d:null, err:null, q:[], busy:0};
const albumLink = () => CLOUD.on ? `${location.origin}/u/${(CLOUD.inv&&CLOUD.inv.slug)||S.slug}/album` : `${location.href.split('#')[0]}#album`;
const alUrl = p => p.url || (CLOUD.on ? CLOUD.sb.storage.from('album').getPublicUrl(p.path).data.publicUrl : '');
async function albumLoad(){
  if(CLOUD.on && CLOUD.albumMode){ const { data, error } = await CLOUD.sb.rpc('album_info',{p_slug:CLOUD.slug}); if(error){ AP.err=error.message; return; } AP.err=null; AP.d=data; return; }
  AP.d={id:'local', open:S.albumOn!==false, bride:S.bride.nick, groom:S.groom.nick, date:S.events[0]?.date, theme:S.theme, accent:S.accent, photos:ALB.filter(p=>!p.hidden)};
}
async function alCompress(file, max=1600){
  const url=URL.createObjectURL(file);
  try{ const img=await new Promise((r,j)=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=j; i.src=url; });
    const s=Math.min(1, max/Math.max(img.naturalWidth, img.naturalHeight)); const c=document.createElement('canvas'); c.width=Math.round(img.naturalWidth*s); c.height=Math.round(img.naturalHeight*s);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height); return await new Promise(r=>c.toBlob(r,'image/jpeg',.82)); }
  finally{ URL.revokeObjectURL(url); }
}
function renderAlbum(){
  const root=$('#album'); if(!root) return;
  if(AP.err){ root.innerHTML=`<div class="fp"><div class="fp-card" style="text-align:center"><img class="kara kara-404" src="/assets/kara/kara-bingung.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"><h1 class="display" style="font-size:30px">Album tidak ditemukan</h1><p class="muted" style="margin-top:10px">Link mungkin salah, atau undangan belum dipublikasikan.</p></div></div>`; return; }
  const d=AP.d; if(!d){ root.innerHTML='<div class="fp"><div class="fp-card skel" style="height:220px"></div></div>'; return; }
  const ph=d.photos||[];
  root.innerHTML = `<div class="al">
    <header class="al-head"><span class="logo-sm">Sakara</span><span class="eyebrow">Album dari tamu${d.date?' · '+esc(fmtShort(d.date)):''}</span><h1 class="display">${esc(d.bride||'')} <i>&amp;</i> ${esc(d.groom||'')}</h1>
      <p class="muted">Bagikan momen hari ini dari sudut pandang Anda. Foto langsung masuk ke album pengantin, tanpa perlu akun.</p></header>
    ${d.open?`<div class="al-up fp-card">
      <label class="btn btn-primary btn-block al-pick" for="alFile">${ico('camera')}Pilih atau ambil foto</label><input type="file" id="alFile" accept="image/*" multiple hidden>
      <label class="al-nm"><span>Nama Anda <em>(opsional)</em></span><input class="input" id="alName" maxlength="60" value="${esc(lsGet('sp-al-name'))}" placeholder="Supaya pengantin tahu fotonya dari siapa"></label>
      <div class="al-q" id="alQ" aria-live="polite">${AP.q.map(alQItem).join('')}</div></div>`:`<div class="fp-card al-closed">${ico('lock')}<div><b>Album sudah ditutup</b><p class="muted">Pengantin tidak menerima foto baru lagi. Terima kasih sudah berbagi!</p></div></div>`}
    <div class="al-bar"><b class="num">${ph.length}</b> foto dari tamu</div>
    ${ph.length?`<div class="al-grid">${ph.map((p,k)=>`<button type="button" class="al-ph" data-act="al-zoom" data-k="${k}" aria-label="Lihat foto ${k+1}${p.name?' dari '+esc(p.name):''}"><img src="${esc(alUrl(p))}" alt="" loading="lazy" decoding="async">${p.name?`<span>${esc(p.name)}</span>`:''}</button>`).join('')}</div>`:`<div class="al-empty">${karaImg('lambai','kara-empty')}<p>Belum ada foto. Jadilah yang pertama berbagi!</p></div>`}
    <p class="fp-foot muted">Foto yang Anda unggah bisa dilihat siapa saja yang punya link album ini.</p></div>`;
}
function alQItem(q){ return `<div class="al-qi ${q.st}" data-q="${q.id}"><span class="al-th" style="background-image:url(${q.thumb})"></span><span>${q.st==='ok'?`${ico('check')}Terkirim`:q.st==='err'?`Gagal. <button type="button" class="linkbtn" data-act="al-retry" data-q="${q.id}">Coba lagi</button>`:'Mengunggah…'}</span></div>`; }
function alQPaint(){ const el=$('#alQ'); if(el) el.innerHTML=AP.q.map(alQItem).join(''); }
async function alUploadOne(q){
  q.st='up'; alQPaint();
  try{
    const blob = q.blob || (q.blob = await alCompress(q.file));
    const name = ($('#alName')?.value||'').trim();
    if(CLOUD.on && CLOUD.albumMode){
      const path=`${AP.d.id}/${uid()}.jpg`;
      const { error } = await CLOUD.sb.storage.from('album').upload(path, blob, {contentType:'image/jpeg', cacheControl:'31536000', upsert:false}); if(error) throw error;
      const r = await CLOUD.sb.rpc('album_add',{p_slug:CLOUD.slug, p_path:path, p_name:name}); if(r.error) throw r.error;
      AP.d.photos.unshift({path, name, created_at:new Date().toISOString()});
    } else {
      const url = await new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(blob); });
      const p={id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), url, name, t:new Date().toISOString()}; ALB.unshift(p); saveALB(); AP.d.photos.unshift(p);
    }
    q.st='ok';
  }catch(e){ q.st='err'; q.msg=e.message; }
}
async function alUpload(files){
  const list=[...files].filter(f=>/^image\//.test(f.type)||/\.(jpe?g|png|webp|heic)$/i.test(f.name)).slice(0,20);
  if(!list.length){ toast('Pilih file foto dulu, ya'); return; }
  if(files.length>20) toast('Maksimal 20 foto sekali unggah');
  const nm=($('#alName')?.value||'').trim(); try{ localStorage.setItem('sp-al-name', nm); }catch(e){}
  const qs=list.map(f=>({id:uid(), file:f, thumb:URL.createObjectURL(f), st:'wait'})); AP.q=[...qs, ...AP.q.filter(x=>x.st!=='ok')].slice(0,30); alQPaint();
  AP.busy++;
  const work=[...qs]; await Promise.all([0,1].map(async()=>{ while(work.length){ await alUploadOne(work.shift()); } }));
  AP.busy--;
  const ok=qs.filter(q=>q.st==='ok').length, bad=qs.length-ok;
  toast(bad?`${ok} foto terkirim, ${bad} gagal`:`${ok} foto terkirim. Terima kasih!`);
  const keepName=$('#alName')?.value; renderAlbum(); if($('#alName') && keepName!==undefined) $('#alName').value=keepName;
  setTimeout(()=>{ AP.q=AP.q.filter(x=>x.st!=='ok'); alQPaint(); }, 4000);
}
document.addEventListener('change', e=>{ if(e.target.id==='alFile' && e.target.files.length){ alUpload(e.target.files); e.target.value=''; } });
function lightbox(list, k){
  let i=k; const lb=document.createElement('div'); lb.className='lightbox al-lb'; lb.setAttribute('role','dialog'); lb.setAttribute('aria-label','Foto album');
  const paint=()=>{ const p=list[i]; lb.innerHTML=`<img src="${esc(alUrl(p))}" alt=""><div class="al-lb-bar"><span>${p.name?esc(p.name):'&nbsp;'}</span><span class="num">${i+1} / ${list.length}</span></div>${list.length>1?`<button class="al-nav prev" data-n="-1" aria-label="Sebelumnya">‹</button><button class="al-nav next" data-n="1" aria-label="Berikutnya">›</button>`:''}<button class="al-x" aria-label="Tutup">${ico('x')}</button>`; };
  paint(); document.body.appendChild(lb);
  const close=()=>{ lb.remove(); document.removeEventListener('keydown',key); };
  const key=ev=>{ if(ev.key==='Escape') close(); if(ev.key==='ArrowRight'){ i=(i+1)%list.length; paint(); } if(ev.key==='ArrowLeft'){ i=(i-1+list.length)%list.length; paint(); } };
  document.addEventListener('keydown',key);
  lb.addEventListener('click',ev=>{ const n=ev.target.closest('[data-n]'); if(n){ i=(i+ +n.dataset.n+list.length)%list.length; paint(); return; } if(ev.target.closest('.al-x') || ev.target===lb) close(); });
  let sx=null; lb.addEventListener('touchstart',ev=>{ sx=ev.touches[0].clientX; },{passive:true}); lb.addEventListener('touchend',ev=>{ if(sx===null) return; const dx=ev.changedTouches[0].clientX-sx; if(Math.abs(dx)>50){ i=(i+(dx<0?1:-1)+list.length)%list.length; paint(); } sx=null; });
}
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='al-zoom') lightbox(AP.d.photos, +el.dataset.k);
  if(a==='al-retry'){ const q=AP.q.find(x=>x.id===el.dataset.q); if(q) alUploadOne(q).then(()=>{ alQPaint(); if(q.st==='ok'){ const n=$('#alName')?.value; renderAlbum(); if($('#alName')) $('#alName').value=n; } }); }
});

/* ---------- Tab Kenangan (dashboard) ---------- */
let knTab='album', thxF='datang';
const K_TABS=[['album','Album tamu'],['buku','Buku kenangan'],['thx','Terima kasih']];
function knTabHTML(){
  const head=`<div class="fam-intro"><div><h3 style="font-family:var(--display);font-size:26px">Setelah acara</h3><p class="muted" style="max-width:60ch;margin-top:6px">Acara sudah selesai? Kumpulkan foto dari tamu, simpan semua doa jadi buku kenangan, terus ucapkan terima kasih ke mereka satu per satu.</p></div></div>
    <div class="seg kn-seg" role="tablist" aria-label="Bagian kenangan">${K_TABS.map(([k,l])=>`<button type="button" role="tab" data-kn="${k}" aria-selected="${knTab===k}">${l}</button>`).join('')}</div>`;
  let b='';
  if(knTab==='album'){
    const ph=ALB, vis=ph.filter(p=>!p.hidden).length;
    b=`<div class="kn-grid"><div class="panel-c al-share"><div class="al-qr">${qrSVG(albumLink(),150)}</div><div><b>Pasang QR ini di venue</b><p class="muted">Tamu scan, pilih foto, terkirim. Tanpa aplikasi, tanpa akun. Cocok diletakkan di meja penerima tamu, meja makan, atau dekat pelaminan.</p>
        <div class="al-link"><code>${esc(albumLink().replace(/^https?:\/\//,''))}</code></div>
        <div class="al-btns"><button class="btn btn-primary btn-sm" data-act="al-poster">${ico('qr')}Cetak poster QR</button><button class="btn btn-ghost btn-sm" data-act="copy" data-v="${esc(albumLink())}">${ico('copy')}Salin link</button><a class="btn btn-ghost btn-sm" href="${esc(albumLink())}" target="_blank" rel="noopener">${ico('eye')}Buka album</a></div></div></div>
      <div class="panel-c"><div class="toggle-row" style="border:0;padding:0"><div><b>Terima foto baru</b><div class="muted" style="font-size:14px">Matikan setelah acara selesai supaya album tidak bertambah lagi.</div></div><label class="switch"><input type="checkbox" id="alOn" aria-label="Terima foto baru" ${S.albumOn!==false?'checked':''}><span></span></label></div>
      <div class="kn-stat"><div><b class="num">${ph.length}</b><span>foto masuk</span></div><div><b class="num">${new Set(ph.map(p=>p.name).filter(Boolean)).size}</b><span>tamu berbagi</span></div><div><b class="num">${ph.length-vis}</b><span>disembunyikan</span></div></div></div></div>
      ${ph.length?`<div class="al-grid adm">${ph.map((p,k)=>`<div class="al-ph ${p.hidden?'hid':''}"><button type="button" class="al-open" data-act="kn-zoom" data-k="${k}" aria-label="Lihat foto"><img src="${esc(alUrl(p))}" alt="" loading="lazy"></button>${p.name?`<span>${esc(p.name)}</span>`:''}<div class="al-tools"><button type="button" data-act="al-hide" data-id="${esc(p.id)}" title="${p.hidden?'Tampilkan':'Sembunyikan dari album'}" aria-label="${p.hidden?'Tampilkan':'Sembunyikan'}">${ico('eye')}</button><a href="${esc(alUrl(p))}" download target="_blank" rel="noopener" title="Unduh" aria-label="Unduh">${ico('down')}</a><button type="button" data-act="al-del" data-id="${esc(p.id)}" title="Hapus" aria-label="Hapus">${ico('x')}</button></div></div>`).join('')}</div>`:`<div class="empty" style="margin-top:16px">${karaImg('tidur','kara-empty')}Belum ada foto dari tamu. Cetak poster QR dan pasang di venue, atau lempar link albumnya ke grup keluarga.</div>`}`;
  }
  if(knTab==='buku'){
    const st=bookStats();
    b=`<div class="kn-grid"><div class="bk-mini" aria-hidden="true"><div class="bk-mini-c" style="${themeStyle(themeById(S.theme),S.accent,fontOf())}"><small>Buku kenangan</small><b>${esc(S.bride.nick)} &amp; ${esc(S.groom.nick)}</b><span>${esc(fmtShort(S.events[0]?.date||''))}</span></div></div>
      <div class="panel-c"><b style="font-size:18px">Buku kenangan otomatis</b><p class="muted" style="margin-top:6px">Semua ucapan, foto dari tamu, dan cerita hari itu dirangkum jadi buku yang rapi. Bisa disimpan jadi PDF, dibagikan ke keluarga, atau dicetak buat kenang-kenangan.</p>
        <div class="kn-stat"><div><b class="num">${st.wishes}</b><span>ucapan & doa</span></div><div><b class="num">${st.photos}</b><span>foto</span></div><div><b class="num">${st.people}</b><span>orang hadir</span></div><div><b class="num">${st.pages}</b><span>halaman</span></div></div>
        <div class="al-btns" style="margin-top:16px"><button class="btn btn-primary" data-act="bk-open">${ico('eye')}Lihat buku</button><button class="btn btn-ghost" data-act="bk-print">Simpan PDF</button></div>
        <p class="hint" style="margin-top:12px">Ucapan yang kalian sembunyikan dan foto yang disembunyikan tidak masuk buku.</p></div></div>`;
  }
  if(knTab==='thx'){
    const g1=G.filter(g=>g.checkin), g2=G.filter(g=>!g.checkin && (g.sent || g.status!=='belum'));
    const list=thxF==='datang'?g1:g2, done=list.filter(g=>S.thanked.includes(g.id)).length;
    const tpl=thxF==='datang'?(S.thanksMsg||THX_DEF):(S.thanksMsg2||THX_DEF2);
    const sample=list[0]||G[0];
    b=`<div class="seg" role="group" aria-label="Pilih tamu" style="margin:4px 0 14px"><button type="button" data-thxf="datang" aria-pressed="${thxF==='datang'}">Sudah datang · ${g1.length}</button><button type="button" data-thxf="absen" aria-pressed="${thxF==='absen'}">Tidak sempat datang · ${g2.length}</button></div>
      <div class="kn-grid thx">
      <div class="panel-c"><label for="thxMsg"><b>Pesan untuk tamu yang ${thxF==='datang'?'sudah datang':'tidak sempat datang'}</b></label>
        <textarea class="input" id="thxMsg" rows="8">${esc(tpl)}</textarea>
        <div class="thx-chips"><span class="muted">Sisipkan:</span><button type="button" class="chip" data-thxins="{nama}">Nama tamu</button>${thxF==='datang'?'<button type="button" class="chip" data-thxins="{sesi}">Sesi yang dihadiri</button>':''}<button type="button" class="chip" data-thxins="{pasangan}">Nama kalian</button><button type="button" class="linkbtn" data-act="thx-reset" style="margin-left:auto">Kembalikan bawaan</button></div>
        ${sample?`<div class="thx-prev"><small class="muted">Contoh untuk ${esc(sample.name)}</small><p id="thxPrev">${esc(thxText(sample,tpl)).replace(/\n/g,'<br>')}</p></div>`:''}</div>
      <div class="panel-c"><h3>${list.length} tamu <span class="muted" style="font-weight:600;font-size:14px">${done} sudah dikirimi</span></h3><div class="fam-meter" style="margin:-6px 0 14px"><span style="width:${list.length?done/list.length*100:0}%"></span></div>
        ${list.length?`<ul class="thx-list">${list.map(g=>{ const sent=S.thanked.includes(g.id); return `<li class="${sent?'sent':''}"><div><b>${esc(g.name)}</b><small class="muted">${thxF==='datang'?esc(thxSesi(g))+' · '+g.checkin.pax+' orang':esc(g.status==='tidak'?'Mengabari tidak hadir':g.status==='hadir'?'Konfirmasi hadir, tidak tercatat datang':'Tidak menjawab')}</small></div>${g.phone?`<a class="btn ${sent?'btn-ghost':'btn-soft'} btn-sm" href="${esc(thxWa(g,tpl))}" target="_blank" rel="noopener" data-thx="${esc(g.id)}">${ico(sent?'check':'wa')}${sent?'Terkirim':'Kirim'}</a>`:`<button class="btn btn-ghost btn-sm" data-act="thx-copy" data-id="${esc(g.id)}" title="Tidak ada nomor WhatsApp">${ico(sent?'check':'copy')}${sent?'Tersalin':'Salin'}</button>`}</li>`; }).join('')}</ul>`:`<div class="empty" style="border:0">${karaImg('tidur','kara-empty')}${thxF==='datang'?'Belum ada tamu yang check-in. Daftar ini terisi otomatis dari mode penerima tamu di hari H.':'Tidak ada tamu di daftar ini.'}</div>`}</div></div>`;
  }
  return head+`<div class="kn-body">${b}</div>`;
}
function thxSesi(g){ const ev=g.checkin && S.events[g.checkin.session]; return (ev&&ev.type) || (S.events[0]&&S.events[0].type) || 'acara'; }
function thxText(g,tpl){ return tpl.replace(/\{nama\}/g, g.name).replace(/\{sesi\}/g, thxSesi(g).toLowerCase()).replace(/\{pasangan\}/g, `${S.bride.nick} & ${S.groom.nick}`); }
function thxWa(g,tpl){ return `https://wa.me/${(g.phone||'').replace(/\D/g,'').replace(/^0/,'62')}?text=${encodeURIComponent(thxText(g,tpl))}`; }
const thxTpl = () => thxF==='datang'?(S.thanksMsg||THX_DEF):(S.thanksMsg2||THX_DEF2);
function markThanked(id){ if(!S.thanked.includes(id)){ S.thanked.push(id); save(); } }
document.addEventListener('click', async e=>{
  const kn=e.target.closest('[data-kn]'); if(kn){ knTab=kn.dataset.kn; renderDash(); return; }
  const tf=e.target.closest('[data-thxf]'); if(tf){ thxF=tf.dataset.thxf; renderDash(); return; }
  const ins=e.target.closest('[data-thxins]'); if(ins){ const ta=$('#thxMsg'); const s=ta.selectionStart, en=ta.selectionEnd; ta.setRangeText(ins.dataset.thxins, s, en, 'end'); ta.focus(); ta.dispatchEvent(new Event('input',{bubbles:true})); return; }
  const th=e.target.closest('[data-thx]'); if(th){ markThanked(th.dataset.thx); setTimeout(()=>renderDash(), 300); return; }
  const el=e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='thx-copy'){ const g=G.find(x=>x.id===el.dataset.id); if(g){ copyText(thxText(g,thxTpl())); markThanked(g.id); renderDash(); } }
  if(a==='thx-reset'){ if(thxF==='datang') delete S.thanksMsg; else delete S.thanksMsg2; save(); renderDash(); }
  if(a==='kn-zoom'){ lightbox(ALB, +el.dataset.k); }
  if(a==='al-hide'){ const p=ALB.find(x=>String(x.id)===el.dataset.id); if(!p) return; p.hidden=!p.hidden; saveALB(); renderDash(); if(CLOUD.uid){ const { error } = await CLOUD.sb.from('album_photos').update({hidden:p.hidden}).eq('id',p.id); if(error) toast('Belum berhasil: '+error.message); } toast(p.hidden?'Foto disembunyikan dari album':'Foto tampil lagi'); }
  if(a==='al-del'){ if(!el.dataset.sure){ el.dataset.sure=1; el.classList.add('sure'); el.title='Ketuk lagi untuk menghapus permanen'; toast('Yakin? Ketuk sekali lagi buat hapus foto ini'); return; }
    const p=ALB.find(x=>String(x.id)===el.dataset.id); if(!p) return;
    if(CLOUD.uid){ const r1=await CLOUD.sb.storage.from('album').remove([p.path]); const r2=await CLOUD.sb.from('album_photos').delete().eq('id',p.id); if(r1.error||r2.error){ toast('Gagal menghapus: '+((r1.error||r2.error).message)); return; } }
    ALB=ALB.filter(x=>x!==p); saveALB(); renderDash(); toast('Foto dihapus'); }
  if(a==='al-poster') printPoster();
  if(a==='bk-open') bookOpen();
  if(a==='bk-print') printHTML(bookPages(), 'bk');
  if(a==='cards-print'){ if(isLocked('bulk')) toast('Kartu cetak tersedia di paket Tamu'); else cardsModal(); }
});
document.addEventListener('input', e=>{
  if(e.target.id==='thxMsg'){ if(thxF==='datang') S.thanksMsg=e.target.value; else S.thanksMsg2=e.target.value; save(); const pv=$('#thxPrev'); const list=thxF==='datang'?G.filter(g=>g.checkin):G.filter(g=>!g.checkin&&(g.sent||g.status!=='belum')); const g=list[0]||G[0]; if(pv&&g) pv.innerHTML=esc(thxText(g,e.target.value)).replace(/\n/g,'<br>');
    $$('[data-thx]').forEach(x=>{ const g=G.find(y=>y.id===x.dataset.thx); if(g) x.href=thxWa(g,e.target.value); }); }
});
document.addEventListener('change', async e=>{
  if(e.target.id==='alOn'){ S.albumOn=e.target.checked; save(); toast(S.albumOn?'Album menerima foto lagi':'Album ditutup. Foto yang ada tetap bisa dilihat.'); }
});

/* ---------- Nama di sampul: tidak terpotong di tengah kata ---------- */
/* nama panjang (mis. "Anastasiaputri") mengecil sampai muat satu kata per baris */
function fitNames(){
  document.querySelectorAll('.inv .cover .names, .tx>h1').forEach(n=>{
    if(!n.isConnected || !n.clientWidth) return;
    n.style.fontSize=''; let fs=parseFloat(getComputedStyle(n).fontSize)||40; const cv=n.closest('.cover')||n.parentElement, min=fs*.45, avail=Math.min((n.parentElement||n).clientWidth, cv.clientWidth*.9);
    const raw=(n.innerText||n.textContent), words=/nowrap/.test(getComputedStyle(n).whiteSpace) ? [raw.replace(/\s+/g,' ').trim()] : raw.split(/\s+/).filter(Boolean); if(!words.length) return;
    const pr=document.createElement('span'); pr.style.cssText='position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;pointer-events:none'; n.appendChild(pr);
    const widest=()=>Math.max(...words.map(w=>{ pr.textContent=w; return pr.offsetWidth; }));
    let i=0; while(widest() > avail && fs>min && i++<24){ fs*=.93; n.style.fontSize=fs.toFixed(1)+'px'; }
    pr.remove();
  });
}
let fitT=0; const fitSoon=()=>{ clearTimeout(fitT); fitT=setTimeout(fitNames,60); };
new MutationObserver(ms=>{ if(ms.some(m=>[...m.addedNodes].some(x=>x.nodeType===1 && (x.matches?.('.cover,.inv,.tx') || x.querySelector?.('.cover .names,.tx>h1'))))) fitSoon(); }).observe(document.body,{childList:true,subtree:true});
addEventListener('resize', fitSoon); document.fonts && document.fonts.ready.then(fitSoon); document.fonts && document.fonts.addEventListener?.('loadingdone', fitSoon);

/* ---------- Cetak (PDF) ---------- */
function printHTML(html, kind){
  let r=$('#printRoot'); if(!r){ r=document.createElement('div'); r.id='printRoot'; document.body.appendChild(r); }
  const seq=printHTML.seq=(printHTML.seq||0)+1;
  r.className='pr-'+kind; r.innerHTML=html; document.body.classList.add('printing');
  const imgs=[...r.querySelectorAll('img')];
  Promise.race([Promise.all(imgs.map(i=>i.complete?1:new Promise(res=>{ i.onload=i.onerror=res; }))), new Promise(res=>setTimeout(res,4000))]).then(()=>{
    const done=()=>{ if(seq!==printHTML.seq) return; document.body.classList.remove('printing'); r.innerHTML=''; window.removeEventListener('afterprint',done); };
    window.addEventListener('afterprint',done); window.print(); setTimeout(()=>{ if(!matchMedia('print').matches) done(); }, 1500);
  });
}
function printPoster(){
  const t=themeById(S.theme);
  printHTML(`<div class="pp" style="${themeStyle(t,S.accent,fontOf())}"><div class="pp-in"><small>Album dari tamu</small><h1>${esc(S.bride.nick)} <i>&amp;</i> ${esc(S.groom.nick)}</h1><p class="pp-l">Bagikan foto momen hari ini</p><div class="pp-qr">${qrSVG(albumLink(),420)}</div><ol><li>Buka kamera HP, arahkan ke QR</li><li>Pilih foto dari galeri atau ambil langsung</li><li>Kirim. Tanpa aplikasi, tanpa akun</li></ol><p class="pp-u">${esc(albumLink().replace(/^https?:\/\//,''))}</p></div></div>`, 'pp');
}

/* ---------- Buku kenangan ---------- */
function bookData(){
  const wishes=W.filter(w=>w.show!==false && w.m), photos=ALB.filter(p=>!p.hidden), came=G.filter(g=>g.checkin);
  return {wishes, photos, came, people:came.reduce((s,g)=>s+(g.checkin.pax||1),0)};
}
function bookStats(){ const d=bookData(); return {wishes:d.wishes.length, photos:d.photos.length, people:d.people, pages:bookPages(true)}; }
function chunk(a,n){ const r=[]; for(let i=0;i<a.length;i+=n) r.push(a.slice(i,i+n)); return r; }
function bookPages(countOnly){
  const d=bookData(), t=themeById(S.theme), st=themeStyle(t,S.accent,fontOf()), ev=S.events.filter(e=>e.date||e.type);
  const n1=esc(S.bride.nick), n2=esc(S.groom.nick), date=S.events[0]?.date;
  const pages=[];
  pages.push(`<section class="bk-page bk-cover"><div class="bk-frame"><small>Buku kenangan pernikahan</small><h1>${n1}<i>&amp;</i>${n2}</h1><p>${esc(date?fmtDate(date):'')}</p>${S.bride.photo||S.groom.photo||S.gallery[0]?`<div class="bk-cv-ph" style="background-image:url(${esc(S.gallery[0]||S.bride.photo||S.groom.photo)})"></div>`:''}<p class="bk-small">${esc(ev.map(e=>e.venue).filter(Boolean)[0]||'')}</p></div></section>`);
  pages.push(`<section class="bk-page"><h2>Hari itu</h2><p class="bk-lead">${esc(S.bride.name||S.bride.nick)} dan ${esc(S.groom.name||S.groom.nick)} resmi memulai hidup baru, dikelilingi keluarga dan sahabat.</p>
    <div class="bk-stats"><div><b>${d.people||G.filter(g=>g.status==='hadir').reduce((s,g)=>s+g.pax,0)}</b><span>${d.people?'orang hadir':'orang konfirmasi hadir'}</span></div><div><b>${G.length}</b><span>undangan dikirim</span></div><div><b>${d.wishes.length}</b><span>ucapan & doa</span></div><div><b>${d.photos.length}</b><span>foto dari tamu</span></div></div>
    <div class="bk-ev">${ev.map(e=>`<div><b>${esc(e.type||'Acara')}</b><span>${esc(e.date?fmtDate(e.date):'')}${e.start?' · '+esc(e.start):''}${e.end?'–'+esc(e.end):''}</span><span>${esc(e.venue||'')}</span></div>`).join('')}</div></section>`);
  chunk(d.wishes, 8).forEach((ws,k)=>pages.push(`<section class="bk-page"><h2>${k?'Ucapan & doa (lanjutan)':'Ucapan & doa'}</h2><div class="bk-wishes">${ws.map(w=>`<figure><blockquote>${esc(w.m)}</blockquote><figcaption>${esc(w.n)}${w.att?' · hadir':''}</figcaption></figure>`).join('')}</div></section>`));
  chunk(d.photos, 6).forEach((ps,k)=>pages.push(`<section class="bk-page"><h2>${k?'Dari lensa tamu (lanjutan)':'Dari lensa tamu'}</h2><div class="bk-photos">${ps.map(p=>`<figure><img src="${esc(alUrl(p))}" alt="">${p.name?`<figcaption>${esc(p.name)}</figcaption>`:''}</figure>`).join('')}</div></section>`));
  if(d.came.length) chunk(d.came, 90).forEach((cs,k)=>pages.push(`<section class="bk-page"><h2>${k?'Yang hadir (lanjutan)':'Yang hadir'}</h2><p class="bk-lead">Terima kasih sudah meluangkan waktu untuk kami.</p><ul class="bk-names">${cs.map(g=>`<li>${esc(g.name)}</li>`).join('')}</ul></section>`));
  pages.push(`<section class="bk-page bk-end"><div class="bk-frame"><h2>Terima kasih</h2><p>Setiap doa, senyum, dan foto di buku ini akan kami simpan selamanya.</p><h1 style="font-size:42px">${n1}<i>&amp;</i>${n2}</h1><small>Dibuat dengan Sakara</small></div></section>`);
  if(countOnly) return pages.length;
  return `<div class="bk" style="${st}">${pages.join('')}</div>`;
}
function bookOpen(){
  openModal(`<div class="bk-top"><div><h2 class="display" style="font-size:28px">Buku kenangan</h2><p class="muted">${bookPages(true)} halaman · ukuran A4</p></div><button class="btn btn-primary" data-act="bk-print">Simpan PDF / cetak</button></div><div class="bk-prev">${bookPages()}</div>`, true);
  const pv=$('.bk-prev'); const fit=()=>{ if(!pv) return; const two=pv.clientWidth>760; pv.classList.toggle('two',two); pv.style.setProperty('--z', Math.min(two?.45:.8,(pv.clientWidth-40)/(two?1612:794))); }; fit(); addEventListener('resize', fit, {once:true});
}

/* ---------- Kartu cetak ber-QR ---------- */
let CARD={who:'all', grp:'', size:'a6'};
function cardGuests(){ if(CARD.who==='sel') return G.filter(g=>sel.has(g.id)); if(CARD.who==='grp') return G.filter(g=>g.group===CARD.grp); return G.filter(g=>!isPending(g)); }
function cardHTML(g){
  const ev=guestEvents(g), e=ev[0]||{}, t=themeById(S.theme);
  return `<div class="pc-card" style="${themeStyle(t,S.accent,fontOf())}"><div class="pc-in"><small>Undangan pernikahan</small><h3>${esc(S.bride.nick)} <i>&amp;</i> ${esc(S.groom.nick)}</h3>
    <div class="pc-to">Kepada Yth.<b>${esc(g.name)}</b></div>
    <div class="pc-ev">${ev.slice(0,2).map(x=>`<div><b>${esc(x.type||'Acara')}</b> · ${esc(x.date?fmtShort(x.date):'')}${x.start?', '+esc(x.start):''}<br><span>${esc(x.venue||'')}</span></div>`).join('')}</div>
    <div class="pc-qr">${qrSVG(g.code,150)}<div><b>${esc(g.code)}</b><span>Tunjukkan QR ini ke penerima tamu</span><span class="pc-u">${esc(link(g).replace(/^https?:\/\//,''))}</span></div></div></div></div>`;
}
function cardsModal(){
  if(!CARD.grp) CARD.grp=G[0]?.group||''; if(CARD.who==='sel' && !sel.size) CARD.who='all'; if(sel.size) CARD.who='sel';
  const groups=[...new Set(G.map(g=>g.group))]; const list=cardGuests();
  openModal(`<h2 class="display" style="font-size:30px">Kartu cetak ber-QR</h2><p class="muted" style="margin:6px 0 18px">Untuk tamu yang lebih nyaman dengan undangan fisik. Tiap kartu berisi nama tamu dan QR check-in pribadi yang sama dengan undangan digitalnya, jadi datanya tetap satu.</p>
    <div class="pc-opt"><fieldset class="fieldset" style="margin:0"><legend>Untuk siapa</legend>
      ${sel.size?`<label class="ck"><input type="radio" name="pcw" value="sel" ${CARD.who==='sel'?'checked':''}> Tamu yang dipilih (${sel.size})</label>`:''}
      <label class="ck"><input type="radio" name="pcw" value="all" ${CARD.who==='all'?'checked':''}> Semua tamu (${G.filter(g=>!isPending(g)).length})</label>
      <label class="ck"><input type="radio" name="pcw" value="grp" ${CARD.who==='grp'?'checked':''}> Satu grup <select class="input" id="pcGrp" style="width:auto;min-height:36px;padding:4px 10px;margin-left:6px">${groups.map(x=>`<option ${x===CARD.grp?'selected':''}>${esc(x)}</option>`).join('')}</select></label></fieldset>
      <fieldset class="fieldset" style="margin:0"><legend>Ukuran</legend><label class="ck"><input type="radio" name="pcs" value="a6" ${CARD.size==='a6'?'checked':''}> Kartu A6 · 4 per lembar A4</label><label class="ck"><input type="radio" name="pcs" value="sm" ${CARD.size==='sm'?'checked':''}> Kartu kecil · 8 per lembar A4</label></fieldset></div>
    <div class="pc-prev pc-${CARD.size}">${list[0]?cardHTML(list[0]):`<div class="empty">${karaImg('tidur')}Tidak ada tamu.</div>`}</div>
    <div class="form-foot"><button class="btn btn-ghost" data-act="close">Batal</button><button class="btn btn-primary" data-act="cards-go" ${list.length?'':'disabled'}>Cetak ${list.length} kartu</button></div>`, true);
  $$('[name=pcw],[name=pcs],#pcGrp').forEach(x=>x.addEventListener('change',()=>{ CARD.who=$('[name=pcw]:checked').value; CARD.size=$('[name=pcs]:checked').value; CARD.grp=$('#pcGrp').value; if(x.id==='pcGrp') CARD.who='grp'; cardsModal(); }));
}
document.addEventListener('click', e=>{ const el=e.target.closest('[data-act=cards-go]'); if(!el) return; const list=cardGuests(); const per=CARD.size==='a6'?4:8; closeModal();
  printHTML(chunk(list,per).map(p=>`<section class="pc-sheet pc-${CARD.size}">${p.map(cardHTML).join('')}</section>`).join(''), 'pc'); });

/* ---------- Muat data cloud ---------- */
async function extraOwnerLoad(inv){
  const sb=CLOUD.sb;
  const [p,a] = await Promise.all([sb.from('pledges').select('*').eq('invitation_id',inv.id).order('created_at',{ascending:false}), sb.from('album_photos').select('*').eq('invitation_id',inv.id).order('created_at',{ascending:false})]);
  PL = (p.data||[]).map(x=>({id:x.id, item:x.item, name:x.name, amount:Number(x.amount), msg:x.message, t:x.created_at, hidden:x.hidden}));
  ALB = (a.data||[]).map(x=>({id:x.id, path:x.path, name:x.name, t:x.created_at, hidden:x.hidden}));
}
async function extraGuestLoad(){
  if(!S.wishlist || !S.wishlist.on) return;
  if(CLOUD.wlpP){ WLP = await CLOUD.wlpP; return; }
  const { data } = await CLOUD.sb.rpc('wishlist_progress',{p_slug:CLOUD.slug}); WLP = data || {};
}

/* ================= Isi undangan premium (tema layout) + Kisah cinta ================= */
if(!S.story) S.story={on:false, items:[]};
if(!S.storyInit){ S.storyInit=true; S.story={on:true, demo:true, items:[
  {id:'c1', date:'Maret 2022', title:'Pertama bertemu', text:'Kami berkenalan di acara kantor teman. Obrolan singkat soal kopi ternyata berlanjut sampai larut malam.'},
  {id:'c2', date:'Agustus 2024', title:'Melangkah lebih serius', text:'Setelah dua tahun saling mengenal, kami memberanikan diri bertemu keluarga satu sama lain.'},
  {id:'c3', date:'Oktober 2026', title:'Lamaran', text:'Dengan restu kedua keluarga, kami sepakat untuk melangkah ke jenjang pernikahan.'}]}; }
const P_KICK = {salam:'', acara:'Simpan tanggalnya', cerita:'', galeri:'', rsvp:'', hadiah:'', kado:'', ucapan:''};
function countHTML4(d){
  const diff = Math.max(0, new Date(d+'T08:00:00') - new Date());
  const D=Math.floor(diff/864e5), H=Math.floor(diff/36e5)%24, M=Math.floor(diff/6e4)%60, Sx=Math.floor(diff/1e3)%60;
  const u=(v,l)=>`<div><b class="num">${String(v).padStart(2,'0')}</b><small>${l}</small></div>`;
  return u(D,'Hari')+'<i>:</i>'+u(H,'Jam')+'<i>:</i>'+u(M,'Menit')+'<i>:</i>'+u(Sx,'Detik');
}
setInterval(()=>{ $$('[data-count4]').forEach(el=>{ const bs=$$('b.num', el); const nv=countHTML4(el.dataset.count4).match(/<b class="num">(\d+)<\/b>/g).map(x=>x.replace(/\D/g,'')); bs.forEach((b,i)=>{ if(b.textContent!==nv[i]) b.textContent=nv[i]; }); }); }, 1000);
function pPhoto(person, cls){
  const ini = esc((person.nick||person.name||'?').trim().charAt(0).toUpperCase());
  return person.photo ? `<div class="${cls}" data-par style="background-image:url(${esc(person.photo)})"></div>` : `<div class="${cls} ph-empty" aria-hidden="true"><span>${ini}</span></div>`;
}
function premSalam(id, op){
  const info = (who, role) => { const x=S[who]; return `<div class="p-body"><span class="kick">${role}</span><h4>${esc(x.name||(who==='bride'?'Nama mempelai wanita':'Nama mempelai pria'))}</h4><p>${esc(x.parents||'')}</p>${x.ig?`<a class="p-ig" href="https://instagram.com/${esc(String(x.ig).replace(/^@/,''))}" target="_blank" rel="noopener">@${esc(String(x.ig).replace(/^@/,''))}</a>`:''}</div>`; };
  const pic = who => `<figure class="p-card p-pic">${pPhoto(S[who],'p-ph')}</figure>`;
  return `<section id="${id}-salam" class="p-salam">
    ${P_KICK.salam?`<span class="kick">${esc(P_KICK.salam)}</span>`:''}
    <h3>${esc(op.salam)}</h3>
    <p class="lead">${esc(op.text)}</p>
    <div class="p-couple"><div class="p-pics">${pic('bride')}${pic('groom')}</div>
      <div class="p-info">${info('bride','Mempelai wanita')}<div class="p-amp" aria-hidden="true">&amp;</div>${info('groom','Mempelai pria')}</div></div>
    ${op.quote?`<figure class="qband"><svg class="orn" width="120" height="20" aria-hidden="true"><use href="#i-orn"/></svg><blockquote>${esc(op.quote.replace(/\s*—\s*[^—]+$/,''))}</blockquote>${/—/.test(op.quote)?`<figcaption>${esc(op.quote.split('—').pop().trim())}</figcaption>`:''}</figure>`:''}
  </section>`;
}
function premAcara(id, ev, first, gobj, mapUrl, calUrl){
  const day = d => { try{ const x=new Date(d+'T00:00:00'); return {dd:x.getDate(), mon:new Intl.DateTimeFormat('id-ID',{month:'short'}).format(x), wd:new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(x), yy:x.getFullYear()}; }catch(e){ return null; } };
  return `<section id="${id}-acara" class="p-acara">
    <span class="kick">${esc(P_KICK.acara)}</span>
    <h3>Waktu &amp; tempat</h3>
    ${(themeById(S.theme)||{}).layout==='goresan' && first ? goCal(first.date) : ''}
    ${gobj && ev.length < S.events.filter(e=>e.type||e.date||e.venue).length ? `<p class="lead">Kami mengundang ${esc(gobj.name)} ke acara berikut.</p>`:''}
    ${first ? `<div class="cd4" data-count4="${esc(first.date)}" role="timer" aria-label="Hitung mundur menuju hari bahagia">${countHTML4(first.date)}</div>`:''}
    ${ev.map(e=>{ const d=e.date?day(e.date):null; return `<article class="ev2">
      ${d?`<div class="ev2-d" aria-hidden="true"><b>${d.dd}</b><span>${esc(d.mon)} ${d.yy}</span></div>`:''}
      <div class="ev2-b"><span class="kick">${esc(e.type||'Acara')}</span>
        ${d?`<div class="ev2-w">${esc(d.wd)}, ${esc(fmtShort(e.date))}</div>`:''}
        ${e.start?(()=>{ const t=evTimeHTML(e); return `<div class="ev2-t">${t.main}</div>${t.alt}`; })():''}
        ${e.venue?`<div class="ev2-v">${esc(e.venue)}</div>`:''}
        ${e.address?`<div class="ev2-a">${esc(e.address)}</div>`:''}
        <div class="acts">${e.venue?`<a class="ibtn solid" href="${mapUrl(e)}" target="_blank" rel="noopener">${ico('pin')}Petunjuk arah</a>`:''}${e.date?`<a class="ibtn" href="${calUrl(e)}" target="_blank" rel="noopener">${ico('cal')}Simpan tanggal</a>`:''}</div>${evExtraHTML(e)}</div></article>`; }).join('')}
    ${(()=>{ const me=mainEvent(gobj); return me ? `<div class="crowd" data-crowd data-ev="${me.i}" hidden></div>` : ''; })()}
  </section>`;
}
function storySecHTML(id){
  const s=S.story; if(!s || !s.on || !(s.items||[]).length) return '';
  return `<section id="${id}-cerita" class="p-cerita">
    ${P_KICK.cerita?`<span class="kick">${esc(P_KICK.cerita)}</span>`:''}
    <h3>Kisah cinta</h3>
    <ol class="tl">${s.items.map(it=>`<li>${it.img?`<div class="tl-ph" data-par style="background-image:url(${esc(it.img)})"></div>`:''}<span class="tl-d">${esc(it.date||'')}</span><b>${esc(it.title||'')}</b>${it.text?`<p>${esc(it.text)}</p>`:''}</li>`).join('')}</ol>
  </section>`;
}
function premGaleri(id){
  if(!(S.galleryOn && S.gallery.length)) return '';
  const g=S.gallery;
  return `<section id="${id}-galeri" class="p-galeri"><h3>Galeri</h3>
    <div class="gal pg">${g.map((src,k)=>`<button type="button" data-act="zoom" data-k="${k}" class="${k===0?'feat':''}" style="background-image:url(${src})" aria-label="Perbesar foto ${k+1}"></button>`).join('')}</div></section>`;
}
function premDecorate(secs){
  ['rsvp','hadiah','kado','ucapan'].forEach(k=>{ if(P_KICK[k] && secs[k] && !/class="kick"/.test(secs[k].slice(0,200))) secs[k]=secs[k].replace(/(<section[^>]*>)\s*/, `$1<span class="kick">${esc(P_KICK[k])}</span>`); });
}
/* Parallax ringan untuk foto */
let parRaf=0;
function parTick(){ parRaf=0; if(REDUCED()) return; const vh=innerHeight; $$('.inv.prem [data-par]').forEach(el=>{ const r=el.getBoundingClientRect(); if(r.bottom<0||r.top>vh) return; const p=((r.top+r.height/2)-vh/2)/vh; el.style.backgroundPosition=`center ${50+p*14}%`; });
  $$('.inv.anim').forEach(inv=>{ if(!inv.offsetParent && inv.getClientRects().length===0) return;
    $$(':scope > section', inv).forEach(sec=>{ const r=sec.getBoundingClientRect(); if(r.bottom<-200||r.top>vh+200) return;
      if(sec.classList.contains('cover')){ const cp=Math.min(1,Math.max(0,-r.top/Math.max(1,r.height))); sec.style.setProperty('--cp', cp.toFixed(3)); }
      else { const p=Math.max(-1,Math.min(1,((r.top+Math.min(r.height,vh)/2)-vh/2)/vh)); sec.style.setProperty('--sp', p.toFixed(3)); } }); }); }
document.addEventListener('scroll', ()=>{ if(!parRaf) parRaf=requestAnimationFrame(parTick); }, {capture:true, passive:true});

/* Editor: Kisah cinta */
function storyPanelHTML(){
  const s=S.story;
  return `<div class="toggle-row"><div><b>Tampilkan kisah cinta</b><div class="muted" style="font-size:14px">Cerita singkat perjalanan kalian, ditampilkan sebagai garis waktu.</div></div><label class="switch"><input type="checkbox" data-bind="story.on" ${s.on?'checked':''}><span></span></label></div>
  <div class="wl-ed">${(s.items||[]).map((it,i)=>`<div class="wl-it st-it">
    <label class="wl-img" title="Foto (opsional)" style="${it.img?`background-image:url(${esc(it.img)})`:''}">${it.img?'':ico('camera')}<input type="file" accept="image/*" data-stimg="${i}" hidden><span class="sr">Foto momen ${i+1}</span></label>
    <div class="wl-f"><input class="input" data-st="date" data-i="${i}" value="${esc(it.date||'')}" placeholder="Waktu, mis. Maret 2022" aria-label="Waktu">
      <input class="input" data-st="title" data-i="${i}" value="${esc(it.title||'')}" placeholder="Judul momen" aria-label="Judul">
      <textarea class="input" data-st="text" data-i="${i}" rows="3" placeholder="Ceritakan singkat" aria-label="Cerita">${esc(it.text||'')}</textarea></div>
    <div class="st-mv"><button type="button" class="wl-del" data-act="st-up" data-i="${i}" aria-label="Naikkan" ${i===0?'disabled':''}>↑</button><button type="button" class="wl-del" data-act="st-del" data-i="${i}" aria-label="Hapus momen ${i+1}">${ico('x')}</button></div></div>`).join('')}
    <button type="button" class="btn btn-ghost btn-block" data-act="st-add">${ico('plus')}Tambah momen</button></div>`;
}
let stT;
document.addEventListener('input', e=>{ const t=e.target; if(!t.dataset || t.dataset.st===undefined) return; const it=S.story.items[+t.dataset.i]; if(!it) return; it[t.dataset.st]=t.value; delete S.story.demo; save(); clearTimeout(stT); stT=setTimeout(()=>{ refreshPreview(); }, 250); });
document.addEventListener('change', async e=>{ const t=e.target;
  if(t.dataset && t.dataset.bind==='story.on') setTimeout(()=>{ renderStep(); edRail(); },0);
  if(t.dataset && t.dataset.stimg!==undefined && t.files && t.files[0]){ const it=S.story.items[+t.dataset.stimg]; const d=await shrink(t.files[0], 900); const url=await storePhoto(d); if(url){ it.img=url; delete S.story.demo; save(); renderStep(); refreshPreview(); } } });
document.addEventListener('click', e=>{ const el=e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='st-add'){ delete S.story.demo; S.story.items.push({id:'c'+Date.now().toString(36), date:'', title:'', text:''}); S.story.on=true; save(); renderStep(); refreshPreview(); edRail(); const ins=$$('[data-st=date]'); ins[ins.length-1]?.focus(); }
  if(a==='st-del'){ delete S.story.demo; const k=+el.dataset.i, [it]=S.story.items.splice(k,1); save(); renderStep(); refreshPreview(); edRail(); toast('Momen dihapus', ()=>{ S.story.items.splice(Math.min(k,S.story.items.length),0,it); save(); renderStep(); refreshPreview(); edRail(); }); }
  if(a==='st-up'){ const i=+el.dataset.i; if(i>0){ const x=S.story.items; [x[i-1],x[i]]=[x[i],x[i-1]]; delete S.story.demo; save(); renderStep(); refreshPreview(); } }
});


/* ---------- Gerbang pembuka ---------- */
const GATE={t0:performance.now(), busy:false};
const lum = hex => { const m=String(hex||'').replace('#','').match(/^([0-9a-f]{6})$/i); if(!m) return .5; const n=parseInt(m[1],16); const c=[n>>16&255,n>>8&255,n&255].map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
const gPat = c => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'>${[0,90,180,270].map(r=>`<path transform='rotate(${r} 30 30)' d='M30 26C25.5 21.5 25.5 11.5 30 5C34.5 11.5 34.5 21.5 30 26Z' fill='none' stroke='${c}' stroke-opacity='.28' stroke-width='1'/>`).join('')}<circle cx='30' cy='30' r='1.6' fill='${c}' fill-opacity='.4'/></svg>`)}")`;
const GATE_CLS = ['gimg','th','g-teras','g-taman','g-dongeng','g-goresan','g-kebun','g-light','g-dark','drape','dpv'];
// Tampilan gerbang pembuka per gaya tema: warna, ornamen, dan huruf diambil dari tema itu sendiri
/* Gerbang pembuka: lukisan AI per gaya tema (assets/gate). Panel terangkat dari bawah ke atas saat dibuka. */
const GATE_IMGS = ['arunika','atelier','beludru','dongeng','draperi','goresan','kamboja','kebun','klasik-gelap','klasik-terang','lentera','sekar','teras'];
function gateImg(t){
  if(isCx(t.id)){ const d=(cxTheme(t.id)||{}).dir; return d==='drapery'?'beludru':d==='coretan'?'goresan':d==='kolase'?'kolase':d==='lipatkertas'?'lipatkertas':d==='jendelabulan'?'jendelabulan':d==='pasarmalam'?'pasarmalam':d==='tepilaut'?'tepilaut':d==='lembarharian'?'lembarharian':'klasik-gelap'; }
  if(t.gate) return t.gate;
  const L=t.layout||'klasik';
  if(L==='klasik' || !GATE_IMGS.includes(L)) return lum(t.bg) < .35 ? 'klasik-gelap' : 'klasik-terang';
  return L;
}
function gateLook(t){ const look=gateLook0(t), k=gateImg(t);
  const ink = [t.fg,t.bg,t.accent].filter(Boolean).sort((a,b)=>lum(a)-lum(b))[0];
  look.v['--gimg']=`url(/assets/gate/${k}.webp)`; look.v['--gimg-ink']=ink; look.v['--gimg-ac']=t.accent||ink; look.cls.push('gimg');
  try{ const im=new Image(); im.src=`/assets/gate/${k}.webp`; }catch(e){}
  return look;
}
function gateLook0(t){
  const L=t.layout||'klasik', v={}, cls=[];
  if(L==='draperi'){
    const dark = lum(t.fg) < lum(t.bg) ? t.fg : t.bg;
    v['--gd']= lum(dark)<.12 ? dark : '#2B1A21'; v['--gm']= dark===t.fg ? t.bg : t.fg;
    if(t.fabric) v['--fab']=t.fabric; cls.push('drape'); if(t.dp){ cls.push('dpv'); v['--dp-v']=`url(/assets/draperi/velvet-${t.dp.k}.webp)`; }
    return {v,cls};
  }
  if(L==='beludru'){ Object.assign(v,{'--gd':'#3A080D','--gm':'#F5EEE3','--fab':'#0E2A1C','--dp-v':'url(/assets/beludru/velvet.webp)'}); cls.push('drape','dpv'); return {v,cls}; }
  cls.push('th'); v['--gfont']=t.font; v['--gink']=t.fg;
  if(L==='dongeng'){ cls.push('g-dongeng'); Object.assign(v,{'--gbg':t.bg,'--gd':'#F2B3C6','--ga':t.accent,'--gm':'#FFF9FB','--gink':t.accent,'--gl':t.accent,'--gtop':'url(/assets/ceria/swag.webp)','--gtop-h':'26vh','--gtop-s':'min(100%,620px) auto'}); }
  else if(L==='goresan'){ cls.push('g-goresan'); Object.assign(v,{'--gbg':t.bg,'--gd':t.bg,'--ga':t.accent,'--gm':t.bg,'--gink':t.accent,'--gl':t.accent,'--gsh':'rgba(43,27,23,.1)','--gtop':'url(/assets/goresan/tangan.webp)','--gtop-h':'calc(50% - 120px)','--gtop-y':'62%','--gtop-s':'min(84%,440px) auto'}); }
  else if(L==='teras'){ cls.push('g-teras'); Object.assign(v,{'--gbg':t.bg,'--gd':t.bg,'--ga':t.accent,'--gm':'#FFFDF8','--gl':'#B4472F','--gini':JSON.stringify(((S.bride.nick||'')[0]||'')+((S.groom.nick||'')[0]||''))}); if(t.ilGate) Object.assign(v,t.ilGate); if(t.ilMode) cls.push('g-'+t.ilMode); }
  else if(L==='kebun'){ const k=t.kbSet; cls.push('g-kebun'); Object.assign(v,{'--gbg':t.bg,'--gd':t.soft,'--ga':t.kbSh||t.accent,'--gm':'#FFFDF8','--gl':t.accent,'--gtop':`url(${k}s-atas.webp)`,'--gtop-h':'24vh','--gtop-s':'min(112%,640px) auto','--gfl':`url(${k}s-kiri.webp)`,'--gfr':`url(${k}s-kanan.webp)`}); }
  else if(['kamboja','arunika','atelier'].includes(L)){ const a = lum(t.accent)>.2 ? t.accent : t.soft; cls.push('g-dark'); Object.assign(v,{'--gbg':t.fg,'--gd':t.fg,'--ga':a,'--gm':t.bg,'--gl':a,'--gpat':gPat(a),'--gsh':'rgba(0,0,0,.35)','--gts':'0 2px 12px rgba(0,0,0,.35)'}); }
  else { cls.push('g-light'); Object.assign(v,{'--gbg':t.bg,'--gd':t.soft||t.bg,'--ga':t.accent,'--gm':'#FFFDF8','--gl':t.accent,'--gpat':gPat(t.accent)}); }
  return {v,cls};
}
function gateApply(g, look){ GATE_CLS.forEach(c=>g.classList.remove(c)); look.cls.forEach(c=>g.classList.add(c)); Object.entries(look.v).forEach(([k,val])=>g.style.setProperty(k,val)); }
function gateTheme(){
  const g=$('#gate'); if(!g) return; const t=themeById(S.theme); if(!t) return;
  const sl0=(location.pathname.match(/^\/u\/([a-z0-9-]+)/)||[])[1];
  if(isCx(S.theme)){ document.documentElement.classList.add('gate-off'); try{ if(sl0 && CLOUD.guestMode && !CLOUD.notFound) localStorage.setItem('sp-gate:'+sl0, JSON.stringify({cx:1})); }catch(e){} return; }
  document.documentElement.classList.remove('gate-off');
  const look=gateLook(t); gateApply(g, look);
  const n=$('#gateNames'); const n1=S.bride.nick||'', n2=S.groom.nick||''; if(n && n1 && n2){ n.innerHTML=`<small>The wedding of</small>${esc(n1)} &amp; ${esc(n2)}`; n.classList.add('on'); }
  g.classList.add('themed');
  // Simpan tampilan gerbang per undangan, supaya kunjungan berikutnya langsung pakai tema yang benar sejak detik pertama
  try{ const sl=(location.pathname.match(/^\/u\/([a-z0-9-]+)/)||[])[1]; if(sl && CLOUD.guestMode && !CLOUD.notFound) localStorage.setItem('sp-gate:'+sl, JSON.stringify({v:look.v, cls:look.cls, n1, n2})); }catch(e){}
}
function gateOpen(){
  const g=$('#gate'); if(!g || g.classList.contains('open')) return Promise.resolve();
  if(document.documentElement.classList.contains('gate-off')){ g.classList.remove('show','open'); g.style.display='none'; GATE.busy=false; return Promise.resolve(); }
  const wait = Math.max(0, 500 - (performance.now()-GATE.t0)); /* gerbang terbuka begitu data siap (sebelumnya minimal 1,7 detik) */
  return new Promise(res=>setTimeout(()=>{ g.classList.add('open'); setTimeout(()=>{ g.classList.remove('show','open'); g.style.display='none'; GATE.busy=false; res(); }, 1800); }, wait));
}
function playGate(){
  const g=$('#gate'); if(!g || GATE.busy) return; if(isCx(S.theme)){ g.style.display='none'; return; } GATE.busy=true; GATE.t0=performance.now();
  g.style.display=''; g.classList.remove('open'); g.classList.add('show');
  $$('.pt,.sd,b', g).forEach(x=>{ x.style.animation='none'; void x.getBoundingClientRect(); x.style.animation=''; });
  gateTheme(); requestAnimationFrame(()=>gateOpen());
}


document.addEventListener('click', e=>{ const a=e.target.closest('#edPub a[href]'); if(a) a.href=pubURL(); }, true);
/* ---------- Editor pesan WhatsApp ---------- */
let WAK='invite';
function waTplModal(kind){
  WAK = kind || WAK; const ex = G.find(g=>!isPending(g)) || {name:'Bapak Budi & Keluarga', code:'SP-CONTOH', sessions:S.events.map((e,i)=>i)};
  const tpl = waTpl(WAK);
  openModal(`<h2 class="display" style="font-size:30px">Pesan WhatsApp</h2><p class="muted" style="margin:6px 0 16px">Tulis sesuai keinginan. Bagian dalam kurung kurawal otomatis diganti sesuai tiap tamu, jadi satu template beres buat semua.</p>
    <div class="seg" role="tablist" aria-label="Jenis pesan" style="margin-bottom:14px"><button type="button" role="tab" data-wak="invite" aria-pressed="${WAK==='invite'}" aria-selected="${WAK==='invite'}">Undangan</button><button type="button" role="tab" data-wak="remind" aria-pressed="${WAK==='remind'}" aria-selected="${WAK==='remind'}">Pengingat</button></div>
    <div class="wa-ed"><div class="wa-ed-l"><label for="waTa" class="sr">Isi pesan</label><textarea class="input" id="waTa" rows="11">${esc(tpl)}</textarea>
      <div class="thx-chips"><span class="muted">Sisipkan:</span>${WA_TOKENS.map(([t,l])=>`<button type="button" class="chip" data-watok="${t}">${l}</button>`).join('')}</div>
      <p class="hint" id="waWarn" ${/\{link\}/.test(tpl)?'hidden':''}>Tanpa {link}, link undangan otomatis ditambahkan di akhir pesan supaya tamu tetap bisa membukanya.</p>
      <p class="hint">Format WhatsApp juga bisa dipakai: *tebal*, _miring_.</p></div>
    <div class="wa-ed-r"><small class="muted">Pratinjau untuk ${esc(ex.name)}</small><div class="wa-phone"><div class="wa-bubble" id="waPrev">${waFmt(waFill(tpl, ex))}</div></div></div></div>
    <div class="form-foot"><button class="btn btn-ghost" data-act="wa-reset">Kembalikan bawaan</button><button class="btn btn-primary" data-act="wa-save">Simpan pesan</button></div>`, true);
  const ta=$('#waTa'); ta.addEventListener('input',()=>{ $('#waPrev').innerHTML=waFmt(waFill(ta.value, ex)); $('#waWarn').hidden=/\{link\}/.test(ta.value); });
  waTplModal.ex=ex;
}
function waFmt(t){ return esc(t).replace(/\*([^*\n]+)\*/g,'<b>$1</b>').replace(/_([^_\n]+)_/g,'<i>$1</i>').replace(/~([^~\n]+)~/g,'<s>$1</s>').replace(/\n/g,'<br>').replace(/(https?:\/\/[^\s<]+)/g,'<u>$1</u>'); }
document.addEventListener('click', e=>{
  const k=e.target.closest('[data-wak]'); if(k){ const ta=$('#waTa'); if(ta) { const cur=ta.value; if(cur!==waTpl(WAK)){ if(WAK==='remind') S.waTplR=cur; else S.waTpl=cur; save(); } } waTplModal(k.dataset.wak); return; }
  const tk=e.target.closest('[data-watok]'); if(tk){ const ta=$('#waTa'); const a=ta.selectionStart, b=ta.selectionEnd; ta.setRangeText(tk.dataset.watok, a, b, 'end'); ta.focus(); ta.dispatchEvent(new Event('input',{bubbles:true})); return; }
  const el=e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='wa-tpl'){ waTplModal(el.dataset.kind||'invite'); }
  if(a==='wa-reset'){ const ta=$('#waTa'); ta.value=WA_DEF[WAK]; ta.dispatchEvent(new Event('input',{bubbles:true})); }
  if(a==='wa-save'){ const v=$('#waTa').value.trim(); const def=WA_DEF[WAK]; if(WAK==='remind') S.waTplR = (v && v!==def) ? v : undefined; else S.waTpl = (v && v!==def) ? v : undefined; save(); closeModal(); if(location.hash==='#dashboard') renderDash(); toast('Pesan WhatsApp tersimpan! Tombol Kirim WA sekarang pakai pesan ini.'); }
});

/* ---------- Animasi website ---------- */
let aniIO=null;
function aniScan(root){
  if(REDUCED() || !('IntersectionObserver' in window) || !root) return;
  if(!aniIO) aniIO = new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in'); aniIO.unobserve(en.target); } }), {rootMargin:'0px 0px -6% 0px', threshold:.08});
  const groups = [['.section-head > *',0],['.steps .step',1],['.split > *',1],['.ticks li',1],['.theme-strip > *',1],['.plans > *',1],['.feat-grid > *',1],['.price-note',0],['.faq details',1],['.cta-final',0],['#themeGrid > *',1],['.page-head > *',1],['.acct-grid > *',1],['.mini-dash .row',1]];
  groups.forEach(([sel,stag])=>{ $$(sel, root).forEach((el,i)=>{ if(el.dataset.ani) return; el.dataset.ani='1'; el.classList.add('ani'); el.style.setProperty('--ad', (stag?Math.min(i,6)*70:0)+'ms'); aniIO.observe(el); }); });
}



/* ---------- Catatan demo ---------- */
const demoSecs = () => DEMO.t0 ? Math.min(86400, Math.round((Date.now()-DEMO.t0)/1000)) : null;
const demoDevice = () => matchMedia('(max-width:760px)').matches ? 'hp' : 'desktop';
function demoLog(event, detail='', secs=null, userId=null){
  const sid = DEMO.sid || (()=>{ try{ return sessionStorage.getItem('sp-demo-sid'); }catch(e){ return null; } })();
  if(!sid) return;
  const row = {sid, event, detail:String(detail||'').slice(0,60), secs, device:demoDevice(), user_id:userId};
  if(!CLOUD.on || !CLOUD.sb){ try{ (window.__demoLog=window.__demoLog||[]).push(row); }catch(e){} return; }
  CLOUD.sb.from('demo_events').insert(row).then(()=>{}, ()=>{});
}
addEventListener('pagehide', ()=>{
  if(!DEMO.on || !CLOUD.on || !CLOUD.cfg) return;
  try{ fetch(CLOUD.cfg.supabaseUrl+'/rest/v1/demo_events', {method:'POST', keepalive:true, headers:{'apikey':CLOUD.cfg.supabaseAnonKey, 'Authorization':'Bearer '+CLOUD.cfg.supabaseAnonKey, 'Content-Type':'application/json', 'Prefer':'return=minimal'}, body:JSON.stringify({sid:DEMO.sid, event:'end', detail:'', secs:demoSecs(), device:demoDevice()})}); }catch(e){}
});
function demoAfterLogin(uid){
  let sid=null; try{ sid=sessionStorage.getItem('sp-demo-sid'); }catch(e){}
  if(!sid || !uid) return; demoLog('login','',null,uid); try{ sessionStorage.removeItem('sp-demo-sid'); }catch(e){}
}
const NUDGE = {
  tamu:   ['Tamu contoh berhasil ditambahkan! 🎉', 'Seru, bukan? Mau mulai memakai daftar tamu kalian sendiri? Masuk gratis, bisa dicicil dari sekarang.'],
  import: ['Ratusan tamu masuk dalam sekejap.', 'Mau impor daftar tamu kalian yang asli? Masuk gratis, bayarnya nanti saat undangan siap dikirim.'],
  checkin:['Begini rasanya menjadi penerima tamu. Mudah, bukan?', 'Mau menyiapkan undangan kalian sendiri? Masuk gratis untuk mulai.'],
  wa:     ['Di undangan kalian, tombol ini langsung membuka WhatsApp.', 'Tiap tamu dapat link dengan namanya sendiri. Masuk gratis untuk mulai menyiapkan.'],
  edit:   ['Wah, suka sama hasilnya?', 'Buat undangan kalian sendiri. Isinya bisa diubah kapan saja, bahkan setelah dikirim.']
};
function demoNudge(kind){
  if(!DEMO.on || DEMO.nudged[kind] || Object.keys(DEMO.nudged).length>=2 || Date.now()-DEMO.lastNudge<20000) return;
  DEMO.nudged[kind]=1; DEMO.lastNudge=Date.now(); demoLog('nudge',kind);
  const [t,sub]=NUDGE[kind];
  setTimeout(()=>{ if(!DEMO.on) return; demoNudgeClose();
    const n=document.createElement('div'); n.id='demoNudge'; n.setAttribute('role','dialog'); n.setAttribute('aria-label','Mulai undangan kalian sendiri');
    n.innerHTML=`<button type="button" class="dn-x" data-act="nudge-close" aria-label="Tutup">${ico('x')}</button><b>${t}</b><p>${sub}</p><div class="dn-a"><button type="button" class="btn btn-primary btn-sm" data-act="nudge-go" data-k="${kind}">Masuk, gratis</button><button type="button" class="btn btn-ghost btn-sm" data-act="nudge-close">Nanti saja</button></div>`;
    document.body.appendChild(n); requestAnimationFrame(()=>n.classList.add('in')); }, 1100);
}
function demoNudgeClose(){ const n=$('#demoNudge'); if(n) n.remove(); }
function demoToLogin(src){
  demoLog(src==='cta'?'cta':'nudge_click', src); demoNudgeClose(); closeModal(); exitDemo(); const tr=$('#toastRoot'); if(tr) tr.innerHTML='';
  location.hash='#buat';
  setTimeout(()=>openAuth(()=>{ location.hash='#dashboard'; }, 'demo'), 80);
}
document.addEventListener('click', e=>{
  const d=e.target.closest('a[href="#demo"]'); if(d && !DEMO.on) DEMO.src = d.closest('.nav,#mobileMenu') ? 'menu' : d.closest('.hero,.hero-ctas') ? 'beranda' : 'tautan';
  if(!DEMO.on) return;
  const t=e.target.closest('[data-dtab]'); if(t) demoLog('tab', t.dataset.dtab);
  const el=e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='nudge-close'){ demoNudgeClose(); return; }
  if(a==='nudge-go'){ e.stopImmediatePropagation(); demoToLogin(el.dataset.k); return; }
  if(a==='demo-start'){ demoLog('cta','buat-undangan'); }
  if(a==='do-import'){ demoLog('act','import'); demoNudge('import'); }
  if(a==='ci-confirm' || a==='ci-walkin'){ demoLog('act','checkin'); demoNudge('checkin'); }
  if(a==='wa-tpl'){ demoLog('act','template-wa'); }
  if(a==='print-cards' || a==='cards'){ demoLog('act','kartu-cetak'); }
}, true);
document.addEventListener('submit', e=>{ if(DEMO.on && e.target.id==='addG'){ demoLog('act','tambah-tamu'); demoNudge('tamu'); } }, true);
document.addEventListener('input', e=>{ if(DEMO.on && e.target.closest('#editor') && !DEMO.edited){ DEMO.edited=1; demoLog('act','edit-undangan'); setTimeout(()=>demoNudge('edit'), 6000); } }, true);

/* ---------- Mode demo ---------- */
function demoData(){
  const s = structuredClone(DEFAULT);
  Object.assign(s, {published:true, plan:'tamu', slug:'sarah-raka', giftNo:9, user:null, invoices:[], famInit:true, wlInit:true, storyInit:true, step:0,
    wishlist:{on:true, items:[{id:'k1',name:'Kulkas dua pintu',price:6000000,note:'Untuk dapur rumah baru kami'},{id:'k2',name:'Mesin cuci',price:4500000,note:''},{id:'k3',name:'Set alat masak',price:1500000,note:'Panci, wajan, dan pisau'}]},
    story:{on:true, items:[{id:'c1',date:'Maret 2022',title:'Pertama bertemu',text:'Kami berkenalan di acara kantor teman. Obrolan singkat soal kopi ternyata berlanjut sampai larut malam.'},{id:'c2',date:'Agustus 2024',title:'Melangkah lebih serius',text:'Setelah dua tahun saling mengenal, kami memberanikan diri bertemu keluarga satu sama lain.'},{id:'c3',date:'Oktober 2026',title:'Lamaran',text:'Dengan restu kedua keluarga, kami sepakat melangkah ke jenjang pernikahan.'}]},
    groups:[...GROUPS], cateringToken:'demo00catering00', families:[{id:'f1',name:'Keluarga Sarah',quota:150,token:'demo00keluarga01'},{id:'f2',name:'Keluarga Raka',quota:120,token:'demo00keluarga02'}]});
  const g = seedGuests(); const last=s.events.length-1;
  g.forEach(x=>{ x.sessions = (s.events.length>1 && /Kantor|Tetangga/.test(x.group)) ? [last] : s.events.map((e,i)=>i); x.code=makeCode(x); });
  g.slice(0,40).forEach((x,k)=>{ if(k%3===0) x.fam = k%2?'f2':'f1'; });
  [['Pak Haji Darmawan','081234567890','f1'],['Bu Siti Aminah','','f1'],['Tante Rina Kusuma','','f2']].forEach(([n,ph,f],k)=>{ const x={id:'fs'+k,name:n,phone:ph,group:'Keluarga '+(f==='f1'?'Sarah':'Raka'),status:'belum',pax:0,sent:false,sessions:s.events.map((e,i)=>i),fam:f,approved:false}; x.code=makeCode(x); g.push(x); });
  const now=Date.now(); let gift=0;
  // Rencana jam datang tamu (demo): sebaran wajar, paling ramai di tengah acara
  const evM=s.events.filter(e=>e.start), mainE=evM[evM.length-1], sl=slotsFor(mainE);
  const wt=[2,5,8,6,3,1.5,1,.6,.4,.3,.2,.2,.1,.1].slice(0,sl.length), wsum=wt.reduce((a,b)=>a+b,0);
  const hd=g.filter(x=>x.status==='hadir');
  hd.forEach((x,k)=>{ let r=((k*2654435761)>>>0)%1000/1000*wsum, i=0; while(r>wt[i] && i<wt.length-1){ r-=wt[i]; i++; } if(sl.length) x.arrive=sl[i]; });
  s.arrSeeded=true;
  // Yang sudah check-in: jam tibanya mengikuti rencana masing-masing, sebagian sedikit terlambat
  const ci=hd.slice(0,16).map((x,k)=>[x,(toMin(x.arrive)??toMin(mainE&&mainE.start)??660)+((k*11)%26)]).sort((a,b)=>a[1]-b[1]);
  const mEnd=ci.length?ci[ci.length-1][1]:0;
  ci.forEach(([x,m],k)=>{ x.checkin={ts:now-(mEnd-m+3)*60000, time:fromMin(m), pax:x.pax||1, gift:k%2===0?++gift:0, session:last}; });
  const W0=[{n:'Ani Wulandari',t:'2 jam lalu',m:'Selamat Sarah & Raka! Semoga jadi keluarga yang sakinah, mawaddah, warahmah. Sampai ketemu di Graha Sawala ya.',att:true,show:true},{n:'Om Darmawan',t:'5 jam lalu',m:'Barakallah, semoga lancar sampai hari H. Salam untuk Bapak dan Ibu.',att:true,show:true},{n:'Teman kantor Raka',t:'kemarin',m:'Congrats bro! Akhirnya. Kami datang rombongan setelah Jumatan, aman.',att:true,show:true},{n:'Bella Permata',t:'kemarin',m:'Maaf belum bisa hadir karena di luar kota, doa terbaik untuk kalian berdua.',att:false,show:true},{n:'Hana Halim',t:'2 hari lalu',m:'Happy wedding Sarah sayang, cantik banget undangannya!',att:true,show:true}];
  const GF=[{n:'Om Darmawan',bank:'BCA',amt:0,t:'Hari ini, 09.12'},{n:'Fitri Rahayu',bank:'BCA',amt:0,t:'Kemarin, 20.41'},{n:'Keluarga Halim',bank:'BCA',amt:0,t:'Kemarin, 18.05'}];
  return {S:s, G:g, W:W0, GIFTS:GF, PL:structuredClone(PL_DEMO), ALB:[]};
}
function enterDemo(){
  if(DEMO.on) return;
  DEMO.saved = {S, G, W, GIFTS, PL, ALB, uid:CLOUD.uid, inv:CLOUD.inv, dTab, editOn:EDIT.on};
  const d = demoData(); S=d.S; G=d.G; W=d.W; GIFTS=d.GIFTS; PL=d.PL; ALB=d.ALB; WLP=null;
  CLOUD.uid=null; CLOUD.inv=null; dTab='ringkasan'; DEMO.on=true;
  DEMO.sid = 'd'+Math.random().toString(36).slice(2,12)+Date.now().toString(36); DEMO.t0=Date.now(); DEMO.nudged={}; DEMO.lastNudge=0;
  try{ sessionStorage.setItem('sp-demo-sid', DEMO.sid); }catch(e){}
  demoLog('open', DEMO.src || (document.referrer && !document.referrer.includes(location.host) ? 'luar' : 'langsung')); DEMO.src='';
  document.documentElement.classList.add('demo'); demoPill(); renderAuthSlot(); const ed0=$('#editor'); if(ed0) delete ed0.dataset.built;
}
function exitDemo(){
  if(!DEMO.on) return; const v=DEMO.saved; demoLog('exit','',demoSecs()); demoNudgeClose();
  S=v.S; G=v.G; W=v.W; GIFTS=v.GIFTS; PL=v.PL; ALB=v.ALB; CLOUD.uid=v.uid; CLOUD.inv=v.inv; dTab=v.dTab||'ringkasan';
  DEMO.on=false; DEMO.saved=null; document.documentElement.classList.remove('demo'); demoPill(); renderAuthSlot();
  const ed=$('#editor'); if(ed) delete ed.dataset.built;
}
function demoPill(){
  let p=$('#demoPill');
  if(!DEMO.on){ if(p) p.remove(); return; }
  if(!p){ p=document.createElement('div'); p.id='demoPill'; p.setAttribute('role','status'); document.body.appendChild(p); }
  p.innerHTML=`<span class="dp-dot" aria-hidden="true"></span><span><b>Mode demo</b><span class="dp-x"> · data contoh, tidak disimpan</span></span><a href="#dashboard" class="dp-btn dp-back">Dashboard</a><button type="button" class="dp-btn" data-act="demo-exit">Keluar</button>`;
}
function demoBanner(){
  return `<div class="demo-ban" role="note"><div class="db-ic" aria-hidden="true">${ico('eye')}</div><div class="db-t"><b>Kalian sedang melihat demo</b><span>Ini dashboard contoh punya Sarah &amp; Raka. Klik apa saja dengan bebas. Tidak ada yang tersimpan dan tidak ada pesan yang benar-benar terkirim.</span></div><div class="db-a"><button type="button" class="btn btn-primary btn-sm" data-act="demo-start">Buat undanganku</button><button type="button" class="btn btn-ghost btn-sm" data-act="demo-exit">Keluar dari demo</button></div></div>`;
}
function prepBanner(){
  const n=G.length;
  return `<div class="demo-ban prep" role="note"><div class="db-ic" aria-hidden="true">${ico('users')}</div><div class="db-t"><b>${n?`${n} tamu sudah kalian siapkan`:'Cicil daftar tamu dari sekarang'}</b><span>Tempel daftar dari keluarga atau import Excel. Tombol kirim WhatsApp terbuka begitu undangan kalian dipublikasikan.</span></div><div class="db-a"><button type="button" class="btn btn-primary btn-sm" data-act="prep-publish">Publikasikan undangan</button></div></div>`;
}
function demoIntro(){
  try{ if(sessionStorage.getItem('sp-demo-intro')) return; sessionStorage.setItem('sp-demo-intro','1'); }catch(e){}
  openModal(`<div class="demo-intro"><span class="eyebrow">Mode demo</span><h2 class="display" style="font-size:32px;margin:8px 0 10px">Selamat datang di demo! 👋</h2>
    <p class="muted">Kalian akan melihat undangan dan dashboard milik pasangan contoh, Sarah &amp; Raka, lengkap dengan ${G.filter(g=>g.approved!==false).length} tamu. Klik apa saja: lihat siapa yang sudah menjawab, buka mode penerima tamu, atau utak-atik undangannya di editor.</p>
    <ul class="di-list"><li>${ico('check')}Tidak ada yang tersimpan</li><li>${ico('check')}Tidak ada pesan WhatsApp yang terkirim</li><li>${ico('check')}Undangan kalian sendiri aman, tidak tersentuh</li></ul>
    <div class="form-foot"><button class="btn btn-ghost" data-act="demo-start">Buat undangan sendiri</button><button class="btn btn-primary" data-act="close">Mulai lihat demo</button></div></div>`);
}
function prepLock(){
  openModal(`<h2 class="display" style="font-size:28px;padding-right:44px">Sedikit lagi bisa dikirim!</h2><p class="muted" style="margin:8px 0 18px">Daftar tamu kalian sudah aman tersimpan. Begitu undangan dipublikasikan, tiap tamu langsung punya link dengan namanya sendiri dan bisa kalian kirim lewat WhatsApp.</p><div class="form-foot"><button class="btn btn-ghost" data-act="close">Nanti dulu</button><button class="btn btn-primary" data-act="prep-publish">Publikasikan undangan</button></div>`);
}
document.addEventListener('click', e=>{
  const pl = DEMO.on && e.target.closest('a[href*="/u/"]');
  if(pl){ e.preventDefault(); e.stopImmediatePropagation(); demoLog('act','buka-link'); location.hash='#undangan'; toast('Ini undangan contoh, jadi belum punya link sungguhan'); return; }
  const cp = DEMO.on && e.target.closest('[data-act=copy][data-v*="/u/"]');
  if(cp){ e.preventDefault(); e.stopImmediatePropagation(); toast('Ini hanya demo. Link asli muncul begitu undangan kalian dipublikasikan'); return; }
  const wa = e.target.closest('a[href*="wa.me"]:not([data-wa-custom])');
  if(wa && DEMO.on){ e.preventDefault(); e.stopImmediatePropagation(); toast('Ini hanya demo, jadi pesannya tidak benar-benar dikirim 😉'); demoLog('act','kirim-wa'); demoNudge('wa'); return; }
  if(isPrep() && (wa || e.target.closest('[data-act=bulk-send],[data-act=remind]'))){ e.preventDefault(); e.stopImmediatePropagation(); prepLock(); return; }
  const el=e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(DEMO.on && ['upgrade','ed-publish','logout','login'].includes(a)){ e.preventDefault(); e.stopImmediatePropagation(); closeModal(); exitDemo(); location.hash = a==='login'||a==='logout' ? '#beranda' : '#buat'; return; }
  if(a==='demo-exit'){ closeModal(); exitDemo(); location.hash='#beranda'; }
  if(a==='demo-start'){ closeModal(); exitDemo(); location.hash='#buat'; }
  if(a==='prep-publish'){ closeModal(); S.step=4; save(); location.hash='#buat'; }
}, true);

/* ---------- Router ---------- */
/* ---------- Panel admin (/admin) ---------- */
const ADM = { tok: (()=>{ try{ return sessionStorage.getItem('sp-adm')||''; }catch(e){ return ''; } })(), me:null, tab:'ringkasan', stats:null, users:null, q:'', cfg:null, edit:null, draft:null, busy:false, err:'' };
const ADM_TABS = [['ringkasan','Ringkasan','home'],['keuangan','Keuangan','wallet'],['pengguna','Pengguna & undangan','users'],['tema','Tema','eye'],['paket','Paket','receipt'],['fitur','Fitur aktif','eye'],['akun','Akun admin','lock']];
const ADM_FONTS = [["","Bawaan tema"],["'Cormorant Garamond', Georgia, serif","Cormorant Garamond"],["'Bodoni Moda', Georgia, serif","Bodoni Moda"],["'Lora', Georgia, serif","Lora"],["'Marcellus', Georgia, serif","Marcellus"],["'Oswald', 'Plus Jakarta Sans', sans-serif","Oswald"],["'Great Vibes', cursive","Great Vibes (sambung)"],["'Itim', 'Mali', cursive","Itim (ceria)"],["'Patrick Hand', cursive","Patrick Hand (tulisan tangan)"],["'Permanent Marker', cursive","Permanent Marker (spidol)"],["'Plus Jakarta Sans', sans-serif","Plus Jakarta Sans"]];
const ADM_SECS = [['salam','Salam & mempelai'],['acara','Waktu & tempat'],['cerita','Kisah cinta'],['galeri','Galeri foto'],['rsvp','Konfirmasi kehadiran'],['hadiah','Tanda kasih'],['kado','Kado patungan'],['ucapan','Ucapan & doa']];
async function admApi(action, body={}){
  const r = await fetch('/api/admin', {method:'POST', headers:{'Content-Type':'application/json', ...(ADM.tok?{Authorization:'Bearer '+ADM.tok}:{})}, body:JSON.stringify({action, ...body})});
  let j={}; try{ j=await r.json(); }catch(e){}
  if(r.status===401 && action!=='login'){ admLogout(); }
  if(!r.ok) throw new Error(j.error || ('Gagal ('+r.status+')'));
  return j;
}
async function admSso(){
  if(!CLOUD.sb) return false;
  try{ const { data:{ session } } = await CLOUD.sb.auth.getSession(); if(!session) return false;
    const r = await fetch('/api/admin', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'sso', sb_token:session.access_token})});
    if(!r.ok) return false; const j = await r.json(); admSetTok(j.token); ADM.me = j.admin; ADM.sso = true; renderAuthSlot(); return true;
  }catch(e){ return false; }
}
function admSetTok(t){ ADM.tok=t||''; try{ t?sessionStorage.setItem('sp-adm',t):sessionStorage.removeItem('sp-adm'); }catch(e){} }
function admLogout(){ admSetTok(''); ADM.me=null; ADM.sso=false; ADM.ssoTried=true; ADM.stats=null; ADM.users=null; ADM.cfg=null; renderAdmin(); }
const admDate = iso => iso ? new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(new Date(iso)) : '—';
const admTime = iso => iso ? new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)) : '—';
const ADM_SK_MAIN = `<div class="sk-main"><i class="sk sk-eye"></i><i class="sk sk-h1"></i><div class="adm-tiles"><div class="adm-tile"><i class="sk sk-t1"></i><i class="sk sk-t2"></i><i class="sk sk-t3"></i></div><div class="adm-tile"><i class="sk sk-t1"></i><i class="sk sk-t2"></i><i class="sk sk-t3"></i></div><div class="adm-tile"><i class="sk sk-t1"></i><i class="sk sk-t2"></i><i class="sk sk-t3"></i></div><div class="adm-tile"><i class="sk sk-t1"></i><i class="sk sk-t2"></i><i class="sk sk-t3"></i></div></div><div class="adm-grid2"><div class="adm-card"><i class="sk sk-t1"></i><i class="sk sk-chart"></i></div><div class="adm-card"><i class="sk sk-t1"></i><i class="sk sk-row"></i><i class="sk sk-row"></i><i class="sk sk-row"></i><i class="sk sk-row"></i></div></div><div class="adm-card"><i class="sk sk-row"></i><i class="sk sk-row"></i><i class="sk sk-row"></i><i class="sk sk-row"></i><i class="sk sk-row"></i></div></div>`, ADM_SK = `<div class="adm sk-wrap" aria-busy="true" aria-label="Memuat panel admin"><aside class="adm-side sk-side"><i class="sk sk-logo"></i><i class="sk sk-pill"></i><nav><i class="sk sk-nav"></i><i class="sk sk-nav"></i><i class="sk sk-nav"></i><i class="sk sk-nav"></i><i class="sk sk-nav"></i><i class="sk sk-nav"></i></nav></aside><main class="adm-main"><div class="sk-main"><i class="sk sk-eye"></i><i class="sk sk-h1"></i><div class="adm-tiles"><div class="adm-tile"><i class="sk sk-t1"></i><i class="sk sk-t2"></i><i class="sk sk-t3"></i></div><div class="adm-tile"><i class="sk sk-t1"></i><i class="sk sk-t2"></i><i class="sk sk-t3"></i></div><div class="adm-tile"><i class="sk sk-t1"></i><i class="sk sk-t2"></i><i class="sk sk-t3"></i></div><div class="adm-tile"><i class="sk sk-t1"></i><i class="sk sk-t2"></i><i class="sk sk-t3"></i></div></div><div class="adm-grid2"><div class="adm-card"><i class="sk sk-t1"></i><i class="sk sk-chart"></i></div><div class="adm-card"><i class="sk sk-t1"></i><i class="sk sk-row"></i><i class="sk sk-row"></i><i class="sk sk-row"></i><i class="sk sk-row"></i></div></div><div class="adm-card"><i class="sk sk-row"></i><i class="sk sk-row"></i><i class="sk sk-row"></i><i class="sk sk-row"></i><i class="sk sk-row"></i></div></div></main></div>`;
async function renderAdmin(){
  const el = $('#admin'); if(!el) return; document.documentElement.classList.remove('boot-admin');
  document.title = 'Admin · Sakara';
  if(!ADM.tok && !ADM.ssoTried){ ADM.ssoTried = true; el.innerHTML = ADM_SK; if(await admSso()) return renderAdmin(); }
  if(!ADM.tok){ el.innerHTML = admLoginHTML(); return; }
  if(!ADM.me){ el.innerHTML = ADM_SK; try{ ADM.me=(await admApi('me')).admin; }catch(e){ admLogout(); return; } }
  if(ADM.me.must_change){ el.innerHTML = admMustHTML(); return; }
  el.innerHTML = `<div class="adm">
    <aside class="adm-side"><a class="adm-brand" href="/">${$('.brand')?.innerHTML||'Sakara'}</a><span class="adm-badge">Admin</span>
      <nav>${ADM_TABS.map(([k,l,ic])=>`<button type="button" data-adm-tab="${k}" aria-current="${ADM.tab===k}">${ico(ic)}<span>${l}</span></button>`).join('')}</nav>
      <a class="adm-home" href="/">${ico('home')}<span>Ke beranda Sakara</span></a>
      <div class="adm-me"><b>${esc(ADM.me.username)}</b><button type="button" class="btn btn-ghost btn-sm" data-adm="logout">Keluar</button></div></aside>
    <main class="adm-main" id="admMain">${ADM_SK_MAIN}</main></div>`;
  admRenderTab();
  requestAnimationFrame(()=>{ const b=$('.adm-side nav [aria-current=true]'); if(b && b.scrollIntoView) b.scrollIntoView({block:'nearest',inline:'nearest'}); });
}
function admLabelTables(root){ $$('.adm-tbl', root||document).forEach(t=>{ const hs=$$('thead th', t).map(h=>h.textContent.trim()); $$('tbody tr', t).forEach(tr=>{ let i=0; [...tr.children].forEach(td=>{ if(!td.hasAttribute('data-l') && hs[i] && i>0) td.setAttribute('data-l', hs[i]); i += +(td.getAttribute('colspan')||1); }); }); }); }
if(!window._admMO){ window._admMO = new MutationObserver(()=>{ const m=$('#admMain'); if(m) admLabelTables(m); }); addEventListener('DOMContentLoaded',()=>{}); setTimeout(()=>{ const a=$('#admin'); if(a) window._admMO.observe(a,{childList:true,subtree:true}); },0); }
async function admRenderTab(){
  const m = $('#admMain'); if(!m) return;
  const needsLoad = (ADM.tab==='ringkasan'&&!ADM.stats)||(ADM.tab==='pengguna'&&!ADM.users)||(ADM.tab==='keuangan'&&!FIN.rows)||(['tema','fitur','paket'].includes(ADM.tab)&&!ADM.cfg)||ADM.tab==='akun';
  if(needsLoad) m.innerHTML = ADM_SK_MAIN;
  try{
    if(ADM.tab==='ringkasan'){ if(!ADM.stats) ADM.stats = await admApi('stats'); m.innerHTML = admStatsHTML(ADM.stats); }
    if(ADM.tab==='keuangan'){ if(!ADM.cfg) await admLoadCfg(); if(!FIN.rows) FIN.rows = (await admApi('finance')).invoices; m.innerHTML = admFinHTML(); }
    if(ADM.tab==='pengguna'){ if(!ADM.users) ADM.users = (await admApi('users',{q:ADM.q})).users; m.innerHTML = admUsersHTML(); }
    if(ADM.tab==='tema'){ if(!ADM.cfg) await admLoadCfg(); m.innerHTML = ADM.edit ? admThemeEditHTML() : admThemesHTML(); if(ADM.edit) admPreview(); }
    if(ADM.tab==='fitur'){ if(!ADM.cfg) await admLoadCfg(); m.innerHTML = admFeatHTML(); }
    if(ADM.tab==='paket'){ if(!ADM.cfg) await admLoadCfg(); if(!ADM.stats){ try{ ADM.stats = await admApi('stats'); }catch(e){} } m.innerHTML = admPkgHTML(); }
    if(ADM.tab==='akun'){ const r = await admApi('admins_list'); m.innerHTML = admAkunHTML(r.admins); }
  }catch(e){ m.innerHTML = `<div class="adm-err"><b>Belum bisa memuat data.</b><p>${esc(e.message)}</p><button class="btn btn-ghost btn-sm" data-adm="reload">Coba lagi</button></div>`; }
}
async function admLoadCfg(){ ADM.cfg = (await admApi('config_get')).config || {}; ['themes','features','prices'].forEach(k=>{ if(!ADM.cfg[k]) ADM.cfg[k]={}; }); applyConfig(ADM.cfg); try{ localStorage.setItem('sp-appcfg', JSON.stringify(ADM.cfg)); }catch(e){} }
function admLoginHTML(){ return `<div class="adm-center"><form class="adm-card adm-login" data-adm-form="login">
  <div class="adm-brand">${$('.brand')?.innerHTML||'Sakara'}</div><span class="eyebrow">Panel admin</span><h1 class="display" style="font-size:30px;margin:6px 0 18px">Masuk sebagai admin</h1>
  <label class="lbl" for="admU">Username</label><input class="input" id="admU" name="username" autocomplete="username" required>
  <label class="lbl" for="admP">Sandi</label><input class="input" id="admP" name="password" type="password" autocomplete="current-password" required>
  ${ADM.err?`<p class="adm-msg err">${esc(ADM.err)}</p>`:''}
  <button class="btn btn-primary btn-block" style="margin-top:18px">Masuk</button>
  <a class="adm-back" href="/">← Kembali ke Sakara</a></form></div>`; }
function admMustHTML(){ return `<div class="adm-center"><form class="adm-card adm-login" data-adm-form="pw">
  <span class="eyebrow">Langkah pertama</span><h1 class="display" style="font-size:28px;margin:6px 0 8px">Ganti sandi dulu, ya</h1>
  <p class="muted" style="margin:0 0 16px">Sandi bawaan cuma untuk masuk pertama kali. Buat sandi sendiri supaya panel ini aman.</p>
  <label class="lbl">Username</label><input class="input" name="username" value="${esc(ADM.me.username)}" autocomplete="username" required>
  <label class="lbl">Email (opsional)</label><input class="input" name="email" type="email" value="${esc(ADM.me.email||'')}">
  <label class="lbl">Sandi sekarang</label><input class="input" name="old" type="password" autocomplete="current-password" required>
  <label class="lbl">Sandi baru (min. 8 karakter)</label><input class="input" name="new" type="password" autocomplete="new-password" minlength="8" required>
  <label class="lbl">Ulangi sandi baru</label><input class="input" name="new2" type="password" autocomplete="new-password" minlength="8" required>
  ${ADM.err?`<p class="adm-msg err">${esc(ADM.err)}</p>`:''}
  <button class="btn btn-primary btn-block" style="margin-top:18px">Simpan & lanjut</button>
  <button type="button" class="adm-back" data-adm="logout">Keluar</button></form></div>`; }
function admStatsHTML(s){
  const tile = (l,v,sub,ic,tn,hl) => `<div class="adm-tile ic${hl?' hl':''}"><i class="adm-ic tn-${tn}">${ico(ic)}</i><b class="num">${v}</b><span>${l}</span>${sub?`<small>${sub}</small>`:''}</div>`;
  const panel = (t,d,body,link,flush) => `<section class="adm-card pn"><header class="adm-ph"><div><h2>${t}</h2><p>${d}</p></div>${link||''}</header><div class="adm-pb${flush?' flush':''}">${body}</div></section>`;
  const empty = (ic,t,d,tn='green') => `<div class="adm-empty">${karaImg('tidur')}<b>${t}</b>${d?`<p>${d}</p>`:''}</div>`;
  const days = Array.from({length:14},(_,i)=>{ const d=new Date(Date.now()+7*3600e3-(13-i)*864e5).toISOString().slice(0,10); return [d, s.signups[d]||0]; });
  const mx = Math.max(1,...days.map(d=>d[1])), totalDays = days.reduce((a,d)=>a+d[1],0);
  const themes = Object.entries(s.themes||{}).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const inv = (s.invoices||[]).slice(0,6);
  const ST = {paid:'Lunas',pending:'Menunggu',expired:'Kedaluwarsa',failed:'Gagal'};
  const plans = Object.entries(s.byPlan||{}).map(([k,n])=>`${esc((planOf(k)||{name:k}).name)} ${n}`).join(' · ');
  return `<header class="adm-head"><div><span class="eyebrow">Ringkasan</span><h1 class="display">Apa kabar Sakara hari ini</h1></div><button class="btn btn-ghost btn-sm" data-adm="refresh">${ico('undo')}Muat ulang</button></header>
  <div class="adm-tiles">
    ${tile('Pengguna terdaftar',s.users.toLocaleString('id-ID'),`+${s.new7} minggu ini · +${s.new30} dalam 30 hari`,'users','amber',1)}
    ${tile('Undangan tayang',s.published.toLocaleString('id-ID'),plans,'check','green')}
    ${tile('Total tamu',s.guests.toLocaleString('id-ID'),'di semua undangan','family','gray')}
    ${tile('Total pendapatan',rupiah(s.revenue),`${s.paidCount} transaksi lunas`,'grid','blue')}
  </div>
  <div class="adm-grid2">
    ${panel('Pendaftar 14 hari terakhir', totalDays?`${totalDays} orang baru mendaftar dalam dua minggu ini.`:'Jumlah akun baru per hari.',
      totalDays?`<div class="adm-bars">${days.map(([d,n])=>`<div title="${d}: ${n}"><i style="height:${Math.round(n/mx*100)}%"></i><b>${n||''}</b><small>${+d.slice(8)}</small></div>`).join('')}</div>`
        : empty('chart','Belum ada pendaftar baru.','Grafik muncul begitu ada yang mendaftar.'))}
    ${panel('Tema paling dipakai','Tema pilihan pasangan di semua undangan.',
      themes.length?`<ol class="adm-rank">${themes.map(([id,n])=>`<li><span>${esc(themeById(id).name)}</span><b class="num">${n}</b></li>`).join('')}</ol>`
        : empty('heart','Belum ada tema terpakai.','Urutan tema muncul setelah pasangan membuat undangan.'),
      `<button type="button" class="linkbtn" data-adm-tab="tema">Atur tema</button>`)}
  </div>
  ${panel('Transaksi terbaru','Enam pembayaran terakhir dari semua pengguna.',
    inv.length?`<div class="tbl-wrap" style="display:block"><table class="adm-tbl adm-inv"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Item</th><th>Metode</th><th class="num">Total</th><th>Status</th></tr></thead><tbody>
      ${inv.map(i=>`<tr><td>${admTime(i.created_at)}</td><td>${esc(i.email||'—')}</td><td>${esc(i.item)}${i.voucher?` <span class="chip">${esc(i.voucher)}</span>`:''}</td><td>${esc(i.method||'—')}</td><td class="num">${rupiah(i.total)}</td><td><span class="adm-st st-${i.status}">${ST[i.status]||i.status}</span></td></tr>`).join('')}
    </tbody></table></div>` : empty('inbox','Belum ada transaksi.','Pembayaran pertama akan langsung muncul di sini.'),
    `<button type="button" class="linkbtn" data-adm-tab="keuangan">Lihat semua</button>`, inv.length)}
  <div class="adm-grid2">
    ${panel('Mode demo','Pengunjung yang mencoba demo dalam 14 hari terakhir.',
      (s.demo||[]).length?`<div class="tbl-wrap" style="display:block"><table class="adm-tbl adm-nums" style="--n:4"><thead><tr><th>Hari</th><th class="num">Pengunjung</th><th class="num">Coba fitur</th><th class="num">Klik mulai</th><th class="num">Login</th></tr></thead><tbody>${s.demo.map(d=>`<tr><td>${admDate(d.hari)}</td><td class="num">${d.pengunjung_demo}</td><td class="num">${d.mencoba_fitur}</td><td class="num">${d.klik_mulai}</td><td class="num">${d.jadi_login}</td></tr>`).join('')}</tbody></table></div>`
        : empty('eye','Belum ada kunjungan demo.','Data muncul saat ada yang membuka mode demo.'), '', (s.demo||[]).length)}
    ${panel('Fitur demo terpopuler','Fitur yang paling sering dicoba di mode demo.',
      (s.demoFeatures||[]).length?`<ol class="adm-rank">${s.demoFeatures.map(f=>`<li><span>${esc(f.event)} · ${esc(f.detail||'—')}</span><b class="num">${f.orang} org</b></li>`).join('')}</ol>`
        : empty('play','Belum ada fitur yang dicoba.',''))}
  </div>`;
}
function admUsersHTML(){
  const u = ADM.users||[];
  return `<header class="adm-head"><div><span class="eyebrow">Pengguna & undangan</span><h1 class="display">${u.length} pengguna</h1></div>
    <form class="adm-search" data-adm-form="search"><input class="input" name="q" value="${esc(ADM.q)}" placeholder="Cari email, nama, atau alamat link"><button class="btn btn-ghost btn-sm">Cari</button></form></header>
  <section class="adm-card" style="padding:0"><div class="tbl-wrap" style="display:block"><table class="adm-tbl adm-users"><thead><tr><th>Pengguna</th><th>Undangan</th><th>Paket</th><th>Tayang</th><th class="num">Tamu</th><th class="num">Dibayar</th><th>Akses</th></tr></thead><tbody>
  ${u.map(x=>{ const banned = x.banned_until && new Date(x.banned_until)>new Date(); return `<tr${banned?' class="ban"':''}>
    <td><b>${esc(x.name||x.email.split('@')[0])}</b><small>${esc(x.email)}</small><small>Daftar ${admDate(x.created_at)} · aktif ${admDate(x.last_sign_in_at)}</small></td>
    <td>${x.invitation_id?`<b>${esc((x.bride||'?')+' & '+(x.groom||'?'))}</b><small>${x.slug?`<a href="/u/${esc(x.slug)}" target="_blank" rel="noopener">/u/${esc(x.slug)}</a>`:'—'} · ${esc(themeById(x.theme).name)}</small>`:'<span class="muted">Belum membuat</span>'}</td>
    <td data-l="Paket">${x.invitation_id?`<select class="input adm-sel" data-adm-plan="${x.invitation_id}">${PLANS.concat(planOf(x.plan)||!x.plan?[]:[{id:x.plan,name:x.plan}]).map(p=>`<option value="${p.id}"${x.plan===p.id?' selected':''}>${esc(p.name)}</option>`).join('')}</select>`:'—'}</td>
    <td data-l="Tayang">${x.invitation_id?`<label class="switch"><input type="checkbox" data-adm-pub="${x.invitation_id}" ${x.published?'checked':''} aria-label="Tayangkan undangan"><span></span></label>`:'—'}</td>
    <td class="num" data-l="Tamu">${x.guests||0}<small>${x.hadir||0} hadir</small></td>
    <td class="num" data-l="Dibayar">${x.paid_total?rupiah(x.paid_total):'—'}</td>
    <td data-l="Akses"><button type="button" class="btn btn-ghost btn-sm" data-adm-ban="${x.id}" data-ban="${banned?0:1}">${banned?'Buka blokir':'Blokir'}</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="muted" style="padding:24px">Tidak ada pengguna yang cocok.</td></tr>'}
  </tbody></table></div></section>`;
}
function admThemesHTML(){
  const all = THEMES.slice(); const ov = ADM.cfg.themes||{};
  const sorted = all.map((t,i)=>[t,i]).sort((a,b)=>{ const oa=(ov[a[0].id]||{}).order, ob=(ov[b[0].id]||{}).order; return (Number.isFinite(oa)?oa:1e4+a[1])-(Number.isFinite(ob)?ob:1e4+b[1]); }).map(x=>x[0]);
  return `<header class="adm-head"><div><span class="eyebrow">Tema</span><h1 class="display">${all.length} tema</h1><p class="muted" style="margin:6px 0 0">Atur tema mana yang tampil di katalog, urutannya, dan isi tiap bagian. Tema yang disembunyikan tetap jalan untuk pasangan yang sudah memakainya.</p></div></header>
  <section class="adm-card" style="padding:6px 0"><ul class="adm-themes">${sorted.map((t,i)=>{ const o=ov[t.id]||{}; const n=(o.hide||[]).length; return `<li class="${o.hidden?'off':''}">
    <span class="sw" style="background:${t.thumb?t.thumb(t):`linear-gradient(135deg,${t.bg},${t.accent})`}"></span>
    <div class="nm"><b>${esc(t.name)}</b><small>${esc(t.region)} · ${esc(t.tags.join(', '))}${n?` · ${n} bagian disembunyikan`:''}${Object.keys(o).filter(k=>!['hidden','order'].includes(k)).length?' · <em>diubah</em>':''}</small></div>
    <div class="mv"><button type="button" class="btn btn-ghost btn-sm" data-adm-mv="${t.id}" data-d="-1" ${i===0?'disabled':''} aria-label="Naikkan">↑</button><button type="button" class="btn btn-ghost btn-sm" data-adm-mv="${t.id}" data-d="1" ${i===sorted.length-1?'disabled':''} aria-label="Turunkan">↓</button></div>
    <label class="adm-tog"><span>${o.hidden?'Tersembunyi':'Tampil'}</span><span class="switch"><input type="checkbox" data-adm-thide="${t.id}" ${o.hidden?'':'checked'} aria-label="Tampilkan ${esc(t.name)} di katalog"><span></span></span></label>
    <button type="button" class="btn btn-primary btn-sm" data-adm-tedit="${t.id}">Atur</button></li>`; }).join('')}</ul></section>`;
}
const admBgRow = (k, d) => { const u=(d.imgs||{})[k]; return `<div class="adm-bg"><span class="adm-bg-sw${u?'':' empty'}" ${u?`style="background-image:url('${esc(u)}')"`:''}>${u?'':ico('camera')}</span><span class="adm-bg-l">${u?'Gambar latar sendiri':'Latar bawaan tema'}</span><label class="btn btn-ghost btn-sm">${u?'Ganti':'Ganti gambar'}<input type="file" accept="image/*" data-td-img="${k}" hidden></label>${u?`<button type="button" class="btn btn-ghost btn-sm" data-td-imgdel="${k}">Pakai bawaan</button>`:''}</div>`; };
function admThemeEditHTML(){
  const t = themeById(ADM.edit), b = THEME_BASE.get(t.id) || t, d = ADM.draft;
  const col = (k,l) => `<label class="adm-col"><span>${l}</span><input type="color" data-td="${k}" value="${esc(d[k]||b[k]||'#000000')}"><button type="button" class="adm-x" data-td-reset="${k}" title="Kembalikan">↺</button></label>`;
  return `<header class="adm-head"><div><button type="button" class="adm-back" data-adm="tback">← Semua tema</button><h1 class="display">${esc(d.name||b.name)}</h1></div>
    <div class="adm-acts"><button type="button" class="btn btn-ghost btn-sm" data-adm="treset">Kembalikan bawaan</button><button type="button" class="btn btn-primary btn-sm" data-adm="tsave">Simpan tema</button></div></header>
  <div class="adm-tedit"><div class="adm-tform">
    <section class="adm-card"><h2>Identitas</h2>
      <label class="lbl">Nama tema</label><input class="input" data-td="name" value="${esc(d.name||'')}" placeholder="${esc(b.name)}">
      <label class="lbl">Tag (pisahkan dengan koma)</label><input class="input" data-td="tags" value="${esc((d.tags||[]).join(', '))}" placeholder="${esc(b.tags.join(', '))}">
      <label class="adm-row"><span>Tampil di katalog</span><span class="switch"><input type="checkbox" data-td="shown" ${d.hidden?'':'checked'}><span></span></span></label></section>
    <section class="adm-card"><h2>Warna & huruf</h2><div class="adm-cols">${col('bg','Latar')}${col('fg','Teks')}${col('accent','Aksen')}${col('soft','Lembut')}</div>
      <label class="lbl">Huruf judul</label><select class="input" data-td="font">${ADM_FONTS.map(([v,l])=>`<option value="${esc(v)}"${(d.font||'')===v?' selected':''}>${l}</option>`).join('')}</select></section>
    <section class="adm-card"><h2>Bagian undangan</h2><p class="muted" style="margin:-4px 0 12px;font-size:14px">Matikan bagian yang tidak cocok untuk tema ini, ubah judul bawaannya, atau sembunyikan hiasannya. Pasangan tetap bisa mengatur isi bagian dari editor mereka.</p>
      <div class="adm-secs">${ADM_SECS.map(([k,l])=>`<div class="adm-sec${(d.hide||[]).includes(k)?' off':''}"><div class="h"><b>${l}</b>
        <label class="adm-mini"><input type="checkbox" data-td-sec="${k}" ${(d.hide||[]).includes(k)?'':'checked'}> Tampil</label>
        <label class="adm-mini"><input type="checkbox" data-td-deco="${k}" ${(d.nodeco||[]).includes(k)?'':'checked'}> Hiasan</label></div>
        <div class="f"><input class="input" data-td-title="${k}" value="${esc((d.titles||{})[k]||'')}" placeholder="Judul bawaan"><input class="input" data-td-kick="${k}" value="${esc((d.kick||{})[k]??'')}" placeholder="Teks kecil di atas judul (opsional)"></div>${admBgRow(k,d)}</div>`).join('')}
        <div class="adm-sec"><div class="h"><b>Sampul</b><label class="adm-mini"><input type="checkbox" data-td-deco="cover" ${(d.nodeco||[]).includes('cover')?'':'checked'}> Hiasan</label></div>${admBgRow('cover',d)}</div>
        <div class="adm-sec"><div class="h"><b>Penutup</b><label class="adm-mini"><input type="checkbox" data-td-deco="penutup" ${(d.nodeco||[]).includes('penutup')?'':'checked'}> Hiasan</label></div>${admBgRow('penutup',d)}</div>
        <div class="adm-sec"><div class="h"><b>Latar seluruh halaman</b><small class="muted">di belakang semua bagian</small></div>${admBgRow('page',d)}</div>
        <div class="adm-sec"><div class="h"><b>Semua hiasan & stiker</b><label class="adm-mini"><input type="checkbox" data-td-deco="all" ${(d.nodeco||[]).includes('all')?'':'checked'}> Tampil</label></div></div>
      </div></section></div>
    <div class="adm-tprev"><div class="adm-phone"><div class="adm-phone-in" id="admPrev"></div></div><small class="muted">Pratinjau langsung, pakai data contoh</small></div></div>`;
}
function admDraftClean(d){ const o={}; ['name','bg','fg','accent','soft','font'].forEach(k=>{ if(d[k]) o[k]=d[k]; }); if(d.tags&&d.tags.length) o.tags=d.tags; if(d.hidden) o.hidden=true; if(Number.isFinite(d.order)) o.order=d.order;
  ['hide','nodeco'].forEach(k=>{ if(d[k]&&d[k].length) o[k]=d[k].slice(); }); if(d.imgs){ const im={}; Object.entries(d.imgs).forEach(([a,u])=>{ if(u) im[a]=u; }); if(Object.keys(im).length) o.imgs=im; } ['titles','kick'].forEach(k=>{ const v={}; Object.entries(d[k]||{}).forEach(([a,b])=>{ if(b!=='' && b!=null) v[a]=b; }); if(Object.keys(v).length) o[k]=v; }); return o; }
function admPreview(){
  const box = $('#admPrev'); if(!box || !ADM.edit) return;
  const keep = ADM.cfg.themes[ADM.edit]; ADM.cfg.themes[ADM.edit] = admDraftClean(ADM.draft); applyConfig(ADM.cfg);
  try{ box.innerHTML = invHTML({theme:ADM.edit, idp:'ap', guest:'Tamu undangan'}); } finally { if(keep) ADM.cfg.themes[ADM.edit]=keep; else delete ADM.cfg.themes[ADM.edit]; applyConfig(ADM.cfg); }
  $$('.cv-in', box).forEach(x=>x.style.animation='none');
}
async function admSaveThemes(msg){ await admApi('config_set',{key:'themes', value:ADM.cfg.themes}); applyConfig(ADM.cfg); try{ localStorage.setItem('sp-appcfg', JSON.stringify(ADM.cfg)); }catch(e){} toast(msg||'Tersimpan. Langsung berlaku di situs.'); }
function admFeatHTML(){
  const groups = [...new Set(FEATURE_LIST.map(f=>f[2]))];
  return `<header class="adm-head"><div><span class="eyebrow">Fitur aktif</span><h1 class="display">Saklar fitur untuk semua pengguna</h1>
    <p class="muted" style="margin:6px 0 0">Saklar di sini berlaku untuk <b>semua paket sekaligus</b>, misalnya untuk mematikan sementara fitur yang sedang diperbaiki. Data yang sudah ada tidak terhapus.</p></div></header>
  <div class="adm-info">${ico('receipt')}<span>Mau mengatur fitur apa saja yang didapat tiap paket (misalnya Undangan vs Undangan Lengkap)? Atur di menu <button type="button" class="linkbtn" data-adm-tab="paket">Paket</button>.</span></div>
  <section class="adm-card" style="max-width:760px">${groups.map(g=>`<h3 class="adm-sub">${g}</h3>${FEATURE_LIST.filter(f=>f[2]===g).map(([k,l])=>`<label class="adm-row"><span>${l}<small>${ADM.cfg.features[k]===false?'Mati untuk semua pengguna':'Menyala, mengikuti isi paket'}</small></span><span class="switch"><input type="checkbox" data-adm-ff="${k}" ${ADM.cfg.features[k]===false?'':'checked'}><span></span></span></label>`).join('')}`).join('')}</section>`;
}
function admAddModal(){
  openModal(`<form data-adm-form="add" class="adm-form adm-modal-form"><span class="eyebrow">Akun admin</span><h2 class="display" style="font-size:28px;margin:6px 0 4px;padding-right:44px">Tambah admin baru</h2>
    <p class="muted" style="margin:0 0 6px;font-size:14px">Admin baru bisa masuk lewat /admin dengan username & sandi ini, atau langsung lewat login Google kalau emailnya sama.</p>
    <label class="lbl">Username</label><input class="input" name="username" required placeholder="mis. dewi" autocomplete="off" pattern="[a-z0-9._-]{3,40}" title="3–40 karakter: huruf kecil, angka, titik, strip">
    <label class="lbl">Email Google (opsional)</label><input class="input" name="email" type="email" placeholder="nama@gmail.com" autocomplete="off">
    <label class="lbl">Sandi awal (min. 8 karakter)</label><input class="input" name="password" type="password" minlength="8" required autocomplete="new-password">
    <label class="adm-mini" style="margin-top:12px"><input type="checkbox" name="must" checked> Wajib ganti sandi saat pertama masuk</label>
    <div class="form-foot"><button type="button" class="btn btn-ghost" data-act="close">Batal</button><button class="btn btn-primary">Tambah admin</button></div></form>`);
  setTimeout(()=>{ const i=document.querySelector('.adm-modal-form [name=username]'); i&&i.focus(); },60);
}
function admAkunHTML(list){
  return `<header class="adm-head"><div><span class="eyebrow">Akun admin</span><h1 class="display">Siapa saja yang bisa masuk</h1></div></header>
  <div class="adm-grid2"><section class="adm-card"><h2>Akunmu</h2><form data-adm-form="pw" class="adm-form">
    <label class="lbl">Username</label><input class="input" name="username" value="${esc(ADM.me.username)}" autocomplete="username" required>
    <label class="lbl">Email</label><input class="input" name="email" type="email" value="${esc(ADM.me.email||'')}">
    <label class="lbl">Sandi sekarang</label><input class="input" name="old" type="password" autocomplete="current-password" required>
    <label class="lbl">Sandi baru (min. 8 karakter)</label><input class="input" name="new" type="password" autocomplete="new-password" minlength="8" required>
    <label class="lbl">Ulangi sandi baru</label><input class="input" name="new2" type="password" autocomplete="new-password" minlength="8" required>
    <button class="btn btn-primary" style="margin-top:14px">Simpan perubahan</button></form></section>
  <section class="adm-card"><h2>Semua admin</h2><ul class="adm-admins">${list.map(a=>`<li><div><b>${esc(a.username)}</b><small>${esc(a.email||'tanpa email')} · masuk terakhir ${admTime(a.last_login)}${a.must_change?' · belum ganti sandi':''}</small></div>${a.id===ADM.me.id?'<span class="chip">Kamu</span>':`<button type="button" class="btn btn-ghost btn-sm" data-adm-del="${a.id}" data-n="${esc(a.username)}">Hapus</button>`}</li>`).join('')}</ul>
    <button type="button" class="btn btn-primary" data-adm-addopen style="margin-top:16px">${ico('plus')}Tambah admin</button></section></div>`;
}
document.addEventListener('submit', async e=>{
  const f = e.target.closest('[data-adm-form]'); if(!f) return; e.preventDefault();
  const v = Object.fromEntries(new FormData(f)); const k = f.dataset.admForm; const btn=f.querySelector('button:not([type=button])'); if(btn) btn.disabled=true;
  try{
    if(k==='login'){ const r = await admApi('login',{username:v.username, password:v.password}); admSetTok(r.token); ADM.me=r.admin; ADM.err=''; renderAdmin(); return; }
    if(k==='pw'){ if(v.new!==v.new2) throw new Error('Ulangi sandi baru belum sama'); const r = await admApi('change_password',{old:v.old, new:v.new, username:v.username, email:v.email}); admSetTok(r.token); ADM.me=r.admin; ADM.err=''; toast('Sandi tersimpan'); renderAdmin(); return; }
    if(k==='add'){ await admApi('admin_add',{username:String(v.username).trim().toLowerCase(), email:v.email, password:v.password, must_change:!!v.must}); closeModal(); toast('Admin ditambahkan'); admRenderTab(); return; }
    if(k==='search'){ ADM.q=v.q||''; ADM.users=null; admRenderTab(); return; }
  }catch(err){ if(k==='login'||(k==='pw'&&ADM.me&&ADM.me.must_change)){ ADM.err=err.message; renderAdmin(); } else toast(err.message); }
  finally{ if(btn) btn.disabled=false; }
});
document.addEventListener('click', async e=>{
  const t = e.target; if(!t.closest || !t.closest('#admin')) return;
  const tab = t.closest('[data-adm-tab]'); if(tab && ADM.tab==='paket' && ADM.pkDirty && tab.dataset.admTab!=='paket' && !confirm('Perubahan paket belum disimpan. Tetap pindah halaman?')) return;
  if(tab && ADM.tab==='paket' && tab.dataset.admTab!=='paket'){ ADM.pk=null; ADM.pkDirty=false; }
  if(tab){ ADM.tab=tab.dataset.admTab; ADM.edit=null; $$('.adm-side [data-adm-tab]').forEach(b=>b.setAttribute('aria-current', b.dataset.admTab===ADM.tab)); window.scrollTo(0,0); { const cur=$('.adm-side nav [aria-current=true]'); const nv=cur&&cur.parentElement; if(nv && nv.scrollWidth>nv.clientWidth) nv.scrollTo({left:Math.max(0,cur.offsetLeft-nv.clientWidth/2+cur.offsetWidth/2),behavior:'smooth'}); } admRenderTab(); return; }
  const a = t.closest('[data-adm]')?.dataset.adm;
  try{
    if(a==='logout'){ admLogout(); return; }
    if(a==='reload'||a==='refresh'){ ADM.stats=null; ADM.users=null; ADM.cfg=null; FIN.rows=null; admRenderTab(); return; }
    if(a==='tback'){ ADM.edit=null; admRenderTab(); return; }
    if(a==='treset'){ if(!confirm('Kembalikan tema ini ke pengaturan bawaan?')) return; const keep=(ADM.cfg.themes[ADM.edit]||{}); ADM.cfg.themes[ADM.edit] = {}; if(keep.order!=null) ADM.cfg.themes[ADM.edit].order=keep.order; if(keep.hidden) ADM.cfg.themes[ADM.edit].hidden=true; ADM.draft=JSON.parse(JSON.stringify(ADM.cfg.themes[ADM.edit])); await admSaveThemes('Tema dikembalikan ke bawaan'); admRenderTab(); return; }
    if(a==='tsave'){ ADM.cfg.themes[ADM.edit] = admDraftClean(ADM.draft); await admSaveThemes(); return; }
    if(a==='pksave'){ await admPkgSave(); $('#admMain').innerHTML=admPkgHTML(); return; }
    if(a==='pkadd'){ admPkgInit(); const top=ADM.pk.slice().sort((x,y)=>y.price-x.price)[0]; const id='p-'+Date.now().toString(36).slice(-6); ADM.pk.push({id, name:'Paket baru', price:(top?top.price:0)+100000, note:'sekali bayar', tag:'', fit:'', cta:'Pilih paket ini', feats:{...(top?top.feats:{})}}); ADM.pkSel=id; admPkgChanged(); setTimeout(()=>{ const n=$('[data-pk=name]'); n&&(n.focus(),n.select()); },50); return; }
    if(a==='pkdel'){ const p=admPkg(); const n=((ADM.stats&&ADM.stats.byPlan)||{})[p.id]||0; if(n){ toast(`${n} pengguna memakai paket ini. Sembunyikan saja supaya tidak bisa dibeli lagi.`); return; } if(!confirm(`Hapus paket "${p.name}"?`)) return; ADM.pk=ADM.pk.filter(x=>x.id!==p.id); ADM.pkSel=(ADM.pk.find(x=>x.id==='tamu')||ADM.pk[0]).id; admPkgChanged(); return; }
    if(a==='pkall'){ const p=admPkg(); const all=FEAT_ROWS().every(r=>planFeat(p,r.key)); p.feats=Object.fromEntries(FEAT_ROWS().map(r=>[r.key, all?0:1])); admPkgChanged(); return; }
    if(a==='finsave'){ const c=finReadForm(); finSetCfg(c); await admApi('config_set',{key:'prices', value:ADM.cfg.prices}); toast('Pengaturan keuangan tersimpan'); admRenderTab(); return; }
    if(a==='fincost'){ const c=finReadForm(); c.costs.push({name:'',amount:0}); finSetCfg(c); admRenderTab(); setTimeout(()=>{ const x=$$('[data-fin-cost][data-f=name]').pop(); x&&x.focus(); },60); return; }
    if(a==='fincsv'){ const [fa,fb]=finRange(); const rows=finCalc((FIN.rows||[]).filter(r=>{ const t=new Date(r.paid_at||r.created_at); return (!fa||t>=fa)&&t<=fb; })); const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
      const csv=['Tanggal,Pengguna,Email,Undangan,Item,Voucher,Metode,Harga,Diskon,Kotor,Biaya PG,Pajak,Bersih'].concat(rows.map(r=>[ (r.paid_at||r.created_at).slice(0,10), r.name, r.email, r.slug, r.item, r.voucher, r.method, r.list, r.disc, r.gross, r.fee, r.tax, r.net ].map(q).join(','))).join('\n');
      const blob=new Blob(['\ufeff'+csv],{type:'text/csv'}); const u=URL.createObjectURL(blob); const l=document.createElement('a'); l.href=u; l.download=`keuangan-sakara-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000); return; }
    if(a==='psave'){ const v={}; $$('[data-adm-price]').forEach(i=>{ const n=parseInt(i.value.replace(/\D/g,''),10); if(n>=1000) v[i.dataset.admPrice]=n; }); ADM.cfg.prices=v; await admApi('config_set',{key:'prices', value:v}); applyConfig(ADM.cfg); try{ localStorage.setItem('sp-appcfg', JSON.stringify(ADM.cfg)); }catch(err){} toast('Harga tersimpan'); return; }
  }catch(err){ toast(err.message); return; }
  if(t.closest('[data-adm-addopen]')){ admAddModal(); return; }
  const ps = t.closest('[data-pk-sel]'); if(ps){ ADM.pkSel=ps.dataset.pkSel; $('#admMain').innerHTML=admPkgHTML(); return; }
  const pm = t.closest('[data-pk-mx]'); if(pm){ const x=ADM.pk.find(q=>q.id===pm.dataset.pkMx); x.feats={...x.feats, [pm.dataset.k]: planFeat(x,pm.dataset.k)?0:1}; admPkgChanged(); return; }
  const pc = t.closest('[data-pk-card]'); if(pc){ const k=pc.dataset.pkCard; ADM.cards = ADM.cards.includes(k) ? ADM.cards.filter(x=>x!==k) : FEAT_ROWS().map(r=>r.key).filter(x=>x===k||ADM.cards.includes(x)); admPkgChanged(); return; }
  const fr = t.closest('[data-fin-range]'); if(fr){ FIN.range=fr.dataset.finRange; if(FIN.range==='custom' && !FIN.from){ const d=new Date(); FIN.to=d.toISOString().slice(0,10); FIN.from=new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10); } { const sl=$('.fin-range')?.scrollLeft||0; $('#admMain').innerHTML=admFinHTML(); const r=$('.fin-range'); if(r){ r.scrollLeft=sl; const b=$('[aria-pressed=true]',r); if(b){ const L=b.offsetLeft-r.offsetLeft, R=L+b.offsetWidth; if(L<r.scrollLeft||R>r.scrollLeft+r.clientWidth-28) r.scrollTo({left:Math.max(0,R-r.clientWidth+30),behavior:'smooth'}); } } } return; }
  const cd = t.closest('[data-fin-costdel]'); if(cd){ const c=finReadForm(); c.costs.splice(+cd.dataset.finCostdel,1); finSetCfg(c); $('#admMain').innerHTML=admFinHTML(); return; }
  const ed = t.closest('[data-adm-tedit]'); if(ed){ ADM.edit=ed.dataset.admTedit; ADM.draft=JSON.parse(JSON.stringify(ADM.cfg.themes[ADM.edit]||{})); admRenderTab(); $('#admMain')?.scrollTo?.(0,0); window.scrollTo(0,0); return; }
  const mv = t.closest('[data-adm-mv]'); if(mv){ const ov=ADM.cfg.themes; const order = THEMES.map((x,i)=>[x,i]).sort((p,q)=>{ const oa=(ov[p[0].id]||{}).order, ob=(ov[q[0].id]||{}).order; return (Number.isFinite(oa)?oa:1e4+p[1])-(Number.isFinite(ob)?ob:1e4+q[1]); }).map(x=>x[0].id);
    const i=order.indexOf(mv.dataset.admMv), j=i+(+mv.dataset.d); if(j<0||j>=order.length) return; [order[i],order[j]]=[order[j],order[i]]; order.forEach((id,n)=>{ ov[id]=Object.assign(ov[id]||{}, {order:n}); });
    try{ await admSaveThemes('Urutan katalog tersimpan'); }catch(err){ toast(err.message); } admRenderTab(); return; }
  const del = t.closest('[data-adm-del]'); if(del){ if(!confirm(`Hapus admin "${del.dataset.n}"?`)) return; try{ await admApi('admin_remove',{id:+del.dataset.admDel}); toast('Admin dihapus'); admRenderTab(); }catch(err){ toast(err.message); } return; }
  const ban = t.closest('[data-adm-ban]'); if(ban){ const on=ban.dataset.ban==='1'; if(!confirm(on?'Blokir pengguna ini? Ia tidak bisa masuk lagi sampai dibuka blokirnya.':'Buka blokir pengguna ini?')) return; try{ await admApi('user_ban',{user_id:ban.dataset.admBan, ban:on}); toast(on?'Pengguna diblokir':'Blokir dibuka'); ADM.users=null; admRenderTab(); }catch(err){ toast(err.message); } return; }
});
document.addEventListener('change', async e=>{
  const t = e.target; if(!t.closest || !t.closest('#admin')) return;
  try{
    if(t.dataset.admPub){ await admApi('inv_update',{invitation_id:t.dataset.admPub, published:t.checked}); toast(t.checked?'Undangan ditayangkan':'Undangan diturunkan'); const u=(ADM.users||[]).find(x=>x.invitation_id===t.dataset.admPub); if(u) u.published=t.checked; return; }
    if(t.dataset.admPlan){ if(!confirm('Ubah paket undangan ini secara manual?')){ admRenderTab(); return; } await admApi('inv_update',{invitation_id:t.dataset.admPlan, plan:t.value}); toast('Paket diubah'); const u=(ADM.users||[]).find(x=>x.invitation_id===t.dataset.admPlan); if(u) u.plan=t.value; return; }
    if(t.dataset.admThide){ const ov=ADM.cfg.themes; ov[t.dataset.admThide]=Object.assign(ov[t.dataset.admThide]||{}, {hidden:!t.checked}); if(t.checked) delete ov[t.dataset.admThide].hidden; await admSaveThemes(t.checked?'Tema ditampilkan di katalog':'Tema disembunyikan dari katalog'); admRenderTab(); return; }
    if(t.dataset.finFrom!==undefined || t.dataset.finTo!==undefined){ if(t.dataset.finFrom!==undefined) FIN.from=t.value; else FIN.to=t.value; $('#admMain').innerHTML=admFinHTML(); return; }
    if(t.dataset.admFf){ ADM.cfg.features[t.dataset.admFf] = t.checked; if(t.checked) delete ADM.cfg.features[t.dataset.admFf]; await admApi('config_set',{key:'features', value:ADM.cfg.features}); applyConfig(ADM.cfg); try{ localStorage.setItem('sp-appcfg', JSON.stringify(ADM.cfg)); }catch(err){} toast('Fitur diperbarui'); return; }
  }catch(err){ toast(err.message); admRenderTab(); return; }
  admDraftInput(t);
});
async function admImgUpload(file){
  const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(file); });
  const sc = Math.min(1, 1600/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc); c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  let data = c.toDataURL('image/webp',.82); if(!data.startsWith('data:image/webp')) data = c.toDataURL('image/jpeg',.85);
  return (await admApi('upload',{data})).url;
}
document.addEventListener('change', async e=>{ const t=e.target; if(!t.dataset || t.dataset.tdImg===undefined || !ADM.draft) return; const f=t.files&&t.files[0]; if(!f) return;
  if(!/^image\//.test(f.type)){ toast('Pilih file gambar, ya'); return; }
  const lab=t.closest('label'); if(lab){ lab.classList.add('is-busy'); lab.firstChild.textContent='Mengunggah…'; }
  try{ const url=await admImgUpload(f); ADM.draft.imgs={...(ADM.draft.imgs||{}), [t.dataset.tdImg]:url}; $('#admMain').innerHTML=admThemeEditHTML(); admPreview(); toast('Gambar terpasang di pratinjau. Klik Simpan tema untuk menerapkan.'); }
  catch(err){ toast(err.message||'Gagal mengunggah gambar'); if(lab){ lab.classList.remove('is-busy'); lab.firstChild.textContent='Ganti gambar'; } } });
document.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('[data-td-imgdel]'); if(!b||!ADM.draft) return; const im={...(ADM.draft.imgs||{})}; delete im[b.dataset.tdImgdel]; ADM.draft.imgs=im; $('#admMain').innerHTML=admThemeEditHTML(); admPreview(); });
let admPrevT;
function admDraftInput(t){
  const d = ADM.draft; if(!d || !t.closest('.adm-tform')) return;
  if(t.dataset.td){ const k=t.dataset.td; if(k==='shown'){ if(t.checked) delete d.hidden; else d.hidden=true; } else if(k==='tags'){ d.tags=t.value.split(',').map(x=>x.trim()).filter(Boolean); } else d[k]=t.value; }
  if(t.dataset.tdSec){ const k=t.dataset.tdSec; d.hide=(d.hide||[]).filter(x=>x!==k); if(!t.checked) d.hide.push(k); t.closest('.adm-sec').classList.toggle('off', !t.checked); }
  if(t.dataset.tdDeco){ const k=t.dataset.tdDeco; d.nodeco=(d.nodeco||[]).filter(x=>x!==k); if(!t.checked) d.nodeco.push(k); }
  if(t.dataset.tdTitle){ d.titles=d.titles||{}; d.titles[t.dataset.tdTitle]=t.value; }
  if(t.dataset.tdKick){ d.kick=d.kick||{}; d.kick[t.dataset.tdKick]=t.value; }
  clearTimeout(admPrevT); admPrevT=setTimeout(admPreview, 160);
}
document.addEventListener('input', e=>{ const t=e.target; if(!t.dataset || !t.closest || !t.closest('#admin')) return;
  if(t.dataset.pk && t.type!=='checkbox'){ const p=admPkg(); if(t.dataset.pk==='price'){ const n=t.value.replace(/\D/g,''); t.value = n?(+n).toLocaleString('id-ID'):''; p.price=+n||0; } else p[t.dataset.pk]=t.value; admPkgChanged(false); }
});
document.addEventListener('change', e=>{ const t=e.target; if(!t.dataset || !t.closest || !t.closest('#admin')) return;
  if(t.dataset.pk==='feature'){ ADM.pk.forEach(x=>x.feature = t.checked ? x.id===ADM.pkSel : (x.id===ADM.pkSel?false:x.feature)); admPkgChanged(); }
  if(t.dataset.pk==='shown'){ const p=admPkg(); if(t.checked) delete p.hidden; else p.hidden=true; admPkgChanged(); }
  if(t.dataset.pkF){ const p=admPkg(); p.feats={...p.feats, [t.dataset.pkF]: t.checked?1:0}; admPkgChanged(); }
});
document.addEventListener('input', e=>{ const t=e.target; if(t.closest && t.closest('#admin .adm-tform') && (t.dataset.td||t.dataset.tdTitle||t.dataset.tdKick)) admDraftInput(t);
  if(t.dataset && t.dataset.admPrice!==undefined){ const n=t.value.replace(/\D/g,''); t.value = n ? (+n).toLocaleString('id-ID') : ''; } });
document.addEventListener('click', e=>{ const r=e.target.closest && e.target.closest('[data-td-reset]'); if(!r||!ADM.draft) return; delete ADM.draft[r.dataset.tdReset]; const b=THEME_BASE.get(ADM.edit)||{}; const inp=r.parentElement.querySelector('input[type=color]'); if(inp) inp.value=b[r.dataset.tdReset]||'#000000'; admPreview(); });

/* ---------- Admin: Paket ---------- */
const BUILTIN_PKG = ['coba','undangan','tamu','custom'];
function admPkgInit(){ if(ADM.pk) return; ADM.pk = JSON.parse(JSON.stringify(PLANS)); ADM.cards = CARD_KEYS.slice(); ADM.pkSel = ADM.pkSel || (ADM.pk.find(p=>p.id==='tamu')||ADM.pk[0]).id; ADM.pkDirty=false; }
const admPkg = () => ADM.pk.find(p=>p.id===ADM.pkSel) || ADM.pk[0];
function admPkgHTML(){
  admPkgInit(); const p = admPkg(); const isFree = p.id==='coba'; const counts = (ADM.stats&&ADM.stats.byPlan)||{};
  const sorted = ADM.pk.slice().sort((a,b)=>(a.id==='coba'?-1:a.price)-(b.id==='coba'?-1:b.price));
  const fld = (k,l,ph,hint) => `<label class="lbl">${l}</label><input class="input" data-pk="${k}" value="${esc(p[k]||'')}" placeholder="${esc(ph||'')}">${hint?`<small class="adm-hint">${hint}</small>`:''}`;
  const savedCard = (()=>{ const keep=CARD_KEYS; CARD_KEYS=ADM.cards; try{ return planCardHTML(p, null, true); } finally { CARD_KEYS=keep; } })();
  const nCard = ADM.cards.length;
  return `<header class="adm-head"><div><span class="eyebrow">Paket</span><h1 class="display">Paket & isinya</h1>
      <p class="muted" style="margin:6px 0 0">Tiap paket punya harga dan daftar fitur sendiri. Perubahan berlaku di halaman harga, halaman bandingkan, checkout, dan fitur yang terkunci di dashboard pasangan.</p></div>
    <div class="adm-acts">${ADM.pkDirty?'<span class="adm-dirty">Belum disimpan</span>':''}<button type="button" class="btn btn-primary" data-adm="pksave" ${ADM.pkDirty?'':'disabled'}>Simpan perubahan</button></div></header>
  <div class="pk-chips" role="tablist" aria-label="Pilih paket">${sorted.map(x=>`<button type="button" role="tab" data-pk-sel="${x.id}" aria-selected="${x.id===p.id}" class="${x.hidden?'off':''}"><b>${esc(x.name||'Tanpa nama')}</b><small>${x.id==='coba'?'Gratis':rupiah(+x.price||0)}${x.hidden?' · disembunyikan':''}${counts[x.id]?` · ${counts[x.id]} pengguna`:''}</small></button>`).join('')}
    <button type="button" class="pk-add" data-adm="pkadd">${ico('plus')}Tambah paket</button></div>
  <div class="pk-grid">
    <section class="adm-card"><h2>Info paket</h2>
      ${fld('name','Nama paket','mis. Undangan Lengkap')}
      <label class="lbl">Harga</label>${isFree?`<div class="adm-note">Paket percobaan, selalu gratis. Pasangan bisa mencoba semua tema sebelum membayar.</div>`:`<div class="adm-rp"><i>Rp</i><input class="input num" inputmode="numeric" data-pk="price" value="${(+p.price||0).toLocaleString('id-ID')}"></div><small class="adm-hint">Pasangan yang naik paket cukup bayar selisih harga dari paket lamanya.</small>`}
      ${fld('tag','Label di atas kartu','mis. Paling lengkap')}
      ${fld('fit','Cocok untuk siapa','mis. Buat acara besar, dari kirim undangan sampai meja penerima tamu.')}
      <div class="pk-2">${'<div>'+fld('cta','Teks tombol','Pilih paket ini')+'</div><div>'+fld('note','Keterangan harga', isFree?'gratis':'sekali bayar')+'</div>'}</div>
      <label class="adm-row"><span>Sorot sebagai rekomendasi<small>Kartu berwarna gelap dan dipilih otomatis saat checkout</small></span><span class="switch"><input type="checkbox" data-pk="feature" ${p.feature?'checked':''}><span></span></span></label>
      <label class="adm-row"><span>Tampilkan di halaman harga<small>Disembunyikan = tidak bisa dibeli lagi. Pengguna yang sudah memakainya tetap dapat fiturnya.</small></span><span class="switch"><input type="checkbox" data-pk="shown" ${p.hidden?'':'checked'}><span></span></span></label>
      ${BUILTIN_PKG.includes(p.id)?'':`<button type="button" class="btn btn-ghost btn-sm pk-del" data-adm="pkdel">${ico('x')}Hapus paket ini</button>`}
    </section>
    <section class="adm-card pk-prev"><h2>Pratinjau kartu di halaman harga</h2><div class="pk-prev-in">${savedCard}</div></section>
  </div>
  <section class="adm-card"><div class="pk-fhead"><div><h2>Fitur di paket ${esc(p.name||'ini')}</h2><p class="muted" style="margin:-6px 0 0;font-size:14px">Centang = paket ini dapat fiturnya. Kalau tidak dicentang, fitur itu otomatis tertutup untuk pasangan di paket ini (disembunyikan dari editor, dashboard, dan undangan tamu, atau ditandai gembok dengan ajakan upgrade). Fitur bertanda <span class="pk-info">Info saja</span> adalah fitur dasar yang selalu ada di paket berbayar, jadi hanya muncul sebagai teks di halaman harga.</p></div>
    <button type="button" class="btn btn-ghost btn-sm" data-adm="pkall">${FEAT_ROWS().every(r=>planFeat(p,r.key))?'Kosongkan semua':'Centang semua'}</button></div>
    ${FEATS.map(([g,rows])=>`<h3 class="adm-sub">${esc(g)}</h3><div class="pk-feats">${rows.map(r=>{ const on=!!planFeat(p,r.key), card=ADM.cards.includes(r.key); return `<div class="pk-f${on?' on':''}"><label class="pk-chk"><input type="checkbox" data-pk-f="${r.key}" ${on?'checked':''}><span>${esc(r[0])}${featEnforced(r.key)?'':`<span class="pk-info" title="Fitur dasar paket berbayar, tidak bisa dimatikan per paket">Info saja</span>`}</span></label>
      <button type="button" class="pk-star${card?' on':''}" data-pk-card="${r.key}" aria-pressed="${card}" title="${card?'Tampil di kartu harga':'Tampilkan di kartu harga'}">${card?'★':'☆'}<span>Di kartu</span></button></div>`; }).join('')}</div>`).join('')}
    <p class="adm-hint" style="margin-top:12px">★ Di kartu: fitur yang tampil di kartu harga beranda (berlaku untuk semua paket supaya kartunya mudah dibandingkan). Sekarang ${nCard} fitur, idealnya 4–6. Daftar lengkap tetap ada di halaman bandingkan.</p>
  </section>
  <section class="adm-card" style="padding:0"><h2 style="padding:20px 22px 0">Ringkasan semua paket</h2><p class="muted" style="padding:0 22px;font-size:14px;margin:-6px 0 8px">Klik tanda centang untuk mengubah langsung.</p>
    <div class="pk-mx-wrap"><table class="pk-mx"><thead><tr><th>Fitur</th>${sorted.map(x=>`<th class="${x.id===p.id?'sel':''}"><button type="button" data-pk-sel="${x.id}">${esc(x.name)}</button><small>${x.id==='coba'?'Gratis':rupiah(+x.price||0)}</small></th>`).join('')}</tr></thead>
    <tbody>${FEATS.map(([g,rows])=>`<tr class="g"><td colspan="${sorted.length+1}">${esc(g)}</td></tr>`+rows.map(r=>`<tr><td>${esc(r[0])}${featEnforced(r.key)?'':` <span class="pk-info">Info</span>`}</td>${sorted.map(x=>`<td class="${x.id===p.id?'sel':''}"><button type="button" class="pk-cell${planFeat(x,r.key)?' on':''}" data-pk-mx="${x.id}" data-k="${r.key}" aria-label="${esc(r[0])} di ${esc(x.name)}: ${planFeat(x,r.key)?'ada':'tidak ada'}">${ico(planFeat(x,r.key)?'check':'x')}</button></td>`).join('')}</tr>`).join('')).join('')}</tbody></table></div></section>`;
}
function admPkgChanged(rerender=true){ ADM.pkDirty=true; if(rerender){ const y=window.scrollY, m=$('#admMain'), my=m?m.scrollTop:0; m.innerHTML=admPkgHTML(); window.scrollTo(0,y); } else { const b=$('[data-adm=pksave]'); if(b){ b.disabled=false; if(!$('.adm-dirty')) b.insertAdjacentHTML('beforebegin','<span class="adm-dirty">Belum disimpan</span>'); } const pv=$('.pk-prev-in'); if(pv){ const keep=CARD_KEYS; CARD_KEYS=ADM.cards; try{ pv.innerHTML=planCardHTML(admPkg(), null, true); } finally{ CARD_KEYS=keep; } } $$('.pk-chips [aria-selected=true] b').forEach(b=>b.textContent=admPkg().name||'Tanpa nama'); } }
async function admPkgSave(){
  const list = ADM.pk.map(p=>{ const o={id:p.id, name:String(p.name||'').trim()||p.id, price:p.id==='coba'?0:Math.round(+p.price||0), note:p.note||'', tag:p.tag||'', fit:p.fit||'', cta:p.cta||('Pilih '+(p.name||'')), feature:!!p.feature, feats:{}}; if(p.hidden) o.hidden=true; if(p.sum) o.sum=p.sum; FEAT_ROWS().forEach(r=>{ o.feats[r.key]= planFeat(p,r.key) ? 1 : 0; }); return o; });
  const bad = list.find(p=>p.id!=='coba' && p.price<1000); if(bad) throw new Error(`Harga paket "${bad.name}" minimal Rp1.000`);
  const dup = list.filter(p=>p.id!=='coba').map(p=>p.price); if(new Set(dup).size!==dup.length) throw new Error('Dua paket tidak boleh punya harga yang sama, supaya urutan naik paket jelas');
  if(list.filter(p=>p.feature).length>1) list.forEach((p,i)=>{ if(p.feature && p.id!==ADM.pkSel && list.filter(q=>q.feature).length>1) p.feature=false; });
  const value = {...(ADM.cfg.prices||{}), packages:list, cards:ADM.cards.slice()}; delete value.undangan; delete value.tamu; delete value.upgrade;
  await admApi('config_set',{key:'prices', value}); ADM.cfg.prices=value; applyConfig(ADM.cfg); try{ localStorage.setItem('sp-appcfg', JSON.stringify(ADM.cfg)); }catch(e){}
  ADM.pk=null; admPkgInit(); toast('Paket tersimpan. Langsung berlaku di situs.');
}

/* ---------- Admin: Keuangan ---------- */
const FIN_METHODS = [['qris','QRIS'],['gopay','GoPay'],['shopeepay','ShopeePay'],['bank_transfer','Virtual Account'],['echannel','Mandiri Bill'],['permata','Permata VA'],['credit_card','Kartu kredit'],['lainnya','Lainnya']];
const FIN_DEFAULT = { fees:{ qris:{pct:0.7,flat:0}, gopay:{pct:2,flat:0}, shopeepay:{pct:2,flat:0}, bank_transfer:{pct:0,flat:4000}, echannel:{pct:0,flat:4000}, permata:{pct:0,flat:4000}, credit_card:{pct:2.9,flat:2000}, lainnya:{pct:2,flat:0} }, tax:0.5, costs:[] };
const finCfg = () => { const f = (ADM.cfg && ADM.cfg.prices && ADM.cfg.prices.fin) || {}; return { fees:{...FIN_DEFAULT.fees, ...(f.fees||{})}, tax: Number.isFinite(f.tax)?f.tax:FIN_DEFAULT.tax, costs: Array.isArray(f.costs)?f.costs:[] }; };
const FIN = { range:'bulan', from:'', to:'', rows:null };
function finRange(){ const now=new Date(), d0=x=>{ const y=new Date(x); y.setHours(0,0,0,0); return y; };
  if(FIN.range==='bulan') return [new Date(now.getFullYear(),now.getMonth(),1), now];
  if(FIN.range==='30') return [d0(Date.now()-29*864e5), now];
  if(FIN.range==='90') return [d0(Date.now()-89*864e5), now];
  if(FIN.range==='tahun') return [new Date(now.getFullYear(),0,1), now];
  if(FIN.range==='custom' && FIN.from && FIN.to) return [new Date(FIN.from+'T00:00:00'), new Date(FIN.to+'T23:59:59')];
  return [null, now]; }
function finCalc(rows){
  const c = finCfg();
  return rows.map(r=>{ const key = c.fees[r.method] ? r.method : 'lainnya'; const f = c.fees[key]; const gross = r.total, list = r.price || r.total;
    const fee = Math.round(gross * (+f.pct||0) / 100 + (+f.flat||0)); const tax = Math.round(gross * c.tax / 100);
    return { ...r, list, disc: r.discount||0, gross, fee, tax, net: gross - fee - tax, mkey:key }; });
}
function admFinHTML(){
  const c = finCfg(); const [a,b] = finRange();
  const rows = finCalc((FIN.rows||[]).filter(r=>{ const t=new Date(r.paid_at||r.created_at); return (!a || t>=a) && t<=b; }));
  const sum = k => rows.reduce((s,r)=>s+r[k],0);
  const months = a ? Math.max(1, (b-a)/(30.44*864e5)) : Math.max(1, rows.length ? (b-new Date(rows[rows.length-1].paid_at||rows[rows.length-1].created_at))/(30.44*864e5) : 1);
  const perMonth = x => (x.period==='tahun' ? (+x.amount||0)/12 : (+x.amount||0)); const opsMonthly = Math.round(c.costs.reduce((s,x)=>s+perMonth(x),0)); const ops = Math.round(opsMonthly * months);
  const L = sum('list'), D = sum('disc'), G = sum('gross'), F = sum('fee'), T = sum('tax'), N = sum('net'), P = N - ops;
  const pct = (x) => G ? ` <small>${(x/G*100).toLocaleString('id-ID',{maximumFractionDigits:1})}%</small>` : '';
  const line = (l, v, cls='', note='') => `<div class="fin-l ${cls}"><span>${l}${note?`<small>${note}</small>`:''}</span><b class="num">${v<0?'−':''}${rupiah(Math.abs(v))}</b></div>`;
  const byM = {}; rows.forEach(r=>{ byM[r.mkey]=byM[r.mkey]||{n:0,g:0,f:0}; byM[r.mkey].n++; byM[r.mkey].g+=r.gross; byM[r.mkey].f+=r.fee; });
  const rangeBtn = (k,l) => `<button type="button" data-fin-range="${k}" aria-pressed="${FIN.range===k}">${l}</button>`;
  return `<header class="adm-head"><div><span class="eyebrow">Keuangan</span><h1 class="display">Dari kotor sampai bersih</h1><p class="muted" style="margin:6px 0 0">Dihitung dari transaksi yang sudah lunas. Biaya payment gateway, pajak, dan biaya operasional bisa kamu atur di bawah.</p></div>
    <button type="button" class="btn btn-ghost btn-sm" data-adm="fincsv">${ico('copy')}Unduh CSV</button></header>
  <div class="fin-range">${rangeBtn('bulan','Bulan ini')}${rangeBtn('30','30 hari')}${rangeBtn('90','3 bulan')}${rangeBtn('tahun','Tahun ini')}${rangeBtn('semua','Semua')}${rangeBtn('custom','Pilih tanggal')}</div>
    ${FIN.range==='custom'?`<div class="fin-dates"><label><span>Dari</span><input type="date" class="input" data-fin-from value="${FIN.from}"></label><label><span>Sampai</span><input type="date" class="input" data-fin-to value="${FIN.to}"></label></div>`:''}
  <div class="adm-tiles">
    <div class="adm-tile ic hl"><i class="adm-ic tn-amber">${ico('wallet')}</i><b class="num">${rupiah(G)}</b><span>Pendapatan kotor</span><small>${rows.length} transaksi lunas</small></div>
    <div class="adm-tile ic"><i class="adm-ic tn-gray">${ico('receipt')}</i><b class="num">${rupiah(F+T)}</b><span>Potongan & pajak</span><small>Payment gateway ${rupiah(F)} · pajak ${rupiah(T)}</small></div>
    <div class="adm-tile ic"><i class="adm-ic tn-green">${ico('check')}</i><b class="num">${rupiah(N)}</b><span>Bersih dari transaksi</span><small>rata-rata ${rupiah(rows.length?Math.round(N/rows.length):0)} per pengguna</small></div>
    <div class="adm-tile ic fin-profit ${P<0?'neg':''}"><i class="adm-ic tn-blue">${ico('chart')}</i><b class="num">${P<0?'−':''}${rupiah(Math.abs(P))}</b><span>Laba bersih</span><small>setelah biaya operasional ${rupiah(ops)}${G?` · margin ${(P/G*100).toLocaleString('id-ID',{maximumFractionDigits:1})}%`:''}</small></div>
  </div>
  <div class="adm-grid2">
    <section class="adm-card"><h2>Rincian perhitungan</h2>
      ${line('Harga normal paket', L, '', 'sebelum voucher')}
      ${line('Diskon voucher', -D, 'minus')}
      ${line('Pendapatan kotor', G, 'sub')}
      ${line('Biaya payment gateway', -F, 'minus', 'sesuai metode bayar tiap transaksi')}
      ${line(`Pajak (${c.tax.toLocaleString('id-ID')}% dari kotor)`, -T, 'minus')}
      ${line('Bersih dari transaksi', N, 'sub')}
      ${line('Biaya operasional (hosting, domain, dll.)', -ops, 'minus', opsMonthly?`setara ${rupiah(opsMonthly)}/bulan × ${months.toLocaleString('id-ID',{maximumFractionDigits:1})} bulan`:'belum diisi, tambahkan di bagian bawah halaman ini')}
      ${line('Laba bersih', P, 'total')}
    </section>
    <section class="adm-card"><h2>Per metode pembayaran</h2>${Object.keys(byM).length?`<table class="adm-tbl adm-nums" style="--n:3"><thead><tr><th>Metode</th><th class="num">Transaksi</th><th class="num">Kotor</th><th class="num">Biaya</th></tr></thead><tbody>${Object.entries(byM).map(([k,v])=>`<tr><td>${esc((FIN_METHODS.find(m=>m[0]===k)||[k,k])[1])}</td><td class="num">${v.n}</td><td class="num">${rupiah(v.g)}</td><td class="num">${rupiah(v.f)}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">Belum ada transaksi di periode ini.</p>'}</section>
  </div>
  <section class="adm-card" style="padding:0"><h2 style="padding:20px 22px 0">Per pengguna yang sudah bayar</h2><div class="tbl-wrap" style="display:block"><table class="adm-tbl adm-fin"><thead><tr><th>Pengguna</th><th>Tanggal</th><th>Item</th><th>Metode</th><th class="num">Harga</th><th class="num">Diskon</th><th class="num">Kotor</th><th class="num">Biaya PG</th><th class="num">Pajak</th><th class="num">Bersih</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td><b>${esc(r.couple||r.name||r.email.split('@')[0]||'—')}</b><small>${esc(r.email)}</small></td><td data-l="Tanggal">${admDate(r.paid_at||r.created_at)}</td><td data-l="Item">${esc(r.item)}${r.voucher?`<small>${esc(r.voucher)}</small>`:''}</td><td data-l="Metode">${esc((FIN_METHODS.find(m=>m[0]===r.mkey)||['',r.method||'—'])[1])}</td><td class="num" data-l="Harga">${rupiah(r.list)}</td><td class="num" data-l="Diskon">${r.disc?'−'+rupiah(r.disc):'—'}</td><td class="num" data-l="Kotor">${rupiah(r.gross)}</td><td class="num" data-l="Biaya PG">−${rupiah(r.fee)}</td><td class="num" data-l="Pajak">−${rupiah(r.tax)}</td><td class="num" data-l="Bersih"><b>${rupiah(r.net)}</b></td></tr>`).join('') || '<tr><td colspan="10" class="muted" style="padding:22px">Belum ada transaksi lunas di periode ini.</td></tr>'}
    ${rows.length?`<tr class="fin-tot"><td colspan="4"><b>Total</b></td><td class="num">${rupiah(L)}</td><td class="num">−${rupiah(D)}</td><td class="num">${rupiah(G)}</td><td class="num">−${rupiah(F)}</td><td class="num">−${rupiah(T)}</td><td class="num"><b>${rupiah(N)}</b></td></tr>`:''}
  </tbody></table></div></section>
  <div class="adm-grid2">
    <section class="adm-card"><h2>Biaya payment gateway</h2><p class="muted" style="margin:-4px 0 12px;font-size:14px">Isi sesuai kontrak Midtrans-mu. Nilai awal hanya perkiraan umum, cek lagi di dashboard Midtrans.</p>
      <div class="fin-fees">${FIN_METHODS.map(([k,l])=>`<div><span>${l}</span><label><input class="input num" data-fin-fee="${k}" data-f="pct" inputmode="decimal" value="${String(c.fees[k].pct).replace('.',',')}"><i>%</i></label><label><i>+Rp</i><input class="input num" data-fin-fee="${k}" data-f="flat" inputmode="numeric" value="${(+c.fees[k].flat||0).toLocaleString('id-ID')}"></label></div>`).join('')}</div></section>
    <section class="adm-card"><h2>Pajak & biaya operasional</h2>
      <label class="lbl">Pajak dari pendapatan kotor (%)</label><input class="input num" data-fin-tax inputmode="decimal" value="${String(c.tax).replace('.',',')}" style="max-width:160px">
      <p class="muted" style="font-size:13px;margin:6px 0 0">Mis. PPh final UMKM 0,5%. Isi 0 kalau belum dipakai. Konsultasikan ke konsultan pajak untuk angka yang tepat.</p>
      <label class="lbl" style="margin-top:18px">Biaya operasional</label><p class="muted" style="font-size:13px;margin:0 0 8px">Bisa per bulan atau per tahun. Biaya tahunan otomatis dibagi 12 lalu dikalikan jumlah bulan di periode yang dipilih.</p>
      <div class="fin-costs">${c.costs.map((x,i)=>`<div><input class="input" data-fin-cost="${i}" data-f="name" value="${esc(x.name||'')}" placeholder="Nama biaya"><label><i>Rp</i><input class="input num" data-fin-cost="${i}" data-f="amount" inputmode="numeric" value="${(+x.amount||0).toLocaleString('id-ID')}"></label><select class="input fin-per" data-fin-cost="${i}" data-f="period" aria-label="Periode"><option value="bulan"${x.period!=='tahun'?' selected':''}>/ bulan</option><option value="tahun"${x.period==='tahun'?' selected':''}>/ tahun</option></select><button type="button" class="btn btn-ghost btn-sm" data-fin-costdel="${i}" aria-label="Hapus">${ico('x')}</button></div>`).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm" data-adm="fincost" style="margin-top:8px">${ico('plus')}Tambah biaya</button>
      <p class="muted" style="font-size:13px;margin:8px 0 0">Contoh: hosting Vercel (/bulan), Supabase (/bulan), domain (/tahun), kredit AI Figma, iklan.</p></section>
  </div>
  <button type="button" class="btn btn-primary" data-adm="finsave">Simpan pengaturan keuangan</button>`;
}
function finReadForm(){
  const c = finCfg(); const num = v => parseFloat(String(v).replace(/\./g,'').replace(',','.'))||0;
  $$('[data-fin-fee]').forEach(i=>{ const k=i.dataset.finFee; c.fees[k]={...c.fees[k]}; if(i.dataset.f==='pct') c.fees[k].pct = parseFloat(i.value.replace(',','.'))||0; else c.fees[k].flat = num(i.value); });
  const tx = $('[data-fin-tax]'); if(tx) c.tax = parseFloat(tx.value.replace(',','.'))||0;
  c.costs = $$('[data-fin-cost][data-f=name]').map(i=>({ name:i.value.trim(), amount: num(($(`[data-fin-cost="${i.dataset.finCost}"][data-f=amount]`)||{}).value||0), period: (($(`[data-fin-cost="${i.dataset.finCost}"][data-f=period]`)||{}).value)==='tahun'?'tahun':'bulan' }));
  return c;
}
function finSetCfg(c){ ADM.cfg.prices = {...(ADM.cfg.prices||{}), fin:c}; }

/* ---------- Konfigurasi dari panel admin (tema, fitur, harga) ---------- */
const APPCFG = {themes:{}, features:{}, prices:{}};
const SEC_FEATS = ['cerita','galeri','hadiah','kado','ucapan','rsvp'];
const FEATURE_LIST = [
  ['cerita','Kisah cinta','Bagian undangan'],['galeri','Galeri foto','Bagian undangan'],['hadiah','Amplop digital / tanda kasih','Bagian undangan'],['kado','Kado patungan','Bagian undangan'],['ucapan','Ucapan & doa','Bagian undangan'],['rsvp','Konfirmasi kehadiran (RSVP)','Bagian undangan'],['musik','Musik latar','Bagian undangan'],
  ['d_keluarga','Tab Keluarga','Dashboard pasangan'],['d_katering','Tab Katering','Dashboard pasangan'],['d_harih','Tab Hari H (check-in)','Dashboard pasangan'],['d_kenangan','Tab Kenangan / album','Dashboard pasangan'],['d_hadiah','Tab Hadiah','Dashboard pasangan'],
  ['demo','Mode demo untuk pengunjung','Situs']
];
const FF_ROW = {cerita:'Musik latar, galeri foto & kisah cinta', galeri:'Musik latar, galeri foto & kisah cinta', musik:'Musik latar, galeri foto & kisah cinta', rsvp:'RSVP, ucapan & doa', ucapan:'RSVP, ucapan & doa', hadiah:'Amplop digital', kado:'Kado patungan (tema Lukisan)', d_hadiah:'Amplop digital', d_keluarga:'Akun keluarga (keluarga tambah tamu sendiri)', d_katering:'Hitungan porsi katering', d_kenangan:'Album foto dari tamu & buku kenangan', d_harih:'QR check-in & buku tamu digital'};
const featEnforced = k => !!FEAT_LOCKS[k] || Object.values(FF_ROW).some(l=>rowKeyOf(l)===k);
const rowKeyOf = label => { const r = FEAT_ROWS().find(x=>x[0]===label); return r ? r.key : null; };
// Fitur mengikuti isi paket (hanya untuk undangan yang sudah tayang; paket Coba tetap bisa mencoba semuanya)
const planAllows = k => { if(!FF_ROW[k] || !S.published || DEMO.on) return true; const p = planOf(S.plan); if(!p) return true; const rk = rowKeyOf(FF_ROW[k]); return !rk || !!planFeat(p, rk); };
const ff = k => APPCFG.features[k] !== false && planAllows(k);
const reapplyConfig = () => { try{ applyConfig({themes:APPCFG.themes, features:APPCFG.features, prices:APPCFG.prices}); }catch(e){} };
const themeOv = id => APPCFG.themes[id] || {};
const themeHidden = id => !!themeOv(id).hidden;
const THEME_BASE = new Map(), PRICE_BASE = {}, ED_ALL = ED_PANELS.slice(), DT_ALL = DT.slice();
let UPGRADE_BASE = UPGRADE_PRICE;
// Daftar paket dari konfigurasi admin. Format lama (harga undangan/tamu saja) tetap didukung.
function pkgList(pr){
  pr = pr || {};
  let list;
  if(Array.isArray(pr.packages) && pr.packages.length){
    list = pr.packages.filter(p=>p && /^[a-z0-9][a-z0-9-]{1,29}$/.test(p.id)).map(p=>{ const base = PKG_DEFAULT.find(b=>b.id===p.id);
      return {note:'sekali bayar', tag:'', fit:'', cta:'Pilih '+(p.name||p.id), ...(base||{}), ...p, price: p.id==='coba' ? 0 : Math.max(0, Math.round(+p.price||0)), feats:{...(base?base.feats:{}), ...(p.feats||{})}}; });
    if(!list.some(p=>p.id==='coba')) list.unshift(JSON.parse(JSON.stringify(PKG_DEFAULT[0])));
    if(!list.some(p=>p.id==='custom')) list.push(JSON.parse(JSON.stringify(PKG_DEFAULT.find(b=>b.id==='custom'))));
  } else {
    list = PKG_DEFAULT.map(b=>{ const p=JSON.parse(JSON.stringify(b)); const v=pr[p.id]; if(p.price && Number.isInteger(v) && v>=1000) p.price=v; return p; });
  }
  return list.sort((a,b)=>(a.id==='coba'?-1:a.price)-(b.id==='coba'?-1:b.price));
}
function applyConfig(cfg){
  cfg = cfg || {}; APPCFG.themes = cfg.themes || {}; APPCFG.features = cfg.features || {}; APPCFG.prices = cfg.prices || {};
  THEMES.forEach(t=>{ if(!THEME_BASE.has(t.id)) THEME_BASE.set(t.id, {name:t.name, tags:t.tags.slice(), bg:t.bg, fg:t.fg, accent:t.accent, soft:t.soft, font:t.font});
    const b=THEME_BASE.get(t.id), o=themeOv(t.id); Object.assign(t, b, {tags:b.tags.slice()});
    ['name','bg','fg','accent','soft','font'].forEach(k=>{ if(typeof o[k]==='string' && o[k].trim()) t[k]=o[k].trim(); });
    if(Array.isArray(o.tags) && o.tags.length) t.tags = o.tags.slice(); });
  THEMES.forEach(t=>t.tags.forEach(x=>{ if(!TAGS.includes(x)) TAGS.push(x); }));
  PLANS.splice(0, PLANS.length, ...pkgList(APPCFG.prices));
  CARD_KEYS = Array.isArray(APPCFG.prices.cards) && APPCFG.prices.cards.length ? APPCFG.prices.cards.slice() : CARD_DEFAULT.slice();
  { const u=planOf('undangan'), t=planOf('tamu'); UPGRADE_PRICE = u&&t ? t.price-u.price : UPGRADE_BASE; }
  ED_PANELS.splice(0, ED_PANELS.length, ...ED_ALL.filter(p=>ff(p[0])));
  DT.splice(0, DT.length, ...DT_ALL.filter(d=>ff('d_'+d[0])));
  if(!DT.some(d=>d[0]===dTab)) dTab = DT[0] ? DT[0][0] : 'ringkasan';
  document.documentElement.classList.toggle('ff-off-demo', !ff('demo'));
  document.documentElement.classList.toggle('ff-off-musik', !ff('musik'));
  if(typeof renderHomeThemes==='function') try{ renderHomeThemes(); }catch(e){}
}
const themeOrder = list => list.filter(t=>!themeHidden(t.id)).map((t,i)=>[t,i]).sort((a,b)=>{ const oa=themeOv(a[0].id).order, ob=themeOv(b[0].id).order; return (Number.isFinite(oa)?oa:1e4+a[1]) - (Number.isFinite(ob)?ob:1e4+b[1]); }).map(x=>x[0]);
try{ applyConfig(JSON.parse(localStorage.getItem('sp-appcfg')||'null')); }catch(e){}
async function loadAppConfig(){
  if(!CLOUD.sb) return; try{ const { data, error } = await CLOUD.sb.from('app_config').select('key,value'); if(error || !data) return; const o={}; data.forEach(r=>o[r.key]=r.value); applyConfig(o); try{ localStorage.setItem('sp-appcfg', JSON.stringify(o)); }catch(e){} }catch(e){}
}

/* Keluar akun. signOut() bawaan Supabase membiarkan sesi tetap tersimpan kalau panggilan ke server gagal
   (jaringan lambat, token kedaluwarsa), sehingga setelah halaman dimuat ulang akun masuk lagi.
   Jadi: coba cabut sesi di server sebentar, lalu selalu hapus sesi di perangkat ini. */
let signingOut=false;
async function signOutAll(){
  if(signingOut) return; signingOut=true;
  const sb=CLOUD.sb;
  try{ await Promise.race([sb.auth.signOut({scope:'global'}), new Promise(r=>setTimeout(r,2500))]); }catch(err){}
  try{ await sb.auth.signOut({scope:'local'}); }catch(err){}
  try{ Object.keys(localStorage).filter(k=>/^sb-.*-auth-token/.test(k)||['sp-state','sp-guests','sp-wishes'].includes(k)).forEach(k=>localStorage.removeItem(k)); }catch(err){}
  try{ Object.keys(sessionStorage).filter(k=>/^sb-/.test(k)).forEach(k=>sessionStorage.removeItem(k)); }catch(err){}
  CLOUD.uid=null; S.user=null;
  location.replace('/');
}
const VIEWS = ['admin','bandingkan','beranda','tema','buat','undangan','dashboard','checkout','tagihan','checkin','keluarga','katering','edit','album'];
let bootDoneCalled=false;
function bootDone(){ if(bootDoneCalled) return; bootDoneCalled=true; const h=document.documentElement; if(!h.classList.contains('boot-guest') && !h.classList.contains('boot-app')) return;
  const ph=$('#g-cover .cv-photo'); const m=ph && (ph.getAttribute('style')||'').match(/url\((['"]?)(.*?)\1\)/);
  const img = m ? new Promise(r=>{ const i=new Image(); i.onload=i.onerror=r; i.src=m[2]; setTimeout(r,1800); }) : Promise.resolve();
  const fonts = (document.fonts && document.fonts.ready) ? Promise.race([document.fonts.ready, new Promise(r=>setTimeout(r,1400))]) : Promise.resolve();
  const guest = h.classList.contains('boot-guest');
  if(guest){ GATE.busy=true; gateTheme(); $('#gate')?.classList.add('show'); }
  Promise.all([img, fonts]).then(()=>{ h.classList.add('boot-done'); if(guest) gateOpen(); setTimeout(()=>{ h.classList.remove('boot-guest','boot-app'); const b=$('#bootSkel'); if(b) b.remove(); }, 500); });
}
function route(){
  document.documentElement.classList.remove('boot-wait');
  if(CLOUD.albumMode){ $$('[data-view]').forEach(x=> x.hidden = x.dataset.view!=='album'); $('#siteHeader').hidden=true; $('#footerWrap').hidden=true; closeModal(); renderAlbum(); bootDone(); return; }
  if(CLOUD.famMode || CLOUD.catMode){ const v=CLOUD.famMode?'keluarga':'katering'; $$('[data-view]').forEach(x=> x.hidden = x.dataset.view!==v); $('#siteHeader').hidden=true; $('#footerWrap').hidden=true; closeModal(); CLOUD.famMode?renderFamPage():renderCatPage(); bootDone(); return; }
  if(CLOUD.guestMode || CLOUD.pinMode){
    const v = CLOUD.guestMode ? 'undangan' : 'checkin';
    $$('[data-view]').forEach(x=> x.hidden = x.dataset.view!==v); $('#siteHeader').hidden=true; $('#footerWrap').hidden=true; closeModal();
    if(CLOUD.guestMode && CLOUD.notFound){ $('#guestShell').innerHTML = `<div class="cloud-404" style="width:100%"><div><img class="kara kara-404" src="/assets/kara/kara-bingung.webp" alt="" aria-hidden="true" loading="lazy" decoding="async"><h1 class="display" style="font-size:36px">Undangan tidak ditemukan</h1><p class="muted" style="margin-top:10px">Link mungkin salah ketik, atau undangan belum dipublikasikan oleh pasangan. Coba minta link terbaru ke pengantin.</p><p style="margin-top:20px"><a class="btn btn-primary" href="/">Ke beranda Sakara</a></p></div></div>`; bootDone(); return; }
    if(CLOUD.guestMode) renderGuest(); else renderCheckin();
    bootDone(); return;
  }
  if(!document.documentElement.classList.contains('boot-oauth')) setTimeout(bootDone, 0);
  let h = (location.hash||'').slice(1) || 'beranda';
  if(location.pathname.replace(/\/+$/,'')==='/admin') h='admin';
  if(location.hash==='#beranda' || location.hash==='#') history.replaceState(null,'',location.pathname+location.search);
  if(h.startsWith('keluarga-')){ FP={token:h.slice(9),fam:null,guests:[],info:null,err:null}; famPageLoad().then(renderFamPage); h='keluarga'; }
  else if(h.startsWith('katering-')){ CP={token:h.slice(9),d:null,err:null}; catPageLoad().then(renderCatPage); h='katering'; }
  let scrollTo = null;
  if(h==='harga'){ h='beranda'; scrollTo='harga-sec'; }
  if(h==='tema-custom'){ h='tema'; catKind='custom'; } else if(h==='tema') catKind='lukisan';
  if(h==='demo' && !ff('demo')) h='beranda';
  if(h==='demo'){ if(!DEMO.on) enterDemo(); h='dashboard'; history.replaceState(null,'',location.pathname+location.search+'#dashboard'); setTimeout(demoIntro,60); }
  else if(DEMO.on && !['dashboard','edit','undangan','checkin'].includes(h)) exitDemo();
  else if(h==='dashboard' && !DEMO.on && !S.user && !S.published && !CLOUD.uid){ enterDemo(); setTimeout(demoIntro,60); }
  document.documentElement.dataset.dv = h;
  if(DEMO.on && ['edit','undangan','checkin'].includes(h)) demoLog('view', h);
  if(!VIEWS.includes(h)) h='beranda';
  if(h!=='checkout') clearInterval(CO.timer);
  if(h!=='undangan') stopBgm(); if(h!=='buat') stopPrev();
  if(h==='buat' && S.published){ h='edit'; history.replaceState(null,'',location.pathname+location.search+'#edit'); }
  $$('[data-view]').forEach(v=> v.hidden = v.dataset.view!==h);
  if(h!=='edit') edLeave();
  const full = h==='admin' || h==='dashboard' || h==='undangan' || h==='checkin' || h==='keluarga' || h==='katering' || h==='edit' || h==='album';
  $('#siteHeader').hidden = full || h==='beranda'; $('#footerWrap').hidden = full || ['dashboard','buat','checkout','beranda'].includes(h);
  document.documentElement.classList.toggle('on-home', h==='beranda');
  if(!CLOUD.guestMode && h!=='undangan' && h!=='admin'){ const TT={beranda:'Sakara — Undangan Pernikahan Digital', tema:'Tema undangan pernikahan · Sakara', bandingkan:'Bandingkan paket & harga · Sakara', buat:'Buat undangan · Sakara', edit:'Edit undangan · Sakara', dashboard:'Dashboard · Sakara', checkout:'Pembayaran · Sakara', tagihan:'Tagihan · Sakara', checkin:'Check-in tamu · Sakara', album:'Album · Sakara'}; document.title = TT[h] || 'Sakara — Undangan Pernikahan Digital'; }
  if(window.EDH){ if(h==='beranda') EDH.enter(); else EDH.leave(); }
  document.body.style.overflow='';
  $$('.nav a').forEach(a=>{ if(a.dataset.nav!==(scrollTo?'harga':(DEMO.on?'demo':(h==='edit'?'buat':h==='bandingkan'?'harga':h)))) a.removeAttribute('aria-current'); else a.setAttribute('aria-current','page'); });
  closeModal(); renderAuthSlot();
  if(h==='tema') renderCatalog();
  if(!h||h==='beranda') requestAnimationFrame(()=>fitLive($('#e-track')));
  if(h==='admin') renderAdmin();
  if(h==='buat'){ renderStep(); refreshPreview(); try{ if(sessionStorage.getItem('sp-hero-names')){ sessionStorage.removeItem('sp-hero-names'); setTimeout(()=>toast(`Nama ${S.bride.nick} & ${S.groom.nick} sudah terisi. Tinggal lengkapi sisanya, ya!`),350); } }catch(e){} }
  if(h==='edit'){ document.body.style.overflow='hidden'; renderEditor(); }
  const prevView=route.prev; route.prev=h;
  if(h!=='undangan' && !CLOUD.guestMode){ const gt=$('#gate'); if(gt && gt.classList.contains('show')){ gt.classList.remove('show','open'); gt.style.display='none'; GATE.busy=false; } }
  if(h==='undangan'){ renderGuest(); if(prevView!=='undangan' && !document.documentElement.classList.contains('boot-guest')) playGate(); }
  if(h==='dashboard') renderDash();
  if(h==='checkout') renderCheckout();
  if(h==='tagihan') renderTagihan();
  if(h==='bandingkan') renderCompare();
  if(h==='checkin') renderCheckin();
  if(h==='album'){ albumLoad().then(renderAlbum); }
  if(scrollTo==='harga-sec' && window.EDH){ window.scrollTo(0,0); EDH.scrollTo('e-paket'); } else if(scrollTo) setTimeout(()=> $('#'+scrollTo).scrollIntoView({behavior:'smooth'}), 40); else window.scrollTo(0,0);
  setTimeout(()=>aniScan($(`[data-view="${h}"]`)), 30);
}
window.addEventListener('hashchange', route);
window.addEventListener('popstate', route);
// Pindah ke/dari panel admin tanpa memuat ulang halaman
document.addEventListener('click', e=>{ const a=e.target.closest && e.target.closest('a[href="/admin"],a[href="/"]'); if(!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target==='_blank') return;
  const to=a.getAttribute('href'); const here=location.pathname.replace(/\/+$/,'')||'/';
  if(to==='/' && here!=='/admin') return; if(to==='/admin' && here==='/admin') return;
  e.preventDefault(); closeModal(); history.pushState(null,'',to); route(); window.scrollTo(0,0); });
// Halaman publik bisa langsung dirender tanpa menunggu koneksi akun (cloudInit), supaya refresh di #tema tidak sempat menampilkan beranda
if(/^\/?$/.test(location.pathname) && /^#(tema|tema-custom|bandingkan)$/.test(location.hash)){ try{ route(); }catch(e){ console.warn('early route', e); } }
cloudInit().catch(e=>console.warn('cloud init', e)).finally(()=>{ const H=document.documentElement, held=H.classList.contains('boot-oauth'); H.classList.remove('boot-oauth'); route(); if(held) bootDone(); });
setInterval(()=> $$('[data-count]').forEach(el=> el.innerHTML = countHTML(el.dataset.count)), 30000);
})();

/* Navigasi bawah undangan disembunyikan selama sampul masih memenuhi layar, supaya tidak menumpuk dengan hitung mundur */
(function(){ let raf=0; const upd=()=>{ raf=0; const vw=document.querySelector('[data-view="undangan"]:not([hidden])'); if(!vw) return; const nav=vw.querySelector('.g-nav'); if(!nav) return; const cv=vw.querySelector('.inv .cover'); const hide=!!cv && cv.getBoundingClientRect().bottom > innerHeight*0.55; nav.classList.toggle('g-hide', hide); };
  addEventListener('scroll', ()=>{ if(!raf) raf=requestAnimationFrame(upd); }, {passive:true}); new MutationObserver(()=>{ if(!raf) raf=requestAnimationFrame(upd); }).observe(document.body,{childList:true,subtree:false}); setInterval(upd, 1500); })();

/* tandai saat sedang mengetik (keyboard HP terbuka) */
document.addEventListener('focusin', e=>{ if(e.target.matches && e.target.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea,select')) document.body.classList.add('is-typing'); });
document.addEventListener('focusout', ()=>{ setTimeout(()=>{ const a=document.activeElement; if(!(a && a.matches && a.matches('input,textarea,select'))) document.body.classList.remove('is-typing'); }, 60); });
/* E2: tombol pratinjau di HP menyingkir saat halaman digulir ke bawah (sedang mengisi), muncul lagi saat digulir ke atas atau berhenti */
(function(){ let y0=scrollY, t=0; const b=document.body;
  addEventListener('scroll',()=>{ if(document.documentElement.dataset.dv!=='buat') return; const y=scrollY; if(y>y0+6) b.classList.add('fab-away'); else if(y<y0-6) b.classList.remove('fab-away'); y0=y; clearTimeout(t); t=setTimeout(()=>b.classList.remove('fab-away'),900); },{passive:true}); })();

/* elemen role=button bisa dibuka dengan Enter atau Spasi */
document.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target.matches && e.target.matches('[role="button"][data-act]:not(button):not(a)')){ e.preventDefault(); e.target.click(); } });
