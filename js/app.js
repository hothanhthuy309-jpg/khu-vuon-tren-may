// Điều hướng: vương quốc 3D toàn màn hình nằm cố định phía sau, mọi trang học sinh là một "tấm kính" phủ lên trên.
import { api, friendlyError, CONFIGURED } from "./api.js";
const PREVIEW = new URLSearchParams(location.search).has("preview");
import { h, tiNi, giotSuong, toast, modal } from "./ui.js";
import { IDLE_LOGOUT_MINUTES, COPYRIGHT, APP_VERSION } from "./config.js";
import { sound } from "./sound.js";
import { loadMap } from "./content.js";
import { mountTiNi, hideTiNi, setTiNiContext } from "./shell.js";
import { can3D, mountWorld } from "./map3d.js";
import { ST, startStudent, onStudentChange, commit, flush, totalSeeds, unfixed, isOpen, doneCount, score, logoutStudent, plazaTick, plazaWeed, shop, jailInfo, weeklyCheck,
  loginScreen, lessonsScreen, map2dScreen, zoneScreen, seedScreen, labHubScreen, experimentScreen, gardenScreen, notebookScreen } from "./student.js";
import { testScreen, assignScreen, surveyScreen, kt15Screen } from "./tests.js";
import { kilnScreen, buildScreen } from "./workshop.js";
import { studentGameScreen } from "./games.js";
import { sbtScreen } from "./sbt.js";
import { cardScreen, questScreen, bossScreen } from "./fun.js";
import { rcvScreen } from "./rcv.js";
import { gameHub, bakeGame, moleGame, memoryGame, tfGame, jailScreen, dewScreen, petScreen, fishScreen, PET_STAGE } from "./minigames.js";
import { kt15GradeScreen, teacherLogin, teacherSignedIn, todayScreen, classScreen, gamesScreen, setsScreen, reportScreen, hintsScreen, adminScreen, callScreen } from "./teacher.js";

const app = document.getElementById("app");
const worldEl = document.getElementById("world");

// ================================================================== trang đầu
// Hình động 3 hòn đảo (SVG nét viền đậm, bay lơ lửng)
const ISLE_SVG = {
  hoc: `<svg viewBox="0 0 200 170"><g class="isle-bob"><ellipse cx="100" cy="128" rx="78" ry="22" fill="#e9c58f" stroke="#2a2550" stroke-width="3"/><path d="M22 120 a78 22 0 0 0 156 0 v-12 a78 22 0 0 1 -156 0z" fill="#b98a5e" stroke="#2a2550" stroke-width="3"/><ellipse cx="100" cy="108" rx="78" ry="22" fill="#8fd86f" stroke="#2a2550" stroke-width="3"/>
    <rect x="86" y="60" width="8" height="46" fill="#9a6a45" stroke="#2a2550" stroke-width="2.5"/><circle cx="90" cy="50" r="22" fill="#6cc04a" stroke="#2a2550" stroke-width="3"/><circle cx="74" cy="62" r="13" fill="#7ad257" stroke="#2a2550" stroke-width="3"/><circle cx="104" cy="64" r="12" fill="#7ad257" stroke="#2a2550" stroke-width="3"/>
    <circle cx="82" cy="46" r="3" fill="#ff8fb8"/><circle cx="98" cy="40" r="3" fill="#ff8fb8"/><path d="M118 104 l14 -8 l14 8 l-14 8z" fill="#fff" stroke="#2a2550" stroke-width="2.5"/><path d="M118 104 v6 l14 8 l14 -8 v-6" fill="#5bb8ff" stroke="#2a2550" stroke-width="2.5"/>
    <g class="sun-spin"><circle cx="160" cy="36" r="12" fill="#ffd23f" stroke="#2a2550" stroke-width="3"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="160" y1="16" x2="160" y2="8" stroke="#2a2550" stroke-width="3" stroke-linecap="round" transform="rotate(${a} 160 36)"/>`).join("")}</g>
    <g class="pop"><rect x="30" y="34" width="26" height="16" rx="8" fill="#fff" stroke="#2a2550" stroke-width="2"/><text x="43" y="46" font-size="9" font-weight="900" text-anchor="middle" fill="#2a2550">H₂O</text></g></g></svg>`,
  lab: `<svg viewBox="0 0 200 170"><g class="isle-bob d2"><ellipse cx="100" cy="128" rx="78" ry="22" fill="#cdbdf7" stroke="#2a2550" stroke-width="3"/><path d="M22 120 a78 22 0 0 0 156 0 v-12 a78 22 0 0 1 -156 0z" fill="#9a84e8" stroke="#2a2550" stroke-width="3"/><ellipse cx="100" cy="108" rx="78" ry="22" fill="#b9a6f0" stroke="#2a2550" stroke-width="3"/>
    <path d="M92 48 v20 l-20 34 a6 6 0 0 0 5 9 h46 a6 6 0 0 0 5 -9 l-20 -34 v-20z" fill="#e8f6ff" stroke="#2a2550" stroke-width="3"/><path d="M80 90 h40 l9 14 a4 4 0 0 1 -3 6 h-52 a4 4 0 0 1 -3 -6z" fill="#ff8fb8"/><rect x="88" y="42" width="24" height="8" rx="3" fill="#fff" stroke="#2a2550" stroke-width="2.5"/>
    <circle class="bub b1" cx="96" cy="86" r="3" fill="#fff"/><circle class="bub b2" cx="104" cy="92" r="2.5" fill="#fff"/><circle class="bub b3" cx="100" cy="80" r="2" fill="#fff"/>
    <g class="atom" transform-origin="44 62"><ellipse cx="44" cy="62" rx="20" ry="8" fill="none" stroke="#2a2550" stroke-width="2.5"/><ellipse cx="44" cy="62" rx="20" ry="8" fill="none" stroke="#2a2550" stroke-width="2.5" transform="rotate(60 44 62)"/><ellipse cx="44" cy="62" rx="20" ry="8" fill="none" stroke="#2a2550" stroke-width="2.5" transform="rotate(-60 44 62)"/><circle cx="44" cy="62" r="5" fill="#5bb8ff" stroke="#2a2550" stroke-width="2"/></g>
    <rect x="140" y="70" width="9" height="34" rx="3" fill="#ffd23f" stroke="#2a2550" stroke-width="2.5" class="bar1"/><rect x="153" y="58" width="9" height="46" rx="3" fill="#7ee0b5" stroke="#2a2550" stroke-width="2.5" class="bar2"/><rect x="166" y="78" width="9" height="26" rx="3" fill="#ff8fb8" stroke="#2a2550" stroke-width="2.5" class="bar3"/></g></svg>`,
  vuon: `<svg viewBox="0 0 200 170"><g class="isle-bob d3"><ellipse cx="100" cy="128" rx="78" ry="22" fill="#ffc98f" stroke="#2a2550" stroke-width="3"/><path d="M22 120 a78 22 0 0 0 156 0 v-12 a78 22 0 0 1 -156 0z" fill="#f2a05a" stroke="#2a2550" stroke-width="3"/><ellipse cx="100" cy="108" rx="78" ry="22" fill="#ffd9a8" stroke="#2a2550" stroke-width="3"/>
    ${[0, 1, 2].map(r => `<rect x="${44 + r * 40}" y="98" width="32" height="12" rx="4" fill="#a8774f" stroke="#2a2550" stroke-width="2.5"/><g class="sprout s${r}"><path d="M${60 + r * 40} 98 v-14" stroke="#2a2550" stroke-width="3"/><ellipse cx="${54 + r * 40}" cy="${84}" rx="7" ry="4" fill="#7ee0b5" stroke="#2a2550" stroke-width="2.5"/><ellipse cx="${66 + r * 40}" cy="${80}" rx="7" ry="4" fill="#7ee0b5" stroke="#2a2550" stroke-width="2.5"/></g>`).join("")}
    <g class="cloud-drift"><path d="M70 34 a12 12 0 0 1 22 -6 a14 14 0 0 1 26 4 a10 10 0 0 1 -2 20 h-42 a10 10 0 0 1 -4 -18z" fill="#fff" stroke="#2a2550" stroke-width="3"/><circle cx="88" cy="40" r="2.5" fill="#2a2550"/><circle cx="104" cy="40" r="2.5" fill="#2a2550"/>
      ${[0, 1, 2, 3].map(i => `<line class="rain r${i}" x1="${78 + i * 12}" y1="58" x2="${76 + i * 12}" y2="66" stroke="#5bb8ff" stroke-width="3" stroke-linecap="round"/>`).join("")}</g>
    <g class="balloon"><ellipse cx="164" cy="44" rx="14" ry="17" fill="#ff6aa8" stroke="#2a2550" stroke-width="3"/><path d="M164 61 l-4 10 h8z" fill="#c99a6b" stroke="#2a2550" stroke-width="2"/></g></g></svg>`,
};
function setupScreen() {
  return h("div", { class: "hm" }, h("div", { class: "hm-card", style: { margin: "8vh auto", maxWidth: "620px" } },
    h("h2", {}, "⚙️ Web chưa được nối với Supabase"),
    h("p", {}, "Để thầy cô và học sinh dùng thật, cần điền 2 khóa của dự án Supabase vào file ", h("b", {}, "js/config.js"), ":"),
    h("pre", { class: "hm-pre" }, 'export const SUPABASE_URL = "https://xxxx.supabase.co";\nexport const SUPABASE_ANON_KEY = "eyJ...";'),
    h("p", { class: "small muted" }, "Xem hướng dẫn từng bước trong README.md (Bước 1 – Supabase). Sau khi lưu file và đưa lên Vercel, tải lại trang này.")));
}
async function home(tab = null) {
  let notice = "", copyright = COPYRIGHT;
  try { const s = await api.appSettings(); notice = s.notice || ""; copyright = s.copyright || COPYRIGHT; } catch {}
  const area = h("div", { class: "hm2-area" });
  const choose = () => area.replaceChildren(h("div", { class: "hm2-choices" },
    h("button", { class: "hm2-choice", onclick: () => open("hs") }, h("span", { class: "hm2-ic" }, "🐑"), h("b", {}, "Em là học sinh"), h("small", {}, "Mã lớp + mật khẩu")),
    h("button", { class: "hm2-choice", onclick: () => open("gv") }, h("span", { class: "hm2-ic" }, "💧"), h("b", {}, "Thầy cô"), h("small", {}, "Góc thầy cô"))));
  const open = k => { sound.play && sound.play("bam"); area.replaceChildren(h("div", { class: "hm-card hm2-card" },
    h("button", { class: "hm2-back", onclick: choose }, "⬅ Quay lại"), h("h2", { class: "hm-hello" }, k === "hs" ? "🐑 Em là học sinh" : "💧 Góc thầy cô"),
    k === "hs" ? loginScreen({ compact: true }) : teacherLogin({ compact: true }))); };
  tab ? open(tab) : choose();
  const deco = ["✨", "⭐", "✨", "🌱"].map((e, i) => h("i", { class: "hm2-deco d" + i }, e));
  const flowers = ["🌷", "🌱", "🌼", "🌿", "🌻"].map((e, i) => h("i", { class: "hm2-fl f" + i }, e));
  return h("div", { class: "hm2" }, h("i", { class: "hm-cloud c0" }), h("i", { class: "hm-cloud c2" }), ...deco,
    h("div", { class: "hm2-mid" },
      h("div", { class: "hm2-mascot" }, tiNi(120)),
      h("h1", { class: "hm2-title" }, "Khu vườn trên mây"),
      h("p", { class: "hm2-sub" }, "Vương quốc Hóa học KHTN 6: học để trồng vườn, nhổ cỏ dại và xây nhà trên mây ☁️"),
      area, notice ? h("div", { class: "hm-notice" }, "📣 ", notice) : null),
    h("div", { class: "hm2-hill h1" }), h("div", { class: "hm2-hill h2" }), ...flowers,
    h("p", { class: "hm2-copy" }, copyright, " · Phiên bản " + APP_VERSION));
}

// ================================================================== học sinh
async function needStudent() {
  if (ST.profile) return true;
  if (!api.studentToken) { location.hash = "#/hs"; return false; }
  try { await startStudent(); return true; }
  catch (e) { await api.logout(); toast(friendlyError(e)); location.hash = "#/hs"; return false; }
}

// thông báo trên dock: cỏ dại, bài kiểm tra, trò chơi
let gameRoom = null, gamePoll = null, rcvRoom = null, pollHash = "", pollOld = 0;
function alerts() {
  if (!ST.state) return {};
  const s = ST.settings || {};
  let test = null;
  if (s.assign && s.assign.open && s.assign.questions?.length && !ST.state.assign[s.assign.id]) test = "#/bai-giao";
  if (s.survey && s.survey.on && !(ST.state.surveys || {})[s.survey.id]) test = "#/khao-sat";
  if (s.kt15 && s.kt15.open && !(ST.state.kt15 || {})[s.kt15.id]?.done) test = "#/kt15";
  if (s.kt15?.published && (ST.state.kt15 || {})[s.kt15.id]?.done && !ST.state.kt15[s.kt15.id].seen) { ST.state.kt15[s.kt15.id].seen = true; setTimeout(() => toast("📤 Cô đã công bố điểm " + s.kt15.title + "! Bấm 📝 Kiểm tra để xem.", "ok", 6000), 500); }
  if (!test) for (const [id, t] of Object.entries(s.tests || {})) {
    if (!isOpen(id)) continue;
    if (t.pre && !ST.state.tests[id + ":pre"] && doneCount(id) === 0) { test = `#/kiem-tra/${id}/pre`; break; }
    if (t.post && !ST.state.tests[id + ":post"]) { test = `#/kiem-tra/${id}/post`; break; }
  }
  return { weeds: unfixed().length, test, game: gameRoom, boss: !!ST.settings?.boss?.on };
}
// Thông báo của cô: dòng chữ chạy trên màn hình học sinh
function paintAnnounce() {
  paintUrgent();
  const a = ST.profile && ST.settings?.announce, on = a && a.text && Date.now() - a.at < 864e5;
  let el = document.getElementById("announce");
  if (!on) { el?.remove(); return; }
  if (el && el.dataset.at == a.at) return;
  el?.remove(); el = document.createElement("div"); el.id = "announce"; el.dataset.at = a.at;
  const sp = document.createElement("span"); sp.textContent = "📢 Cô thông báo: " + a.text; el.append(sp); document.body.append(el);
  sp.style.animationDuration = Math.max(12, (a.text.length + 20) * 0.28) + "s";
}
setInterval(() => { if (!gamePoll && ST.profile) pollGame(); else paintAnnounce(); }, 15000);
// Thông báo KHẨN: phát liên tục cho đến khi cô tắt
function paintUrgent() {
  const a = ST.profile && ST.settings?.urgent, on = a && a.text;
  let el = document.getElementById("urgent");
  if (!on) { el?.remove(); return; }
  if (el && el.dataset.at == a.at) return;
  el?.remove(); el = document.createElement("div"); el.id = "urgent"; el.dataset.at = a.at;
  const sp = document.createElement("span"); sp.textContent = "🚨 THÔNG BÁO KHẨN CỦA CÔ: " + a.text + " 🚨"; el.append(sp); document.body.append(el);
  sp.style.animationDuration = Math.max(10, (a.text.length + 30) * 0.25) + "s"; try { sound.play("chuong"); } catch {}
}
async function pollGame() {
  if (!ST.profile) return;
  // cập nhật cài đặt lớp (cô vừa giao bài kiểm tra, mở bài, giam/thả…)
  // tiết kiệm băng thông: tab ẩn thì không hỏi; mỗi lần chỉ hỏi 1 gói nhỏ, cài đặt lớp chỉ tải lại khi cô thay đổi
  if (document.hidden) return;
  let p = null; try { p = await api.poll(); } catch {}
  if (p) {
    if (p.h !== pollHash) { try { const s = await api.settingsNow(); if (s) { ST.settings = s; W.api && W.api.refresh(); } pollHash = p.h; } catch {} }
    if (p.game !== gameRoom) { gameRoom = p.game || null; W.api && W.api.alerts(); }
    rcvRoom = p.rcv || null;
  } else if (++pollOld % 4 === 1) { // máy chủ chưa cập nhật schema: cách cũ nhưng thưa hơn
    try { const r = await api.load(); if (r && r.settings) { ST.settings = r.settings; W.api && W.api.refresh(); } } catch {}
    try { const id = await api.studentGameActive(); if (id !== gameRoom) { gameRoom = id; W.api && W.api.alerts(); } } catch {}
    try { const v = await api.rcvState(); rcvRoom = v && v.phase !== "end" ? v.id : null; } catch {}
  }
  paintAnnounce();
  autoPull();
}
// Cô mở trò chơi cả lớp hoặc giao bài kiểm tra thì tự đưa cả lớp vào (mỗi lượt chỉ gọi 1 lần)
const pulled = new Set(JSON.parse(sessionStorage.getItem("kvtm-pulled") || "[]"));
function autoPull() {
  const h = location.hash || "";
  if (!ST.profile || /^#\/(kiem-tra|bai-giao|giam)/.test(h)) return;
  const a = alerts(); let go = null, key = null, msg = "";
  if (rcvRoom && h !== "#/rcv") { location.hash = "#/rcv"; sound.play && sound.play("chuong"); toast("🔔 Rung chuông vàng liên lớp bắt đầu! Vào sàn đấu thôi!", "ok", 5000); return; }
  if (gameRoom && h !== "#/tro-choi/lop" && !pulled.has("g:" + gameRoom)) { key = "g:" + gameRoom; go = "#/tro-choi/lop"; msg = "🎮 Cô vừa mở trò chơi cả lớp. Vào phòng thôi!"; }
  else if (a.test && !gameRoom) { key = "t:" + a.test + ":" + (ST.settings.assign?.id || ""); go = a.test; msg = "📝 Cô vừa giao bài kiểm tra. Em vào làm ngay nhé!"; }
  if (!go || pulled.has(key)) return;
  pulled.add(key); sessionStorage.setItem("kvtm-pulled", JSON.stringify([...pulled]));
  document.querySelectorAll(".modal-back").forEach(m => m.remove());
  sound.play && sound.play("chuong"); toast(msg, "ok", 5000); location.hash = go;
}

// Thông báo sáng thứ Hai: danh sách cư dân đang bị giam (mỗi tuần hiện 1 lần trên mỗi máy)
// Hướng dẫn sử dụng cho học sinh: hiện lần đầu vào vương quốc, mở lại bằng nút ❓
function showHelp() {
  const S = [["🚶", "Di chuyển", "Máy tính: phím W A S D hoặc mũi tên. iPad/điện thoại: bấm 4 nút mũi tên ở góc màn hình, hoặc chạm vào chỗ muốn đến."],
    ["📚", "Học bài", "Vào Quần đảo Học Tập → chọn bài cô đã mở → học từng hạt giống: Khám phá rồi trả lời 3 câu. Đúng ngay lần đầu được đủ điểm, mỗi lần sai bị trừ bớt."],
    ["🤖", "Tí Nị gợi ý", "Bí câu nào thì bấm hỏi Tí Nị. Tí Nị gợi ý từng bậc, không nói đáp án."],
    ["🌱", "Vườn Mây", "Gieo hạt mây em nhận được, chờ cây lớn rồi thu hoạch nguyên liệu. Nhổ cỏ dại = làm lại câu từng sai."],
    ["🔥", "Xưởng Mây", "Đem nguyên liệu vào Lò Mây nung gạch, kính, thép… rồi xây nhà cho cư dân mây."],
    ["⚗️", "Thí nghiệm", "Đảo Thí Nghiệm & Mô Phỏng: Dự đoán → Làm → Kết luận, nhận giọt mây 💧."],
    ["🎮", "Trò chơi", "Trò chơi riêng đổi giọt mây lấy quần áo. Khi cô mở trò chơi cả lớp, em tự vào phòng và chỉ ra được khi cô kết thúc."],
    ["💧", "Bác Giọt Sương", "Mỗi ngày ghé Bác ở quảng trường làm nhiệm vụ 3 câu để nhận giọt mây."],
    ["📝", "Bài cô giao", "Có bài kiểm tra cô giao thì phải làm xong mới đi chơi được."],
    ["⛓️", "Nội quy", "Nói tục, nói bậy, thoát ra khi làm bài hoặc lười học sẽ bị nhốt vào Đảo Giam Giữ. Trả lời đúng 5 câu để được thả."]];
  modal(h("div", { class: "help-modal" }, h("h2", {}, "📖 Hướng dẫn cho cư dân mây"),
    h("div", { class: "help-grid" }, S.map(([i, t, d]) => h("div", { class: "help-it" }, h("span", {}, i), h("div", {}, h("b", {}, t), h("p", {}, d))))),
    h("div", { class: "actions center" }, h("button", { class: "btn btn-main", onclick: e => e.target.closest(".modal-back")?.remove() }, "Em hiểu rồi! 🚀"))));
}
function firstHelp() { try { const k = "kvtm-hdsd-" + ST.profile.id; if (!localStorage.getItem(k)) { localStorage.setItem(k, "1"); setTimeout(showHelp, 600); } } catch {} }
function mondayNotice() {
  const now = new Date(); if (now.getDay() !== 1 || !ST.settings) return;
  const key = "kvtm-mon-" + ST.profile.classId + "-" + now.toISOString().slice(0, 10);
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch {}
  const list = Object.entries(ST.settings.jail || {}).filter(([id]) => !(ST.settings.release || {})[id]).map(([, j]) => j.name).filter(Boolean);
  modal(h("div", { class: "center" }, h("h2", {}, "📢 Bảng tin sáng thứ Hai"), list.length ? h("div", {}, h("p", {}, "Những cư dân đang ở Đảo Giam Giữ tuần này:"), h("p", { class: "lead" }, h("b", {}, list.join(", "))), h("p", { class: "small muted" }, "Muốn về quảng trường, các bạn trả lời đúng 5 câu hỏi về bài đã học."))
    : h("p", { class: "lead" }, "Tuần này không có cư dân nào bị giam. Cả lớp chăm ngoan quá! 🌈")));
}
// vương quốc 3D giữ nguyên giữa các trang
const W = { api: null, mounting: null, failed: false, off: null };
async function ensureWorld() {
  if (W.api || W.failed || !can3D()) return W.api;
  if (W.mounting) return W.mounting;
  const map = await loadMap();
  document.body.classList.remove("no-world");
  W.mounting = mountWorld(worldEl, {
    zones: map.zones, isOpen, doneOf: doneCount,
    me: { id: ST.profile.id, name: ST.state.avatar?.nick || ST.profile.name, classId: ST.profile.classId, avatar: ST.state.avatar }, shop, jailed: () => !!jailInfo(), onHelp: showHelp, pet: () => ST.state?.pet?.active || "", petStage: () => { const P = ST.state?.pet, x = P?.active ? (P.xp || {})[P.active] || 0 : 0; return x < 6 ? 0 : x < 18 ? 1 : x < 36 ? 2 : 3; }, petScale: () => { const P = ST.state?.pet; return P?.active ? PET_STAGE((P.xp || {})[P.active] || 0)[1] : 1; }, onFlag: () => { ST.state.flags.push(Date.now()); ST.state.jail = { at: Date.now(), reason: "Cô giáo giam vì nói tục, nói bậy trong trò chuyện lớp (" + new Date().toLocaleString("vi-VN") + ")" }; commit(); flush && flush();
      modal(h("div", { class: "center" }, h("div", { style: { fontSize: "56px" } }, "⛓️"), h("h2", {}, "Em bị đưa vào nhà giam!"), h("p", { class: "lead" }, "Lý do: nói tục, nói bậy trong trò chuyện lớp."), h("p", {}, "Trả lời đúng 5 câu hỏi để được thả. Lần sau nhắn lịch sự nhé!"), h("button", { class: "btn btn-main", onclick: e => { e.target.closest(".modal-back")?.remove(); location.hash = "#/giam"; } }, "Đến Đảo Giam Giữ ➜"))); }, realName: ST.profile.name,
    chatOn: ST.settings.chat !== false, aiMode: ST.settings.aiMode,
    houses: () => ST.state?.houses || [], alerts, openIds: () => ST.settings?.open || [],
    plazaWeeds: () => ST.state?.plaza?.weeds || [], onPlazaWeed: id => plazaWeed(id), score: () => ST.state ? score() : 0, seeds: () => ST.state ? totalSeeds() : 0,
    onNav: hash => { location.hash = hash; },
    onSaveAvatar: av => { ST.state.avatar = av; commit(); },
    onLogout: () => logoutStudent(),
    onFail: err => { console.warn("3D lỗi, chuyển sang bản đồ 2D", err); W.failed = true; disposeWorld(); if (location.hash === "#/may") render(); },
  }).then(api_ => { W.api = api_; W.mounting = null; W.off = onStudentChange(() => W.api && W.api.refresh()); mondayNotice(); firstHelp(); return api_; })
    .catch(err => { console.warn("Không tải được 3D", err); W.failed = true; W.mounting = null; disposeWorld(); return null; });
  return W.mounting;
}
function disposeWorld() {
  if (W.off) { W.off(); W.off = null; }
  if (W.api) { try { W.api.dispose(); } catch {} W.api = null; }
  worldEl.innerHTML = ""; document.body.classList.add("no-world");
}

const stu = fn => async m => {
  if (!(await needStudent())) return null;
  weeklyCheck();
  const tst = alerts().test; // cô đã giao bài thì phải làm trước, chưa làm thì không vào được chỗ khác
  if (tst && !jailInfo() && !location.hash.startsWith(tst) && !/^#\/tro-choi\/lop$/.test(location.hash)) { toast("📝 Em cần làm bài cô giao trước nhé!", "bad", 4000); location.hash = tst; return null; }
  if (rcvRoom && location.hash !== "#/rcv") { location.hash = "#/rcv"; return null; }
  if (gameRoom && location.hash !== "#/tro-choi/lop") { toast("🎮 Em đang trong trò chơi cả lớp. Chỉ khi cô kết thúc, em mới ra được nhé!", "bad", 4000); location.hash = "#/tro-choi/lop"; return null; }
  if (jailInfo() && !/^#\/(giam|may)$/.test(location.hash)) { toast("Em đang ở Đảo Giam Giữ. Trả lời đúng 5 câu để ra nhé!"); location.hash = "#/giam"; return null; }
  return { el: await fn(m), student: true };
};
const tea = fn => async m => teacherSignedIn() ? { el: await fn(m), teacher: true } : { el: await home("gv") };

const routes = [
  [/^#?\/?$/, async () => ({ el: await home() })],
  [/^#\/hs$/, async () => { if (ST.profile || api.studentToken) { if (await needStudent()) { location.hash = "#/may"; return null; } } return { el: await home("hs") }; }],
  [/^#\/may$/, async () => {
    if (!(await needStudent())) return null;
    weeklyCheck(); const tst = alerts().test; if (tst && !jailInfo()) { toast("📝 Em cần làm bài cô giao trước nhé!", "bad", 4000); location.hash = tst; return null; }
    if (gameRoom) { location.hash = "#/tro-choi/lop"; return null; }
    const w = await ensureWorld();
    if (w) return { el: null, student: true, world: true };
    let want2d = false; try { want2d = sessionStorage.getItem("kvtm-2d") === "1"; } catch {}
    if (!want2d) return { el: h("div", { class: "page-login" }, h("div", { class: "card center", style: { maxWidth: "520px", margin: "12vh auto" } }, h("div", { style: { fontSize: "56px" } }, "☁️"),
      h("h2", {}, "Vương quốc 3D đang chưa mở được"), h("p", {}, "Máy đang bận hoặc mạng chậm. Em bấm Thử lại nhé. Nếu máy yếu, em có thể chọn bản đồ 2D."),
      h("div", { class: "actions center" }, h("button", { class: "btn btn-main btn-big", onclick: () => { W.failed = false; render(); } }, "🔄 Thử lại 3D"),
        h("button", { class: "btn btn-soft", onclick: () => { try { sessionStorage.setItem("kvtm-2d", "1"); } catch {} render(); } }, "🗺️ Mở bản đồ 2D")))), student: true };
    firstHelp(); const m2 = await map2dScreen();
    m2.prepend(h("button", { class: "btn btn-soft back3d", onclick: () => { try { sessionStorage.removeItem("kvtm-2d"); } catch {} W.failed = false; render(); } }, "🌐 Về vương quốc 3D"));
    return { el: m2, student: true };
  }],
  [/^#\/hoc$/, stu(() => lessonsScreen())],
  [/^#\/khu\/([\w-]+)$/, stu(m => zoneScreen(m[1]))],
  [/^#\/hat\/([\w-]+)\/([\w-]+)$/, stu(m => seedScreen(m[1], m[2]))],
  [/^#\/thi-nghiem$/, stu(() => labHubScreen("sim"))],
  [/^#\/mo-phong$/, stu(() => labHubScreen("sim"))],
  [/^#\/thi-nghiem\/([\w-]+)$/, stu(m => experimentScreen(m[1]))],
  [/^#\/vuon$/, stu(() => gardenScreen())],
  [/^#\/so-tay$/, stu(() => notebookScreen())],
  [/^#\/lo-may$/, stu(() => kilnScreen())],
  [/^#\/xay-nha$/, stu(() => buildScreen())],
  [/^#\/kiem-tra\/([\w-]+)\/(pre|post)$/, stu(m => testScreen(m[1], m[2]))],
  [/^#\/bai-giao$/, stu(() => assignScreen())],
  [/^#\/khao-sat$/, stu(() => surveyScreen())],
  [/^#\/tro-choi$/, stu(() => gameHub())],
  [/^#\/tro-choi\/lop$/, stu(() => studentGameScreen())],
  [/^#\/tro-choi\/banh$/, stu(() => bakeGame())],
  [/^#\/tro-choi\/chuot$/, stu(() => moleGame())],
  [/^#\/tro-choi\/the$/, stu(() => memoryGame())],
  [/^#\/tro-choi\/nhanh$/, stu(() => tfGame())],
  [/^#\/giam$/, stu(() => jailScreen())],
  [/^#\/giot-suong$/, stu(() => dewScreen())],
  [/^#\/thu-cung$/, stu(() => petScreen())],
  [/^#\/the-bai$/, stu(() => cardScreen())],
  [/^#\/nhiem-vu$/, stu(() => questScreen())],
  [/^#\/boss$/, stu(() => bossScreen())],
  [/^#\/ho-ca$/, stu(() => fishScreen())],
  [/^#\/sbt\/([\w-]+)$/, stu(m => sbtScreen(m[1]))],
  [/^#\/gv$/, tea(() => todayScreen())],
  [/^#\/gv\/lop$/, tea(() => classScreen())],
  [/^#\/gv\/tro-choi$/, tea(() => gamesScreen())],
  [/^#\/gv\/kt15$/, tea(() => kt15GradeScreen())],
  [/^#\/kt15$/, stu(() => kt15Screen())],
  [/^#\/rcv$/, stu(() => rcvScreen())],
  [/^#\/gv\/bo-cau-hoi$/, tea(() => setsScreen())],
  [/^#\/gv\/bao-cao$/, tea(() => reportScreen())],
  [/^#\/gv\/goi-y$/, tea(() => hintsScreen())],
  [/^#\/gv\/quan-tri$/, tea(() => adminScreen())],
  [/^#\/gv\/goi-bai$/, tea(() => callScreen())],
];

let seq = 0, lastMood = null;
async function render() {
  const my = ++seq;
  const hash = location.hash || "#/";
  document.querySelectorAll(".modal-back").forEach(m => m.remove());
  setTiNiContext(null);
  if (!CONFIGURED && !PREVIEW) { app.replaceChildren(setupScreen()); return; }
  const r = routes.find(([re]) => re.test(hash));
  if (!r) { location.hash = "#/"; return; }
  try {
    const res = await r[1](hash.match(r[0]));
    if (my !== seq || !res) return;
    // học sinh: giữ thế giới 3D phía sau; trang khác thì tắt hẳn
    if (res.student) {
      if (!res.world && hash !== "#/may" && !W.failed && can3D()) ensureWorld().then(w => w && w.pause(true));
      if (W.api) { W.api.pause(!res.world); if (res.world) W.api.refresh(); }
      document.body.classList.toggle("no-world", !W.api && !W.mounting);
      mountTiNi(ST.settings || {}); paintAnnounce();
      if (!gamePoll) { pollGame(); plazaTick(); gamePoll = setInterval(() => { pollGame(); plazaTick(); }, 10000); }
      const mood = hash.startsWith("#/vuon") ? "garden" : hash.startsWith("#/thi-nghiem") || hash.startsWith("#/mo-phong") || hash.startsWith("#/lo-may") ? "lab" : hash.startsWith("#/hat") || hash.startsWith("#/kiem-tra") || hash.startsWith("#/bai-giao") ? "lesson" : hash === "#/tro-choi/lop" ? "battle" : hash.startsWith("#/tro-choi") ? "game" : "world";
      if (mood !== lastMood) { lastMood = mood; sound.setMood && sound.setMood(mood); }
    } else {
      if (W.api || W.mounting) disposeWorld();
      document.body.classList.add("no-world");
      hideTiNi(); clearInterval(gamePoll); gamePoll = null; gameRoom = null; lastMood = null;
    }
    if (res.el) app.replaceChildren(res.el); else app.replaceChildren();
    document.body.classList.toggle("is-teacher", !!res.teacher);
    document.body.classList.toggle("in-world", !!res.world);
  } catch (e) {
    console.error(e);
    if (my === seq) app.replaceChildren(h("div", { class: "card center", style: { margin: "40px auto", maxWidth: "480px", position: "relative", zIndex: 40 } }, tiNi(80, "nghi"), h("h2", {}, "Ối, có lỗi nhỏ"), h("p", {}, friendlyError(e)), h("a", { href: "#/", class: "btn btn-soft" }, "Về trang đầu")));
  }
}
window.addEventListener("hashchange", render);
// Esc đóng tấm kính, quay về vương quốc
window.addEventListener("keydown", e => {
  if (e.key !== "Escape" || document.querySelector(".modal-back") || !ST.profile) return;
  if (/^#\/(hoc|khu|hat|thi-nghiem|mo-phong|vuon|so-tay|lo-may|xay-nha|bai-giao)/.test(location.hash)) location.hash = "#/may";
});

// Tự đăng xuất học sinh sau 20 phút không thao tác
let lastAct = Date.now();
["pointerdown", "keydown", "wheel"].forEach(ev => window.addEventListener(ev, () => lastAct = Date.now(), { passive: true }));
setInterval(() => {
  if (ST.profile && Date.now() - lastAct > IDLE_LOGOUT_MINUTES * 60000) { disposeWorld(); logoutStudent("Em đã nghỉ lâu nên Khu vườn tự đăng xuất để giữ an toàn."); }
}, 30000);
window.addEventListener("pagehide", () => { if (ST.profile) flush(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && ST.profile) flush(); });
document.body.classList.add("no-world");
window.__kvtmStarted = true;
render();
