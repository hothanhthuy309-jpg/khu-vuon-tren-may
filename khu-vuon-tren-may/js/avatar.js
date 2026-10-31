// Nhân vật học sinh tỉ lệ chibi (nam / nữ) và Tủ đồ chủ đề mây
import { h, btn, modal } from "./ui.js";
import { sound } from "./sound.js";

export const SKIN = ["#ffe0c7", "#f1c39b", "#c98e62"];
export const HAIR = ["#3b2a2a", "#7a4a2a", "#e8b04a", "#ff8fb8", "#7c6cff"];
export const SHIRT = ["#ff8fb8", "#7cc8ff", "#7ee0b5", "#ffd23f", "#b79cff", "#ff9f80"];
export const HATS = [["", "Không đội"], ["bong", "Mũ bông"], ["luoitrai", "Mũ lưỡi trai"], ["no", "Nơ xinh"], ["mua", "Mũ mưa vàng"]];
export const ACCS = [["", "Không có"], ["canh", "Cánh nhỏ"], ["kinh", "Kính phi công"], ["khan", "Khăn quàng"], ["aomua", "Áo mưa vàng"]];
export const AV_DEFAULT = { gender: "nu", skin: 0, hair: 0, shirt: 0, hat: "", acc: "" };

export function randomAvatar() {
  const r = n => Math.floor(Math.random() * n);
  return { gender: r(2) ? "nam" : "nu", skin: r(3), hair: r(5), shirt: r(6), hat: HATS[r(5)][0], acc: ACCS[r(4)][0] };
}
export function normAvatar(av) { return { ...AV_DEFAULT, ...(av && typeof av === "object" ? av : {}) }; }

/** Dựng nhân vật: chân chạm đất ở y = 0, mặt quay về +z. userData: body, legs, arms, wings */
export function makeKid(THREE, avIn) {
  const av = normAvatar(avIn);
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
  const add = (geo, m, x, y, z, parent = body) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; parent.add(me); return me; };
  const skin = M(SKIN[av.skin] || SKIN[0]), hair = M(HAIR[av.hair] || HAIR[0]);
  const shirtC = av.acc === "aomua" ? "#ffd23f" : (SHIRT[av.shirt] || SHIRT[0]);
  const shirt = M(shirtC), girl = av.gender !== "nam";

  // chân (khớp ở hông để đung đưa khi đi)
  const legs = [];
  [-1, 1].forEach(s => {
    const l = new THREE.Group(); l.position.set(s * 0.15, 0.55, 0); g.add(l);
    add(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8), girl ? skin : M("#4d5fa8"), 0, -0.25, 0, l);
    const shoe = add(new THREE.SphereGeometry(0.14, 12, 8), M(girl ? "#ff7aa8" : "#ffffff"), 0, -0.47, 0.05, l); shoe.scale.set(1, 0.6, 1.3);
    legs.push(l);
  });
  if (girl) add(new THREE.CylinderGeometry(0.24, 0.44, 0.4, 18), M(shirtC), 0, 0.64, 0);
  else add(new THREE.CylinderGeometry(0.3, 0.32, 0.22, 16), M("#4d5fa8"), 0, 0.6, 0);
  // thân
  add(new THREE.CapsuleGeometry(0.28, 0.28, 6, 14), shirt, 0, 0.96, 0);
  if (av.acc === "aomua") [1.08, 0.94].forEach(y => add(new THREE.SphereGeometry(0.035, 8, 6), M("#ffffff"), 0, y, 0.28));
  // tay
  const arms = [];
  [-1, 1].forEach(s => {
    const a = new THREE.Group(); a.position.set(s * 0.36, 1.14, 0); body.add(a);
    add(new THREE.CapsuleGeometry(0.08, 0.28, 4, 8), shirt, 0, -0.2, 0, a);
    add(new THREE.SphereGeometry(0.09, 10, 8), skin, 0, -0.42, 0, a);
    a.rotation.z = s * 0.12; arms.push(a);
  });
  // đầu
  add(new THREE.SphereGeometry(0.45, 24, 18), skin, 0, 1.62, 0);
  [-1, 1].forEach(s => {
    add(new THREE.SphereGeometry(0.065, 10, 8), M("#2b2238"), s * 0.16, 1.63, 0.41);
    add(new THREE.SphereGeometry(0.022, 6, 4), M("#ffffff"), s * 0.16 + 0.025, 1.655, 0.465);
    const c = add(new THREE.SphereGeometry(0.075, 8, 6), M("#ffadc6"), s * 0.27, 1.53, 0.37); c.scale.set(1.3, 0.7, 0.5);
  });
  add(new THREE.SphereGeometry(0.035, 8, 6), M("#e26b8a"), 0, 1.47, 0.43);
  // tóc
  add(new THREE.SphereGeometry(0.48, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 1.66, -0.02);
  const fringe = add(new THREE.SphereGeometry(0.3, 14, 10), hair, 0, 1.92, 0.24); fringe.scale.set(1.25, 0.4, 0.7);
  if (girl) {
    const back = add(new THREE.SphereGeometry(0.46, 18, 14), hair, 0, 1.45, -0.2); back.scale.set(1, 1.15, 0.6);
    [-1, 1].forEach(s => {
      add(new THREE.SphereGeometry(0.17, 12, 10), hair, s * 0.5, 1.5, -0.05);
      add(new THREE.TorusGeometry(0.08, 0.03, 6, 12), M("#ff7aa8"), s * 0.42, 1.6, -0.03).rotation.y = Math.PI / 2;
    });
  } else {
    const tuft = add(new THREE.ConeGeometry(0.1, 0.22, 8), hair, 0.05, 2.12, -0.05); tuft.rotation.z = -0.4;
  }
  // mũ
  if (av.hat === "bong") [[-0.2, 2.06, 0.02, 0.2], [0.17, 2.08, 0.04, 0.21], [0, 2.2, -0.08, 0.23]].forEach(([x, y, z, r]) => add(new THREE.SphereGeometry(r, 14, 10), M("#ffffff", { roughness: 1 }), x, y, z));
  if (av.hat === "luoitrai") {
    add(new THREE.SphereGeometry(0.47, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M("#ff6a6a"), 0, 1.74, 0);
    const brim = add(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 18), M("#ff6a6a"), 0, 1.78, 0.42); brim.scale.z = 0.8;
  }
  if (av.hat === "no") [-1, 1].forEach(s => { const b = add(new THREE.ConeGeometry(0.12, 0.24, 10), M("#ff7aa8"), 0.32 + s * 0.12, 2.02, 0.1); b.rotation.z = s * Math.PI / 2; });
  if (av.hat === "mua") {
    add(new THREE.CylinderGeometry(0.62, 0.66, 0.06, 24), M("#ffd23f"), 0, 1.98, 0);
    add(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M("#ffd23f"), 0, 1.98, 0);
  }
  // phụ kiện
  const wings = [];
  if (av.acc === "canh") [-1, 1].forEach(s => {
    const w = new THREE.Group(); w.position.set(s * 0.15, 1.12, -0.28); body.add(w);
    const m = add(new THREE.SphereGeometry(0.32, 14, 10), M("#ffffff", { emissive: "#dfe8ff", emissiveIntensity: 0.3 }), s * 0.25, 0.1, 0, w); m.scale.set(1, 0.6, 0.18);
    w.rotation.y = s * 0.5; wings.push(w);
  });
  if (av.acc === "kinh") {
    [-1, 1].forEach(s => {
      add(new THREE.TorusGeometry(0.1, 0.035, 8, 16), M("#9a6a45"), s * 0.16, 1.66, 0.42);
      add(new THREE.CircleGeometry(0.09, 16), M("#bfe8ff", { transparent: true, opacity: 0.7 }), s * 0.16, 1.66, 0.43);
    });
    const band = add(new THREE.TorusGeometry(0.46, 0.03, 6, 32), M("#9a6a45"), 0, 1.7, 0); band.rotation.x = Math.PI / 2;
  }
  if (av.acc === "khan") { const k = add(new THREE.TorusGeometry(0.24, 0.08, 8, 20), M("#ff6a8a"), 0, 1.22, 0); k.rotation.x = Math.PI / 2; add(new THREE.BoxGeometry(0.12, 0.3, 0.06), M("#ff6a8a"), 0.12, 1.06, 0.26); }

  g.userData = { body, legs, arms, wings };
  g.scale.setScalar(0.9);
  return g;
}

/** Hoạt ảnh đi bộ / đứng yên */
export function animateKid(o, moving, t) {
  const u = o.userData; if (!u.legs) return;
  const sw = moving ? Math.sin(t * 11) : 0;
  u.legs.forEach((l, k) => { l.rotation.x = (k ? -1 : 1) * sw * 0.7; });
  (u.arms || []).forEach((a, k) => { a.rotation.x = (k ? 1 : -1) * sw * 0.6; });
  u.body.position.y = moving ? Math.abs(Math.sin(t * 11)) * 0.08 : Math.sin(t * 2) * 0.015;
  (u.wings || []).forEach((w, k) => { w.rotation.y = (k ? -1 : 1) * (0.5 + Math.sin(t * (moving ? 14 : 4)) * 0.25); });
}

/** Hộp thoại Tủ đồ có xem trước 3D xoay tròn */
export function openWardrobe(THREE, current, onSave) {
  let av = normAvatar(current);
  const W = 280, H = 330;
  const canvas = h("canvas", { width: W, height: H, class: "wd-canvas", "aria-label": "Xem trước nhân vật" });
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W, H, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7d8ff, 1.4));
  const dl = new THREE.DirectionalLight(0xfff0d8, 1.6); dl.position.set(2, 4, 3); scene.add(dl);
  const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 50); cam.position.set(0, 1.4, 5.2); cam.lookAt(0, 1, 0);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.2, 32), new THREE.MeshStandardMaterial({ color: "#a7e07f" })); base.position.y = -0.1; scene.add(base);
  let kid = null;
  const rebuild = () => { if (kid) scene.remove(kid); kid = makeKid(THREE, av); kid.scale.setScalar(1.1); scene.add(kid); };
  rebuild();
  let raf = 0, alive = true; const t0 = performance.now();
  const loop = () => { if (!alive) return; const t = (performance.now() - t0) / 1000; kid.rotation.y = Math.sin(t * 0.6) * 0.9; animateKid(kid, false, t); renderer.render(scene, cam); raf = requestAnimationFrame(loop); };
  loop();

  const opts = h("div", { class: "wd-opts" });
  function row(title, items) { return h("div", { class: "wd-row" }, h("b", {}, title), h("div", { class: "wd-items" }, items)); }
  function swatch(key, colors) {
    return colors.map((c, i) => h("button", { class: "wd-sw" + (av[key] === i ? " on" : ""), style: { background: c }, "aria-label": `${key} ${i + 1}`, onclick: () => set({ [key]: i }) }));
  }
  function choice(key, list) { return list.map(([v, label]) => h("button", { class: "wd-ch" + (av[key] === v ? " on" : ""), onclick: () => set({ [key]: v }) }, label)); }
  function paint() {
    opts.replaceChildren(
      row("Bạn là", choice("gender", [["nu", "Bạn nữ"], ["nam", "Bạn nam"]])),
      row("Màu da", swatch("skin", SKIN)),
      row("Màu tóc", swatch("hair", HAIR)),
      row("Màu áo", swatch("shirt", SHIRT)),
      row("Mũ", choice("hat", HATS)),
      row("Phụ kiện", choice("acc", ACCS)));
  }
  function set(p) { sound.play("bam"); av = { ...av, ...p }; rebuild(); paint(); }
  paint();
  const m = modal(h("div", { class: "wd" },
    h("h2", {}, "Tủ đồ mây"),
    h("div", { class: "wd-body" }, h("div", { class: "wd-stage" }, canvas), opts),
    h("div", { class: "actions" },
      btn("Ngẫu nhiên", () => set(randomAvatar()), "btn btn-soft"),
      btn("Mặc bộ này", () => { sound.play("chuong"); onSave(av); m.close(); }, "btn btn-main"))),
    { wide: true, onClose: () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); } });
}
