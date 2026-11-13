// Luật trò chơi cả lớp (bản chạy trong trình duyệt cho Chế độ thử).
// Bản Supabase dùng đúng luật này, viết bằng SQL trong supabase/schema.sql (máy chủ làm trọng tài).
export const ROUND_S = 20;            // mỗi lượt khoảng 20 giây
export const HACK_S = 10;             // 10 giây để phá mật mã
const BOX_POOL = [["crystal", 3], ["double", 2], ["shield", 2], ["wind", 1], ["hack", 3]];

const pickWeighted = (pool) => { const tot = pool.reduce((a, p) => a + p[1], 0); let r = Math.random() * tot; for (const [k, w] of pool) { if ((r -= w) < 0) return k; } return pool[0][0]; };
const shuffleIdx = n => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } if (n > 1 && a.every((v, i) => v === i)) [a[0], a[1]] = [a[1], a[0]]; return a; };

export function newRoom({ id, classId, kind, minutes, reviewOnly, questions, puzzles, qtime }) {
  return { id, class_id: classId, kind, qtime: qtime || ROUND_S, status: "lobby", created_at: Date.now(), started_at: null, duration: minutes * 60, review_only: !!reviewOnly || kind === "race",
    questions, puzzles: puzzles || [], players: {}, feed: [], stats: {} };
}
export function tick(room, now = Date.now()) {
  if (room.status === "play" && now >= room.started_at + room.duration * 1000) { room.status = "end"; room.ended_at = now; }
  return room;
}
export const roundOf = (room, now = Date.now()) => room.started_at ? Math.floor((now - room.started_at) / 1000 / ROUND_S) : -1;
export const roundLeft = (room, now = Date.now()) => room.started_at ? ROUND_S - ((now - room.started_at) / 1000 % ROUND_S) : ROUND_S;
export const timeLeft = (room, now = Date.now()) => room.started_at ? Math.max(0, room.started_at + room.duration * 1000 - now) / 1000 : room.duration;

export function join(room, sid, name) {
  if (!room.players[sid]) room.players[sid] = { name, crystals: 0, alt: 0, shield: false, hacked: 0, last_round: -1, last_gain: 0, box: null, hack: null, right: 0, wrong: 0, qi: 0, qs: room.started_at || Date.now() };
  return room.players[sid];
}
export function start(room, now = Date.now()) { room.status = "play"; room.started_at = now; Object.values(room.players).forEach(p => { p.qi = 0; p.qs = now; }); room.feed.push({ t: now, text: "Trò chơi bắt đầu!" }); }

// Mỗi em tự đi theo tốc độ của mình: câu hiện tại = p.qi, hết thời gian câu thì tự sang câu sau
const QT = room => (room.qtime || ROUND_S) * 1000;
function advance(room, p, now) { if (room.status !== "play") return; if (!p.qs) p.qs = now; while (now - p.qs >= QT(room)) { p.qs += QT(room); p.qi++; p.box = null; } }
// mỗi em bắt đầu ở một câu khác nhau (đỡ trùng, đỡ nhìn bài bạn); đi hết vòng mới lặp lại
const hashS = s => { let x = 7; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
const pq = (room, p) => { const n = room.questions.length; return ((p.qi + (p.off ??= hashS(p.name) % n)) % n + n) % n; };
function currentQ(room, now) { const r = roundOf(room, now); return { r, qi: ((r % room.questions.length) + room.questions.length) % room.questions.length }; }

export function answer(room, sid, round, choice, now = Date.now()) {
  tick(room, now);
  const me = room.players[sid]; if (!me) throw new Error("chua_vao");
  if (room.status !== "play") throw new Error("het_gio");
  advance(room, me, now);
  const r = me.qi, qi = pq(room, me);
  if (round !== r) throw new Error("het_luot");
  const q = room.questions[qi], correct = choice === q.correct;
  const st = room.stats[qi] ||= { right: 0, wrong: 0 }; correct ? st.right++ : st.wrong++;
  correct ? me.right++ : me.wrong++;
  me.last_round = r; let gain = 0;
  if (correct) {
    if (room.kind === "race") { const fast = now - me.qs < QT(room) * 0.4 ? 5 : 0; gain = 10 + fast; me.alt += gain; }
    else { gain = q.level === "vandung" ? 15 : 10; me.crystals += gain; me.box = [0, 1, 2].map(() => pickWeighted(room.review_only ? BOX_POOL.filter(b => b[0] !== "hack" && b[0] !== "wind") : BOX_POOL)); }
  }
  me.last_gain = gain; me.qi++; me.qs = now; // tự sang câu tiếp, không chờ các bạn
  return { correct, correctIndex: q.correct, explain: q.explain || "", gain, crystals: me.crystals, alt: me.alt, box: !!me.box };
}

export function pickBox(room, sid, idx, now = Date.now()) {
  const me = room.players[sid]; if (!me || !me.box) throw new Error("khong_co_hop");
  const all = me.box, kind = all[idx]; me.box = null;
  let amount = 0, hack = null;
  if (kind === "crystal") { amount = 5 + Math.floor(Math.random() * 8); me.crystals += amount; }
  else if (kind === "double") { amount = me.last_gain; me.crystals += amount; }
  else if (kind === "shield") { me.shield = true; }
  else if (kind === "wind") { amount = Math.min(me.crystals, Math.max(1, Math.ceil(me.crystals * 0.05))); me.crystals -= amount; }
  else if (kind === "hack") {
    const cands = Object.entries(room.players).filter(([id, p]) => id !== sid && p.hacked < 3);
    if (!cands.length || !room.puzzles.length) { amount = 8; me.crystals += amount; return { kind: "crystal", amount, crystals: me.crystals, all }; }
    const targets = cands.sort(() => Math.random() - 0.5).slice(0, 3).map(([id]) => id);
    const pz = Math.floor(Math.random() * room.puzzles.length), perm = shuffleIdx(room.puzzles[pz].items.length);
    me.hack = { targets, pz, perm, deadline: now + (HACK_S + 2) * 1000 };
    hack = hackView(room, me.hack);
  }
  return { kind, amount, crystals: me.crystals, all, hack };
}
export const hackView = (room, hk) => ({ targets: hk.targets.map(id => ({ id, name: room.players[id]?.name || "?" })), puzzle: { prompt: room.puzzles[hk.pz].prompt, items: hk.perm.map(i => room.puzzles[hk.pz].items[i]) }, deadline: hk.deadline });

// order: thứ tự học sinh xếp, là chỉ số theo danh sách đã xáo hiển thị
export function hack(room, sid, target, order, now = Date.now()) {
  const me = room.players[sid]; if (!me || !me.hack) throw new Error("khong_co_hack");
  const hk = me.hack; me.hack = null;
  const pz = room.puzzles[hk.pz];
  if (!hk.targets.includes(target)) throw new Error("sai_muc_tieu");
  const ok = now <= hk.deadline && Array.isArray(order) && order.length === pz.items.length && order.every((d, k) => hk.perm[d] === k);
  if (!ok) return { ok: false, explain: pz.explain, answer: pz.items, crystals: me.crystals };
  const t = room.players[target];
  if (t.shield) { t.shield = false; room.feed.push({ t: now, text: "Một khiên bông vừa chặn được một lần đột nhập!" }); return { ok: true, blocked: true, explain: pz.explain, crystals: me.crystals }; }
  const stolen = Math.min(25, Math.floor(t.crystals * 0.2));
  t.crystals -= stolen; t.hacked++; me.crystals += stolen;
  room.feed.push({ t: now, text: "Một két vừa bị đột nhập!" });
  return { ok: true, stolen, crystals: me.crystals, explain: pz.explain };
}

export function mineView(room, sid, now = Date.now()) {
  tick(room, now);
  const me = room.players[sid] || null;
  if (me && me.hack && now > me.hack.deadline) me.hack = null; // hết 10 giây thì bỏ lượt hack
  if (me && !me.box && !me.hack) advance(room, me, now);
  const r = me ? me.qi : 0, q = room.questions[me ? pq(room, me) : 0], left = me && room.started_at ? Math.max(0, (QT(room) - (now - me.qs)) / 1000) : room.qtime || ROUND_S;
  return {
    room: { id: room.id, kind: room.kind, status: room.status, review_only: room.review_only, round: r, roundLeft: left, qtime: room.qtime || ROUND_S, timeLeft: timeLeft(room, now), players: Object.keys(room.players).length },
    q: room.status === "play" ? { prompt: q.prompt, options: q.options, level: q.level, round: r } : null,
    me: me && { name: me.name, crystals: me.crystals, alt: me.alt, shield: me.shield, hacked: me.hacked, answered: false, box: me.box ? me.box.length : 0, hack: me.hack ? hackView(room, me.hack) : null },
    top: room.status === "end" ? board(room).slice(0, 3) : null,
  };
}
export function board(room) {
  return Object.entries(room.players).map(([id, p]) => ({ id, name: p.name, crystals: p.crystals, alt: p.alt, shield: p.shield, hacked: p.hacked, right: p.right, wrong: p.wrong, done: p.qi || 0 }))
    .sort((a, b) => room.kind === "race" ? b.alt - a.alt : b.crystals - a.crystals);
}
export function teacherView(room, now = Date.now()) {
  tick(room, now);
  const r = 0, q = null, answered = 0;
  const missed = Object.entries(room.stats).map(([i, s]) => ({ prompt: room.questions[i]?.prompt, wrong: s.wrong, right: s.right })).filter(x => x.wrong > 0).sort((a, b) => b.wrong - a.wrong).slice(0, 3);
  return { room: { id: room.id, kind: room.kind, status: room.status, review_only: room.review_only, round: r, roundLeft: roundLeft(room, now), timeLeft: timeLeft(room, now), duration: room.duration },
    q: null, qtime: room.qtime || ROUND_S,
    players: board(room), feed: room.feed.slice(-12).reverse(), missed };
}

// bạn ảo trong Chế độ thử
export function botsAct(room, now = Date.now()) {
  if (room.status !== "play") return;
  Object.entries(room.players).forEach(([id, p]) => {
    if (!id.startsWith("bot-") || Math.random() > 0.3) return;
    advance(room, p, now); const q = room.questions[pq(room, p)];
    try { const res = answer(room, id, p.qi, Math.random() < 0.65 ? q.correct : (q.correct + 1) % q.options.length, now); if (res.box) { const b = pickBox(room, id, Math.floor(Math.random() * 3), now); if (b.hack) p.hack = null; } } catch {}
  });
}
