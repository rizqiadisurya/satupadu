/* Beranda editorial Sakara: animasi, gulir halus, navbar berubah warna */
window.EDH=(function(){
'use strict';
const root=document.querySelector('.edh'); if(!root) return null;
const $=(s,r=root)=>r.querySelector(s), $$=(s,r=root)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE=matchMedia('(hover:hover) and (pointer:fine)').matches;
const HAS=!!(window.gsap&&window.ScrollTrigger&&window.Lenis);
let inited=false, active=false, lenis=null, firstEnter=true, toneT=null;

// logo Truntum
$$('svg[data-mark]').forEach(s=>{const c=s.dataset.mark; let h='';
  for(let a=0;a<360;a+=45) h+=`<path transform="rotate(${a} 50 50)" d="M50 41 C46.5 35 46.5 27 50 21 C53.5 27 53.5 35 50 41 Z" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>`;
  for(let a=22.5;a<360;a+=45) h+=`<circle transform="rotate(${a} 50 50)" cx="50" cy="19" r="2.2" fill="${c}"/>`;
  h+=`<circle cx="50" cy="50" r="5.5" fill="none" stroke="${c}" stroke-width="2.4"/><circle cx="50" cy="50" r="2.2" fill="${c}"/>`; s.innerHTML=h; });
// kata per kata
$$('[data-words]').forEach(el=>{
  const walk=n=>{ [...n.childNodes].forEach(c=>{ if(c.nodeType===3){ const f=document.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(t=>{ if(!t) return; if(/^\s+$/.test(t)) f.append(t); else { const s=document.createElement('span'); s.className='e-w'; s.textContent=t; f.append(s);} }); c.replaceWith(f);} else walk(c); }); };
  walk(el); });

// ---------- menu HP & akun (selalu aktif) ----------
const drawer=$('#e-drawer'), mb=$('#e-menuBtn'), avBtn=$('#e-avBtn'), menuEl=$('#e-acctMenu'), nav=$('#e-nav');
function closeMenu(){ drawer.classList.remove('e-open'); drawer.setAttribute('aria-hidden','true'); mb.setAttribute('aria-expanded','false'); }
function closeAcct(){ menuEl.hidden=true; avBtn.setAttribute('aria-expanded','false'); }
mb.addEventListener('click',()=>{ drawer.classList.add('e-open'); drawer.setAttribute('aria-hidden','false'); mb.setAttribute('aria-expanded','true'); if(HAS&&!RM) gsap.from($$('a',drawer),{yPercent:60,opacity:0,stagger:.06,duration:.9,ease:'expo.out',delay:.25}); });
$('#e-menuX').addEventListener('click',closeMenu);
const placeMenu=()=>{ const r=avBtn.getBoundingClientRect(); menuEl.style.top=(r.bottom+10)+'px'; menuEl.style.right=(innerWidth-r.right)+'px'; };
addEventListener('resize',()=>{ if(!menuEl.hidden) placeMenu(); });
avBtn.addEventListener('click',e=>{ e.stopPropagation(); const o=menuEl.hidden; if(o) placeMenu(); menuEl.hidden=!o; avBtn.setAttribute('aria-expanded',o); if(o) menuEl.querySelector('a').focus(); });
document.addEventListener('click',e=>{ if(!e.target.closest('.e-acct,#e-acctMenu')) closeAcct(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeAcct(); closeMenu(); } });
root.addEventListener('click',e=>{ if(e.target.closest('[data-act],a[href^="#"]:not([data-sec]),a[href^="/"]')){ closeMenu(); closeAcct(); } });
// tautan dalam halaman (tanpa mengubah alamat)
root.addEventListener('click',e=>{ const a=e.target.closest('a[data-sec]'); if(!a) return; e.preventDefault(); e.stopPropagation(); closeMenu(); closeAcct(); go(a.dataset.sec); });
function go(id){ const t=id==='e-top'?0:$('#'+id); if(t===null) return; if(lenis) lenis.scrollTo(t,{offset:id==='e-top'?0:-20,duration:1.6}); else if(t===0) scrollTo({top:0,behavior:'smooth'}); else t.scrollIntoView({behavior:'smooth'}); }
// promo
const promo=$('#e-promo'); let promoShown=false;
$('#e-promoX').addEventListener('click',()=>{ promo.classList.remove('e-on'); try{ sessionStorage.setItem('edh-promo','x'); }catch(e){} });
let promoOk=false;
function showPromo(){ if(promoShown) return; promoShown=true; try{ if(sessionStorage.getItem('edh-promo')) return; }catch(e){} setTimeout(()=>{ promoOk=true; promoCheck(); },6500); }
function promoCheck(){ let ok=promoOk&&active&&scrollY<innerHeight*1.4; try{ if(sessionStorage.getItem('edh-promo')) ok=false; }catch(e){} promo.classList.toggle('e-on',ok); }
addEventListener('scroll',()=>{ if(promoOk) promoCheck(); },{passive:true});
// langkah
const cimgs=$$('.e-cara-sticky img'), steps=$$('.e-step');
const act=i=>{ steps.forEach((x,j)=>x.classList.toggle('e-on',j===i)); cimgs.forEach((x,j)=>x.classList.toggle('e-on',j===i)); };
steps.forEach((st,i)=>{ ['mouseenter','focus','click'].forEach(ev=>st.addEventListener(ev,()=>act(i))); });
// warna navbar mengikuti latar
const tItems=$$('[data-t]',nav);
function tone(){ if(!active) return; tItems.forEach(el=>{ const r=el.getBoundingClientRect(); if(!r.width) return; const x=r.left+r.width/2, y=r.top+r.height/2;
  const hit=document.elementsFromPoint(x,y).find(e=>!nav.contains(e)&&!e.closest('.e-promo,.e-cursor,.e-peek,#toastRoot,#modalRoot'));
  const t=hit&&hit.closest('[data-tone]'); el.classList.toggle('e-dk',!!t&&t.dataset.tone==='dk'); }); }
addEventListener('scroll',tone,{passive:true}); addEventListener('resize',tone);

// kunci gulir halaman saat jendela (modal) situs terbuka
const mroot=document.getElementById('modalRoot');
if(mroot) new MutationObserver(()=>{ if(!active) return; const open=mroot.childElementCount>0; if(lenis){ open?lenis.stop():lenis.start(); } document.documentElement.style.overflow=open?'hidden':''; }).observe(mroot,{childList:true});
let pending=null;
function staticMode(){ document.documentElement.classList.remove('edh-first'); $('.e-loader')&&$('.e-loader').remove(); document.body.classList.remove('edh-loading'); $$('.e-statement .e-w').forEach(w=>w.classList.add('e-on')); }

function makeLenis(){
  lenis=new Lenis({lerp:.085,smoothWheel:true,prevent:n=>!!(n.closest&&n.closest('#modalRoot,.e-acct-menu,.e-drawer'))});
  lenis.on('scroll',ScrollTrigger.update); lenis.on('scroll',tone);
  lenis.on('scroll',e=>{ if(e.direction) mqDir=e.direction>0?-1:1; if(!menuEl.hidden) closeAcct(); });
}
let mqDir=-1, mx=0;
const tick=t=>{ if(lenis) lenis.raf(t*1000); };

function init(){
  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
  makeLenis();

  // pembuka: hanya saat pertama kali membuka situs di beranda
  const H=document.documentElement, loader=$('.e-loader'), first=H.classList.contains('edh-first') && loader;
  const intro=gsap.timeline({defaults:{ease:'expo.out'},paused:true});
  let shift=0;
  if(first){
    lenis.stop();
    const el=(performance.now()-(window.__edhT0||performance.now()))/1000; shift=Math.max(0,1.7-el)-1.7;
    intro.add(()=>{ $$('.e-loader .e-brand span, .e-loader .e-mark').forEach(x=>x.style.animation='none'); gsap.set('.e-loader .e-brand span',{y:0}); gsap.set('.e-loader .e-mark',{opacity:1,rotate:90}); $('#e-pct').textContent='100'; },1.69+shift)
      .to('.e-loader .e-brand span',{y:'-110%',duration:.8,stagger:.04,ease:'expo.in'},1.7+shift)
      .to('.e-loader',{yPercent:-100,duration:1.2,ease:'expo.inOut'},2.15+shift)
      .add(()=>{ H.classList.remove('edh-first'); loader.remove(); if(lenis) lenis.start(); if(pending){ const p=pending; pending=null; setTimeout(()=>go(p),300); } },3.2+shift);
  } else { loader&&loader.remove(); H.classList.remove('edh-first'); }
  const o=first?shift:-2.7;
  intro.from('.e-hl-bawah img',{yPercent:40,duration:2.2,ease:'power3.out',force3D:true},2.95+o)
    .from('.e-hl-kiri img',{xPercent:-55,duration:2.2,ease:'power3.out',force3D:true},3.1+o)
    .from('.e-hl-kanan img',{xPercent:55,duration:2.2,ease:'power3.out',force3D:true},3.1+o)
    .from('.e-kp',{opacity:0,scale:.4,duration:1.2,stagger:.18,ease:'back.out(2)'},4.0+o)
    .from('#e-h1 .e-line>span',{yPercent:110,duration:1.4,stagger:.14},3.35+o)
    .from('.e-hero-copy .e-split-fade',{opacity:0,y:20,duration:1.1,stagger:.25},3.5+o)
    .fromTo('.e-nav',{opacity:0},{opacity:1,duration:1},3.6+o)
    .from('.e-hero-foot',{opacity:0,duration:1},4.0+o);
  const t0=Date.now();
  (function wait(){ if(H.classList.contains('e-intro') && Date.now()-t0<4500) return setTimeout(wait,60); intro.play(); })();

  const hs={trigger:'.e-hero',start:'top top',end:'bottom top',scrub:.6};
  gsap.to('.e-hl-kiri',{xPercent:-35,yPercent:-6,ease:'none',force3D:true,scrollTrigger:hs});
  gsap.to('.e-hl-kanan',{xPercent:35,yPercent:-6,ease:'none',force3D:true,scrollTrigger:hs});
  gsap.to('.e-hl-bawah',{yPercent:22,ease:'none',force3D:true,scrollTrigger:hs});
  gsap.to('.e-stage',{scale:1.06,ease:'none',force3D:true,scrollTrigger:hs});
  gsap.to('.e-hero-copy',{yPercent:-20,opacity:0,ease:'none',force3D:true,scrollTrigger:{trigger:'.e-hero',start:'top top',end:'70% top',scrub:.6}});

  $$('[data-par]').forEach(img=>{ const v=+img.dataset.par; gsap.fromTo(img,{yPercent:-v},{yPercent:v,ease:'none',scrollTrigger:{trigger:img.parentElement,start:'top bottom',end:'bottom top',scrub:true}}); });
  $$('.e-reveal').forEach(el=>gsap.from(el,{clipPath:'inset(100% 0 0 0)',duration:1.5,ease:'expo.inOut',scrollTrigger:{trigger:el,start:'top 85%'}}));
  $$('h2.display').forEach(h=>gsap.from($$('.e-line>span',h),{yPercent:110,duration:1.3,stagger:.1,ease:'expo.out',scrollTrigger:{trigger:h,start:'top 85%'}}));
  const ws=$$('.e-statement .e-w');
  ScrollTrigger.create({trigger:'.e-statement',start:'top 80%',end:'bottom 40%',scrub:true,onUpdate:s=>{ const n=Math.round(s.progress*ws.length); ws.forEach((w,i)=>w.classList.toggle('e-on',i<n)); }});

  // galeri tema horizontal
  const track=$('#e-track'); gCount();
  const dist=()=>track.scrollWidth-innerWidth+Math.max(24,(innerWidth-1320)/2);
  gsap.to(track,{x:()=>-dist(),ease:'none',scrollTrigger:{trigger:'.e-tema',start:'top top',end:()=>'+='+dist(),pin:'.e-tema-pin',scrub:1,invalidateOnRefresh:true,
    onUpdate:s=>{ const n=$$('.e-card',track).length; $('#e-prog').style.transform=`scaleX(${s.progress})`; $('#e-tc').textContent=String(Math.min(n,1+Math.floor(s.progress*n))).padStart(2,'0'); }}});
  $$('.e-card',track).slice(0,6).forEach((c,i)=>gsap.from(c,{y:60+i%3*30,opacity:0,duration:1.2,ease:'expo.out',scrollTrigger:{trigger:'.e-tema',start:'top 60%'},delay:i*.05}));

  steps.forEach((st,i)=>ScrollTrigger.create({trigger:st,start:'top 62%',end:'bottom 62%',onToggle:s=>{ if(s.isActive) act(i); }}));
  steps.forEach(st=>gsap.from(st.children,{y:30,opacity:0,duration:1,stagger:.06,ease:'expo.out',scrollTrigger:{trigger:st,start:'top 85%'}}));
  // ponsel: di layar besar ikut sticky di samping; di layar kecil mengecil lalu pindah ke pojok kanan bawah
  // dan tetap terlihat selagi langkah-langkahnya dibaca, layarnya berganti mengikuti langkah yang aktif
  const ph=$('.e-cara-sticky'), mm=gsap.matchMedia();
  mm.add('(min-width:861px)',()=>{ gsap.from(ph,{y:80,rotate:6,opacity:0,duration:1.4,ease:'expo.out',scrollTrigger:{trigger:'.e-cara',start:'top 70%'}}); });
  mm.add('(max-width:860px)',()=>{
    const absL=el=>{ let x=0; while(el){ x+=el.offsetLeft; el=el.offsetParent; } return x; };
    const top=()=>parseFloat(getComputedStyle(ph).top)||84, S=.4, M=14, B=()=>innerWidth<600?92:24; // B: ruang untuk bilah browser yang melayang di bawah
    gsap.fromTo(ph,{x:0,y:0,scale:1},{x:()=>innerWidth-M-(absL(ph)+ph.offsetWidth),y:()=>innerHeight-B()-(top()+ph.offsetHeight),scale:S,transformOrigin:'100% 100%',ease:'power1.inOut',immediateRender:false,
      scrollTrigger:{trigger:ph,start:()=>'top '+top()+'px',end:()=>'+='+Math.round(ph.offsetHeight*.55),scrub:.6,invalidateOnRefresh:true}});
    gsap.to(ph,{autoAlpha:0,ease:'none',scrollTrigger:{trigger:'.e-cara-grid',start:'bottom 82%',end:'bottom 70%',scrub:true}});
  });

  $$('.e-row').forEach(r=>gsap.from(r,{opacity:0,y:50,duration:1.1,ease:'expo.out',scrollTrigger:{trigger:r,start:'top 88%'}}));
  const peek=$('#e-peek'), pimgs=$$('img',peek);
  if(FINE){
    const px=gsap.quickTo(peek,'x',{duration:.6,ease:'power3'}), py=gsap.quickTo(peek,'y',{duration:.6,ease:'power3'});
    $$('.e-row').forEach(r=>{ r.addEventListener('mouseenter',()=>{ peek.classList.add('e-on'); pimgs.forEach((im,i)=>im.classList.toggle('e-on',i==r.dataset.peek)); });
      r.addEventListener('mouseleave',()=>peek.classList.remove('e-on')); });
    addEventListener('mousemove',e=>{ if(active){ px(e.clientX+30); py(e.clientY-160); } });
  }
  const mq=$('#e-mq');
  gsap.ticker.add(()=>{ if(!active) return; const w=mq.scrollWidth/2; mx+=mqDir*(.6+Math.min(6,Math.abs(lenis?lenis.velocity:0)*.15)); if(mx<=-w) mx+=w; if(mx>0) mx-=w; mq.style.transform=`translateX(${mx}px)`; });

  if(FINE){
    const cur=$('.e-cursor'), cx=gsap.quickTo(cur,'x',{duration:.35,ease:'power3'}), cy=gsap.quickTo(cur,'y',{duration:.35,ease:'power3'});
    addEventListener('mousemove',e=>{ if(active){ cx(e.clientX); cy(e.clientY); } });
    const big=t=>{ $('#e-curTxt').textContent=t; cur.classList.add('e-big'); }, small=()=>cur.classList.remove('e-big');
    $$('.e-card').forEach(c=>{ c.addEventListener('mouseenter',()=>big('Lihat')); c.addEventListener('mouseleave',small); });
    $$('.e-row').forEach(c=>{ c.addEventListener('mouseenter',()=>big('Pilih')); c.addEventListener('mouseleave',small); });
    $$('a,button').forEach(a=>{ if(a.closest('.e-card,.e-row,.e-acct-menu,.e-drawer')) return; a.addEventListener('mouseenter',()=>gsap.to(cur,{scale:2.2,opacity:.25,duration:.3})); a.addEventListener('mouseleave',()=>gsap.to(cur,{scale:1,opacity:1,duration:.3})); });
    $$('.e-magnet').forEach(m=>{ const qx=gsap.quickTo(m,'x',{duration:.6,ease:'elastic.out(1,.4)'}), qy=gsap.quickTo(m,'y',{duration:.6,ease:'elastic.out(1,.4)'});
      m.addEventListener('mousemove',e=>{ const r=m.getBoundingClientRect(); qx((e.clientX-r.left-r.width/2)*.35); qy((e.clientY-r.top-r.height/2)*.35); });
      m.addEventListener('mouseleave',()=>{qx(0);qy(0);}); });
  }
  addEventListener('load',()=>{ if(active) ScrollTrigger.refresh(); });
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ if(active) ScrollTrigger.refresh(); });
}

// jumlah kartu tema mengikuti katalog; dipanggil ulang saat daftar tema berubah
function gCount(){ const t=$('#e-tt'); if(t) t.textContent=String($$('#e-track .e-card').length).padStart(2,'0'); }
function gallery(){ gCount(); if(active&&HAS&&inited) requestAnimationFrame(()=>ScrollTrigger.refresh()); }
function enter(){
  if(active) return; active=true; root.classList.add('e-is-on');
  if(RM||!HAS){ staticMode(); tone(); showPromo(); firstEnter=false; return; }
  if(!inited){ inited=true; init(); }
  else { makeLenis(); ScrollTrigger.getAll().forEach(t=>t.enable(false)); requestAnimationFrame(()=>ScrollTrigger.refresh()); }
  firstEnter=false; clearInterval(toneT); toneT=setInterval(tone,400); requestAnimationFrame(tone); showPromo();
}
function leave(){
  if(!active) return; active=false; document.documentElement.style.overflow=''; root.classList.remove('e-is-on'); document.documentElement.classList.remove('edh-first'); const ld=$('.e-loader'); ld&&ld.remove(); clearInterval(toneT); closeMenu(); closeAcct(); promo.classList.remove('e-on');
  document.body.classList.remove('edh-loading');
  if(lenis){ lenis.destroy(); lenis=null; }
  if(HAS&&inited) ScrollTrigger.getAll().forEach(t=>t.disable(true));
}
function sync(o){
  const role=!o.user?'tamu':(o.admin?'admin':'user');
  [nav,drawer].forEach(e=>e.dataset.role=role);
  if(o.user){ const n=o.user.name||o.user.email||'Akun'; const ini=(n.split(/\s+/).map(x=>x[0]).join('').slice(0,2)||'U').toUpperCase();
    ['#e-avIni','#e-avIni2'].forEach(s=>$(s).textContent=ini); $('#e-acName').textContent=n; $('#e-acName2').textContent=n; $('#e-acMail').textContent=o.user.email||''; }
  const paid=o.stage==='paid';
  $$('[data-l="buat"]').forEach(a=>{ a.setAttribute('href',paid?'#edit':'#buat'); const t=a.querySelector('[data-lt]');
    if(t) t.textContent=paid?'Edit undangan':'Undangan saya'; else if(a.closest('.e-drawer')) a.innerHTML=paid?'Edit <em>undangan</em>':'Undangan <em>saya</em>'; else a.textContent=paid?'Edit undangan':'Undangan saya'; });
}
function scrollToId(id){ if(!active) return; if(document.documentElement.classList.contains('edh-first')){ pending=id; return; } setTimeout(()=>{ if(HAS&&inited) ScrollTrigger.refresh(); go(id); },120); }
return {enter,leave,sync,scrollTo:scrollToId,gallery};
})();
