// Góc thầy cô: 4 mục – Hôm nay, Lớp của tôi, Trò chơi và kiểm tra, Báo cáo
import { api, friendlyError } from "./api.js";
import { h, btn, toast, modal, tiNi, weedSvg, fmtAgo, startOfToday } from "./ui.js";
import { PIC, randomPics } from "./pics.js";
import { loadMap, loadAllLessons, weedName } from "./content.js";

const TS = { classes: null, cur: null };
const LS = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

// ------------------------------------------------------------------ đăng nhập
export function teacherLogin() {
  const email = h("input", { type: "email", placeholder: "email của thầy cô", autocomplete: "username", value: api.demo ? "co@demo" : "" });
  const pw = h("input", { type: "password", placeholder: "mật khẩu (từ 6 kí tự)", autocomplete: "current-password", value: api.demo ? "123456" : "" });
  const go = async (signup) => {
    if (!email.value || pw.value.length < 6) return toast("Thầy cô nhập email và mật khẩu từ 6 kí tự nhé.");
    try {
      const r = signup ? await api.signUp(email.value.trim(), pw.value) : await api.signIn(email.value.trim(), pw.value);
      if (r.needConfirm) return toast("Đã tạo tài khoản. Thầy cô mở email để bấm xác nhận rồi đăng nhập.", "ok", 6000);
      TS.classes = null; if (location.hash === "#/gv") window.dispatchEvent(new HashChangeEvent("hashchange")); else location.hash = "#/gv";
    } catch (e) { toast(friendlyError(e), "bad", 4000); }
  };
  pw.addEventListener("keydown", e => e.key === "Enter" && go(false));
  return h("div", { class: "page-login" }, h("a", { class: "back-home", href: "#/" }, "⬅ Trang đầu"),
    h("div", { class: "card login-card" }, h("div", { class: "center" }, tiNi(90), h("h1", {}, "Góc thầy cô")),
      h("label", { class: "lbl-block" }, "Email", email), h("label", { class: "lbl-block" }, "Mật khẩu", pw),
      h("div", { class: "actions" }, btn("Đăng nhập", () => go(false), "btn btn-main"), btn("Tạo tài khoản mới", () => go(true), "btn btn-soft")),
      api.demo ? h("p", { class: "small muted" }, "Chế độ thử: tài khoản mẫu co@demo / 123456. Dữ liệu chỉ lưu trên máy này.") : null));
}

async function ensureClasses() {
  if (!TS.classes) TS.classes = await api.listClasses();
  const saved = LS.get("kvtm-gv-class");
  TS.cur = TS.classes.find(c => c.id === saved) || TS.classes[0] || null;
}

function shell(content, active) {
  const tabs = [["#/gv", "☀️ Hôm nay"], ["#/gv/lop", "🏫 Lớp của tôi"], ["#/gv/tro-choi", "🎲 Trò chơi và kiểm tra"], ["#/gv/bao-cao", "📄 Báo cáo"]];
  const sel = h("select", { class: "class-select", "aria-label": "Chọn lớp", onchange: e => { LS.set("kvtm-gv-class", e.target.value); TS.cur = TS.classes.find(c => c.id === e.target.value); window.dispatchEvent(new HashChangeEvent("hashchange")); } },
    TS.classes.map(c => h("option", { value: c.id, selected: TS.cur && c.id === TS.cur.id }, c.name)));
  const acct = h("details", { class: "acct" }, h("summary", {}, "👤"), h("div", { class: "acct-menu" },
    h("div", { class: "small muted" }, api.teacherSession()?.email), btn("Đăng xuất", async () => { await api.signOut(); TS.classes = null; location.hash = "#/gv"; window.dispatchEvent(new HashChangeEvent("hashchange")); }, "btn btn-soft")));
  return h("div", { class: "shell teacher" },
    h("header", { class: "topbar" },
      h("a", { class: "brand", href: "#/gv" }, h("span", { class: "brand-cloud" }, "☁️"), h("span", { class: "brand-text" }, "Góc thầy cô")),
      h("div", { class: "top-right" }, TS.classes.length ? sel : null, acct)),
    h("nav", { class: "tnav" }, tabs.map(([href, t]) => h("a", { href, class: href === active ? "on" : "" }, t))),
    api.demo ? h("div", { class: "demo-banner" }, "Chế độ thử: dữ liệu chỉ lưu trên trình duyệt này. Điền khóa Supabase trong js/config.js để dùng thật.") : null,
    h("main", { class: "page" }, content));
}

function noClass() {
  const inp = h("input", { placeholder: "Tên lớp, ví dụ 6A1", maxlength: 60 });
  return shell(h("div", { class: "card center" }, tiNi(90), h("h1", {}, "Tạo lớp đầu tiên"), inp,
    h("div", { class: "actions center" }, btn("Tạo lớp", async () => {
      if (!inp.value.trim()) return;
      try { const c = await api.createClass(inp.value.trim()); TS.classes.push(c); TS.cur = c; LS.set("kvtm-gv-class", c.id); location.hash = "#/gv/lop"; window.dispatchEvent(new HashChangeEvent("hashchange")); }
      catch (e) { toast(friendlyError(e), "bad"); }
    }, "btn btn-main")), h("p", { class: "small muted" }, "Lớp mới mặc định chỉ mở Bài 9. Thầy cô bật thêm khu trong mục Lớp của tôi.")), "#/gv/lop");
}

// ------------------------------------------------------------------ số liệu
async function classData(days = 0) {
  const since = days ? new Date(Date.now() - days * 86400000) : startOfToday();
  const [students, answers, lessons, map] = await Promise.all([api.listStudents(TS.cur.id), api.listAnswers(TS.cur.id, since.toISOString()), loadAllLessons(), loadMap()]);
  const mis = {}; Object.values(lessons).forEach(L => Object.assign(mis, L.misconceptions || {}));
  return { students, answers, lessons, map, mis };
}
const unfixedOf = s => (s.state?.weeds || []).filter(w => !w.fixed);

function computeToday(d) {
  const t0 = startOfToday().getTime();
  const n = d.students.length;
  const joined = d.students.filter(s => s.last_seen && Date.parse(s.last_seen) >= t0).length;
  const first = d.answers.filter(a => a.kind === "seed" && a.first_try);
  const right = first.filter(a => a.correct).length;
  const fixedToday = d.students.reduce((k, s) => k + (s.state?.weeds || []).filter(w => w.fixed && w.fixedAt >= t0).length, 0);
  const withWeeds = d.students.filter(s => unfixedOf(s).length).length;
  const totalWeeds = d.students.reduce((k, s) => k + unfixedOf(s).length, 0);
  const byCode = {};
  d.students.forEach(s => new Set(unfixedOf(s).map(w => w.code)).forEach(c => { if (c) byCode[c] = (byCode[c] || 0) + 1; }));
  const top = Object.entries(byCode).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([code, k]) => ({ code, k, ...(d.mis[code] || { label: code, tip: "" }) }));
  const help = [];
  d.students.forEach(s => {
    const w = unfixedOf(s); const mine = first.filter(a => a.student_id === s.id); const ok = mine.filter(a => a.correct).length;
    if (w.length >= 3) help.push({ s, why: `Còn ${w.length} bụi cỏ, hay nhầm "${(d.mis[w[0].code] || {}).label || w[0].label}"` });
    else if (mine.length >= 3 && ok / mine.length < 0.5) help.push({ s, why: `Hôm nay đúng ngay ${ok}/${mine.length} câu` });
    else if (!s.last_seen) help.push({ s, why: "Chưa vào lớp lần nào" });
  });
  return { n, joined, rate: first.length ? Math.round(right * 100 / first.length) : null, firstN: first.length, fixedToday, withWeeds, totalWeeds, top, help };
}

// ------------------------------------------------------------------ Hôm nay
export async function todayScreen() {
  await ensureClasses(); if (!TS.cur) return noClass();
  const box = h("div", {});
  let live = null;
  async function paint() {
    let d; try { d = await classData(); } catch (e) { box.replaceChildren(h("p", { class: "bad-text" }, friendlyError(e))); return; }
    const t = computeToday(d);
    box.replaceChildren(
      h("div", { class: "stats" },
        stat("Đã vào", `${t.joined}/${t.n}`, "em hôm nay"),
        stat("Đúng ngay", t.rate == null ? "–" : t.rate + "%", `${t.firstN} câu lần đầu`),
        stat("Tự sửa", t.fixedToday, "bụi cỏ đã nhổ"),
        stat("Còn cỏ", t.withWeeds, `em · ${t.totalWeeds} bụi`)),
      h("div", { class: "two-col" },
        h("div", { class: "card" }, h("h2", {}, "🌿 3 cỏ dại cả lớp hay mắc"),
          t.top.length ? t.top.map(w => h("div", { class: "weed-row" }, h("span", { html: weedSvg(34) }),
            h("div", {}, h("b", {}, weedName(w.label)), h("div", { class: "small muted" }, `${w.k} em đang có`), w.tip ? h("div", { class: "tip" }, "💡 Gợi ý giảng lại: " + w.tip) : null)))
            : h("p", { class: "muted" }, "Chưa có cỏ dại nào. Cả lớp làm tốt quá!")),
        h("div", { class: "card" }, h("h2", {}, "🤝 Em cần kèm"),
          t.help.length ? h("ul", { class: "help-list" }, t.help.slice(0, 12).map(x => h("li", {}, h("b", {}, x.s.name), " · ", x.why)))
            : h("p", { class: "muted" }, "Chưa có em nào cần kèm thêm."))),
      h("p", { class: "small muted" }, "Cập nhật lúc " + new Date().toLocaleTimeString("vi-VN")));
    box._t = t;
  }
  const liveBtn = btn("🔴 Trực tiếp: tắt", () => {
    if (live) { clearInterval(live); live = null; liveBtn.textContent = "🔴 Trực tiếp: tắt"; }
    else { live = setInterval(() => document.body.contains(box) ? paint() : clearInterval(live), 15000); liveBtn.textContent = "🟢 Trực tiếp: tự cập nhật 15 giây"; }
  }, "btn btn-soft");
  await paint();
  return shell(h("div", {},
    h("div", { class: "row-between" }, h("h1", { class: "page-title" }, `Hôm nay · ${TS.cur.name}`),
      h("div", { class: "actions" }, btn("📺 Chiếu lên tivi", () => tv(box._t), "btn btn-main"), liveBtn, btn("↻", paint, "btn btn-soft"))),
    box), "#/gv");
}
const stat = (k, v, sub) => h("div", { class: "stat card" }, h("div", { class: "stat-k" }, k), h("div", { class: "stat-v" }, v), h("div", { class: "small muted" }, sub));

function tv(t) {
  if (!t) return;
  const giant = t.top[0] && t.n && t.top[0].k / t.n >= 0.3 ? t.top[0] : null;
  modal(h("div", { class: "tv" },
    h("h1", {}, "☁️ " + TS.cur.name),
    h("div", { class: "stats" }, stat("Đã vào", `${t.joined}/${t.n}`, ""), stat("Đúng ngay", t.rate == null ? "–" : t.rate + "%", ""), stat("Tự sửa", t.fixedToday, ""), stat("Còn cỏ", t.withWeeds, "em")),
    giant ? h("div", { class: "giant" }, h("span", { html: weedSvg(140, 2) }), h("div", {}, h("h2", {}, "Cỏ dại khổng lồ!"), h("p", { class: "big" }, weedName(giant.label)), h("p", {}, "Cả lớp cùng nhổ cỏ này nhé!")))
      : h("div", {}, h("h2", {}, "Cỏ dại hay gặp"), t.top.map(w => h("p", { class: "big" }, "🌿 " + weedName(w.label))))), { wide: true });
  document.querySelector(".modal").classList.add("modal-tv");
}

// ------------------------------------------------------------------ Lớp của tôi
export async function classScreen() {
  await ensureClasses(); if (!TS.cur) return noClass();
  const c = TS.cur; const map = await loadMap();
  const S = () => ({ open: [], mute: false, growSeconds: 60, aiMode: "approved", ...(c.settings || {}) });
  async function saveSettings(patch) {
    try { const r = await api.updateClass(c.id, { settings: { ...S(), ...patch } }); Object.assign(c, r); toast("Đã lưu", "ok", 1200); }
    catch (e) { toast(friendlyError(e), "bad"); }
  }
  const zoneSwitches = map.zones.map(z => toggle(`Bài ${z.num} · ${z.zone}` + (z.file ? "" : " (chưa có nội dung)"), S().open.includes(z.id), v => {
    const open = new Set(S().open); v ? open.add(z.id) : open.delete(z.id); saveSettings({ open: [...open] });
  }));
  const grow = h("select", { onchange: e => saveSettings({ growSeconds: +e.target.value }) },
    [[30, "30 giây"], [60, "1 phút"], [300, "5 phút"], [1800, "30 phút"], [7200, "2 giờ"]].map(([v, t]) => h("option", { value: v, selected: S().growSeconds === v }, t)));

  const list = h("div", {});
  async function paintStudents() {
    let st; try { st = await api.listStudents(c.id); } catch (e) { return list.replaceChildren(h("p", { class: "bad-text" }, friendlyError(e))); }
    list._st = st;
    list.replaceChildren(st.length ? h("table", { class: "tbl" }, h("thead", {}, h("tr", {}, ["Tên", "3 hình", "Lần vào gần nhất", "Cỏ", ""].map(x => h("th", {}, x)))),
      h("tbody", {}, st.map(s => h("tr", {},
        h("td", {}, h("b", {}, s.name)),
        h("td", { class: "pics-cell" }, s.pics.map(p => PIC[p]?.icon).join(" ")),
        h("td", { class: "small" }, fmtAgo(s.last_seen)),
        h("td", {}, unfixedOf(s).length || "–"),
        h("td", { class: "row-actions" },
          btn("Đổi hình", async () => { await api.updateStudent(s.id, { pics: randomPics() }); paintStudents(); }, "btn btn-tiny"),
          btn("Xóa", () => confirmBox(`Xóa em ${s.name} và toàn bộ vườn của em?`, async () => { await api.deleteStudent(s.id); paintStudents(); }), "btn btn-tiny btn-danger"))))))
      : h("p", { class: "muted" }, "Lớp chưa có học sinh. Thêm tên ở ô bên dưới nhé."));
  }
  const names = h("textarea", { rows: 4, placeholder: "Mỗi dòng một tên, ví dụ:\nAn\nBình\nChi" });
  const add = btn("Thêm học sinh", async () => {
    const arr = [...new Set(names.value.split(/\n|,/).map(s => s.trim()).filter(Boolean))].slice(0, 60);
    if (!arr.length) return;
    try { await api.addStudents(c.id, arr); names.value = ""; toast(`Đã thêm ${arr.length} em, mỗi em có 3 hình riêng.`, "ok"); paintStudents(); }
    catch (e) { toast(friendlyError(e), "bad"); }
  }, "btn btn-main");
  const newClass = h("input", { placeholder: "Tên lớp mới", maxlength: 60 });
  await paintStudents();

  return shell(h("div", {},
    h("h1", { class: "page-title" }, "Lớp của tôi"),
    h("div", { class: "two-col" },
      h("div", { class: "card center" }, h("div", { class: "small muted" }, `Mã lớp ${c.name}`), h("div", { class: "class-code" }, c.code),
        h("p", { class: "small muted" }, "Học sinh vào web, bấm Học sinh, nhập mã này."),
        h("div", { class: "actions center" }, btn("🖨️ In thẻ đăng nhập", () => printCards(c, list._st || []), "btn btn-soft"))),
      h("div", { class: "card" }, h("h2", {}, "Công tắc lớp"),
        toggle("🔇 Tắt nhạc cả lớp", S().mute, v => saveSettings({ mute: v })),
        toggle("💬 Cho phép trò chuyện lớp", S().chat !== false, v => saveSettings({ chat: v })),
        h("label", { class: "lbl-row" }, "🌱 Thời gian một cây lớn", grow),
        h("div", { class: "lbl-row muted" }, "🤖 Tí Nị dùng AI hoặc chỉ gợi ý đã duyệt", h("span", { class: "tag" }, "Hiện: gợi ý đã duyệt · AI ở giai đoạn 6")))),
    h("div", { class: "card" }, h("h2", {}, "Mở khu cho lớp"), h("div", { class: "switch-grid" }, zoneSwitches)),
    h("div", { class: "card" }, h("h2", {}, "Học sinh"), list, h("label", { class: "lbl-block" }, "Thêm học sinh", names), h("div", { class: "actions" }, add)),
    h("div", { class: "card" }, h("h2", {}, "Tạo thêm lớp"), h("div", { class: "row" }, newClass, btn("Tạo", async () => {
      if (!newClass.value.trim()) return;
      try { const nc = await api.createClass(newClass.value.trim()); TS.classes.push(nc); TS.cur = nc; LS.set("kvtm-gv-class", nc.id); window.dispatchEvent(new HashChangeEvent("hashchange")); }
      catch (e) { toast(friendlyError(e), "bad"); }
    }, "btn btn-soft")))), "#/gv/lop");
}

function toggle(label, on, onchange) {
  const inp = h("input", { type: "checkbox", role: "switch" }); inp.checked = on;
  inp.addEventListener("change", () => onchange(inp.checked));
  return h("label", { class: "switch" }, inp, h("span", { class: "knob" }), h("span", {}, label));
}
function confirmBox(msg, ok) {
  const m = modal(h("div", {}, h("p", {}, msg), h("div", { class: "actions" }, btn("Hủy", () => m.close(), "btn btn-soft"), btn("Đồng ý", async () => { m.close(); try { await ok(); } catch (e) { toast(friendlyError(e), "bad"); } }, "btn btn-danger"))));
}
function printArea(nodes) {
  let a = document.getElementById("print-area"); if (!a) { a = h("div", { id: "print-area" }); document.body.append(a); }
  a.replaceChildren(...nodes); setTimeout(() => window.print(), 50);
}
function printCards(c, students) {
  if (!students.length) return toast("Lớp chưa có học sinh.");
  printArea([h("div", { class: "print-cards" }, students.map(s => h("div", { class: "pcard" },
    h("div", { class: "pcard-head" }, "☁️ Khu vườn trên mây"), h("div", { class: "pcard-name" }, s.name),
    h("div", {}, "Mã lớp: ", h("b", {}, c.code)),
    h("div", { class: "pcard-pics" }, s.pics.map((p, i) => h("span", {}, h("small", {}, i + 1), PIC[p].icon, h("small", {}, PIC[p].name)))))))]);
}

// ------------------------------------------------------------------ Trò chơi và kiểm tra
export async function gamesScreen() {
  await ensureClasses(); if (!TS.cur) return noClass();
  const games = [
    ["🔐", "Hack Mật Mã Mây", "Mỗi em giữ một Két Mây, trả lời đúng để đầy két và phá mật mã két bạn.", "Giai đoạn 8"],
    ["🎈", "Đua khinh khí cầu", "Cả lớp trả lời, khinh khí cầu của em bay cao dần.", "Giai đoạn 8"],
    ["📝", "Kiểm tra cả lớp", "Kiểm tra đầu và cuối mỗi bài, 8 câu một bài.", "Giai đoạn 7"],
    ["🗂️", "Bộ câu hỏi của tôi", "Gõ, dán hoặc nhập Excel; Tí Nị soạn nháp giúp.", "Giai đoạn 7"],
  ];
  return shell(h("div", {}, h("h1", { class: "page-title" }, "Trò chơi và kiểm tra"),
    h("div", { class: "game-grid" }, games.map(([ic, t, d, phase]) => h("div", { class: "card game" }, h("div", { class: "big-ic" }, ic), h("h2", {}, t), h("p", {}, d), h("span", { class: "tag" }, "Sắp có · " + phase))))), "#/gv/tro-choi");
}

// ------------------------------------------------------------------ Báo cáo
export async function reportScreen() {
  await ensureClasses(); if (!TS.cur) return noClass();
  let d; try { d = await classData(30); } catch (e) { return shell(h("p", { class: "bad-text" }, friendlyError(e)), "#/gv/bao-cao"); }
  const openLessons = d.map.zones.filter(z => z.file && (TS.cur.settings?.open || []).includes(z.id));
  const totalSeeds = openLessons.length * 3;
  const slips = d.students.map(s => {
    const st = s.state || {};
    const seeds = Object.values(st.seeds || {}).filter(x => x.done).length;
    const mine = d.answers.filter(a => a.student_id === s.id && a.kind === "seed" && a.first_try);
    const ok = mine.filter(a => a.correct).length;
    const fixed = (st.weeds || []).filter(w => w.fixed).length;
    const left = unfixedOf(s);
    const leftNames = [...new Set(left.map(w => (d.mis[w.code] || {}).label || w.label))].slice(0, 2);
    const lines = [
      `Phiếu học tập KHTN 6 – Khu vườn trên mây`,
      `Học sinh: ${s.name} · Lớp ${TS.cur.name}`,
      `• Hạt giống kiến thức đã học: ${seeds}/${totalSeeds || seeds}`,
      `• Đúng ngay lần đầu (30 ngày): ${mine.length ? Math.round(ok * 100 / mine.length) + "%" : "chưa có"}`,
      `• Chỗ hiểu nhầm đã tự sửa: ${fixed}`,
      left.length ? `• Còn cần luyện: ${leftNames.join("; ")}` : `• Không còn chỗ hiểu nhầm nào cần luyện.`,
      left.length ? `Gia đình nhắc em vào Vườn Mây nhổ cỏ dại (làm lại câu từng nhầm) nhé.` : `Em học rất chăm, gia đình khen em nhé!`,
    ];
    return { s, text: lines.join("\n") };
  });
  return shell(h("div", {},
    h("div", { class: "row-between" }, h("h1", { class: "page-title" }, "Báo cáo · Phiếu phụ huynh"),
      h("div", { class: "actions" }, btn("🖨️ In tất cả phiếu", () => printArea(slips.map(x => h("pre", { class: "slip" }, x.text))), "btn btn-main"))),
    h("p", { class: "small muted" }, "Sao chép từng phiếu để dán vào Zalo, hoặc in ra. Báo cáo hiệu quả in PDF có ở giai đoạn 7."),
    slips.length ? h("div", { class: "slips" }, slips.map(x => h("div", { class: "card" }, h("pre", { class: "slip" }, x.text),
      btn("📋 Sao chép", async () => { try { await navigator.clipboard.writeText(x.text); toast("Đã sao chép", "ok"); } catch { toast("Trình duyệt chưa cho sao chép, thầy cô bôi đen để chép nhé."); } }, "btn btn-soft"))))
      : h("p", { class: "muted" }, "Lớp chưa có học sinh.")), "#/gv/bao-cao");
}

export const teacherSignedIn = () => !!api.teacherSession();
