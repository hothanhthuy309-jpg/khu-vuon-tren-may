// Các màn hình của học sinh: đăng nhập, bản đồ, khu, hạt giống, Vườn Mây, Sổ tay
import { api, friendlyError } from "./api.js";
import { h, btn, toast, modal, tiNi, giotSuong, weedSvg, plantSvg, burst, rainbow, shuffle } from "./ui.js";
import { sound } from "./sound.js";
import { PICS, PIC } from "./pics.js";
import { loadMap, loadLesson, weedName } from "./content.js";
import { renderQuestion, theoryView } from "./quiz.js";
import { experimentView } from "./experiment.js";
import { DEFAULT_GROW_SECONDS } from "./config.js";
import { can3D, mountMap3D } from "./map3d.js";

// ------------------------------------------------------------------ trạng thái
export const ST = { profile: null, state: null, settings: null, logQ: [], timer: null };

function freshState(s) {
  s = s && typeof s === "object" ? s : {};
  return {
    v: 1,
    cloudSeeds: s.cloudSeeds || {},      // { "bai-10": 2 }
    seeds: s.seeds || {},                // { "bai-10/s1": { done, at, firstRight } }
    garden: Array.isArray(s.garden) && s.garden.length === 25 ? s.garden : Array(25).fill(null),
    weeds: s.weeds || [],                // { id, lesson, seed, qid, code, label, tile, bornAt, fixed, fixedAt }
    inventory: s.inventory || {},
    notebook: s.notebook || [],          // khóa hạt giống đã có thẻ lý thuyết
    journal: s.journal || [],
    avatar: s.avatar || null,             // nhân vật trong Tủ đồ
  };
}
export async function startStudent() {
  const r = await api.load();
  ST.profile = { id: r.id, name: r.name, className: r.className, classId: r.classId };
  ST.settings = r.settings || {};
  ST.state = freshState(r.state);
  sound.setClassMuted(ST.settings.mute);
  sound.startBgm();
}
export function stopStudent() { sound.stopBgm(); ST.profile = ST.state = ST.settings = null; ST.logQ = []; clearTimeout(ST.timer); }
function refreshHeader() {
  const c = document.querySelector(".seed-count"); if (c) c.textContent = totalSeeds();
  const b = document.querySelector(".bottomnav .badge"); if (b) { const n = unfixed().length; b.textContent = n; b.classList.toggle("hidden", !n); }
}
function commit() {
  refreshHeader();
  clearTimeout(ST.timer);
  ST.timer = setTimeout(flush, 700);
}
export async function flush() {
  clearTimeout(ST.timer);
  if (!ST.state) return;
  refreshHeader();
  const rows = ST.logQ.splice(0);
  try { await api.save(ST.state); if (rows.length) await api.log(rows); }
  catch (e) { ST.logQ.unshift(...rows); if (e.message?.includes("het_phien")) { toast(friendlyError(e), "bad"); location.hash = "#/hs"; } }
}
const totalSeeds = () => Object.values(ST.state.cloudSeeds).reduce((a, b) => a + b, 0);
const unfixed = () => ST.state.weeds.filter(w => !w.fixed);
const growMs = () => (ST.settings.growSeconds || DEFAULT_GROW_SECONDS) * 1000;
const isOpen = id => (ST.settings.open || []).includes(id);
const seedDone = (lesson, seed) => !!ST.state.seeds[`${lesson}/${seed}`]?.done;

function spawnWeed(lesson, seed, q, code, label) {
  const qid = `${lesson}/${seed}/${q.id}`;
  if (ST.state.weeds.some(w => !w.fixed && w.qid === qid)) return;
  const counts = Array(25).fill(0); unfixed().forEach(w => counts[w.tile]++);
  const min = Math.min(...counts); const cands = counts.map((c, i) => c === min ? i : -1).filter(i => i >= 0);
  const tile = cands[Math.floor(Math.random() * cands.length)];
  ST.state.weeds.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), lesson, seed, qid, code: code || "", label: label || "", tile, bornAt: Date.now(), fixed: false });
}

// ------------------------------------------------------------------ khung trang
export function studentShell(content, active) {
  const weeds = unfixed().length;
  const soundBtn = h("button", { class: "icon-btn", "aria-label": "Bật tắt âm thanh", onclick: () => {
    if (sound.classMuted) return toast("Cô đã tắt nhạc cả lớp.");
    const on = sound.toggle(); soundBtn.textContent = on ? "🔊" : "🔇"; } }, sound.muted ? "🔇" : "🔊");
  const nav = [["#/may", "🗺️", "Bản đồ"], ["#/vuon", "🌱", "Vườn Mây"], ["#/so-tay", "📒", "Sổ tay"]];
  return h("div", { class: "shell" },
    h("header", { class: "topbar" },
      h("a", { class: "brand", href: "#/may" }, h("span", { class: "brand-cloud" }, "☁️"), h("span", { class: "brand-text" }, "Khu vườn trên mây")),
      h("div", { class: "top-right" },
        h("span", { class: "pill", title: "Hạt mây" }, "🌰 ", h("span", { class: "seed-count" }, totalSeeds())),
        h("span", { class: "pill pill-name" }, "🐑 ", ST.profile.name),
        soundBtn,
        h("button", { class: "icon-btn", "aria-label": "Đăng xuất", onclick: () => logoutStudent() }, "🚪"))),
    h("main", { class: "page" }, content),
    h("nav", { class: "bottomnav" }, nav.map(([href, ic, t]) =>
      h("a", { href, class: active === href ? "on" : "" }, h("span", { class: "nav-ic" }, ic), t,
        href === "#/vuon" ? h("span", { class: "badge" + (weeds ? "" : " hidden") }, weeds) : null))));
}
export async function logoutStudent(msg) {
  await flush(); await api.logout(); stopStudent();
  if (msg) toast(msg); location.hash = "#/hs";
}

// ------------------------------------------------------------------ đăng nhập
export function loginScreen() {
  const root = h("div", { class: "login" });
  let code = "", roster = [], who = null, picks = [];
  const savedCode = (() => { try { return localStorage.getItem("kvtm-last-code") || ""; } catch { return ""; } })();

  function stepCode() {
    const inp = h("input", { class: "code-input", maxlength: 6, value: savedCode, placeholder: "MÃ LỚP", autocomplete: "off", autocapitalize: "characters", "aria-label": "Mã lớp" });
    inp.addEventListener("input", () => inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
    const go = async () => {
      code = inp.value.trim(); if (code.length < 4) return toast("Em nhập mã lớp cô cho nhé.");
      try { roster = await api.roster(code); } catch (e) { return toast(friendlyError(e), "bad"); }
      if (!roster.length) return toast("Không thấy lớp có mã này. Em xem lại nhé.", "bad");
      try { localStorage.setItem("kvtm-last-code", code); } catch {}
      stepWho();
    };
    inp.addEventListener("keydown", e => e.key === "Enter" && go());
    root.replaceChildren(card(h("div", { class: "center" }, tiNi(110), h("h1", {}, "Chào em đến Khu vườn trên mây!"), h("p", {}, "Nhập mã lớp cô giáo cho:"), inp,
      h("div", { class: "actions center" }, btn("Vào lớp ➜", go, "btn btn-main btn-big")),
      api.demo ? h("p", { class: "small muted" }, "Chế độ thử: mã lớp mẫu là ", h("b", {}, "MAY666")) : null)));
    setTimeout(() => inp.focus(), 50);
  }
  function stepWho() {
    root.replaceChildren(card(h("div", {}, h("h1", {}, `Lớp ${roster[0].class_name}`), h("p", {}, "Em bấm vào tên của mình:"),
      h("div", { class: "roster" }, roster.map(s => btn(s.name, () => { who = s; picks = []; stepPics(); }, "btn btn-name"))),
      h("div", { class: "actions" }, btn("⬅ Đổi mã lớp", stepCode, "btn btn-soft")))));
  }
  function stepPics() {
    const slots = h("div", { class: "slots" });
    const paint = () => slots.replaceChildren(...[0, 1, 2].map(i => h("div", { class: "slot" + (picks[i] ? " full" : "") }, picks[i] ? PIC[picks[i]].icon : i + 1)));
    const grid = h("div", { class: "pics" }, PICS.map(p => h("button", { class: "pic", "aria-label": p.name, onclick: async () => {
      if (picks.length >= 3) return; sound.play("bam"); picks.push(p.id); paint();
      if (picks.length === 3) {
        try { await api.login(code, who.id, picks); sound.resetForLogin(); await startStudent(); location.hash = "#/may"; }
        catch (e) { sound.play("sai"); toast(friendlyError(e), "bad"); picks = []; paint(); }
      }
    } }, h("span", { class: "pic-ic" }, p.icon), h("span", { class: "pic-name" }, p.name))));
    const demoHint = api.demo && api.demoPics(who.id) ? h("p", { class: "small muted" }, "Chế độ thử: hình của bạn này là ", api.demoPics(who.id).map(id => PIC[id].icon).join(" ")) : null;
    paint();
    root.replaceChildren(card(h("div", {}, h("h1", {}, `Chào ${who.name}!`), h("p", {}, "Bấm đúng 3 hình bí mật của em theo thứ tự:"), slots, grid, demoHint,
      h("div", { class: "actions" }, btn("⬅ Chọn lại tên", stepWho, "btn btn-soft"), btn("Xóa hình", () => { picks = []; paint(); }, "btn btn-soft")))));
  }
  const card = c => h("div", { class: "card login-card" }, c);
  stepCode();
  return h("div", { class: "page-login" }, h("a", { class: "back-home", href: "#/" }, "⬅ Trang đầu"), root);
}

// ------------------------------------------------------------------ bản đồ
export async function mapScreen() {
  const map = await loadMap();
  const zones = map.zones;
  const restored = z => z.file && [0, 1, 2].every(i => seedDone(z.id, "s" + (i + 1)));
  const svgNS = "http://www.w3.org/2000/svg";
  const bridges = document.createElementNS(svgNS, "svg");
  bridges.setAttribute("class", "bridges"); bridges.setAttribute("viewBox", "0 0 100 100"); bridges.setAttribute("preserveAspectRatio", "none");
  for (let i = 0; i < zones.length - 1; i++) {
    const a = zones[i], b = zones[i + 1];
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", `M${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 8} ${b.x} ${b.y}`);
    p.setAttribute("class", isOpen(a.id) && isOpen(b.id) ? "bridge on" : "bridge");
    bridges.append(p);
  }
  const islands = zones.map(z => {
    const open = isOpen(z.id), done = restored(z);
    const nDone = [1, 2, 3].filter(i => seedDone(z.id, "s" + i)).length;
    return h("button", {
      class: `island ${open ? "open" : "locked"} ${done ? "restored" : ""}`,
      style: { left: z.x + "%", top: z.y + "%" },
      "aria-label": `${z.zone}, Bài ${z.num}${open ? "" : ", chưa mở"}`,
      onclick: () => {
        if (!open) return toast("Khu này còn phủ sương. Đợi cô mở nhé! ☁️");
        location.hash = "#/khu/" + z.id;
      },
    },
      h("span", { class: "island-ic" }, open ? z.icon : "☁️"),
      h("span", { class: "island-name" }, z.zone),
      h("span", { class: "island-sub" }, `Bài ${z.num}` + (open && z.file ? ` · ${nDone}/3` : "")),
      done ? h("span", { class: "flowers", "aria-hidden": "true" }, "🌸🌼🌸") : null);
  });
  const weeds = unfixed().length;
  const tip = weeds ? `Vườn của em có ${weeds} bụi cỏ dại. Ra nhổ để nhận hạt mây nhé!` : totalSeeds() ? "Em đang có hạt mây. Ra Vườn Mây gieo đi!" : "Chọn một khu đã mở để học hạt giống kiến thức nhé!";
  const map2D = h("div", { class: "map" }, bridges, islands,
    h("div", { class: "map-guide" }, tiNi(56), h("div", { class: "bubble" }, tip)));
  if (!can3D() || mapScreen.no3D) return studentShell(h("div", { class: "map-page" }, map2D), "#/may");

  // Laptop: bản đồ 3D, chú cừu mây đi bộ tới từng khu. Lỗi gì thì quay về bản đồ 2D.
  const box = h("div", { class: "m3d" }, h("p", { class: "loading" }, "☁️ Đang dựng vương quốc 3D…"));
  const fallback = err => { console.warn("Không chạy được bản đồ 3D, dùng bản 2D", err); mapScreen.no3D = true; if (box.isConnected) box.replaceWith(map2D); };
  mountMap3D(box, {
    zones, isOpen, chatOn: ST.settings.chat !== false,
    me: { id: ST.profile.id, name: ST.profile.name, classId: ST.profile.classId || "lop", avatar: ST.state.avatar },
    onSaveAvatar: av => { ST.state.avatar = av; commit(); },
    doneOf: id => [1, 2, 3].filter(i => seedDone(id, "s" + i)).length,
    onEnter: id => { location.hash = "#/khu/" + id; },
    onFail: fallback,
  }).catch(fallback);
  return studentShell(h("div", { class: "map-page map-page-3d" }, box), "#/may");
}

// ------------------------------------------------------------------ một khu
export async function zoneScreen(id) {
  const map = await loadMap(); const z = map.zones.find(z => z.id === id);
  if (!z || !isOpen(id)) { location.hash = "#/may"; return h("div"); }
  const L = await loadLesson(id);
  if (!L) return studentShell(h("div", { class: "card center" }, h("div", { class: "big-ic" }, z.icon), h("h1", {}, z.zone), h("p", {}, `Bài ${z.num}. ${z.title}`),
    giotSuong(70), h("p", {}, "Cô Thợ Mây đang xây khu này. Em quay lại sau nhé!"), btn("⬅ Về bản đồ", () => location.hash = "#/may", "btn btn-soft")), "#/may");
  const w = unfixed().filter(w => w.lesson === id).length;
  const allDone = L.seeds.every(s => seedDone(id, s.id));
  return studentShell(h("div", { class: "zone" },
    h("div", { class: "zone-head card" + (allDone ? " restored" : "") },
      h("div", { class: "big-ic" }, z.icon),
      h("div", {}, h("h1", {}, z.zone), h("p", { class: "muted" }, `Bài ${z.num}. ${L.title}`), allDone ? h("p", { class: "ok-text" }, "🌈 Khu đã hồi sinh!") : null)),
    h("div", { class: "seed-list" }, L.seeds.map((s, i) => {
      const done = seedDone(id, s.id);
      return h("div", { class: "card seed-card" + (done ? " done" : "") },
        h("div", { class: "seed-num" }, done ? "🌸" : "🌰"),
        h("div", { class: "seed-info" }, h("b", {}, `Hạt ${i + 1}. ${s.title}`), h("span", { class: "small muted" }, done ? "Đã học xong · bấm để học lại" : "Khám phá → " + (L.experiment?.seed === s.id ? "Thí nghiệm → " : "") + "3 câu")),
        btn(done ? "Học lại" : "Học ➜", () => location.hash = `#/hat/${id}/${s.id}`, done ? "btn btn-soft" : "btn btn-main"));
    })),
    L.experiment ? h("div", { class: "card seed-card" }, h("div", { class: "seed-num" }, "⚗️"),
      h("div", { class: "seed-info" }, h("b", {}, "Phòng thí nghiệm mây"), h("span", { class: "small muted" }, L.experiment.title)),
      btn("Làm", () => location.hash = `#/thi-nghiem/${id}`, "btn btn-soft")) : null,
    w ? h("div", { class: "card guide-card" }, giotSuong(56), h("p", {}, `Bác Giọt Sương: "Vườn có ${w} bụi cỏ mọc từ bài này. Ra nhổ cùng bác nhé!"`), btn("Ra vườn", () => location.hash = "#/vuon", "btn btn-soft")) : null,
    btn("⬅ Về bản đồ", () => location.hash = "#/may", "btn btn-soft")), "#/may");
}

// ------------------------------------------------------------------ học một hạt giống
export async function seedScreen(lessonId, seedId) {
  if (!isOpen(lessonId)) { location.hash = "#/may"; return h("div"); }
  const L = await loadLesson(lessonId); const seed = L?.seeds.find(s => s.id === seedId);
  if (!seed) { location.hash = "#/may"; return h("div"); }
  const key = `${lessonId}/${seedId}`;
  const mode = seedDone(lessonId, seedId) ? "practice" : "seed";
  const steps = ["theory", ...(L.experiment?.seed === seedId ? ["exp"] : []), ...seed.questions.map((_, i) => "q" + i), "done"];
  let idx = 0, firstRight = 0;
  const body = h("div", { class: "card step-body" });
  const dots = h("div", { class: "dots" });

  function paintDots() { dots.replaceChildren(...steps.slice(0, -1).map((s, i) => h("span", { class: "dot-step" + (i < idx ? " past" : i === idx ? " now" : "") }, s === "theory" ? "📖" : s === "exp" ? "⚗️" : i))); }
  function next() { idx++; show(); }
  function show() {
    paintDots(); window.scrollTo({ top: 0 });
    const s = steps[idx];
    if (s === "theory") body.replaceChildren(theoryView(seed), h("div", { class: "actions" }, btn("Em hiểu rồi ➜", next, "btn btn-main")));
    else if (s === "exp") body.replaceChildren(experimentView(L.experiment, { onFinish: r => { addJournal(lessonId, L.experiment, r); body.append(h("div", { class: "actions" }, btn("Sang câu hỏi ➜", next, "btn btn-main"))); } }));
    else if (s.startsWith("q")) {
      const q = seed.questions[+s.slice(1)];
      body.replaceChildren(renderQuestion(q, {
        mode, label: `Câu ${+s.slice(1) + 1}/3`,
        onResult: r => {
          ST.logQ.push({ lesson: lessonId, seed: seedId, qid: q.id, kind: mode === "seed" ? "seed" : "practice", correct: r.correct, firstTry: r.attempt === 1, code: r.code || "" });
          if (mode === "seed" && r.attempt === 1) {
            if (r.correct) firstRight++;
            else spawnWeed(lessonId, seedId, q, r.code, L.misconceptions?.[r.code]?.label);
          }
          commit();
        },
        onDone: next,
      }));
    } else finish();
  }
  function finish() {
    let gained = 0;
    if (mode === "seed") {
      gained = 1 + (firstRight === seed.questions.length ? 1 : 0);
      ST.state.seeds[key] = { done: true, at: Date.now(), firstRight };
      ST.state.cloudSeeds[lessonId] = (ST.state.cloudSeeds[lessonId] || 0) + gained;
      commit(); flush();
    }
    const zoneDone = L.seeds.every(s => seedDone(lessonId, s.id));
    sound.play(zoneDone && mode === "seed" ? "reo" : "chuong");
    if (zoneDone && mode === "seed") rainbow();
    const newWeeds = unfixed().filter(w => w.lesson === lessonId && w.seed === seedId).length;
    body.replaceChildren(h("div", { class: "center" },
      tiNi(100), h("h1", {}, mode === "seed" ? "Hoàn thành hạt giống!" : "Học lại xong rồi!"),
      gained ? h("p", { class: "reward" }, `Em nhận được ${gained} hạt mây 🌰` + (gained > 1 ? " (thưởng vì đúng ngay cả 3 câu!)" : "")) : h("p", {}, "Học lại không nhận thêm hạt, nhưng giúp em nhớ lâu hơn."),
      zoneDone && mode === "seed" ? h("p", { class: "ok-text" }, "🌈 Cả khu đã hồi sinh! Hoa nở khắp đám mây rồi.") : null,
      newWeeds ? h("p", {}, `Có ${newWeeds} bụi cỏ dại mọc trong vườn từ chỗ em nhầm. Nhổ cỏ để hiểu chắc hơn nhé.`) : null,
      h("div", { class: "actions center" }, btn("🌱 Ra Vườn Mây", () => location.hash = "#/vuon", "btn btn-main"), btn("Về khu", () => location.hash = "#/khu/" + lessonId, "btn btn-soft"))));
    paintDots();
  }
  show();
  return studentShell(h("div", { class: "seed-page" },
    h("div", { class: "seed-top" }, h("a", { href: "#/khu/" + lessonId, class: "back" }, "⬅ " + L.zone), h("b", {}, seed.title), mode === "practice" ? h("span", { class: "tag" }, "Học lại") : null),
    dots, body), "#/may");
}

function addJournal(lesson, exp, r) {
  ST.state.journal.push({ lesson, exp: exp.id, title: exp.title, prediction: r.prediction, conclusion: r.conclusion, at: Date.now() });
  if (ST.state.journal.length > 60) ST.state.journal.shift();
  commit();
}

export async function experimentScreen(lessonId) {
  if (!isOpen(lessonId)) { location.hash = "#/may"; return h("div"); }
  const L = await loadLesson(lessonId);
  if (!L?.experiment) { location.hash = "#/khu/" + lessonId; return h("div"); }
  const body = h("div", { class: "card step-body" });
  body.append(experimentView(L.experiment, { onFinish: r => { addJournal(lessonId, L.experiment, r); toast("Đã ghi vào Nhật ký nhà khoa học 📒", "ok"); body.append(h("div", { class: "actions" }, btn("Về khu", () => location.hash = "#/khu/" + lessonId, "btn btn-soft"))); } }));
  return studentShell(h("div", {}, h("div", { class: "seed-top" }, h("a", { href: "#/khu/" + lessonId, class: "back" }, "⬅ " + L.zone), h("b", {}, "Phòng thí nghiệm mây")), body), "#/may");
}

// ------------------------------------------------------------------ Vườn Mây
export async function gardenScreen() {
  const map = await loadMap();
  const zoneOf = id => map.zones.find(z => z.id === id);
  const grid = h("div", { class: "garden" });
  const pouch = h("div", { class: "pouch" });
  const guide = h("div", { class: "bubble" });
  const prevStage = {};
  let ticker = null;

  function stageOf(p, i) {
    const nW = unfixed().filter(w => w.tile === i).length;
    const prog = (Date.now() - p.plantedAt) / (p.growMs * (1 + 0.15 * Math.min(2, nW)));
    return { prog: Math.min(1, prog), stage: prog >= 1 ? 3 : prog >= 0.6 ? 2 : prog >= 0.25 ? 1 : 0, slow: nW > 0 };
  }
  function paintPouch() {
    const entries = Object.entries(ST.state.cloudSeeds).filter(([, n]) => n > 0);
    pouch.replaceChildren(h("b", {}, "Túi hạt mây: "), ...(entries.length ? entries.map(([l, n]) => h("span", { class: "pill" }, `${zoneOf(l)?.icon || "🌰"} ${n}`)) : [h("span", { class: "muted" }, "chưa có hạt. Học một hạt giống kiến thức để nhận nhé!")]));
    const w = unfixed().length;
    guide.textContent = w ? `Có ${w} bụi cỏ dại. Bấm vào cỏ để nhổ: làm lại đúng câu từng nhầm là cỏ bay mất!` : "Vườn sạch cỏ rồi! Bấm ô trống để gieo hạt mây.";
  }
  function paint() {
    grid.replaceChildren();
    ST.state.garden.forEach((p, i) => {
      const tile = h("button", { class: "tile", "aria-label": `Ô ${i + 1}`, onclick: e => onTile(i, e) });
      if (p) {
        const { prog, stage, slow } = stageOf(p, i);
        if (prevStage[i] === 0 && stage === 1) { sound.play("mua"); const r = tile.getBoundingClientRect(); setTimeout(() => { const rr = grid.children[i]?.getBoundingClientRect(); rr && burst(rr.left + rr.width / 2, rr.top, "rain", 6); }, 0); }
        prevStage[i] = stage;
        tile.classList.add(stage === 3 ? "ready" : "growing");
        tile.append(h("span", { class: "plant", html: plantSvg(stage, zoneOf(p.lesson)?.icon || "") }));
        if (stage < 3) { const fill = h("span", { style: { width: Math.round(prog * 100) + "%" } }); tile._fill = fill; tile.append(h("span", { class: "grow-bar" + (slow ? " slow" : "") }, fill)); }
      }
      const ws = unfixed().filter(w => w.tile === i);
      if (ws.length) {
        const wrap = h("span", { class: "weeds" });
        ws.slice(0, 3).forEach(w => {
          const age = Date.now() - w.bornAt; const big = age > 86400000 ? 2 : age > 600000 ? 1 : 0;
          wrap.append(h("span", { class: "weed", role: "button", tabindex: "0", title: weedName(w.label), "aria-label": weedName(w.label),
            onclick: e => { e.stopPropagation(); pullWeed(w); }, html: weedSvg(26, big) }));
        });
        tile.append(wrap);
      }
      grid.append(tile);
    });
    paintPouch();
  }
  function onTile(i, e) {
    const p = ST.state.garden[i];
    if (p) {
      const { stage, prog } = stageOf(p, i);
      if (stage === 3) return harvest(i, e);
      const left = Math.ceil((1 - prog) * p.growMs / 1000);
      return toast(`Cây đang lớn, còn khoảng ${left} giây nữa.` + (unfixed().some(w => w.tile === i) ? " Cỏ dại che nắng nên cây lớn chậm hơn." : ""));
    }
    const entries = Object.entries(ST.state.cloudSeeds).filter(([, n]) => n > 0);
    if (!entries.length) return toast("Em chưa có hạt mây. Học một hạt giống kiến thức để nhận nhé!");
    if (entries.length === 1) return plant(i, entries[0][0], e);
    const m = modal(h("div", {}, h("h2", {}, "Gieo hạt của khu nào?"),
      h("div", { class: "opts" }, entries.map(([l, n]) => btn(`${zoneOf(l).icon} ${zoneOf(l).zone} (${n} hạt)`, () => { m.close(); plant(i, l, e); }, "opt")))));
  }
  function plant(i, lesson, e) {
    ST.state.cloudSeeds[lesson]--;
    ST.state.garden[i] = { lesson, plantedAt: Date.now(), growMs: growMs() };
    prevStage[i] = 0; sound.play("tach"); e && burst(e.clientX, e.clientY, "seed", 5); commit(); paint();
  }
  async function harvest(i, e) {
    const p = ST.state.garden[i]; const z = zoneOf(p.lesson);
    const got = shuffle(z.materials).slice(0, 2);
    got.forEach(m => ST.state.inventory[m] = (ST.state.inventory[m] || 0) + 1);
    ST.state.garden[i] = null; delete prevStage[i];
    let card = null;
    const L = await loadLesson(p.lesson);
    if (L) {
      const s = L.seeds.find(s => seedDone(p.lesson, s.id) && !ST.state.notebook.includes(`${p.lesson}/${s.id}`));
      if (s) { ST.state.notebook.push(`${p.lesson}/${s.id}`); card = s; }
    }
    commit(); sound.play("thuhoach"); e && burst(e.clientX, e.clientY, "star", 8); paint();
    const names = got.map(m => `${map.materials[m].icon} ${map.materials[m].name}`).join(", ");
    if (card) modal(h("div", { class: "center" }, h("h2", {}, "Thu hoạch!"), h("p", {}, "Em nhận được: " + names),
      h("div", { class: "notecard fly" }, h("b", {}, "📒 Thẻ mới bay vào Sổ tay"), h("p", {}, h("b", {}, card.title + ": "), card.theory.card))));
    else toast("Thu hoạch: " + names, "ok");
  }
  async function pullWeed(w) {
    const L = await loadLesson(w.lesson); const seed = L?.seeds.find(s => s.id === w.seed);
    const q = seed?.questions.find(q => `${w.lesson}/${w.seed}/${q.id}` === w.qid);
    if (!q) { w.fixed = true; commit(); paint(); return; }
    let pos = null;
    const m = modal(h("div", {},
      h("div", { class: "weed-head" }, h("span", { html: weedSvg(48, 1) }), h("div", {}, h("b", {}, weedName(w.label || L.misconceptions?.[w.code]?.label)), h("p", { class: "small muted" }, "Làm lại đúng câu này để nhổ cỏ nhé."))),
      renderQuestion(q, {
        mode: "weed", theory: theoryView(seed),
        onResult: r => {
          ST.logQ.push({ lesson: w.lesson, seed: w.seed, qid: q.id, kind: "weed", correct: r.correct, firstTry: r.attempt === 1, code: r.code || "" });
          if (r.correct) {
            w.fixed = true; w.fixedAt = Date.now();
            ST.state.cloudSeeds[w.lesson] = (ST.state.cloudSeeds[w.lesson] || 0) + 1;
            sound.play("bup"); const b = m.box.getBoundingClientRect(); burst(b.left + b.width / 2, b.top + 60, "bubble", 10);
            toast("Bụp! Cỏ biến thành bong bóng bay lên trời. +1 hạt mây 🌰", "ok");
            flush(); return;
          }
          commit();
        },
        onDone: () => m.close(),
      })), { wide: true, onClose: paint });
  }

  paint();
  // Mỗi giây: chỉ cập nhật thanh lớn; khi cây chuyển giai đoạn mới vẽ lại cả vườn
  ticker = setInterval(() => {
    if (!document.body.contains(grid)) return clearInterval(ticker);
    if (document.querySelector(".modal-back")) return;
    let changed = false;
    ST.state.garden.forEach((p, i) => {
      if (!p) return; const { prog, stage } = stageOf(p, i);
      if (stage !== prevStage[i]) changed = true; else if (grid.children[i]?._fill) grid.children[i]._fill.style.width = Math.round(prog * 100) + "%";
    });
    if (changed) paint();
  }, 1000);
  return studentShell(h("div", { class: "garden-page" },
    h("div", { class: "garden-head" }, giotSuong(54), guide),
    pouch,
    h("div", { class: "garden-cloud" },
      h("div", { class: "decor decor-l", "aria-hidden": "true" }, h("span", { title: "Giếng mưa" }, "⛲"), h("span", { title: "Nhà kính" }, "🏡")),
      grid,
      h("div", { class: "decor decor-r", "aria-hidden": "true" }, h("span", { class: "dog", title: "Chú chó mây canh vườn" }, "🐶"), h("span", {}, "🦋"))),
    h("p", { class: "small muted center" }, "Gieo hạt → nảy mầm → cây non → cây lớn. Cây lớn thì bấm để thu hoạch.")), "#/vuon");
}

// ------------------------------------------------------------------ Sổ tay
export async function notebookScreen() {
  const map = await loadMap();
  const tabs = [["the", "📒 Thẻ lý thuyết"], ["tui", "🎒 Nguyên liệu"], ["nhat-ky", "⚗️ Nhật ký"], ["co", "🫧 Đã tự sửa"]];
  let cur = "the";
  const body = h("div", { class: "card" });
  const bar = h("div", { class: "tabs" });
  async function paint() {
    bar.replaceChildren(...tabs.map(([k, t]) => h("button", { class: "tab" + (k === cur ? " on" : ""), onclick: () => { cur = k; paint(); } }, t)));
    if (cur === "the") {
      const cards = [];
      for (const key of ST.state.notebook) {
        const [l, s] = key.split("/"); const L = await loadLesson(l); const seed = L?.seeds.find(x => x.id === s);
        if (seed) cards.push(h("div", { class: "notecard" }, h("span", { class: "small muted" }, L.zone), h("b", {}, seed.title), h("p", {}, seed.theory.card)));
      }
      body.replaceChildren(cards.length ? h("div", { class: "notegrid" }, cards) : h("p", { class: "muted" }, "Chưa có thẻ nào. Thẻ lý thuyết bay vào đây khi em thu hoạch cây trong Vườn Mây."));
    } else if (cur === "tui") {
      const items = Object.entries(ST.state.inventory).filter(([, n]) => n > 0);
      body.replaceChildren(items.length ? h("div", { class: "inv" }, items.map(([k, n]) => { const m = map.materials[k] || { icon: "❔", name: k, note: "" };
        return h("div", { class: "inv-item" }, h("span", { class: "inv-ic" }, m.icon), h("b", {}, `${m.name} × ${n}`), h("span", { class: "small muted" }, m.note)); }))
        : h("p", { class: "muted" }, "Túi còn trống. Thu hoạch cây để nhận nguyên liệu nhé."),
        h("p", { class: "small muted" }, "Lò Mây và Xây nhà sẽ mở ở giai đoạn sau: nguyên liệu em gom bây giờ vẫn được giữ."));
    } else if (cur === "nhat-ky") {
      const j = ST.state.journal.slice().reverse();
      body.replaceChildren(...(j.length ? j.map(e => h("div", { class: "journal" }, h("b", {}, e.title), h("span", { class: "small muted" }, " · " + new Date(e.at).toLocaleDateString("vi-VN")),
        h("p", {}, h("i", {}, "Dự đoán: "), e.prediction || "–"), h("p", {}, h("i", {}, "Kết luận: "), e.conclusion || "–"))) : [h("p", { class: "muted" }, "Chưa có trang nhật ký nào. Làm thí nghiệm ảo để ghi nhé.")]));
    } else {
      const f = ST.state.weeds.filter(w => w.fixed).reverse();
      body.replaceChildren(f.length ? h("ul", { class: "fixed-list" }, f.map(w => h("li", {}, "🫧 ", weedName(w.label), h("span", { class: "small muted" }, " · đã tự sửa")))) : h("p", { class: "muted" }, "Khi em nhổ được cỏ dại, nó sẽ hiện ở đây với dấu \"Đã tự sửa\"."));
    }
  }
  await paint();
  return studentShell(h("div", {}, h("h1", { class: "page-title" }, "Sổ tay của " + ST.profile.name), bar, body), "#/so-tay");
}
