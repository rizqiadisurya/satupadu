/* Music: plays the couple's own file when set, otherwise a short generated loop (WebAudio). */
window.Music = (() => {
  let ctx, out, timer, playing = false, step = 0, nextT = 0, startAt = 0, audio;
  const BPM = 104, beat = 60/BPM, LOOP = 32;
  // F major, 8 bars × 4 beats: [beat, midi, len]
  // C major, bouncy ukulele-like loop: [beat, midi, len]
  const mel = [[0,72,.5],[.5,74,.5],[1,76,1],[2,79,1],[3,76,1],[4,77,.5],[4.5,76,.5],[5,74,1],[6,72,2],
               [8,72,.5],[8.5,74,.5],[9,76,1],[10,79,1],[11,81,1],[12,79,1.5],[13.5,77,.5],[14,76,2],
               [16,77,.5],[16.5,79,.5],[17,81,1],[18,79,1],[19,77,1],[20,76,.5],[20.5,74,.5],[21,72,1],[22,74,2],
               [24,72,.5],[24.5,74,.5],[25,76,1],[26,74,1],[27,71,1],[28,72,4]];
  const ch = [[48,60,64,67],[45,57,60,64],[41,57,60,65],[43,55,59,62],[48,60,64,67],[45,57,60,64],[41,57,60,65],[43,55,59,67]];
  const hz = n => 440*Math.pow(2,(n-69)/12);
  function ep(t, n, v, len){
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = "triangle"; o2.type = "sine"; o.frequency.value = hz(n); o2.frequency.value = hz(n)*2.001;
    const g2 = ctx.createGain(); g2.gain.value = .12;
    f.type = "lowpass"; f.frequency.value = 2400;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.01); g.gain.exponentialRampToValueAtTime(v*.25,t+.18); g.gain.exponentialRampToValueAtTime(.0001,t+len*beat+.35);
    o.connect(g); o2.connect(g2).connect(g); g.connect(f).connect(out);
    o.start(t); o2.start(t); o.stop(t+len*beat+.8); o2.stop(t+len*beat+.8);
  }
  function tick(){
    while (nextT < ctx.currentTime + .25){
      const b = step % LOOP;
      mel.filter(n => Math.floor(n[0]) === b).forEach(n => ep(nextT + (n[0]-b)*beat, n[1], .16, n[2]));
      if (b % 4 === 0) ch[b/4].forEach((n,i) => ep(nextT + i*.03, n, i ? .045 : .08, 1.2));
      if (b % 4 === 2) ch[Math.floor(b/4)].slice(1).forEach((n,i) => ep(nextT + i*.025, n, .035, .8));
      nextT += beat; step++;
    }
  }
  function init(){
    ctx = new (window.AudioContext||window.webkitAudioContext)(); out = ctx.createGain(); out.gain.value = .8;
    const len = ctx.sampleRate*2, buf = ctx.createBuffer(2,len,ctx.sampleRate);
    for (let c=0;c<2;c++){ const d = buf.getChannelData(c); for (let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len,2.5); }
    const rv = ctx.createConvolver(), wet = ctx.createGain(); rv.buffer = buf; wet.gain.value = .3;
    out.connect(ctx.destination); out.connect(rv).connect(wet).connect(ctx.destination);
  }
  return {
    get playing(){ return playing; },
    reset(){ const was = playing; this.pause(); audio = null; step = 0; if (was) this.play(); },
    play(){
      const SRC = (window.Invite && Invite.data && Invite.data.music && Invite.data.music.src) || "";
      if (SRC){ audio ||= Object.assign(new Audio(SRC),{loop:true}); audio.play().catch(()=>{}); playing = true; return; }
      if (!ctx) init(); ctx.resume(); nextT = ctx.currentTime + .05; startAt = nextT - (step%LOOP)*beat; timer = setInterval(tick, 60); playing = true;
    },
    pause(){ playing = false; if (audio) return audio.pause(); clearInterval(timer); },
    restart(){ step = 0; if (audio) audio.currentTime = 0; if (playing){ this.pause(); this.play(); } },
    progress(){ if (audio) return audio.duration ? audio.currentTime/audio.duration : 0; if (!ctx || !playing) return (step%LOOP)/LOOP; return (((ctx.currentTime-startAt)/beat)%LOOP)/LOOP; }
  };
})();
