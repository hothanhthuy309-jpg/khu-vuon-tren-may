import { api, friendlyError } from "./api.js";
import { h, tiNi, giotSuong, toast } from "./ui.js";
import { IDLE_LOGOUT_MINUTES, COPYRIGHT } from "./config.js";
import { ST, startStudent, loginScreen, mapScreen, zoneScreen, seedScreen, gardenScreen, notebookScreen, experimentScreen, logoutStudent, flush } from "./student.js";
import { teacherLogin, todayScreen, classScreen, gamesScreen, reportScreen, teacherSignedIn } from "./teacher.js";

const app = document.getElementById("app");

function home() {
  return h("div", { class: "home" },
    h("div", { class: "home-hero" }, tiNi(130),
      h("h1", { class: "home-title" }, "Khu vườn trên mây"),
      h("p", { class: "home-sub" }, "Vương quốc Hóa học KHTN 6: học để trồng vườn, nhổ cỏ dại và xây nhà trên mây.")),
    h("div", { class: "home-choices" },
      h("a", { class: "choice card", href: "#/hs" }, h("span", { class: "big-ic" }, "🐑"), h("b", {}, "Em là học sinh"), h("span", { class: "small muted" }, "Mã lớp + 3 hình bí mật")),
      h("a", { class: "choice card", href: "#/gv" }, giotSuong(56), h("b", {}, "Thầy cô"), h("span", { class: "small muted" }, "Góc thầy cô"))),
    h("footer", { class: "copyright" }, COPYRIGHT));
}

async function needStudent() {
  if (ST.profile) return true;
  if (!api.studentToken) { location.hash = "#/hs"; return false; }
  try { await startStudent(); return true; }
  catch (e) { await api.logout(); toast(friendlyError(e)); location.hash = "#/hs"; return false; }
}

const routes = [
  [/^#?\/?$/, async () => home()],
  [/^#\/hs$/, async () => { if (ST.profile || api.studentToken) { if (await needStudent()) { location.hash = "#/may"; return null; } } return loginScreen(); }],
  [/^#\/may$/, async () => (await needStudent()) && mapScreen()],
  [/^#\/khu\/([\w-]+)$/, async m => (await needStudent()) && zoneScreen(m[1])],
  [/^#\/hat\/([\w-]+)\/([\w-]+)$/, async m => (await needStudent()) && seedScreen(m[1], m[2])],
  [/^#\/thi-nghiem\/([\w-]+)$/, async m => (await needStudent()) && experimentScreen(m[1])],
  [/^#\/vuon$/, async () => (await needStudent()) && gardenScreen()],
  [/^#\/so-tay$/, async () => (await needStudent()) && notebookScreen()],
  [/^#\/gv$/, async () => teacherSignedIn() ? todayScreen() : teacherLogin()],
  [/^#\/gv\/lop$/, async () => teacherSignedIn() ? classScreen() : teacherLogin()],
  [/^#\/gv\/tro-choi$/, async () => teacherSignedIn() ? gamesScreen() : teacherLogin()],
  [/^#\/gv\/bao-cao$/, async () => teacherSignedIn() ? reportScreen() : teacherLogin()],
];

let seq = 0;
async function render() {
  const my = ++seq;
  const hash = location.hash || "#/";
  document.querySelectorAll(".modal-back").forEach(m => m.remove());
  const r = routes.find(([re]) => re.test(hash));
  if (!r) { location.hash = "#/"; return; }
  try {
    const el = await r[1](hash.match(r[0]));
    if (my !== seq || !el) return;
    app.replaceChildren(el);
    document.body.classList.toggle("is-teacher", hash.startsWith("#/gv"));
  } catch (e) {
    console.error(e);
    if (my === seq) app.replaceChildren(h("div", { class: "card center", style: { margin: "40px auto", maxWidth: "480px" } }, tiNi(80, "nghi"), h("h2", {}, "Ối, có lỗi nhỏ"), h("p", {}, friendlyError(e)), h("a", { href: "#/", class: "btn btn-soft" }, "Về trang đầu")));
  }
}
window.addEventListener("hashchange", render);

// Tự đăng xuất học sinh sau 20 phút không thao tác
let lastAct = Date.now();
["pointerdown", "keydown", "scroll"].forEach(ev => window.addEventListener(ev, () => lastAct = Date.now(), { passive: true }));
setInterval(() => {
  if (ST.profile && Date.now() - lastAct > IDLE_LOGOUT_MINUTES * 60000) logoutStudent("Em đã nghỉ lâu nên Khu vườn tự đăng xuất để giữ an toàn.");
}, 30000);
window.addEventListener("pagehide", () => { if (ST.profile) flush(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && ST.profile) flush(); });

render();
