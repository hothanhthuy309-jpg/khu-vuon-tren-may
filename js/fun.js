// Vừa học vừa chơi: Thẻ chất hóa học (sưu tập), Nhiệm vụ hằng ngày + chuỗi ngày, Boss cả lớp.
// Các nơi khác báo sự kiện bằng: dispatchEvent(new CustomEvent("kvtm:track", { detail: "fish" }))
import { h, btn, toast, modal } from "./ui.js";
import { sound } from "./sound.js";
import { sheet } from "./shell.js";
import { api } from "./api.js";
import { gameQuestions } from "./games.js";
import { ill } from "./quiz.js";
import { ST, commit, flush, addDrops, totalSeeds } from "./student.js";

const S = (o, ...b) => sheet({ seeds: totalSeeds(), style: "game", ...o }, ...b);
const today = () => new Date().toISOString().slice(0, 10);

// ---------------- Thẻ chất hóa học ----------------
export const CARDS = [
  ["oxi", "💨", "Oxygen", 0, "Duy trì sự cháy và sự sống, chiếm khoảng 21% không khí."], ["nito", "🌬️", "Nitrogen", 0, "Chiếm khoảng 78% không khí, cung cấp đạm cho cây."],
  ["nuoc", "💧", "Nước", 0, "Sôi ở 100 °C, đông đặc ở 0 °C."], ["muoi", "🧂", "Muối ăn", 0, "Tan trong nước; cô cạn nước muối thu lại muối."],
  ["duong", "🍬", "Đường", 0, "Đun lâu hóa đen, có mùi khét: tính chất hóa học."], ["sat", "🔩", "Sắt", 1, "Để nơi ẩm lâu ngày bị gỉ thành chất màu nâu."],
  ["nhom", "🥫", "Nhôm", 1, "Nhẹ, dẫn điện, dẫn nhiệt tốt, làm nồi và lon nước."], ["co2", "🫧", "Carbon dioxide", 1, "Làm đục nước vôi trong; cây dùng để quang hợp."],
  ["davoi", "🪨", "Đá vôi", 1, "Sủi bọt với giấm; nung lên được vôi sống."], ["thuytinh", "🔮", "Thủy tinh", 2, "Nấu chảy cát mà thành, trong suốt, dễ vỡ."],
  ["gas", "🔥", "Khí gas", 2, "Nhiên liệu khí, cháy sạch, ít khói."], ["kimcuong", "💎", "Kim cương", 3, "Chất tinh khiết, cứng nhất trong tự nhiên."]];
const RARE = [["Thường", "#9aa4b8", 60], ["Hiếm", "#3b82f6", 30], ["Siêu hiếm", "#a855f7", 9], ["Huyền thoại", "#f59e0b", 1]];
export function maybeCard(chance = 0.2, sure = false) {
  if (!ST.state || (!sure && Math.random() > chance)) return null;
  let r = Math.random() * 100, tier = 0; for (let k = 0, a = 0; k < 4; k++) { a += RARE[k][2]; if (r < a) { tier = k; break; } }
  const pool = CARDS.filter(c => c[3] === tier), c = pool[Math.floor(Math.random() * pool.length)];
  const C = (ST.state.cards ||= {}); const isNew = !C[c[0]]; C[c[0]] = (C[c[0]] || 0) + 1; commit();
  sound.play(tier >= 2 ? "top" : "ting");
  modal(h("div", { class: "center" }, h("p", { class: "small muted" }, isNew ? "✨ THẺ MỚI! ✨" : "Em nhận được thẻ"),
    h("div", { class: "card-big", style: { borderColor: RARE[tier][1] } }, h("div", { class: "cb-ic" }, c[1]), h("b", {}, c[2]), h("span", { class: "tag", style: { background: RARE[tier][1], color: "#fff" } }, RARE[tier][0]), h("p", { class: "small" }, c[4])),
    h("button", { class: "btn btn-main", onclick: e => e.target.closest(".modal-back")?.remove() }, "Cất vào bộ sưu tập")));
  if (CARDS.every(x => C[x[0]]) && !ST.state.cardsFull) { ST.state.cardsFull = true; addDrops(50); (ST.state.owned ||= []).push("badge:🏅"); commit(); setTimeout(() => toast("🏆 Em đã sưu tập ĐỦ BỘ thẻ! +50💧 và huy hiệu 🏅 trong Tủ đồ!", "ok", 6000), 800); }
  return c;
}
export function cardScreen() {
  const C = ST.state.cards || {}, n = CARDS.filter(c => C[c[0]]).length;
  return S({ title: "Bộ sưu tập thẻ chất", sub: `Em có ${n}/${CARDS.length} thẻ · trả lời đúng, câu cá, làm nhiệm vụ để nhận thẻ · đủ bộ được +50💧 và huy hiệu 🏅`, icon: "🃏" },
    h("div", { class: "card-grid" }, CARDS.map(c => { const has = C[c[0]], t = RARE[c[3]];
      return h("div", { class: "card-big" + (has ? "" : " locked"), style: { borderColor: has ? t[1] : "#ddd" } }, h("div", { class: "cb-ic" }, has ? c[1] : "❔"), h("b", {}, has ? c[2] : "???"),
        h("span", { class: "tag", style: { background: t[1], color: "#fff" } }, t[0]), has ? h("p", { class: "small" }, c[4]) : h("p", { class: "small muted" }, "Chưa có"), has > 1 ? h("span", { class: "cb-n" }, "×" + has) : null); })));
}

// ---------------- Nhiệm vụ hằng ngày + chuỗi ngày học ----------------
const QUESTS = [["seed", "📚 Học xong 1 hạt giống", 1], ["weed", "🌿 Nhổ 3 bụi cỏ dại", 3], ["fish", "🎣 Câu được 2 con cá", 2], ["game", "🎮 Chơi xong 1 trò chơi riêng", 1], ["feed", "🐾 Cho thú cưng ăn 1 lần", 1], ["boss", "👾 Đánh Boss trúng 5 lần", 5], ["exp", "⚗️ Làm 1 thí nghiệm", 1]];
function daily() {
  const st = ST.state; if (!st) return null; const d = today();
  if (!st.daily || st.daily.d !== d) { let seed = [...d + (ST.profile?.id || "")].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7); const pick = [];
    while (pick.length < 3) { seed = seed * 1103515245 + 12345 >>> 0; const q = QUESTS[seed % QUESTS.length][0]; if (!pick.includes(q) && (q !== "boss" || ST.settings?.boss?.on)) pick.push(q); }
    st.daily = { d, q: pick, p: {}, got: [] }; }
  return st.daily;
}
addEventListener("kvtm:track", e => { const D = daily(); if (!D || !D.q.includes(e.detail)) return; D.p[e.detail] = (D.p[e.detail] || 0) + 1; const q = QUESTS.find(x => x[0] === e.detail);
  if (D.p[e.detail] === q[2]) toast(`🎯 Hoàn thành nhiệm vụ: ${q[1]}! Vào 🎯 Nhiệm vụ để nhận quà.`, "ok", 4000); commit(); });
addEventListener("kvtm:card", e => setTimeout(() => maybeCard(e.detail), 900));
export const track = k => dispatchEvent(new CustomEvent("kvtm:track", { detail: k }));
export function questScreen() {
  const D = daily(), st = ST.state, K = (st.streak ||= { last: "", n: 0 }), body = h("div", {});
  function paint() {
    const allGot = D.q.every(q => D.got.includes(q));
    body.replaceChildren(h("div", { class: "card streak" }, h("div", { class: "st-fire" }, "🔥"), h("div", {}, h("h2", { style: { margin: 0 } }, `Chuỗi ${K.n} ngày học liên tiếp`),
        h("p", { class: "small", style: { margin: 0 } }, "Hoàn thành cả 3 nhiệm vụ mỗi ngày để giữ chuỗi. Cứ 7 ngày liền: +20💧 và 1 thẻ chắc chắn!")),
        h("div", { class: "st-days" }, Array.from({ length: 7 }, (_, i) => h("span", { class: i < K.n % 7 || (K.n && K.n % 7 === 0) ? "on" : "" }, i + 1)))),
      ...D.q.map(k => { const q = QUESTS.find(x => x[0] === k), p = Math.min(D.p[k] || 0, q[2]), got = D.got.includes(k);
        return h("div", { class: "card quest" + (got ? " done" : "") }, h("b", {}, q[1]), h("div", { class: "pet-bar" }, h("i", { style: { width: p / q[2] * 100 + "%" } })), h("span", { class: "small" }, `${p}/${q[2]}`),
          got ? h("span", { class: "tag tag-ok" }, "✅ Đã nhận") : btn(p >= q[2] ? "🎁 Nhận +3💧" : "Chưa xong", () => { if (p < q[2]) return; D.got.push(k); addDrops(3); sound.play("reo"); maybeCard(0.3);
            if (D.q.every(x => D.got.includes(x)) && K.last !== D.d) { const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10); K.n = K.last === y ? K.n + 1 : 1; K.last = D.d;
              toast(`🔥 Chuỗi ${K.n} ngày!`, "ok", 4000); if (K.n % 7 === 0) { addDrops(20); setTimeout(() => maybeCard(1, true), 1200); } }
            commit(); flush(); paint(); }, p >= q[2] ? "btn btn-main btn-tiny" : "btn btn-soft btn-tiny")); }),
      allGot ? h("p", { class: "lead center" }, "🎉 Hôm nay em đã hoàn thành hết nhiệm vụ. Mai quay lại nhé!") : "");
  }
  paint(); commit();
  return S({ title: "Nhiệm vụ hằng ngày", sub: "3 nhiệm vụ mới mỗi ngày · mỗi nhiệm vụ +3💧 và cơ hội nhận thẻ", icon: "🎯" }, body);
}

// ---------------- Boss cả lớp ----------------
export function bossInfo() { return ST.settings?.boss?.on ? ST.settings.boss : null; }
export async function bossScreen() {
  const B = bossInfo(); if (!B) return S({ title: "Boss cả lớp", icon: "👾" }, h("div", { class: "card center" }, h("h2", {}, "Chưa có Boss"), h("p", {}, "Khi cô triệu hồi Quái vật Ô nhiễm, cả lớp sẽ cùng đánh ở đây.")));
  const av = (ST.state.avatar ||= {}); if (!av.bh || av.bh.id !== B.id) av.bh = { id: B.id, n: 0 };
  const qs = (await gameQuestions(ST.settings.open || [])).sort(() => Math.random() - 0.5); let qi = 0, total = 0;
  const hpBar = h("i", {}), hpTxt = h("b", {}), monster = h("div", { class: "boss-ic" }, "👾"), box = h("div", { class: "card" }), mine = h("span", {});
  async function refresh() { try { const L = await api.leaderboard(); total = L.reduce((a, s) => a + (s.avatar?.bh?.id === B.id ? s.avatar.bh.n || 0 : 0), 0); } catch { total = Math.max(total, av.bh.n); } paintHp(); }
  function paintHp() { const left = Math.max(0, B.hp - total); hpBar.style.width = left / B.hp * 100 + "%"; hpTxt.textContent = `❤️ ${left}/${B.hp}`; mine.textContent = `Em đã đánh trúng ${av.bh.n} lần`;
    if (left <= 0) { monster.textContent = "💥"; win(); } }
  function win() { const cl = (ST.state.bossWin ||= []); box.replaceChildren(h("div", { class: "center" }, h("h2", {}, "🎉 Cả lớp đã đánh bại Quái vật Ô nhiễm!"),
      cl.includes(B.id) ? h("p", {}, "Em đã nhận quà rồi. Giỏi lắm!") : btn("🎁 Nhận quà chiến thắng (+15💧 và 1 thẻ)", () => { cl.push(B.id); addDrops(15); commit(); flush(); maybeCard(1, true); win(); }, "btn btn-main btn-big"))); }
  function ask() {
    if (total >= B.hp) return win(); if (!qs.length) return box.replaceChildren(h("p", {}, "Cô chưa mở bài nào."));
    const q = qs[qi++ % qs.length], fb = h("div", { class: "feedback" });
    const opts = q.options.map((o, i) => h("button", { class: "opt", onclick: () => { opts.forEach(b => b.disabled = true);
      if (i === q.correct) { const dmg = q.level === "vandung" ? 2 : 1; av.bh.n += dmg; total += dmg; commit(); track("boss"); maybeCard(0.05); sound.play("tac"); opts[i].classList.add("ok");
        monster.classList.remove("hit"); void monster.offsetWidth; monster.classList.add("hit"); fb.className = "feedback fb-ok"; fb.textContent = `💥 Trúng! −${dmg} máu`; paintHp(); setTimeout(ask, 700); }
      else { opts[i].classList.add("bad"); opts[q.correct].classList.add("ok"); sound.play("oi"); fb.className = "feedback fb-info"; fb.replaceChildren(h("b", {}, "Trượt! "), q.explain || ""); setTimeout(ask, 2000); } } }, ill(o)));
    box.replaceChildren(h("h3", { class: "q-prompt" }, q.prompt), h("div", { class: "opts" }, opts), fb);
  }
  refresh(); ask(); const tm = setInterval(() => { if (!box.isConnected) return clearInterval(tm); flush(); if (!document.hidden) refresh(); }, 12000);
  return S({ title: "Boss cả lớp: " + (B.name || "Quái vật Ô nhiễm"), sub: "Cả lớp cùng trả lời đúng để trừ máu Boss · câu Vận dụng trừ 2 máu", icon: "👾" },
    h("div", { class: "card boss" }, monster, h("div", { style: { flex: 1 } }, h("div", { class: "boss-hp" }, hpBar), hpTxt, " · ", mine)), box);
}
