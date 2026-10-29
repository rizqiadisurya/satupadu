"""Sakara - original instrumental tracks, synthesized from scratch (no samples, no copyrighted material)."""
import numpy as np, subprocess, sys, os

SR = 44100
rng = np.random.default_rng(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'

def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)

def env(n, a=0.005, d=1.5):
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    k = max(1, int(a * SR)); e[:k] *= np.linspace(0, 1, k)
    return e

def tone(f, dur, partials, decay, a=0.004, detune=0.0):
    n = int(dur * SR); t = np.arange(n) / SR; y = np.zeros(n)
    for ratio, amp, dmul in partials:
        ff = f * ratio * (1 + detune * rng.uniform(-1, 1))
        y += amp * np.sin(2 * np.pi * ff * t + rng.uniform(0, 6.28)) * np.exp(-t / (decay * dmul))
    k = max(1, int(a * SR)); y[:k] *= np.linspace(0, 1, k)
    fade = min(n, int(0.03 * SR)); y[-fade:] *= np.linspace(1, 0, fade)
    return y

def music_box(f, dur=2.5):
    return tone(f, dur, [(1, 1, 1), (2.0, .35, .5), (3.0, .12, .3), (4.2, .08, .2), (5.4, .05, .15)], 0.9, a=0.002)

def piano(f, dur=3.0, vel=1.0):
    p = [(1, 1, 1), (2, .5, .7), (3, .28, .5), (4, .14, .4), (5, .08, .3), (6, .05, .25)]
    y = tone(f, dur, p, 1.4 * (220 / max(f, 110)) ** 0.3, a=0.006, detune=0.0015)
    y += 0.5 * tone(f * 1.0012, dur, p[:3], 1.2, a=0.006)
    return vel * y

def metallophone(f, dur=3.5):  # gamelan-like inharmonic bar
    return tone(f, dur, [(1, 1, 1), (2.76, .45, .45), (5.40, .22, .25), (8.93, .1, .15)], 1.3, a=0.002)

def gong(f, dur=6.0):
    n = int(dur * SR); t = np.arange(n) / SR
    y = tone(f, dur, [(1, 1, 1), (1.48, .5, .8), (2.1, .35, .6), (2.9, .2, .4)], 2.8, a=0.01)
    y *= 1 + 0.35 * np.sin(2 * np.pi * 3.2 * t)  # beating
    return y

def pluck(f, dur=2.5, bright=0.5):  # Karplus-Strong
    n = int(dur * SR); p = int(SR / f)
    buf = rng.uniform(-1, 1, p)
    # soften initial noise
    for _ in range(int((1 - bright) * 4) + 1):
        buf = 0.5 * (buf + np.roll(buf, 1))
    y = np.empty(n); idx = 0; damp = 0.996
    for i in range(n):
        v = buf[idx]; y[i] = v
        nxt = (idx + 1) % p
        buf[idx] = damp * 0.5 * (v + buf[nxt]); idx = nxt
    y *= env(n, 0.001, 1.6)
    return y

def flute(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / 0.4, 0, 1)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    y = np.sin(ph) + .25 * np.sin(2 * ph) + .08 * np.sin(3 * ph)
    breath = np.convolve(rng.normal(0, 1, n), np.ones(30) / 30, 'same') * 0.06
    e = np.clip(t / 0.12, 0, 1) * np.clip((dur - t) / 0.25, 0, 1)
    return (y + breath) * e * 0.5

def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR; y = np.zeros(n)
    for f in freqs:
        for d in (-0.003, 0.003):
            y += np.sin(2 * np.pi * f * (1 + d) * t)
    e = np.clip(t / 1.5, 0, 1) * np.clip((dur - t) / 1.5, 0, 1)
    return y * e * 0.05

def reverb(x, secs=2.4, mix=0.28):
    n = int(secs * SR); t = np.arange(n) / SR
    ir = rng.normal(0, 1, n) * np.exp(-t / (secs / 5))
    ir[: int(0.012 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n; N = 1 << (L - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[:len(x)]
    return (1 - mix) * x + mix * wet * 3

class Track:
    def __init__(self, secs):
        self.L = np.zeros(int(secs * SR) + SR * 8); self.R = np.zeros_like(self.L)
    def add(self, y, at, gain=1.0, pan=0.0):
        i = int(at * SR); j = min(len(self.L), i + len(y)); y = y[: j - i] * gain
        self.L[i:j] += y * np.sqrt((1 - pan) / 2); self.R[i:j] += y * np.sqrt((1 + pan) / 2)
    def render(self, path, secs, title):
        L, R = reverb(self.L), reverb(self.R)
        n = int(secs * SR); L, R = L[:n], R[:n]
        fade = int(3 * SR); L[-fade:] *= np.linspace(1, 0, fade); R[-fade:] *= np.linspace(1, 0, fade)
        st = np.stack([L, R], 1); st /= np.max(np.abs(st)) / 0.89
        pcm = (st * 32767).astype('<i2').tobytes()
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-',
                        '-c:a', 'libmp3lame', '-b:a', '112k', '-metadata', f'title={title}',
                        '-metadata', 'artist=Sakara', path], input=pcm, check=True)

# Chords as MIDI note lists
def triad(root, minor=False):
    return [root, root + (3 if minor else 4), root + 7]

def kotak_musik(path):  # waltz, C major, music box
    bpm = 84; beat = 60 / bpm; secs = 68; T = Track(secs)
    prog = [(60, 0), (57, 1), (53, 0), (55, 0), (60, 0), (64, 1), (53, 0), (55, 0)]
    mel = [72, 76, 79, 77, 76, 74, 72, 74, 76, 72, 69, 71, 72, 79, 77, 76, 74, 72, 71, 74]
    t = 0.0; m = 0; bar = 0
    while t < secs - 4:
        root, mi = prog[bar % len(prog)]; ch = triad(root, mi)
        T.add(music_box(midi(ch[0] - 12)), t, .45, -.3)
        for k, nn in enumerate([ch[1], ch[2]]):
            T.add(music_box(midi(nn)), t + beat * (k + 1), .28, -.1)
        T.add(music_box(midi(mel[m % len(mel)] + 12 * (bar % 4 == 3))), t, .55, .3); m += 1
        if bar % 2: T.add(music_box(midi(mel[m % len(mel)])), t + 2 * beat, .45, .35); m += 1
        t += 3 * beat; bar += 1
    T.render(path, secs, 'Kotak Musik')

def piano_senja(path):  # slow ballad, D major I-V-vi-IV
    bpm = 66; beat = 60 / bpm; secs = 75; T = Track(secs)
    prog = [(62, 0), (57, 0), (59, 1), (55, 0)]
    melody = [[74, 73, 71, 69], [69, 71, 73, 76], [74, 71, 69, 66], [67, 69, 71, 69],
              [74, 76, 78, 76], [76, 73, 69, 73], [71, 74, 73, 71], [69, 67, 66, 69]]
    t = 0.0; bar = 0
    while t < secs - 4:
        root, mi = prog[bar % 4]; ch = triad(root, mi)
        T.add(piano(midi(ch[0] - 24), 4.5, .8), t, .5, -.2)
        T.add(pad([midi(x - 12) for x in ch], 4 * beat + 1.5), t, 1, 0)
        for k in range(4):
            arp = [ch[0] - 12, ch[1] - 12, ch[2] - 12, ch[1] - 12][k]
            T.add(piano(midi(arp), 2.5, .55), t + k * beat, .35, -.4 + k * .1)
        if bar >= 1:
            phr = melody[(bar - 1) % len(melody)]
            for k, nn in enumerate(phr):
                if bar % 4 == 0 and k == 3: continue
                T.add(piano(midi(nn), 3.0, .9), t + k * beat + (0.02 * rng.uniform()), .55, .25)
        t += 4 * beat; bar += 1
    T.render(path, secs, 'Piano Senja')

def gamelan_lembut(path):  # pelog-ish pentatonic, soft metallophones + gong
    bpm = 72; beat = 60 / bpm; secs = 72; T = Track(secs)
    base = 220.0
    scale = [base * r for r in (1, 1.122, 1.26, 1.498, 1.587, 2.0, 2.245, 2.52, 2.996)]
    pattern = [0, 2, 3, 2, 4, 3, 2, 0, 1, 2, 4, 5, 4, 3, 2, 3]
    melody = [5, None, 4, 3, None, 2, 3, None, 4, 5, None, 7, 5, None, 4, 2]
    t = 0.0; i = 0
    while t < secs - 5:
        if i % 16 == 0: T.add(gong(base / 4), t, .55, 0)
        if i % 4 == 2: T.add(gong(base / 2 * 1.498, 4), t, .18, -.2)
        T.add(metallophone(scale[pattern[i % 16]] * 2), t, .32, -.35)
        T.add(metallophone(scale[pattern[(i + 2) % 16]] * 2), t + beat / 2, .2, .35)
        mm = melody[i % 16]
        if mm is not None and i >= 8: T.add(metallophone(scale[mm], 4), t, .4, .1)
        t += beat; i += 1
    T.render(path, secs, 'Gamelan Lembut')

def petik_akustik(path):  # fingerpicked guitar G-Em-C-D
    bpm = 92; beat = 60 / bpm; secs = 70; T = Track(secs)
    chords = [[43, 47, 50, 55, 59, 67], [40, 47, 52, 55, 59, 64], [48, 52, 55, 60, 64, 67], [50, 54, 57, 62, 66, 69]]
    pick = [0, 3, 4, 5, 2, 4, 3, 4]
    t = 0.0; bar = 0
    while t < secs - 4:
        ch = chords[bar % 4]
        for k, s in enumerate(pick):
            nn = ch[s] if not (k == 0) else ch[0 if bar % 2 == 0 else 1]
            T.add(pluck(midi(nn), 2.8, .45 + .1 * (k == 0)), t + k * beat / 2 + 0.004 * rng.uniform(), .5 if k == 0 else .32, -.25 + .08 * s)
        if bar >= 4 and bar % 2 == 0:
            for k, nn in enumerate([ch[5] + 12, ch[4] + 12, ch[5] + 12]):
                T.add(pluck(midi(nn), 2.2, .7), t + (k * 1.5 + 2) * beat, .22, .4)
        t += 4 * beat; bar += 1
    T.render(path, secs, 'Petik Akustik')

def kecapi_suling(path):  # sundanese-flavoured pentatonic: plucked zither + bamboo flute
    bpm = 76; beat = 60 / bpm; secs = 74; T = Track(secs)
    sc = [62, 64, 67, 69, 71, 74, 76, 79, 81, 83]  # D pentatonic-ish
    ost = [0, 2, 4, 2, 5, 4, 2, 3]
    fl = [(5, 2), (6, 1), (5, 1), (4, 2), (2, 2), (3, 1.5), (4, .5), (5, 2), (4, 2),
          (7, 2), (6, 1), (5, 1), (4, 3), (2, 1), (3, 2), (2, 2)]
    t = 0.0; i = 0
    while t < secs - 4:
        T.add(pluck(midi(sc[ost[i % 8]] - 12), 2.4, .65), t, .42, -.35)
        if i % 2 == 0: T.add(pluck(midi(sc[ost[(i + 3) % 8]]), 2.0, .7), t + beat / 2, .25, -.1)
        if i % 8 == 0: T.add(pluck(midi(50), 3.5, .3), t, .45, -.2)
        t += beat; i += 1
    t = 8 * beat; k = 0
    while t < secs - 6:
        n, d = fl[k % len(fl)]
        T.add(flute(midi(sc[n]), d * beat * 0.95), t, .5, .3)
        t += d * beat; k += 1
        if k % len(fl) == 0: t += 4 * beat
    T.render(path, secs, 'Kecapi Suling')

TRACKS = {'kotak-musik': kotak_musik, 'piano-senja': piano_senja, 'gamelan-lembut': gamelan_lembut,
          'petik-akustik': petik_akustik, 'kecapi-suling': kecapi_suling}
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in TRACKS.items():
        fn(os.path.join(OUT, name + '.mp3')); print('ok', name, flush=True)
