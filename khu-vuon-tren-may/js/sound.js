// Âm thanh hiệu ứng tổng hợp bằng Web Audio (không cần file nhạc, không lo bản quyền).
// Mỗi tiếng ngắn dưới 1 giây. Âm lượng về 5% mỗi lần đăng nhập.
let ctx = null, master = null;
let volume = 0.05, muted = false, classMuted = false;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ctx = new C(); master = ctx.createGain(); master.connect(ctx.destination); applyGain();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
function applyGain() { if (master) master.gain.value = (muted || classMuted) ? 0 : Math.min(1, volume * 6); }

export const sound = {
  get volume() { return volume; }, get muted() { return muted || classMuted; }, get classMuted() { return classMuted; },
  resetForLogin() { volume = 0.05; muted = false; applyGain(); },
  setVolume(v) { volume = v; applyGain(); },
  toggle() { muted = !muted; applyGain(); return !muted; },
  setClassMuted(v) { classMuted = !!v; applyGain(); },
  // Nhạc nền chill tự tạo (hợp âm êm + bass nhẹ + chuông lấp lánh), không lo bản quyền
  startBgm() { if (!bgmTimer) startBgm(); },
  stopBgm() { stopBgm(); },
  play(name) { if (muted || classMuted) return; const c = ac(); if (!c) return; try { (FX[name] || (() => {}))(c, c.currentTime); } catch {} },
};

function tone(c, t, freq, dur, { type = "sine", gain = 0.5, slideTo = null, attack = 0.005 } = {}) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(c, t, dur, { gain = 0.3, freq = 2000, q = 1, type = "bandpass" } = {}) {
  const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur);
}

const FX = {
  ting: (c, t) => { tone(c, t, 1318, 0.25, { gain: 0.4 }); tone(c, t + 0.09, 1760, 0.35, { gain: 0.35 }); },
  sai:  (c, t) => { tone(c, t, 392, 0.18, { type: "triangle", gain: 0.3 }); tone(c, t + 0.12, 330, 0.25, { type: "triangle", gain: 0.25 }); },
  bup:  (c, t) => { tone(c, t, 500, 0.18, { gain: 0.5, slideTo: 140 }); noise(c, t, 0.08, { gain: 0.15, freq: 900 }); },
  tach: (c, t) => { noise(c, t, 0.04, { gain: 0.4, freq: 3500, q: 4 }); noise(c, t + 0.12, 0.04, { gain: 0.35, freq: 3000, q: 4 }); },
  mua:  (c, t) => { for (let i = 0; i < 9; i++) noise(c, t + i * 0.08 + Math.random() * 0.04, 0.03, { gain: 0.2, freq: 2500 + Math.random() * 2500, q: 6 }); },
  xeo:  (c, t) => noise(c, t, 0.7, { gain: 0.18, freq: 6000, q: 0.6, type: "highpass" }),
  chuong: (c, t) => { tone(c, t, 1568, 0.8, { gain: 0.3 }); tone(c, t, 2349, 0.6, { gain: 0.12 }); },
  thuhoach: (c, t) => { [784, 988, 1175].forEach((f, i) => tone(c, t + i * 0.07, f, 0.22, { gain: 0.3 })); },
  reo:  (c, t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, t + i * 0.1, f, 0.3, { gain: 0.3, type: "triangle" })); },
  bam:  (c, t) => tone(c, t, 880, 0.06, { gain: 0.15 }),
};

let bgmTimer = null, bgmOut = null;
function startBgm() {
  const c = ac(); if (!c) return;
  bgmOut = c.createGain(); bgmOut.gain.setValueAtTime(0.0001, c.currentTime); bgmOut.gain.linearRampToValueAtTime(0.55, c.currentTime + 3);
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1600;
  const dl = c.createDelay(); dl.delayTime.value = 0.42; const fb = c.createGain(); fb.gain.value = 0.3; const wet = c.createGain(); wet.gain.value = 0.32;
  lp.connect(bgmOut); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(bgmOut); bgmOut.connect(master);
  const beat = 60 / 70, chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  const note = (m, t, d, type, g, att) => { const o = c.createOscillator(), gg = c.createGain(); o.type = type; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(g, t + att); gg.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(gg); gg.connect(lp); o.start(t); o.stop(t + d + 0.05); };
  let bar = 0, next = c.currentTime + 0.2;
  const sched = () => {
    if (c.state !== "running") { next = c.currentTime + 0.2; return; }
    while (next < c.currentTime + 1.6) {
      const ch = chords[bar % 4];
      ch.forEach(m => note(m, next, beat * 4.3, "triangle", 0.04, 1));
      note(ch[0] - 12, next, beat * 1.9, "sine", 0.1, 0.03); note(ch[0] - 12, next + beat * 2, beat * 1.9, "sine", 0.08, 0.03);
      for (let i = 0; i < 8; i++) if (Math.random() < 0.45) note(ch[(Math.random() * 4) | 0] + 12, next + i * beat / 2 + 0.02, 1, "sine", 0.045, 0.005);
      next += beat * 4; bar++;
    }
  };
  sched(); bgmTimer = setInterval(sched, 500);
}
function stopBgm() {
  clearInterval(bgmTimer); bgmTimer = null;
  if (bgmOut && ctx) { const g = bgmOut; g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8); setTimeout(() => g.disconnect(), 1000); }
  bgmOut = null;
}
