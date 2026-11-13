// Góc thầy cô: Hôm nay · Lớp của tôi · Trò chơi và kiểm tra · Báo cáo (+ Duyệt gợi ý, Bộ câu hỏi, Quản trị)
import { api, friendlyError } from "./api.js";
import { APP_VERSION } from "./config.js";
import { h, btn, toast, modal, tiNi, weedSvg, fmtAgo, startOfToday, autoFit, shuffle } from "./ui.js";
import { PIC, randomPics } from "./pics.js";
import { loadMap, loadAllLessons, weedName } from "./content.js";
import { gameQuestions, gamePuzzles, projector } from "./games.js";
import { rcvProjector } from "./rcv.js";
import { lessonTestQuestions } from "./tests.js";
import { sound } from "./sound.js";
import { SURVEY_Q } from "./tests.js";
import { ill } from "./quiz.js";
import { STORIES, voiceUrl, localVoiceUrls } from "./story.js";

const TS = { classes: null, cur: null, admin: null };
const LS = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
export const teacherSignedIn = () => !!api.teacherSession();

// ================================================================== đăng nhập
export function teacherLogin({ compact = false } = {}) {
  const email = h("input", { type: "email", placeholder: "email của thầy cô", autocomplete: "username", value: "" });
  const pw = h("input", { type: "password", placeholder: "mật khẩu (từ 6 kí tự)", autocomplete: "current-password", value: "" });
  const go = async (signup) => {
    if (!email.value || pw.value.length < 6) return toast("Thầy cô nhập email và mật khẩu từ 6 kí tự nhé.");
    try {
      const r = signup ? await api.signUp(email.value.trim(), pw.value) : await api.signIn(email.value.trim(), pw.value);
      if (r.needConfirm) return toast("Đã tạo tài khoản. Thầy cô mở email để bấm xác nhận rồi đăng nhập.", "ok", 6000);
      TS.classes = null; TS.admin = null; location.hash === "#/gv" ? rerender() : location.hash = "#/gv";
    } catch (e) { toast(friendlyError(e), "bad", 4000); }
  };
  pw.addEventListener("keydown", e => e.key === "Enter" && go(false));
  if (compact) return h("div", { class: "hm-form" }, h("label", { class: "hm-lbl" }, "Email"), email, h("label", { class: "hm-lbl" }, "Mật khẩu"), pw,
    btn("Đăng nhập", () => go(false), "btn btn-mint btn-big hm-go"), h("button", { class: "hm-link", onclick: () => go(true) }, "Chưa có tài khoản? Tạo tài khoản thầy cô"));
  return h("div", { class: "page-login" }, h("a", { class: "back-home", href: "#/" }, "⬅ Trang đầu"),
    h("div", { class: "card login-card" }, h("div", { class: "center" }, tiNi(96), h("h1", {}, "Góc thầy cô"), h("p", { class: "lead" }, "Quản lí lớp, xem hiểu nhầm của cả lớp, mở trò chơi và in báo cáo.")),
      h("label", { class: "lbl-block" }, "Email", email), h("label", { class: "lbl-block" }, "Mật khẩu", pw),
      h("div", { class: "actions" }, btn("Đăng nhập", () => go(false), "btn btn-main btn-big"), btn("Tạo tài khoản mới", () => go(true), "btn btn-soft")),
      api.demo ? h("p", { class: "small muted" }, "Chế độ thử: tài khoản mẫu co@demo / 123456 (có quyền admin để xem thử). Dữ liệu chỉ lưu trên máy này.") : null));
}

async function ensure() {
  if (!TS.classes) TS.classes = await api.listClasses();
  if (TS.admin === null) TS.admin = await api.isAdmin().catch(() => false);
  const saved = LS.get("kvtm-gv-class");
  TS.cur = TS.classes.find(c => c.id === saved) || TS.classes[0] || null;
}
const NAV = [["#/gv", "☀️", "Hôm nay"], ["#/gv/lop", "🏫", "Lớp của tôi"], ["#/gv/tro-choi", "🎲", "Trò chơi và kiểm tra"], ["#/gv/goi-bai", "🛸", "Gọi kiểm tra bài cũ"], ["#/gv/bao-cao", "📊", "Báo cáo"]];
function shell(active, title, actions, ...content) {
  const sel = TS.classes.length ? h("select", { class: "class-select", "aria-label": "Chọn lớp", onchange: e => { LS.set("kvtm-gv-class", e.target.value); TS.cur = TS.classes.find(c => c.id === e.target.value); rerender(); } },
    TS.classes.map(c => h("option", { value: c.id, selected: TS.cur && c.id === TS.cur.id }, "Lớp " + c.name))) : null;
  const inner = h("div", { class: "t-inner" },
      h("div", { class: "t-head" }, h("h1", {}, title), h("div", { class: "actions", style: { marginTop: 0 } }, actions)), content);
  const main = h("main", { class: "t-main" }, inner); autoFit(main, inner, 0.74);
  return h("div", { class: "t-app" },
    h("aside", { class: "t-side" },
      h("a", { class: "t-brand", href: "#/gv" }, h("span", { class: "b-ic" }, "☁️"), h("b", {}, "Góc thầy cô", h("br"), h("span", { class: "small muted" }, "Khu vườn trên mây · v" + APP_VERSION))),
      h("div", { class: "class-row" }, sel, btn("＋", () => newClassModal(), "btn btn-soft btn-tiny")),
      h("nav", { class: "t-nav" }, NAV.map(([href, ic, t]) => h("a", { href, class: href === active ? "on" : "" }, h("span", { class: "n-ic" }, ic), t)),
        h("a", { href: "#/gv/goi-y", class: active === "#/gv/goi-y" ? "on" : "" }, h("span", { class: "n-ic" }, "💬"), "Duyệt gợi ý Tí Nị"),
        TS.admin ? h("a", { href: "#/gv/quan-tri", class: active === "#/gv/quan-tri" ? "on" : "" }, h("span", { class: "n-ic" }, "🛡️"), "Quản trị") : null),
      h("div", { class: "t-acct" }, h("span", { class: "muted" }, api.teacherSession()?.email, TS.admin ? " · admin" : ""), btn("Đăng xuất", async () => { await api.signOut(); TS.classes = null; TS.admin = null; location.hash = "#/gv"; rerender(); }, "btn btn-soft btn-tiny"))),
    main);
}
function noClass() {
  const inp = h("input", { placeholder: "Tên lớp, ví dụ 6A1", maxlength: 60 });
  return shell("#/gv/lop", "Tạo lớp đầu tiên", [], h("div", { class: "card center", style: { maxWidth: "560px" } }, tiNi(90), h("p", { class: "lead" }, "Đặt tên lớp, hệ thống tạo mã lớp 6 kí tự để học sinh vào."), inp,
    h("div", { class: "actions center" }, btn("Tạo lớp", async () => {
      if (!inp.value.trim()) return;
      try { const c = await api.createClass(inp.value.trim()); TS.classes.push(c); TS.cur = c; LS.set("kvtm-gv-class", c.id); location.hash = "#/gv/lop"; rerender(); } catch (e) { toast(friendlyError(e), "bad"); }
    }, "btn btn-main")), h("p", { class: "small muted" }, "Lớp mới mặc định chỉ mở Bài 9. Thầy cô bật thêm khu trong mục Lớp của tôi.")));
}
const S = () => ({ open: [], mute: false, growSeconds: 45, aiMode: "approved", chat: true, tests: {}, hints: {}, ...(TS.cur.settings || {}) });
async function saveSettings(patch, quiet = false) {
  try { const r = await api.updateClass(TS.cur.id, { settings: { ...S(), ...patch } }); Object.assign(TS.cur, r); if (!quiet) toast("Đã lưu", "ok", 1200); }
  catch (e) { toast(friendlyError(e), "bad"); }
}

// ================================================================== số liệu
async function classData(days = 0) {
  const since = days ? new Date(Date.now() - days * 86400000) : startOfToday();
  const [students, answers, lessons, map] = await Promise.all([api.listStudents(TS.cur.id), api.listAnswers(TS.cur.id, since.toISOString()), loadAllLessons(), loadMap()]);
  const mis = {}; Object.values(lessons).forEach(L => Object.assign(mis, L.misconceptions || {}));
  return { students, answers, lessons, map, mis };
}
const unfixedOf = s => (s.state?.weeds || []).filter(w => !w.fixed);
function computeToday(d) {
  const t0 = startOfToday().getTime(), n = d.students.length;
  const joined = d.students.filter(s => s.last_seen && Date.parse(s.last_seen) >= t0).length;
  const first = d.answers.filter(a => a.kind === "seed" && a.first_try), right = first.filter(a => a.correct).length;
  const fixedToday = d.students.reduce((k, s) => k + (s.state?.weeds || []).filter(w => w.fixed && w.fixedAt >= t0).length, 0);
  const withWeeds = d.students.filter(s => unfixedOf(s).length).length, totalWeeds = d.students.reduce((k, s) => k + unfixedOf(s).length, 0);
  const byCode = {}; d.students.forEach(s => new Set(unfixedOf(s).map(w => w.code)).forEach(c => { if (c) byCode[c] = (byCode[c] || 0) + 1; }));
  const top = Object.entries(byCode).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([code, k]) => ({ code, k, ...(d.mis[code] || { label: code, tip: "" }) }));
  const help = [];
  d.students.forEach(s => {
    const w = unfixedOf(s), mine = first.filter(a => a.student_id === s.id), ok = mine.filter(a => a.correct).length;
    if (w.length >= 3) help.push({ s, why: `Còn ${w.length} bụi cỏ, hay nhầm "${(d.mis[w[0].code] || {}).label || w[0].label}"` });
    else if (mine.length >= 3 && ok / mine.length < 0.5) help.push({ s, why: `Hôm nay đúng ngay ${ok}/${mine.length} câu` });
    else if (!s.last_seen) help.push({ s, why: "Chưa vào lớp lần nào" });
  });
  return { n, joined, rate: first.length ? Math.round(right * 100 / first.length) : null, firstN: first.length, fixedToday, withWeeds, totalWeeds, top, help };
}
const stat = (k, v, sub) => h("div", { class: "stat card" }, h("div", { class: "stat-k" }, k), h("div", { class: "stat-v" }, v), h("div", { class: "small muted" }, sub));

// ================================================================== Hôm nay
export async function todayScreen() {
  await ensure(); if (!TS.cur) return noClass();
  const box = h("div", {}); let live = null, last = null;
  async function paint() {
    let d, chat = []; try { d = await classData(); chat = await api.listChat(TS.cur.id, true).catch(() => []); } catch (e) { box.replaceChildren(h("p", { class: "bad-text" }, friendlyError(e))); return; }
    const t = last = computeToday(d);
    box.replaceChildren(
      h("div", { class: "stats" }, stat("Đã vào", `${t.joined}/${t.n}`, "em hôm nay"), stat("Đúng ngay", t.rate == null ? "–" : t.rate + "%", `${t.firstN} câu lần đầu`), stat("Tự sửa", t.fixedToday, "bụi cỏ đã nhổ"), stat("Còn cỏ", t.withWeeds, `em · ${t.totalWeeds} bụi`)),
      h("div", { class: "grid-2" },
        h("div", { class: "card" }, h("h2", {}, "🌿 3 cỏ dại cả lớp hay mắc"),
          t.top.length ? t.top.map(w => h("div", { class: "weed-row" }, h("span", { html: weedSvg(38) }), h("div", {}, h("b", {}, weedName(w.label)), h("div", { class: "small muted" }, `${w.k} em đang có`), w.tip ? h("div", { class: "tip" }, "💡 Gợi ý giảng lại: " + w.tip) : null)))
            : h("p", { class: "muted" }, "Chưa có cỏ dại nào. Cả lớp làm tốt quá!")),
        h("div", { class: "card" }, h("h2", {}, "🤝 Em cần kèm"),
          t.help.length ? h("ul", { class: "help-list" }, t.help.slice(0, 12).map(x => h("li", {}, h("b", {}, x.s.name), " · ", x.why))) : h("p", { class: "muted" }, "Chưa có em nào cần kèm thêm."),
          h("h2", {}, "💬 Tin cần chú ý"),
          chat.length ? h("ul", { class: "help-list" }, chat.slice(0, 8).map(m => h("li", {}, h("b", {}, m.name), ": ", m.text, " ", btn("Xóa", async () => { await api.deleteChat(m.id); paint(); }, "btn btn-tiny btn-soft")))) : h("p", { class: "muted" }, "Không có tin nhắn bị lọc từ tục."))),
      h("p", { class: "small muted" }, "Cập nhật lúc " + new Date().toLocaleTimeString("vi-VN")));
  }
  const liveBtn = btn("🔴 Trực tiếp: tắt", () => {
    if (live) { clearInterval(live); live = null; liveBtn.textContent = "🔴 Trực tiếp: tắt"; }
    else { live = setInterval(() => document.body.contains(box) ? (document.hidden || paint()) : clearInterval(live), 60000); liveBtn.textContent = "🟢 Trực tiếp: 15 giây"; }
  }, "btn btn-soft");
  await paint();
  return shell("#/gv", `Hôm nay · Lớp ${TS.cur.name}`, [btn("📺 Chiếu lên tivi", () => tv(last), "btn btn-main"), liveBtn, btn("↻", paint, "btn btn-soft")], box);
}
function tv(t) {
  if (!t) return;
  const giant = t.top[0] && t.n && t.top[0].k / t.n >= 0.3 ? t.top[0] : null;
  const m = modal(h("div", { class: "tv" }, h("h1", {}, "☁️ Lớp " + TS.cur.name),
    h("div", { class: "stats" }, stat("Đã vào", `${t.joined}/${t.n}`, ""), stat("Đúng ngay", t.rate == null ? "–" : t.rate + "%", ""), stat("Tự sửa", t.fixedToday, ""), stat("Còn cỏ", t.withWeeds, "em")),
    giant ? h("div", { class: "giant" }, h("span", { html: weedSvg(150, 2) }), h("div", {}, h("h2", {}, "Cỏ dại khổng lồ!"), h("p", { class: "big" }, weedName(giant.label)), h("p", { class: "lead" }, "Cả lớp cùng nhổ cỏ này nhé!")))
      : h("div", {}, h("h2", {}, "Cỏ dại hay gặp"), t.top.map(w => h("p", { class: "big" }, "🌿 " + weedName(w.label))))), { wide: true });
  m.box.classList.add("modal-tv");
}

// ================================================================== Lớp của tôi
export async function classScreen() {
  await ensure(); if (!TS.cur) return noClass();
  const c = TS.cur, map = await loadMap();
  const toggle = (label, on, onchange) => { const inp = h("input", { type: "checkbox", role: "switch" }); inp.checked = on; inp.addEventListener("change", () => onchange(inp.checked)); return h("label", { class: "switch" }, inp, h("span", { class: "knob" }), h("span", {}, label)); };
  const zoneRows = () => map.zones.map(z => {
    const t = S().tests[z.id] || {};
    return h("tr", {}, h("td", {}, toggle(`Bài ${z.num} · ${z.zone}`, S().open.includes(z.id), v => { const o = new Set(S().open); v ? o.add(z.id) : o.delete(z.id); saveSettings({ open: [...o] }); })),
      h("td", {}, toggle("Kiểm tra đầu", !!t.pre, v => saveSettings({ tests: { ...S().tests, [z.id]: { ...(S().tests[z.id] || {}), pre: v } } }))),
      h("td", {}, toggle("Kiểm tra cuối", !!t.post, v => saveSettings({ tests: { ...S().tests, [z.id]: { ...(S().tests[z.id] || {}), post: v } } }))));
  });
  const grow = h("select", { onchange: e => saveSettings({ growSeconds: +e.target.value }) }, [[30, "30 giây"], [45, "45 giây"], [120, "2 phút"], [300, "5 phút"], [1800, "30 phút"], [7200, "2 giờ"]].map(([v, t]) => h("option", { value: v, selected: S().growSeconds === v }, t)));
  const ai = h("select", { onchange: e => saveSettings({ aiMode: e.target.value }) }, [["approved", "Chỉ dùng gợi ý đã duyệt"], ["ai", "Cho Tí Nị dùng AI"]].map(([v, t]) => h("option", { value: v, selected: S().aiMode === v }, t)));
  const list = h("div", { class: "tbl-wrap" });
  async function paintStudents() {
    let st; try { st = await api.listStudents(c.id); } catch (e) { return list.replaceChildren(h("p", { class: "bad-text" }, friendlyError(e))); }
    list._st = st;
    list.replaceChildren(st.length ? h("table", { class: "tbl" }, h("thead", {}, h("tr", {}, ["Tên", "Mật khẩu", "Lần vào gần nhất", "Hạt đã học", "Cỏ", ""].map(x => h("th", {}, x)))),
      h("tbody", {}, st.map(s => h("tr", {}, h("td", {}, h("b", {}, s.name)), h("td", { class: "small" }, s.has_pw ? "🔐 riêng" : "chung", jailedOf(s) ? h("span", { class: "tag tag-bad" }, " 🔒 đang bị giam") : null), h("td", { class: "small" }, fmtAgo(s.last_seen)),
        h("td", {}, Object.values(s.state?.seeds || {}).filter(x => x.done).length), h("td", {}, unfixedOf(s).length || "–"),
        h("td", { class: "row-actions" }, (jailedOf(s) ? btn("🔓 Thả", async () => { const j = { ...(S().jail || {}) }; delete j[s.id]; await saveSettings({ jail: j, release: { ...(S().release || {}), [s.id]: Date.now() } }); paintStudents(); }, "btn btn-tiny btn-mint")
          : btn("🔒 Giam", () => { const why = h("select", {}, ["Không chịu học bài", "Gian lận khi kiểm tra", "Mất trật tự trong giờ", "Chưa làm bài tập"].map(t => h("option", {}, t)));
            const m = modal(h("div", {}, h("h2", {}, `Đưa ${s.name} ra Đảo Giam Giữ`), h("p", { class: "small muted" }, "Em phải trả lời đúng 5 câu (từ các bài cô đã mở) mới được về quảng trường. Sáng thứ Hai cả lớp sẽ thấy thông báo."), why,
              h("div", { class: "actions" }, btn("Đưa ra đảo", async () => { m.close(); const r = { ...(S().release || {}) }; delete r[s.id]; await saveSettings({ jail: { ...(S().jail || {}), [s.id]: { at: Date.now(), name: s.name, reason: why.value } }, release: r }); paintStudents(); }, "btn btn-danger")))); }, "btn btn-tiny")),
          btn("Đặt lại MK", () => confirmBox(`Cho em ${s.name} dùng lại mật khẩu chung của lớp (${c.class_pw || ""})?`, async () => { await api.updateStudent(s.id, { pw_hash: null }); toast("Đã đặt lại", "ok"); paintStudents(); }), "btn btn-tiny"),
          btn("Xóa", () => confirmBox(`Xóa em ${s.name} và toàn bộ vườn của em?`, async () => { await api.deleteStudent(s.id); paintStudents(); }), "btn btn-tiny btn-danger"))))))
      : h("p", { class: "muted" }, "Lớp chưa có học sinh. Thêm tên ở ô bên dưới nhé."));
  }
  const names = h("textarea", { rows: 6, placeholder: "Mỗi dòng một tên, ví dụ:\nNguyễn An\nTrần Bình\nLê Chi" });
  await paintStudents();
  let tab = TS.classTab || "tq"; const body = h("div", {}), tabs = h("div", { class: "tabs" });
  const TABS = [["tq", "📋 Tổng quan"], ["hs", "👧 Học sinh"], ["bai", "📚 Mở bài & kiểm tra"]];
  function paintTab() {
    TS.classTab = tab; tabs.replaceChildren(...TABS.map(([k, t]) => h("button", { class: "tab" + (k === tab ? " on" : ""), onclick: () => { tab = k; paintTab(); } }, t)));
    const ann = h("input", { value: S().announce?.text || "", maxlength: 160, placeholder: "VD: Các em hoàn thành bài 9 trước thứ Sáu nhé!" });
    const annCard = h("div", { class: "card" }, h("h2", {}, "📢 Thông báo cho cả lớp"), h("p", { class: "small muted" }, "Dòng chữ sẽ chạy trên màn hình của mọi bạn trong lớp (tự tắt sau 24 giờ)."),
      h("div", { class: "row" }, ann, btn("📢 Gửi", async () => { const t = ann.value.trim(); if (!t) return toast("Cô nhập nội dung nhé."); await saveSettings({ announce: { text: t, at: Date.now() } }); toast("Đã gửi thông báo", "ok"); }, "btn btn-main"),
        btn("Tắt", async () => { ann.value = ""; await saveSettings({ announce: null }); toast("Đã tắt thông báo", "ok"); }, "btn btn-soft")));
    const urg = h("input", { value: S().urgent?.text || "", maxlength: 160, placeholder: "VD: Cả lớp dừng lại, nhìn lên bảng!" });
    const urgCard = h("div", { class: "card", style: { borderColor: "#e0203a" } }, h("h2", {}, "🚨 Thông báo khẩn"), h("p", { class: "small muted" }, S().urgent?.text ? "🔴 Đang phát: " + S().urgent.text : "Dòng chữ đỏ nhấp nháy, chạy liên tục trên màn hình học sinh cho đến khi cô bấm Tắt."),
      h("div", { class: "row" }, urg, btn("🚨 Phát", async () => { const t = urg.value.trim(); if (!t) return toast("Cô nhập nội dung nhé."); await saveSettings({ urgent: { text: t, at: Date.now() } }); toast("Đang phát thông báo khẩn", "ok"); paintTab(); }, "btn btn-main"),
        btn("Tắt", async () => { urg.value = ""; await saveSettings({ urgent: null }); toast("Đã tắt thông báo khẩn", "ok"); paintTab(); }, "btn btn-soft")));
    const sv = S().survey, svDone = sv ? (list._st || []).filter(st => st.state?.surveys?.[sv.id]) : [];
    const svQ = sv?.questions?.length ? sv.questions : SURVEY_Q;
    const svCard = h("div", { class: "card" }, h("h2", {}, "📋 Khảo sát học sinh"),
      h("p", { class: "small muted" }, sv?.on ? `🟢 Đang bật · ${svDone.length}/${(list._st || []).length} em đã làm. Em nào chưa làm sẽ phải làm xong mới dùng được chức năng khác.` : "Bật khảo sát: học sinh phải đánh giá xong (6 câu mặt cười + góp ý) mới dùng được chức năng khác."),
      h("div", { class: "actions" }, sv?.on ? btn("Tắt khảo sát", async () => { await saveSettings({ survey: { ...sv, on: false } }); paintTab(); }, "btn btn-soft")
        : btn("🟢 Bật khảo sát mới", async () => { await saveSettings({ survey: { id: Date.now().toString(36), on: true } }); paintTab(); }, "btn btn-main")),
      svDone.length ? h("div", {}, svQ.map((q, i) => { const avg = svDone.reduce((k, st) => k + (st.state.surveys[sv.id].ans[i] || 0), 0) / svDone.length;
        return h("div", { class: "cmp-row" }, h("b", { title: q }, q), h("div", { class: "cmp-track" }, h("i", { style: { width: avg / 5 * 100 + "%", background: "linear-gradient(90deg,#ffd23f,#4fd69c)" } })), h("span", {}, avg.toFixed(1) + "/5")); }),
        h("h3", {}, "Góp ý của học sinh"), h("ul", { class: "help-list" }, svDone.filter(st => st.state.surveys[sv.id].cm).map(st => h("li", {}, h("b", {}, st.name + ": "), st.state.surveys[sv.id].cm)))) : null);
    const bo = S().boss, nSt = (list._st || []).length, bHit = bo ? (list._st || []).reduce((a, st) => a + (st.state?.avatar?.bh?.id === bo.id ? st.state.avatar.bh.n || 0 : 0), 0) : 0;
    const hpIn = h("input", { type: "number", min: 10, value: Math.max(30, nSt * 25), style: { width: "90px" } });
    const bossCard = h("div", { class: "card" }, h("h2", {}, "👾 Boss cả lớp"),
      bo?.on ? h("div", {}, h("p", {}, `Đang đánh "${bo.name}": ${Math.min(bHit, bo.hp)}/${bo.hp} máu đã trừ ${bHit >= bo.hp ? "· 🎉 Cả lớp đã thắng!" : ""}`), h("div", { class: "boss-hp" }, h("i", { style: { width: Math.max(0, 100 - bHit / bo.hp * 100) + "%" } })),
          h("ol", { class: "small" }, (list._st || []).map(st => ({ n: st.name, k: st.state?.avatar?.bh?.id === bo.id ? st.state.avatar.bh.n || 0 : 0 })).filter(x => x.k).sort((a, b) => b.k - a.k).slice(0, 5).map(x => h("li", {}, `${x.n}: ${x.k} lần trúng`))),
          btn("Kết thúc Boss", async () => { await saveSettings({ boss: { ...bo, on: false } }); paintTab(); }, "btn btn-soft"))
        : h("div", {}, h("p", { class: "small muted" }, "Triệu hồi Quái vật Ô nhiễm: cả lớp trả lời đúng để trừ máu (mỗi câu đúng −1, câu Vận dụng −2). Thắng thì mỗi em nhận +15💧 và 1 thẻ."),
          h("div", { class: "row" }, h("span", {}, "Máu của Boss:"), hpIn, btn("👾 Triệu hồi Boss", async () => { await saveSettings({ boss: { id: Date.now().toString(36), on: true, hp: Math.max(10, +hpIn.value || 30), name: "Quái vật Ô nhiễm" } }); toast("Boss đã xuất hiện! 👾", "ok"); paintTab(); }, "btn btn-main"))));
    const delCard = h("div", { class: "card" }, h("h2", {}, "🗑️ Xóa lớp học"), h("p", { class: "small muted" }, "Xóa lớp sẽ xóa luôn học sinh, bài làm và điểm của lớp này. Không khôi phục được."),
      btn("Xóa lớp " + c.name, () => { const inp = h("input", { placeholder: "Gõ đúng tên lớp: " + c.name });
        const m = modal(h("div", {}, h("h2", {}, "Xóa lớp " + c.name + "?"), h("p", {}, "Toàn bộ học sinh, bài làm, điểm của lớp sẽ bị xóa vĩnh viễn. Cô gõ đúng tên lớp để xác nhận."), inp,
          h("div", { class: "actions" }, btn("Xóa vĩnh viễn", async () => { if (inp.value.trim() !== c.name) return toast("Tên lớp chưa đúng.", "bad");
            try { await api.deleteClass(c.id); TS.classes = TS.classes.filter(x => x.id !== c.id); TS.cur = TS.classes[0] || null; LS.set("kvtm-gv-class", TS.cur?.id || ""); m.close(); toast("Đã xóa lớp " + c.name, "ok"); location.hash = "#/gv"; rerender(); } catch (e) { toast(friendlyError(e), "bad"); } }, "btn btn-danger"),
            btn("Hủy", () => m.close(), "btn btn-soft")))); }, "btn btn-danger"));
    if (tab === "tq") body.replaceChildren(h("div", { class: "grid-2" }, annCard, urgCard), h("div", { class: "grid-2" },
      h("div", { class: "card center" }, h("div", { class: "muted" }, `Mã riêng của lớp ${c.name}`), h("div", { class: "class-code" }, c.code), h("p", { class: "small muted" }, `${(list._st || []).length} học sinh · ${S().open.length} bài đang mở`), h("div", { class: "pw-box" }, h("span", {}, "🔑 Mật khẩu chung: ", h("b", {}, c.class_pw || "—")), btn("Đổi", () => {
        const inp = h("input", { value: c.class_pw || "", maxlength: 20 });
        const m = modal(h("div", {}, h("h2", {}, "Mật khẩu chung của lớp"), h("p", { class: "small muted" }, "Em nào chưa tạo mật khẩu riêng sẽ đăng nhập bằng mật khẩu này."), inp,
          h("div", { class: "actions" }, btn("Lưu", async () => { const v = inp.value.trim(); if (v.length < 4) return toast("Ít nhất 4 kí tự."); try { Object.assign(c, await api.updateClass(c.id, { class_pw: v })); m.close(); toast("Đã lưu", "ok"); paintTab(); } catch (e) { toast(friendlyError(e), "bad"); } }, "btn btn-main"))));
      }, "btn btn-tiny")),
      h("p", { class: "small muted" }, "Học sinh vào web → Học sinh → nhập mã lớp → chọn tên → nhập mật khẩu chung. Vào xong em có thể tạo mật khẩu riêng.")),
      h("div", { class: "card" }, h("h2", {}, "Công tắc lớp"),
        toggle("🔇 Tắt nhạc cả lớp", S().mute, v => saveSettings({ mute: v })), toggle("💬 Cho phép trò chuyện lớp", S().chat !== false, v => saveSettings({ chat: v })),
        h("label", { class: "lbl-row" }, "🌱 Thời gian một cây lớn", grow), h("label", { class: "lbl-row" }, "🤖 Tí Nị", ai),
        h("p", { class: "small muted" }, "Khi bật AI: không gửi tên học sinh, chặn lộ đáp án, giới hạn lượt hỏi mỗi ngày."))), svCard, bossCard, delCard);
    if (tab === "hs") body.replaceChildren(h("div", { class: "hs-grid" },
      h("div", { class: "card" }, h("h2", {}, `Danh sách (${(list._st || []).length})`), h("div", { class: "list-scroll" }, list)),
      h("div", { class: "card" }, h("h2", {}, "➕ Thêm học sinh"), h("p", { class: "small muted" }, "Dán cả danh sách từ Excel cũng được. Các em đăng nhập bằng mật khẩu chung của lớp."), names,
        h("div", { class: "actions" }, btn("Thêm vào lớp", async () => {
          const arr = [...new Set(names.value.split(/\n|,|\t/).map(s => s.trim()).filter(Boolean))].slice(0, 60); if (!arr.length) return toast("Thầy cô nhập ít nhất một tên nhé.");
          try { await api.addStudents(c.id, arr); names.value = ""; toast(`Đã thêm ${arr.length} em.`, "ok"); await paintStudents(); paintTab(); } catch (e) { toast(friendlyError(e), "bad"); }
        }, "btn btn-main"), btn("🖨️ In thẻ đăng nhập", () => printCards(c, list._st || []), "btn btn-soft")))));
    if (tab === "bai") body.replaceChildren(h("div", { class: "card" }, h("p", { class: "small muted", style: { marginTop: 0 } }, "Bật bài nào thì học sinh mới thấy bài đó. Câu hỏi trò chơi, cỏ dại và UFO cũng chỉ lấy từ bài đã mở."), h("div", { class: "zone-grid" }, zoneRows().map(r => h("div", { class: "zone-cell" }, ...[...r.children].map(td => td.firstChild))))));
  }
  paintTab();
  return shell("#/gv/lop", "Lớp " + c.name, [btn("➕ Thêm lớp", () => newClassModal(), "btn btn-soft")], tabs, body);
}
export function newClassModal() {
  const inp = h("input", { placeholder: "Tên lớp, ví dụ 6A1", maxlength: 60 });
  const m = modal(h("div", {}, h("h2", {}, "➕ Thêm lớp mới"), h("p", { class: "small muted" }, "Mỗi lớp có một mã riêng 6 kí tự để học sinh vào lớp."), inp,
    h("div", { class: "actions" }, btn("Tạo lớp", async () => {
      if (!inp.value.trim()) return;
      try { const nc = await api.createClass(inp.value.trim()); TS.classes.push(nc); TS.cur = nc; LS.set("kvtm-gv-class", nc.id); m.close(); TS.classTab = "hs"; toast(`Đã tạo lớp ${nc.name}, mã lớp ${nc.code}`, "ok", 6000); location.hash === "#/gv/lop" ? rerender() : location.hash = "#/gv/lop"; } catch (e) { toast(friendlyError(e), "bad"); }
    }, "btn btn-main"))));
  setTimeout(() => inp.focus(), 50);
}
function jailedOf(s) { const t = S().jail?.[s.id], st = s.state || {}; if (t && !st.jailFree?.[t.at]) return true; const j = st.jail; return !!(j && !j.freed && j.at > (S().release?.[s.id] || 0)); }
function confirmBox(msg, ok) { const m = modal(h("div", {}, h("p", { class: "lead" }, msg), h("div", { class: "actions" }, btn("Hủy", () => m.close(), "btn btn-soft"), btn("Đồng ý", async () => { m.close(); try { await ok(); } catch (e) { toast(friendlyError(e), "bad"); } }, "btn btn-danger")))); }
function printArea(nodes) { let a = document.getElementById("print-area"); if (!a) { a = h("div", { id: "print-area" }); document.body.append(a); } a.replaceChildren(...nodes); setTimeout(() => window.print(), 80); }
function printCards(c, students) {
  if (!students.length) return toast("Lớp chưa có học sinh.");
  printArea([h("div", { class: "print-cards" }, students.map(s => h("div", { class: "pcard" }, h("div", { class: "pcard-head" }, "☁️ Khu vườn trên mây"), h("div", { class: "pcard-name" }, s.name), h("div", {}, "Mã lớp: ", h("b", {}, c.code)), h("div", {}, "Mật khẩu: ", h("b", {}, s.has_pw ? "(mật khẩu riêng của em)" : c.class_pw)),
    )))]);
}

// ================================================================== Trò chơi và kiểm tra
export async function gamesScreen() {
  await ensure(); if (!TS.cur) return noClass();
  const map = await loadMap(); const openZ = map.zones.filter(z => S().open.includes(z.id));
  const active = await api.gameActive(TS.cur.id).catch(() => null), rcvOn = await api.rcvActive(TS.cur.id).catch(() => null);
  const sets = await api.listSets().catch(() => []);
  function picker(multi = true) {
    const chosen = new Set(openZ.slice(-2).map(z => z.id)); const setSel = new Set();
    let src = "co-san"; const pane = h("div", {}), st = h("div", { class: "tabs tabs-sm" });
    const zb = openZ.map(z => { const b = h("button", { class: "chip" + (chosen.has(z.id) ? " on" : ""), onclick: () => { chosen.has(z.id) ? chosen.delete(z.id) : chosen.add(z.id); b.classList.toggle("on"); } }, `Bài ${z.num}`); return b; });
    const sb = sets.map(s => { const b = h("button", { class: "chip", onclick: () => { setSel.has(s.id) ? setSel.delete(s.id) : setSel.add(s.id); b.classList.toggle("on"); } }, "🗂️ " + s.title); return b; });
    const paintS = () => { st.replaceChildren(...[["co-san", "📚 Nội dung có sẵn"], ["cua-co", "🗂️ Bộ câu hỏi của cô"]].map(([k, t]) => h("button", { class: "tab" + (k === src ? " on" : ""), onclick: () => { src = k; paintS(); } }, t)));
      pane.replaceChildren(src === "co-san" ? h("div", { class: "lab-pick wrap" }, zb.length ? zb : h("p", { class: "muted" }, "Cô chưa mở bài nào."))
        : sb.length ? h("div", { class: "lab-pick wrap" }, sb) : h("p", { class: "small" }, "Cô chưa có bộ câu hỏi. ", h("a", { href: "#/gv/bo-cau-hoi" }, "➕ Tạo bộ câu hỏi"))); };
    paintS(); const el = h("div", {}, st, pane);
    return { el, lessons: () => src === "co-san" ? [...chosen] : [], sets: () => src === "cua-co" ? sets.filter(s => setSel.has(s.id)) : [] };
  }
  function openGame(kind) {
    const p = picker(); let minutes = 5, review = false;
    let qtime = 20; const qts = [15, 20, 25, 35].map(n => { const b = h("button", { class: "chip" + (n === 20 ? " on" : ""), onclick: () => { qtime = n; qts.forEach(x => x.classList.toggle("on", x === b)); } }, n + " giây/câu"); return b; });
    const mins = [5, 8, 10].map(n => { const b = h("button", { class: "chip" + (n === 5 ? " on" : ""), onclick: () => { minutes = n; mins.forEach(x => x.classList.toggle("on", x === b)); } }, n + " phút"); return b; });
    const m = modal(h("div", {}, h("h2", {}, kind === "race" ? "🎈 Đua khinh khí cầu" : "🔐 Hack Mật Mã Mây"),
      h("h3", {}, "Bước 1 · Nội dung"), p.el, h("h3", {}, "Bước 2 · Thời gian"), h("div", { class: "lab-pick" }, mins), h("p", { class: "small muted" }, "Thời gian mỗi câu (em nào trả lời xong tự sang câu tiếp, không chờ bạn):"), h("div", { class: "lab-pick" }, qts),
      kind === "hack" ? h("label", { class: "switch" }, (() => { const i = h("input", { type: "checkbox" }); i.addEventListener("change", () => review = i.checked); return i; })(), h("span", { class: "knob" }), h("span", {}, "Chỉ ôn (tắt Hack và gió cuốn)")) : null,
      h("h3", {}, "Bước 3"), btn("Mở phòng ➜", async () => {
        const qs = await gameQuestions(p.lessons(), p.sets()); if (qs.length < 3) return toast("Cần ít nhất 3 câu trắc nghiệm. Chọn thêm bài nhé.");
        const puzzles = await gamePuzzles(p.lessons());
        try { const id = await api.gameCreate({ classId: TS.cur.id, kind, minutes, qtime, reviewOnly: review, questions: qs, puzzles }); m.close(); projector(id, rerender); }
        catch (e) { toast(friendlyError(e), "bad"); }
      }, "btn btn-main btn-big")), { wide: true });
  }
  function openAssign() {
    const p = picker(); let count = 8;
    const nums = [5, 8, 10, 15].map(n => { const b = h("button", { class: "chip" + (n === 8 ? " on" : ""), onclick: () => { count = n; nums.forEach(x => x.classList.toggle("on", x === b)); } }, n + " câu"); return b; });
    const title = h("input", { value: "Kiểm tra cả lớp " + new Date().toLocaleDateString("vi-VN") });
    const m = modal(h("div", {}, h("h2", {}, "📝 Giao bài kiểm tra cả lớp"), h("label", { class: "lbl-block" }, "Tên bài", title), p.el, h("div", { class: "lab-pick" }, nums),
      btn("Giao bài ➜", async () => {
        let qs = []; for (const id of p.lessons()) qs.push(...(await lessonTestQuestions(id)).map(({ _key, _seed, ...q }) => q));
        p.sets().forEach(s => qs.push(...s.questions.filter(q => q.type !== "essay").map(q => ({ type: "mcq", level: q.level || "hieu", prompt: q.prompt, explain: q.explain || "", hints: [], options: q.options.map((t, i) => i === q.correct ? { text: t, correct: true } : { text: t, code: "" }) }))));
        qs = qs.sort(() => Math.random() - 0.5).slice(0, count); if (!qs.length) return toast("Chọn bài hoặc bộ câu hỏi nhé.");
        await saveSettings({ assign: { id: Date.now().toString(36), title: title.value.trim() || "Bài kiểm tra", questions: qs, open: true, at: new Date().toISOString() } });
        m.close(); toast("Đã giao bài. Học sinh thấy nút Kiểm tra sáng lên trong vương quốc.", "ok"); rerender();
      }, "btn btn-main btn-big")), { wide: true });
  }
  function openRcv() {
    const p = picker(); let n = 15, qt = 20; const chosen = new Set([TS.cur.id]);
    const cls = TS.classes.map(c => { const b = h("button", { class: "chip" + (chosen.has(c.id) ? " on" : ""), onclick: () => { chosen.has(c.id) ? chosen.delete(c.id) : chosen.add(c.id); b.classList.toggle("on"); } }, "Lớp " + c.name); return b; });
    const ns = [10, 15, 20, 30].map(k => { const b = h("button", { class: "chip" + (k === n ? " on" : ""), onclick: () => { n = k; ns.forEach(x => x.classList.toggle("on", x === b)); } }, k + " câu"); return b; });
    const ts = [15, 20, 30].map(k => { const b = h("button", { class: "chip" + (k === qt ? " on" : ""), onclick: () => { qt = k; ts.forEach(x => x.classList.toggle("on", x === b)); } }, k + " giây/câu"); return b; });
    const code = h("input", { placeholder: "Mã phòng của thầy cô khác (5 kí tự)", style: { maxWidth: "260px" } });
    const m = modal(h("div", {}, h("h2", {}, "🔔 Rung chuông vàng liên lớp"), h("p", { class: "small muted" }, "Nhiều lớp thi cùng lúc. Trả lời sai là rời sàn, cô có thể cứu trợ. Bạn trụ đến cuối rung chuông vàng (+20💧)."),
      h("h3", {}, "Bước 1 · Các lớp tham gia"), h("div", { class: "lab-pick wrap" }, cls), h("h3", {}, "Bước 2 · Nội dung"), p.el, h("div", { class: "lab-pick" }, ns), h("div", { class: "lab-pick" }, ts),
      h("div", { class: "actions" }, btn("🔔 Mở sàn đấu", async () => { const qs = (await gameQuestions(p.lessons(), p.sets())).slice(0, n); if (qs.length < 3) return toast("Cần ít nhất 3 câu trắc nghiệm.");
        try { const id = await api.rcvCreate([...chosen], qs.map(q => ({ prompt: q.prompt, options: q.options, correct: q.correct })), qt); m.close(); rcvProjector(id, rerender); } catch (e) { toast(friendlyError(e), "bad"); } }, "btn btn-main btn-big")),
      h("h3", {}, "Hoặc: đưa lớp " + TS.cur.name + " vào sàn đấu của thầy cô khác"), h("div", { class: "row" }, code, btn("Tham gia", async () => { try { const id = await api.rcvJoin(code.value, TS.cur.id); m.close(); rcvProjector(id, rerender); } catch (e) { toast("Không tìm thấy phòng với mã này.", "bad"); } }, "btn btn-soft"))), { wide: true });
  }
  function openKt15() {
    const p = picker(); const title = h("input", { value: "Kiểm tra 15 phút " + new Date().toLocaleDateString("vi-VN") });
    const nTN = h("input", { type: "number", min: 0, max: 20, value: 6, style: { width: "70px" } }), pTN = h("input", { type: "number", min: 0, max: 10, step: 0.5, value: 6, style: { width: "70px" } });
    const essList = [], essBox = h("div", {}), pTL = h("input", { type: "number", min: 0, max: 10, step: 0.5, value: 4, style: { width: "70px" } });
    const addEss = (t = "") => { const ta = h("textarea", { rows: 3, placeholder: "Câu tự luận " + (essList.length + 1) + " (có thể gồm a, b, c… ngay trong khung này)" }, t); essList.push(ta);
      essBox.append(h("div", { class: "row" }, h("b", {}, "Câu " + essList.length), ta, btn("✕", e => { const i = essList.indexOf(ta); essList.splice(i, 1); e.target.closest(".row").remove(); }, "btn btn-tiny btn-soft"))); };
    addEss(); const ess = h("div", {}, essBox, btn("➕ Thêm câu tự luận", () => addEss(), "btn btn-soft btn-tiny"));
    const m = modal(h("div", {}, h("h2", {}, "⏱️ Kiểm tra 15 phút"), h("label", { class: "lbl-block" }, "Tên bài", title),
      h("h3", {}, "Phần trắc nghiệm (máy tự chấm)"), p.el, h("div", { class: "row" }, "Số câu:", nTN, "Tổng điểm:", pTN),
      h("h3", {}, "Phần tự luận (cô chấm)"), ess, h("div", { class: "row" }, "Tổng điểm tự luận (chia đều các câu):", pTL),
      btn("Giao bài 15 phút ➜", async () => {
        let qs = []; for (const id of p.lessons()) qs.push(...(await lessonTestQuestions(id)).filter(q => q.type === "mcq").map(({ _key, _seed, ...q }) => q));
        p.sets().forEach(s => qs.push(...s.questions.filter(q => q.type !== "essay").map(q => ({ type: "mcq", prompt: q.prompt, options: q.options.map((t, i) => i === q.correct ? { text: t, correct: true } : { text: t }) }))));
        qs = qs.sort(() => Math.random() - 0.5).slice(0, +nTN.value || 0); const el = [...essList.map(x => x.value.trim()).filter(Boolean), ...p.sets().flatMap(s => s.questions.filter(q => q.type === "essay").map(q => q.prompt))];
        if (!qs.length && !el.length) return toast("Cần ít nhất 1 câu trắc nghiệm hoặc tự luận.");
        await saveSettings({ kt15: { id: Date.now().toString(36), title: title.value.trim() || "Kiểm tra 15 phút", minutes: 15, mcq: qs.map(q => ({ prompt: q.prompt, options: q.options.map(o => o.text), correct: q.options.findIndex(o => o.correct) })), mcqPts: +pTN.value || 0,
          essays: el.map(t => ({ prompt: t, pts: Math.round((+pTL.value || 0) / el.length * 100) / 100 })), open: true, grades: {}, published: false, at: new Date().toISOString() } });
        m.close(); toast("Đã giao bài 15 phút. Học sinh vào là phải làm ngay.", "ok"); location.hash = "#/gv/kt15";
      }, "btn btn-main btn-big")), { wide: true });
  }
  const a = S().assign;
  let assignCard = null;
  if (a) {
    const st = await api.listStudents(TS.cur.id).catch(() => []); const done = st.filter(s => s.state?.assign?.[a.id]);
    assignCard = h("div", { class: "card" }, h("div", { class: "row-between" }, h("h2", {}, "📝 " + a.title), h("span", { class: "tag" }, a.open ? "Đang mở" : "Đã đóng")),
      h("p", {}, `${done.length}/${st.length} em đã nộp · điểm trung bình ${done.length ? (done.reduce((k, s) => k + s.state.assign[a.id].score, 0) / done.length).toFixed(1) : "–"}/${a.questions.length}`),
      h("div", { class: "tbl-wrap" }, h("table", { class: "tbl" }, h("tbody", {}, st.map(s => h("tr", {}, h("td", {}, s.name), h("td", {}, s.state?.assign?.[a.id] ? `${s.state.assign[a.id].score}/${s.state.assign[a.id].total}` : "chưa nộp")))))),
      h("div", { class: "actions" }, a.open ? btn("Đóng bài", () => saveSettings({ assign: { ...a, open: false } }).then(rerender), "btn btn-soft") : btn("Mở lại", () => saveSettings({ assign: { ...a, open: true } }).then(rerender), "btn btn-soft")));
  }
  const card = (ic, bg, t, d, b) => h("div", { class: "card" }, h("div", { class: "g-ic", style: { background: bg } }, ic), h("h2", {}, t), h("p", { class: "lead" }, d), b);
  return shell("#/gv/tro-choi", "Trò chơi và kiểm tra", [active ? btn("📺 Mở lại màn chiếu đang chơi", () => projector(active, rerender), "btn btn-main") : null],
    h("div", { class: "game-grid" },
      card("🔐", "linear-gradient(140deg,#2f2346,#7351e6)", "Hack Mật Mã Mây", "Mỗi em giữ một Két Mây. Trả lời đúng để nhận tinh thể, mở hộp quà, phá mật mã két bạn.", btn("Mở phòng", () => openGame("hack"), "btn btn-main")),
      card("🎈", "linear-gradient(140deg,#5bb8ff,#ffd6ec)", "Đua khinh khí cầu", "Trả lời đúng là khinh khí cầu bay cao hơn. Trả lời nhanh được thưởng thêm.", btn("Mở phòng", () => openGame("race"), "btn btn-main")),
      card("🔔", "linear-gradient(140deg,#ffd23f,#ff8a3d)", "Rung chuông vàng liên lớp", "Nhiều lớp cùng thi trên một sàn đấu. Sai là rời sàn, cô có quyền cứu trợ.", h("div", { class: "actions" }, btn("Mở sàn đấu", openRcv, "btn btn-main"), rcvOn ? btn("📺 Màn chiếu", () => rcvProjector(rcvOn, rerender), "btn btn-soft") : null)),
      card("⏱️", "linear-gradient(140deg,#ff8a3d,#ffd23f)", "Kiểm tra 15 phút", "Trắc nghiệm máy tự chấm + tự luận cô chấm. Xuất Excel, công bố điểm cho học sinh.", h("div", { class: "actions" }, btn("Giao bài", openKt15, "btn btn-main"), S().kt15 ? btn("Chấm bài", () => location.hash = "#/gv/kt15", "btn btn-soft") : null)),
      card("📝", "linear-gradient(140deg,#9c7cff,#5bb8ff)", "Kiểm tra cả lớp", "Giao bài kiểm tra từ các bài đã học hoặc bộ câu hỏi của cô. Xem điểm ngay.", btn("Giao bài", openAssign, "btn btn-lav")),
      card("🗂️", "linear-gradient(140deg,#4fd69c,#c3f06a)", "Bộ câu hỏi của tôi", `${sets.length} bộ. Gõ, dán từ Excel, nhập file Excel hoặc nhờ Tí Nị soạn nháp.`, btn("Mở", () => location.hash = "#/gv/bo-cau-hoi", "btn btn-mint"))),
    assignCard ? h("div", { style: { marginTop: "18px" } }, assignCard) : null,
    h("p", { class: "small muted" }, "Câu trả lời trong trò chơi lưu riêng, không tính vào hạt giống, kiểm tra hay phiếu báo cáo. Mục tiêu bị hack do máy chọn ngẫu nhiên; màn chiếu không ghi ai hack ai; mỗi két bị hack tối đa 3 lần mỗi ván."));
}

// ================================================================== Bộ câu hỏi của tôi
export async function setsScreen() {
  await ensure(); if (!TS.cur) return noClass();
  let sets = await api.listSets().catch(() => []); let cur = null;
  const box = h("div", {});
  const blankQ = () => ({ prompt: "", options: ["", "", "", ""], correct: 0, explain: "", level: "hieu" });
  function list() {
    cur = null;
    box.replaceChildren(h("div", { class: "actions" }, btn("➕ Bộ câu hỏi mới", () => edit({ title: "Bộ câu hỏi mới", questions: [blankQ()] }), "btn btn-main")),
      sets.length ? h("div", { class: "game-grid", style: { marginTop: "16px" } }, sets.map(s => h("div", { class: "card" }, h("h2", {}, s.title), h("p", { class: "muted" }, `${s.questions.length} câu · ${s.questions.filter(q => !q.type || q.type === "mcq").length} trắc nghiệm · ${s.questions.filter(q => q.type === "tf").length} đúng/sai · ${s.questions.filter(q => q.type === "essay").length} tự luận`),
        h("div", { class: "actions" }, btn("Sửa", () => edit(structuredClone(s)), "btn btn-soft"), btn("Xóa", () => confirmBox("Xóa bộ câu hỏi này?", async () => { await api.deleteSet(s.id); sets = await api.listSets(); list(); }), "btn btn-danger btn-tiny")))))
        : h("p", { class: "muted" }, "Chưa có bộ câu hỏi nào."));
  }
  function edit(s) {
    cur = s;
    const title = h("input", { value: s.title, oninput: e => s.title = e.target.value });
    const qbox = h("div", {});
    const paintQs = () => qbox.replaceChildren(...s.questions.map((q, qi) => h("div", { class: "q-editor" },
      h("div", { class: "row-between" }, h("b", {}, `Câu ${qi + 1}`), h("div", { class: "row" },
        h("select", { style: { width: "auto" }, onchange: e => { q.type = e.target.value; if (q.type === "tf") { q.options = ["Đúng", "Sai"]; q.correct = q.correct ? 1 : 0; } else if (q.type === "mcq" && q.options.length < 4) { q.options = [...q.options, "", "", "", ""].slice(0, 4); } paintQs(); } },
          [["mcq", "Trắc nghiệm 4 đáp án"], ["tf", "Đúng / Sai"], ["essay", "Tự luận"]].map(([v, t]) => h("option", { value: v, selected: (q.type || "mcq") === v }, t))), h("select", { onchange: e => q.level = e.target.value, style: { width: "auto" } }, [["biet", "Biết"], ["hieu", "Hiểu"], ["vandung", "Vận dụng"]].map(([v, t]) => h("option", { value: v, selected: q.level === v }, t))),
        btn("✕", () => { s.questions.splice(qi, 1); paintQs(); }, "btn btn-tiny btn-soft"))),
      q.type === "essay" ? h("textarea", { rows: 3, placeholder: "Nội dung câu tự luận (có thể gồm a, b, c… trong cùng một câu)", oninput: e => q.prompt = e.target.value }, q.prompt) : h("input", { value: q.prompt, placeholder: "Nội dung câu hỏi", oninput: e => q.prompt = e.target.value }),
      q.type === "essay" ? h("div", {}, h("textarea", { rows: 2, placeholder: "Gợi ý đáp án / hướng dẫn chấm (học sinh không thấy)", oninput: e => q.answer = e.target.value }, q.answer || ""),
          h("label", { class: "row small" }, "Điểm câu này:", h("input", { type: "number", min: 0.25, step: 0.25, value: q.pts || 1, style: { width: "80px" }, oninput: e => q.pts = +e.target.value || 1 })))
      : q.type === "tf" ? h("div", { class: "row" }, ["Đúng", "Sai"].map((t, oi) => h("label", { class: "chip" + (q.correct === oi ? " on" : "") }, h("input", { type: "radio", name: "c" + qi, checked: q.correct === oi, onchange: () => { q.correct = oi; paintQs(); }, style: { width: "auto" } }), " Phát biểu này " + t)))
      : h("div", { class: "opts-ed" }, q.options.map((o, oi) => h("label", { class: "row" }, h("input", { type: "radio", name: "c" + qi, checked: q.correct === oi, onchange: () => q.correct = oi, style: { width: "auto" } }), h("input", { value: o, placeholder: "Đáp án " + "ABCD"[oi], oninput: e => q.options[oi] = e.target.value })))),
      h("input", { value: q.explain, placeholder: "Giải thích ngắn (hiện sau khi trả lời)", oninput: e => q.explain = e.target.value }))));
    paintQs();
    const paste = h("textarea", { rows: 4, placeholder: "Dán từ Excel, mỗi dòng một câu, các cột cách nhau bằng Tab hoặc dấu |\nTrắc nghiệm: Câu hỏi | A | B | C | D | Đáp án A-D | Giải thích\nĐúng/Sai: ĐS | Phát biểu | Đúng hoặc Sai | Giải thích\nTự luận: TL | Câu hỏi | Gợi ý đáp án | Điểm" });
    const file = h("input", { type: "file", accept: ".xlsx,.xls,.csv", onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm"); const wb = XLSX.read(await f.arrayBuffer()); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        addRows(rows.map(r => r.map(x => String(x ?? "")))); } catch (err) { toast("Chưa đọc được file. Cô thử dán từ Excel vào ô bên trên nhé.", "bad"); }
    } });
    async function autoSave() { const ok = s.questions.filter(q => q.prompt.trim() && (q.type === "essay" || q.options.filter(o => o.trim()).length >= 2)); if (!ok.length) return;
      try { const r = await api.saveSet({ ...s, questions: ok }); if (r?.id) s.id = r.id; sets = await api.listSets(); toast("💾 Đã tự lưu bộ câu hỏi", "ok", 1500); } catch (e) { toast(friendlyError(e), "bad"); } }
    function addRows(rows) {
      let n = 0;
      rows.forEach(c => { const tag = String(c[0] || "").trim().toUpperCase();
        if ((tag === "ĐS" || tag === "DS") && c[1]) { s.questions.push({ type: "tf", prompt: c[1].trim(), options: ["Đúng", "Sai"], correct: /^s/i.test(String(c[2] || "").trim()) ? 1 : 0, explain: (c[3] || "").trim(), level: "hieu" }); n++; return; }
        if (tag === "TL" && c[1]) { s.questions.push({ type: "essay", prompt: c[1].trim(), options: [], answer: (c[2] || "").trim(), pts: +c[3] || 1, explain: "", level: "vandung" }); n++; return; }
        if (c.length < 6 || !c[0].trim() || /^câu hỏi$/i.test(c[0].trim())) return; const k = "ABCD".indexOf(String(c[5]).trim().toUpperCase()[0]); if (k < 0) return;
        s.questions.push({ prompt: c[0].trim(), options: c.slice(1, 5).map(x => x.trim()), correct: k, explain: (c[6] || "").trim(), level: "hieu" }); n++; });
      s.questions = s.questions.filter(q => q.prompt.trim()); paintQs(); toast(`Đã thêm ${n} câu`, n ? "ok" : "bad"); if (n) autoSave();
    }
    const topic = h("input", { placeholder: "Chủ đề để Tí Nị soạn nháp, ví dụ: sự nóng chảy của nước đá" });
    box.replaceChildren(h("label", { class: "lbl-block" }, "Tên bộ câu hỏi", title), qbox,
      h("div", { class: "actions" }, btn("➕ Thêm câu", () => { s.questions.push(blankQ()); paintQs(); }, "btn btn-soft"), btn("➕ Câu Đúng/Sai", () => { s.questions.push({ ...blankQ(), type: "tf", options: ["Đúng", "Sai"] }); paintQs(); }, "btn btn-soft"), btn("➕ Câu tự luận", () => { s.questions.push({ ...blankQ(), type: "essay", options: [], pts: 1, level: "vandung" }); paintQs(); }, "btn btn-soft")),
      h("div", { class: "card" }, h("h3", {}, "Dán từ Excel hoặc nhập file"), paste, h("div", { class: "actions" }, btn("Thêm các dòng đã dán", () => { addRows(paste.value.split("\n").map(l => l.includes("\t") ? l.split("\t") : l.split("|"))); paste.value = ""; }, "btn btn-soft"), file)),
      h("div", { class: "card" }, h("h3", {}, "🤖 Tí Nị soạn nháp"), h("p", { class: "small muted" }, "Cần bật AI trên máy chủ (xem README). Câu nháp luôn để cô sửa trước khi dùng."), h("div", { class: "row" }, topic, btn("Soạn nháp", async () => {
        try { const r = await api.tiniDraft(topic.value.trim()); (r.questions || []).forEach(q => s.questions.push({ ...blankQ(), ...q })); s.questions = s.questions.filter(q => q.prompt.trim()); paintQs(); toast("Tí Nị đã soạn nháp, cô kiểm tra lại nhé!", "ok"); autoSave(); }
        catch { toast("Tí Nị chưa soạn được: máy chủ AI chưa bật hoặc đang lỗi.", "bad"); }
      }, "btn btn-soft"))),
      h("div", { class: "actions" }, btn("💾 Lưu bộ câu hỏi", async () => {
        s.questions = s.questions.filter(q => q.prompt.trim() && (q.type === "essay" || q.options.filter(o => o.trim()).length >= 2));
        if (!s.questions.length) return toast("Bộ câu hỏi cần ít nhất 1 câu đủ nội dung.");
        try { const r = await api.saveSet(s); if (r?.id) s.id = r.id; sets = await api.listSets(); toast("Đã lưu", "ok"); list(); } catch (e) { toast(friendlyError(e), "bad"); }
      }, "btn btn-main btn-big"), btn("Quay lại", list, "btn btn-soft")));
  }
  list();
  return shell("#/gv/tro-choi", "Bộ câu hỏi của tôi", [btn("⬅ Trò chơi và kiểm tra", () => location.hash = "#/gv/tro-choi", "btn btn-soft")], box);
}

// ================================================================== Báo cáo
export async function reportScreen() {
  await ensure(); if (!TS.cur) return noClass();
  let d; try { d = await classData(30); } catch (e) { return shell("#/gv/bao-cao", "Báo cáo", [], h("p", { class: "bad-text" }, friendlyError(e))); }
  const tabs = [["dungsai", "📊 Phân tích đúng/sai"], ["phieu", "📄 Phiếu phụ huynh"], ["hieuqua", "📈 Báo cáo hiệu quả"]]; let cur = "dungsai";
  const all = await loadAllLessons();
  const bar = h("div", { class: "tabs" }), body = h("div", {});
  const openLessons = d.map.zones.filter(z => (TS.cur.settings?.open || []).includes(z.id));
  const slips = d.students.map(s => {
    const st = s.state || {}, seeds = Object.values(st.seeds || {}).filter(x => x.done).length;
    const mine = d.answers.filter(a => a.student_id === s.id && a.kind === "seed" && a.first_try), ok = mine.filter(a => a.correct).length;
    const fixed = (st.weeds || []).filter(w => w.fixed).length, left = unfixedOf(s), leftNames = [...new Set(left.map(w => (d.mis[w.code] || {}).label || w.label))].slice(0, 2);
    const lines = [`Phiếu học tập KHTN 6 – Khu vườn trên mây`, `Học sinh: ${s.name} · Lớp ${TS.cur.name}`, `• Hạt giống kiến thức đã học: ${seeds}/${openLessons.length * 3}`,
      `• Đúng ngay lần đầu (30 ngày): ${mine.length ? Math.round(ok * 100 / mine.length) + "%" : "chưa có"}`, `• Chỗ hiểu nhầm đã tự sửa: ${fixed}`, `• Nhà mây đã xây: ${(st.houses || []).length} · Thí nghiệm đã làm: ${(st.journal || []).length}`,
      left.length ? `• Còn cần luyện: ${leftNames.join("; ")}` : `• Không còn chỗ hiểu nhầm nào cần luyện.`,
      left.length ? `Gia đình nhắc em vào Vườn Mây nhổ cỏ dại (làm lại câu từng nhầm) nhé.` : `Em học rất chăm, gia đình khen em nhé!`];
    return { s, text: lines.join("\n") };
  });
  function effect() {
    const rows = openLessons.map(z => {
      const pre = d.students.map(s => s.state?.tests?.[`${z.id}:pre`]).filter(Boolean), post = d.students.map(s => s.state?.tests?.[`${z.id}:post`]).filter(Boolean);
      const avg = a => a.length ? a.reduce((k, r) => k + r.score / r.total, 0) / a.length : null;
      return { z, pre: avg(pre), post: avg(post), npre: pre.length, npost: post.length };
    });
    const per = d.students.map(s => ({ s, cells: openLessons.map(z => { const a = s.state?.tests?.[`${z.id}:pre`], b = s.state?.tests?.[`${z.id}:post`]; return (a ? `${a.score}/${a.total}` : "–") + " → " + (b ? `${b.score}/${b.total}` : "–"); }) }));
    return [h("div", { class: "card" }, h("div", { class: "row-between" }, h("h2", {}, "Điểm trung bình trước và sau khi học"), h("div", { class: "legend" }, h("span", {}, h("i", { class: "bc-pre" }), "Đầu bài"), h("span", {}, h("i", { class: "bc-post" }), "Cuối bài"))),
      h("div", { class: "bar-chart" }, rows.map(r => h("div", { class: "bc-row" }, h("span", {}, `Bài ${r.z.num} · ${r.z.zone}`),
        h("div", { class: "bc-bars" }, h("i", { class: "bc-pre", style: { width: (r.pre ?? 0) * 100 + "%" } }), h("i", { class: "bc-post", style: { width: (r.post ?? 0) * 100 + "%" } })),
        h("span", { class: "small" }, r.pre == null && r.post == null ? "chưa có" : `${r.pre == null ? "–" : Math.round(r.pre * 100) + "%"} → ${r.post == null ? "–" : Math.round(r.post * 100) + "%"}`)))),
      h("p", { class: "small muted" }, "Bật Kiểm tra đầu/cuối cho từng bài trong mục Lớp của tôi. Mỗi bài 8 câu, không có gợi ý.")),
      h("div", { class: "card" }, h("h2", {}, "Từng học sinh (đầu → cuối)"), h("div", { class: "tbl-wrap" }, h("table", { class: "tbl" }, h("thead", {}, h("tr", {}, h("th", {}, "Học sinh"), openLessons.map(z => h("th", {}, "Bài " + z.num)))),
        h("tbody", {}, per.map(p => h("tr", {}, h("td", {}, h("b", {}, p.s.name)), p.cells.map(c => h("td", { class: "small" }, c))))))))];
  }
  // Bảng phân tích: tỉ lệ đúng ngay lần đầu theo từng em × từng bài, và các câu cả lớp hay sai
  let cmpL = "all";
  function compareCard() {
    const A = d.answers.filter(a => a.first_try && a.kind !== "weed"), box = h("div", {});
    const col = v => v >= 80 ? "linear-gradient(90deg,#4fd69c,#8ee8bf)" : v >= 50 ? "linear-gradient(90deg,#ffcf3a,#ffe680)" : "linear-gradient(90deg,#ff6a7a,#ffa0aa)";
    function paintC() {
      const rows = d.students.map(st => { const mine = A.filter(a => a.student_id === st.id && (cmpL === "all" || a.lesson === cmpL)); return { st, n: mine.length, v: mine.length ? Math.round(mine.filter(a => a.correct).length * 100 / mine.length) : null }; })
        .sort((x, y) => (y.v ?? -1) - (x.v ?? -1) || x.st.name.localeCompare(y.st.name, "vi"));
      const done = rows.filter(r => r.v != null), avg = done.length ? Math.round(done.reduce((k, r) => k + r.v, 0) / done.length) : null;
      box.replaceChildren(
        h("div", { class: "cmp-filter" }, [["all", "Tất cả bài"], ...openLessons.map(z => [z.id, "Bài " + z.num])].map(([k, t]) => h("button", { class: "chip" + (k === cmpL ? " on" : ""), onclick: () => { cmpL = k; paintC(); } }, t))),
        h("p", { class: "cmp-avg" }, avg == null ? "Chưa có dữ liệu cho lựa chọn này." : `Trung bình lớp: ${avg}% · ${done.length}/${rows.length} em đã làm`),
        h("div", { class: "cmp" }, rows.map(r => h("div", { class: "cmp-row" + (r.v == null ? " none" : "") }, h("b", { title: r.st.name }, r.st.name),
          h("div", { class: "cmp-track" }, r.v == null ? null : h("i", { style: { width: Math.max(4, r.v) + "%", background: col(r.v) } })), h("span", {}, r.v == null ? "–" : r.v + "%")))));
    }
    paintC();
    return h("div", { class: "card" }, h("h2", {}, "📊 So sánh % đúng ngay lần đầu"), box, h("p", { class: "small muted" }, "🟩 từ 80% · 🟨 50–79% · 🟥 dưới 50% · mờ: em chưa làm."));
  }
  function dayCard(A) {
    const days = [...Array(14)].map((_, i) => { const t = new Date(); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - 13 + i); return t; });
    const cols = days.map(t => { const e = t.getTime() + 864e5, x = A.filter(a => { const c = Date.parse(a.created_at); return c >= t.getTime() && c < e; }); return { t, n: x.length, v: x.length ? Math.round(x.filter(a => a.correct).length * 100 / x.length) : null }; });
    const mx = Math.max(1, ...cols.map(c => c.n));
    return h("div", { class: "card" }, h("div", { class: "row-between" }, h("h2", {}, "📅 So sánh theo ngày (14 ngày)"), h("div", { class: "legend" }, h("span", {}, h("i", { class: "dc-v" }), "% đúng lần đầu"), h("span", {}, h("i", { class: "dc-n" }), "Số câu đã làm"))),
      h("div", { class: "day-chart" }, cols.map(c => h("div", { class: "dc-col", title: `${c.t.toLocaleDateString("vi-VN")}: ${c.n} câu${c.v == null ? "" : " · " + c.v + "% đúng"}` },
        h("small", {}, c.v == null ? "" : c.v + "%"), h("div", { class: "dc-bars" }, h("i", { class: "dc-v", style: { height: (c.v ?? 0) + "%" } }), h("i", { class: "dc-n", style: { height: c.n * 100 / mx + "%" } })),
        h("span", {}, `${c.t.getDate()}/${c.t.getMonth() + 1}`)))));
  }
  function analysis() {
    const A = d.answers.filter(a => a.first_try && a.kind !== "weed"), pct = arr => arr.length ? Math.round(arr.filter(a => a.correct).length * 100 / arr.length) : null;
    const col = v => v == null ? "#f1eef8" : v >= 80 ? "#c9f3dc" : v >= 50 ? "#fff1b8" : "#ffd0d6";
    const active = new Set(A.map(a => a.student_id)).size, tot = pct(A);
    const qs = {}; A.forEach(a => { const k = a.lesson + "/" + a.seed + "/" + a.question_id; (qs[k] ||= { k, a, n: 0, wrong: 0, codes: {} }); qs[k].n++; if (!a.correct) { qs[k].wrong++; if (a.misconception) qs[k].codes[a.misconception] = (qs[k].codes[a.misconception] || 0) + 1; } });
    const hard = Object.values(qs).filter(q => q.wrong).sort((x, y) => y.wrong / y.n - x.wrong / x.n || y.wrong - x.wrong).slice(0, 6);
    const promptOf = q => { const L = all[q.a.lesson]; const sd = L?.seeds.find(x => x.id === q.a.seed); const qq = sd?.questions.find(x => x.id === q.a.question_id); return qq ? (qq.prompt || qq.text) : q.k; };
    return [h("div", { class: "stats" }, [["Câu đã làm (30 ngày)", A.length], ["Đúng ngay lần đầu", tot == null ? "–" : tot + "%"], ["Em đã học", `${active}/${d.students.length}`]].map(([t, v]) => h("div", { class: "card stat" }, h("small", {}, t), h("b", {}, v)))),
      dayCard(A),
      h("div", { class: "an-grid" },
        compareCard(),
        h("div", { class: "card" }, h("h2", {}, "Câu cả lớp hay sai"), hard.length ? h("ol", { class: "hard-list" }, hard.map(q => { const top = Object.entries(q.codes).sort((a, b) => b[1] - a[1])[0];
          return h("li", {}, h("b", {}, promptOf(q)), h("div", { class: "small muted" }, `Sai ${q.wrong}/${q.n} lượt` + (top && d.mis[top[0]] ? ` · hay nhầm: ${d.mis[top[0]].label}` : "")), top && d.mis[top[0]]?.tip ? h("div", { class: "small" }, "💡 " + d.mis[top[0]].tip) : null); }))
          : h("p", { class: "muted" }, "Chưa có câu nào bị sai. Khi học sinh làm bài, bảng sẽ hiện ở đây.")))];
  }
  function paint() {
    bar.replaceChildren(...tabs.map(([k, t]) => h("button", { class: "tab" + (k === cur ? " on" : ""), onclick: () => { cur = k; paint(); } }, t)));
    if (cur === "phieu") body.replaceChildren(slips.length ? h("div", { class: "slips" }, slips.map(x => h("div", { class: "card" }, h("pre", { class: "slip" }, x.text),
      btn("📋 Sao chép để gửi Zalo", async () => { try { await navigator.clipboard.writeText(x.text); toast("Đã sao chép", "ok"); } catch { toast("Trình duyệt chưa cho sao chép, thầy cô bôi đen để chép nhé."); } }, "btn btn-soft btn-tiny"))))
      : h("p", { class: "muted" }, "Lớp chưa có học sinh."));
    else if (cur === "hieuqua") body.replaceChildren(...effect());
    else body.replaceChildren(...analysis());
  }
  paint();
  return shell("#/gv/bao-cao", "Báo cáo", [
    btn("🖨️ In phiếu phụ huynh", () => printArea(slips.map(x => h("pre", { class: "slip" }, x.text))), "btn btn-soft"),
    btn("📄 In báo cáo hiệu quả (PDF)", () => printArea([h("div", { class: "report-print" }, h("h1", {}, `Báo cáo hiệu quả · Lớp ${TS.cur.name} · ${new Date().toLocaleDateString("vi-VN")}`), ...effect())]), "btn btn-main")],
    bar, body);
}

// ================================================================== Duyệt gợi ý của Tí Nị
export async function hintsScreen() {
  await ensure(); if (!TS.cur) return noClass();
  const all = await loadAllLessons(), map = await loadMap();
  const hints = { ...(S().hints || {}) }, hok = { ...(S().hintsOk || {}) };
  const zones = map.zones.filter(z => S().open.includes(z.id));
  let zi = zones[0]?.id, si = null;
  const body = h("div", {}), bar = h("div", { class: "tabs" });
  function paint() {
    bar.replaceChildren(...zones.map(z => h("button", { class: "tab" + (z.id === zi ? " on" : ""), onclick: () => { zi = z.id; si = null; paint(); } }, `Bài ${z.num}`)));
    const L = all[zi]; if (!L) return body.replaceChildren(h("p", { class: "muted" }, "Chưa mở bài nào."));
    const seed = L.seeds.find(x => x.id === si) || L.seeds[0]; si = seed.id;
    body.replaceChildren(h("div", { class: "tabs tabs-sm" }, L.seeds.map((x, k) => h("button", { class: "tab" + (x.id === si ? " on" : ""), onclick: () => { si = x.id; paint(); } }, `Hạt ${k + 1}: ${x.title}`))), ...[seed].flatMap(s => s.questions.map(q => {
      const key = `${zi}/${s.id}/${q.id}`, cur = hints[key] || q.hints;
      const okArr = Array.isArray(hok[key]) ? hok[key] : cur.map(() => false);
      const rows = cur.map((t, i) => { const inp = h("input", { value: t, oninput: e => { hints[key] = (hints[key] || [...q.hints]); hints[key][i] = e.target.value; } });
        return h("div", { class: "row hint-lv" }, h("span", { class: "tag" }, "Bậc " + (i + 1)), inp,
          okArr[i] ? h("span", { class: "tag tag-ok" }, "✅ Đã duyệt") : null,
          btn(okArr[i] ? "Duyệt lại" : "✅ Duyệt", async () => { hints[key] = (hints[key] || [...q.hints]); hints[key][i] = inp.value; const a = [...okArr]; a[i] = true; hok[key] = a; await saveSettings({ hints, hintsOk: hok }); paint(); }, "btn btn-tiny btn-main")); });
      return h("div", { class: "hint-ed" }, h("b", {}, `${s.title} · ${q.prompt || q.text}`), ...rows);
    })));
  }
  paint();
  return shell("#/gv/goi-y", "Duyệt gợi ý của Tí Nị", [],
    h("p", { class: "small muted" }, "3 bậc: gợi mở → chỉ hướng → gần tới đáp án (không nói đáp án). Cô đọc và bấm ✅ Duyệt cho từng bậc."), bar, body);
}

// ================================================================== Quản trị
export async function adminScreen() {
  await ensure();
  if (!TS.admin) { location.hash = "#/gv"; return null; }
  let ov, admins, app;
  try { [ov, admins, app] = await Promise.all([api.adminOverview(), api.adminList(), api.appSettings()]); } catch (e) { return shell("#/gv/quan-tri", "Quản trị", [], h("p", { class: "bad-text" }, friendlyError(e))); }
  const email = h("input", { type: "email", placeholder: "email admin phụ" }), copy = h("input", { value: app.copyright || "" }), notice = h("input", { value: app.notice || "", placeholder: "Thông báo hiện ở trang đầu (để trống nếu không cần)" });
  // Giọng đọc tạo sẵn cho Ông Kể Chuyện (lưu ở Supabase Storage, học sinh tải nhanh)
  const vrow = st => { const stat = h("span", { class: "small muted" }, "…");
    const a = new Audio(); a.preload = "none"; fetch(localVoiceUrls(st.l)[0], { method: "HEAD" }).then(r => r.ok ? r : fetch(localVoiceUrls(st.l)[1], { method: "HEAD" })).then(r => { if (r.ok && /audio/.test(r.headers.get("content-type") || "")) { stat.textContent = "✅ có sẵn trong web (không tốn Supabase)"; throw 0; } return fetch(voiceUrl(st.l), { method: "HEAD" }); }).then(r => { stat.textContent = r.ok ? "✅ đã có giọng (trên Supabase) – nên Tải về bỏ vào thư mục voices" : "chưa có"; }).catch(() => { stat.textContent = "chưa có"; });
    const file = h("input", { type: "file", accept: "audio/*", style: { display: "none" }, onchange: async e => { const f = e.target.files[0]; if (!f) return; stat.textContent = "đang tải lên…"; try { await api.uploadVoice(st.l, f); stat.textContent = "✅ đã có giọng (của cô)"; } catch (er) { stat.textContent = "lỗi: " + er.message; } } });
    return h("tr", {}, h("td", {}, h("b", {}, st.title), h("div", { class: "small muted" }, st.l.replace("bai-", "Bài "))), h("td", {}, stat),
      h("td", { class: "row-actions" }, btn("▶", () => { a.src = voiceUrl(st.l) + "?t=" + Date.now(); a.play().catch(() => toast("Chưa có giọng cho chuyện này.")); }, "btn btn-tiny"),
        btn("🎙️ Tạo bằng AI", async e => { const b = e.target; b.disabled = true; stat.textContent = "đang tạo (10–30 giây)…";
          try { const r = await api.teacherTts(st.t); const bin = Uint8Array.from(atob(r.audio), c => c.charCodeAt(0)); await api.uploadVoice(st.l, new Blob([bin], { type: r.mime || "audio/wav" })); stat.textContent = "✅ đã có giọng"; }
          catch (er) { stat.textContent = "lỗi: " + er.message + " (kiểm tra GEMINI_API_KEY trên Vercel)"; } b.disabled = false; }, "btn btn-tiny btn-main"),
        btn("⬆️ File của cô", () => file.click(), "btn btn-tiny"), btn("⬇️ Tải về", () => dlVoice(st.l), "btn btn-tiny"), file)); };
  async function dlVoice(id) { try { const r = await fetch(voiceUrl(id)); if (!r.ok) throw 0; const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob()); a.download = id + ".wav"; a.click(); } catch { toast("Chuyện này chưa có giọng trên Supabase.", "bad"); } }
  const voiceCard = h("div", { class: "card" }, h("h2", {}, "🎙️ Giọng đọc Ông Kể Chuyện (tạo sẵn một lần)"),
    h("p", { class: "small muted" }, "Bấm Tạo bằng AI cho từng chuyện (cần GEMINI_API_KEY), hoặc tải lên file ghi âm của cô (mp3/wav). Để KHÔNG tốn băng thông Supabase: bấm ⬇️ Tải tất cả, rồi bỏ các file (bai-09.wav, bai-10.wav…) vào thư mục voices/ của dự án trên GitHub. Web sẽ ưu tiên đọc file trong thư mục đó."),
    btn("⬇️ Tải tất cả giọng đọc", async () => { for (const st of STORIES) { await dlVoice(st.l); await new Promise(r => setTimeout(r, 800)); } }, "btn btn-soft"),
    h("div", { class: "tbl-wrap list-scroll" }, h("table", { class: "tbl" }, h("tbody", {}, STORIES.map(vrow)))));
  return shell("#/gv/quan-tri", "Quản trị hệ thống", [],
    voiceCard,
    h("div", { class: "stats" }, stat("Thầy cô", ov.totals.teachers, "tài khoản"), stat("Lớp", ov.totals.classes, "lớp học"), stat("Học sinh", ov.totals.students, "em"), stat("Admin", admins.length, "người")),
    h("div", { class: "grid-2" },
      h("div", { class: "card" }, h("h2", {}, "Thầy cô đang dùng"), h("div", { class: "tbl-wrap" }, h("table", { class: "tbl" }, h("thead", {}, h("tr", {}, ["Email", "Lớp", "Học sinh"].map(x => h("th", {}, x)))),
        h("tbody", {}, ov.teachers.map(t => h("tr", {}, h("td", {}, t.email), h("td", {}, t.classes), h("td", {}, t.students))))))),
      h("div", { class: "card" }, h("h2", {}, "Admin tổng và admin phụ"),
        h("ul", { class: "help-list" }, admins.map(a => h("li", {}, h("b", {}, a.email), " · ", a.role === "tong" ? "admin tổng" : "admin phụ", a.role !== "tong" ? btn("Bỏ", async () => { await api.adminRemove(a.email); rerender(); }, "btn btn-tiny btn-soft") : null,
          a.email !== "hothanhthuy309@gmail.com" ? btn("✏️ Cập nhật", () => { const em = h("input", { type: "email", value: a.email }); const rl = h("select", {}, h("option", { value: "phu", selected: a.role !== "tong" }, "Admin phụ"), h("option", { value: "tong", selected: a.role === "tong" }, "Admin tổng"));
            const m = modal(h("div", {}, h("h2", {}, "Cập nhật tài khoản admin"), h("label", { class: "lbl-block" }, "Email", em), h("label", { class: "lbl-block" }, "Quyền", rl),
              h("div", { class: "actions" }, btn("Lưu", async () => { const ne = em.value.trim().toLowerCase(); if (!ne.includes("@")) return toast("Email chưa đúng.", "bad");
                try { await api.adminAdd(ne, rl.value); if (ne !== a.email) await api.adminRemove(a.email); m.close(); toast("Đã cập nhật", "ok"); rerender(); } catch (e) { toast(friendlyError(e), "bad"); } }, "btn btn-main"), btn("Hủy", () => m.close(), "btn btn-soft")))); }, "btn btn-tiny") : null))),
        h("div", { class: "row" }, email, btn("Thêm admin phụ", async () => { if (!email.value.includes("@")) return; try { await api.adminAdd(email.value.trim(), "phu"); rerender(); } catch (e) { toast(friendlyError(e), "bad"); } }, "btn btn-main")),
        h("h2", {}, "Dòng bản quyền và thông báo"), h("label", { class: "lbl-block" }, "Dòng bản quyền", copy), h("label", { class: "lbl-block" }, "Thông báo", notice),
        btn("Lưu", async () => { try { await api.setAppSetting("copyright", copy.value); await api.setAppSetting("notice", notice.value); toast("Đã lưu", "ok"); } catch (e) { toast(friendlyError(e), "bad"); } }, "btn btn-main"))));
}


// ================================================================== Gọi kiểm tra bài cũ: UFO bốc ngẫu nhiên một cư dân mây
const UFO_SVG = `<svg viewBox="0 0 240 150" aria-hidden="true"><defs><linearGradient id="ub" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9f1ff"/><stop offset="1" stop-color="#7cc8ff"/></linearGradient><linearGradient id="uh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d3ff"/><stop offset="1" stop-color="#8f7cf0"/></linearGradient></defs>
  <ellipse cx="120" cy="58" rx="46" ry="38" fill="url(#ub)" stroke="#fff" stroke-width="4"/><circle cx="104" cy="54" r="7" fill="#2f2346"/><circle cx="136" cy="54" r="7" fill="#2f2346"/><circle cx="106" cy="52" r="2.4" fill="#fff"/><circle cx="138" cy="52" r="2.4" fill="#fff"/><path d="M110 70q10 8 20 0" stroke="#2f2346" stroke-width="4" fill="none" stroke-linecap="round"/>
  <ellipse cx="120" cy="88" rx="110" ry="30" fill="url(#uh)" stroke="#fff" stroke-width="4"/>${[40, 80, 120, 160, 200].map((x, i) => `<circle cx="${x}" cy="${92 + (i % 2 ? 6 : 0)}" r="8" fill="${["#ffd23f", "#ff8fb8", "#7ee0b5"][i % 3]}" class="ufo-light" style="animation-delay:${i * .15}s"/>`).join("")}</svg>`;
export async function callScreen() {
  await ensure(); if (!TS.cur) return noClass();
  const [students, map] = await Promise.all([api.listStudents(TS.cur.id), loadMap()]);
  const open = map.zones.filter(z => S().open.includes(z.id));
  const called = new Set(JSON.parse(sessionStorage.getItem("kvtm-called-" + TS.cur.id) || "[]"));
  const stage = h("div", { class: "ufo-stage" }), nameEl = h("div", { class: "ufo-name" }, "Ai sẽ được UFO mời lên nhỉ?"), qBox = h("div", {});
  const ufo = h("div", { class: "ufo", html: UFO_SVG }), beam = h("div", { class: "ufo-beam" });
  stage.append(h("div", { class: "ufo-stars" }), ufo, beam, nameEl);
  let busy = false;
  const info = h("p", { class: "small muted center" }); const paintInfo = () => info.textContent = `${students.length} cư dân mây · đã gọi ${called.size} bạn `; paintInfo();
  async function pick() {
    if (busy) return; if (!students.length) return toast("Lớp chưa có học sinh.");
    busy = true; qBox.replaceChildren(); beam.classList.remove("on"); stage.classList.remove("found");
    let pool = students.filter(s => !called.has(s.id)); if (!pool.length) { called.clear(); pool = students.slice(); }
    const who = pool[Math.floor(Math.random() * pool.length)];
    sound.play("gio"); ufo.classList.add("fly");
    let i = 0; const names = shuffle(students.map(s => s.name));
    await new Promise(res => { const t = setInterval(() => { nameEl.textContent = names[i++ % names.length]; sound.play("bam"); if (i > 22) { clearInterval(t); res(); } }, 90 + i * 4); });
    ufo.classList.remove("fly"); beam.classList.add("on"); stage.classList.add("found"); nameEl.textContent = "🌟 " + who.name + " 🌟"; sound.play("reo");
    called.add(who.id); paintInfo(); sessionStorage.setItem("kvtm-called-" + TS.cur.id, JSON.stringify([...called]));
    busy = false;
  }
  let mode = "ufo"; const duckBox = h("div", { class: "duck-race" });
  async function duck() {
    if (busy) return; if (!students.length) return toast("Lớp chưa có học sinh.");
    busy = true; let pool = students.filter(s => !called.has(s.id)); if (!pool.length) { called.clear(); pool = students.slice(); }
    const lane = shuffle(pool).slice(0, 12), who = lane[Math.floor(Math.random() * lane.length)];
    const ducks = lane.map(s => { const d = h("i", { class: "duck" }, "🦆"); return { s, d, x: 0, row: h("div", { class: "duck-lane" }, h("b", {}, s.name), h("div", { class: "duck-track" }, d, h("span", { class: "duck-flag" }, "🏁"))) }; });
    duckBox.replaceChildren(...ducks.map(k => k.row)); sound.play("gio");
    await new Promise(res => { const t = setInterval(() => { let fin = false; ducks.forEach(k => { k.x = Math.min(k.s === who ? 100 : 94, k.x + Math.random() * (k.s === who ? 6.6 : 6)); k.d.style.left = `calc(${k.x}% - 26px)`; if (k.s === who && k.x >= 100) fin = true; });
      if (Math.random() < .3) sound.play("bam"); if (fin) { clearInterval(t); res(); } }, 110); });
    ducks.find(k => k.s === who).row.classList.add("win"); nameEl.textContent = "🌟 " + who.name + " 🌟"; sound.play("reo");
    called.add(who.id); paintInfo(); sessionStorage.setItem("kvtm-called-" + TS.cur.id, JSON.stringify([...called])); busy = false;
  }
  const area = h("div", {}), mt = h("div", { class: "tabs center" });
  const paintM = () => { mt.replaceChildren(...[["ufo", "🛸 UFO"], ["duck", "🦆 Đua vịt"]].map(([k, t]) => h("button", { class: "tab" + (k === mode ? " on" : ""), onclick: () => { if (!busy) { mode = k; paintM(); } } }, t)));
    area.replaceChildren(mode === "ufo" ? stage : h("div", {}, duckBox, h("div", { class: "ufo-name duck-name" }, nameEl)), h("div", { class: "actions center" }, btn(mode === "ufo" ? "🛸 Bốc tên!" : "🦆 Xuất phát!", mode === "ufo" ? pick : duck, "btn btn-main btn-big"))); };
  paintM();
  return shell("#/gv/goi-bai", "Gọi kiểm tra bài cũ", [btn("📺 Chiếu toàn màn hình", () => document.documentElement.requestFullscreen?.(), "btn btn-soft"), btn("Làm mới lượt gọi", () => { called.clear(); sessionStorage.removeItem("kvtm-called-" + TS.cur.id); toast("Mọi bạn đều có thể được gọi lại.", "ok"); }, "btn btn-soft")],
    h("div", { class: "ufo-wrap" }, h("div", {}, mt, area, info), qBox));
}

// ================================================================== Chấm bài kiểm tra 15 phút
export const kt15Score = (K, r) => { if (!r) return 0; const ok = K.mcq.filter((q, i) => r.ans?.[i] === q.correct).length; return K.mcq.length ? Math.round(ok / K.mcq.length * K.mcqPts * 4) / 4 : 0; };
export async function kt15GradeScreen() {
  await ensure(); if (!TS.cur) return noClass();
  const K = S().kt15; if (!K) return shell("#/gv/tro-choi", "Kiểm tra 15 phút", [], h("p", {}, "Chưa có bài 15 phút. Vào Trò chơi và kiểm tra → Kiểm tra 15 phút để giao bài."));
  const st = await api.listStudents(TS.cur.id).catch(() => []); const G = JSON.parse(JSON.stringify(K.grades || {}));
  const L = "ABCDEFGH", rows = st.map(s => ({ s, r: s.state?.kt15?.[K.id] }));
  const total = (sid, r) => kt15Score(K, r) + (G[sid]?.essay || []).reduce((a, b) => a + (+b || 0), 0);
  const body = h("tbody", {}, rows.map(({ s, r }) => { G[s.id] ||= { essay: K.essays.map(() => ""), cmt: "" }; const tot = h("b", {}, r ? total(s.id, r) : "–");
    return h("tr", {}, h("td", {}, h("b", {}, s.name), h("div", { class: "small muted" }, r?.done ? "đã nộp" : r ? "đang làm" : "chưa làm")),
      h("td", {}, r ? `${kt15Score(K, r)}/${K.mcqPts}` : "–"),
      ...K.essays.map((e, j) => h("td", { class: "kt-ess" }, h("div", { class: "small" }, r?.ess?.[j] || h("i", { class: "muted" }, "(bỏ trống)")),
        h("input", { type: "number", min: 0, max: e.pts, step: 0.25, value: G[s.id].essay[j] ?? "", placeholder: "/" + e.pts, style: { width: "84px", padding: "6px" }, oninput: ev => { G[s.id].essay[j] = Math.min(e.pts, +ev.target.value || 0); tot.textContent = total(s.id, r); } }))),
      h("td", {}, tot), h("td", {}, h("input", { value: G[s.id].cmt || "", placeholder: "Nhận xét", oninput: ev => { G[s.id].cmt = ev.target.value; } }))); }));
  async function exportXlsx() {
    const head = ["STT", "Họ tên", ...K.mcq.map((_, i) => "TN" + (i + 1)), "Điểm TN", ...K.essays.flatMap((e, j) => ["TL" + (j + 1) + " – bài làm", "TL" + (j + 1) + " – điểm"]), "Tổng", "Nhận xét"];
    const data = rows.map(({ s, r }, i) => [i + 1, s.name, ...K.mcq.map((q, k) => r?.ans?.[k] == null ? "" : L[r.ans[k]] + (r.ans[k] === q.correct ? " ✓" : " ✗")), r ? kt15Score(K, r) : "",
      ...K.essays.flatMap((e, j) => [r?.ess?.[j] || "", G[s.id]?.essay?.[j] ?? ""]), r ? total(s.id, r) : "", G[s.id]?.cmt || ""]);
    const name = `${K.title} - Lop ${TS.cur.name}`.replace(/[\\/:*?"<>|]/g, "-");
    try { if (!window.XLSX) await new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; sc.onload = ok; sc.onerror = no; document.head.append(sc); });
      const ws = XLSX.utils.aoa_to_sheet([head, ...data]), wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Ket qua"); XLSX.writeFile(wb, name + ".xlsx"); }
    catch { const csv = "\ufeff" + [head, ...data].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = name + ".csv"; a.click(); }
  }
  const done = rows.filter(x => x.r?.done).length;
  return shell("#/gv/tro-choi", "⏱️ " + K.title, [btn("📊 Xuất Excel", exportXlsx, "btn btn-soft"), btn("💾 Lưu điểm", async () => { await saveSettings({ kt15: { ...K, grades: G } }); }, "btn btn-soft"),
      btn(K.published ? "📤 Cập nhật điểm đã công bố" : "📤 Công bố điểm cho học sinh", async () => { await saveSettings({ kt15: { ...K, grades: G, published: true } }); toast("Học sinh đã thấy điểm.", "ok"); rerender(); }, "btn btn-main")],
    h("p", {}, `${done}/${st.length} em đã nộp · ${K.mcq.length} câu trắc nghiệm (${K.mcqPts}đ, máy chấm) · ${K.essays.length} câu tự luận (cô chấm) · ${K.open ? "🟢 đang mở" : "🔒 đã đóng"} · ${K.published ? "📤 đã công bố điểm" : "chưa công bố"} `,
      btn(K.open ? "Đóng bài" : "Mở lại", async () => { await saveSettings({ kt15: { ...K, grades: G, open: !K.open } }); rerender(); }, "btn btn-tiny btn-soft")),
    K.essays.length ? h("ol", { class: "small" }, K.essays.map(e => h("li", {}, e.prompt, ` (${e.pts}đ)`))) : null,
    h("div", { class: "tbl-wrap" }, h("table", { class: "tbl" }, h("thead", {}, h("tr", {}, ["Học sinh", "Trắc nghiệm", ...K.essays.map((_, j) => "Tự luận " + (j + 1)), "Tổng", "Nhận xét"].map(x => h("th", {}, x)))), body)));
}
