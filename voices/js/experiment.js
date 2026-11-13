// Phòng thí nghiệm mây: mỗi thí nghiệm đi 3 bước Dự đoán → Làm → Kết luận.
// Phần "Làm" là một mô phỏng tương tác (LABS[exp.lab]). Không tính vào số liệu kiểm tra.
import { h, btn, tiNi, reducedMotion } from "./ui.js";
import { sound } from "./sound.js";
import { bench3d } from "./lab3d.js";

const svgEl = (html, cls = "lab-svg") => { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; return d; };
const wait = ms => new Promise(r => setTimeout(r, reducedMotion() ? Math.min(ms, 120) : ms));
const anim = (dur, f) => new Promise(res => {
  if (reducedMotion()) { f(1); return res(); }
  const t0 = performance.now();
  const step = now => { const k = Math.min(1, (now - t0) / dur); f(k); k < 1 ? requestAnimationFrame(step) : res(); };
  requestAnimationFrame(step);
});
const note = (text, kind = "") => h("div", { class: "lab-note " + kind }, text);

// ===================================================================== khung chung
export function experimentView(exp, { onFinish }) {
  const root = h("div", { class: "exp" });
  let prediction = null;
  const steps = i => h("ol", { class: "steps" }, ["Dự đoán", "Làm", "Kết luận"].map((s, k) => h("li", { class: k === i ? "now" : k < i ? "past" : "" }, h("b", {}, k + 1), s)));

  function stepPredict() {
    const opts = exp.predict.options.map((o, i) => h("button", { class: "opt", onclick: () => { sound.play("bam"); prediction = i; opts.forEach((b, k) => b.classList.toggle("on", k === i)); go.disabled = false; } }, o));
    const go = btn("Bắt đầu làm ➜", stepDo, "btn btn-main"); go.disabled = true;
    root.replaceChildren(steps(0), h("h2", { class: "exp-title" }, exp.title), h("p", { class: "lead" }, exp.intro),
      h("div", { class: "exp-q" }, h("h3", {}, "Em dự đoán"), h("p", {}, exp.predict.prompt), h("div", { class: "opts" }, opts)), h("div", { class: "actions" }, go));
  }
  function stepDo() {
    const next = btn("Kết luận ➜", stepConclude, "btn btn-main"); next.disabled = true;
    const lab = (LABS[exp.lab] || LABS["dun-nuoc-da"])(() => { next.disabled = false; });
    root.replaceChildren(steps(1), h("h2", { class: "exp-title" }, exp.title), lab, h("div", { class: "actions" }, next));
  }
  function stepConclude() {
    let pick = null;
    const opts = exp.conclude.options.map((o, i) => h("button", { class: "opt", onclick: () => { sound.play("bam"); pick = i; opts.forEach((b, k) => b.classList.toggle("on", k === i)); } }, o));
    const ta = h("textarea", { rows: 3, maxlength: 400, placeholder: "Em quan sát thấy… nên em kết luận…" });
    const out = h("div", {});
    const done = btn("Ghi vào Nhật ký nhà khoa học ➜", () => {
      const text = ta.value.trim(), low = text.toLowerCase();
      const kw = exp.conclude.keywords.some(k => low.includes(k.toLowerCase()));
      const crit = [
        ["Dựa vào điều quan sát hoặc số liệu", /\d/.test(text) || kw],
        ["Nêu đúng hiện tượng chính", (pick != null && exp.conclude.good.includes(pick)) || kw],
        ["Viết bằng lời của em", text.length >= 15],
      ];
      const predRight = prediction === exp.predict.answer;
      out.replaceChildren(h("div", { class: "feedback fb-info" },
        h("div", { class: "fb-head" }, tiNi(46), h("b", {}, "Tí Nị nhận xét")),
        h("p", {}, predRight ? "Em dự đoán đúng ngay từ đầu, giỏi quá!" : "Dự đoán ban đầu khác kết quả, không sao cả: nhà khoa học cũng sửa dự đoán sau khi làm thí nghiệm."),
        h("ul", { class: "crit" }, crit.map(([t, ok]) => h("li", { class: ok ? "yes" : "no" }, (ok ? "✅ " : "🌱 ") + t))),
        crit.every(c => c[1]) ? h("p", { class: "ok-text" }, "Nhật ký của em rất đầy đủ!") : h("p", { class: "small" }, "Lần sau em viết thêm cho đủ cả ba ý nhé.")));
      sound.play("chuong");
      onFinish && onFinish({ prediction: exp.predict.options[prediction], conclusion: (pick != null ? exp.conclude.options[pick] + " " : "") + text });
      done.remove();
    }, "btn btn-main");
    root.replaceChildren(steps(2), h("h2", { class: "exp-title" }, "Kết luận"), h("p", {}, exp.conclude.prompt), h("div", { class: "opts" }, opts),
      h("label", { class: "lbl-block" }, "Lời của em", ta), h("div", { class: "actions" }, done), out);
  }
  stepPredict();
  return root;
}

// ===================================================================== các thí nghiệm
export const LABS = {};

// ---------- Bài 10: đun nước đá ----------
LABS["dun-nuoc-da"] = ready => {
  const V = bench3d("dun-nuoc-da");
  const tempAt = t => t < 0.15 ? -10 + t / 0.15 * 10 : t < 0.45 ? 0 : t < 0.8 ? (t - 0.45) / 0.35 * 100 : 100;
  const phaseAt = t => t < 0.15 ? "Nước đá đang ấm dần lên" : t < 0.45 ? "Nước đá đang tan: nhiệt độ đứng yên!" : t < 0.8 ? "Nước lỏng đang nóng lên" : "Nước đang sôi: nhiệt độ lại đứng yên";
  const W = 360, H = 220, pad = 48, X = t => pad + t * (W - pad - 12), Y = c => H - 26 - (c + 10) / 110 * (H - 44);
  const graph = svgEl(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Đồ thị nhiệt độ theo thời gian">
    <rect x="${pad}" y="${Y(0) - 6}" width="0" height="12" class="g-band" id="band0"/>
    ${[0, 50, 100].map(c => `<line x1="${pad}" x2="${W - 8}" y1="${Y(c)}" y2="${Y(c)}" class="g-grid"/><text x="${pad - 8}" y="${Y(c) + 4}" text-anchor="end" class="g-lbl">${c}°C</text>`).join("")}
    <line x1="${pad}" y1="${Y(-10)}" x2="${W - 8}" y2="${Y(-10)}" class="g-axis"/><line x1="${pad}" y1="${Y(-10)}" x2="${pad}" y2="10" class="g-axis"/>
    <text x="${W - 10}" y="${H - 6}" text-anchor="end" class="g-lbl">thời gian ➜</text>
    <polyline id="curve" class="g-curve" points=""/><circle id="dot" r="6" class="g-dot" cx="${X(0)}" cy="${Y(-10)}"/></svg>`, "lab-graph");
  const rig = svgEl(`<svg viewBox="0 0 200 240" aria-hidden="true">
    <rect x="140" y="20" width="16" height="150" rx="8" class="thermo-glass"/><rect id="merc" x="144" y="120" width="8" height="46" rx="4" class="thermo-red"/><circle cx="148" cy="176" r="12" class="thermo-bulb"/>
    <path d="M40 60 h90 v110 a14 14 0 0 1 -14 14 h-62 a14 14 0 0 1 -14 -14z" class="beaker"/>
    <rect id="water" x="44" y="150" width="82" height="30" class="water"/>
    <g id="ice"><rect x="52" y="140" width="22" height="22" rx="4" class="ice"/><rect x="78" y="134" width="24" height="24" rx="4" class="ice"/><rect x="96" y="146" width="20" height="20" rx="4" class="ice"/></g>
    <g id="bub" opacity="0"><circle cx="60" cy="150" r="4" class="bubble"/><circle cx="85" cy="140" r="3" class="bubble"/><circle cx="105" cy="155" r="5" class="bubble"/></g>
    <path d="M60 200 h50 l-8 22 h-34z" class="lamp"/><path id="flame" d="M85 196 q-12 -14 0 -30 q12 16 0 30z" class="flame off"/></svg>`, "lab-rig");
  V && V.set({ t: 0, on: false });
  const thermo = h("div", { class: "lab-big" }, "-10 °C"), phase = note("Bấm Bật đèn cồn để bắt đầu");
  const pts = [];
  function render(t) {
    V && V.set({ t, on: true });
    const c = tempAt(t); pts.push(`${X(t).toFixed(1)},${Y(c).toFixed(1)}`);
    graph.querySelector("#curve").setAttribute("points", pts.join(" "));
    const d = graph.querySelector("#dot"); d.setAttribute("cx", X(t)); d.setAttribute("cy", Y(c));
    if (t >= 0.15) graph.querySelector("#band0").setAttribute("width", (X(Math.min(t, 0.45)) - X(0.15)).toFixed(1)), graph.querySelector("#band0").setAttribute("x", X(0.15));
    thermo.textContent = `${Math.round(c)} °C`; phase.textContent = phaseAt(t);
    const iceLeft = t < 0.15 ? 1 : t < 0.45 ? 1 - (t - 0.15) / 0.3 : 0;
    rig.querySelector("#ice").style.opacity = iceLeft; rig.querySelector("#ice").style.transform = `translateY(${(1 - iceLeft) * 14}px)`;
    const wh = 30 + (1 - iceLeft) * 30; const w = rig.querySelector("#water"); w.setAttribute("y", 180 - wh); w.setAttribute("height", wh);
    rig.querySelector("#merc").setAttribute("y", 166 - (c + 10) * 1.2); rig.querySelector("#merc").setAttribute("height", 10 + (c + 10) * 1.2);
    rig.querySelector("#bub").setAttribute("opacity", t >= 0.8 ? 1 : 0);
  }
  let running = false;
  const start = btn("🔥 Bật đèn cồn", async () => {
    if (running) return; running = true; start.disabled = true; rig.querySelector("#flame").classList.remove("off"); sound.play("xeo");
    await anim(15000, render); V && V.set({ t: 1, on: false }); rig.querySelector("#flame").classList.add("off"); sound.play("chuong");
    phase.textContent = "Xong! Hai đoạn nằm ngang là lúc nước đá đang tan (0 °C) và lúc nước đang sôi (100 °C)."; ready();
  }, "btn btn-main");
  return h("div", { class: "lab" }, h("div", { class: "lab-stage two" }, h("div", { class: "lab-col" }, V ? V.withAlt(rig) : rig, thermo), h("div", { class: "lab-col" }, graph, phase)), h("div", { class: "actions" }, start));
};

// ---------- bảng thí nghiệm "mẫu × thao tác" (Bài 9, Bài 13) ----------
function matrixLab({ samples, actions, result, need = 5, intro }) {
  return ready => {
    let s = 0, done = 0; const seen = new Set();
    const stage = svgEl("", "lab-matrix-stage"), V = bench3d("matrix");
    const out = h("div", { class: "lab-result" }, note(intro || "Chọn một mẫu và một thao tác."));
    const table = h("table", { class: "lab-table" }, h("thead", {}, h("tr", {}, h("th", {}, ""), actions.map(a => h("th", {}, a.name)))),
      h("tbody", {}, samples.map((sm, i) => h("tr", {}, h("th", {}, sm.name), actions.map((a, j) => h("td", { id: `c${i}-${j}` }, "?"))))));
    const sBtns = samples.map((sm, i) => h("button", { class: "chip" + (i === 0 ? " on" : ""), onclick: () => { s = i; sBtns.forEach((b, k) => b.classList.toggle("on", k === i)); draw(null); } }, sm.icon + " " + sm.name));
    const aBtns = actions.map((a, j) => btn(a.icon + " " + a.name, () => run(j), "btn btn-soft"));
    function draw(res) { V && V.set({ s: samples[s].name, res, act: res ? actions[res.action].name : "" }); stage.innerHTML = samples[s].svg(res); }
    async function run(j) {
      const r = result(s, j); aBtns.forEach(b => b.disabled = true);
      draw({ action: j, k: 0 }); sound.play(actions[j].sound || "bam");
      await anim(1600, k => draw({ action: j, k, r }));
      out.replaceChildren(h("div", { class: "lab-note " + (r.tag === "Hóa học" || r.tag === "Có biến đổi" ? "hot" : "") }, h("b", {}, samples[s].name + " · " + actions[j].name + ": "), r.text, r.tag ? h("span", { class: "tag tag-res" }, r.tag) : null));
      const cell = table.querySelector(`#c${s}-${j}`); cell.textContent = r.short || r.tag || "✓"; cell.className = r.tag === "Hóa học" || r.tag === "Có biến đổi" ? "hot" : "ok";
      if (!seen.has(s + "-" + j)) { seen.add(s + "-" + j); done++; }
      aBtns.forEach(b => b.disabled = false);
      if (done >= need) ready();
    }
    draw(null);
    return h("div", { class: "lab" }, h("div", { class: "lab-pick" }, h("span", { class: "muted" }, "Mẫu:"), sBtns), h("div", { class: "lab-stage two" }, h("div", { class: "lab-col" }, V ? V.withAlt(stage) : stage, h("div", { class: "actions center" }, aBtns)), h("div", { class: "lab-col" }, out, table)),
      h("p", { class: "small muted" }, `Thử ít nhất ${need} ô trong bảng để mở bước Kết luận.`));
  };
}
const dish = (inner, extra = "") => `<svg viewBox="0 0 240 200" aria-hidden="true">${extra}<ellipse cx="120" cy="150" rx="90" ry="22" class="dish"/>${inner}</svg>`;
const flameSvg = on => on ? `<path d="M120 196 q-16 -20 0 -40 q16 20 0 40z" class="flame"/>` : "";

// Bài 9: tính chất vật lí và hóa học
LABS["tinh-chat"] = matrixLab({
  intro: "Chọn mẫu, rồi thử hòa vào nước, đun nóng hoặc để nơi ẩm. Có chất mới sinh ra thì đó là tính chất hóa học.",
  samples: [
    { name: "Đường", icon: "🍬", svg: r => { const burnt = r && r.action === 1 ? r.k : 0; const col = burnt < .5 ? "#ffffff" : burnt < .8 ? "#c98a4b" : "#3b2a2a";
      if (r && r.action === 0) return dish(`<rect x="60" y="60" width="120" height="90" rx="10" class="water" opacity=".7"/>${[0, 1, 2, 3, 4].map(i => `<rect x="${80 + i * 18}" y="${120 - (1 - r.k) * 40}" width="10" height="10" fill="#fff" opacity="${1 - r.k}"/>`).join("")}`);
      return dish(`<path d="M80 140 q40 -${30 - burnt * 20} 80 0z" fill="${col}" stroke="#d9cfee" stroke-width="2"/>${burnt > .7 ? `<g class="smoke"><circle cx="110" cy="90" r="10"/><circle cx="130" cy="70" r="14"/></g>` : ""}${flameSvg(r && r.action === 1)}`); } },
    { name: "Muối", icon: "🧂", svg: r => r && r.action === 0 ? dish(`<rect x="60" y="60" width="120" height="90" rx="10" class="water" opacity=".7"/>${[0, 1, 2, 3].map(i => `<rect x="${86 + i * 18}" y="${115 - (1 - r.k) * 40}" width="9" height="9" fill="#fff" opacity="${1 - r.k}"/>`).join("")}`) : dish(`<path d="M80 140 q40 -30 80 0z" fill="#ffffff" stroke="#d9cfee" stroke-width="2"/>${flameSvg(r && r.action === 1)}`) },
    { name: "Nước", icon: "💧", svg: r => dish(`<rect x="70" y="${80 + (r && r.action === 1 ? r.k * 40 : 0)}" width="100" height="${70 - (r && r.action === 1 ? r.k * 40 : 0)}" rx="10" class="water"/>${r && r.action === 1 ? `<g class="steam"><path d="M100 70 q-8 -12 0 -24 q8 -12 0 -24"/><path d="M130 70 q-8 -12 0 -24 q8 -12 0 -24"/></g>` : ""}${flameSvg(r && r.action === 1)}`) },
    { name: "Đinh sắt", icon: "🔩", svg: r => { const rust = r && r.action === 2 ? r.k : 0, hot = r && r.action === 1 ? r.k : 0;
      return dish(`${r && r.action === 0 ? `<rect x="60" y="60" width="120" height="90" rx="10" class="water" opacity=".7"/>` : ""}<rect x="70" y="128" width="100" height="10" rx="4" fill="${hot > .5 ? "#ff6a3a" : "#9aa4b8"}"/><rect x="160" y="122" width="14" height="22" rx="3" fill="${hot > .5 ? "#ff6a3a" : "#8a93a8"}"/>
        ${[0, 1, 2, 3].map(i => `<circle cx="${82 + i * 22}" cy="133" r="${4 + i % 2 * 2}" fill="#b5532a" opacity="${rust}"/>`).join("")}${flameSvg(r && r.action === 1)}`); } },
  ],
  actions: [{ name: "Hòa vào nước", icon: "💧", sound: "tach" }, { name: "Đun nóng", icon: "🔥", sound: "xeo" }, { name: "Để nơi ẩm 5 ngày", icon: "🌧️", sound: "mua" }],
  result: (s, a) => [
    [{ text: "Đường tan hết, nước có vị ngọt. Cô cạn lại thu được đường.", tag: "Vật lí", short: "tan" }, { text: "Đường chảy lỏng rồi hóa nâu, đen, có mùi khét: đã có chất mới (than).", tag: "Hóa học", short: "hóa đen" }, { text: "Đường hút ẩm, vón cục nhưng vẫn là đường.", tag: "Vật lí", short: "vón cục" }],
    [{ text: "Muối tan hết, nước có vị mặn. Cô cạn lại thu được muối.", tag: "Vật lí", short: "tan" }, { text: "Muối nóng lên, nổ lách tách nhưng vẫn là muối.", tag: "Vật lí", short: "không đổi" }, { text: "Muối hút ẩm, hơi vón cục, vẫn là muối.", tag: "Vật lí", short: "vón cục" }],
    [{ text: "Nước hòa vào nước, không có gì thay đổi.", tag: "Không đổi", short: "–" }, { text: "Nước sôi và bay hơi; ngưng tụ lại vẫn là nước.", tag: "Vật lí", short: "bay hơi" }, { text: "Không có gì thay đổi.", tag: "Không đổi", short: "–" }],
    [{ text: "Đinh sắt chìm, không tan trong nước.", tag: "Vật lí", short: "không tan" }, { text: "Đinh nóng đỏ, để nguội lại như cũ.", tag: "Vật lí", short: "nóng đỏ" }, { text: "Xuất hiện lớp gỉ nâu đỏ: đã có chất mới là gỉ sắt.", tag: "Hóa học", short: "gỉ" }],
  ][s][a],
});

// Bài 13: thử tính chất nguyên liệu
LABS["thu-nguyen-lieu"] = matrixLab({
  intro: "Chọn nguyên liệu rồi thử nhỏ giấm, thêm nước nặn, hoặc đưa nam châm lại gần.",
  samples: [
    { name: "Đá vôi", icon: "🪨", svg: r => dish(`<path d="M80 145 l10 -34 l36 -10 l30 16 l4 28z" fill="#e8e2d6" stroke="#b9ae99" stroke-width="2"/>${r && r.action === 0 ? [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${92 + i * 12}" cy="${112 - r.k * (20 + i * 8)}" r="${3 + i % 3}" class="bubble" opacity="${1 - r.k * .6}"/>`).join("") : ""}${r && r.action === 2 ? magnet(0) : ""}`) },
    { name: "Đất sét", icon: "🟤", svg: r => r && r.action === 1 ? dish(`<circle cx="120" cy="${130 - r.k * 6}" r="${18 + r.k * 6}" fill="#b5764f"/><ellipse cx="120" cy="118" rx="8" ry="4" fill="#d9a07a" opacity="${r.k}"/>`) : dish(`<path d="M80 145 q40 -40 80 0z" fill="#b5764f"/>${r && r.action === 2 ? magnet(0) : ""}`) },
    { name: "Cát", icon: "⏳", svg: r => dish(`${[...Array(30)].map((_, i) => `<circle cx="${84 + (i * 37) % 72}" cy="${142 - (i % 5) * 5}" r="2.5" fill="#e3c27a"/>`).join("")}${r && r.action === 2 ? magnet(0) : ""}`) },
    { name: "Quặng sắt", icon: "⛏️", svg: r => { const pull = r && r.action === 2 ? r.k : 0; return dish(`<path d="M${88 + pull * 30} ${145 - pull * 50} l14 -26 l30 -4 l14 22 l-8 10z" fill="#7a4a3a" stroke="#4a2a22" stroke-width="2"/>${r && r.action === 2 ? magnet(1) : ""}`); } },
  ],
  actions: [{ name: "Nhỏ giấm", icon: "🧪", sound: "tach" }, { name: "Thêm nước rồi nặn", icon: "🤲", sound: "bam" }, { name: "Đưa nam châm lại gần", icon: "🧲", sound: "bam" }],
  result: (s, a) => [
    [{ text: "Sủi bọt khí! Đá vôi có phản ứng với giấm.", tag: "Có biến đổi", short: "sủi bọt" }, { text: "Đá vôi cứng, không tan, không nặn được.", tag: "Không đổi", short: "cứng" }, { text: "Nam châm không hút đá vôi.", tag: "Không đổi", short: "không hút" }],
    [{ text: "Không thấy sủi bọt.", tag: "Không đổi", short: "–" }, { text: "Đất sét ngấm nước trở nên dẻo, nặn thành hình được. Nung lên sẽ cứng.", tag: "Có biến đổi", short: "dẻo" }, { text: "Nam châm không hút đất sét.", tag: "Không đổi", short: "không hút" }],
    [{ text: "Không thấy sủi bọt.", tag: "Không đổi", short: "–" }, { text: "Cát rời rạc, không tan, không nặn thành hình được.", tag: "Không đổi", short: "rời rạc" }, { text: "Nam châm không hút cát.", tag: "Không đổi", short: "không hút" }],
    [{ text: "Không thấy sủi bọt rõ.", tag: "Không đổi", short: "–" }, { text: "Quặng cứng, không nặn được.", tag: "Không đổi", short: "cứng" }, { text: "Quặng sắt bị nam châm hút!", tag: "Có biến đổi", short: "bị hút" }],
  ][s][a],
});
function magnet(on) { return `<g transform="translate(150 40)"><path d="M0 0 h40 v40 a20 20 0 0 1 -40 0z M10 0 v40 a10 10 0 0 0 20 0 v-40z" fill="#ff5a6a" fill-rule="evenodd"/><rect x="0" y="0" width="10" height="12" fill="#e2e6f0"/><rect x="30" y="0" width="10" height="12" fill="#e2e6f0"/>${on ? `<path d="M20 70 v10" stroke="#ffd23f" stroke-width="3"/>` : ""}</g>`; }

// ---------- Bài 11: úp cốc lên nến ----------
LABS["nen-up-coc"] = ready => {
  let big = false, running = false;
  const stage = svgEl("", "lab-stage-svg"), V = bench3d("nen-up-coc");
  function draw(cover, flame, rise) {
    V && V.set({ cover, flame, rise, big });
    const gw = big ? 120 : 84, gx = 160 - gw / 2, gh = 150, top = 210 - gh - (1 - cover) * 80;
    const lvl = 210 - rise * gh * 0.2;
    stage.innerHTML = `<svg viewBox="0 0 320 260" aria-hidden="true">
      <ellipse cx="160" cy="214" rx="130" ry="20" class="dish"/><rect x="40" y="198" width="240" height="14" rx="6" class="water"/>
      <rect x="${gx + 4}" y="${lvl}" width="${gw - 8}" height="${212 - lvl}" class="water" opacity="${cover > .9 ? 1 : 0}"/>
      <rect x="150" y="150" width="20" height="50" rx="4" fill="#fff6e6" stroke="#e2c99a" stroke-width="2"/><line x1="160" y1="150" x2="160" y2="142" stroke="#3b2a4a" stroke-width="2"/>
      ${flame > 0 ? `<path d="M160 ${142} q-${10 * flame} -${16 * flame} 0 -${34 * flame} q${10 * flame} ${18 * flame} 0 ${34 * flame}z" class="flame"/>` : `<g class="smoke"><circle cx="160" cy="120" r="7"/><circle cx="166" cy="100" r="9"/></g>`}
      <rect x="${gx}" y="${top}" width="${gw}" height="${gh}" rx="8" class="glass"/>
      ${[1, 2, 3, 4].map(i => `<line x1="${gx + gw - 14}" x2="${gx + gw}" y1="${top + gh - gh * i / 5}" y2="${top + gh - gh * i / 5}" class="g-grid" opacity="${cover}"/>`).join("")}
      ${cover > .9 && rise > .95 ? `<text x="${gx + gw + 6}" y="${lvl + 4}" class="g-lbl">≈ 1/5</text>` : ""}</svg>`;
  }
  const msg = note("Chọn cốc rồi bấm Úp cốc.");
  const run = btn("🫙 Úp cốc", async () => {
    if (running) return; running = true; run.disabled = true; sz.forEach(b => b.disabled = true);
    await anim(900, k => draw(k, 1, 0)); msg.textContent = "Ngọn nến nhỏ dần…";
    const T = big ? 7000 : 4200;
    await anim(T, k => draw(1, 1 - k, k));
    draw(1, 0, 1); sound.play("bup");
    msg.replaceChildren(h("b", {}, "Nến tắt! "), `Cốc ${big ? "to" : "nhỏ"} giữ nến cháy khoảng ${Math.round(T / 1000)} giây. Nước dâng lên khoảng 1/5 cốc: đó là phần oxygen đã bị dùng cho sự cháy.`);
    running = false; run.disabled = false; sz.forEach(b => b.disabled = false); ready();
  }, "btn btn-main");
  const sz = [["Cốc nhỏ", false], ["Cốc to", true]].map(([t, v]) => h("button", { class: "chip" + (v === big ? " on" : ""), onclick: () => { big = v; sz.forEach(b => b.classList.toggle("on", b.textContent === t)); draw(0, 1, 0); } }, t));
  draw(0, 1, 0);
  return h("div", { class: "lab" }, h("div", { class: "lab-pick" }, sz), V ? V.withAlt(stage) : stage, msg, h("div", { class: "actions center" }, run), h("p", { class: "small muted" }, "Thử cả cốc nhỏ và cốc to: cốc nào giữ nến cháy lâu hơn? Vì sao?"));
};

// ---------- Bài 12: dẫn điện, dẫn nhiệt ----------
LABS["dan-dien-nhiet"] = ready => {
  const MATS = [["Đồng", "#d9824a", true], ["Nhôm", "#c9d1de", true], ["Sắt", "#8a93a8", true], ["Nhựa", "#7cc8ff", false], ["Gỗ khô", "#c99a6b", false], ["Thủy tinh", "#d9f2ff", false], ["Cao su", "#3b2a4a", false]];
  const tested = new Set(); let tab = 0;
  const stage = svgEl("", "lab-stage-svg"), msg = note("Bấm một vật liệu để đặt vào chỗ hở của mạch điện."), V = bench3d("dan-dien-nhiet");
  const table = h("div", { class: "lab-chips" });
  function circuit(m, k) {
    V && V.set({ tab: 0, m, k });
    const on = m && m[2] && k > .3;
    stage.innerHTML = `<svg viewBox="0 0 340 240" aria-hidden="true">
      <rect x="30" y="90" width="40" height="70" rx="6" fill="#3b2a4a"/><rect x="40" y="82" width="20" height="10" fill="#9aa4b8"/><text x="50" y="132" text-anchor="middle" fill="#fff" class="g-lbl">PIN</text>
      <path d="M50 82 V40 H170 M210 40 H300 V200 H50 V160" class="wire"/>
      ${on ? [0, 1, 2, 3, 4, 5].map(i => `<circle r="4" class="electron"><animateMotion dur="2s" repeatCount="indefinite" begin="${i * .33}s" path="M50 82 V40 H300 V200 H50 V160"/></circle>`).join("") : ""}
      <rect x="168" y="30" width="44" height="20" rx="4" fill="${m ? m[1] : "none"}" stroke="${m ? "#3b2a4a" : "#c3b4e6"}" stroke-dasharray="${m ? "0" : "4 4"}" stroke-width="2"/>
      <g transform="translate(300 120)"><circle r="${on ? 34 : 0}" class="glow"/><circle r="20" fill="${on ? "#ffe680" : "#f2f2f2"}" stroke="#3b2a4a" stroke-width="2"/><rect x="-10" y="18" width="20" height="14" fill="#9aa4b8"/></g>
      ${m ? `<text x="190" y="72" text-anchor="middle" class="g-lbl">${m[0]}</text>` : ""}</svg>`;
  }
  function heat(m, k) {
    V && V.set({ tab: 1, m, k });
    const temp = Math.round(25 + (m[2] ? 45 : 6) * k);
    stage.innerHTML = `<svg viewBox="0 0 340 240" aria-hidden="true">
      <path d="M90 90 h120 v110 a16 16 0 0 1 -16 16 h-88 a16 16 0 0 1 -16 -16z" class="beaker"/><rect x="94" y="120" width="112" height="92" class="water hot"/>
      <g class="steam"><path d="M120 110 q-8 -12 0 -24"/><path d="M170 110 q-8 -12 0 -24"/></g>
      <rect x="150" y="40" width="12" height="150" rx="6" fill="${m[1]}" stroke="#3b2a4a" stroke-width="2" transform="rotate(18 156 115)"/>
      <rect x="250" y="40" width="22" height="150" rx="11" class="thermo-glass"/><rect x="256" y="${180 - temp * 1.8}" width="10" height="${temp * 1.8}" rx="5" class="thermo-red"/>
      <text x="261" y="30" text-anchor="middle" class="g-lbl">cán thìa: ${temp} °C</text></svg>`;
    return temp;
  }
  const chips = MATS.map(m => h("button", { class: "chip", onclick: async () => {
    chips.forEach(c => c.disabled = true);
    if (tab === 0) { await anim(900, k => circuit(m, k)); circuit(m, 1); sound.play(m[2] ? "ting" : "bam");
      msg.replaceChildren(h("b", {}, m[0] + ": "), m[2] ? "đèn sáng! " + m[0] + " là kim loại, dẫn điện tốt." : "đèn không sáng. " + m[0] + " cách điện."); }
    else { let t = 0; await anim(2500, k => { t = heat(m, k); }); sound.play("chuong");
      msg.replaceChildren(h("b", {}, "Thìa " + m[0].toLowerCase() + ": "), `sau 1 phút cán thìa ${t} °C, ` + (m[2] ? "nóng nhanh vì kim loại dẫn nhiệt tốt." : "vẫn hơi ấm vì dẫn nhiệt kém.")); }
    tested.add(tab + m[0]); table.append(h("span", { class: "tag " + (m[2] ? "tag-hot" : "tag-cool") }, (tab ? "🌡️ " : "💡 ") + m[0]));
    chips.forEach(c => c.disabled = false);
    if (tested.size >= 5) ready();
  } }, m[0]));
  const tabs = ["💡 Dẫn điện", "🌡️ Dẫn nhiệt"].map((t, i) => h("button", { class: "tab" + (i === 0 ? " on" : ""), onclick: () => { tab = i; tabs.forEach((b, k) => b.classList.toggle("on", k === i)); i ? heat(MATS[0], 0) : circuit(null, 0); msg.textContent = i ? "Chọn chiếc thìa để nhúng vào cốc nước nóng." : "Bấm một vật liệu để đặt vào chỗ hở của mạch điện."; } }, t));
  circuit(null, 0);
  return h("div", { class: "lab" }, h("div", { class: "tabs" }, tabs), h("div", { class: "lab-stage two" }, h("div", { class: "lab-col" }, V ? V.withAlt(stage) : stage), h("div", { class: "lab-col" }, msg, h("div", { class: "lab-pick wrap" }, chips), h("h4", {}, "Đã thử"), table)), h("p", { class: "small muted" }, "Thử ít nhất 5 lần để mở bước Kết luận."));
};

// ---------- Bài 14: so sánh sự cháy, dập lửa an toàn ----------
LABS["chay-nhien-lieu"] = ready => {
  const FUELS = [["Củi khô", 1, 0.5, "#ff9a3a", 60], ["Củi ẩm", 0.6, 1, "#ff9a3a", 35], ["Than", 0.7, 0.4, "#ff5a2a", 75], ["Cồn", 0.8, 0.05, "#7cc8ff", 55], ["Khí gas", 0.9, 0, "#5aa8ff", 85]];
  const FIRES = [
    { name: "Chảo dầu bốc cháy", ok: ["Trùm chăn ướt", "Bình chữa cháy"], bad: { "Dội nước": "Nước gặp dầu nóng bắn tung tóe, lửa bùng to hơn!" } },
    { name: "Xăng tràn cháy nhỏ", ok: ["Phủ cát", "Bình chữa cháy"], bad: { "Dội nước": "Xăng nhẹ hơn nước, nổi lên và cháy lan rộng!" } },
    { name: "Ổ điện bốc cháy", ok: ["Ngắt điện, khóa van", "Bình chữa cháy"], bad: { "Dội nước": "Nước dẫn điện, rất nguy hiểm vì có thể bị điện giật!" } },
    { name: "Lửa bén ra ngoài bếp gas", ok: ["Ngắt điện, khóa van", "Trùm chăn ướt"], bad: { "Dội nước": "Phải khóa van gas trước để cắt nguồn nhiên liệu." } },
  ];
  const METHODS = ["Dội nước", "Phủ cát", "Trùm chăn ướt", "Ngắt điện, khóa van", "Bình chữa cháy"];
  let part = 0, burned = new Set(), fixed = new Set(), fire = 0;
  const stage = svgEl("", "lab-stage-svg"), msg = note(""), V = bench3d("chay-nhien-lieu");
  const body = h("div", {});
  function burner(f, k) {
    V && V.set({ mode: "burn", f, k });
    const s = f ? f[1] * k : 0, smoke = f ? f[2] : 0;
    stage.innerHTML = `<svg viewBox="0 0 320 240" aria-hidden="true">
      <rect x="90" y="170" width="140" height="40" rx="8" fill="#8a93a8"/><rect x="100" y="150" width="120" height="24" rx="6" fill="#6b5f80"/>
      ${f ? `<path d="M160 150 q-${40 * s} -${50 * s} 0 -${110 * s} q${40 * s} ${60 * s} 0 ${110 * s}z" fill="${f[3]}" class="flame-live"/><path d="M160 150 q-${18 * s} -${26 * s} 0 -${56 * s} q${18 * s} ${30 * s} 0 ${56 * s}z" fill="#fff3b0"/>` : ""}
      ${[...Array(Math.round(smoke * 8 * k))].map((_, i) => `<circle cx="${150 + (i % 3) * 12}" cy="${40 + i * 6}" r="${8 + i}" fill="#8a8f9e" opacity=".45"/>`).join("")}
      <rect x="250" y="30" width="22" height="160" rx="11" class="thermo-glass"/><rect x="256" y="${186 - (f ? f[4] * 1.6 * k : 0)}" width="10" height="${f ? f[4] * 1.6 * k : 0}" rx="5" class="thermo-red"/><text x="261" y="22" text-anchor="middle" class="g-lbl">nhiệt</text></svg>`;
  }
  function scene(f, state) { // state: burning | out | worse
    V && V.set({ mode: "fire", f, state });
    stage.innerHTML = `<svg viewBox="0 0 320 240" aria-hidden="true"><rect x="40" y="180" width="240" height="20" rx="6" fill="#d9cfee"/>
      <text x="160" y="226" text-anchor="middle" class="g-lbl">${f.name}</text>
      ${state === "out" ? `<g class="smoke"><circle cx="160" cy="150" r="10"/><circle cx="170" cy="126" r="12"/></g><text x="160" y="110" text-anchor="middle" class="g-ok">Đã dập tắt</text>` :
        `<path d="M160 180 q-${state === "worse" ? 90 : 50} -60 0 -${state === "worse" ? 150 : 100} q${state === "worse" ? 90 : 50} 70 0 ${state === "worse" ? 150 : 100}z" class="flame-live" fill="#ff7a3a"/>`}</svg>`;
  }
  function showPart() {
    tabs.forEach((b, k) => b.classList.toggle("on", k === part));
    if (part === 0) {
      burner(null, 0); msg.textContent = "Chọn nhiên liệu để đốt trong lò thí nghiệm an toàn.";
      body.replaceChildren(h("div", { class: "lab-pick wrap" }, FUELS.map(f => btn(f[0], async () => {
        sound.play("xeo"); await anim(1800, k => burner(f, k));
        msg.replaceChildren(h("b", {}, f[0] + ": "), `ngọn lửa ${f[1] > .85 ? "to, đều" : f[1] > .65 ? "vừa" : "nhỏ, chập chờn"}, ${f[2] > .6 ? "rất nhiều khói" : f[2] > .2 ? "có khói" : "gần như không khói"}, tỏa nhiệt ${f[4] > 70 ? "nhiều" : f[4] > 50 ? "khá" : "ít"}.`);
        burned.add(f[0]); check();
      }, "btn btn-soft")))); }
    else {
      const f = FIRES[fire]; scene(f, "burning"); msg.textContent = "Chọn cách dập đám cháy: " + f.name;
      body.replaceChildren(h("div", { class: "lab-pick wrap" }, FIRES.map((x, i) => h("button", { class: "chip" + (i === fire ? " on" : ""), onclick: () => { fire = i; showPart(); } }, x.name))),
        h("div", { class: "lab-pick wrap" }, METHODS.map(m => btn(m, async () => {
          if (f.ok.includes(m)) { scene(f, "out"); sound.play("ting"); msg.replaceChildren(h("b", {}, "Đúng rồi! "), m + " cách li đám cháy với oxygen hoặc cắt nguồn cháy."); fixed.add(f.name); }
          else if (f.bad[m]) { scene(f, "worse"); sound.play("sai"); msg.replaceChildren(h("b", {}, "Nguy hiểm! "), f.bad[m]); }
          else { sound.play("sai"); msg.replaceChildren(h("b", {}, "Chưa phù hợp nhất. "), "Hãy nghĩ cách cắt nguồn cháy hoặc ngăn oxygen tới đám cháy."); }
          check();
        }, "btn btn-soft")))); }
  }
  const check = () => { if (burned.size >= 3 && fixed.size >= 2) ready(); };
  const tabs = ["🔥 So sánh sự cháy", "🧯 Dập lửa an toàn"].map((t, i) => h("button", { class: "tab", onclick: () => { part = i; showPart(); } }, t));
  showPart();
  return h("div", { class: "lab" }, h("div", { class: "tabs" }, tabs), h("div", { class: "lab-stage two" }, h("div", { class: "lab-col" }, V ? V.withAlt(stage) : stage), h("div", { class: "lab-col" }, msg, body)), h("p", { class: "small muted" }, "Đốt thử 3 nhiên liệu và dập đúng 2 đám cháy để mở bước Kết luận."));
};

// ---------- Bài 15: đĩa ăn cân bằng ----------
LABS["dia-can-bang"] = ready => {
  const FOODS = [["Cơm", "🍚", [3, 0.3, 0, 0.2]], ["Bánh mì", "🍞", [3, 0.5, 0.3, 0.2]], ["Thịt gà", "🍗", [0, 3, 1, 0.3]], ["Cá", "🐟", [0, 3, 0.6, 0.6]], ["Trứng", "🥚", [0, 2, 1, 0.6]], ["Đậu phụ", "🧈", [0.3, 2, 0.8, 0.5]],
    ["Rau xanh", "🥬", [0.3, 0.3, 0, 3]], ["Quả cam", "🍊", [0.6, 0, 0, 3]], ["Sữa", "🥛", [0.6, 1, 0.8, 1.5]], ["Dầu ăn", "🫒", [0, 0, 2, 0]], ["Khoai chiên", "🍟", [2, 0.2, 2, 0.2]], ["Nước ngọt", "🥤", [2, 0, 0, 0]]];
  const NAMES = ["Tinh bột", "Chất đạm", "Chất béo", "Vitamin, khoáng"], COLS = ["#ffd23f", "#ff8fb8", "#ffb04d", "#7ee0b5"];
  const plate = []; let tries = 0;
  const V = bench3d("dia-can-bang"), plateEl = h("div", { class: "plate" }), bars = h("div", { class: "bars" }), verdict = note("Chọn tối đa 5 món cho bữa trưa.");
  function paint() {
    V && V.set({ foods: plate.map(f => f[1]) });
    plateEl.replaceChildren(...(plate.length ? plate.map((f, i) => h("button", { class: "plate-item", title: "Bỏ " + f[0], onclick: () => { plate.splice(i, 1); paint(); } }, f[1], h("small", {}, f[0]))) : [h("span", { class: "muted" }, "Đĩa còn trống")]));
    const sum = [0, 0, 0, 0]; plate.forEach(f => f[2].forEach((v, k) => sum[k] += v));
    bars.replaceChildren(...NAMES.map((n, k) => h("div", { class: "bar" }, h("span", {}, n), h("div", { class: "bar-track" }, h("i", { style: { width: Math.min(100, sum[k] / 4 * 100) + "%", background: COLS[k] } }), h("em", { class: "bar-goal" })))));
    if (!plate.length) return;
    const lack = NAMES.filter((n, k) => sum[k] < (k === 2 ? 0.8 : 2)), over = sum[2] > 3.4 || plate.some(f => f[0] === "Nước ngọt");
    verdict.className = "lab-note " + (!lack.length && !over ? "good" : "");
    verdict.textContent = !lack.length && !over ? "Đĩa ăn cân bằng! Có đủ tinh bột, đạm, chất béo, vitamin và khoáng." : (lack.length ? "Còn thiếu: " + lack.join(", ") + ". " : "") + (over ? "Hơi nhiều chất béo hoặc đường, nên bớt đồ chiên, nước ngọt." : "");
    if (!lack.length && !over) { sound.play("reo"); ready(); }
  }
  const grid = h("div", { class: "food-grid" }, FOODS.map(f => h("button", { class: "food", onclick: () => { if (plate.length >= 5) return verdict.textContent = "Đĩa đã đủ 5 món, bấm vào món trên đĩa để bỏ bớt."; plate.push(f); tries++; sound.play("tach"); paint(); } }, h("span", { class: "food-ic" }, f[1]), f[0])));
  paint();
  return h("div", { class: "lab" }, h("div", { class: "lab-stage two" }, h("div", { class: "lab-col" }, grid), h("div", { class: "lab-col" }, V ? V.withAlt(null) : null, plateEl, bars, verdict)));
};

// ---------- Bài 16: trộn các chất vào nước ----------
LABS["tron-hon-hop"] = ready => {
  const SUBS = [["Muối", "#ffffff", "dd"], ["Đường", "#fff6e0", "dd"], ["Cát", "#e3c27a", "hp"], ["Bột sắn", "#f3efe6", "hp"], ["Dầu ăn", "#ffd23f", "nt"], ["Sữa", "#fffaf0", "nt2"]];
  const KIND = { dd: "Dung dịch", hp: "Huyền phù", nt: "Nhũ tương", nt2: "Nhũ tương" };
  const tried = new Set(); let busy = false;
  const stage = svgEl("", "lab-stage-svg"), msg = note("Chọn một chất để cho vào cốc nước."), V = bench3d("tron-hon-hop");
  function cup(sub, phase, k) { // phase: pour | stir | settle
    V && V.set({ sub, phase, k });
    const [name, col, kind] = sub || ["", "", ""];
    let inner = "";
    if (sub) {
      if (kind === "dd") inner = phase === "pour" ? [...Array(12)].map((_, i) => `<rect x="${110 + (i * 23) % 90}" y="${80 + k * 90 + (i % 4) * 8}" width="7" height="7" fill="${col}" stroke="#ccc"/>`).join("") : [...Array(12)].map((_, i) => `<rect x="${110 + (i * 23) % 90}" y="${150 + (i % 4) * 10}" width="6" height="6" fill="${col}" stroke="#ccc" opacity="${1 - (phase === "stir" ? k : 1)}"/>`).join("");
      if (kind === "hp") { const cloudy = phase === "stir" ? k : phase === "settle" ? 1 - k : 0; inner = `<rect x="94" y="80" width="132" height="128" fill="${col === "#e3c27a" ? "#d9b56a" : "#e8e2d6"}" opacity="${cloudy * .8}"/><rect x="94" y="${206 - (phase === "settle" ? k * 18 : phase === "pour" ? k * 18 : 0)}" width="132" height="${phase === "settle" ? k * 18 : phase === "pour" ? k * 18 : 0}" fill="${col}"/>`; }
      if (kind === "nt" || kind === "nt2") { const mix = phase === "stir" ? k : phase === "settle" ? (kind === "nt2" ? 1 : 1 - k) : 0;
        inner = [...Array(16)].map((_, i) => `<circle cx="${104 + (i * 29) % 112}" cy="${100 + ((i * 41) % 100)}" r="${4 + i % 3}" fill="${col}" stroke="#e2b62c" opacity="${mix}"/>`).join("") + `<rect x="94" y="80" width="132" height="${kind === "nt2" ? 0 : 18 * (1 - mix)}" fill="${col}" stroke="#e2b62c"/>`;
        if (kind === "nt2") inner = `<rect x="94" y="80" width="132" height="128" fill="#fffaf0" opacity="${phase === "pour" ? k : 1}"/>`; }
    }
    stage.innerHTML = `<svg viewBox="0 0 320 240" aria-hidden="true"><path d="M90 60 h140 v140 a16 16 0 0 1 -16 16 h-108 a16 16 0 0 1 -16 -16z" class="beaker"/><rect x="94" y="80" width="132" height="128" class="water" opacity=".55"/>${inner}
      ${phase === "stir" ? `<rect x="${150 + Math.sin(k * 20) * 30}" y="30" width="8" height="160" rx="4" fill="#c99a6b" transform="rotate(${Math.sin(k * 20) * 10} 154 110)"/>` : ""}
      ${sub ? `<text x="160" y="232" text-anchor="middle" class="g-lbl">nước + ${name.toLowerCase()}</text>` : ""}</svg>`;
  }
  const chips = SUBS.map(s => btn(s[0], async () => {
    if (busy) return; busy = true; chips.forEach(c => c.disabled = true);
    sound.play("tach"); await anim(900, k => cup(s, "pour", k));
    msg.textContent = "Đang khuấy đều…"; await anim(1500, k => cup(s, "stir", k));
    msg.textContent = "Để yên một lúc…"; await anim(1800, k => cup(s, "settle", k));
    const text = { dd: `${s[0]} tan hết, cốc nước trong suốt và đồng nhất.`, hp: `${s[0]} không tan, lơ lửng làm nước đục, để yên thì lắng xuống đáy.`, nt: "Lắc mạnh thì dầu thành giọt nhỏ phân tán, để yên dầu nổi lên thành lớp trên mặt nước.", nt2: "Sữa là nhũ tương: những giọt chất béo rất nhỏ phân tán đều trong nước." }[s[2]];
    msg.replaceChildren(h("b", {}, KIND[s[2]] + ": "), text); sound.play("ting");
    tried.add(s[2].slice(0, 2)); if (tried.size >= 3) ready();
    busy = false; chips.forEach(c => c.disabled = false);
  }, "btn btn-soft"));
  cup(null);
  return h("div", { class: "lab" }, h("div", { class: "lab-stage two" }, h("div", { class: "lab-col" }, V ? V.withAlt(stage) : stage), h("div", { class: "lab-col" }, msg, h("div", { class: "lab-pick wrap" }, chips))),
    h("p", { class: "small muted" }, "Thử để thấy đủ dung dịch, huyền phù và nhũ tương."));
};

// ---------- Bài 17: lọc, cô cạn, chiết ----------
LABS["tach-chat"] = ready => {
  const done = new Set(); let st = 0;
  const stage = svgEl("", "lab-stage-svg"), msg = note(""), ctl = h("div", { class: "actions center" }), V = bench3d("tach-chat");
  const funnel = (mix, k) => `<svg viewBox="0 0 320 250" aria-hidden="true">
    <path d="M100 40 h120 l-50 70 v40 h-20 v-40z" class="glass"/><path d="M110 44 h100 l-46 62 h-8z" fill="#fff" opacity=".9"/>
    <path d="M118 48 h84 l-${42 * (1 - k)} ${56 * (1 - k)} h-0z" fill="${mix === "bun" ? "#a07a52" : "#bfe6ff"}" opacity="${1 - k}"/>
    ${mix === "bun" ? `<path d="M136 ${96 - k * 10} q24 ${8 + k * 6} 48 0" stroke="#7a5a3a" stroke-width="${2 + k * 6}" fill="none"/>` : ""}
    ${[0, 1, 2].map(i => `<circle cx="160" cy="${160 + ((k * 3 + i / 3) % 1) * 30}" r="3.5" fill="#7fd0ff" opacity="${k > 0 && k < 1 ? 1 : 0}"/>`).join("")}
    <path d="M110 190 h100 v40 a10 10 0 0 1 -10 10 h-80 a10 10 0 0 1 -10 -10z" class="beaker"/><rect x="114" y="${236 - k * 34}" width="92" height="${k * 34}" fill="${mix === "bun" ? "#bfe6ff" : "#bfe6ff"}"/>
    ${k >= 1 ? `<text x="230" y="220" class="g-lbl">${mix === "bun" ? "nước trong" : "vẫn mặn!"}</text>` : ""}</svg>`;
  const evap = k => `<svg viewBox="0 0 320 250" aria-hidden="true"><path d="M90 120 q70 60 140 0z" fill="#fff" stroke="#c3b4e6" stroke-width="3"/>
    <path d="M${100 + k * 30} 124 q${60 - k * 30} ${40 - k * 34} ${120 - k * 60} 0z" class="water" opacity="${1 - k * .9}"/>
    ${[...Array(Math.round(k * 14))].map((_, i) => `<rect x="${132 + (i * 13) % 56}" y="${134 - (i % 3) * 4}" width="6" height="6" fill="#fff" stroke="#a9b8e8" transform="rotate(${i * 20} ${135 + (i * 13) % 56} ${137})"/>`).join("")}
    ${k < 1 ? `<g class="steam"><path d="M140 100 q-8 -12 0 -24"/><path d="M180 100 q-8 -12 0 -24"/></g>` : ""}
    <path d="M140 230 h40 l-6 -20 h-28z" class="lamp"/>${k < 1 ? `<path d="M160 206 q-12 -18 0 -36 q12 18 0 36z" class="flame"/>` : ""}${k >= 1 ? `<text x="160" y="90" text-anchor="middle" class="g-ok">Còn lại muối trắng</text>` : ""}</svg>`;
  let water = 1, oil = 1, open = false, sepDone = false, timer = null;
  const sep = () => `<svg viewBox="0 0 320 250" aria-hidden="true">
    <path d="M130 30 h60 v20 q30 30 30 70 l-40 40 v30 h-40 v-30 l-40 -40 q0 -40 30 -70z" class="glass"/>
    <clipPath id="sepc"><path d="M134 50 q-26 26 -26 66 l38 38 h28 l38 -38 q0 -40 -26 -66z"/></clipPath>
    <g clip-path="url(#sepc)"><rect x="100" y="${154 - water * 54 - oil * 34}" width="120" height="${oil * 34}" fill="#ffd23f"/><rect x="100" y="${154 - water * 54}" width="120" height="${water * 54}" fill="#7fd0ff"/></g>
    <rect x="150" y="190" width="20" height="10" rx="3" fill="${open ? "#7ee0b5" : "#ff8fb8"}"/>
    ${open ? `<rect x="157" y="200" width="6" height="22" fill="${water > 0 ? "#7fd0ff" : "#ffd23f"}"/>` : ""}
    <path d="M120 222 h80 v20 a6 6 0 0 1 -6 6 h-68 a6 6 0 0 1 -6 -6z" class="beaker"/><rect x="124" y="${246 - (1 - water) * 18 - (1 - oil) * 18}" width="72" height="${(1 - water) * 18}" fill="#7fd0ff"/><rect x="124" y="${246 - (1 - water) * 18 - (1 - oil) * 18}" width="72" height="${(1 - oil) * 18}" fill="#ffd23f"/>
    <text x="240" y="${110}" class="g-lbl">dầu ăn</text><text x="240" y="${140}" class="g-lbl">nước</text></svg>`;
  function show() {
    tabs.forEach((b, k) => b.classList.toggle("on", k === st)); clearInterval(timer);
    if (st === 0) { stage.innerHTML = funnel("bun", 0); V && V.set({ st: 0, mix: "bun", k: 0 }); msg.textContent = "Rót nước đục (lẫn bùn đất) hoặc nước muối qua phễu có giấy lọc.";
      ctl.replaceChildren(...[["Lọc nước đục", "bun"], ["Lọc nước muối", "muoi"]].map(([t, m]) => btn(t, async () => { sound.play("tach"); await anim(3000, k => { stage.innerHTML = funnel(m, k); V && V.set({ st: 0, mix: m, k: k }); });
        msg.replaceChildren(h("b", {}, m === "bun" ? "Nước trong! " : "Nước vẫn mặn! "), m === "bun" ? "Đất cát không tan bị giấy lọc giữ lại." : "Muối đã tan nên đi qua giấy lọc cùng nước. Lọc không tách được muối.");
        done.add("loc"); chk(); }, "btn btn-soft"))); }
    if (st === 1) { stage.innerHTML = evap(0); V && V.set({ st: 1, k: 0 }); msg.textContent = "Đun bát sứ đựng nước muối trên đèn cồn.";
      ctl.replaceChildren(btn("🔥 Đun cô cạn", async () => { sound.play("xeo"); await anim(4500, k => { stage.innerHTML = evap(k); V && V.set({ st: 1, k: k }); }); msg.replaceChildren(h("b", {}, "Cô cạn xong! "), "Nước bay hơi hết, muối kết tinh lại trong bát."); done.add("cocan"); sound.play("ting"); chk(); }, "btn btn-main")); }
    if (st === 2) { water = 1; oil = 1; open = false; sepDone = false; stage.innerHTML = sep(); V && V.set({ st: 2, water, oil, open }); msg.textContent = "Nhấn giữ nút Mở khóa cho nước chảy ra. Thả tay đúng lúc nước vừa hết để không lẫn dầu!";
      const hold = h("button", { class: "btn btn-main", onpointerdown: () => { if (sepDone) return; open = true; }, onpointerup: stop, onpointerleave: stop }, "✋ Nhấn giữ: mở khóa");
      function stop() { if (!open) return; open = false; stage.innerHTML = sep(); V && V.set({ st: 2, water, oil, open });
        if (water <= 0.06 && oil > 0.82) { sepDone = true; msg.replaceChildren(h("b", {}, "Chiết thành công! "), "Nước ở cốc dưới, dầu ăn còn lại trong phễu."); sound.play("ting"); done.add("chiet"); chk(); }
        else if (water > 0.05) msg.textContent = `Còn một ít nước (${Math.round(water * 100)}%), nhấn giữ thêm chút nữa.`;
        else { msg.replaceChildren(h("b", {}, "Ối, lẫn dầu rồi! "), "Bấm Làm lại và thả tay sớm hơn."); } }
      timer = setInterval(() => { if (!open) return; if (water > 0) water = Math.max(0, water - 0.03); else oil = Math.max(0, oil - 0.03); stage.innerHTML = sep(); V && V.set({ st: 2, water, oil, open }); }, 60);
      ctl.replaceChildren(hold, btn("Làm lại", () => show(), "btn btn-soft")); }
  }
  const chk = () => { if (done.size >= 3) ready(); };
  const tabs = ["🔻 Lọc", "🔥 Cô cạn", "⚗️ Chiết"].map((t, i) => h("button", { class: "tab", onclick: () => { st = i; show(); } }, t));
  show();
  return h("div", { class: "lab" }, h("div", { class: "tabs" }, tabs), h("div", { class: "lab-stage two" }, h("div", { class: "lab-col" }, V ? V.withAlt(stage) : stage), h("div", { class: "lab-col" }, msg, ctl)), h("p", { class: "small muted" }, "Hoàn thành cả 3 trạm để mở bước Kết luận."));
};
