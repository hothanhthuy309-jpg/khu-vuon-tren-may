// Lò Mây (nguyên liệu → vật liệu) và Xây nhà cho cư dân mây (Giai đoạn 4)
import { h, btn, toast, modal, tiNi, burst, rainbow } from "./ui.js";
import { sound } from "./sound.js";
import { loadMap } from "./content.js";
import { sheet, say } from "./shell.js";
import { ST, commit, flush, totalSeeds, isOpen, have, take, give, addSeeds } from "./student.js";

let WS = null;
export const loadWorkshop = async () => (WS ||= await fetch("data/workshop.json", { cache: "no-cache" }).then(r => r.json()));
const fmtNeed = (need, M) => Object.entries(need).map(([k, n]) => `${M[k]?.icon || ""} ${M[k]?.name || k} ×${n}`).join(" + ");

// Câu hỏi nhỏ của Tí Nị trước khi chạy lò / khi chọn sai vật liệu
function tiNiQuiz(q, onRight) {
  let tries = 0;
  const fb = h("div", { class: "feedback" });
  const opts = q.options.map((o, i) => h("button", { class: "opt", onclick: () => {
    tries++;
    if (i === q.answer) { sound.play("ting"); opts.forEach(b => b.disabled = true); opts[i].classList.add("ok"); fb.className = "feedback fb-ok"; fb.replaceChildren(h("b", {}, "Đúng rồi! "), q.explain);
      fb.append(h("div", { class: "actions" }, btn("Tiếp tục ➜", () => { m.close(); onRight(); }, "btn btn-main"))); }
    else { sound.play("sai"); opts[i].classList.add("bad"); fb.className = "feedback fb-bad"; fb.replaceChildren(h("b", {}, "Chưa đúng. "), tries >= 2 ? q.explain : "Em nghĩ thêm chút nữa nhé, không mất gì đâu!"); }
  } }, o));
  const m = modal(h("div", {}, h("div", { class: "fb-head" }, tiNi(56, "nghi"), h("h2", { style: { margin: 0 } }, "Tí Nị hỏi nhỏ")), h("p", { class: "q-prompt" }, q.prompt), h("div", { class: "opts" }, opts), fb), { wide: true });
}

// ================================================================== Lò Mây
export async function kilnScreen() {
  const [W, map] = await Promise.all([loadWorkshop(), loadMap()]); const M = map.materials;
  sound.setMood("lab");
  let sel = W.recipes[0], fuel = null;
  const list = h("div", { class: "recipes" }), kiln = h("div", { class: "kiln" });
  const fuels = () => W.fuels.filter(f => (ST.state.inventory[f] || 0) > 0);
  function paintList() {
    list.replaceChildren(...W.recipes.map(r => {
      const ok = have(r.in);
      return h("button", { class: "recipe" + (r === sel ? " on" : "") + (ok ? "" : " lack"), onclick: () => { sel = r; sound.play("bam"); paintList(); paintKiln(); } },
        h("b", {}, r.name),
        h("div", { class: "recipe-io" }, ...Object.entries(r.in).map(([k, n]) => h("span", {}, `${M[k].icon} ×${n} `, h("span", { class: "have" + ((ST.state.inventory[k] || 0) >= n ? "" : " no") }, `có ${ST.state.inventory[k] || 0}`))),
          h("span", { class: "arrow" }, " ➜ "), ...Object.entries(r.out).map(([k, n]) => h("span", {}, `${M[k].icon} ${M[k].name} ×${n}`))),
        h("span", { class: "small muted" }, r.fire ? "🔥 Cần nung · " : "🪚 Không cần lửa · ", "nguyên liệu từ ", r.from));
    }));
  }
  const art = (on) => `<svg viewBox="0 0 220 210" aria-hidden="true"><rect x="40" y="40" width="140" height="150" rx="40" fill="#c9b8a6"/><rect x="40" y="40" width="140" height="150" rx="40" fill="url(#kb)"/>
    <defs><linearGradient id="kb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8d9c8"/><stop offset="1" stop-color="#a99582"/></linearGradient><radialGradient id="kf"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ffae3a"/><stop offset="1" stop-color="#ff5a2a"/></radialGradient></defs>
    <rect x="96" y="6" width="28" height="40" rx="6" fill="#a99582"/>${on ? `<g class="smoke"><circle cx="110" cy="0" r="10"/><circle cx="118" cy="-14" r="12"/></g>` : ""}
    <path d="M70 190 v-50 a40 40 0 0 1 80 0 v50z" fill="#3b2a2a"/>${on ? `<ellipse cx="110" cy="168" rx="34" ry="22" fill="url(#kf)" class="flame-live"/><path d="M110 176 q-22 -26 0 -54 q22 28 0 54z" fill="#ffd23f" class="flame"/>` : `<ellipse cx="110" cy="176" rx="26" ry="8" fill="#5a4040"/>`}</svg>`;
  let tm = null;
  function paintKiln() {
    clearInterval(tm);
    const job = ST.state.kiln;
    if (job) {
      const r = W.recipes.find(x => x.id === job.recipe), left = Math.max(0, Math.ceil((job.start + job.ms - Date.now()) / 1000));
      const timer = h("div", { class: "timer" }, left ? `${left} giây` : "Xong!");
      const take2 = btn("🎁 Lấy sản phẩm", () => { give(r.out); ST.state.kiln = null; commit(); flush(); sound.play("thuhoach"); const b = take2.getBoundingClientRect(); burst(b.left + b.width / 2, b.top, "star", 10);
        toast("Nhận được " + fmtNeed(r.out, M), "ok"); say("Vật liệu mới đã vào túi đồ. Mang sang Công trường để xây nhà nhé!"); paintList(); paintKiln(); }, "btn btn-main btn-big");
      take2.disabled = left > 0;
      kiln.replaceChildren(h("h3", {}, "Lò đang " + (r.fire ? "nung" : "làm") + ": " + r.name), h("div", { class: "kiln-art", html: art(left > 0) }), timer, h("p", { class: "small" }, job.fuel ? `Nhiên liệu: ${M[job.fuel].name}` : "Chạy bằng nắng mây (chậm hơn)"), take2);
      if (left > 0) tm = setInterval(() => { if (!document.body.contains(kiln)) return clearInterval(tm); const l = Math.max(0, Math.ceil((job.start + job.ms - Date.now()) / 1000)); timer.textContent = l ? `${l} giây` : "Xong!"; if (!l) { clearInterval(tm); sound.play("chuong"); paintKiln(); } }, 500);
      return;
    }
    const fl = fuels(); if (fuel && !fl.includes(fuel)) fuel = null;
    const fuelBtns = sel.fire ? [...fl.map(f => h("button", { class: "chip" + (fuel === f ? " on" : ""), onclick: () => { fuel = f; paintKiln(); } }, `${M[f].icon} ${M[f].name} (${ST.state.inventory[f]})`)),
      h("button", { class: "chip" + (!fuel ? " on" : ""), onclick: () => { fuel = null; paintKiln(); } }, "☀️ Nắng mây (chậm ×3)")] : [];
    const ok = have(sel.in);
    const startBtn = btn(sel.fire ? "🔥 Bật lò" : "🪚 Bắt đầu", () => {
      if (!have(sel.in)) return toast("Chưa đủ nguyên liệu. Thu hoạch thêm ở " + sel.from + " nhé.");
      tiNiQuiz(sel.q, () => {
        take(sel.in); if (sel.fire && fuel) take({ [fuel]: 1 });
        ST.state.kiln = { recipe: sel.id, start: Date.now(), ms: sel.seconds * 1000 * (sel.fire && !fuel ? 3 : 1), fuel: sel.fire ? fuel : null };
        commit(); flush(); sound.play("xeo"); paintList(); paintKiln();
      });
    }, "btn btn-main btn-big"); startBtn.disabled = !ok;
    kiln.replaceChildren(h("h3", {}, sel.name), h("div", { class: "kiln-art", html: art(false) }),
      h("div", { class: "recipe-io", style: { justifyContent: "center" } }, fmtNeed(sel.in, M), h("span", {}, " ➜ "), fmtNeed(sel.out, M)),
      sel.fire ? h("div", {}, h("p", { class: "small" }, "Chọn nhiên liệu (Nắng mây luôn có; than, củi, gas thu hoạch ở Vườn Mây):"), h("div", { class: "fuel-pick" }, fuelBtns)) : null,
      startBtn, ok ? null : h("p", { class: "lab-note" }, "Chưa đủ nguyên liệu: gieo và thu hoạch hạt mây (từ Bài 9 trở đi) trong Vườn Mây nhé."));
  }
  paintList(); paintKiln();
  return sheet({ title: "Lò Mây", sub: "Nguyên liệu → vật liệu · mỗi mẻ Tí Nị hỏi một câu nhỏ", icon: "🔥", style: "kiln", seeds: totalSeeds() },
    h("div", { class: "kiln-grid" }, h("div", {}, h("h2", {}, "Công thức"), list), kiln));
}

// ================================================================== Xây nhà
const MAT_COLOR = { gach: "#d0674a", go_tam: "#c99a6b", xi_mang: "#b8bcc8", thep: "#8e9bb5", gom: "#d96f45", thuy_tinh: "#bfe8ff", nhua: "#7cc8ff", cao_su_tam: "#3b2a4a" };
const PART_IC = { mong: "🧱", tuong: "🏠", mai: "🛖", cua_so: "🪟", cua: "🚪", loi_day: "⚡", vo_day: "🚰" };
export function houseSvg(parts, resident = "🐑") {
  const c = k => MAT_COLOR[parts[k]] || null, dash = 'fill="none" stroke="#9c8cc7" stroke-width="3" stroke-dasharray="8 7"';
  const lit = parts.loi_day && parts.vo_day;
  return `<svg viewBox="0 0 400 320" aria-hidden="true">
    <circle cx="340" cy="56" r="30" fill="#fff3b0"/><g fill="#fff" opacity=".9"><ellipse cx="70" cy="50" rx="40" ry="14"/><ellipse cx="96" cy="40" rx="26" ry="16"/></g>
    ${c("mong") ? `<rect x="70" y="250" width="260" height="24" rx="6" fill="${c("mong")}"/>${parts.mong === "gach" ? brick(70, 250, 260, 24) : ""}` : `<rect x="70" y="250" width="260" height="24" rx="6" ${dash}/>`}
    ${c("tuong") ? `<rect x="90" y="140" width="220" height="110" fill="${c("tuong")}"/>${parts.tuong === "gach" ? brick(90, 140, 220, 110) : parts.tuong === "go_tam" ? `<g stroke="#a7764c" stroke-width="2">${[0, 1, 2, 3, 4].map(i => `<line x1="90" x2="310" y1="${160 + i * 20}" y2="${160 + i * 20}"/>`).join("")}</g>` : ""}` : `<rect x="90" y="140" width="220" height="110" ${dash}/>`}
    ${c("mai") ? `<path d="M70 146 L200 60 L330 146z" fill="${c("mai")}"/>${parts.mai === "gom" ? `<g stroke="#a94e2e" stroke-width="2" fill="none">${[0, 1, 2, 3].map(i => `<path d="M${100 + i * 8} ${130 - i * 18} L${300 - i * 8} ${130 - i * 18}"/>`).join("")}</g>` : ""}` : `<path d="M70 146 L200 60 L330 146z" ${dash}/>`}
    ${c("cua_so") ? `<g><rect x="112" y="166" width="54" height="46" rx="6" fill="${c("cua_so")}" stroke="#fff" stroke-width="5"/><rect x="236" y="166" width="54" height="46" rx="6" fill="${c("cua_so")}" stroke="#fff" stroke-width="5"/>${lit ? `<rect x="112" y="166" width="54" height="46" rx="6" fill="#ffe680" opacity=".75"/><rect x="236" y="166" width="54" height="46" rx="6" fill="#ffe680" opacity=".75"/>` : ""}</g>` : `<rect x="112" y="166" width="54" height="46" rx="6" ${dash}/><rect x="236" y="166" width="54" height="46" rx="6" ${dash}/>`}
    ${c("cua") ? `<rect x="180" y="180" width="44" height="70" rx="10" fill="${c("cua")}"/><circle cx="214" cy="218" r="4" fill="#ffd23f"/>` : `<rect x="180" y="180" width="44" height="70" rx="10" ${dash}/>`}
    ${c("loi_day") ? `<path d="M310 150 h40 v-80" stroke="${c("loi_day")}" stroke-width="5" fill="none"/>` : `<path d="M310 150 h40 v-80" ${dash}/>`}
    ${c("vo_day") ? `<path d="M310 150 h40 v-80" stroke="${c("vo_day")}" stroke-width="11" fill="none" opacity=".55"/><path d="M90 236 h-30 v38" stroke="${c("vo_day")}" stroke-width="9" fill="none"/>` : `<path d="M90 236 h-30 v38" ${dash}/>`}
    ${lit ? `<circle cx="350" cy="66" r="12" fill="#ffe680"/><circle cx="350" cy="66" r="24" fill="#ffe680" opacity=".35"/>` : ""}
    <text x="40" y="300" font-size="40">${resident}</text></svg>`;
}
function brick(x, y, w, ht) { let s = `<g stroke="#a94e3a" stroke-width="1.5" opacity=".7">`; for (let r = 0; r * 12 < ht; r++) { s += `<line x1="${x}" x2="${x + w}" y1="${y + r * 12}" y2="${y + r * 12}"/>`; for (let k = (r % 2) * 14; k < w; k += 28) s += `<line x1="${x + k}" x2="${x + k}" y1="${y + r * 12}" y2="${y + Math.min(ht, r * 12 + 12)}"/>`; } return s + "</g>"; }
const RES_IC = { cuu: "🐑", tho: "🐰", meo: "🐱" };

export async function buildScreen() {
  const [W, map] = await Promise.all([loadWorkshop(), loadMap()]); const M = map.materials;
  sound.setMood("garden");
  const fullOpen = true;
  const orders = W.orders.filter(o => o.simple || fullOpen);
  const body = h("div", {});
  let part = null;
  function choose() {
    const res = W.residents[ST.state.houses.length % W.residents.length];
    body.replaceChildren(h("div", { class: "grid-2" }, orders.map(o => h("div", { class: "card" },
      h("div", { class: "resident" }, h("span", { class: "r-ic" }, RES_IC[res.id]), h("div", {}, h("b", {}, res.name), h("p", { class: "small", style: { margin: 0 } }, `"${res.say}"`))),
      h("h2", {}, o.title), h("p", { class: "small muted" }, o.parts.map(p => W.parts[p].name).join(" · ")),
      btn("Nhận đơn này ➜", () => { ST.state.order = { id: o.id, resident: res.id, parts: {} }; commit(); part = null; paint(); }, "btn btn-main")))),
      fullOpen ? null : h("p", { class: "lab-note" }, "Khi cô mở cả Bài 12 và Bài 13, sẽ có đơn nhà đầy đủ tiện nghi (có cửa sổ kính, điện và nước)."),
      ST.state.houses.length ? h("div", { class: "card" }, h("h3", {}, `Nhà em đã xây (${ST.state.houses.length})`), h("div", { class: "houses-row" }, ST.state.houses.map(hs => h("div", { style: { width: "200px" }, html: houseSvg(hs.parts, RES_IC[hs.resident]) })))) : null);
  }
  function paint() {
    const od = ST.state.order; if (!od) return choose();
    const o = W.orders.find(x => x.id === od.id), res = W.residents.find(r => r.id === od.resident);
    const doneAll = o.parts.every(p => od.parts[p]);
    const stage = h("div", { class: "house-stage", html: houseSvg(od.parts, RES_IC[res.id]) });
    const plist = h("div", { class: "part-list" }, o.parts.map(p => h("button", { class: "part" + (od.parts[p] ? " done" : "") + (part === p ? " on" : ""), onclick: () => { part = p; sound.play("bam"); paint(); } },
      h("span", { class: "p-ic" }, PART_IC[p]), h("span", {}, h("b", {}, W.parts[p].name), h("small", {}, od.parts[p] ? "✓ " + M[od.parts[p]].name : "Cần: " + W.parts[p].need)))));
    let picker = null;
    if (part && !od.parts[part]) {
      const mats = Object.keys(MAT_COLOR).filter(k => (ST.state.inventory[k] || 0) > 0);
      picker = h("div", { class: "card" }, h("h3", {}, "Chọn vật liệu cho " + W.parts[part].name.toLowerCase()), h("p", { class: "small muted" }, "Cần: " + W.parts[part].need),
        mats.length ? h("div", { class: "mat-pick" }, mats.map(k => h("button", { class: "mat", onclick: () => place(part, k) }, h("span", { class: "m-ic" }, M[k].icon), M[k].name, h("small", {}, `có ${ST.state.inventory[k]} · ${M[k].note}`))))
          : h("p", { class: "lab-note" }, "Túi chưa có vật liệu. Ghé Lò Mây để nung gạch, thủy tinh, thép… từ nguyên liệu thu hoạch nhé!"),
        h("div", { class: "actions" }, btn("🔥 Sang Lò Mây", () => location.hash = "#/lo-may", "btn btn-soft")));
    }
    body.replaceChildren(h("div", { class: "build-grid" },
      h("div", {}, stage, h("div", { class: "resident", style: { marginTop: "14px" } }, h("span", { class: "r-ic" }, RES_IC[res.id]), h("div", {}, h("b", {}, res.name), h("p", { class: "small", style: { margin: 0 } }, `"${res.say}"`)))),
      h("div", {}, h("h2", {}, o.title), plist, picker, doneAll ? btn("🏡 Hoàn thành ngôi nhà!", finish, "btn btn-mint btn-big") : null,
        h("div", { class: "actions" }, btn("Hủy đơn", () => { ST.state.order = null; commit(); paint(); }, "btn btn-soft btn-tiny")))));
  }
  function place(p, mat) {
    const def = W.parts[p];
    if (def.ok.includes(mat)) {
      take({ [mat]: 1 }); ST.state.order.parts[p] = mat; commit(); sound.play("chuong");
      say(`Tuyệt! ${M[mat].name[0].toUpperCase() + M[mat].name.slice(1)} rất hợp làm ${def.name.toLowerCase()}: ${def.need}.`); part = null; paint();
    } else {
      sound.play("sai");
      const q = def.ask[mat] || `${M[mat].name} có ${def.need} không nhỉ?`;
      say(q, 9000);
      modal(h("div", {}, h("div", { class: "fb-head" }, tiNi(56, "nghi"), h("h2", { style: { margin: 0 } }, "Tí Nị hỏi ngược")), h("p", { class: "q-prompt" }, q),
        h("p", { class: "small muted" }, `${W.parts[p].name} cần: ${def.need}. Em chọn lại nhé, không mất vật liệu đâu!`)));
    }
  }
  function finish() {
    const od = ST.state.order;
    ST.state.houses.push({ order: od.id, resident: od.resident, parts: od.parts, at: Date.now() });
    ST.state.order = null; addSeeds("bai-12", 3); commit(); flush();
    sound.play("reo"); rainbow();
    modal(h("div", { class: "center" }, h("h1", {}, "Nhà xây xong rồi!"), h("div", { style: { maxWidth: "380px", margin: "0 auto" }, html: houseSvg(od.parts, RES_IC[od.resident]) }),
      h("p", { class: "lead" }, "Cư dân mây chuyển vào ở rồi. Em nhận 3 hạt mây và ngôi nhà sẽ đứng trên đảo trung tâm của vương quốc!")));
    paint();
  }
  paint();
  return sheet({ title: "Công trường Xây nhà", sub: "Chọn đúng vật liệu theo tính chất cho từng bộ phận", icon: "🏡", style: "build", seeds: totalSeeds() }, body);
}
