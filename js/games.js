// Trò chơi cả lớp: Hack Mật Mã Mây và Đua khinh khí cầu (Giai đoạn 8).
// Máy chủ làm trọng tài: học sinh và màn chiếu chỉ hỏi trạng thái mỗi giây, thầy cô tải lại trang không hỏng ván.
import { api, friendlyError } from "./api.js";
import { h, btn, toast, modal, burst, shuffle } from "./ui.js";
import { sound } from "./sound.js";
import { loadMap, loadLesson } from "./content.js";
import { sheet } from "./shell.js";

const BOX = { crystal: ["💎", "Tinh thể"], double: ["✖️2", "Nhân đôi"], shield: ["🛡️", "Khiên bông"], wind: ["🌬️", "Gió cuốn nhẹ"], hack: ["🔓", "Hack"] };
const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ---------------- câu hỏi cho trò chơi (chỉ dùng câu trắc nghiệm) ----------------
export async function gameQuestions(lessonIds, sets = []) {
  const out = [];
  for (const id of lessonIds) {
    const L = await loadLesson(id); if (!L) continue;
    L.seeds.forEach(s => s.questions.filter(q => q.type === "mcq").forEach(q => {
      const opts = q.fixed ? q.options.map((o, i) => ({ ...o, i })) : shuffle(q.options.map((o, i) => ({ ...o, i })));
      out.push({ prompt: q.prompt, options: opts.map(o => o.text), correct: opts.findIndex(o => o.correct), explain: q.explain, level: q.level });
    }));
  }
  try { const sb = (await (await fetch("data/sbt.json")).json()).lessons || {}; lessonIds.forEach(id => (sb[id] || []).filter(q => q.type === "mcq").forEach(q => {
    const opts = q.fixed ? q.options.map((o, i) => ({ ...o, i })) : shuffle(q.options.map((o, i) => ({ ...o, i }))); out.push({ prompt: q.prompt, options: opts.map(o => o.text), correct: opts.findIndex(o => o.correct), explain: q.explain, level: q.level || "biet" }); })); } catch {}
  sets.forEach(st => (st.questions || []).filter(q => q.type !== "essay").forEach(q => out.push({ prompt: q.prompt, options: q.options, correct: q.correct, explain: q.explain || "", level: q.level || "hieu" })));
  return shuffle(out);
}
export async function gamePuzzles(lessonIds) {
  const all = (await fetch("data/puzzles.json", { cache: "no-cache" }).then(r => r.json())).puzzles;
  const mine = all.filter(p => lessonIds.includes(p.lesson));
  return (mine.length >= 3 ? mine : all).map(p => ({ prompt: p.prompt, items: p.items, explain: p.explain }));
}

// ================================================================== học sinh
export function studentGameScreen() {
  const body = h("div", { class: "gm" });
  let last = null, busy = false, myPrev = null, timer = null, endedShown = false, seen = false; const born = Date.now();
  sound.game(true); let tickR = -1, prevRank = null;
  async function poll() {
    if (!document.body.contains(body)) { if (!seen && Date.now() - born < 8000) return; clearInterval(timer); sound.setTempo(1); sound.game(false); sound.setMood("world"); return; }
    seen = true;
    if (busy) return;
    let v; try { v = await api.gameMine(); } catch (e) { return; }
    render(v);
  }
  function render(v) {
    if (!v || !v.room) { body.replaceChildren(h("div", { class: "card center" }, h("div", { class: "big-ic" }, "🎮"), h("h2", {}, "Chưa có trò chơi nào"), h("p", { class: "lead" }, "Khi cô mở phòng Hack Mật Mã Mây hoặc Đua khinh khí cầu, em sẽ tự vào phòng trong vài giây."))); return; }
    const { room, q, me } = v;
    if (me && myPrev != null && room.kind === "hack" && me.crystals < myPrev - 0) { sound.play("baodong"); toast("Ối! Két của em vừa bị đột nhập!", "bad"); }
    if (me) myPrev = me.crystals;
    if (room.status === "lobby") { last = null; body.replaceChildren(h("div", { class: "card center" }, h("div", { class: "big-ic" }, room.kind === "race" ? "🎈" : "🔐"), h("h2", {}, "Em đã vào phòng " + (room.kind === "race" ? "Đua khinh khí cầu" : "Hack Mật Mã Mây") + "!"), h("p", { class: "lead" }, `Có ${room.players} bạn trong phòng. Chờ cô bấm Bắt đầu nhé…`))); return; }
    if (room.status === "end") {
      if (endedShown) return; endedShown = true; sound.setTempo(1); sound.play("ken"); setTimeout(() => sound.play("votay"), 600);
      body.replaceChildren(h("div", { class: "card center" }, h("h1", {}, "Hết giờ!"), podium(v.top || [], room.kind),
        me ? h("p", { class: "lead" }, room.kind === "race" ? `Khinh khí cầu của em bay cao ${me.alt} mét.` : `Két của em có ${me.crystals} tinh thể.`) : null,
        h("p", { class: "small muted" }, "Điểm trò chơi lưu riêng, không tính vào hạt giống hay bài kiểm tra."), btn("Về vương quốc", () => location.hash = "#/may", "btn btn-main")));
      return;
    }
    sound.setTempo(room.timeLeft < 30 ? 1.35 : 1);
    const head = h("div", { class: "gm-top" },
      h("div", { class: "gm-clock" + (room.timeLeft < 30 ? " hurry" : "") }, fmtT(room.timeLeft)),
      me ? h("div", { class: "gm-safe" }, h("span", { class: "s-ic" }, room.kind === "race" ? "🎈" : "🔐"), h("div", {}, h("small", {}, room.kind === "race" ? "Độ cao" : "Két Mây của em"), h("b", {}, room.kind === "race" ? `${me.alt} m` : `${me.crystals} 💎`)), me.shield ? h("span", { class: "tag" }, "🛡️ có khiên") : null) : null,
      h("span", { class: "pill" }, `Câu ${room.round + 1} · còn ${Math.ceil(room.roundLeft)} giây`));
    // đếm ngược 5 giây cuối mỗi câu và khi lên hạng
    const rl = Math.ceil(room.roundLeft); if (rl <= 5 && rl > 0 && rl !== tickR && !(last && last.round === room.round)) { tickR = rl; sound.play(rl <= 2 ? "tac" : "tic"); }
    if (me && me.rank) { if (prevRank && me.rank < prevRank && me.rank <= 3) sound.play("top"); prevRank = me.rank; }
    if (me && me.hack) return hackView(v, head);
    if (me && me.box) return boxView(v, head);
    const key = room.round;
    if (last && last.round === key) { // đã trả lời: giữ nguyên kết quả, chỉ cập nhật đồng hồ
      body.replaceChildren(head, last.el); return;
    }
    if (me && me.answered) { body.replaceChildren(head, h("div", { class: "card center" }, h("h2", {}, "Chờ câu tiếp theo…"), h("p", { class: "lead" }, "Em đã trả lời lượt này rồi."))); return; }
    if (!q) return;
    const optBtns = q.options.map((o, i) => h("button", { class: "gm-opt", onclick: () => answer(room, q, i, optBtns) }, o));
    body.replaceChildren(head, h("div", { class: "card" }, h("span", { class: `tag tag-${q.level}` }, q.level === "vandung" ? "Vận dụng · ×1,5" : q.level === "hieu" ? "Hiểu" : "Biết"), h("div", { class: "gm-q" }, q.prompt), h("div", { class: "gm-opts" }, optBtns)));
  }
  async function answer(room, q, i, optBtns) {
    busy = true; optBtns.forEach(b => b.disabled = true); optBtns[i].classList.add("picked"); let wait = 350;
    try {
      const r = await api.gameAnswer(room.id, q.round, i);
      if (r.correct) { sound.play("len"); setTimeout(() => sound.play("tinhthe"), 250); const b = optBtns[i].getBoundingClientRect(); burst(b.left + b.width / 2, b.top, "crystal", 10); } else sound.play("oi");
      const el = h("div", { class: "card " + (r.correct ? "" : "") },
        h("div", { class: "feedback " + (r.correct ? "fb-ok" : "fb-bad") }, h("b", {}, r.correct ? (room.kind === "race" ? `Đúng! Khinh khí cầu bay lên ${r.gain} m 🎈` : `Đúng! +${r.gain} tinh thể 💎`) : "Chưa đúng, không mất gì cả. "),
          r.correct ? null : h("div", {}, "Đáp án: ", h("b", {}, q.options[r.correctIndex])), h("p", {}, r.explain)),
        r.box ? h("p", { class: "lead center" }, "Em được chọn 1 trong 3 hộp quà mây!") : h("p", { class: "small muted center" }, "Sang câu tiếp…"));
      last = { round: q.round, el }; body.querySelector(".card:last-child")?.replaceWith(el); if (!r.correct) wait = 1100;
    } catch (e) { toast(friendlyError(e)); }
    setTimeout(() => { busy = false; last = null; poll(); }, wait);
  }
  function boxView(v, head) {
    const boxes = [0, 1, 2].map(i => h("button", { class: "gm-box", "aria-label": "Hộp quà " + (i + 1), onclick: async () => {
      busy = true; boxes.forEach(b => b.disabled = true); sound.play("cach");
      try {
        const r = await api.gamePickBox(v.room.id, i);
        boxes.forEach((b, k) => { b.textContent = BOX[r.all[k]][0]; b.style.opacity = k === i ? 1 : 0.45; });
        sound.play(r.kind === "shield" ? "khien" : r.kind === "wind" ? "gio" : r.kind === "hack" ? "go" : "tinhthe");
        toast({ crystal: `+${r.amount} tinh thể!`, double: `Nhân đôi: +${r.amount} tinh thể!`, shield: "Khiên bông chặn được 1 lần bị hack!", wind: `Gió cuốn nhẹ mất ${r.amount} tinh thể`, hack: "Hack! Chọn một két để phá mật mã!" }[r.kind], r.kind === "wind" ? "bad" : "ok");
        last = { round: v.room.round, el: h("div", { class: "card center" }, h("h2", {}, BOX[r.kind][0] + " " + BOX[r.kind][1]), h("p", { class: "small muted" }, "Chờ câu tiếp theo…")) };
      } catch (e) { toast(friendlyError(e)); }
      setTimeout(() => { busy = false; poll(); }, 900);
    } }, "🎁"));
    body.replaceChildren(head, h("div", { class: "card center" }, h("h2", {}, "Chọn 1 hộp quà mây"), h("p", { class: "small muted" }, v.room.review_only ? "Có thể là: tinh thể, nhân đôi, khiên bông." : "Có thể là: tinh thể, nhân đôi, khiên bông, gió cuốn nhẹ hoặc Hack!"), h("div", { class: "gm-boxes" }, boxes)));
  }
  function hackView(v, head) {
    const hk = v.me.hack; let target = null; const order = [];
    const left = h("b", {}), tgtBtns = hk.targets.map(t => h("button", { class: "gm-target", onclick: () => { target = t.id; tgtBtns.forEach(b => b.classList.toggle("chip", false)); tgtBtns.forEach(b => b.style.outline = b === tgtBtns[hk.targets.indexOf(t)] ? "4px solid #9c7cff" : ""); sound.play("go"); } }, "🔐 " + t.name));
    const items = hk.puzzle.items.map((it, d) => h("button", { onclick: () => { if (order.includes(d)) return; order.push(d); items[d].classList.add("set"); items[d].querySelector("i").textContent = order.length; sound.play("go"); } }, h("i", {}, "?"), it));
    const send = btn("🔓 Phá mật mã", async () => {
      if (!target) return toast("Chọn một két trước đã!");
      if (order.length < items.length) return toast("Xếp đủ các thẻ theo thứ tự nhé!");
      busy = true; send.disabled = true;
      try {
        const r = await api.gameHack(v.room.id, target, order);
        if (r.ok && r.blocked) { sound.play("khien"); toast("Két có khiên bông! Lần này không lấy được, nhưng em đã giải đúng.", "ok"); }
        else if (r.ok) { sound.play("cach"); setTimeout(() => sound.play("tinhthe"), 200); toast(`Mở két thành công! +${r.stolen} tinh thể`, "ok"); }
        else { sound.play("sai"); toast("Chưa đúng mật mã. Không mất gì cả!"); }
        last = { round: v.room.round, el: h("div", { class: "card" }, h("div", { class: "feedback fb-info" }, h("b", {}, "Mật mã: "), r.answer ? r.answer.join(" → ") : "", h("p", {}, r.explain))) };
      } catch (e) { toast(friendlyError(e)); }
      busy = false; poll();
    }, "btn btn-main btn-big");
    const reset = btn("Xếp lại", () => { order.length = 0; items.forEach(b => { b.classList.remove("set"); b.querySelector("i").textContent = "?"; }); }, "btn btn-soft");
    body.replaceChildren(head, h("div", { class: "card" }, h("h2", {}, "🔓 Phá mật mã két bạn"), h("p", { class: "small muted" }, "Máy đã chọn ngẫu nhiên 3 két. Chọn một két rồi xếp các thẻ đúng thứ tự trong 10 giây."),
      h("div", { class: "gm-targets" }, tgtBtns), h("h3", {}, hk.puzzle.prompt), h("div", { class: "gm-order" }, items), h("div", { class: "actions" }, send, reset, h("span", { class: "pill" }, "⏱ ", left))));
    const tk = setInterval(() => { const s = Math.max(0, Math.ceil((hk.deadline - Date.now()) / 1000) - 2); left.textContent = s + " giây"; if (!document.body.contains(left)) clearInterval(tk); }, 250);
    busy = true; setTimeout(() => { busy = false; }, 12000); // giữ màn phá mật mã cho đến khi gửi hoặc hết giờ
  }
  timer = setInterval(() => { if (!document.hidden) poll(); }, 1500); setTimeout(poll, 50);
  return sheet({ title: "Trò chơi cả lớp", sub: "Trả lời đúng để đầy két, mở hộp quà, phá mật mã! · Chỉ cô mới kết thúc được trò chơi", icon: "🎮", style: "game", back: null }, body);
}

export function podium(top, kind) {
  const p = [top[1], top[0], top[2]];
  return h("div", { class: "podium" }, p.map((x, i) => x ? h("div", { class: ["p2", "p1", "p3"][i] }, h("div", {}, x.name), h("div", { class: "small muted" }, kind === "race" ? `${x.alt} m` : `${x.crystals} 💎`), h("div", { class: "pd" }, [2, 1, 3][i])) : h("div")));
}

// ================================================================== màn chiếu của thầy cô
export function projector(roomId, onClose) {
  const box = h("div", { class: "gm" }); let alive = true, ended = false, prevFeed = "";
  const m = modal(box, { wide: true, onClose: () => { alive = false; sound.setTempo(1); sound.game(false); sound.stopBgm(); onClose && onClose(); } });
  m.box.classList.add("modal-tv");
  const mus = h("button", { class: "btn btn-soft mus-btn", onclick: () => { const on = sound.toggle(); mus.textContent = on ? "🔊 Nhạc: bật" : "🔇 Nhạc: tắt"; if (on) sound.game(true); } }, sound.muted ? "🔇 Nhạc: tắt" : "🔊 Nhạc: bật"); m.box.append(mus);
  sound.game(true); let prevLead = "", prevDone = -1, tickT = -1;
  async function poll() {
    if (!alive) return;
    let v; try { v = await api.gameState(roomId); } catch (e) { box.replaceChildren(h("p", { class: "bad-text" }, friendlyError(e))); return setTimeout(poll, 2000); }
    draw(v); setTimeout(poll, document.hidden ? 4000 : 1500);
  }
  function draw(v) {
    const { room, q, players, feed, missed } = v;
    const top = feed[0] ? feed[0].text + feed[0].t : ""; if (top && top !== prevFeed && prevFeed && /đột nhập/.test(top)) sound.play("baodong"); prevFeed = top;
    const kindName = room.kind === "race" ? "Đua khinh khí cầu" : "Hack Mật Mã Mây";
    if (room.status === "lobby") {
      box.replaceChildren(h("h1", { class: "center" }, (room.kind === "race" ? "🎈 " : "🔐 ") + kindName),
        h("p", { class: "lead center" }, "Học sinh mở web, vào vương quốc mây là tự vào phòng sau vài giây."),
        h("div", { class: "gm-board" }, players.map((p, i) => h("div", { class: "gm-row" }, h("span", { class: "rk" }, i + 1), h("span", {}, p.name), h("span", {}, "✓")))),
        h("div", { class: "actions center" }, btn("▶ Bắt đầu", async () => { await api.gameStart(roomId); sound.play("batdau"); }, "btn btn-main btn-big"), btn("Hủy phòng", async () => { await api.gameEnd(roomId); m.close(); }, "btn btn-soft")));
      return;
    }
    if (room.status === "end") {
      if (!ended) { ended = true; sound.setTempo(1); sound.play("ken"); setTimeout(() => sound.play("votay"), 700); }
      box.replaceChildren(h("h1", { class: "center" }, "🏆 Kết quả " + kindName), podium(players.slice(0, 3), room.kind),
        h("div", { class: "card" }, h("h2", {}, "3 câu cả lớp hay sai"), missed.length ? h("ol", {}, missed.map(x => h("li", {}, h("b", {}, x.prompt), h("span", { class: "small muted" }, ` · sai ${x.wrong}, đúng ${x.right}`)))) : h("p", { class: "muted" }, "Không có câu nào bị sai nhiều. Cả lớp giỏi quá!")),
        h("div", { class: "actions center" }, btn("Đóng", () => m.close(), "btn btn-main")));
      return;
    }
    sound.setTempo(room.timeLeft < 30 ? 1.35 : 1);
    { const lead = players[0]?.name || "", done = players.reduce((k, p) => k + (p.right || 0), 0), tl = Math.ceil(room.timeLeft);
      if (lead && prevLead && lead !== prevLead) sound.play("top"); else if (prevDone >= 0 && done > prevDone) sound.play("pop");
      if (tl <= 10 && tl > 0 && tl !== tickT) { tickT = tl; sound.play(tl <= 3 ? "tac" : "tic"); } prevLead = lead; prevDone = done; }
    const head = h("div", { class: "gm-top" }, h("div", { class: "gm-clock" + (room.timeLeft < 30 ? " hurry" : "") }, fmtT(room.timeLeft)), h("h2", { style: { margin: 0, flex: 1 } }, kindName),
      h("span", { class: "pill" }, `${players.length} bạn đang chơi · mỗi câu ${v.qtime || 20} giây`), btn("Kết thúc sớm", async () => { await api.gameEnd(roomId); }, "btn btn-soft btn-tiny"));
    const qcard = q ? h("div", { class: "card" }, h("div", { class: "gm-q" }, q.prompt), h("div", { class: "gm-opts" }, q.options.map(o => h("div", { class: "gm-opt" }, o))), h("p", { class: "small muted" }, `${q.answered}/${players.length} bạn đã trả lời`)) : null;
    if (room.kind === "race") {
      const maxAlt = Math.max(100, ...players.map(p => p.alt));
      box.replaceChildren(head, qcard, h("div", { class: "race" }, h("div", { class: "finish" }, "đỉnh mây"), players.slice(0, 12).map((p, i) => h("div", { class: "bln", style: { left: `${4 + i * 8}%`, bottom: `${8 + p.alt / maxAlt * 70}%` } }, h("span", {}, "🎈"), h("small", {}, p.name)))));
    } else {
      box.replaceChildren(head, h("div", { class: "two-col" }, qcard,
        h("div", { class: "card" }, h("h2", {}, "🏆 Bảng xếp hạng cả lớp"), h("div", { class: "gm-board" }, players.map((p, i) => h("div", { class: "gm-row" }, h("span", { class: "rk" }, i + 1), h("span", {}, p.name, p.shield ? " 🛡️" : ""), h("span", { class: "small muted" }, `${p.done || 0} câu · đúng ${p.right || 0}`), h("span", {}, p.crystals + " 💎")))),
          h("h3", {}, "Tin vương quốc"), h("div", { class: "gm-feed" }, feed.slice(0, 5).map(f => h("div", {}, f.text))))));
    }
  }
  poll();
}
