// 📘 Sách bài tập KHTN 6: trắc nghiệm, nối, điền từ (tự chấm) và tự luận (tự đối chiếu đáp án gợi ý)
import { h, btn, toast } from "./ui.js";
import { sound } from "./sound.js";
import { sheet, zs } from "./shell.js";
import { loadMap } from "./content.js";
import { renderQuestion } from "./quiz.js";
import { ST, commit, totalSeeds, isOpen, addSeeds } from "./student.js";

let cache = null;
export async function loadSbt() { if (!cache) { try { cache = (await (await fetch("data/sbt.json")).json()).lessons || {}; } catch { cache = {}; } } return cache; }

export async function sbtScreen(lessonId) {
  if (!isOpen(lessonId)) { location.hash = "#/hoc"; return null; }
  const [all, map] = await Promise.all([loadSbt(), loadMap()]); const z = map.zones.find(z => z.id === lessonId), qs = all[lessonId] || [];
  const done = ST.state.sbt ||= {};
  let i = 0;
  const body = h("div", {}), nav = h("div", { class: "sbt-nav" });
  function paintNav() { nav.replaceChildren(...qs.map((q, k) => h("button", { class: "sbt-dot" + (k === i ? " now" : "") + (done[lessonId + "/" + q.id] ? " ok" : ""), onclick: () => { i = k; show(); } }, q.id))); }
  function mark(q, ok) { const key = lessonId + "/" + q.id; if (!done[key] && ok) { done[key] = 1; if (Object.keys(done).filter(k => k.startsWith(lessonId + "/")).length === qs.length) { addSeeds(lessonId, 1); toast("Xong cả bài trong sách bài tập! +1 hạt mây 🌰", "ok"); } } commit(); paintNav(); }
  function show() {
    paintNav(); const q = qs[i]; if (!q) return body.replaceChildren(h("p", { class: "muted" }, "Chưa có bài tập."));
    const next = () => { if (i < qs.length - 1) { i++; show(); } else toast("Đã hết bài tập của bài này 🎉", "ok"); };
    if (q.type === "essay") {
      const ta = h("textarea", { rows: 4, placeholder: "Em viết câu trả lời của mình…" }), ans = h("div", { class: "feedback fb-info", hidden: true }, h("b", {}, "Đáp án gợi ý: "), q.answer);
      body.replaceChildren(h("div", { class: "card" }, h("div", { class: "q-meta" }, h("span", { class: "tag" }, "Bài " + q.id), h("span", { class: "tag" }, "Tự luận")), h("h2", { class: "q-prompt" }, q.prompt), ta,
        h("div", { class: "actions" }, btn("👀 Xem đáp án gợi ý", () => { if (ta.value.trim().length < 5) return toast("Em viết câu trả lời trước rồi mới xem đáp án nhé!"); ans.hidden = false; sound.play("chuong"); mark(q, true); }, "btn btn-soft"), btn("Câu tiếp ➜", next, "btn btn-main")), ans));
    } else {
      body.replaceChildren(h("div", { class: "card" }, renderQuestion({ ...q, hints: q.hints || [] }, { mode: "weed", label: "Bài " + q.id,
        onResult: r => { ST.logQ.push({ lesson: lessonId, seed: "sbt", qid: q.id, kind: "sbt", correct: r.correct, firstTry: r.attempt === 1, code: r.code || "" }); if (r.correct) mark(q, true); else commit(); },
        onDone: next })));
    }
  }
  show();
  return sheet({ title: "Sách bài tập · Bài " + z.num, sub: `${z.title} · ${qs.length} bài tập · trắc nghiệm tự chấm, tự luận xem đáp án gợi ý`, icon: "📘", style: lessonId, seeds: totalSeeds(), back: "#/khu/" + lessonId, backLabel: "Về khu" }, nav, body);
}
