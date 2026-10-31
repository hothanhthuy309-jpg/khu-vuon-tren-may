// Thí nghiệm ảo: Dự đoán → Làm → Kết luận. Không tính vào số liệu kiểm tra.
import { h, btn, tiNi, reducedMotion } from "./ui.js";
import { sound } from "./sound.js";

// Đường nhiệt độ mô phỏng khi đun nước đá (thời gian 0..1 → °C)
function tempAt(t) {
  if (t < 0.15) return -10 + (t / 0.15) * 10;          // đá lạnh ấm dần tới 0
  if (t < 0.45) return 0;                               // đang nóng chảy: đứng yên
  if (t < 0.8) return ((t - 0.45) / 0.35) * 100;        // nước lỏng nóng lên
  return 100;                                           // đang sôi
}
function phaseAt(t) {
  if (t < 0.15) return "Nước đá đang ấm dần lên";
  if (t < 0.45) return "Nước đá đang tan (nóng chảy)";
  if (t < 0.8) return "Nước lỏng đang nóng lên";
  return "Nước đang sôi";
}

export function experimentView(exp, { onFinish }) {
  const root = h("div", { class: "exp" });
  let prediction = null;

  // ----- Bước 1: Dự đoán -----
  function stepPredict() {
    const opts = exp.predict.options.map((o, i) => h("button", { class: "opt", onclick: () => {
      sound.play("bam"); prediction = i; opts.forEach((b, k) => b.classList.toggle("on", k === i)); go.disabled = false;
    } }, o));
    const go = btn("Làm thí nghiệm ➜", stepDo, "btn btn-main"); go.disabled = true;
    root.replaceChildren(steps(0), h("h2", {}, exp.title), h("p", {}, exp.intro), h("h3", {}, "1. Dự đoán"), h("p", {}, exp.predict.prompt),
      h("div", { class: "opts" }, opts), h("div", { class: "actions" }, go));
  }

  // ----- Bước 2: Làm -----
  function stepDo() {
    const W = 320, H = 200, pad = 46;
    const x = t => pad + t * (W - pad - 10), y = c => H - 24 - ((c + 10) / 110) * (H - 40);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "graph"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Đồ thị nhiệt độ theo thời gian khi đun nước đá");
    svg.innerHTML = `
      <line x1="${pad}" y1="${y(-10)}" x2="${W - 6}" y2="${y(-10)}" class="axis"/>
      <line x1="${pad}" y1="${y(-10)}" x2="${pad}" y2="8" class="axis"/>
      ${[0, 50, 100].map(c => `<line x1="${pad}" x2="${W - 6}" y1="${y(c)}" y2="${y(c)}" class="grid"/><text x="${pad - 6}" y="${y(c) + 4}" text-anchor="end" class="lbl">${c}°C</text>`).join("")}
      <text x="${W - 8}" y="${H - 6}" text-anchor="end" class="lbl">thời gian ➜</text>
      <polyline id="curve" class="curve" points=""/>
      <circle id="dot" r="5" class="dot" cx="${x(0)}" cy="${y(-10)}"/>`;
    const thermo = h("div", { class: "thermo" }, "-10 °C");
    const phase = h("div", { class: "phase" }, "Bấm Bật đèn cồn để bắt đầu");
    const beaker = h("div", { class: "beaker" }, h("div", { class: "water" }), h("div", { class: "ice" }, "🧊🧊🧊"), h("div", { class: "bubbles" }));
    const flame = h("div", { class: "flame off" }, "🔥");
    const pts = []; let t0 = null, raf = null, running = false;
    const DURATION = 16000;
    function frame(now) {
      if (!t0) t0 = now;
      const t = Math.min(1, (now - t0) / DURATION); render(t);
      if (t < 1) raf = requestAnimationFrame(frame); else finish();
    }
    function render(t) {
      const c = tempAt(t); pts.push(`${x(t).toFixed(1)},${y(c).toFixed(1)}`);
      svg.querySelector("#curve").setAttribute("points", pts.join(" "));
      const d = svg.querySelector("#dot"); d.setAttribute("cx", x(t)); d.setAttribute("cy", y(c));
      thermo.textContent = `${Math.round(c)} °C`; phase.textContent = phaseAt(t);
      const iceLeft = t < 0.15 ? 1 : t < 0.45 ? 1 - (t - 0.15) / 0.3 : 0;
      beaker.querySelector(".ice").style.opacity = iceLeft; beaker.querySelector(".ice").style.transform = `scale(${0.4 + 0.6 * iceLeft})`;
      beaker.querySelector(".water").style.height = `${30 + (1 - iceLeft) * 35}%`;
      beaker.classList.toggle("boil", t >= 0.8);
    }
    function finish() { running = false; flame.classList.add("off"); next.disabled = false; sound.play("chuong"); phase.textContent = "Xong! Em nhìn đồ thị: có đoạn nào nằm ngang không?"; }
    const start = btn("🔥 Bật đèn cồn", () => {
      if (running) return; running = true; start.disabled = true; flame.classList.remove("off"); sound.play("xeo");
      if (reducedMotion()) { for (let i = 0; i <= 100; i++) render(i / 100); finish(); } else raf = requestAnimationFrame(frame);
    }, "btn btn-main");
    const skip = btn("Xem ngay kết quả", () => { cancelAnimationFrame(raf); pts.length = 0; for (let i = 0; i <= 100; i++) render(i / 100); start.disabled = true; finish(); }, "btn btn-soft");
    const next = btn("Kết luận ➜", stepConclude, "btn btn-main"); next.disabled = true;
    root.replaceChildren(steps(1), h("h3", {}, "2. Làm thí nghiệm"),
      h("div", { class: "lab" }, h("div", { class: "rig" }, thermo, beaker, flame), h("div", { class: "graph-wrap" }, svg, phase)),
      h("div", { class: "actions" }, start, skip, next));
  }

  // ----- Bước 3: Kết luận -----
  function stepConclude() {
    let pick = null;
    const opts = exp.conclude.options.map((o, i) => h("button", { class: "opt", onclick: () => { sound.play("bam"); pick = i; opts.forEach((b, k) => b.classList.toggle("on", k === i)); } }, o));
    const ta = h("textarea", { rows: 3, maxlength: 400, placeholder: "Ví dụ: Em thấy lúc đá đang tan, nhiệt kế chỉ..." });
    const out = h("div", {});
    const done = btn("Ghi vào Nhật ký ➜", () => {
      const text = ta.value.trim();
      const kw = exp.conclude.keywords.some(k => text.toLowerCase().includes(k));
      const crit = [
        ["Dựa vào số liệu thí nghiệm", /\d/.test(text)],
        ["Nêu đúng điều quan sát được", (pick != null && exp.conclude.good.includes(pick)) || kw],
        ["Viết bằng lời của em", text.length >= 15],
      ];
      const predRight = prediction === exp.predict.answer;
      out.replaceChildren(h("div", { class: "feedback fb-info" },
        h("div", { class: "fb-head" }, tiNi(44), h("b", {}, "Tí Nị nhận xét")),
        h("p", {}, predRight ? "Em dự đoán đúng từ đầu, tuyệt quá!" : "Dự đoán ban đầu khác kết quả, không sao cả: nhà khoa học cũng hay sửa dự đoán sau khi làm thí nghiệm."),
        h("ul", { class: "crit" }, crit.map(([t, ok]) => h("li", { class: ok ? "yes" : "no" }, (ok ? "✅ " : "🌱 ") + t))),
        crit.every(c => c[1]) ? null : h("p", { class: "small" }, "Em có thể viết thêm cho đủ cả ba ý nhé.")));
      sound.play("chuong");
      onFinish && onFinish({ prediction: exp.predict.options[prediction], conclusion: (pick != null ? exp.conclude.options[pick] + " " : "") + text });
      done.remove();
    }, "btn btn-main");
    root.replaceChildren(steps(2), h("h3", {}, "3. Kết luận"), h("p", {}, exp.conclude.prompt), h("div", { class: "opts" }, opts),
      h("label", { class: "lbl-block" }, "Lời của em:", ta), h("div", { class: "actions" }, done), out);
  }

  function steps(i) {
    return h("ol", { class: "steps" }, ["Dự đoán", "Làm", "Kết luận"].map((s, k) => h("li", { class: k === i ? "now" : k < i ? "past" : "" }, s)));
  }
  stepPredict();
  return root;
}
