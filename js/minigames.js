// Đảo Trò Chơi: 2 trò chơi cả lớp + 4 trò chơi riêng (Làm bánh, Đập chuột, Lật thẻ, Đúng hay Sai), và Đảo Giam Giữ.
// Câu hỏi lấy từ các bài cô đã mở. Chơi xong nhận giọt mây 💧 để mua đồ ở Tủ đồ.
import { h, btn, toast, burst, shuffle, modal } from "./ui.js";
import { sound } from "./sound.js";
import { sheet } from "./shell.js";
import { gameQuestions } from "./games.js";
import { ill } from "./quiz.js";
import { ST, commit, flush, addDrops, totalSeeds, jailInfo, freeFromJail, DROP_DAY_MAX } from "./student.js";

const S = (o, ...b) => sheet({ seeds: totalSeeds(), style: "game", ...o }, ...b);
async function pool() { const ids = ST.settings.open || []; return ids.length ? gameQuestions(ids) : []; }
// Ưu tiên câu em chưa gặp gần đây để hạn chế lặp lại
function fresh(arr, n = 10) { let seen = []; try { seen = JSON.parse(localStorage.getItem("kvtm-seenq") || "[]"); } catch {}
  const S0 = new Set(seen), out = shuffle(arr).sort((a, b) => S0.has(a.prompt) - S0.has(b.prompt));
  seen = [...seen.filter(p => !out.slice(0, n).some(q => q.prompt === p)), ...out.slice(0, n).map(q => q.prompt)].slice(-150);
  try { localStorage.setItem("kvtm-seenq", JSON.stringify(seen)); } catch {} return out; }
// câu hỏi "không đúng / sai / cả 3 đáp án trên" dễ gây hiểu nhầm khi tách đáp án ra khỏi câu hỏi
const plain = q => !/(không|sai\b|KHÔNG|ngoại trừ|trừ)/i.test(q.prompt) && !q.options.some(o => /(trên|tất cả|cả hai|cả ba|cả 3)/i.test(o));
const noQ = () => h("div", { class: "card center" }, h("h2", {}, "Cô chưa mở bài nào"), h("p", {}, "Khi cô mở bài, các trò chơi sẽ có câu hỏi."));
function reward(n, why) {
  dispatchEvent(new CustomEvent("kvtm:track", { detail: "game" }));
  const g = addDrops(n);
  sound.play("reo");
  return h("div", { class: "card center mg-end" }, h("div", { class: "mg-big" }, "💧 +" + g), h("h2", {}, why),
    h("p", {}, g < n ? `Hôm nay em đã nhận gần đủ ${DROP_DAY_MAX} giọt mây rồi, mai chơi tiếp nhé!` : `Em có ${ST.state.drops} giọt mây. Ghé Tủ đồ để mua quần áo mới!`),
    h("div", { class: "actions center" }, btn("🎮 Chơi tiếp", () => { location.hash = "#/tro-choi"; }, "btn btn-main"), btn("👕 Mở Tủ đồ", () => { location.hash = "#/may"; setTimeout(() => document.getElementById("b-wd")?.click(), 400); }, "btn btn-soft")));
}
const best = (k, v) => { const b = ST.state.best; if (!b[k] || v > b[k]) b[k] = v; return b[k]; };

// ================================================================== sảnh trò chơi
export function gameHub() {
  const card = (href, ic, t, d, tag) => h("a", { class: "mg-card", href }, h("span", { class: "mg-ic" }, ic), h("b", {}, t), h("small", {}, d), tag ? h("span", { class: "tag" }, tag) : null);
  return S({ title: "Đảo Trò Chơi", sub: `Chơi để ôn bài, nhận giọt mây · em có 💧 ${ST.state.drops}`, icon: "🎮" },
    h("h3", { class: "mg-h" }, "👥 Chơi cùng cả lớp (cô mở phòng)"),
    h("div", { class: "mg-grid" }, card("#/tro-choi/lop", "🔐", "Hack Mật Mã Mây", "Trả lời đúng để đầy két, mở hộp quà, phá mật mã két bạn.", "cả lớp"),
      card("#/tro-choi/lop", "🎈", "Đua khinh khí cầu", "Cả lớp trả lời, khinh khí cầu của em bay cao dần.", "cả lớp")),
    h("h3", { class: "mg-h" }, "🙋 Chơi một mình"),
    h("div", { class: "mg-grid four" }, card("#/tro-choi/banh", "🎂", "Tiệm bánh mây", "Trả lời đúng để nhận bột, trứng, sữa… rồi nướng bánh.", "+6💧/bánh"),
      card("#/tro-choi/chuot", "🐭", "Đập chuột khoa học", "4 chú chuột cầm 4 đáp án, 15 giây mỗi câu.", "+1💧/câu"),
      card("#/tro-choi/the", "🃏", "Lật thẻ ghép đôi", "Ghép câu hỏi với đáp án đúng.", "+6💧"),
      card("#/tro-choi/nhanh", "⚡", "Đúng hay Sai?", "60 giây, bấm thật nhanh.", "+1💧/2 câu")),
    h("h3", { class: "mg-h" }, "🌈 Thư giãn"),
    h("div", { class: "mg-grid" }, card("#/ho-ca", "🎣", "Hồ câu cá", "Mỗi con cá là một câu hỏi. Đúng thì câu được cá!", "+2💧/con"),
      card("#/nhiem-vu", "🎯", "Nhiệm vụ hằng ngày", "3 nhiệm vụ mỗi ngày, giữ chuỗi ngày học.", "+3💧/nv"),
      card("#/the-bai", "🃏", "Bộ sưu tập thẻ", "Sưu tập 12 thẻ chất hóa học.", "đủ bộ +50💧"),
      card("#/boss", "👾", "Boss cả lớp", "Cả lớp cùng đánh Quái vật Ô nhiễm.", "cô triệu hồi"),
      card("#/thu-cung", "🐾", "Thú cưng", "Mua và chăm thú cưng, bé sẽ đi theo em khắp vương quốc.", "mua bằng 💧")));
}

// ================================================================== 1. Tiệm bánh mây
const ING = [["🌾", "Bột mì"], ["🥚", "Trứng"], ["🥛", "Sữa"], ["🍬", "Đường"], ["🍓", "Dâu tây"]];
export async function bakeGame() {
  const qs = fresh(await pool()); if (!qs.length) return S({ title: "Tiệm bánh mây", icon: "🎂" }, noQ());
  let qi = 0, got = 0, cakes = 0, busy = false;
  const bowl = h("div", { class: "bk-bowl" }), shelf = h("div", { class: "bk-shelf" }), qbox = h("div", { class: "card" }), msg = h("div", { class: "feedback" });
  const wrap = h("div", { class: "bk" }, h("div", { class: "card bk-kitchen" }, h("div", { class: "bk-need" }), bowl, shelf, h("div", { class: "bk-oven" }, "🔥")), h("div", {}, qbox, msg));
  function paintKitchen() {
    wrap.querySelector(".bk-need").replaceChildren(h("b", {}, "Công thức bánh kem mây: "), ...ING.map(([e], i) => h("span", { class: "bk-ing" + (i < got ? " ok" : i === got ? " now" : "") }, e)));
    bowl.replaceChildren(h("span", { class: "bk-bowl-ic" }, "🥣"), ...ING.slice(0, got).map(([e], i) => h("span", { class: "bk-in", style: { left: 18 + i * 14 + "%" } }, e)));
    shelf.replaceChildren(h("span", {}, "Bánh đã nướng: "), ...Array.from({ length: cakes }, () => h("span", { class: "bk-cake" }, "🎂")));
  }
  function ask() {
    const q = qs[qi++ % qs.length], [e, name] = ING[got];
    msg.className = "feedback"; msg.textContent = "";
    const opts = q.options.map((o, i) => h("button", { class: "opt", onclick: () => {
      if (busy) return; busy = true; opts.forEach(b => b.disabled = true);
      if (i === q.correct) { opts[i].classList.add("ok"); sound.play("ting"); got++; msg.className = "feedback fb-ok"; msg.textContent = `Đúng rồi! Nhận được ${e} ${name}.`; paintKitchen();
        const r = bowl.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 20, "star", 6);
        setTimeout(() => { busy = false; got >= ING.length ? bake() : ask(); }, 1100); }
      else { opts[i].classList.add("bad"); opts[q.correct].classList.add("ok"); sound.play("sai"); msg.className = "feedback fb-info"; msg.replaceChildren(h("b", {}, "Chưa đúng. "), q.explain || "Đáp án đúng đã sáng lên.");
        setTimeout(() => { busy = false; ask(); }, 2600); }
    } }, ill(o)));
    qbox.replaceChildren(h("p", { class: "small muted" }, `Cần ${e} ${name} — trả lời đúng để nhận`), h("h3", { class: "q-prompt" }, q.prompt), h("div", { class: "opts" }, opts));
  }
  function bake() {
    sound.play("xeo"); wrap.classList.add("baking"); qbox.replaceChildren(h("div", { class: "center" }, h("div", { class: "mg-big" }, "♨️"), h("h3", {}, "Đang nướng bánh…")));
    setTimeout(() => { wrap.classList.remove("baking"); cakes++; got = 0; best("banh", cakes); paintKitchen(); sound.play("chuong");
      if (cakes >= 3) return wrap.replaceWith(reward(cakes * 6, `Em đã nướng ${cakes} chiếc bánh kem mây!`));
      qbox.replaceChildren(h("div", { class: "center" }, h("div", { class: "mg-big" }, "🎂"), h("h3", {}, `Bánh thứ ${cakes} ra lò!`), h("div", { class: "actions center" }, btn("Làm bánh tiếp ➜", ask, "btn btn-main"), btn("Nhận giọt mây và nghỉ", () => wrap.replaceWith(reward(cakes * 6, `Em đã nướng ${cakes} chiếc bánh!`)), "btn btn-soft")))); }, 2600);
  }
  paintKitchen(); ask();
  return S({ title: "Tiệm bánh mây", sub: "Trả lời đúng để nhận nguyên liệu · đủ 5 nguyên liệu thì nướng bánh · tối đa 3 bánh mỗi lượt", icon: "🎂" }, wrap);
}

// ================================================================== 2. Đập chuột khoa học
export async function moleGame() {
  const qs = fresh((await pool()).filter(q => q.options.length >= 2 && plain(q))).slice(0, 10); if (!qs.length) return S({ title: "Đập chuột khoa học", icon: "🐭" }, noQ());
  const T = 15; let qi = 0, right = 0, timer = 0, left = T, locked = false;
  const prompt = h("h3", { class: "q-prompt center" }), bar = h("i", {}), info = h("div", { class: "mg-info" }), field = h("div", { class: "ml-field" }), fb = h("div", { class: "feedback center" });
  const root = h("div", { class: "ml" }, info, h("div", { class: "mg-timer" }, bar), prompt, field, fb);
  function next() {
    clearInterval(timer);
    if (qi >= qs.length) { best("chuot", right); return root.replaceWith(reward(right, `Em đập đúng ${right}/${qs.length} chú chuột!`)); }
    const q = qs[qi++]; locked = false; left = T; fb.className = "feedback center"; fb.textContent = "";
    info.textContent = `Câu ${qi}/${qs.length} · Đúng ${right}`; prompt.textContent = q.prompt;
    const holes = [0, 1, 2, 3].map(i => {
      const o = q.options[i]; if (o == null) return h("div", { class: "ml-hole empty" });
      const mole = h("button", { class: "ml-mole", style: { animationDelay: i * 0.12 + "s" }, onclick: () => hit(i) }, h("span", { class: "ml-face" }, "🐭"), h("span", { class: "ml-ans" }, o));
      return h("div", { class: "ml-hole" }, mole, h("span", { class: "ml-dirt" }));
    });
    field.replaceChildren(...holes);
    function hit(i) {
      if (locked) return; locked = true; clearInterval(timer);
      const ms = field.querySelectorAll(".ml-mole");
      if (i === q.correct) { right++; ms[i].classList.add("bonk", "ok"); sound.play("bup"); fb.className = "feedback center fb-ok"; fb.textContent = "Bốp! Chính xác!"; setTimeout(next, 1100); }
      else { if (i >= 0) ms[i]?.classList.add("bad"); ms[q.correct]?.classList.add("ok"); sound.play("sai"); fb.className = "feedback center fb-info"; fb.replaceChildren(h("b", {}, i < 0 ? "Hết giờ! " : "Chưa đúng. "), "Đáp án đúng: " + q.options[q.correct] + (q.explain ? ". " + q.explain : "")); setTimeout(next, 3000); }
    }
    bar.style.width = "100%";
    timer = setInterval(() => { left -= 0.1; bar.style.width = Math.max(0, left / T * 100) + "%"; bar.classList.toggle("hurry", left < 5); if (!document.body.contains(root)) clearInterval(timer); if (left <= 0) hit(-1); }, 100);
  }
  setTimeout(next, 50);
  return S({ title: "Đập chuột khoa học", sub: "Mỗi chú chuột cầm một đáp án · bấm đúng chú chuột trong 15 giây", icon: "🐭" }, root);
}

// ================================================================== 3. Lật thẻ ghép đôi
export async function memoryGame() {
  const src = fresh((await pool()).filter(q => plain(q) && q.prompt.length < 110 && q.options[q.correct].length < 70)).slice(0, 6);
  if (src.length < 3) return S({ title: "Lật thẻ ghép đôi", icon: "🃏" }, noQ());
  const cards = shuffle(src.flatMap((q, k) => [{ k, t: q.prompt, kind: "q" }, { k, t: q.options[q.correct], kind: "a" }]));
  let open = [], done = 0, moves = 0; const t0 = Date.now();
  const info = h("div", { class: "mg-info" }, "Lật 2 thẻ: một câu hỏi và đáp án đúng của nó.");
  const grid = h("div", { class: "mm-grid" }, cards.map((c, i) => { const b = h("button", { class: "mm-card " + c.kind, onclick: () => flip(i, b) }, h("span", { class: "mm-back" }, "☁️"), h("span", { class: "mm-front" }, c.kind === "a" ? ill(c.t) : c.t)); return b; }));
  function flip(i, b) {
    if (open.length >= 2 || b.classList.contains("up")) return; b.classList.add("up"); sound.play("bam"); open.push([i, b]);
    if (open.length < 2) return; moves++;
    const [[i1, b1], [i2, b2]] = open;
    if (cards[i1].k === cards[i2].k && cards[i1].kind !== cards[i2].kind) { setTimeout(() => { b1.classList.add("done"); b2.classList.add("done"); sound.play("ting"); open = []; done++; info.textContent = `Ghép đúng ${done}/${src.length} cặp · ${moves} lượt lật`;
      if (done === src.length) { const sec = Math.round((Date.now() - t0) / 1000); best("the", 100 - moves); setTimeout(() => grid.replaceWith(reward(6, `Ghép xong ${src.length} cặp sau ${moves} lượt (${sec} giây)!`)), 700); } }, 400); }
    else setTimeout(() => { b1.classList.remove("up"); b2.classList.remove("up"); open = []; }, 1100);
  }
  return S({ title: "Lật thẻ ghép đôi", sub: "Thẻ xanh là câu hỏi, thẻ vàng là đáp án", icon: "🃏" }, info, grid);
}

// ================================================================== 4. Đúng hay Sai?
export async function tfGame() {
  const qs = fresh((await pool()).filter(plain)); if (!qs.length) return S({ title: "Đúng hay Sai?", icon: "⚡" }, noQ());
  let qi = 0, score = 0, left = 60, cur = null, timer = 0, started = false;
  const stmt = h("div", { class: "tf-stmt" }), info = h("div", { class: "mg-info" }), bar = h("i", {}), fb = h("div", { class: "tf-fb" });
  const yes = btn("✅ Đúng", () => pick(true), "btn btn-mint btn-big"), no = btn("❌ Sai", () => pick(false), "btn btn-danger btn-big");
  const root = h("div", { class: "tf" }, info, h("div", { class: "mg-timer" }, bar), stmt, fb, h("div", { class: "actions center" }, yes, no), h("p", { class: "small muted center" }, "Phím ← là Đúng, phím → là Sai"));
  function next() { const q = qs[qi++ % qs.length], truth = Math.random() < 0.5; const wrongs = q.options.map((_, i) => i).filter(i => i !== q.correct);
    const oi = truth || !wrongs.length ? q.correct : wrongs[Math.floor(Math.random() * wrongs.length)]; cur = { truth: oi === q.correct, q };
    stmt.replaceChildren(h("small", {}, q.prompt), h("b", {}, "➜ " + q.options[oi])); }
  function pick(v) {
    if (!started || left <= 0) return; const ok = v === cur.truth; if (ok) score++; sound.play(ok ? "ting" : "sai");
    fb.className = "tf-fb " + (ok ? "ok" : "bad"); fb.textContent = ok ? "+1" : (cur.truth ? "Câu đó Đúng!" : "Câu đó Sai: " + cur.q.options[cur.q.correct]); info.textContent = `Điểm: ${score}`; next();
  }
  const key = e => { if (!document.body.contains(root)) return removeEventListener("keydown", key); if (e.key === "ArrowLeft") pick(true); if (e.key === "ArrowRight") pick(false); };
  addEventListener("keydown", key);
  function start() { started = true; info.textContent = "Điểm: 0"; next();
    timer = setInterval(() => { left -= 0.1; bar.style.width = Math.max(0, left / 60 * 100) + "%"; bar.classList.toggle("hurry", left < 10);
      if (!document.body.contains(root)) clearInterval(timer);
      if (left <= 0) { clearInterval(timer); best("nhanh", score); root.replaceWith(reward(Math.floor(score / 2), `Em trả lời đúng ${score} câu trong 60 giây!`)); } }, 100); }
  stmt.replaceChildren(h("b", {}, "Sẵn sàng chưa?"), h("small", {}, `Kỉ lục của em: ${ST.state.best.nhanh || 0} câu`)); bar.style.width = "100%";
  root.append(h("div", { class: "actions center" }, btn("▶ Bắt đầu", e => { e.target.remove(); start(); }, "btn btn-main btn-big")));
  return S({ title: "Đúng hay Sai?", sub: "60 giây · đọc câu và bấm thật nhanh", icon: "⚡" }, root);
}

// ================================================================== Đảo Giam Giữ
export async function dewScreen() {
  const day = new Date().toDateString(), done = ST.state.dewDay === day;
  const qs = fresh(await pool()).slice(0, 3); let ok = 0, qi = 0; const box = h("div", { class: "card" });
  const head = h("div", { class: "card jl-head" }, h("span", { class: "mg-big" }, "💧"), h("div", {}, h("h3", { style: { margin: 0 } }, "Bác Giọt Sương"),
    h("p", { style: { margin: 0 } }, "Bác canh sương sớm cho vương quốc. Mỗi ngày bác giao 1 nhiệm vụ: trả lời 3 câu, đúng từ 2 câu nhận 💧 +6 giọt mây. Bác còn nhắc em nhổ cỏ dại nữa đấy!")));
  if (done) return S({ title: "Nhiệm vụ của Bác Giọt Sương", icon: "💧" }, head, h("div", { class: "card center" }, h("h2", {}, "Hôm nay em làm xong nhiệm vụ rồi!"), h("p", {}, "Mai quay lại với bác nhé. Giờ ra vườn nhổ cỏ hoặc chơi trò chơi đi."), btn("Ra Vườn Mây", () => location.hash = "#/vuon", "btn btn-main")));
  if (!qs.length) return S({ title: "Nhiệm vụ của Bác Giọt Sương", icon: "💧" }, head, noQ());
  function ask() {
    if (qi >= qs.length) { ST.state.dewDay = day; commit(); box.replaceChildren(ok >= 2 ? reward(6, `Hoàn thành nhiệm vụ! Đúng ${ok}/3 câu.`) : h("div", { class: "center" }, h("h2", {}, `Đúng ${ok}/3 câu`), h("p", {}, "Chưa đủ 2 câu, mai em thử lại nhé. Nhớ ôn lại bài!"))); return; }
    const q = qs[qi++], fb = h("div", { class: "feedback" });
    const opts = q.options.map((o, i) => h("button", { class: "opt", onclick: () => { opts.forEach(b => b.disabled = true);
      if (i === q.correct) { ok++; opts[i].classList.add("ok"); sound.play("cach"); fb.className = "feedback fb-ok"; fb.textContent = "Đúng rồi!"; }
      else { opts[i].classList.add("bad"); opts[q.correct].classList.add("ok"); sound.play("sai"); fb.className = "feedback fb-info"; fb.replaceChildren(h("b", {}, "Chưa đúng. "), q.explain || ""); }
      setTimeout(ask, i === q.correct ? 700 : 2200); } }, ill(o)));
    box.replaceChildren(h("p", { class: "small muted" }, `Câu ${qi}/3`), h("h3", { class: "q-prompt" }, q.prompt), h("div", { class: "opts" }, opts), fb);
  }
  ask();
  return S({ title: "Nhiệm vụ của Bác Giọt Sương", sub: "Mỗi ngày 3 câu · đúng từ 2 câu nhận giọt mây", icon: "💧" }, head, box);
}
// ================================================================== Thú cưng
export const PETS = [["ga", "🐥", "Gà con", 25], ["tho", "🐰", "Thỏ trắng", 35], ["meo", "🐱", "Mèo mây", 40], ["cun", "🐶", "Cún bông", 40], ["kl", "🦖", "Khủng long xanh", 60], ["rong", "🐲", "Rồng mây", 80]];
// Thức ăn: [mã, tên, cách lấy, điểm lớn]; mỗi bé có món khoái khẩu (lớn gấp đôi)
export const PET_FOOD = [["hat", "🌾 Hạt ngũ cốc", "1💧", 1], ["banh", "🍰 Bánh mây", "3💧", 2], ["ca", "🐟 Cá tươi", "1 con cá trong giỏ (Hồ câu cá)", 3], ["rau", "🥕 Rau củ", "1 rau/củ/gạo thu hoạch ở Vườn Mây", 2]];
const FAV = { ga: "hat", tho: "rau", meo: "ca", cun: "banh", kl: "rau", rong: "ca" };
export const PET_STAGE = xp => { const sc = 0.65 + Math.min(xp, 45) * 0.016; return [xp < 6 ? "Em bé" : xp < 18 ? "Thiếu niên" : xp < 36 ? "Lớn khỏe" : "Trưởng thành ✨", sc]; }; // lớn dần sau mỗi lần ăn
export function petScreen() {
  const P = (ST.state.pet ||= { owned: [], active: "", fed: {}, feeds: {}, names: {} }); P.xp ||= {};
  const body = h("div", {});
  const mood = id => { const t = P.fed[id]; if (!t) return ["😢", "Đói lắm", 0]; const hr = (Date.now() - t) / 36e5; return hr < 8 ? ["🥰", "Rất vui", 3] : hr < 24 ? ["🙂", "Vui", 2] : hr < 48 ? ["😟", "Hơi đói", 1] : ["😢", "Đói lắm", 0]; };
  const inv = ST.state.inventory || {};
  function feed(id, f) {
    const [k, name, , pts] = f; let ok = false;
    if (k === "hat" || k === "banh") { const c = k === "hat" ? 1 : 3; if (ST.state.drops >= c) { ST.state.drops -= c; ok = true; } else toast(`Cần ${c} 💧 giọt mây.`); }
    if (k === "ca") { const F = ST.state.fish; const kinds = F && Object.keys(F.kinds || {}).filter(x => F.kinds[x] > 0); if (kinds && kinds.length) { F.kinds[kinds[0]]--; F.total--; ok = true; } else toast("Giỏ cá trống. Ra Hồ câu cá câu thêm nhé! 🎣"); }
    if (k === "rau") { const r = ["rau", "cu", "gao"].find(x => (inv[x] || 0) > 0); if (r) { inv[r]--; ok = true; } else toast("Chưa có rau củ. Gieo hạt Bài 15 ở Vườn Mây rồi thu hoạch nhé! 🥕"); }
    if (!ok) return sound.play("sai");
    const fav = FAV[id] === k, add = pts * (fav ? 2 : 1), before = PET_STAGE(P.xp[id] || 0)[0];
    P.xp[id] = (P.xp[id] || 0) + add; P.fed[id] = Date.now(); P.feeds[id] = (P.feeds[id] || 0) + 1; dispatchEvent(new CustomEvent("kvtm:track", { detail: "feed" })); commit(); sound.play("bup");
    const after = PET_STAGE(P.xp[id])[0]; if (after !== before) { sound.play("reo"); toast(`🎉 Bé đã lớn lên: ${after}!`, "ok", 4000); } else toast(fav ? `😍 Món khoái khẩu! +${add} điểm lớn` : `Măm măm! +${add} điểm lớn`, "ok");
    paint(); const ic = body.querySelector(`[data-pet="${id}"]`); if (ic) { ic.classList.remove("grow"); void ic.offsetWidth; ic.classList.add("grow"); }
  }
  function paint() {
    const fishN = ST.state.fish?.total || 0, vegN = ["rau", "cu", "gao"].reduce((a, x) => a + (inv[x] || 0), 0);
    body.replaceChildren(h("p", { class: "lead" }, `💧 ${ST.state.drops} giọt mây · 🐟 ${fishN} con cá · 🥕 ${vegN} rau củ. Cho bé ăn để bé lớn: Em bé → Thiếu niên → Lớn khỏe → Trưởng thành.`),
      h("div", { class: "pet-grid" }, PETS.map(([id, ic, name, price]) => { const own = P.owned.includes(id), [face, txt, hearts] = mood(id), xp = P.xp[id] || 0, [stg, sc] = PET_STAGE(xp), nxt = [6, 18, 36].find(v => v > xp);
        const favF = PET_FOOD.find(f => f[0] === FAV[id]);
        return h("div", { class: "card pet-card" + (P.active === id ? " on" : "") }, h("div", { class: "pet-ic" + (own ? " bob" : " dim"), "data-pet": id, style: { fontSize: own ? 20 + sc * 50 + "px" : "" } }, own ? ["🍼", "🎀", "💪", "👑"][xp < 6 ? 0 : xp < 18 ? 1 : xp < 36 ? 2 : 3] : "", ic), own ? h("div", { class: "small" }, `📏 Cao ${Math.round(sc * 30)} cm · ${xp} điểm lớn`) : null,
          h("b", {}, P.names[id] || name), own ? h("div", { class: "small" }, `${stg} · ${face} ${txt} · ${"❤️".repeat(hearts)}${"🤍".repeat(3 - hearts)}`) : h("div", { class: "small muted" }, `Giá ${price} 💧`),
          own ? h("div", { class: "pet-bar" }, h("i", { style: { width: Math.min(100, nxt ? xp / nxt * 100 : 100) + "%" } })) : null,
          h("div", { class: "small muted" }, `Thích ăn: ${favF[1]}`),
          own ? h("div", { class: "pet-food" }, PET_FOOD.map(f => h("button", { class: "chip pet-feed", title: "Lấy từ: " + f[2], onclick: () => feed(id, f) }, f[1], h("small", {}, " · " + { hat: "1💧", banh: "3💧", ca: "1 cá", rau: "1 rau" }[f[0]])))) : null,
          own ? h("div", { class: "actions center" },
            btn(P.active === id ? "✅ Đang đi theo" : "🐾 Dắt đi chơi", () => { P.active = P.active === id ? "" : id; sound.play("ting"); commit(); paint(); }, "btn btn-tiny btn-soft"),
            btn("✏️ Đặt tên", () => { const n = prompt("Tên của bé:", P.names[id] || name); if (n) { P.names[id] = n.slice(0, 14).replace(/[<>]/g, ""); commit(); paint(); } }, "btn btn-tiny btn-soft"))
          : btn(`Mua ${price} 💧`, () => { if (ST.state.drops < price) { sound.play("sai"); return toast(`Cần ${price} 💧, em đang có ${ST.state.drops}.`); } ST.state.drops -= price; P.owned.push(id); P.active = id; P.fed[id] = Date.now(); sound.play("reo"); commit(); flush(); toast(`Chào mừng ${name} về nhà! ${ic}`, "ok"); paint(); }, "btn btn-main")); })));
  }
  paint();
  return S({ title: "Thú cưng của em", sub: "Mua, đặt tên, cho ăn để bé lớn · bé đi theo em trong vương quốc", icon: "🐾" }, body);
}

// ================================================================== Hồ câu cá
const FISH = [["🐟", "Cá xanh", 60], ["🐠", "Cá hề", 25], ["🐡", "Cá nóc", 10], ["🦐", "Tôm", 4], ["🐙", "Bạch tuộc", 1]];
export async function fishScreen() {
  const qs = fresh(await pool()); if (!qs.length) return S({ title: "Hồ câu cá", icon: "🎣" }, noQ());
  const F = (ST.state.fish ||= { total: 0, kinds: {} }); let qi = 0;
  const pond = h("div", { class: "pond" }), basket = h("div", { class: "fish-basket" });
  const paintBasket = () => basket.replaceChildren(h("b", {}, `🧺 Giỏ cá: ${F.total} con`), ...FISH.map(([ic, n]) => h("span", { class: "fb-it", title: n }, ic, " ", F.kinds[ic] || 0)));
  const pickFish = () => { const r = Math.random() * 100; let a = 0; for (const f of FISH) { a += f[2]; if (r < a) return f; } return FISH[0]; };
  function spawn() {
    const f = pickFish(), el = h("button", { class: "fish", "aria-label": "Câu " + f[1] }, f[0]);
    // cá bơi bằng JS (vẫn chạy khi máy tắt hiệu ứng chuyển động)
    el._x = 5 + Math.random() * 85; el._y = 8 + Math.random() * 72; el._v = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 6); el._ph = Math.random() * 6;
    el.onclick = () => cast(f, el); pond.append(el); place(el, 0);
  }
  function cast(f, el) {
    sound.play("tach"); el.classList.add("hooked"); const q = qs[qi++ % qs.length];
    const fb = h("div", { class: "feedback" });
    const opts = q.options.map((o, i) => h("button", { class: "opt", onclick: () => { opts.forEach(b => b.disabled = true);
      if (i === q.correct) { opts[i].classList.add("ok"); F.total++; dispatchEvent(new CustomEvent("kvtm:track", { detail: "fish" })); dispatchEvent(new CustomEvent("kvtm:card", { detail: 0.15 })); F.kinds[f[0]] = (F.kinds[f[0]] || 0) + 1; const g = addDrops(f[2] <= 4 ? 4 : 2); commit(); sound.play("reo");
        fb.className = "feedback fb-ok"; fb.textContent = `Câu được ${f[0]} ${f[1]}! +${g}💧`; el.remove(); spawn(); paintBasket(); setTimeout(() => m.close(), 1100); }
      else { opts[i].classList.add("bad"); opts[q.correct].classList.add("ok"); sound.play("oi"); fb.className = "feedback fb-info"; fb.replaceChildren(h("b", {}, "Cá chạy mất rồi! "), q.explain || "Em xem đáp án đúng nhé."); el.classList.remove("hooked"); el.classList.add("flee"); setTimeout(() => { el.remove(); spawn(); }, 900); setTimeout(() => m.close(), 2200); } } }, ill(o)));
    const m = modal(h("div", {}, h("h2", {}, `🎣 Cá ${f[0]} cắn câu!`), h("p", { class: "small muted" }, "Trả lời đúng để kéo cá lên nhé."), h("h3", { class: "q-prompt" }, q.prompt), h("div", { class: "opts" }, opts), fb), { onClose: () => el.classList.remove("hooked") });
  }
  function place(el, t) { el.style.left = el._x + "%"; el.style.top = el._y + Math.sin(t * 1.5 + el._ph) * 2 + "%"; el.style.transform = (el._v > 0 ? "scaleX(-1)" : "") + (el.classList.contains("hooked") ? " scale(1.3)" : ""); }
  let lastT = performance.now();
  (function swim(now) { if (!pond.isConnected && now - lastT > 3000) return; const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    pond.querySelectorAll(".fish").forEach(el => { if (!el.classList.contains("hooked")) { el._x += el._v * dt * (el.classList.contains("flee") ? 8 : 1); if (el._x > 92 || el._x < 0) { el._v = -el._v; el._x = Math.max(0, Math.min(92, el._x)); } } place(el, now / 1000); });
    requestAnimationFrame(swim); })(performance.now());
  for (let i = 0; i < 7; i++) spawn();
  paintBasket();
  return S({ title: "Hồ câu cá", sub: "Chạm vào một con cá · mỗi con là một câu hỏi · cá hiếm được nhiều giọt mây hơn", icon: "🎣" }, basket, h("p", { class: "small muted center" }, "👆 Chạm vào con cá đang bơi → trả lời đúng câu hỏi để kéo cá lên giỏ. Sai thì cá chạy mất!"), pond);
}

export async function jailScreen() {
  const j = jailInfo(); if (!j) { location.hash = "#/may"; return null; }
  const qs = fresh(await pool()); let ok = 0, qi = 0; const retry = [];
  const NEED = 5, box = h("div", { class: "card" }), prog = h("div", { class: "jl-prog" });
  const paintProg = () => prog.replaceChildren(...Array.from({ length: NEED }, (_, i) => h("span", { class: i < ok ? "on" : "" }, i < ok ? "🔓" : "🔒")));
  function ask() {
    if (!qs.length) { box.replaceChildren(h("p", {}, "Cô chưa mở bài nào. Em nhờ cô thả em ra nhé.")); return; }
    if (ok >= NEED) { freeFromJail(); sound.play("reo"); box.replaceChildren(h("div", { class: "center" }, h("div", { class: "mg-big" }, "🕊️"), h("h2", {}, "Em đã được tự do!"), h("p", {}, "Cầu nối với quảng trường đã mở. Nhớ chăm học và làm bài trung thực nhé!"), btn("Về quảng trường ➜", () => location.hash = "#/may", "btn btn-main btn-big"))); return; }
    const q = (retry.length && qi % 3 === 2 ? retry.shift() : qs[qi % qs.length]); qi++; const fb = h("div", { class: "feedback" });
    const opts = q.options.map((o, i) => h("button", { class: "opt", onclick: () => {
      opts.forEach(b => b.disabled = true);
      if (i === q.correct) { ok++; opts[i].classList.add("ok"); sound.play("cach"); fb.className = "feedback fb-ok"; fb.textContent = `Đúng! Mở được ${ok}/${NEED} ổ khóa.`; paintProg(); }
      else { opts[i].classList.add("bad"); opts[q.correct].classList.add("ok"); sound.play("sai"); if (ok > 0) ok--; paintProg(); retry.push(q); fb.className = "feedback fb-info"; fb.replaceChildren(h("b", {}, "Chưa đúng, mất 1 ổ khóa! "), q.explain || "Em đọc kĩ đáp án đúng nhé. Câu này sẽ quay lại."); }
      const nb = btn(ok >= NEED ? "Mở cổng ➜" : "Câu tiếp ➜", ask, "btn btn-main"); box.append(h("div", { class: "actions" }, nb));
      if (i !== q.correct) { nb.disabled = true; let s = 3; nb.textContent = `Đọc kĩ đáp án… ${s}`; const tm = setInterval(() => { if (--s <= 0) { clearInterval(tm); nb.disabled = false; nb.textContent = "Câu tiếp ➜"; } else nb.textContent = `Đọc kĩ đáp án… ${s}`; }, 1000); }
    } }, ill(o)));
    box.replaceChildren(h("h3", { class: "q-prompt" }, q.prompt), h("div", { class: "opts" }, opts), fb);
  }
  paintProg(); ask();
  return sheet({ title: "Đảo Giam Giữ", sub: "Trả lời đúng 5 câu hỏi để mở 5 ổ khóa và quay về quảng trường", icon: "🔒", style: "game", back: "#/may", backLabel: "Về đảo" },
    h("div", { class: "card jl-head" }, h("span", { class: "mg-big" }, "⛓️"), h("div", {}, h("h3", { style: { margin: 0 } }, "Vì sao em ở đây?"), h("p", { style: { margin: 0 } }, j.reason))), prog, box);
}
