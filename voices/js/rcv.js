// 🔔 Rung chuông vàng liên lớp: nhiều lớp cùng thi một lúc, trả lời sai bị loại, cô điều khiển từng câu và có quyền cứu trợ.
import { h, btn, toast, modal } from "./ui.js";
import { sound } from "./sound.js";
import { sheet } from "./shell.js";
import { api, friendlyError } from "./api.js";
import { ST, totalSeeds, addDrops, commit } from "./student.js";
const L = "ABCD";
const bars = cls => h("div", { class: "rcv-cls" }, cls.map(c => h("div", { class: "rcv-c" }, h("b", {}, "Lớp " + c.name), h("div", { class: "boss-hp" }, h("i", { style: { width: c.total ? c.alive / c.total * 100 + "%" : "0", background: "linear-gradient(90deg,#ffd23f,#ff9a4a)" } })), h("span", { class: "small" }, `${c.alive}/${c.total} còn trên sàn`))));

// ---------------- màn chiếu của cô ----------------
export function rcvProjector(roomId, onClose) {
  const box = h("div", { class: "rcv" }); let alive = true, lastPhase = "", tick = -1;
  const m = modal(box, { wide: true, onClose: () => { alive = false; sound.game(false); sound.stopBgm(); onClose && onClose(); } }); m.box.classList.add("modal-tv"); sound.game(true);
  const act = a => api.rcvControl(roomId, a).then(poll).catch(e => toast(friendlyError(e), "bad"));
  async function poll() {
    if (!alive) return; let v; try { v = await api.rcvTeacherState(roomId); } catch (e) { box.replaceChildren(h("p", { class: "bad-text" }, friendlyError(e))); return; }
    if (v.phase !== lastPhase) { if (v.phase === "reveal") sound.play("chuong"); if (v.phase === "end") { sound.play("ken"); setTimeout(() => sound.play("votay"), 600); } lastPhase = v.phase; }
    if (v.phase === "ask") { const t = Math.ceil(v.timeLeft); if (t <= 5 && t > 0 && t !== tick) { tick = t; sound.play(t <= 2 ? "tac" : "tic"); } }
    const head = h("div", { class: "row-between" }, h("h1", { style: { margin: 0 } }, "🔔 Rung chuông vàng"), h("span", { class: "pill", style: { marginRight: "44px" } }, "Mã phòng: ", h("b", {}, v.code)));
    if (v.phase === "lobby") box.replaceChildren(head, h("p", { class: "lead" }, `Học sinh các lớp vào web là tự vào sàn đấu. Lớp của thầy cô khác: vào Trò chơi → Rung chuông vàng → nhập mã ${v.code}.`), bars(v.classes),
      h("div", { class: "actions center" }, btn("▶ Bắt đầu câu 1", () => act("next"), "btn btn-main btn-big"), btn("Hủy", () => act("end").then(() => m.close()), "btn btn-soft")));
    else if (v.phase === "end") { const best = v.classes.slice().sort((a, b) => b.alive - a.alive)[0];
      box.replaceChildren(head, h("h2", { class: "center" }, "🏆 Kết thúc!"), best ? h("p", { class: "lead center" }, `Lớp ${best.name} còn nhiều bạn trên sàn nhất (${best.alive})!`) : null, bars(v.classes),
        h("h3", {}, "🔔 Những bạn trụ lại đến cuối"), h("div", { class: "rcv-alive" }, v.alive.map(p => h("span", { class: "chip on" }, `${p.name} (${p.cls}) · ${p.right} câu`))), h("div", { class: "actions center" }, btn("Đóng", () => m.close(), "btn btn-main"))); }
    else { const q = v.q;
      box.replaceChildren(head, h("div", { class: "row-between" }, h("b", {}, `Câu ${v.qi + 1}/${v.total}`), v.phase === "ask" ? h("div", { class: "gm-clock" + (v.timeLeft < 6 ? " hurry" : "") }, Math.ceil(v.timeLeft) + "s") : h("b", {}, "📣 Đáp án")),
        h("div", { class: "card" }, h("div", { class: "gm-q" }, q.prompt), h("div", { class: "gm-opts" }, q.options.map((o, i) => h("div", { class: "gm-opt" + (v.phase === "reveal" && i === q.correct ? " ok" : "") }, h("b", {}, L[i] + ". "), o)))),
        bars(v.classes), h("div", { class: "actions center" },
          v.phase === "ask" ? btn("📣 Công bố đáp án", () => act("reveal"), "btn btn-main btn-big") : btn(v.qi + 1 >= v.total ? "🏁 Kết thúc" : "➡ Câu tiếp", () => act("next"), "btn btn-main btn-big"),
          btn("🛟 Cứu trợ (cả sàn quay lại)", () => act("revive"), "btn btn-soft"), btn("Kết thúc sớm", () => act("end"), "btn btn-soft")),
        v.phase === "reveal" ? h("div", { class: "rcv-alive" }, v.alive.slice(0, 40).map(p => h("span", { class: "chip" }, `${p.name} · ${p.cls}`))) : null);
      if (v.phase === "ask" && v.timeLeft <= 0) act("reveal"); }
    setTimeout(poll, document.hidden ? 4000 : 1500);
  }
  poll();
}

// ---------------- học sinh ----------------
export function rcvScreen() {
  const body = h("div", { class: "gm rcv" }); let busy = false, lastKey = "", tick = -1, timer, seen = false;
  sound.game(true);
  async function poll() {
    if (body.isConnected) seen = true; else { if (seen) { clearInterval(timer); sound.game(false); } return; }
    if (busy) return; let v; try { v = await api.rcvState(); } catch { return; }
    if (!v) return body.replaceChildren(h("div", { class: "card center" }, h("h2", {}, "🔔 Chưa có trận Rung chuông vàng"), btn("Về vương quốc", () => location.hash = "#/may", "btn btn-main")));
    const me = v.me || {}, key = v.phase + v.qi + me.choice + me.alive;
    if (v.phase === "ask") { const t = Math.ceil(v.timeLeft); if (t <= 5 && t > 0 && t !== tick) { tick = t; sound.play(t <= 2 ? "tac" : "tic"); } }
    const clock = v.phase === "ask" ? h("div", { class: "gm-clock" + (v.timeLeft < 6 ? " hurry" : "") }, Math.ceil(v.timeLeft) + "s") : null;
    if (key === lastKey && v.phase !== "ask") return; if (key !== lastKey && v.phase === "reveal") sound.play(me.alive ? "len" : "oi");
    lastKey = key;
    const top = h("div", { class: "row-between" }, h("b", {}, v.phase === "lobby" ? "Sàn đấu đang mở" : `Câu ${v.qi + 1}/${v.total}`), clock, h("span", { class: "pill" }, me.alive ? "🔔 Em còn trên sàn" : "👀 Em đang xem"));
    if (v.phase === "lobby") return body.replaceChildren(top, h("div", { class: "card center" }, h("h2", {}, "🔔 Rung chuông vàng liên lớp"), h("p", { class: "lead" }, "Trả lời sai là rời sàn. Bạn trụ lại đến cuối sẽ rung chuông vàng!"), bars(v.classes), h("p", {}, "⏳ Chờ cô bắt đầu…")));
    if (v.phase === "end") { const win = me.alive; if (win && !(ST.state.rcvWin ||= []).includes(v.id)) { ST.state.rcvWin.push(v.id); addDrops(20); commit(); toast("🔔 Em trụ đến cuối! +20💧", "ok", 5000); }
      return body.replaceChildren(top, h("div", { class: "card center" }, h("div", { class: "mg-big" }, win ? "🔔🏆" : "👏"), h("h2", {}, win ? "Em đã rung chuông vàng!" : "Trận đấu kết thúc"), bars(v.classes), btn("Về vương quốc", () => location.hash = "#/may", "btn btn-main"))); }
    const q = v.q; if (!q) return;
    const opts = q.options.map((o, i) => h("button", { class: "gm-opt" + (me.choice === i ? " picked" : "") + (v.phase === "reveal" && i === q.correct ? " ok" : "") + (v.phase === "reveal" && me.choice === i && i !== q.correct ? " bad" : ""),
      disabled: v.phase !== "ask" || !me.alive || me.choice != null, onclick: async () => { busy = true; try { await api.rcvAnswer(v.qi, i); sound.play("bam"); } catch (e) { toast(friendlyError(e)); } busy = false; lastKey = ""; poll(); } }, h("b", {}, L[i] + ". "), o));
    body.replaceChildren(top, h("div", { class: "card" }, h("div", { class: "gm-q" }, q.prompt), h("div", { class: "gm-opts" }, opts),
      v.phase === "reveal" ? h("p", { class: "lead center" }, me.alive ? "✅ Chính xác! Em vẫn trên sàn." : me.choice == null && v.qi >= 0 ? "Em đang xem các bạn thi đấu." : "❌ Rất tiếc, em đã rời sàn. Chờ cô cứu trợ nhé!")
        : me.choice != null ? h("p", { class: "center" }, "Đã chốt đáp án " + L[me.choice] + ". Chờ cô công bố…") : !me.alive ? h("p", { class: "center muted" }, "Em đang xem, chờ cô cứu trợ để vào lại sàn.") : null), bars(v.classes));
  }
  timer = setInterval(() => { if (!document.hidden) poll(); }, 1500); setTimeout(poll, 50);
  return sheet({ seeds: totalSeeds(), title: "Rung chuông vàng liên lớp", sub: "Trả lời sai là rời sàn · cô có thể cứu trợ · trụ đến cuối nhận +20💧", icon: "🔔", style: "game", back: null }, body);
}
