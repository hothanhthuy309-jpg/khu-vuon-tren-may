// Các hàm giao diện dùng chung
import { sound } from "./sound.js";

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);

export function toast(msg, kind = "info", ms = 2600) {
  let box = $("#toasts"); if (!box) { box = h("div", { id: "toasts", "aria-live": "polite" }); document.body.append(box); }
  const t = h("div", { class: `toast toast-${kind}` }, msg); box.append(t);
  setTimeout(() => { t.classList.add("bye"); setTimeout(() => t.remove(), 400); }, ms);
}

export function modal(content, { onClose, wide = false, closable = true } = {}) {
  const back = h("div", { class: "modal-back", role: "dialog", "aria-modal": "true" });
  const box = h("div", { class: "modal" + (wide ? " modal-wide" : "") });
  const close = () => { back.remove(); document.removeEventListener("keydown", esc); onClose && onClose(); };
  const esc = e => { if (e.key === "Escape" && closable) close(); };
  if (closable) box.append(h("button", { class: "modal-x", "aria-label": "Đóng", onclick: close }, "✕"));
  box.append(content); back.append(box);
  if (closable) back.addEventListener("click", e => { if (e.target === back) close(); });
  document.addEventListener("keydown", esc);
  document.body.append(back);
  return { close, box };
}

export function btn(label, onclick, cls = "btn") {
  return h("button", { class: cls, onclick: e => { sound.play("bam"); onclick && onclick(e); } }, label);
}

export function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Bong bóng bay lên (khi nhổ cỏ) và hạt mưa (khi gieo)
export function burst(x, y, kind = "bubble", n = 8) {
  if (reducedMotion()) return;
  for (let i = 0; i < n; i++) {
    const p = h("div", { class: `fx fx-${kind}` });
    p.style.left = x + (Math.random() * 60 - 30) + "px"; p.style.top = y + (Math.random() * 20 - 10) + "px";
    p.style.animationDelay = (Math.random() * 0.25) + "s";
    document.body.append(p); setTimeout(() => p.remove(), 1800);
  }
}
export function rainbow() {
  if (reducedMotion()) return;
  const r = h("div", { class: "fx-rainbow" }); document.body.append(r); setTimeout(() => r.remove(), 3200);
}

// ---------------- Nhân vật (SVG, nét nâu ấm, tỉ lệ chibi) ----------------
const STROKE = "#7a5232";
export function tiNi(size = 80, mood = "vui") {
  const mouth = mood === "nghi" ? `<path d="M44 66 q6 -3 12 0" stroke="${STROKE}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : `<path d="M42 63 q8 8 16 0" stroke="${STROKE}" stroke-width="3" fill="#f7a8a8" stroke-linecap="round"/>`;
  return h("span", { class: "char char-tini", "aria-hidden": "true", html:
    `<svg viewBox="0 0 100 90" width="${size}" height="${size * 0.9}">
      <path d="M22 78 q-16 0 -16 -16 q0 -14 14 -16 q-2 -20 18 -24 q12 -16 30 -6 q18 -6 24 12 q14 4 12 22 q0 28 -22 28 z" fill="#fff" stroke="${STROKE}" stroke-width="3.5" stroke-linejoin="round"/>
      <ellipse cx="38" cy="52" rx="5" ry="6.5" fill="${STROKE}"/><ellipse cx="62" cy="52" rx="5" ry="6.5" fill="${STROKE}"/>
      <circle cx="40" cy="50" r="1.8" fill="#fff"/><circle cx="64" cy="50" r="1.8" fill="#fff"/>
      <ellipse cx="28" cy="62" rx="6" ry="3.5" fill="#ffc4c4"/><ellipse cx="72" cy="62" rx="6" ry="3.5" fill="#ffc4c4"/>
      ${mouth}
    </svg>` });
}
export function giotSuong(size = 70) {
  return h("span", { class: "char", "aria-hidden": "true", html:
    `<svg viewBox="0 0 80 96" width="${size}" height="${size * 1.2}">
      <path d="M40 8 C24 34 12 48 12 64 a28 28 0 0 0 56 0 C68 48 56 34 40 8z" fill="#bfe6ff" stroke="${STROKE}" stroke-width="3.5"/>
      <path d="M14 30 h52 l-8 -14 h-36 z" fill="#c8e7a7" stroke="${STROKE}" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="31" cy="60" rx="4" ry="5" fill="${STROKE}"/><ellipse cx="49" cy="60" rx="4" ry="5" fill="${STROKE}"/>
      <path d="M33 72 q7 6 14 0" stroke="${STROKE}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M24 78 q-6 -2 -8 -8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
      <ellipse cx="22" cy="68" rx="5" ry="3" fill="#ffc4c4"/><ellipse cx="58" cy="68" rx="5" ry="3" fill="#ffc4c4"/>
    </svg>` });
}
export function weedSvg(size = 40, big = 0) {
  const s = size * (1 + big * 0.25);
  return `<svg viewBox="0 0 60 60" width="${s}" height="${s}" aria-hidden="true">
    <path d="M30 56 C26 40 10 36 6 22 C18 26 24 32 28 40 C24 26 26 14 32 4 C34 18 34 28 32 40 C38 30 46 26 56 24 C50 38 36 42 30 56z" fill="#9bc86a" stroke="${STROKE}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="25" cy="44" r="2.2" fill="${STROKE}"/><circle cx="35" cy="44" r="2.2" fill="${STROKE}"/>
    <path d="M26 51 q4 -3 8 0" stroke="${STROKE}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M21 39 l4 2 M39 39 l-4 2" stroke="${STROKE}" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}
export function plantSvg(stage, lessonIcon = "") {
  // 0 hạt, 1 mầm, 2 cây non, 3 cây lớn (sẵn sàng)
  const parts = [
    `<ellipse cx="30" cy="48" rx="7" ry="5" fill="#c99a64" stroke="${STROKE}" stroke-width="2.5"/>`,
    `<path d="M30 50 v-12" stroke="#5c9b3a" stroke-width="3.5" stroke-linecap="round"/><path d="M30 40 q-10 -2 -12 -10 q10 0 12 10z M30 40 q10 -2 12 -10 q-10 0 -12 10z" fill="#9bd36a" stroke="${STROKE}" stroke-width="2"/>`,
    `<path d="M30 52 v-24" stroke="#5c9b3a" stroke-width="4" stroke-linecap="round"/><path d="M30 38 q-14 -2 -16 -14 q14 0 16 14z M30 32 q14 -2 16 -14 q-14 0 -16 14z" fill="#8cc95a" stroke="${STROKE}" stroke-width="2.2"/>`,
    `<path d="M30 54 v-26" stroke="#5c9b3a" stroke-width="4.5" stroke-linecap="round"/><path d="M30 40 q-16 -2 -18 -14 q16 0 18 14z M30 36 q16 -2 18 -14 q-16 0 -18 14z" fill="#7cc24a" stroke="${STROKE}" stroke-width="2.2"/><circle cx="30" cy="18" r="12" fill="#fff6c9" stroke="${STROKE}" stroke-width="2.5"/><text x="30" y="23" font-size="13" text-anchor="middle">${lessonIcon}</text>`,
  ];
  return `<svg viewBox="0 0 60 60" width="100%" height="100%" aria-hidden="true">${parts[stage]}</svg>`;
}

export function fmtAgo(iso) {
  if (!iso) return "chưa vào";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "vừa xong"; if (m < 60) return `${m} phút trước`;
  const hr = Math.round(m / 60); if (hr < 24) return `${hr} giờ trước`;
  return `${Math.round(hr / 24)} ngày trước`;
}
export const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/** Thu nhỏ nội dung cho vừa khung, để học sinh không phải kéo lên kéo xuống.
 *  Chỉ khi nội dung quá dài (nhỏ hơn mức min) mới cho cuộn. */
export function autoFit(box, content, min = 0.62) {
  let raf = 0;
  const fit = () => {
    raf = 0; if (!box.isConnected) { ro.disconnect(); mo.disconnect(); return; }
    content.style.zoom = "";
    const cs = getComputedStyle(box), avail = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const need = content.scrollHeight; if (!need || avail <= 0) return;
    // có hình 3D (canvas) thì không thu nhỏ bằng zoom: Safari/iPad tính sai vị trí chạm khi zoom → cho cuộn nhẹ
    let z = need > avail ? Math.max(min, avail / need) : 1; if (content.querySelector("canvas, .lab3d")) z = 1;
    if (z < 0.995) content.style.zoom = z.toFixed(3);
    box.classList.toggle("fit-scroll", need * z > avail + 2);
  };
  const req = () => { if (!raf) raf = requestAnimationFrame(fit); };
  const ro = new ResizeObserver(req), mo = new MutationObserver(req);
  ro.observe(box); mo.observe(content, { childList: true, subtree: true, characterData: true });
  requestAnimationFrame(req);
  return req;
}
