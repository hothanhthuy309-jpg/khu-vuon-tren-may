// Học sinh: trạng thái, đăng nhập, khu bài học, học hạt giống, thí nghiệm, Vườn Mây, Sổ tay
import { api, friendlyError } from "./api.js";
import { h, btn, toast, modal, tiNi, giotSuong, weedSvg, plantSvg, burst, rainbow, shuffle, autoFit } from "./ui.js";
import { can3D } from "./map3d.js";
import { mountGarden3D } from "./garden3d.js";
import { sound } from "./sound.js";
import { PICS, PIC } from "./pics.js";
import { loadMap, loadLesson, weedName } from "./content.js";
import { renderQuestion, theoryView } from "./quiz.js";
import { experimentView } from "./experiment.js";
import { DEFAULT_GROW_SECONDS } from "./config.js";
import { sheet, zs, say, setTiNiContext, tiniChat } from "./shell.js";

// ================================================================== trạng thái
export const ST = { profile: null, state: null, settings: null, logQ: [], timer: null };

function freshState(s) {
  s = s && typeof s === "object" ? s : {};
  return {
    ...s, // giữ mọi dữ liệu khác (thú cưng, giỏ cá, nhiệm vụ…)
    v: 2,
    cloudSeeds: s.cloudSeeds || {}, seeds: s.seeds || {},
    garden: Array.isArray(s.garden) && s.garden.length === 25 ? s.garden : Array(25).fill(null),
    weeds: s.weeds || [], inventory: s.inventory || {}, notebook: s.notebook || [], journal: s.journal || [],
    avatar: s.avatar || null, houses: s.houses || [], kiln: s.kiln || null, order: s.order || null,
    tests: s.tests || {}, assign: s.assign || {}, decor: s.decor || [],
    plaza: s.plaza && Array.isArray(s.plaza.weeds) ? s.plaza : { weeds: [], cleared: 0, last: 0 },
    qpts: s.qpts || {}, flags: s.flags || [], weekCheck: s.weekCheck || "", firstSeen: s.firstSeen || Date.now(), drops: s.drops || 0, owned: s.owned || [], dropsDay: s.dropsDay || { d: "", n: 0 }, jail: s.jail || null, jailFree: s.jailFree || {}, best: s.best || {},
  };
}
export async function startStudent() {
  const r = await api.load();
  ST.profile = { id: r.id, name: r.name, className: r.className, classId: r.classId };
  ST.settings = r.settings || {};
  ST.state = freshState(r.state);
  sound.setClassMuted(ST.settings.mute);
  sound.startBgm("world");
}
export function stopStudent() { sound.stopBgm(); ST.profile = ST.state = ST.settings = null; ST.logQ = []; clearTimeout(ST.timer); }
const listeners = new Set();
export const onStudentChange = f => (listeners.add(f), () => listeners.delete(f));
function refreshHeader() {
  document.querySelectorAll(".seed-count").forEach(c => c.textContent = totalSeeds());
  listeners.forEach(f => { try { f(); } catch {} });
}
export function commit() { refreshHeader(); clearTimeout(ST.timer); ST.timer = setTimeout(flush, 700); }
export async function flush() {
  clearTimeout(ST.timer);
  if (!ST.state) return;
  const rows = ST.logQ.splice(0);
  try { await api.save(ST.state); if (rows.length) await api.log(rows); }
  catch (e) { ST.logQ.unshift(...rows); if (e.message?.includes("het_phien")) { toast(friendlyError(e), "bad"); location.hash = "#/hs"; } }
}
export const totalSeeds = () => Object.values(ST.state.cloudSeeds).reduce((a, b) => a + b, 0);
export const unfixed = () => ST.state.weeds.filter(w => !w.fixed);
const growMs = () => (ST.settings.growSeconds || DEFAULT_GROW_SECONDS) * 1000;
export const isOpen = id => (ST.settings.open || []).includes(id);
export const seedDone = (lesson, seed) => !!ST.state.seeds[`${lesson}/${seed}`]?.done;
export const doneCount = lesson => [1, 2, 3].filter(i => seedDone(lesson, "s" + i)).length;
export const addSeeds = (lesson, n) => { ST.state.cloudSeeds[lesson] = (ST.state.cloudSeeds[lesson] || 0) + n; };
export const have = (need) => Object.entries(need).every(([k, n]) => (ST.state.inventory[k] || 0) >= n);
export const take = (need) => Object.entries(need).forEach(([k, n]) => { ST.state.inventory[k] = (ST.state.inventory[k] || 0) - n; });
export const give = (got) => Object.entries(got).forEach(([k, n]) => { ST.state.inventory[k] = (ST.state.inventory[k] || 0) + n; });
/** gợi ý đã được cô duyệt/sửa (nếu có) thay cho gợi ý soạn sẵn */
export const withHints = (lesson, seed, q) => { const o = ST.settings.hints?.[`${lesson}/${seed}/${q.id}`]; return o && o.length ? { ...q, hints: o } : q; };
export const score = () => (Object.keys(ST.state.qpts).length ? Math.round(Object.values(ST.state.qpts).reduce((a, b) => a + b, 0)) : Object.values(ST.state.seeds).filter(x => x.done).length * 10) + ST.state.weeds.filter(w => w.fixed).length * 5 + ST.state.houses.length * 15 + (ST.state.plaza?.cleared || 0) * 5;

function spawnWeed(lesson, seed, q, code, label) {
  const qid = `${lesson}/${seed}/${q.id}`;
  if (ST.state.weeds.some(w => !w.fixed && w.qid === qid)) return;
  const counts = Array(25).fill(0); unfixed().forEach(w => counts[w.tile]++);
  const min = Math.min(...counts); const cands = counts.map((c, i) => c === min ? i : -1).filter(i => i >= 0);
  const tile = cands[Math.floor(Math.random() * cands.length)];
  ST.state.weeds.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), lesson, seed, qid, code: code || "", label: label || "", tile, bornAt: Date.now(), fixed: false });
}
export async function logoutStudent(msg) {
  await flush(); await api.logout(); stopStudent();
  if (msg) toast(msg); location.hash = "#/hs";
}
const S = (opts, ...body) => sheet({ seeds: totalSeeds(), ...opts }, ...body);

// ================================================================== đăng nhập
export function loginScreen({ compact = false } = {}) {
  const root = h("div", {});
  let code = "", roster = [], who = null, picks = [];
  const savedCode = (() => { try { return localStorage.getItem("kvtm-last-code") || ""; } catch { return ""; } })();
  const card = (...c) => h("div", { class: "card login-card" }, ...c);
  function stepCode() {
    const inp = h("input", { class: "code-input", maxlength: 12, value: savedCode, placeholder: "MÃ LỚP", autocomplete: "off", autocapitalize: "characters", "aria-label": "Mã lớp" });
    inp.addEventListener("input", () => inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
    const go = async () => {
      code = inp.value.trim(); if (code.replace(/-/g, "").length < 3) return toast("Em nhập mã lớp cô cho nhé.");
      try { roster = await api.roster(code); } catch (e) { return toast(friendlyError(e), "bad"); }
      if (!roster.length) return toast("Không thấy lớp có mã này. Em xem lại nhé.", "bad");
      try { localStorage.setItem("kvtm-last-code", code); } catch {}
      stepWho();
    };
    inp.addEventListener("keydown", e => e.key === "Enter" && go());
    root.replaceChildren(card(h("div", { class: "center" }, compact ? null : tiNi(120), compact ? h("label", { class: "hm-lbl" }, "Mã lớp") : h("h1", {}, "Chào em đến Khu vườn trên mây!"), compact ? null : h("p", { class: "lead" }, "Nhập mã lớp cô giáo cho:"), inp,
      h("div", { class: "actions center" }, btn(compact ? "Tiếp tục" : "Vào lớp ➜", go, "btn btn-mint btn-big hm-go")), compact ? h("p", { class: "small muted center" }, "Mã lớp và mật khẩu có trên thẻ thầy cô phát.") : null)));
    setTimeout(() => inp.focus(), 50);
  }
  function stepWho() {
    root.replaceChildren(card(h("h1", {}, `Lớp ${roster[0].class_name}`), h("p", { class: "lead" }, "Em bấm vào tên của mình:"),
      h("div", { class: "roster" }, roster.map(s => btn(s.name, () => { who = s; picks = []; stepPics(); }, "btn btn-name"))),
      h("div", { class: "actions" }, btn("⬅ Đổi mã lớp", stepCode, "btn btn-soft"))));
  }
  function stepPics() {
    const pw = h("input", { type: "password", class: "pw-input", placeholder: "Mật khẩu", autocomplete: "current-password", "aria-label": "Mật khẩu" });
    const go = async () => {
      if (!pw.value.trim()) return toast("Em nhập mật khẩu nhé.");
      try {
        const r = await api.login(code, who.id, pw.value.trim()); sound.resetForLogin(); await startStudent(); sound.play("reo");
        if (r && r.choose) choosePw(); else location.hash = "#/may";
      } catch (e) { sound.play("sai"); toast(friendlyError(e), "bad"); pw.value = ""; pw.focus(); }
    };
    pw.addEventListener("keydown", e => e.key === "Enter" && go());
    root.replaceChildren(card(h("h1", { class: "center" }, `Chào ${who.name}!`), h("p", { class: "lead center" }, "Nhập mật khẩu: lần đầu là mật khẩu chung của lớp (trên thẻ cô phát)."), pw,
      h("div", { class: "actions center" }, btn("Vào vương quốc ➜", go, "btn btn-mint btn-big hm-go"), btn("⬅ Chọn lại tên", stepWho, "btn btn-soft"))));
    setTimeout(() => pw.focus(), 50);
  }
  function choosePw() {
    const a = h("input", { type: "password", placeholder: "Mật khẩu mới (từ 4 kí tự)" }), b = h("input", { type: "password", placeholder: "Nhập lại mật khẩu mới" });
    const m = modal(h("div", {}, h("h2", {}, "🔐 Mật khẩu của em"), h("p", {}, "Em đang dùng mật khẩu chung của lớp. Em có muốn tạo mật khẩu riêng không?"), a, b,
      h("div", { class: "actions" }, btn("Lưu mật khẩu riêng", async () => {
        if (a.value.trim().length < 4) return toast("Mật khẩu cần ít nhất 4 kí tự.");
        if (a.value !== b.value) return toast("Hai lần nhập chưa giống nhau.");
        try { await api.setMyPassword(a.value.trim()); toast("Đã lưu mật khẩu riêng. Lần sau em dùng mật khẩu này nhé!", "ok", 4000); m.close(); } catch (e) { toast(friendlyError(e), "bad"); }
      }, "btn btn-main"), btn("Giữ mật khẩu chung", () => m.close(), "btn btn-soft"))), { onClose: () => { location.hash = "#/may"; } });
  }
  stepCode();
  if (compact) return root;
  const inner = h("div", { class: "login-inner" }, h("a", { class: "back-home", href: "#/" }, "⬅ Trang đầu"), root), page = h("div", { class: "page-login" }, inner);
  autoFit(page, inner, 0.6);
  return page;
}

// ================================================================== danh sách khu (Bài học)
export const SECTIONS = [["Chất quanh ta", "🧊", ["bai-09", "bai-10", "bai-11"]], ["Vật liệu · Nguyên liệu · Nhiên liệu · Lương thực", "🧱", ["bai-12", "bai-13", "bai-14", "bai-15"]], ["Hỗn hợp và tách chất", "🧪", ["bai-16", "bai-17"]]];
export async function lessonsScreen() {
  const map = await loadMap();
  const opened = map.zones.filter(z => isOpen(z.id));
  const secs = SECTIONS.map(([t, ic, ids]) => [t, ic, map.zones.filter(z => ids.includes(z.id) && isOpen(z.id))]).filter(x => x[2].length);
  const card = z => { const n = doneCount(z.id);
    return h("button", { class: "lesson-tile" + (n === 3 ? " done" : ""), onclick: () => location.hash = "#/khu/" + z.id },
      h("span", { class: "lt-ic", style: { background: zs(z.id).g } }, z.icon), h("span", { class: "lt-tx" }, h("b", {}, `Bài ${z.num}. ${z.title}`), h("small", {}, z.zone + " · " + (n === 3 ? "🌈 đã hồi sinh" : n + "/3 hạt giống"))),
      h("span", { class: "progress" }, h("i", { style: { width: n / 3 * 100 + "%" } }))); };
  return S({ title: "Quần đảo Học Tập", sub: `Cô đã mở ${opened.length}/${map.zones.length} bài · chia theo chủ đề`, icon: "📚", style: "book" },
    opened.length ? h("div", { class: "sections" }, secs.map(([t, ic, zs_]) => h("section", { class: "sec" }, h("h3", {}, ic + " " + t), h("div", { class: "lesson-tiles" }, zs_.map(card)))))
      : h("div", { class: "card center" }, tiNi(100), h("h2", {}, "Chưa có bài nào được mở"), h("p", { class: "lead" }, "Khi cô mở bài, các hòn đảo nhỏ sẽ hiện ra ở đây. Trong lúc chờ, em ghé Vườn Mây hoặc dọn cỏ ở quảng trường nhé!")));
}

// ================================================================== bản đồ 2D (điện thoại, máy không chạy 3D)
export async function map2dScreen() {
  const map = await loadMap();
  const zones = map.zones;
  const svgNS = "http://www.w3.org/2000/svg";
  const bridges = document.createElementNS(svgNS, "svg");
  bridges.setAttribute("class", "bridges"); bridges.setAttribute("viewBox", "0 0 100 100"); bridges.setAttribute("preserveAspectRatio", "none");
  for (let i = 0; i < zones.length - 1; i++) {
    const a = zones[i], b = zones[i + 1], p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", `M${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 8} ${b.x} ${b.y}`);
    p.setAttribute("class", isOpen(a.id) && isOpen(b.id) ? "bridge on" : "bridge"); bridges.append(p);
  }
  const islands = zones.map(z => {
    const open = isOpen(z.id), n = doneCount(z.id);
    return h("button", { class: `island ${open ? "open" : "locked"} ${n === 3 ? "restored" : ""}`, style: { left: z.x + "%", top: z.y + "%" },
      "aria-label": `${z.zone}, Bài ${z.num}${open ? "" : ", chưa mở"}`,
      onclick: () => open ? location.hash = "#/khu/" + z.id : toast("Khu này còn phủ sương. Đợi cô mở nhé! ☁️") },
      h("span", { class: "island-ic" }, open ? z.icon : "☁️"), h("span", { class: "island-name" }, z.zone),
      h("span", { class: "island-sub" }, `Bài ${z.num}` + (open ? ` · ${n}/3` : "")), n === 3 ? h("span", { class: "flowers", "aria-hidden": "true" }, "🌸🌼🌸") : null);
  });
  return h("div", { class: "map2d" },
    h("div", { class: "m2-top" }, h("span", { class: "glass" }, h("b", {}, ST.profile.name)), h("span", { class: "glass" }, "🌰 ", h("span", { class: "seed-count" }, totalSeeds())),
      h("span", { style: { flex: 1 } }), h("button", { class: "icon-btn", "aria-label": "Đăng xuất", onclick: () => logoutStudent() }, "🚪")),
    h("div", { class: "map" }, bridges, islands),
    dock2d());
}
export function dock2d() {
  const items = [["#/hoc", "📚", "Bài học"], ["#/vuon", "🌱", "Vườn"], ["#/lo-may", "🔥", "Lò Mây"], ["#/xay-nha", "🏡", "Xây nhà"], ["#/thi-nghiem", "⚗️", "Thí nghiệm"], ["#/ho-ca", "🎣", "Câu cá"], ["#/thu-cung", "🐾", "Thú cưng"], ["#/tro-choi", "🎮", "Trò chơi"], ["#/so-tay", "📒", "Sổ tay"]];
  return h("nav", { class: "m2-dock glass" }, items.map(([href, ic, t]) => h("a", { class: "w-dbtn", href, style: { textDecoration: "none" } }, h("span", { class: "d-ic" }, ic), t)));
}

// ================================================================== một khu
export async function zoneScreen(id) {
  const map = await loadMap(); const z = map.zones.find(z => z.id === id);
  if (!z || !isOpen(id)) { location.hash = "#/may"; return null; }
  const L = await loadLesson(id);
  const n = doneCount(id), st = zs(id);
  const test = ST.settings.tests?.[id] || {};
  const w = unfixed().filter(w => w.lesson === id).length;
  const testCard = (kind, label, ic) => {
    const r = ST.state.tests[`${id}:${kind}`];
    return h("div", { class: "card" }, h("div", { class: "x-ic", style: { background: "#e8e4ff" } }, ic),
      h("div", { style: { flex: 1 } }, h("b", {}, label), h("div", { class: "small muted" }, r ? `Đã làm: ${r.score}/${r.total} câu đúng` : "8 câu · không có gợi ý · làm một lần")),
      r ? h("span", { class: "tag tag-ok" }, "Xong") : btn("Làm bài", () => location.hash = `#/kiem-tra/${id}/${kind}`, "btn btn-lav"));
  };
  return S({ title: z.zone, sub: `Bài ${z.num}. ${L.title}`, icon: z.icon, style: id },
    h("div", { class: "zone-hero" },
      h("div", { class: "zone-art" + (n === 3 ? " restored" : ""), style: { "--hd": st.g, background: st.g } }, h("span", { class: "art-emoji" }, st.art)),
      h("div", { class: "card zone-info" },
        h("h2", {}, n === 3 ? "🌈 Khu đã hồi sinh!" : n ? `Em đã học ${n}/3 hạt giống` : "Chào mừng em đến " + z.zone),
        h("div", { class: "progress" }, h("i", { style: { width: n / 3 * 100 + "%" } })),
        h("p", { class: "lead" }, "Mỗi hạt giống: Khám phá → 3 câu Biết, Hiểu, Vận dụng. Học xong nhận hạt mây để gieo trong Vườn Mây."),
        w ? h("div", { class: "row" }, giotSuong(46), h("span", {}, `Bác Giọt Sương: "Vườn có ${w} bụi cỏ mọc từ bài này, ra nhổ nhé!"`), btn("Ra vườn", () => location.hash = "#/vuon", "btn btn-mint btn-tiny")) : null)),
    test.pre && !ST.state.tests[`${id}:pre`] && !n ? h("div", { class: "alert-banner" }, "📝 Cô mở Kiểm tra đầu bài. Em làm trước khi học để xem mình biết gì nhé!", btn("Làm ngay", () => location.hash = `#/kiem-tra/${id}/pre`, "btn btn-lav")) : null,
    h("div", { class: "seed-list" }, L.seeds.map((s, i) => {
      const done = seedDone(id, s.id);
      return h("div", { class: "card seed-card" + (done ? " done" : "") },
        h("div", { class: "seed-num" }, done ? "🌸" : "🌰"),
        h("b", {}, `Hạt ${i + 1}. ${s.title}`),
        h("span", { class: "small muted" }, done ? "Đã học xong · bấm để ôn lại" : "Khám phá → " + (L.experiment?.seed === s.id ? "Thí nghiệm → " : "") + "3 câu"),
        btn(done ? "Học lại" : "Học ➜", () => location.hash = `#/hat/${id}/${s.id}`, done ? "btn btn-soft" : "btn btn-main"));
    })),
    h("div", { class: "zone-extra" },
      h("div", { class: "card" }, h("div", { class: "x-ic", style: { background: "#e3eeff" } }, "📘"), h("div", { style: { flex: 1 } }, h("b", {}, "Sách bài tập KHTN 6"), h("div", { class: "small muted" }, "Bài tập trong SBT của bài này")), btn("Làm", () => location.hash = `#/sbt/${id}`, "btn btn-sky")),
      test.pre ? testCard("pre", "Kiểm tra đầu bài", "📝") : null,
      test.post && n === 3 ? testCard("post", "Kiểm tra cuối bài", "🏁") : null));
}

// ================================================================== học một hạt giống
export async function seedScreen(lessonId, seedId) {
  if (!isOpen(lessonId)) { location.hash = "#/may"; return null; }
  const L = await loadLesson(lessonId); const seed = L?.seeds.find(s => s.id === seedId);
  if (!seed) { location.hash = "#/may"; return null; }
  sound.setMood("lesson");
  const key = `${lessonId}/${seedId}`, mode = seedDone(lessonId, seedId) ? "practice" : "seed";
  const steps = ["theory", ...(L.experiment?.seed === seedId ? ["exp"] : []), ...seed.questions.map((_, i) => "q" + i), "done"];
  let idx = 0, firstRight = 0;
  const body = h("div", { class: "step-body" }), dots = h("div", { class: "dots" });
  const paintDots = () => dots.replaceChildren(...steps.slice(0, -1).map((s, i) => h("span", { class: "dot-step" + (i < idx ? " past" : i === idx ? " now" : "") }, s === "theory" ? "📖" : s === "exp" ? "⚗️" : +s.slice(1) + 1)));
  const next = () => { idx++; show(); };
  function show() {
    paintDots(); body.closest(".sheet-body")?.scrollTo({ top: 0, behavior: "smooth" });
    const s = steps[idx];
    if (s === "theory") {
      setTiNiContext({ lessonTitle: L.title, theory: { ...seed.theory, title: seed.title } });
      body.replaceChildren(h("div", { class: "lesson-grid" },
        h("div", { class: "theory-art", style: { background: zs(lessonId).g } }, h("span", { class: "art-emoji" }, seed.theory.picture)),
        h("div", { class: "card" }, theoryView(seed), h("div", { class: "actions" }, btn("Em hiểu rồi ➜", next, "btn btn-main btn-big")))));
      say("Đọc kĩ phần Khám phá nhé. Cần gì cứ bấm vào mình!");
    } else if (s === "exp") {
      body.replaceChildren(h("div", { class: "card" }, experimentView(L.experiment, { onFinish: r => { addJournal(lessonId, L.experiment, r); const nb = h("div", { class: "actions sticky-next" }, btn("Sang câu hỏi ➜", next, "btn btn-main btn-big")); body.querySelector(".card").append(nb); setTimeout(() => nb.scrollIntoView({ behavior: "smooth", block: "center" }), 80); } })));
    } else if (s.startsWith("q")) {
      const q = withHints(lessonId, seedId, seed.questions[+s.slice(1)]);
      setTiNiContext({ lessonTitle: L.title, theory: { ...seed.theory, title: seed.title }, question: q });
      let qEl;
      body.replaceChildren(h("div", { class: "q-with-tini" }, h("div", { class: "card" }, qEl = renderQuestion(q, {
        mode, chat: true, label: `Câu ${+s.slice(1) + 1}/3`,
        onResult: r => {
          ST.logQ.push({ lesson: lessonId, seed: seedId, qid: q.id, kind: mode === "seed" ? "seed" : "practice", correct: r.correct, firstTry: r.attempt === 1, code: r.code || "" });
          if (mode === "seed" && r.correct) { const k = `${lessonId}/${seedId}/${q.id}`; if (ST.state.qpts[k] == null) ST.state.qpts[k] = Math.max(25, 100 - 25 * (r.attempt - 1)) / 10; } // đúng ngay: 10 điểm; mỗi lần sai trừ 25%
          if (mode === "seed" && r.attempt === 1) { if (r.correct) firstRight++; else spawnWeed(lessonId, seedId, q, r.code, L.misconceptions?.[r.code]?.label); }
          if (!r.correct && r.attempt === 1) say("Không sao đâu! Bấm vào mình để xin gợi ý nhé.");
          commit();
        },
        onDone: next,
      })), tiniChat({ getHint: () => qEl.nextHint() })));
    } else finish();
  }
  function finish() {
    let gained = 0;
    if (mode === "seed") {
      gained = 1 + (firstRight === seed.questions.length ? 1 : 0);
      ST.state.seeds[key] = { done: true, at: Date.now(), firstRight }; dispatchEvent(new CustomEvent("kvtm:track", { detail: "seed" })); dispatchEvent(new CustomEvent("kvtm:card", { detail: 0.35 })); addSeeds(lessonId, gained); commit(); flush();
    }
    const zoneDone = L.seeds.every(s => seedDone(lessonId, s.id));
    sound.play(zoneDone && mode === "seed" ? "reo" : "chuong"); if (zoneDone && mode === "seed") rainbow();
    const newWeeds = unfixed().filter(w => w.lesson === lessonId && w.seed === seedId).length;
    setTiNiContext(null);
    body.replaceChildren(h("div", { class: "card center" },
      tiNi(110), h("h1", {}, mode === "seed" ? "Hoàn thành hạt giống!" : "Ôn lại xong rồi!"),
      gained ? h("p", { class: "reward" }, `+${gained} hạt mây 🌰` + (gained > 1 ? " (thưởng vì đúng ngay cả 3 câu!)" : "")) : h("p", { class: "lead" }, "Ôn lại không nhận thêm hạt, nhưng giúp em nhớ lâu hơn."),
      zoneDone && mode === "seed" ? h("p", { class: "ok-text" }, "🌈 Cả khu đã hồi sinh! Hoa nở khắp đám mây rồi.") : null,
      newWeeds ? h("p", {}, `Có ${newWeeds} bụi cỏ dại mọc trong vườn từ chỗ em nhầm. Nhổ cỏ để hiểu chắc hơn nhé.`) : null,
      h("div", { class: "actions center" }, btn("🌱 Ra Vườn Mây", () => location.hash = "#/vuon", "btn btn-mint btn-big"), btn("Về khu", () => location.hash = "#/khu/" + lessonId, "btn btn-soft"))));
    paintDots();
  }
  show();
  return S({ title: seed.title, sub: `${L.zone} · ${mode === "practice" ? "Ôn lại" : "Hạt giống kiến thức"}`, icon: zs(lessonId).art.slice(0, 2), style: lessonId, back: "#/khu/" + lessonId, backLabel: "Về khu" },
    h("div", { class: "seed-top" }, dots), body);
}

function addJournal(lesson, exp, r) {
  ST.state.journal.push({ lesson, exp: exp.id, title: exp.title, prediction: r.prediction, conclusion: r.conclusion, at: Date.now() });
  if (ST.state.journal.length > 80) ST.state.journal.shift();
  commit();
}

// ================================================================== Đảo Thí Nghiệm (tất cả thí nghiệm)
export const SIM_LESSONS = ["bai-10", "bai-11", "bai-14", "bai-16"]; // mô phỏng hiện tượng; còn lại là thí nghiệm thao tác
export async function labHubScreen(kind = "lab") {
  const map = await loadMap(); sound.setMood("lab");
  const cards = [];
  for (const z of map.zones) {
    const L = await loadLesson(z.id); if (!L?.experiment) continue;
    const open = isOpen(z.id), did = ST.state.journal.some(j => j.exp === L.experiment.id);
    cards.push(h("div", { class: "card seed-card" + (did ? " done" : "") },
      h("div", { class: "row" }, h("div", { class: "seed-num", style: { background: open ? zs(z.id).g : "#eceaf3" } }, open ? z.icon : "🔒"),
        h("div", {}, h("b", {}, L.experiment.title), h("div", { class: "small muted" }, `Bài ${z.num} · ${z.zone}`))),
      h("p", { class: "small" }, L.experiment.intro),
      open ? btn(did ? "Làm lại" : "Vào phòng thí nghiệm ➜", () => location.hash = "#/thi-nghiem/" + z.id, did ? "btn btn-soft" : "btn btn-mint") : h("span", { class: "tag" }, "Chờ cô mở Bài " + z.num)));
  }
  cards.sort((a, b) => b.querySelector(".btn") ? 1 : -1);
  return S({ title: "Đảo Thí Nghiệm & Mô Phỏng", sub: "Thí nghiệm và mô phỏng của tất cả các bài · Dự đoán → Làm → Kết luận", icon: "⚗️", style: "lab" },
    h("p", { class: "lead" }, "Thí nghiệm ảo không tính điểm kiểm tra. Kết luận của em được ghi vào Nhật ký nhà khoa học trong Sổ tay."),
    h("div", { class: "seed-list" }, cards));
}
export async function experimentScreen(lessonId) {
  const hub = "#/mo-phong", hubName = "Đảo Thí Nghiệm & Mô Phỏng";
  if (!isOpen(lessonId)) { location.hash = hub; return null; }
  const L = await loadLesson(lessonId); sound.setMood("lab");
  if (!L?.experiment) { location.hash = "#/khu/" + lessonId; return null; }
  const box = h("div", { class: "card" });
  box.append(experimentView(L.experiment, { onFinish: r => { addJournal(lessonId, L.experiment, r); addDrops(5); dispatchEvent(new CustomEvent("kvtm:track", { detail: "exp" })); toast("+5 💧 giọt mây! Đã ghi vào Nhật ký nhà khoa học 📒", "ok"); box.append(h("div", { class: "actions" }, btn("Về " + hubName, () => location.hash = hub, "btn btn-soft"))); } }));
  return S({ title: L.experiment.title, sub: `Phòng thí nghiệm mây · ${L.zone}`, icon: "⚗️", style: "lab", back: hub, backLabel: hubName }, box);
}

// ================================================================== Vườn Mây
export async function gardenScreen() {
  const map = await loadMap(); sound.setMood("garden");
  const zoneOf = id => map.zones.find(z => z.id === id);
  const grid = h("div", { class: "garden" }), pouch = h("div", { class: "pouch" }), guide = h("div", { class: "bubble" });
  const prevStage = {};
  let g3 = null; const box3d = can3D() ? h("div", { class: "g3d-box" }) : null;
  function stageOf(p, i) {
    const nW = unfixed().filter(w => w.tile === i).length;
    const prog = (Date.now() - p.plantedAt) / (p.growMs * (1 + 0.15 * Math.min(2, nW)));
    return { prog: Math.min(1, prog), stage: prog >= 1 ? 3 : prog >= 0.6 ? 2 : prog >= 0.25 ? 1 : 0, slow: nW > 0 };
  }
  function paintPouch() {
    const entries = Object.entries(ST.state.cloudSeeds).filter(([, n]) => n > 0);
    pouch.replaceChildren(h("b", {}, "Túi hạt mây:"), ...(entries.length ? entries.map(([l, n]) => h("span", { class: "pill" }, `${zoneOf(l)?.icon || "🌰"} ${zoneOf(l)?.zone || l} × ${n}`)) : [h("span", { class: "muted" }, "chưa có hạt. Học một hạt giống kiến thức để nhận nhé!")]));
    const w = unfixed().length;
    guide.textContent = w ? `Có ${w} bụi cỏ dại nhăn mặt. Chạm vào cỏ để nhổ: làm lại đúng câu từng nhầm là cỏ bay mất!` : "Vườn sạch cỏ rồi! Chạm ô đất trống để gieo hạt mây.";
  }
  function paint() {
    grid.replaceChildren();
    ST.state.garden.forEach((p, i) => {
      const tile = h("button", { class: "tile", "aria-label": `Ô ${i + 1}`, onclick: e => onTile(i, e) });
      if (p) {
        const { prog, stage, slow } = stageOf(p, i);
        if (prevStage[i] === 0 && stage === 1) { sound.play("mua"); setTimeout(() => { const rr = grid.children[i]?.getBoundingClientRect(); rr && burst(rr.left + rr.width / 2, rr.top, "rain", 6); }, 0); }
        prevStage[i] = stage;
        tile.classList.add(stage === 3 ? "ready" : "growing");
        tile.append(h("span", { class: "plant", html: plantSvg(stage, zoneOf(p.lesson)?.icon || "") }));
        if (stage < 3) { const fill = h("span", { style: { width: Math.round(prog * 100) + "%" } }); tile._fill = fill; tile.append(h("span", { class: "grow-bar" + (slow ? " slow" : "") }, fill)); }
      }
      const ws = unfixed().filter(w => w.tile === i);
      if (ws.length) {
        const wrap = h("span", { class: "weeds" });
        ws.slice(0, 3).forEach(w => {
          const age = Date.now() - w.bornAt, big = age > 86400000 ? 2 : age > 600000 ? 1 : 0;
          wrap.append(h("span", { class: "weed", role: "button", tabindex: "0", title: weedName(w.label), "aria-label": weedName(w.label), onclick: e => { e.stopPropagation(); pullWeed(w); }, html: weedSvg(30, big) }));
        });
        tile.append(wrap);
      }
      grid.append(tile);
    });
    paintPouch(); g3 && g3.update();
  }
  function onTile(i, e) {
    const p = ST.state.garden[i];
    if (p) {
      const { stage, prog } = stageOf(p, i);
      if (stage === 3) return harvest(i, e);
      return toast(`Cây đang lớn, còn khoảng ${Math.ceil((1 - prog) * p.growMs / 1000)} giây nữa.` + (unfixed().some(w => w.tile === i) ? " Cỏ dại che nắng nên cây lớn chậm hơn." : ""));
    }
    const entries = Object.entries(ST.state.cloudSeeds).filter(([, n]) => n > 0);
    if (!entries.length) return toast("Em chưa có hạt mây. Học một hạt giống kiến thức để nhận nhé!");
    if (entries.length === 1) return plant(i, entries[0][0], e);
    const m = modal(h("div", {}, h("h2", {}, "Gieo hạt của khu nào?"), h("p", { class: "small muted" }, "Hạt của bài nào thì ra nguyên liệu của bài đó."),
      h("div", { class: "opts" }, entries.map(([l, n]) => btn(`${zoneOf(l).icon} ${zoneOf(l).zone} (${n} hạt)`, () => { m.close(); plant(i, l, e); }, "opt")))));
  }
  function plant(i, lesson, e) {
    ST.state.cloudSeeds[lesson]--; ST.state.garden[i] = { lesson, plantedAt: Date.now(), growMs: growMs() };
    prevStage[i] = 0; sound.play("tach"); e && burst(e.clientX, e.clientY, "seed", 5); commit(); paint();
  }
  async function harvest(i, e) {
    const p = ST.state.garden[i], z = zoneOf(p.lesson);
    const BUILD = ["dat_set", "cat", "da_voi", "quang_sat", "go", "mu_cao_su", "dau_mo", "than", "cui"];
    const got = [...shuffle(z.materials).slice(0, 2), BUILD[Math.floor(Math.random() * BUILD.length)]];
    got.forEach(m => ST.state.inventory[m] = (ST.state.inventory[m] || 0) + 1);
    ST.state.garden[i] = null; delete prevStage[i];
    let card = null; const L = await loadLesson(p.lesson);
    if (L) { const s = L.seeds.find(s => seedDone(p.lesson, s.id) && !ST.state.notebook.includes(`${p.lesson}/${s.id}`)); if (s) { ST.state.notebook.push(`${p.lesson}/${s.id}`); card = s; } }
    commit(); sound.play("thuhoach"); e && burst(e.clientX, e.clientY, "star", 8); paint();
    const names = got.map(m => `${map.materials[m].icon} ${map.materials[m].name}`).join(", ");
    if (card) modal(h("div", { class: "center" }, h("h2", {}, "Thu hoạch!"), h("p", { class: "lead" }, "Em nhận được: " + names),
      h("div", { class: "notecard fly" }, h("b", {}, "📒 Thẻ mới bay vào Sổ tay"), h("p", {}, h("b", {}, card.title + ": "), card.theory.card))));
    else toast("Thu hoạch: " + names, "ok");
  }
  async function pullWeed(w) {
    const L = await loadLesson(w.lesson); const seed = L?.seeds.find(s => s.id === w.seed);
    let q = seed?.questions.find(q => `${w.lesson}/${w.seed}/${q.id}` === w.qid);
    if (!q) { w.fixed = true; commit(); paint(); return; }
    q = withHints(w.lesson, w.seed, q);
    setTiNiContext({ lessonTitle: L.title, theory: { ...seed.theory, title: seed.title } });
    const m = modal(h("div", {},
      h("div", { class: "weed-head" }, h("span", { html: weedSvg(54, 1) }), h("div", {}, h("h2", { style: { margin: 0 } }, weedName(w.label || L.misconceptions?.[w.code]?.label)), h("p", { class: "small muted" }, "Làm lại đúng câu này để nhổ cỏ nhé."))),
      renderQuestion(q, {
        mode: "weed", theory: theoryView(seed),
        onResult: r => {
          ST.logQ.push({ lesson: w.lesson, seed: w.seed, qid: q.id, kind: "weed", correct: r.correct, firstTry: r.attempt === 1, code: r.code || "" });
          if (r.correct) {
            w.fixed = true; w.fixedAt = Date.now(); addSeeds(w.lesson, 1); addDrops(2); dispatchEvent(new CustomEvent("kvtm:track", { detail: "weed" }));
            sound.play("bup"); const b = m.box.getBoundingClientRect(); burst(b.left + b.width / 2, b.top + 60, "bubble", 12);
            toast("Bụp! Cỏ biến thành bong bóng bay lên trời. +1 hạt mây 🌰", "ok"); flush(); return;
          }
          commit();
        },
        onDone: () => m.close(),
      })), { wide: true, onClose: () => { setTiNiContext(null); paint(); } });
  }
  paint();
  const cloud = h("div", { class: "garden-cloud" }, grid, h("div", { class: "decor", "aria-hidden": "true" }, h("span", {}, "⛲"), h("span", {}, "🦋"), h("span", {}, "🏡"), h("span", {}, "🐶")));
  if (box3d) mountGarden3D(box3d, {
    getTiles: () => ST.state.garden.map((p, i) => ({ plant: p ? { ...stageOf(p, i), color: zs(p.lesson).c || "#ff8fb8" } : null,
      weeds: unfixed().filter(w => w.tile === i).map(w => { const age = Date.now() - w.bornAt; return { id: w.id, big: age > 86400000 ? 2 : age > 600000 ? 1 : 0 }; }) })),
    onTile: (i, e) => onTile(i, e), onWeed: id => { const w = unfixed().find(x => x.id === id); w && pullWeed(w); },
    onCoMay: () => { sound.play("chuong"); guide.textContent = unfixed().length ? "Cô Mây nhắc nè: nhổ cỏ dại bằng cách trả lời lại câu từng nhầm, cây sẽ lớn nhanh hơn!" : "Cô Mây tưới cây mỗi ngày. Em học thêm hạt giống để vườn thêm nhiều hoa nhé!"; },
    tipOf: i => { const p = ST.state.garden[i]; if (!p) return "Luống trống: bấm để gieo hạt"; const { stage, prog } = stageOf(p, i); return stage === 3 ? "Cây đã lớn: bấm để thu hoạch" : `Cây đang lớn ${Math.round(prog * 100)}%`; },
  }).then(x => { g3 = x; }).catch(err => { console.warn("Vườn 3D lỗi", err); box3d.replaceWith(cloud); });
  const ticker = setInterval(() => {
    if (!document.body.contains(grid)) return clearInterval(ticker);
    if (document.querySelector(".modal-back")) return;
    let changed = false;
    ST.state.garden.forEach((p, i) => { if (!p) return; const { prog, stage } = stageOf(p, i); if (stage !== prevStage[i]) changed = true; else if (grid.children[i]?._fill) grid.children[i]._fill.style.width = Math.round(prog * 100) + "%"; });
    if (changed) paint();
  }, 1000);
  return S({ title: "Vườn Mây", sub: "Gieo hạt → nảy mầm → cây non → cây lớn → thu hoạch nguyên liệu", icon: "🌱", style: "garden" },
    h("div", { class: "garden-page" },
      h("div", {}, box3d || cloud),
      h("div", { class: "side-card" }, h("div", { class: "card" }, h("div", { class: "garden-head" }, h("span", { class: "comay-ic" }, tiNi(52), h("i", {}, "👒")), h("b", {}, "Cô Mây trông vườn")), guide), h("div", { class: "card" }, pouch,
        h("p", { class: "small muted" }, "Cỏ dại không làm chết cây, chỉ làm cây trên ô đó lớn chậm hơn chút. Nhổ cỏ được thêm hạt mây!")))));
}

// ================================================================== Sổ tay
export async function notebookScreen() {
  const map = await loadMap();
  const tabs = [["the", "📒 Thẻ lý thuyết"], ["tui", "🎒 Túi đồ"], ["nhat-ky", "⚗️ Nhật ký"], ["co", "🫧 Đã tự sửa"], ["kt", "📝 Kiểm tra"]];
  let cur = "the";
  const body = h("div", { class: "card" }), bar = h("div", { class: "tabs" });
  async function paint() {
    bar.replaceChildren(...tabs.map(([k, t]) => h("button", { class: "tab" + (k === cur ? " on" : ""), onclick: () => { cur = k; paint(); } }, t)));
    if (cur === "the") {
      const cards = [];
      for (const key of ST.state.notebook) { const [l, s] = key.split("/"); const L = await loadLesson(l); const seed = L?.seeds.find(x => x.id === s); if (seed) cards.push(h("div", { class: "notecard" }, h("span", { class: "small muted" }, L.zone), h("b", {}, seed.title), h("p", {}, seed.theory.card))); }
      body.replaceChildren(cards.length ? h("div", { class: "notegrid" }, cards) : h("p", { class: "muted" }, "Chưa có thẻ nào. Thẻ lý thuyết bay vào đây khi em thu hoạch cây trong Vườn Mây."));
    } else if (cur === "tui") {
      const items = Object.entries(ST.state.inventory).filter(([, n]) => n > 0);
      body.replaceChildren(items.length ? h("div", { class: "inv" }, items.map(([k, n]) => { const m = map.materials[k] || { icon: "❔", name: k, note: "" };
        return h("div", { class: "inv-item" + (m.kind === "product" ? " product" : "") }, h("span", { class: "inv-ic" }, m.icon), h("b", {}, `${m.name} × ${n}`), h("span", { class: "small muted" }, m.note)); }))
        : h("p", { class: "muted" }, "Túi còn trống. Thu hoạch cây để nhận nguyên liệu, nung ở Lò Mây để có vật liệu xây nhà."));
    } else if (cur === "nhat-ky") {
      const j = ST.state.journal.slice().reverse();
      body.replaceChildren(...(j.length ? j.map(e => h("div", { class: "journal" }, h("b", {}, e.title), h("span", { class: "small muted" }, " · " + new Date(e.at).toLocaleDateString("vi-VN")),
        h("p", {}, h("i", {}, "Dự đoán: "), e.prediction || "–"), h("p", {}, h("i", {}, "Kết luận: "), e.conclusion || "–"))) : [h("p", { class: "muted" }, "Chưa có trang nhật ký nào. Ghé Đảo Thí Nghiệm để làm thí nghiệm nhé.")]));
    } else if (cur === "co") {
      const f = ST.state.weeds.filter(w => w.fixed).reverse();
      body.replaceChildren(f.length ? h("ul", { class: "fixed-list" }, f.map(w => h("li", {}, "🫧 ", weedName(w.label), h("span", { class: "small muted" }, " · đã tự sửa")))) : h("p", { class: "muted" }, "Khi em nhổ được cỏ dại, nó sẽ hiện ở đây với dấu \"Đã tự sửa\"."));
    } else {
      const t = Object.entries(ST.state.tests);
      body.replaceChildren(t.length ? h("div", { class: "test-list" }, t.map(([k, r]) => { const [l, kind] = k.split(":"); const z = map.zones.find(z => z.id === l);
        return h("div", { class: "card" }, h("b", {}, `${kind === "pre" ? "Kiểm tra đầu" : kind === "post" ? "Kiểm tra cuối" : "Bài cô giao"} · ${z ? z.zone : l}`), h("div", { class: "score-big" }, `${r.score}/${r.total}`), h("span", { class: "small muted" }, new Date(r.at).toLocaleString("vi-VN"))); }))
        : h("p", { class: "muted" }, "Em chưa làm bài kiểm tra nào."));
    }
  }
  await paint();
  return S({ title: "Sổ tay của " + ST.profile.name, sub: "Thẻ lý thuyết · túi đồ · nhật ký nhà khoa học", icon: "📒", style: "book" }, bar, body);
}

// ================================================================== Cỏ dại ở quảng trường (câu hỏi từ các bài cô đã mở, đúng ngay +5 điểm)
const PLAZA_MAX = 12, PLAZA_EVERY = 60000;
export function plazaTick() {
  if (!ST.state || !(ST.settings.open || []).length) return false;
  const P = ST.state.plaza; let changed = false; const now = Date.now();
  if (!P.last) { while (P.weeds.length < 8) P.weeds.push({ id: now.toString(36) + P.weeds.length, born: now }); P.last = now; changed = true; }
  while (P.weeds.length < PLAZA_MAX && now - P.last >= PLAZA_EVERY) { P.last += PLAZA_EVERY; P.weeds.push({ id: P.last.toString(36) + Math.random().toString(36).slice(2, 5), born: P.last }); changed = true; }
  if (P.weeds.length >= PLAZA_MAX) P.last = Math.max(P.last, now - PLAZA_EVERY + 1);
  if (changed) commit();
  return changed;
}
export async function plazaWeed(id) {
  const P = ST.state.plaza, w = P.weeds.find(x => x.id === id); if (!w) return;
  const ids = (ST.settings.open || []); if (!ids.length) return toast("Cô chưa mở bài nào để hỏi.");
  const lesson = ids[Math.floor(Math.random() * ids.length)], L = await loadLesson(lesson); if (!L) return;
  const all = L.seeds.flatMap(sd => sd.questions.map(q => ({ sd, q })));
  let extra = []; try { const sb = (await (await fetch("data/sbt.json")).json()).lessons?.[lesson] || []; extra = sb.filter(x => x.type === "mcq").map(x => ({ sd: { ...L.seeds[0], id: "sbt" }, q: { ...x, id: x.id, hints: x.hints || [] } })); } catch {}
  const pool = [...all, ...extra], seenW = (P.seenQ ||= []); let pick = pool.filter(x => !seenW.includes(lesson + x.q.id)); if (!pick.length) { P.seenQ = []; pick = pool; }
  const { sd: sd0, q } = pick[Math.floor(Math.random() * pick.length)]; const sd = sd0.id === "sbt" ? L.seeds[0] : sd0; P.seenQ.push(lesson + q.id); if (P.seenQ.length > 200) P.seenQ.splice(0, 50);
  let first = null;
  const m = modal(h("div", {},
    h("div", { class: "weed-head" }, h("span", { html: weedSvg(54, 1) }), h("div", {}, h("h2", { style: { margin: 0 } }, "Cỏ dại ở quảng trường"), h("p", { class: "small muted" }, `Trả lời đúng ngay lần đầu: +5 điểm mây · câu hỏi ${L.zone}`))),
    renderQuestion(withHints(lesson, sd.id, q), { mode: "weed", theory: theoryView(sd),
      onResult: r => {
        if (first === null) first = r.correct;
        ST.logQ.push({ lesson, seed: sd.id, qid: q.id, kind: "plaza", correct: r.correct, firstTry: r.attempt === 1, code: r.code || "" });
        if (!r.correct) return;
        P.weeds = P.weeds.filter(x => x.id !== id);
        dispatchEvent(new CustomEvent("kvtm:track", { detail: "weed" })); if (first) { P.cleared = (P.cleared || 0) + 1; addDrops(3); toast("Bụp! Cỏ dại biến mất. +5 điểm mây ⭐ +3 💧", "ok"); } else toast("Cỏ đã được dọn. Lần sau đúng ngay sẽ được +5 điểm nhé!");
        sound.play("bup"); commit(); flush();
      }, onDone: () => m.close() })), { wide: true });
}

// ================================================================== Giọt mây (tiền để mua đồ ở Tủ đồ)
export const DROP_DAY_MAX = Infinity; // không giới hạn giọt mây mỗi ngày
export function addDrops(n) {
  const d = new Date().toISOString().slice(0, 10), D = ST.state.dropsDay.d === d ? ST.state.dropsDay : (ST.state.dropsDay = { d, n: 0 });
  const g = Math.max(0, Math.min(n, DROP_DAY_MAX - D.n)); D.n += g; ST.state.drops += g; commit(); return g;
}
export const shop = { drops: () => ST.state?.drops || 0, owned: () => ST.state?.owned || [],
  buy(id, price) { if (ST.state.drops < price || ST.state.owned.includes(id)) return false; ST.state.drops -= price; ST.state.owned.push(id); commit(); flush(); return true; } };

// ================================================================== Đảo Giam Giữ
export function jailInfo() {
  if (!ST.state || !ST.profile) return null;
  const t = ST.settings?.jail?.[ST.profile.id], rel = ST.settings?.release?.[ST.profile.id] || 0;
  if (t && !ST.state.jailFree[t.at]) return { at: t.at, reason: t.reason || "Cô giáo đưa em ra đảo để ôn bài", by: "gv" };
  const j = ST.state.jail; if (j && !j.freed && j.at > rel) return { at: j.at, reason: j.reason, by: "tu-dong" };
  return null;
}
export function freeFromJail() {
  const j = jailInfo(); if (!j) return;
  if (j.by === "gv") ST.state.jailFree[j.at] = true; else ST.state.jail.freed = true;
  commit(); flush();
}

// ================================================================== Tổng kết tuần (Chủ nhật): giam em không học, nhắn bậy, chưa làm bài cô giao
export function weeklyCheck() {
  if (!ST.state || !ST.profile) return;
  const now = new Date(), sun = new Date(now); sun.setHours(0, 0, 0, 0); sun.setDate(sun.getDate() - sun.getDay()); // Chủ nhật gần nhất
  const key = sun.toISOString().slice(0, 10); if (ST.state.weekCheck === key) return;
  const from = sun.getTime() - 7 * 86400000, to = sun.getTime() + 86400000;
  ST.state.weekCheck = key;
  if (ST.state.firstSeen > from) { commit(); return; } // em mới vào lớp trong tuần: chưa xét
  const inWeek = t => t && t >= from && t < to, why = [];
  const studied = Object.values(ST.state.seeds).some(x => inWeek(x.at)) || ST.state.weeds.some(w => inWeek(w.fixedAt)) || ST.state.journal.some(j => inWeek(j.at)) || Object.values(ST.state.tests).some(t => inWeek(t.at));
  if (!studied) why.push("không vào học trong tuần");
  if (ST.state.flags.some(t => inWeek(t))) why.push("nhắn tin không phù hợp trong trò chuyện lớp");
  const a = ST.settings.assign; if (a && a.open && a.at && Date.parse(a.at) < to && !ST.state.assign[a.id]) why.push("chưa hoàn thành bài cô giao");
  if (why.length && !(ST.state.jail && !ST.state.jail.freed)) ST.state.jail = { at: Date.now(), reason: `Tổng kết tuần (Chủ nhật ${sun.getDate()}/${sun.getMonth() + 1}): ` + why.join("; "), freed: false };
  commit();
}
