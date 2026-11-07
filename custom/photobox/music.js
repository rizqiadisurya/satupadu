/* Music: plays the couple's own file when set, otherwise a short generated loop (WebAudio). */
window.Music = (() => {
  let ctx, out, timer, playing = false, step = 0, nextT = 0, startAt = 0, audio;
  const BPM = 76, beat = 60/BPM, LOOP = 32;
  // F major, 8 bars × 4 beats: [beat, midi, len]
  const mel = [[0,72,1.5],[1.5,74,.5],[2,76,2],[4,77,1],[5,76,1],[6,74,2],[8,72,1.5],[9.5,69,.5],[10,72,2],[12,70,1],[13,69,1],[14,67,2],
               [16,72,1.5],[17.5,74,.5],[18,76,2],[20,79,1.5],[21.5,77,.5],[22,76,2],[24,74,1],[25,76,1],[26,77,1.5],[27.5,74,.5],[28,72,4]];
  const ch = [[53,57,60,64],[50,57,60,65],[46,58,62,65],[48,55,58,64],[53,57,60,64],[45,57,60,64],[46,58,62,65],[48,55,60,64]];
  const hz = n => 440*Math.pow(2,(n-69)/12);
  function ep(t, n, v, len){
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = "sine"; o2.type = "triangle"; o.frequency.value = hz(n); o2.frequency.value = hz(n)*2.001;
    const g2 = ctx.createGain(); g2.gain.value = .12;
    f.type = "lowpass"; f.frequency.value = 2400;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.01); g.gain.exponentialRampToValueAtTime(v*.35,t+.4); g.gain.exponentialRampToValueAtTime(.0001,t+len*beat+.6);
    o.connect(g); o2.connect(g2).connect(g); g.connect(f).connect(out);
    o.start(t); o2.start(t); o.stop(t+len*beat+.8); o2.stop(t+len*beat+.8);
  }
  function tick(){
    while (nextT < ctx.currentTime + .25){
      const b = step % LOOP;
      mel.filter(n => Math.floor(n[0]) === b).forEach(n => ep(nextT + (n[0]-b)*beat, n[1], .16, n[2]));
      if (b % 4 === 0) ch[b/4].forEach((n,i) => ep(nextT + i*.012, n, i ? .05 : .09, 3.6));
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
