// Âm thanh tự tạo bằng Web Audio: không cần file nhạc, không lo bản quyền.
// Mỗi tiếng hiệu ứng ngắn dưới 1 giây. Âm lượng về 8% mỗi lần đăng nhập.
let ctx = null, master = null, fxBus = null, musicBus = null;
let volume = 0.08, muted = false, classMuted = false, gameOn = false, wantMood = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ctx = new C(); master = ctx.createGain(); master.connect(ctx.destination);
    fxBus = ctx.createGain(); fxBus.connect(master); musicBus = ctx.createGain(); musicBus.gain.value = 0.9; musicBus.connect(master);
    applyGain();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
// trong trò chơi cả lớp: vẫn có âm thanh dù cô tắt nhạc lớp, và to hơn một chút
function applyGain() { if (master) master.gain.value = (muted || (classMuted && !gameOn)) ? 0 : Math.min(1, Math.max(volume, gameOn ? 0.09 : 0) * 6); }
// mở khóa âm thanh ở lần chạm đầu tiên (chính sách tự phát của trình duyệt)
// iPad/iPhone chỉ cho mở âm thanh khi chạm xong (touchend/click), nên nghe nhiều sự kiện và phát 1 tiếng im lặng để "mở khóa"
function unlock() {
  const c = ac(); if (!c) return;
  try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch {}
  if (c.state !== "running") c.resume().catch(() => {});
  if (!bgm && wantMood) setMood(wantMood);
}
["pointerdown", "pointerup", "touchend", "click", "keydown"].forEach(ev => addEventListener(ev, unlock, { passive: true, capture: true }));
document.addEventListener("visibilitychange", () => { if (!document.hidden && ctx && ctx.state !== "running") ctx.resume().catch(() => {}); });

export const sound = {
  get volume() { return volume; }, get muted() { return muted || classMuted; }, get classMuted() { return classMuted; },
  resetForLogin() { volume = 0.08; muted = false; applyGain(); },
  setVolume(v) { volume = v; applyGain(); },
  toggle() { muted = !muted; applyGain(); return !muted; },
  setClassMuted(v) { classMuted = !!v; applyGain(); },
  startBgm(mood = "world") { wantMood = mood; if (!ac()) return; setMood(mood); },
  setMood(m) { if (wantMood || bgm) wantMood = m; if (bgm) setMood(m); },
  setTempo(mult) { tempoMult = mult; },
  stopBgm() { wantMood = null; stopBgm(); },
  game(on) { gameOn = !!on; applyGain(); if (on) { ac(); setMood("battle"); } },
  play(name) { if (muted || (classMuted && !gameOn)) return; const c = ac(); if (!c) return; try { (FX[name] || (() => {}))(c, c.currentTime); } catch {} },
};

function tone(c, t, freq, dur, { type = "sine", gain = 0.5, slideTo = null, attack = 0.005 } = {}) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(fxBus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(c, t, dur, { gain = 0.3, freq = 2000, q = 1, type = "bandpass" } = {}) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(fxBus); s.start(t); s.stop(t + dur);
}

const FX = {
  ting: (c, t) => { tone(c, t, 1318, 0.25, { gain: 0.4 }); tone(c, t + 0.09, 1760, 0.35, { gain: 0.35 }); },
  sai: (c, t) => { tone(c, t, 392, 0.18, { type: "triangle", gain: 0.3 }); tone(c, t + 0.12, 330, 0.25, { type: "triangle", gain: 0.25 }); },
  bup: (c, t) => { tone(c, t, 500, 0.18, { gain: 0.5, slideTo: 140 }); noise(c, t, 0.08, { gain: 0.15, freq: 900 }); },
  tach: (c, t) => { noise(c, t, 0.04, { gain: 0.4, freq: 3500, q: 4 }); noise(c, t + 0.12, 0.04, { gain: 0.35, freq: 3000, q: 4 }); },
  mua: (c, t) => { for (let i = 0; i < 9; i++) noise(c, t + i * 0.08 + Math.random() * 0.04, 0.03, { gain: 0.2, freq: 2500 + Math.random() * 2500, q: 6 }); },
  xeo: (c, t) => noise(c, t, 0.7, { gain: 0.18, freq: 6000, q: 0.6, type: "highpass" }),
  chuong: (c, t) => { tone(c, t, 1568, 0.8, { gain: 0.3 }); tone(c, t, 2349, 0.6, { gain: 0.12 }); },
  thuhoach: (c, t) => { [784, 988, 1175].forEach((f, i) => tone(c, t + i * 0.07, f, 0.22, { gain: 0.3 })); },
  reo: (c, t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, t + i * 0.1, f, 0.3, { gain: 0.3, type: "triangle" })); },
  bam: (c, t) => tone(c, t, 880, 0.06, { gain: 0.15 }),
  buoc: (c, t) => noise(c, t, 0.05, { gain: 0.08, freq: 500, q: 2 }),
  // trò chơi cả lớp
  cach: (c, t) => { noise(c, t, 0.05, { gain: 0.5, freq: 1800, q: 8 }); tone(c, t + 0.05, 220, 0.12, { type: "square", gain: 0.12 }); noise(c, t + 0.1, 0.04, { gain: 0.4, freq: 2600, q: 8 }); },
  tinhthe: (c, t) => { [2093, 2637, 3136].forEach((f, i) => tone(c, t + i * 0.06, f, 0.18, { gain: 0.18 })); },
  go: (c, t) => { for (let i = 0; i < 4; i++) noise(c, t + i * 0.07, 0.025, { gain: 0.3, freq: 4000 + Math.random() * 1500, q: 10 }); },
  baodong: (c, t) => { [0, 0.22].forEach(d => tone(c, t + d, 880, 0.18, { type: "square", gain: 0.12, slideTo: 660 })); },
  khien: (c, t) => { tone(c, t, 660, 0.4, { type: "triangle", gain: 0.25, slideTo: 990 }); },
  gio: (c, t) => noise(c, t, 0.6, { gain: 0.2, freq: 700, q: 0.7, type: "lowpass" }),
  ken: (c, t) => { [523, 659, 784, 1047].forEach((f, i) => tone(c, t + i * 0.13, f, i === 3 ? 0.7 : 0.16, { type: "sawtooth", gain: 0.12 })); },
  // âm thanh trò chơi cả lớp: đáng yêu + kịch tính
  len: (c, t) => { [72, 76, 79, 84, 88].forEach((n, i) => tone(c, t + i * 0.055, 440 * Math.pow(2, (n - 69) / 12), 0.16, { type: "square", gain: 0.16 })); tone(c, t + 0.3, 2093, 0.4, { type: "sine", gain: 0.2 }); },
  oi: (c, t) => { tone(c, t, 520, 0.18, { type: "triangle", gain: 0.35, slideTo: 300 }); tone(c, t + 0.17, 330, 0.28, { type: "triangle", gain: 0.3, slideTo: 180 }); },
  tic: (c, t) => { tone(c, t, 1250, 0.05, { type: "square", gain: 0.18 }); tone(c, t, 2500, 0.03, { type: "sine", gain: 0.1 }); },
  tac: (c, t) => { tone(c, t, 880, 0.12, { type: "square", gain: 0.25 }); tone(c, t + 0.06, 1760, 0.12, { type: "square", gain: 0.15 }); },
  top: (c, t) => { [[67, 0], [72, .12], [76, .24], [79, .36], [84, .52]].forEach(([n, d]) => tone(c, t + d, 440 * Math.pow(2, (n - 69) / 12), d > .5 ? 0.6 : 0.14, { type: "sawtooth", gain: 0.12 })); [84, 88, 91].forEach(n => tone(c, t + 0.52, 440 * Math.pow(2, (n - 69) / 12), 0.6, { type: "triangle", gain: 0.12 })); },
  pop: (c, t) => { tone(c, t, 600, 0.08, { type: "sine", gain: 0.25, slideTo: 1400 }); },
  batdau: (c, t) => { [0, 0.5, 1].forEach(d => tone(c, t + d, 660, 0.18, { type: "square", gain: 0.25 })); tone(c, t + 1.5, 1320, 0.6, { type: "square", gain: 0.3 }); },
  votay: (c, t) => { for (let i = 0; i < 26; i++) noise(c, t + Math.random() * 0.9, 0.03, { gain: 0.25, freq: 1500 + Math.random() * 2000, q: 1.5 }); },
};

// ---------------- nhạc nền chill (đổi theo khu) ----------------
const MOODS = {
  world: { bpm: 70, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], spark: 0.45, wave: "triangle" },
  garden: { bpm: 76, chords: [[55, 59, 62, 66], [52, 55, 59, 62], [48, 52, 55, 59], [50, 54, 57, 60]], spark: 0.55, wave: "triangle" },
  lab: { bpm: 84, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 64]], spark: 0.6, wave: "sine" },
  lesson: { bpm: 64, chords: [[48, 52, 55, 59], [45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53]], spark: 0.3, wave: "sine" },
  battle: { bpm: 150, chords: [[57, 60, 64, 69], [53, 57, 60, 65], [50, 53, 57, 62], [52, 56, 59, 64]], spark: 0.2, wave: "sawtooth" }, // trò chơi cả lớp: dồn dập, kịch tính
  game: { bpm: 112, chords: [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 56, 59, 64]], spark: 0.85, wave: "square" },
};
let bgm = null, tempoMult = 1;
function setMood(name) {
  const c = ac(); if (!c) return;
  const m = MOODS[name] || MOODS.world;
  if (bgm && bgm.mood === name) return;
  const old = bgm; if (old) { old.out.gain.linearRampToValueAtTime(0.0001, c.currentTime + 1.2); clearInterval(old.timer); setTimeout(() => old.out.disconnect(), 1500); }
  const out = c.createGain(); out.gain.setValueAtTime(0.0001, c.currentTime); out.gain.linearRampToValueAtTime(name === "battle" ? 0.85 : 0.55, c.currentTime + (name === "battle" ? 0.8 : 2.5));
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = name === "battle" ? 3400 : name === "game" ? 2600 : 1600;
  const dl = c.createDelay(); dl.delayTime.value = 0.42; const fb = c.createGain(); fb.gain.value = 0.3; const wet = c.createGain(); wet.gain.value = 0.3;
  lp.connect(out); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(out); out.connect(musicBus);
  const note = (mi, t, d, type, g, att) => { const o = c.createOscillator(), gg = c.createGain(); o.type = type; o.frequency.value = 440 * Math.pow(2, (mi - 69) / 12); gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(g, t + att); gg.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(gg); gg.connect(lp); o.start(t); o.stop(t + d + 0.05); };
  let bar = 0, next = c.currentTime + 0.2;
  const sched = () => {
    if (c.state !== "running") { next = c.currentTime + 0.2; return; }
    const beat = 60 / (m.bpm * (name === "game" || name === "battle" ? tempoMult : 1));
    while (next < c.currentTime + 1.6) {
      const ch = m.chords[bar % 4];
      if (name === "battle") { // nhạc thi đấu: trống 4/4, snare, hi-hat 16, bass chạy, giai điệu arpeggio, đoạn dồn cuối khổ
        const kick = (t, g = 0.55) => { const k = c.createOscillator(), kg = c.createGain(); k.type = "sine"; k.frequency.setValueAtTime(160, t); k.frequency.exponentialRampToValueAtTime(40, t + 0.14); kg.gain.setValueAtTime(g, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.22); k.connect(kg); kg.connect(out); k.start(t); k.stop(t + 0.25); };
        const snare = (t, g = 0.22) => { const len = Math.floor(c.sampleRate * 0.16), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
          const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800; const g2 = c.createGain(); g2.gain.value = g; s.connect(f); f.connect(g2); g2.connect(out); s.start(t);
          note(55, t, 0.08, "triangle", 0.06, 0.002); };
        const ARP = [[0, 2, 1, 3, 2, 1, 3, 2], [3, 2, 1, 0, 1, 2, 3, 1], [0, 1, 2, 3, 3, 2, 1, 0], [2, 3, 1, 2, 0, 2, 3, 1]][bar % 4], fill = bar % 4 === 3;
        for (let i = 0; i < 4; i++) kick(next + i * beat);
        if (bar % 2) kick(next + 3.5 * beat, 0.35);
        snare(next + beat); snare(next + 3 * beat);
        if (fill) for (let i = 0; i < 6; i++) snare(next + 3 * beat + i * beat / 6, 0.12 + i * 0.03);
        for (let i = 0; i < 16; i++) noiseHat(c, next + i * beat / 4, out, i % 4 === 2 ? 0.09 : 0.045);
        for (let i = 0; i < 8; i++) { const t = next + i * beat / 2; note(ch[0] - 24 + (i % 2 ? 12 : 0), t, beat / 2.1, "sawtooth", 0.075, 0.004); }
        for (let i = 0; i < 8; i++) note(ch[ARP[i]] + 12, next + i * beat / 2, beat / 2.4, "square", 0.035, 0.004);
        [0, 1.5, 2.5].forEach(b => ch.slice(1).forEach(n => note(n, next + b * beat, beat * 0.3, "sawtooth", 0.022, 0.003)));
        if (fill) { const o2 = c.createOscillator(), g3 = c.createGain(); o2.type = "sawtooth"; o2.frequency.setValueAtTime(220, next); o2.frequency.exponentialRampToValueAtTime(880, next + beat * 4); g3.gain.setValueAtTime(0.0001, next); g3.gain.linearRampToValueAtTime(0.03, next + beat * 3.8); g3.gain.linearRampToValueAtTime(0.0001, next + beat * 4); o2.connect(g3); g3.connect(lp); o2.start(next); o2.stop(next + beat * 4); }
        next += beat * 4; bar++; continue;
      }
      ch.forEach(n => note(n, next, beat * 4.3, name === "game" ? "triangle" : m.wave, name === "game" ? 0.03 : 0.04, name === "game" ? 0.05 : 1));
      note(ch[0] - 12, next, beat * 1.9, "sine", 0.1, 0.03); note(ch[0] - 12, next + beat * 2, beat * 1.9, "sine", 0.08, 0.03);
      if (name === "game") for (let i = 0; i < 4; i++) noiseHat(c, next + i * beat, lp);
      for (let i = 0; i < 8; i++) if (Math.random() < m.spark) note(ch[(Math.random() * 4) | 0] + 12, next + i * beat / 2 + 0.02, 1, "sine", 0.045, 0.005);
      next += beat * 4; bar++;
    }
  };
  sched();
  bgm = { mood: name, out, timer: setInterval(sched, 400) };
}
function noiseHat(c, t, dest, gv = 0.05) {
  const len = Math.floor(c.sampleRate * 0.03), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
  const g = c.createGain(); g.gain.setValueAtTime(gv, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + 0.04);
}
function stopBgm() {
  if (!bgm || !ctx) return; const b = bgm; bgm = null; clearInterval(b.timer);
  b.out.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8); setTimeout(() => b.out.disconnect(), 1000);
}
