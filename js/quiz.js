// 4 dạng câu: trắc nghiệm (mcq), điền khuyết (fill), ghép thẻ (match), phân loại (classify)
import { h, btn, shuffle, tiNi, modal } from "./ui.js";
import { sound } from "./sound.js";

const LEVEL = { biet: "Biết", hieu: "Hiểu", vandung: "Vận dụng" };
const PAIR_COLORS = ["#ffd6a5", "#bde0fe", "#caffbf", "#e3d0ff", "#ffc6d9", "#fdffb6"];

function buildMcq(q) {
  let sel = null; const opts = shuffle(q.options.map((o, i) => ({ ...o, i })));
  const btns = opts.map(o => h("button", { class: "opt", onclick: () => { sound.play("bam"); sel = o; btns.forEach(b => b.classList.toggle("on", b === btns[opts.indexOf(o)])); } }, ill(o.text)));
  const el = h("div", { class: "opts" }, btns);
  return {
    el,
    read: () => sel ? { complete: true, correct: !!sel.correct, code: sel.code } : { complete: false },
    mark: r => btns.forEach((b, i) => { b.classList.remove("ok", "bad"); if (opts[i] === sel) b.classList.add(r.correct ? "ok" : "bad"); }),
    reveal: () => btns.forEach((b, i) => opts[i].correct && b.classList.add("hint-ok")),
    lock: () => btns.forEach(b => b.disabled = true),
  };
}

function buildFill(q) {
  const vals = q.blanks.map(() => null); let active = 0;
  const blankEls = [];
  const parts = q.text.split(/(\{\d+\})/).map(p => {
    const m = p.match(/^\{(\d+)\}$/);
    if (!m) return p;
    const i = +m[1];
    const b = h("button", { class: "blank", onclick: () => { sound.play("bam"); if (vals[i]) vals[i] = null; active = i; paint(); } }, "______");
    blankEls[i] = b; return b;
  });
  const chips = shuffle(q.choices).map(c => h("button", { class: "chip", onclick: () => {
    sound.play("bam"); vals[active] = c; const next = vals.findIndex(v => !v); active = next < 0 ? active : next; paint();
  } }, c));
  function paint() {
    blankEls.forEach((b, i) => { b.textContent = vals[i] || "______"; b.classList.toggle("active", i === active); b.classList.toggle("filled", !!vals[i]); b.classList.remove("ok", "bad"); });
  }
  paint();
  return {
    el: h("div", {}, h("p", { class: "fill-text" }, parts), h("div", { class: "chips" }, chips)),
    read: () => {
      if (vals.some(v => !v)) return { complete: false };
      const bad = q.blanks.findIndex((b, i) => vals[i] !== b.answer);
      if (bad < 0) return { complete: true, correct: true };
      const code = q.blanks[bad].wrong?.[vals[bad]] || Object.values(q.blanks[bad].wrong || {})[0];
      return { complete: true, correct: false, code, badIdx: q.blanks.map((b, i) => vals[i] !== b.answer) };
    },
    mark: r => blankEls.forEach((b, i) => b.classList.add(r.correct || !r.badIdx[i] ? "ok" : "bad")),
    reveal: () => { q.blanks.forEach((b, i) => vals[i] = b.answer); paint(); },
    lock: () => [...blankEls, ...chips].forEach(b => b.disabled = true),
  };
}

function buildClassify(q) {
  const place = q.items.map(() => null); let sel = null;
  const itemEls = q.items.map((it, i) => h("button", { class: "chip", onclick: e => {
    e.stopPropagation(); sound.play("bam");
    // Đang cầm một thẻ khác mà bấm vào thẻ nằm trong nhóm: coi như bấm vào nhóm đó
    if (sel != null && sel !== i && place[i] != null) { place[sel] = place[i]; sound.play("tach"); sel = null; }
    else if (place[i] != null) { place[i] = null; sel = i; } else sel = sel === i ? null : i;
    paint();
  } }, ill(it.text)));
  const order = shuffle(q.items.map((_, i) => i));
  const tray = h("div", { class: "tray" });
  const groups = q.groups.map((g, gi) => {
    const body = h("div", { class: "group-body" });
    const box = h("div", { class: "group", role: "button", tabindex: "0", onclick: () => { if (sel != null) { place[sel] = gi; sound.play("tach"); sel = null; paint(); } } },
      h("div", { class: "group-title" }, g), body);
    box._body = body; return box;
  });
  function paint() {
    tray.replaceChildren(); groups.forEach(g => g._body.replaceChildren());
    order.forEach(i => {
      const el = itemEls[i]; el.classList.toggle("on", sel === i);
      (place[i] == null ? tray : groups[place[i]]._body).append(el);
    });
    if (!tray.children.length) tray.append(h("span", { class: "muted" }, "Đã xếp hết. Bấm vào thẻ để đổi chỗ."));
    groups.forEach(g => g.classList.toggle("target", sel != null));
  }
  paint();
  return {
    el: h("div", {}, h("p", { class: "muted small" }, "Bấm một thẻ, rồi bấm vào nhóm đúng."), tray, h("div", { class: "groups", style: { gridTemplateColumns: `repeat(${q.groups.length}, 1fr)` } }, groups)),
    read: () => {
      if (place.some(p => p == null)) return { complete: false };
      const bad = q.items.findIndex((it, i) => place[i] !== it.group);
      return bad < 0 ? { complete: true, correct: true } : { complete: true, correct: false, code: q.items[bad].code, badIdx: q.items.map((it, i) => place[i] !== it.group) };
    },
    mark: r => itemEls.forEach((el, i) => { el.classList.remove("ok", "bad"); el.classList.add(r.correct || !r.badIdx[i] ? "ok" : "bad"); }),
    reveal: () => { q.items.forEach((it, i) => place[i] = it.group); sel = null; paint(); },
    lock: () => itemEls.forEach(b => b.disabled = true),
  };
}

function buildMatch(q) {
  const link = q.pairs.map(() => null); // left i -> right index (original)
  let selL = null;
  const rightOrder = shuffle(q.pairs.map((_, i) => i));
  const L = q.pairs.map((p, i) => h("button", { class: "mcard", onclick: () => { sound.play("bam"); if (link[i] != null) link[i] = null; selL = i; paint(); } }, ill(p.left)));
  const R = rightOrder.map(ri => h("button", { class: "mcard", onclick: () => {
    if (selL == null) return; sound.play("tach");
    const prev = link.indexOf(ri); if (prev >= 0) link[prev] = null;
    link[selL] = ri; selL = link.findIndex(v => v == null); if (selL < 0) selL = null; paint();
  } }, q.pairs[ri].right));
  function paint() {
    L.forEach((b, i) => { b.classList.toggle("on", selL === i); b.style.background = link[i] != null ? PAIR_COLORS[i % 6] : ""; b.classList.remove("ok", "bad"); });
    R.forEach((b, k) => { const li = link.indexOf(rightOrder[k]); b.style.background = li >= 0 ? PAIR_COLORS[li % 6] : ""; b.classList.remove("ok", "bad"); });
  }
  selL = 0; paint();
  return {
    el: h("div", {}, h("p", { class: "muted small" }, "Bấm thẻ bên trái, rồi bấm thẻ bên phải hợp với nó."), h("div", { class: "match" }, h("div", { class: "mcol" }, L), h("div", { class: "mcol" }, R))),
    read: () => {
      if (link.some(v => v == null)) return { complete: false };
      const badIdx = link.map((ri, i) => ri !== i);
      return badIdx.some(Boolean) ? { complete: true, correct: false, code: q.code, badIdx } : { complete: true, correct: true };
    },
    mark: r => L.forEach((b, i) => b.classList.add(r.correct || !r.badIdx[i] ? "ok" : "bad")),
    reveal: () => { q.pairs.forEach((_, i) => link[i] = i); selL = null; paint(); },
    lock: () => [...L, ...R].forEach(b => b.disabled = true),
  };
}

const BUILDERS = { mcq: buildMcq, fill: buildFill, classify: buildClassify, match: buildMatch };

/**
 * Hiện một câu hỏi.
 * mode: "seed" (học lần đầu), "practice" (học lại), "weed" (nhổ cỏ: không có Tí Nị, sai 2 lần mới xem lời giải)
 * onResult({correct, code, attempt}) gọi sau mỗi lần Kiểm tra; onDone() khi em bấm Tiếp tục.
 */
// Hình minh họa nhỏ (emoji) cho thẻ ngắn: "Hòn đá" → 🪨 Hòn đá
const ILL = [["đá cuội|hòn đá|viên đá|đá vôi", "🪨"], ["vở|sách", "📒"], ["xe đạp", "🚲"], ["bút chì|bút", "✏️"], ["mía", "🎋"], ["con cá|cá", "🐟"], ["cây|gỗ|củi", "🌳"], ["nước đá|đá lạnh|băng", "🧊"], ["hơi nước|hơi", "💨"],
  ["nước chanh|chanh", "🍋"], ["nước|giọt", "💧"], ["dầu", "🛢️"], ["muối", "🧂"], ["đường", "🍬"], ["sữa", "🥛"], ["gạo|cơm", "🍚"], ["thịt", "🥩"], ["rau", "🥬"], ["trứng", "🥚"], ["cam", "🍊"], ["kem", "🍦"],
  ["nến|sáp", "🕯️"], ["lửa|cháy|đốt", "🔥"], ["khí gas|gas", "⛽"], ["than", "⚫"], ["xăng", "⛽"], ["oxygen|không khí", "🌬️"], ["thủy tinh|kính|cốc", "🥛"], ["sắt|thép|đinh", "🔩"], ["đồng|dây điện|điện", "⚡"], ["nhựa", "🧴"],
  ["cao su|lốp", "🛞"], ["gạch", "🧱"], ["xi măng", "🏗️"], ["gốm|sứ|bát", "🏺"], ["cát", "🏖️"], ["đất", "🟫"], ["quặng|mỏ", "⛏️"], ["điện thoại", "📱"], ["nhà", "🏠"], ["người|cơ thể", "🧍"], ["mặt trời|nắng", "☀️"], ["bông", "☁️"], ["quần áo|áo", "👕"]];
export function ill(text) {
  const t = String(text || ""); if (t.split(/\s+/).length > 5) return t;
  const low = t.toLowerCase(); const hit = ILL.find(([k]) => new RegExp("(^|\\s)(" + k + ")(\\s|$)", "u").test(low));
  return hit ? hit[1] + " " + t : t;
}
export function renderQuestion(q, { mode = "seed", onResult, onDone, theory, label, chat = false } = {}) {
  const b = BUILDERS[q.type](q);
  let attempts = 0, hintLevel = 0, done = false;
  const fb = h("div", { class: "feedback", "aria-live": "polite" });
  const hintBox = h("div", { class: "hints" });
  const actions = h("div", { class: "actions" });

  const checkBtn = btn("Kiểm tra", check, "btn btn-main");
  const hintBtn = !chat && mode !== "weed" && mode !== "test" ? btn("💬 Hỏi Tí Nị", showHint, "btn btn-soft") : null;
  const theoryBtn = mode === "weed" && theory ? btn("📖 Xem lại lý thuyết", () => modal(theory), "btn btn-soft") : null;
  const solveBtn = btn("👀 Xem lời giải", solve, "btn btn-soft hidden");
  actions.append(...[hintBtn, theoryBtn, solveBtn, checkBtn].filter(Boolean));

  function showHint() {
    if (hintLevel >= q.hints.length) return;
    hintBox.append(h("div", { class: "hint" }, tiNi(40, "nghi"), h("div", {}, h("b", {}, `Gợi ý ${hintLevel + 1}/3: `), q.hints[hintLevel])));
    window.dispatchEvent(new CustomEvent("tini:say", { detail: { text: `Gợi ý ${hintLevel + 1}: ${q.hints[hintLevel]}`, ms: 9000 } }));
    hintLevel++; if (hintLevel >= q.hints.length && hintBtn) hintBtn.disabled = true;
  }
  // Tí Nị trong khung chat lấy gợi ý từng bậc (không bao giờ đưa đáp án)
  function nextHint() { if (hintLevel >= (q.hints || []).length) return null; const t = q.hints[hintLevel]; hintLevel++; return { level: hintLevel, total: q.hints.length, text: t }; }
  function solve() {
    b.reveal(); solveBtn.classList.add("hidden");
    fb.className = "feedback fb-info"; fb.replaceChildren(h("b", {}, "Lời giải: "), q.explain, h("div", { class: "small muted" }, "Em xem kĩ rồi bấm Kiểm tra nhé."));
  }
  function check() {
    if (done) return;
    const r = b.read();
    if (!r.complete) { fb.className = "feedback fb-info"; fb.textContent = "Em hoàn thành hết các chỗ trước khi kiểm tra nhé."; return; }
    attempts++;
    b.mark(r);
    onResult && onResult({ correct: r.correct, code: r.code, attempt: attempts });
    if (mode === "test") {
      done = true; b.lock(); if (!r.correct) b.reveal();
      sound.play(r.correct ? "ting" : "sai");
      fb.className = "feedback " + (r.correct ? "fb-ok" : "fb-bad");
      fb.replaceChildren(h("b", {}, r.correct ? "Đúng rồi! " : "Chưa đúng. "), q.explain || "");
      actions.replaceChildren(btn("Câu tiếp theo ➜", () => onDone && onDone(), "btn btn-main"));
      return;
    }
    if (r.correct) {
      done = true; sound.play("ting"); b.lock();
      fb.className = "feedback fb-ok";
      fb.replaceChildren(h("div", { class: "fb-head" }, tiNi(44), h("b", {}, attempts === 1 ? "Đúng ngay! Giỏi quá!" : "Đúng rồi! Em đã tự sửa được.")), h("p", {}, q.explain));
      actions.replaceChildren(btn("Tiếp tục ➜", () => onDone && onDone(), "btn btn-main"));
    } else {
      sound.play("sai");
      fb.className = "feedback fb-bad";
      fb.replaceChildren(h("b", {}, "Chưa đúng rồi. "), mode === "weed" ? "Em thử lại nhé, có thể xem lại lý thuyết." : "Em thử lại nhé, bấm Hỏi Tí Nị nếu cần gợi ý.",
        h("div", { class: "small" }, q.type !== "mcq" ? "Những thẻ màu hồng là chỗ cần sửa." : ""));
      if (attempts >= 2) solveBtn.classList.remove("hidden");
    }
  }

  const root = h("div", { class: "question" },
    h("div", { class: "q-meta" }, label ? h("span", { class: "tag" }, label) : null, h("span", { class: `tag tag-${q.level}` }, LEVEL[q.level] || q.level)),
    h("h2", { class: "q-prompt" }, q.prompt),
    b.el, hintBox, fb, actions);
  root.nextHint = nextHint; return root;
}

export function theoryView(seed) {
  return h("div", { class: "theory" },
    h("div", { class: "theory-pic", "aria-hidden": "true" }, seed.theory.picture),
    h("h2", {}, seed.title),
    h("p", {}, seed.theory.intro),
    h("ul", {}, seed.theory.points.map(p => h("li", {}, p))));
}
