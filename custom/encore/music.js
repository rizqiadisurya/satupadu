/* Music: plays the couple's own file when set, otherwise a short generated loop (WebAudio). */
window.Music = (() => {
  let ctx, master, timer, playing = false, startAt = 0, step = 0, nextT = 0, audioEl;
  const BPM = 84, beat = 60/BPM, LOOP_BEATS = 48;
  // D major waltz, 16 bars × 3 beats  [beat offset, midi, dur]
  // Original slow waltz in E minor → G, music-box timbre: [beat, midi, len]
  const mel = [[0,71,1],[1,74,1],[2,78,1],[3,79,2],[5,78,1],[6,76,1],[7,74,2],[9,71,1],[10,72,1],[11,74,1],
               [12,76,2],[14,74,1],[15,72,1],[16,71,1],[17,69,3],[20,67,1],[21,71,1],[22,74,1],[23,76,1],
               [24,79,2],[26,78,1],[27,76,1],[28,74,1],[29,72,1],[30,71,2],[32,69,1],[33,71,1],[34,72,1],
               [35,74,2],[37,72,1],[38,71,1],[39,69,1],[40,67,1],[41,71,1],[42,74,1],[43,71,1],[44,67,1],[45,71,3]];
  const chords = [[40,59,64],[47,59,62],[48,60,64],[43,59,62],[45,60,64],[40,59,64],[43,55,59],[48,60,64],
                  [43,59,62],[47,59,63],[45,57,60],[42,57,62],[40,55,59],[38,57,62],[43,55,59],[43,59,62]];
  const hz = m => 440 * Math.pow(2, (m-69)/12);
  function impulse(c){ const len = c.sampleRate*2.4, b = c.createBuffer(2,len,c.sampleRate);
    for (let ch=0;ch<2;ch++){ const d=b.getChannelData(ch); for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3); } return b; }
  function tine(t, m, v=.18){
    [[1,1],[3,.18],[5.4,.05]].forEach(([mult,amp]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = hz(m)*mult;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v*amp,t+.004); g.gain.exponentialRampToValueAtTime(.0001,t+(mult===1?1.9:.5));
      o.connect(g).connect(master); o.start(t); o.stop(t+2);
    });
  }
  function schedule(){
    while (nextT < ctx.currentTime + .25){
      const b = step % LOOP_BEATS;
      mel.filter(n => Math.floor(n[0]) === b).forEach(n => tine(nextT + (n[0]-b)*beat, n[1]));
      const bar = Math.floor(b/3), c = chords[bar];
      if (b % 3 === 0) tine(nextT, c[0], .14);
      else { tine(nextT, c[1], .06); tine(nextT + .02, c[2], .05); }
      nextT += beat; step++;
    }
  }
  function init(){
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = .75;
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx);
    const wet = ctx.createGain(); wet.gain.value = .35;
    master.connect(ctx.destination); master.connect(verb).connect(wet).connect(ctx.destination);
  }
  return {
    get playing(){ return playing; },
    reset(){ const was = playing; this.pause(); audioEl = null; step = 0; if (was) this.play(); },
    play(){
      const SRC = (window.Invite && Invite.data && Invite.data.music && Invite.data.music.src) || "";
      if (SRC){ audioEl ||= Object.assign(new Audio(SRC), {loop:false}); if (!audioEl._seeked) { audioEl._seeked = true; const st = Invite.musicStart(); if (st) audioEl.addEventListener("loadedmetadata", () => { audioEl.currentTime = st; }, { once: true }); } if (!audioEl.onended) audioEl.onended = () => { audioEl.currentTime = Invite.musicStart(); audioEl.play().catch(()=>{}); }; audioEl.play().catch(()=>{}); playing = true; return; }
      if (!ctx) init(); ctx.resume();
      nextT = ctx.currentTime + .05; startAt = nextT - (step % LOOP_BEATS)*beat;
      timer = setInterval(schedule, 60); playing = true;
    },
    pause(){ playing = false; if (audioEl) return audioEl.pause(); clearInterval(timer); },
    restart(){ step = 0; if (audioEl) audioEl.currentTime = Invite.musicStart(); if (playing){ this.pause(); this.play(); } },
    progress(){
      if (audioEl) return audioEl.duration ? audioEl.currentTime/audioEl.duration : 0;
      if (!ctx || !playing) return (step % LOOP_BEATS)/LOOP_BEATS;
      return (((ctx.currentTime - startAt)/beat) % LOOP_BEATS)/LOOP_BEATS;
    }
  };
})();
