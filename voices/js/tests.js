// Kiểm tra đầu/cuối bài (8 câu/bài) và bài kiểm tra cô giao cho cả lớp. Không có gợi ý, mỗi câu làm một lần.
import { h, btn, tiNi, shuffle, rainbow, toast } from "./ui.js";
import { sound } from "./sound.js";
import { loadMap, loadLesson } from "./content.js";
import { renderQuestion } from "./quiz.js";
import { sheet } from "./shell.js";
import { ST, commit, flush, totalSeeds, isOpen } from "./student.js";

export const TEST_SIZE = 8;
/** 8 câu đầu tiên của bài (theo thứ tự hạt 1 → hạt 3), xáo trộn khi làm */
export async function lessonTestQuestions(lessonId) {
  const L = await loadLesson(lessonId); if (!L) return [];
  return L.seeds.flatMap(s => s.questions.map(q => ({ ...q, _key: `${lessonId}/${s.id}/${q.id}`, _seed: s.id }))).slice(0, TEST_SIZE);
}

function runner({ title, sub, style, questions, onEnd, back, logKind, lesson }) {
  const qs = shuffle(questions); let i = 0, right = 0; const wrong = [];
  // phát hiện rời trang khi đang kiểm tra (nghi gian lận): 2 lần trở lên thì bị đưa ra Đảo Giam Giữ
  let leave = 0; const onVis = () => { if (document.visibilityState !== "hidden" || i >= qs.length) return; leave++;
    if (leave === 1) toast("Em không rời khỏi bài kiểm tra nhé! Lần sau sẽ bị đưa ra Đảo Giam Giữ.", "bad", 5000);
    if (leave >= 2 && !(ST.state.jail && !ST.state.jail.freed)) { ST.state.jail = { at: Date.now(), reason: "Rời khỏi bài kiểm tra nhiều lần (nghi gian lận)", freed: false }; commit(); } };
  document.addEventListener("visibilitychange", onVis);
  const body = h("div", {}), bar = h("i", { style: { width: "0%" } }), count = h("b", {});
  function show() {
    if (!document.body.contains(body) && i > 0) document.removeEventListener("visibilitychange", onVis);
    bar.style.width = (i / qs.length * 100) + "%"; count.textContent = `Câu ${Math.min(i + 1, qs.length)}/${qs.length}`;
    if (i >= qs.length) return end();
    const q = qs[i];
    body.replaceChildren(h("div", { class: "card" }, renderQuestion(q, {
      mode: "test", label: `Câu ${i + 1}`,
      onResult: r => { if (r.correct) right++; else wrong.push(q._key || q.prompt); ST.logQ.push({ lesson: lesson || "giao", seed: q._seed || "", qid: q.id || "q" + i, kind: logKind, correct: r.correct, firstTry: true, code: r.code || "" }); commit(); },
      onDone: () => { i++; show(); },
    })));
  }
  function end() {
    sound.play(right / qs.length >= 0.8 ? "reo" : "chuong"); if (right / qs.length >= 0.8) rainbow();
    onEnd({ score: right, total: qs.length, at: Date.now(), wrong }); flush();
    body.replaceChildren(h("div", { class: "card center" }, tiNi(110), h("h1", {}, "Hoàn thành bài kiểm tra!"),
      h("div", { class: "score-big" }, `${right}/${qs.length}`),
      h("p", { class: "lead" }, right === qs.length ? "Tuyệt đối! Em nắm bài rất chắc." : right / qs.length >= 0.6 ? "Khá lắm! Xem lại vài câu chưa đúng trong khu học nhé." : "Không sao cả, đây là để biết mình cần học thêm gì. Cố lên nhé!"),
      h("div", { class: "actions center" }, btn("Xong", () => location.hash = back, "btn btn-main btn-big"))));
  }
  show();
  return sheet({ title, sub, icon: "📝", style, back, backLabel: "Thoát", seeds: totalSeeds() },
    h("div", { class: "test-head" }, count, h("div", { class: "test-progress progress" }, bar)), body);
}

export async function testScreen(lessonId, kind) {
  if (!isOpen(lessonId) || !ST.settings.tests?.[lessonId]?.[kind]) { location.hash = "#/khu/" + lessonId; return null; }
  const key = `${lessonId}:${kind}`;
  if (ST.state.tests[key]) { location.hash = "#/khu/" + lessonId; return null; }
  const map = await loadMap(); const z = map.zones.find(z => z.id === lessonId);
  const qs = await lessonTestQuestions(lessonId);
  return runner({ title: (kind === "pre" ? "Kiểm tra đầu bài · " : "Kiểm tra cuối bài · ") + z.zone, sub: `Bài ${z.num}. ${z.title} · ${qs.length} câu, không có gợi ý`, style: "test", questions: qs, back: "#/khu/" + lessonId, logKind: kind, lesson: lessonId,
    onEnd: r => { ST.state.tests[key] = { ...r, at: Date.now() }; commit(); } });
}

export function assignScreen() {
  const a = ST.settings.assign;
  if (!a || !a.open || !a.questions?.length) { location.hash = "#/may"; return null; }
  if (ST.state.assign[a.id]) {
    const r = ST.state.assign[a.id];
    return sheet({ title: a.title, sub: "Bài kiểm tra cô giao", icon: "📝", style: "test", seeds: totalSeeds() },
      h("div", { class: "card center" }, h("h2", {}, "Em đã nộp bài này rồi"), h("div", { class: "score-big" }, `${r.score}/${r.total}`), btn("Về vương quốc", () => location.hash = "#/may", "btn btn-main")));
  }
  return runner({ title: a.title, sub: `Bài kiểm tra cô giao · ${a.questions.length} câu`, style: "test", questions: a.questions.map((q, i) => ({ ...q, id: q.id || "g" + i })), back: "#/may", logKind: "assign", lesson: "giao",
    onEnd: r => { ST.state.assign[a.id] = r; ST.state.tests["giao:" + a.id] = r; const ls = (ST.settings.open || []), L = ls[ls.length - 1] || "bai-09"; ST.state.cloudSeeds[L] = (ST.state.cloudSeeds[L] || 0) + 2; commit(); toast("🎁 Hoàn thành bài cô giao: tặng em 2 hạt mây để gieo ở Vườn Mây!", "ok", 5000); } });
}

// ================================================================== Khảo sát: cô bật thì em phải làm xong mới dùng được chức năng khác
export const SURVEY_Q = ["Em thích học trên Khu vườn trên mây", "Bài học dễ hiểu", "Gợi ý của Tí Nị giúp em hiểu bài", "Thí nghiệm, mô phỏng giúp em nhớ bài", "Trò chơi giúp em ôn bài vui hơn", "Em muốn tiếp tục học theo cách này"];
export function surveyScreen() {
  const sv = ST.settings.survey; if (!sv || !sv.on) { location.hash = "#/may"; return null; }
  const done = (ST.state.surveys ||= {})[sv.id];
  if (done) return sheet({ title: "Khảo sát", icon: "📋", style: "test" }, h("div", { class: "card center" }, h("h2", {}, "Cảm ơn em đã góp ý! 💖"), btn("Về vương quốc", () => location.hash = "#/may", "btn btn-main")));
  const qs = sv.questions?.length ? sv.questions : SURVEY_Q, ans = qs.map(() => 0), face = ["😞", "🙁", "😐", "🙂", "😍"];
  const rows = qs.map((q, i) => { const bs = face.map((f, k) => h("button", { class: "sv-f", title: k + 1 + " sao", onclick: () => { ans[i] = k + 1; bs.forEach((b, j) => b.classList.toggle("on", j === k)); } }, f));
    return h("div", { class: "sv-row" }, h("b", {}, `${i + 1}. ${q}`), h("div", { class: "sv-faces" }, bs)); });
  const cm = h("textarea", { rows: 3, maxlength: 300, placeholder: "Em muốn góp ý thêm điều gì cho cô? (không bắt buộc)" });
  return sheet({ title: "Khảo sát của cô", sub: "Em làm xong khảo sát mới dùng được các chức năng khác nhé", icon: "📋", style: "test", back: null },
    h("div", { class: "card" }, ...rows, cm, h("div", { class: "actions center" }, btn("Gửi khảo sát ✓", () => {
      if (ans.some(a => !a)) return toast("Em chọn mặt cười cho tất cả các câu nhé.", "bad");
      ST.state.surveys[sv.id] = { ans, cm: cm.value.trim().slice(0, 300).replace(/[<>]/g, ""), at: Date.now() }; commit(); flush(); sound.play("reo"); toast("Cảm ơn em! 💖", "ok"); location.hash = "#/may"; }, "btn btn-main btn-big"))));
}

// ================================================================== Kiểm tra 15 phút (học sinh)
export function kt15Screen() {
  const K = ST.settings.kt15; if (!K) { location.hash = "#/may"; return null; }
  const A = (ST.state.kt15 ||= {}), r = A[K.id] ||= { ans: [], ess: [] }; const L = "ABCDEFGH";
  const box = h("div", {});
  function result() {
    const ok = K.mcq.filter((q, i) => r.ans[i] === q.correct).length, g = K.grades?.[ST.profile.id];
    const tn = K.mcq.length ? Math.round(ok / K.mcq.length * K.mcqPts * 4) / 4 : 0, tl = (g?.essay || []).reduce((a, b) => a + (+b || 0), 0);
    box.replaceChildren(h("div", { class: "card center" }, h("h2", {}, "✅ Em đã nộp bài"), h("p", {}, `Trắc nghiệm: đúng ${ok}/${K.mcq.length} câu → ${tn}/${K.mcqPts} điểm`),
      K.published ? h("div", {}, h("div", { class: "mg-big" }, `${tn + tl} điểm`), K.essays.length ? h("p", {}, `Tự luận: ${tl} điểm`) : null, g?.cmt ? h("p", { class: "lead" }, "💬 Cô nhận xét: " + g.cmt) : null)
        : K.essays.length ? h("p", { class: "lead" }, "⏳ Phần tự luận đang chờ cô chấm. Khi cô công bố, điểm sẽ hiện ở đây.") : null,
      btn("Về vương quốc", () => location.hash = "#/may", "btn btn-main")),
      K.published ? h("div", { class: "card" }, h("h3", {}, "Xem lại phần trắc nghiệm"), ...K.mcq.map((q, i) => h("p", { class: "small" }, `${i + 1}. ${q.prompt} → em chọn ${r.ans[i] == null ? "–" : L[r.ans[i]]} ${r.ans[i] === q.correct ? "✅" : "❌ (đúng: " + L[q.correct] + ". " + q.options[q.correct] + ")"}`))) : null);
  }
  if (r.done) { result(); return sheet({ title: K.title, icon: "⏱️", style: "test" }, box); }
  if (!K.open) { box.replaceChildren(h("div", { class: "card center" }, h("h2", {}, "Bài đã đóng"))); return sheet({ title: K.title, icon: "⏱️", style: "test" }, box); }
  const clock = h("b", { class: "kt-clock" });
  function submit(auto) { r.done = true; r.at = Date.now(); commit(); flush(); sound.play("reo"); toast(auto ? "⏰ Hết giờ! Bài đã được nộp tự động." : "Đã nộp bài!", "ok", 4000); result(); }
  function start() {
    r.start ||= Date.now(); commit(); flush();
    const end = r.start + (K.minutes || 15) * 60000;
    const items = K.mcq.map((q, i) => h("div", { class: "card kt-q" }, h("b", {}, `Câu ${i + 1}. ${q.prompt}`), h("div", { class: "kt-opts" }, q.options.map((o, k) => h("label", { class: "kt-opt" },
      h("input", { type: "radio", name: "q" + i, checked: r.ans[i] === k, onchange: () => { r.ans[i] = k; commit(); } }), `${L[k]}. ${o}`)))));
    const ess = K.essays.map((e, j) => h("div", { class: "card kt-q" }, h("b", {}, `Tự luận ${j + 1} (${e.pts}đ). ${e.prompt}`), h("textarea", { rows: 4, value: r.ess[j] || "", oninput: ev => { r.ess[j] = ev.target.value.slice(0, 2000); commit(); } }, r.ess[j] || "")));
    box.replaceChildren(h("div", { class: "kt-top" }, "⏱️ Còn lại: ", clock), ...items, ...ess, h("div", { class: "actions center" }, btn("📤 Nộp bài", () => { const miss = K.mcq.filter((_, i) => r.ans[i] == null).length; if (miss && !confirm(`Em còn ${miss} câu trắc nghiệm chưa chọn. Vẫn nộp?`)) return; submit(false); }, "btn btn-main btn-big")));
    const tm = setInterval(() => { if (!box.isConnected || r.done) return clearInterval(tm); const left = Math.max(0, end - Date.now()); clock.textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}`; clock.classList.toggle("hurry", left < 60000); if (!left) { clearInterval(tm); submit(true); } }, 500);
  }
  if (r.start) start(); else box.replaceChildren(h("div", { class: "card center" }, h("h2", {}, "⏱️ " + K.title), h("p", { class: "lead" }, `${K.mcq.length} câu trắc nghiệm + ${K.essays.length} câu tự luận · ${K.minutes || 15} phút. Bấm Bắt đầu là đồng hồ chạy, hết giờ tự nộp bài.`), btn("▶ Bắt đầu làm bài", start, "btn btn-main btn-big")));
  return sheet({ title: K.title, sub: "Làm xong mới dùng được chức năng khác", icon: "⏱️", style: "test", back: null }, box);
}
