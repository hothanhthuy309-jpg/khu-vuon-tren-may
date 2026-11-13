// Khung giao diện dùng chung cho học sinh: bảng nổi toàn màn hình + Bé Tí Nị ở góc phải.
import { h, autoFit, toast } from "./ui.js";
import { sound } from "./sound.js";
import { api, friendlyError } from "./api.js";
import { loadAllLessons } from "./content.js";

export const ZONE_STYLE = {
  "bai-09": { g: "linear-gradient(120deg,#36c98a,#8ee8bf)", c: "#36c98a", art: "☁️🌸" },
  "bai-10": { g: "linear-gradient(120deg,#2f9ff0,#8fd3ff)", c: "#2f9ff0", art: "🧊💧💨" },
  "bai-11": { g: "linear-gradient(120deg,#56b8ff,#b4e2ff)", c: "#56b8ff", art: "🌬️🫧" },
  "bai-12": { g: "linear-gradient(120deg,#f0784a,#ffb38f)", c: "#f0784a", art: "🔩🪟🛞" },
  "bai-13": { g: "linear-gradient(120deg,#8a6cf0,#c3b2ff)", c: "#8a6cf0", art: "⛏️🪨💎" },
  "bai-14": { g: "linear-gradient(120deg,#ff5f4a,#ffb35a)", c: "#ff5f4a", art: "🔥🪵⛽" },
  "bai-15": { g: "linear-gradient(120deg,#f2a91c,#ffd96a)", c: "#f2a91c", art: "🍚🥦🍳" },
  "bai-16": { g: "linear-gradient(120deg,#ff6aa8,#ffb3d2)", c: "#ff6aa8", art: "🎨🧂💧" },
  "bai-17": { g: "linear-gradient(120deg,#22b49a,#86e6d2)", c: "#22b49a", art: "🔻⚗️💧" },
  lab: { g: "linear-gradient(120deg,#1fbf9a,#7c6cff)", c: "#1fbf9a", art: "⚗️🔬🧪" },
  garden: { g: "linear-gradient(120deg,#4fd69c,#c3f06a)", c: "#4fd69c", art: "🌱" },
  kiln: { g: "linear-gradient(120deg,#ff7a3a,#ffcf3a)", c: "#ff7a3a", art: "🔥" },
  build: { g: "linear-gradient(120deg,#ff7eb6,#ffb38f)", c: "#ff7eb6", art: "🏡" },
  book: { g: "linear-gradient(120deg,#9c7cff,#5bb8ff)", c: "#9c7cff", art: "📒" },
  test: { g: "linear-gradient(120deg,#5b6cff,#9c7cff)", c: "#5b6cff", art: "📝" },
  game: { g: "linear-gradient(120deg,#2f2346,#7351e6)", c: "#7351e6", art: "🎮" },
};
export const zs = id => ZONE_STYLE[id] || ZONE_STYLE.book;

/** Bảng nổi toàn màn hình. tools: các phần tử thêm vào góc phải đầu bảng */
export function sheet({ title, sub = "", icon = "☁️", style = "book", back = "#/may", backLabel = "Về vương quốc", tools = [], seeds = null }, ...body) {
  const soundBtn = h("button", { class: "sheet-x sheet-snd", "aria-label": "Bật tắt âm thanh", onclick: () => {
    if (sound.classMuted) return toast("Cô đã tắt nhạc cả lớp.");
    const on = sound.toggle(); soundBtn.textContent = on ? "🔊" : "🔇"; } }, sound.muted ? "🔇" : "🔊");
  const wrap = h("div", { class: "wrap" }, body), bodyEl = h("div", { class: "sheet-body" }, wrap);
  autoFit(bodyEl, wrap);
  return h("div", { class: "sheet-back" },
    h("section", { class: "sheet", role: "dialog", "aria-label": title },
      h("header", { class: "sheet-head", style: { "--hd": zs(style).g } },
        h("div", { class: "sheet-ic", "aria-hidden": "true" }, icon),
        h("div", { class: "sheet-tt" }, h("h1", { class: "sheet-title" }, title), sub ? h("p", { class: "sheet-sub" }, sub) : null),
        h("div", { class: "sheet-tools" }, seeds != null ? h("span", { class: "pill", title: "Hạt mây" }, "🌰 ", h("span", { class: "seed-count" }, seeds)) : null, tools, soundBtn,
          back ? h("a", { class: "sheet-x", href: back }, "✕ ", h("span", {}, backLabel)) : null)),
      bodyEl));
}

// ===================================================================== Bé Tí Nị
const TINI_SVG = `<svg viewBox="0 0 100 88" aria-hidden="true"><defs><radialGradient id="tng" cx="40%" cy="30%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dfe6ff"/></radialGradient></defs>
  <path d="M22 80q-17 0-17-16 0-14 14-16-2-20 18-24 12-16 30-6 18-6 24 12 15 4 13 22 0 28-22 28z" fill="url(#tng)" stroke="#a9b8e8" stroke-width="2.5"/>
  <ellipse cx="38" cy="53" rx="5.5" ry="7" fill="#2f2346"/><ellipse cx="62" cy="53" rx="5.5" ry="7" fill="#2f2346"/><circle cx="40" cy="50" r="2" fill="#fff"/><circle cx="64" cy="50" r="2" fill="#fff"/>
  <ellipse cx="27" cy="63" rx="6" ry="3.6" fill="#ffadc6"/><ellipse cx="73" cy="63" rx="6" ry="3.6" fill="#ffadc6"/><path d="M42 64q8 8 16 0" stroke="#2f2346" stroke-width="3" fill="#ff8fa8" stroke-linecap="round"/></svg>`;

const TN = { el: null, bubble: null, panel: null, ctx: null, timer: 0, hintIdx: 0, settings: {} };

export function mountTiNi(settings = {}) {
  TN.settings = settings;
  if (TN.el) { TN.el.hidden = false; return; }
  TN.bubble = h("div", { class: "tini-bubble", hidden: true });
  const av = h("button", { class: "tini-av", "aria-label": "Hỏi Bé Tí Nị", html: TINI_SVG, onclick: togglePanel });
  TN.el = h("div", { class: "tini-dock" }, TN.bubble, av);
  document.body.append(TN.el);
  addEventListener("tini:say", e => say(e.detail?.text || e.detail, e.detail?.ms));
}
export function hideTiNi() { if (TN.el) TN.el.hidden = true; closePanel(); }
export function say(text, ms = 7000) {
  if (!TN.bubble || !text) return;
  TN.bubble.replaceChildren(h("span", { class: "tb-name" }, "Bé Tí Nị"), text);
  TN.bubble.hidden = false; clearTimeout(TN.timer);
  TN.timer = setTimeout(() => { TN.bubble.hidden = true; }, ms);
}
/** ngữ cảnh đang học: { lesson, question, theory } để Tí Nị gợi ý đúng chỗ */
export function setTiNiContext(c) { TN.ctx = c; TN.hintIdx = 0; }

function closePanel() { if (TN.panel) { TN.panel.remove(); TN.panel = null; } }
function togglePanel() {
  sound.play("bam");
  if (TN.panel) return closePanel();
  TN.panel = h("div", { class: "tini-panel", role: "dialog", "aria-label": "Trò chuyện với Bé Tí Nị" }, tiniChat({ onClose: closePanel }));
  document.body.append(TN.panel);
}

/** Khung chat Tí Nị đặt cạnh câu hỏi. getHint() lấy gợi ý theo đúng 3 bậc đã duyệt, không bao giờ đưa đáp án. */
export function tiniChat({ getHint = null, onClose = null } = {}) {
  const msgs = h("div", { class: "tini-msgs", "aria-live": "polite" });
  const add = (text, me = false) => { msgs.append(h("div", { class: "tini-msg" + (me ? " me" : "") }, text)); msgs.scrollTop = msgs.scrollHeight; };
  const input = h("input", { placeholder: "Hỏi Tí Nị…", maxlength: 200, "aria-label": "Câu hỏi cho Tí Nị" });
  let mode = "ask", local = 0;
  const q = TN.ctx?.question;
  const hintBtn = h("button", { type: "button", class: "tq-hint", onclick: () => {
    let r = getHint ? getHint() : null;
    if (!getHint && q?.hints && local < q.hints.length) r = { level: local + 1, total: q.hints.length, text: q.hints[local++] };
    add("Cho mình gợi ý với!", true);
    if (r) { add(`Gợi ý bậc ${r.level}/${r.total}: ${r.text}`); sound.play("ting"); }
    else add("Tí Nị đã gợi ý đủ 3 bậc rồi. Em đọc lại câu hỏi, thử loại trừ từng phương án nhé! Mình không nói đáp án đâu.");
    const left = r ? r.total - r.level : 0;
    hintBtn.textContent = left > 0 ? `💡 Gợi ý bậc ${r.level + 1}` : "💡 Hết gợi ý"; hintBtn.disabled = left <= 0;
  } }, "💡 Gợi ý bậc 1");
  const quick = h("div", { class: "tini-quick" },
    q || getHint ? hintBtn : null,
    TN.ctx?.theory ? h("button", { type: "button", onclick: () => { add("Nhắc lại ý chính giúp mình!", true); add(TN.ctx.theory.card || TN.ctx.theory.intro); } }, "📖 Ý chính") : null,
    h("button", { type: "button", onclick: () => { const t = TN.ctx?.theory; add("Mình muốn dạy lại cho Tí Nị!", true);
      add(t ? `Tí Nị quên mất rồi: "${t.title || "phần này"}" là gì nhỉ? Em giải thích bằng lời của em nhé.` : "Em chọn một điều vừa học và giải thích cho Tí Nị nghe nhé."); mode = "teach"; input.focus(); } }, "🎓 Dạy lại Tí Nị"));
  const form = h("form", { class: "tini-form", onsubmit: async e => {
    e.preventDefault(); const t = input.value.trim(); if (!t) return; input.value = ""; add(t, true);
    const m = mode; mode = "ask"; add(await askTiNi(m, { text: t }));
  } }, input, h("button", { class: "btn btn-main btn-tiny", type: "submit" }, "Gửi"));
  const el = h("div", { class: "tini-chat" },
    h("div", { class: "tini-ph" }, h("span", { class: "tini-face", html: TINI_SVG }), h("div", {}, h("b", {}, "Bé Tí Nị"), h("small", {}, "Gợi ý 3 bậc · không lộ đáp án")), onClose ? h("button", { onclick: onClose, "aria-label": "Đóng" }, "✕") : null),
    msgs, quick, form);
  add(q || getHint ? "Mình ở đây! Kẹt chỗ nào cứ bấm Gợi ý, mình gợi từ dễ tới rõ dần. Mình không nói đáp án đâu nha." : "Chào em! Em muốn hỏi gì về bài học nào?");
  return el;
}

/** Hỏi AI (nếu cô bật và máy chủ có khóa), nếu không thì trả lời bằng gợi ý soạn sẵn */
export async function askTiNi(mode, { text }) {
  const c = TN.ctx || {}, q = c.question;
  const payload = { mode, text: String(text || "").slice(0, 400), lesson: c.lessonTitle || "", theory: c.theory ? [c.theory.intro, ...(c.theory.points || [])].join(" ") : "",
    question: q ? { prompt: q.prompt || q.text, level: q.level } : null, hints: q?.hints || [], answer: q ? correctText(q) : "" };
  if (TN.settings.aiMode === "ai") {
    try { const r = await api.tiniAsk(payload); if (r && r.text) return r.text; }
    catch (e) { if (/het_luot/.test(e.message)) return "Hôm nay em hỏi Tí Nị nhiều quá rồi, mai mình nói tiếp nhé! Giờ em thử tự nghĩ hoặc hỏi cô giáo nha."; }
  }
  return localReply(mode, payload);
}
function correctText(q) {
  if (q.type === "mcq") return (q.options.find(o => o.correct) || {}).text || "";
  if (q.type === "fill") return q.blanks.map(b => b.answer).join(", ");
  return "";
}
const norm = s => String(s).toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(w => w.length > 1);
async function localReply(mode, p) {
  if (mode === "teach") {
    const words = norm(p.text), theory = new Set(norm(p.theory));
    const hit = words.filter(w => theory.has(w)).length;
    const crit = [["Dùng đúng từ khóa của bài", hit >= 3], ["Có ví dụ hoặc con số", /\d|ví dụ|như là|chẳng hạn/i.test(p.text)], ["Viết bằng lời của em, đủ ý", p.text.length >= 40]];
    return `Cảm ơn em đã dạy Tí Nị! ${crit.map(([t, ok]) => (ok ? "✅ " : "🌱 ") + t).join(" · ")}. ${crit.every(c => c[1]) ? "Tí Nị hiểu rồi, em giảng hay quá!" : "Em thêm một ví dụ nữa là Tí Nị hiểu hẳn luôn!"}`;
  }
  // hỏi tự do: tìm ý trong lý thuyết các bài gần với câu hỏi nhất
  const words = new Set(norm(p.text)); let best = null;
  try {
    const all = await loadAllLessons();
    Object.values(all).forEach(L => L.seeds.forEach(s => [s.theory.intro, ...s.theory.points].forEach(pt => {
      const score = norm(pt).filter(w => words.has(w)).length;
      if (score > (best?.score || 1)) best = { score, pt, where: `${L.zone} · ${s.title}` };
    })));
  } catch {}
  if (best) return `Tí Nị tìm được ý này trong ${best.where}: "${best.pt}" Em đọc lại phần đó nhé!`;
  return "Câu hỏi hay quá! Tí Nị chưa chắc chắn, em hỏi thêm cô giáo hoặc xem lại Sổ tay nhé.";
}
