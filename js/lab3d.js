// Bàn thí nghiệm 3D cho các mô phỏng (Three.js). Mỗi thí nghiệm gọi V.set(trạng thái) mỗi khi hình cần đổi.
// Máy không có WebGL thì trả về null và thí nghiệm dùng hình 2D như cũ.
let webgl = null;
function hasGL() {
  if (webgl === null) { try { const c = document.createElement("canvas"); webgl = !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { webgl = false; } }
  return webgl;
}

export function bench3d(kind) {
  if (!hasGL()) return null;
  const el = document.createElement("div"); el.className = "lab3d";
  let api = null, last = null;
  let alt = null;
  const toAlt = () => { if (alt && el.isConnected) el.replaceWith(alt); else el.classList.add("lab3d-off"); };
  const V = { el, set(s) { last = s; if (api) api.set(s); }, withAlt(x) { alt = x; return el; } };
  el.addEventListener("lab3d-fail", toAlt);
  mount(el, kind).then(a => { api = a; if (last) a.set(last); }).catch(err => { console.warn("Bàn 3D lỗi", err); toAlt(); });
  return V;
}

async function mount(el, kind) {
  const THREE = await import("three");
  const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
  const canvas = document.createElement("canvas"); el.append(canvas);
  const LOW = /iPad|iPhone|Android|Mobi/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const R = new THREE.WebGLRenderer({ canvas, antialias: !LOW, alpha: true, powerPreference: LOW ? "low-power" : "high-performance" });
  R.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.25 : 2)); R.shadowMap.enabled = !LOW;
  canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); el.dispatchEvent(new Event("lab3d-fail")); });
  canvas.addEventListener("webglcontextrestored", () => el.classList.remove("lab3d-off")); R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  cam.position.set(0, 4.6, 9.5);
  const ctl = new OrbitControls(cam, canvas); Object.assign(ctl, { enableDamping: true, enablePan: false, minDistance: 5, maxDistance: 15, minPolarAngle: 0.5, maxPolarAngle: 1.45, minAzimuthAngle: -1, maxAzimuthAngle: 1 });
  ctl.target.set(0, 1.6, 0);
  if (LOW) { ctl.enabled = false; canvas.style.touchAction = "pan-y"; el.style.touchAction = "pan-y"; }
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd8ff, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 9, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); key.shadow.normalBias = 0.03; scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9b8ff, 0.9); rim.position.set(-6, 4, -4); scene.add(rim);

  const MC = {};
  const mat = (c, x = {}) => (MC[c + JSON.stringify(x)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...x }));
  const own = (c, x = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...x });
  const glassM = new THREE.MeshStandardMaterial({ color: "#e8f6ff", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const mesh = (g, m, x = 0, y = 0, z = 0, sh = true) => { const k = new THREE.Mesh(g, m); k.position.set(x, y, z); k.castShadow = sh; k.receiveShadow = true; return k; };
  const root = new THREE.Group(); scene.add(root);
  const add = (o, parent = root) => (parent.add(o), o);
  const anim = [];

  // bàn thí nghiệm
  add(mesh(new THREE.BoxGeometry(12, 0.4, 6), mat("#fdf6ff", { roughness: 0.7 }), 0, -0.2, 0));
  add(mesh(new THREE.BoxGeometry(12.2, 0.12, 6.2), mat("#b9a6f0"), 0, -0.44, 0));
  for (let i = 0; i < 6; i++) add(mesh(new THREE.BoxGeometry(11.9, 0.012, 0.03), mat("#ece4fb"), 0, 0.005, -2.5 + i, false));
  // kệ ống nghiệm trang trí phía sau
  const rack = add(new THREE.Group()); rack.position.set(-4.2, 0, -2.2);
  rack.add(mesh(new THREE.BoxGeometry(2, 0.12, 0.6), mat("#c99a6b"), 0, 0.9, 0)); [-0.9, 0.9].forEach(x => rack.add(mesh(new THREE.BoxGeometry(0.1, 0.9, 0.6), mat("#c99a6b"), x, 0.45, 0)));
  ["#ff8fb8", "#7cc8ff", "#ffd23f", "#7ee0b5"].forEach((c, i) => { const x = -0.65 + i * 0.43; rack.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.3, 14, 1, true), glassM, x, 1.1, 0)); rack.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 14), mat(c, { emissive: c, emissiveIntensity: 0.25 }), x, 0.75, 0)); });
  const flask = add(new THREE.Group()); flask.position.set(4.4, 0, -2.2);
  flask.add(mesh(new THREE.SphereGeometry(0.6, 20, 16), glassM, 0, 0.6, 0)); flask.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 14, 1, true), glassM, 0, 1.4, 0));
  flask.add(mesh(new THREE.SphereGeometry(0.5, 20, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat("#b79cff", { emissive: "#9c7cff", emissiveIntensity: 0.3, transparent: true, opacity: 0.85 }), 0, 0.6, 0));

  // ---------- đồ dùng chung
  function beaker(r, h, x = 0, z = 0, y = 0) {
    const g = add(new THREE.Group()); g.position.set(x, y, z);
    g.add(mesh(new THREE.CylinderGeometry(r, r * 0.97, h, 36, 1, true), glassM, 0, h / 2, 0, false));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.97, 0.05, 36), glassM, 0, 0.03, 0, false));
    const rim = mesh(new THREE.TorusGeometry(r, 0.035, 8, 40), glassM, 0, h, 0, false); rim.rotation.x = Math.PI / 2; g.add(rim);
    for (let i = 1; i < 5; i++) g.add(mesh(new THREE.BoxGeometry(0.18, 0.015, 0.01), mat("#7a86b5"), r * 0.55, h * i / 5, r * 0.84, false));
    const liq = mesh(new THREE.CylinderGeometry(r * 0.93, r * 0.9, 1, 36), own("#6fc6ff", { transparent: true, opacity: 0.55, roughness: 0.1 }), 0, 0, 0, false); g.add(liq);
    const top = mesh(new THREE.CircleGeometry(r * 0.93, 36), own("#9fdcff", { transparent: true, opacity: 0.7, roughness: 0.05 }), 0, 0, 0, false); top.rotation.x = -Math.PI / 2; g.add(top);
    const level = (lv, color, op = 0.55) => { lv = Math.max(0.001, lv); liq.scale.y = lv * h; liq.position.y = lv * h / 2 + 0.03; top.position.y = lv * h + 0.031; if (color) { liq.material.color.set(color); top.material.color.set(color); } liq.material.opacity = op; top.material.opacity = Math.min(1, op + 0.15); liq.visible = top.visible = lv > 0.002; };
    level(0.4); return { g, level, r, h, liq };
  }
  function flame(parent, x, y, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    const o = mesh(new THREE.ConeGeometry(0.22 * s, 0.75 * s, 18), own("#ff8a2a", { emissive: "#ff6a1a", emissiveIntensity: 1.6, transparent: true, opacity: 0.88 }), 0, 0.36 * s, 0, false);
    const i = mesh(new THREE.ConeGeometry(0.11 * s, 0.42 * s, 14), own("#fff3b0", { emissive: "#ffe680", emissiveIntensity: 2 }), 0, 0.22 * s, 0, false);
    const ball = mesh(new THREE.SphereGeometry(0.22 * s, 16, 10), o.material, 0, 0.05 * s, 0, false); ball.scale.y = 0.6;
    g.add(o, i, ball);
    const light = new THREE.PointLight(0xff9a3a, 0, 5); light.position.y = 0.4 * s; g.add(light);
    let size = 1, on = true;
    anim.push(t => { const f = 1 + Math.sin(t * 17 + x) * 0.07 + Math.sin(t * 29) * 0.05; g.scale.set(size * (1 - (f - 1) * 0.6), size * f, size * (1 - (f - 1) * 0.6)); light.intensity = on ? 4 * size : 0; });
    return { g, set(sz, color) { size = Math.max(0.001, sz); on = sz > 0.02; g.visible = on; if (color) { o.material.color.set(color); o.material.emissive.set(color); } } };
  }
  function lamp(x, z) { // đèn cồn
    const g = add(new THREE.Group()); g.position.set(x, 0, z);
    g.add(mesh(new THREE.SphereGeometry(0.55, 24, 16, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.75), glassM, 0, 0.42, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 24), own("#bfe8ff", { transparent: true, opacity: 0.55 }), 0, 0.2, 0, false));
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.26, 16), mat("#c9d1de", { metalness: 0.6, roughness: 0.3 }), 0, 0.92, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8), mat("#fff6e6"), 0, 1.1, 0));
    const f = flame(g, 0, 1.12, 0, 1); return { g, f };
  }
  function tripod(x, z, hgt = 1.9) {
    const g = add(new THREE.Group()); g.position.set(x, 0, z);
    const ring = mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 40), mat("#5a5f73", { metalness: 0.7, roughness: 0.35 }), 0, hgt, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, leg = mesh(new THREE.CylinderGeometry(0.04, 0.04, hgt + 0.1, 8), mat("#5a5f73", { metalness: 0.7, roughness: 0.35 }), Math.cos(a) * 0.95, hgt / 2, Math.sin(a) * 0.95); leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); g.add(leg); }
    const gauze = mesh(new THREE.BoxGeometry(1.9, 0.03, 1.9), mat("#9aa1b5", { metalness: 0.5 }), 0, hgt + 0.03, 0); g.add(gauze);
    return g;
  }
  function thermo(x, y, z, len = 2.6, tilt = 0.18) {
    const g = add(new THREE.Group()); g.position.set(x, y, z); g.rotation.z = tilt;
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, len, 16), glassM, 0, len / 2, 0, false));
    g.add(mesh(new THREE.SphereGeometry(0.12, 16, 12), mat("#ff4a5a", { emissive: "#ff2a3a", emissiveIntensity: 0.4 }), 0, 0, 0));
    const col = mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 10), mat("#ff4a5a", { emissive: "#ff2a3a", emissiveIntensity: 0.4 }), 0, 0, 0, false); g.add(col);
    for (let i = 0; i <= 10; i++) g.add(mesh(new THREE.BoxGeometry(i % 5 ? 0.08 : 0.16, 0.012, 0.012), mat("#3b2a4a"), 0.1, 0.25 + i * (len - 0.4) / 10, 0.04, false));
    return { g, set(frac) { frac = Math.max(0.02, Math.min(1, frac)); col.scale.y = frac * (len - 0.3); col.position.y = frac * (len - 0.3) / 2 + 0.1; } };
  }
  function puffs(n, color = "#ffffff", size = 0.25) {
    const arr = []; for (let i = 0; i < n; i++) { const m = mesh(new THREE.SphereGeometry(size, 12, 8), own(color, { transparent: true, opacity: 0.6, roughness: 1 }), 0, 0, 0, false); m.visible = false; root.add(m); arr.push(m); }
    let on = false, ox = 0, oy = 0, oz = 0, spread = 0.4, rise = 2, amt = 1;
    anim.push(t => arr.forEach((m, i) => { m.visible = on && i < n * amt; if (!m.visible) return; const f = (t * 0.45 + i / n) % 1; m.position.set(ox + Math.sin(i * 7.3 + t) * spread * (0.3 + f), oy + f * rise, oz + Math.cos(i * 3.1) * spread * 0.5); m.scale.setScalar(0.6 + f * 1.6); m.material.opacity = 0.55 * (1 - f); }));
    return { set(v, x, y, z, s = 0.4, r = 2, a = 1) { on = v; ox = x; oy = y; oz = z; spread = s; rise = r; amt = a; } };
  }
  function bubbles(b, n = 14) { // bọt khí trong cốc
    const arr = []; for (let i = 0; i < n; i++) { const m = mesh(new THREE.SphereGeometry(0.05 + (i % 3) * 0.025, 10, 8), own("#ffffff", { transparent: true, opacity: 0.75, roughness: 0.1 }), 0, 0, 0, false); m.visible = false; b.g.add(m); arr.push(m); }
    let on = false, top = 1, rate = 1;
    anim.push(t => arr.forEach((m, i) => { m.visible = on; if (!on) return; const f = (t * 0.9 * rate + i / n) % 1, a = i * 2.4; m.position.set(Math.cos(a) * b.r * 0.6 * ((i % 4) / 4 + 0.2), 0.1 + f * top, Math.sin(a) * b.r * 0.5 * ((i % 3) / 3 + 0.2)); }));
    return { set(v, h, r = 1) { on = v; top = h; rate = r; } };
  }
  function emoji(ch, s = 0.9) {
    const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
    g.font = "100px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, 64, 72);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true })); sp.scale.set(s, s, s); return sp;
  }
  const L = (a, b, k) => a + (b - a) * k;
  const lerpC = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, k)));

  // ================= các cảnh =================
  const VIEWS = {};
  VIEWS["dun-nuoc-da"] = () => {
    const tri = tripod(0, 0, 1.9), lp = lamp(0, 0), b = beaker(0.85, 1.9, 0, 0, 1.95);
    const ices = [[-0.3, 0.2], [0.3, -0.1], [0, 0.35], [0.1, -0.35]].map(([x, z], i) => { const m = mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), own("#e4f7ff", { transparent: true, opacity: 0.85, roughness: 0.08 }), x, 0.3, z); m.rotation.set(i, i * 0.7, 0); b.g.add(m); return m; });
    const th = thermo(1.6, 0, 0.4, 3.2, 0.12), bub = bubbles(b), st = puffs(10);
    return s => {
      const t = s.t || 0, c = t < 0.15 ? -10 + t / 0.15 * 10 : t < 0.45 ? 0 : t < 0.8 ? (t - 0.45) / 0.35 * 100 : 100;
      const ice = t < 0.15 ? 1 : t < 0.45 ? 1 - (t - 0.15) / 0.3 : 0;
      ices.forEach((m, i) => { m.visible = ice > 0.02; m.scale.setScalar(Math.max(0.05, ice)); m.position.y = 0.25 + (1 - ice) * 0.1 + (i % 2) * 0.25 * ice; });
      b.level(0.12 + (1 - ice) * 0.3 - (t > 0.85 ? (t - 0.85) * 0.4 : 0), "#7fd0ff");
      lp.f.set(s.on ? 1 : 0); th.set((c + 10) / 115);
      bub.set(t >= 0.8, b.h * 0.42, 1.6); st.set(t > 0.7, 0, 1.95 + b.h * 0.5, 0, 0.45, 2.2, t >= 0.8 ? 1 : 0.4);
    };
  };
  VIEWS["nen-up-coc"] = () => {
    add(mesh(new THREE.CylinderGeometry(2.4, 2.2, 0.25, 48), own("#ffffff", { roughness: 0.3 }), 0, 0.12, 0));
    const water = add(mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.12, 48), own("#7fd0ff", { transparent: true, opacity: 0.6, roughness: 0.05 }), 0, 0.28, 0, false));
    add(mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.3, 20), mat("#fff6e6", { roughness: 0.6 }), 0, 0.9, 0));
    add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), mat("#3b2a4a"), 0, 1.6, 0));
    const fl = flame(root, 0, 1.62, 0, 0.9), sm = puffs(8, "#9aa0b4", 0.18);
    const cup = add(new THREE.Group()); const side = mesh(new THREE.CylinderGeometry(1, 1, 1, 40, 1, true), glassM, 0, 0.5, 0, false); const cap = mesh(new THREE.CircleGeometry(1, 40), glassM, 0, 1, 0, false); cap.rotation.x = Math.PI / 2; cup.add(side, cap);
    const inW = mesh(new THREE.CylinderGeometry(0.95, 0.95, 1, 40), own("#6fc6ff", { transparent: true, opacity: 0.6 }), 0, 0, 0, false); add(inW);
    return s => {
      const r = s.big ? 1.45 : 1, H = 2.6; cup.scale.set(r, H, r); cup.position.y = 0.32 + (1 - s.cover) * 2.6;
      fl.set(s.flame * 0.9); sm.set(s.flame <= 0.02 && s.cover > 0.9, 0, 1.7, 0, 0.15, 1.2);
      const lv = s.cover > 0.9 ? s.rise * H * 0.2 : 0; inW.visible = lv > 0.01; inW.scale.set(r * 0.98, Math.max(0.01, lv), r * 0.98); inW.position.y = 0.34 + lv / 2;
      water.scale.y = 1 - (s.cover > 0.9 ? s.rise * 0.3 : 0);
    };
  };
  VIEWS["dan-dien-nhiet"] = () => {
    const A = add(new THREE.Group()), B = add(new THREE.Group());
    // mạch điện
    A.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.4, 24), mat("#3b2a4a"), -2.6, 0.7, 0)); A.add(mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.4, 24), mat("#ffcf3a", { metalness: 0.4 }), -2.6, 1.2, 0)); A.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 12), mat("#c9d1de", { metalness: 0.7 }), -2.6, 1.48, 0));
    const pts = [[-2.6, 1.5, 0], [-2.6, 2.4, 0], [-0.8, 2.4, 0]].map(p => new THREE.Vector3(...p)), pts2 = [[0.8, 2.4, 0], [2.6, 2.4, 0], [2.6, 1.6, 0]].map(p => new THREE.Vector3(...p)), pts3 = [[2.6, 0.5, 0], [2.6, 0.25, 0], [-2.2, 0.25, 0], [-2.4, 0.4, 0]].map(p => new THREE.Vector3(...p));
    [pts, pts2, pts3].forEach(p => A.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p, false, "catmullrom", 0.05), 30, 0.05, 8), mat("#ff5a6a"), 0, 0, 0)));
    [-0.8, 0.8].forEach(x => A.add(mesh(new THREE.BoxGeometry(0.25, 0.16, 0.16), mat("#2f2346"), x, 2.4, 0)));
    const sample = mesh(new THREE.BoxGeometry(1.4, 0.18, 0.4), own("#d9824a", { metalness: 0.5, roughness: 0.3 }), 0, 2.4, 0); A.add(sample);
    A.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.4, 16), mat("#9aa4b8", { metalness: 0.6 }), 2.6, 1.3, 0));
    const bulbM = own("#fffbe6", { transparent: true, opacity: 0.6, emissive: "#ffd23f", emissiveIntensity: 0, roughness: 0.1 });
    const bulb = mesh(new THREE.SphereGeometry(0.45, 24, 18), bulbM, 2.6, 1.9, 0); A.add(bulb);
    const glow = new THREE.PointLight(0xffd23f, 0, 6); glow.position.set(2.6, 1.9, 0.5); A.add(glow);
    const curve = new THREE.CatmullRomCurve3([...pts, ...pts2, ...pts3]);
    const el = [0, 1, 2, 3, 4, 5, 6, 7].map(() => { const m = mesh(new THREE.SphereGeometry(0.07, 8, 6), own("#7cc8ff", { emissive: "#5bb8ff", emissiveIntensity: 1.2 }), 0, 0, 0, false); A.add(m); return m; });
    let on = false; anim.push(t => el.forEach((m, i) => { m.visible = on; if (on) m.position.copy(curve.getPointAt((t * 0.25 + i / 8) % 1)); }));
    // dẫn nhiệt
    const b = beaker(1, 1.8, -0.6, 0); b.g.removeFromParent(); B.add(b.g); b.level(0.65, "#ff9f80", 0.5);
    const st = puffs(8); const spoon = new THREE.Group(); spoon.position.set(-0.6, 0.4, 0); spoon.rotation.z = -0.35; B.add(spoon);
    const sM = own("#d9824a", { metalness: 0.5, roughness: 0.3 }); const handle = mesh(new THREE.BoxGeometry(0.16, 3, 0.06), sM, 0, 1.6, 0); const bowl = mesh(new THREE.SphereGeometry(0.28, 16, 10), sM, 0, 0, 0); bowl.scale.z = 0.4; spoon.add(handle, bowl);
    const tip = mesh(new THREE.SphereGeometry(0.12, 12, 8), own("#ff6a3a", { emissive: "#ff3a1a", emissiveIntensity: 1, transparent: true, opacity: 0 }), 0, 3.1, 0, false); spoon.add(tip);
    const th = thermo(1.7, 0, 0, 2.6, -0.1);
    th.g.removeFromParent(); B.add(th.g);
    return s => {
      const tab = s.tab || 0; A.visible = tab === 0; B.visible = tab === 1; st.set(tab === 1, -0.6, 1.8, 0, 0.4, 1.6, 0.7);
      const m = s.m, k = s.k ?? 0;
      if (tab === 0) { sample.visible = !!m; if (m) sample.material.color.set(m[1]); on = !!(m && m[2] && k > 0.3); bulbM.emissiveIntensity = on ? 2.5 : 0; glow.intensity = on ? 6 : 0; }
      else { const mm = m || ["", "#c9d1de", true]; sM.color.set(mm[1]); const temp = 25 + (mm[2] ? 45 : 6) * k; th.set(temp / 100); tip.material.opacity = mm[2] ? k * 0.9 : 0; }
    };
  };
  VIEWS["chay-nhien-lieu"] = () => {
    const A = add(new THREE.Group()), B = add(new THREE.Group());
    A.add(mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.5, 32), mat("#8a93a8", { metalness: 0.5, roughness: 0.4 }), 0, 0.25, 0));
    A.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.06, 32), mat("#4a4f60"), 0, 0.52, 0));
    const fuel = new THREE.Group(); fuel.position.y = 0.55; A.add(fuel);
    const fl = flame(A, 0, 0.7, 0, 2.2), sm = puffs(14, "#7d8296", 0.32);
    const th = thermo(2.2, 0, 0, 3, -0.08); th.g.removeFromParent(); A.add(th.g);
    function setFuel(name) {
      fuel.clear();
      if (/Củi/.test(name)) for (let i = 0; i < 5; i++) { const lg = mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.6, 10), mat(/ẩm/.test(name) ? "#6e5236" : "#a7764c"), 0, 0.12 + (i % 2) * 0.2, 0); lg.rotation.set(Math.PI / 2, i * 0.6, 0); fuel.add(lg); }
      else if (/Than/.test(name)) for (let i = 0; i < 9; i++) fuel.add(mesh(new THREE.DodecahedronGeometry(0.22), mat("#2b2830", { flatShading: true }), Math.cos(i) * 0.5 * (i % 3) / 2, 0.15, Math.sin(i * 1.7) * 0.5 * (i % 3) / 2));
      else if (/Cồn/.test(name)) { fuel.add(mesh(new THREE.CylinderGeometry(0.7, 0.6, 0.2, 24), own("#ffffff"), 0, 0.1, 0)); fuel.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 24), own("#bfe8ff", { transparent: true, opacity: 0.7 }), 0, 0.2, 0)); }
      else if (/gas/.test(name)) { const r = mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 30), mat("#3b3f4f", { metalness: 0.6 }), 0, 0.12, 0); r.rotation.x = Math.PI / 2; fuel.add(r); }
    }
    // cảnh đám cháy
    const base = new THREE.Group(); B.add(base); const fire = flame(B, 0, 1, 0, 2.4), fsm = puffs(10, "#9aa0b4", 0.3), cover = mesh(new THREE.BoxGeometry(2.6, 0.08, 2), mat("#7cc8ff"), 0, 1.6, 0); B.add(cover);
    function setBase(name) {
      base.clear();
      if (/Chảo/.test(name)) { base.add(mesh(new THREE.CylinderGeometry(1.1, 0.8, 0.35, 32, 1, true), mat("#3b3f4f", { metalness: 0.6, side: THREE.DoubleSide }), 0, 0.85, 0)); base.add(mesh(new THREE.BoxGeometry(1.6, 0.1, 0.14), mat("#2f2346"), 1.8, 0.95, 0)); base.add(mesh(new THREE.BoxGeometry(2.4, 0.6, 2), mat("#d6dbe8"), 0, 0.3, 0)); }
      else if (/Xăng/.test(name)) { const p = mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.03, 32), own("#ffd23f", { transparent: true, opacity: 0.6 }), 0, 0.03, 0); p.scale.z = 0.6; base.add(p); base.add(mesh(new THREE.BoxGeometry(0.6, 0.9, 0.4), mat("#ff5a4a"), -1.8, 0.45, 0.4)); }
      else if (/điện/.test(name)) { base.add(mesh(new THREE.BoxGeometry(2.6, 3, 0.2), mat("#fff3e6"), 0, 1.5, -0.8)); base.add(mesh(new THREE.BoxGeometry(0.9, 0.6, 0.15), mat("#ffffff"), 0, 1.2, -0.65)); }
      else { base.add(mesh(new THREE.BoxGeometry(2.6, 0.7, 1.6), mat("#c9d1de", { metalness: 0.4 }), 0, 0.35, 0)); const r = mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 30), mat("#3b3f4f"), 0, 0.75, 0); r.rotation.x = Math.PI / 2; base.add(r); base.add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 16), mat("#ff8fb8"), 1.9, 0.5, 0)); }
    }
    let lastF = "", lastB = "";
    return s => {
      const burn = s.mode !== "fire"; A.visible = burn; B.visible = !burn;
      if (burn) { const f = s.f, k = s.k ?? 0; if (f && f[0] !== lastF) { lastF = f[0]; setFuel(f[0]); } if (!f) { fuel.clear(); lastF = ""; }
        fl.set(f ? f[1] * k : 0, f ? f[3] : null); sm.set(!!f && f[2] > 0.05 && k > 0.2, 0, 1.6, 0, 0.5, 3, f ? f[2] : 0); th.set(f ? (f[4] * k) / 100 + 0.1 : 0.1); fsm.set(false); }
      else { const f = s.f; if (f && f.name !== lastB) { lastB = f.name; setBase(f.name); }
        fire.set(s.state === "out" ? 0 : s.state === "worse" ? 1.7 : 1); fsm.set(s.state === "out", 0, 1, 0, 0.4, 2); cover.visible = s.state === "out" && /Trùm|chăn/.test(s.how || ""); sm.set(false); }
    };
  };
  VIEWS["tron-hon-hop"] = () => {
    const b = beaker(1.5, 2.8, 0, 0); b.level(0.62, "#8fd3ff", 0.4);
    const rod = mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 10), glassM, 0, 2.2, 0, false); root.add(rod);
    const parts = [...Array(28)].map(() => { const m = mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), own("#ffffff", { transparent: true, opacity: 1 }), 0, 0, 0, false); b.g.add(m); return m; });
    const cloud = mesh(new THREE.CylinderGeometry(1.36, 1.36, 1, 36), own("#d9b56a", { transparent: true, opacity: 0 }), 0, 0, 0, false); b.g.add(cloud);
    const sed = mesh(new THREE.CylinderGeometry(1.38, 1.38, 1, 36), own("#d9b56a"), 0, 0, 0, false); b.g.add(sed);
    const oil = mesh(new THREE.CylinderGeometry(1.38, 1.38, 1, 36), own("#ffd23f", { transparent: true, opacity: 0.85 }), 0, 0, 0, false); b.g.add(oil);
    const H = b.h * 0.62; let state = {}, tt = 0;
    anim.push(t => { tt = t; draw(); });
    function draw() {
      const s = state, sub = s.sub, k = s.k ?? 0, ph = s.phase; rod.visible = ph === "stir"; if (rod.visible) { rod.position.set(Math.sin(tt * 8) * 0.5, 2.2, Math.cos(tt * 8) * 0.5); rod.rotation.z = Math.sin(tt * 8) * 0.15; }
      parts.forEach(m => m.visible = false); cloud.material.opacity = 0; sed.visible = false; oil.visible = false; b.level(0.62, "#8fd3ff", 0.4);
      if (!sub) return; const [, col, kind] = sub;
      parts.forEach((m, i) => { m.material.color.set(kind === "nt" ? "#ffd23f" : col); });
      const swirl = (i, a) => { const r = 0.25 + (i % 5) * 0.22, an = i * 2.3 + (ph === "stir" ? tt * 4 : 0); return [Math.cos(an) * r, a, Math.sin(an) * r]; };
      if (kind === "dd") parts.forEach((m, i) => { const fall = ph === "pour" ? 3.2 - k * 2.8 + (i % 4) * 0.2 : 0.3 + (i % 7) * 0.2; m.visible = !(ph === "settle") && !(ph === "stir" && k > 0.95); const [x, y, z] = swirl(i, fall); m.position.set(x, y, z); m.material.opacity = ph === "stir" ? 1 - k : 1; m.scale.setScalar(ph === "stir" ? 1 - k * 0.8 : 1); });
      if (kind === "hp") { const cl = ph === "stir" ? k : ph === "settle" ? 1 - k : 0; cloud.material.color.set(col === "#e3c27a" ? "#d9b56a" : "#e8e2d6"); cloud.material.opacity = cl * 0.75; cloud.scale.y = H; cloud.position.y = H / 2 + 0.03;
        sed.material.color.set(col === "#e3c27a" ? "#c9a25a" : "#efe9dc"); const sh = ph === "settle" ? 0.08 + k * 0.22 : ph === "pour" ? 0.08 * k : 0.04; sed.visible = true; sed.scale.y = sh; sed.position.y = sh / 2 + 0.03;
        parts.forEach((m, i) => { if (ph !== "pour") return; m.visible = true; const [x, y, z] = swirl(i, 3.2 - k * 3); m.position.set(x, y, z); }); }
      if (kind === "nt") { const mix = ph === "stir" ? k : ph === "settle" ? 1 - k : 0; oil.visible = true; const th = 0.3 * (1 - mix); oil.scale.y = Math.max(0.01, th); oil.position.y = H + th / 2 + 0.03;
        parts.forEach((m, i) => { m.visible = mix > 0.05; m.geometry !== undefined; const [x, , z] = swirl(i, 0); m.position.set(x, 0.3 + ((i * 37) % 100) / 100 * (H - 0.4) * (ph === "settle" ? 1 - k * 0.0 : 1) + (ph === "settle" ? k * (H - 0.3) * ((i % 3) / 3) : 0), z); m.material.opacity = mix; m.scale.setScalar(0.9); }); }
      if (kind === "nt2") b.level(0.62, lerpC("#8fd3ff", "#fffaf0", ph === "pour" ? k : 1).getStyle(), 0.4 + (ph === "pour" ? k : 1) * 0.55);
    }
    return s => { state = s; draw(); };
  };
  VIEWS["tach-chat"] = () => {
    const S0 = add(new THREE.Group()), S1 = add(new THREE.Group()), S2 = add(new THREE.Group());
    // giá đỡ chung
    const stand = (G, x, h) => { G.add(mesh(new THREE.BoxGeometry(1.2, 0.1, 1), mat("#5a5f73", { metalness: 0.5 }), x, 0.05, -0.4)); G.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 8), mat("#5a5f73", { metalness: 0.6 }), x, h / 2, -0.6)); const arm = mesh(new THREE.BoxGeometry(1.3, 0.08, 0.08), mat("#5a5f73", { metalness: 0.6 }), x + 0.65, h - 0.3, -0.6); G.add(arm); };
    // lọc
    stand(S0, -1.6, 4.6);
    const fun = new THREE.Group(); fun.position.set(0, 3.2, -0.6); S0.add(fun);
    const cone = mesh(new THREE.ConeGeometry(1, 1.4, 36, 1, true), glassM, 0, 0, 0, false); cone.rotation.x = Math.PI; fun.add(cone);
    fun.add(mesh(new THREE.CylinderGeometry(0.08, 0.06, 1, 12, 1, true), glassM, 0, -1.2, 0, false));
    const paper = mesh(new THREE.ConeGeometry(0.92, 1.25, 36, 1, true), own("#ffffff", { side: THREE.DoubleSide, roughness: 0.9 }), 0, 0.05, 0, false); paper.rotation.x = Math.PI; fun.add(paper);
    const mud = mesh(new THREE.ConeGeometry(0.85, 1.1, 36), own("#a07a52", { transparent: true, opacity: 0.9 }), 0, 0.1, 0, false); mud.rotation.x = Math.PI; fun.add(mud);
    const resid = mesh(new THREE.ConeGeometry(0.4, 0.5, 24), own("#7a5a3a"), 0, -0.35, 0, false); resid.rotation.x = Math.PI; fun.add(resid);
    const bk0 = beaker(0.8, 1.4, 0, -0.6); bk0.g.removeFromParent(); S0.add(bk0.g);
    const drips = [0, 1, 2].map(() => { const m = mesh(new THREE.SphereGeometry(0.06, 8, 6), own("#7fd0ff"), 0, 0, -0.6, false); S0.add(m); return m; }); let dripOn = false;
    anim.push(t => drips.forEach((m, i) => { m.visible = dripOn; m.position.y = 1.9 - ((t * 1.4 + i / 3) % 1) * 0.6; }));
    // cô cạn
    const tri = tripod(0, 0, 1.9); tri.removeFromParent(); S1.add(tri); const lp = lamp(0, 0); lp.g.removeFromParent(); S1.add(lp.g);
    const dish = mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), own("#ffffff", { side: THREE.DoubleSide, roughness: 0.3 }), 0, 2.55, 0); S1.add(dish);
    const brine = mesh(new THREE.CylinderGeometry(0.85, 0.5, 0.3, 32), own("#8fd3ff", { transparent: true, opacity: 0.7 }), 0, 1.85, 0, false); S1.add(brine);
    const salts = [...Array(16)].map((_, i) => { const m = mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), own("#ffffff", { emissive: "#e8f0ff", emissiveIntensity: 0.3 }), Math.cos(i * 2.4) * 0.45 * ((i % 4) / 4 + 0.3), 1.72, Math.sin(i * 2.4) * 0.4 * ((i % 3) / 3 + 0.3)); m.rotation.set(i, i * 2, 0); S1.add(m); return m; });
    const st = puffs(10);
    // chiết
    stand(S2, -1.6, 5);
    const pear = new THREE.Group(); pear.position.set(0, 3.2, -0.6); S2.add(pear);
    const body = mesh(new THREE.SphereGeometry(0.85, 32, 20), glassM, 0, 0.4, 0, false); body.scale.y = 1.4; pear.add(body);
    pear.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 10, 1, true), glassM, 0, -1.2, 0, false));
    const tap = mesh(new THREE.BoxGeometry(0.4, 0.14, 0.14), own("#ff8fb8"), 0, -0.9, 0); pear.add(tap);
    const wL = mesh(new THREE.CylinderGeometry(0.6, 0.25, 1, 28), own("#7fd0ff", { transparent: true, opacity: 0.8 }), 0, 0, 0, false); pear.add(wL);
    const oL = mesh(new THREE.CylinderGeometry(0.72, 0.6, 1, 28), own("#ffd23f", { transparent: true, opacity: 0.85 }), 0, 0, 0, false); pear.add(oL);
    const stream = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), own("#7fd0ff"), 0, 1.7, -0.6, false); S2.add(stream);
    const bk2 = beaker(0.7, 1.2, 0, -0.6); bk2.g.removeFromParent(); S2.add(bk2.g);
    const oilIn = mesh(new THREE.CylinderGeometry(0.64, 0.64, 1, 28), own("#ffd23f", { transparent: true, opacity: 0.85 }), 0, 0, 0, false); bk2.g.add(oilIn);
    return s => {
      S0.visible = s.st === 0; S1.visible = s.st === 1; S2.visible = s.st === 2; st.set(false); lp.f.set(0); dripOn = false;
      if (s.st === 0) { const k = s.k ?? 0, bun = s.mix !== "muoi"; mud.material.color.set(bun ? "#a07a52" : "#bfe6ff"); mud.scale.setScalar(Math.max(0.01, 1 - k)); mud.visible = k < 0.99; resid.visible = bun && k > 0.1; resid.scale.setScalar(bun ? Math.min(1, k * 1.3) : 0.01);
        dripOn = k > 0 && k < 1; bk0.level(0.02 + k * 0.5, bun ? "#bfe6ff" : "#d6f0ff", 0.5); }
      if (s.st === 1) { const k = s.k ?? 0; brine.scale.set(1 - k * 0.5, Math.max(0.02, 1 - k), 1 - k * 0.5); brine.position.y = 2.42 - (1 - k) * 0.0 - 0.45 + 0.4; brine.visible = k < 0.98;
        salts.forEach((m, i) => { m.visible = i < k * 16; m.position.y = 1.62 + 0.45 - 0.05; }); lp.f.set(k < 1 ? 1 : 0); st.set(k < 1 && k > 0.05, 0, 2.6, 0, 0.5, 1.8); }
      if (s.st === 2) { const w = s.water ?? 1, o = s.oil ?? 1; const wh = w * 0.9, oh = o * 0.55;
        wL.visible = wh > 0.01; wL.scale.y = Math.max(0.01, wh); wL.position.y = -0.55 + wh / 2; oL.visible = oh > 0.01; oL.scale.y = Math.max(0.01, oh); oL.position.y = -0.55 + wh + oh / 2;
        tap.material.color.set(s.open ? "#7ee0b5" : "#ff8fb8"); tap.rotation.y = s.open ? Math.PI / 2 : 0; stream.visible = !!s.open; stream.material.color.set(w > 0 ? "#7fd0ff" : "#ffd23f");
        const inW = (1 - w) * 0.45, inO = (1 - o) * 0.35; bk2.level(inW, "#7fd0ff", 0.7); oilIn.visible = inO > 0.01; oilIn.scale.y = Math.max(0.01, inO); oilIn.position.y = inW * bk2.h + inO / 2 + 0.03; }
    };
  };
  VIEWS["matrix"] = () => {
    const plate = add(mesh(new THREE.CylinderGeometry(1.7, 1.6, 0.18, 40), own("#ffffff", { roughness: 0.25 }), 0, 0.09, 0));
    const holder = add(new THREE.Group()); holder.position.y = 0.2; const tri = tripod(0, 0, 1.9); tri.visible = false;
    const b = beaker(1.45, 1.7, 0, 0); b.g.visible = false;
    const lp = lamp(0, 0); lp.g.visible = false;
    const sm = puffs(10, "#7d8296", 0.25), steam = puffs(8), bub = bubbles(b, 18);
    const cloud = add(new THREE.Group()); [[0, 0, 0.6], [0.6, -0.1, 0.45], [-0.6, -0.1, 0.45], [0.2, 0.25, 0.4]].forEach(([x, y, r]) => cloud.add(mesh(new THREE.SphereGeometry(r, 16, 12), own("#dfe6f5"), x, y, 0, false))); cloud.position.set(0, 3.8, 0); cloud.visible = false;
    const rain = [...Array(10)].map(() => { const m = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), own("#7fd0ff"), 0, 0, 0, false); root.add(m); return m; });
    const magnet = add(new THREE.Group()); const mg = mesh(new THREE.TorusGeometry(0.45, 0.16, 12, 30, Math.PI), own("#ff5a6a"), 0, 0, 0); mg.rotation.z = Math.PI; magnet.add(mg); [-0.45, 0.45].forEach(x => magnet.add(mesh(new THREE.BoxGeometry(0.32, 0.3, 0.32), own("#e2e6f0", { metalness: 0.6 }), x, 0.15, 0))); magnet.visible = false;
    const dropper = add(new THREE.Group()); dropper.add(mesh(new THREE.CylinderGeometry(0.07, 0.03, 1.2, 10), glassM, 0, 0, 0, false)); dropper.add(mesh(new THREE.SphereGeometry(0.16, 12, 10), own("#ff8fb8"), 0, 0.65, 0)); dropper.position.set(0.3, 2.6, 0); dropper.visible = false;
    const drop = mesh(new THREE.SphereGeometry(0.06, 8, 6), own("#f5f0c8"), 0.3, 2, 0, false); root.add(drop);
    let rainOn = false, dropOn = false; anim.push(t => { rain.forEach((m, i) => { m.visible = rainOn; m.position.set(-0.8 + (i % 5) * 0.4, 3.4 - ((t * 1.5 + i / 10) % 1) * 3, (i % 2) * 0.3 - 0.15); }); drop.visible = dropOn; drop.position.y = 1.95 - ((t * 1.2) % 1) * 1.5; });
    let cur = "", obj = null, parts = [];
    function build(name) {
      holder.clear(); parts = [];
      if (name === "Đường") for (let i = 0; i < 9; i++) { const m = mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), own("#ffffff", { roughness: 0.4, transparent: true }), (i % 3 - 1) * 0.36, 0.16 + Math.floor(i / 6) * 0.32, (Math.floor(i / 3) % 2 - 0.5) * 0.36); holder.add(m); parts.push(m); }
      else if (name === "Muối") for (let i = 0; i < 26; i++) { const m = mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), own("#f6fbff", { roughness: 0.2, transparent: true }), Math.cos(i * 2.4) * 0.5 * ((i % 5) / 5), 0.06 + (i % 3) * 0.08, Math.sin(i * 2.4) * 0.5 * ((i % 5) / 5)); m.rotation.set(i, i * 1.3, 0); holder.add(m); parts.push(m); }
      else if (name === "Nước") { const w = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 32), own("#7fd0ff", { transparent: true, opacity: 0.65, roughness: 0.05 }), 0, 0.25, 0, false); holder.add(w); parts.push(w); }
      else if (name === "Đinh sắt") { const n = new THREE.Group(); n.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 12), own("#9aa4b8", { metalness: 0.7, roughness: 0.35 }), 0, 0, 0)); n.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), own("#9aa4b8", { metalness: 0.7, roughness: 0.35 }), 0, 0.9, 0)); n.add(mesh(new THREE.ConeGeometry(0.07, 0.2, 12), own("#9aa4b8", { metalness: 0.7 }), 0, -1, 0)); n.rotation.z = Math.PI / 2; n.position.y = 0.2; holder.add(n); parts.push(n);
        for (let i = 0; i < 8; i++) { const r = mesh(new THREE.SphereGeometry(0.09, 8, 6), own("#b5532a", { roughness: 1 }), -0.8 + i * 0.23, 0.24, (i % 2) * 0.05, false); r.scale.setScalar(0.01); holder.add(r); parts.push(r); } }
      else if (name === "Đá vôi") { const m = mesh(new THREE.DodecahedronGeometry(0.6, 0), own("#e8e2d6", { flatShading: true, roughness: 0.9 }), 0, 0.45, 0); m.scale.y = 0.7; holder.add(m); parts.push(m); }
      else if (name === "Đất sét") { const m = mesh(new THREE.SphereGeometry(0.5, 24, 16), own("#b5764f", { roughness: 0.9 }), 0, 0.45, 0); holder.add(m); parts.push(m); }
      else if (name === "Cát") for (let i = 0; i < 60; i++) { const m = mesh(new THREE.SphereGeometry(0.05, 6, 4), own("#e3c27a"), Math.cos(i * 2.4) * 0.6 * Math.sqrt((i % 10) / 10), 0.05 + (i % 4) * 0.04, Math.sin(i * 2.4) * 0.6 * Math.sqrt((i % 10) / 10), false); holder.add(m); parts.push(m); }
      else { const m = mesh(new THREE.DodecahedronGeometry(0.5, 0), own("#6a3e30", { flatShading: true, metalness: 0.4, roughness: 0.6 }), 0, 0.4, 0); holder.add(m); parts.push(m); }
    }
    return s => {
      if (s.s !== cur) { cur = s.s; build(cur); }
      const r = s.res, act = s.act || "", k = r ? r.k : 0;
      b.g.visible = /nước/.test(act) && !/nặn/.test(act); const heat = /Đun/.test(act); lp.g.visible = tri.visible = heat; lp.f.set(heat ? 1 : 0); plate.position.y = heat ? 2.02 : 0.09; holder.position.y = heat ? 2.13 : 0.2; plate.scale.setScalar(heat ? 0.6 : 1);
      cloud.visible = rainOn = /ẩm/.test(act) && k < 1; magnet.visible = /nam châm/.test(act); magnet.position.set(0, 3 - k * 1.6, 0);
      dropper.visible = dropOn = /giấm/.test(act) && k < 1; bub.set(false); sm.set(false); steam.set(false);
      holder.position.x = 0; holder.scale.set(1, 1, 1);
      if (cur === "Đường") parts.forEach(m => { const burnt = /Đun/.test(act) ? k : 0; m.material.color.copy(lerpC("#ffffff", burnt < 0.6 ? "#c98a4b" : "#2b2020", burnt < 0.6 ? burnt / 0.6 : (burnt - 0.6) / 0.4)); const dis = /nước/.test(act) ? k : 0; m.material.opacity = 1 - dis; m.scale.setScalar(1 - dis * 0.9); m.scale.y = burnt > 0.3 ? 1 - (burnt - 0.3) * 0.8 : m.scale.y; });
      if (cur === "Đường" && /Đun/.test(act) && k > 0.7) sm.set(true, 0, holder.position.y + 0.4, 0, 0.3, 1.6);
      if (cur === "Muối") parts.forEach((m, i) => { const dis = /nước/.test(act) ? k : 0; m.material.opacity = 1 - dis; m.scale.setScalar(1 - dis * 0.9); if (/Đun/.test(act)) m.position.y = 0.06 + (i % 3) * 0.08 + Math.abs(Math.sin(k * 30 + i)) * 0.15; });
      if (cur === "Nước") { const w = parts[0]; const ev = /Đun/.test(act) ? k : 0; w.scale.y = Math.max(0.05, 1 - ev * 0.8); w.position.y = 0.25 * w.scale.y; steam.set(ev > 0.1, 0, holder.position.y + 0.5, 0, 0.5, 2); }
      if (cur === "Đinh sắt") { parts[0].traverse(m => { if (m.material) { m.material.emissive = m.material.emissive || new THREE.Color(); m.material.emissive.set(/Đun/.test(act) ? "#ff4a1a" : "#000000"); m.material.emissiveIntensity = /Đun/.test(act) ? k * 1.2 : 0; } }); parts.slice(1).forEach(m => m.scale.setScalar(/ẩm/.test(act) ? Math.max(0.01, k) : 0.01)); parts[0].position.y = b.g.visible ? 0.12 : 0.2; }
      if (cur === "Đá vôi") bub.set(/giấm/.test(act) && k > 0.15, 0.9, 1.4), b.g.visible = b.g.visible || (/giấm/.test(act));
      if (/giấm/.test(act)) { b.g.visible = true; b.level(0.2, "#f5f0c8", 0.5); } else b.level(0.55, "#7fd0ff", 0.45);
      if (cur === "Đất sét") { const m = parts[0]; const sh = /nặn/.test(act) ? k : 0; m.scale.set(1 + sh * 0.5, 1 - sh * 0.45, 1 + sh * 0.5); m.material.color.copy(lerpC("#b5764f", "#8e5636", sh)); }
      if (cur === "Quặng sắt") { const p = /nam châm/.test(act) ? k : 0; parts[0].position.y = 0.4 + p * 1.25; }
      if (cur === "Cát" && /nặn/.test(act)) parts.forEach((m, i) => { m.position.y = 0.05 + (i % 4) * 0.04 * (1 - k * 0.5); });
    };
  };
  VIEWS["dia-can-bang"] = () => {
    add(mesh(new THREE.CylinderGeometry(2.4, 1.9, 0.18, 48), own("#ffffff", { roughness: 0.25 }), 0, 0.12, 0));
    const rim = add(mesh(new THREE.TorusGeometry(2.3, 0.1, 10, 60), own("#ffd3e6"), 0, 0.22, 0)); rim.rotation.x = Math.PI / 2;
    [-3, 3].forEach((x, i) => { const u = add(new THREE.Group()); u.position.set(x, 0.05, 0.4); u.add(mesh(new THREE.BoxGeometry(0.12, 0.04, 2.2), mat("#c9d1de", { metalness: 0.7, roughness: 0.3 }))); u.add(mesh(new THREE.SphereGeometry(0.22, 12, 8), mat("#c9d1de", { metalness: 0.7, roughness: 0.3 }), 0, 0.03, -1.1)); });
    const items = add(new THREE.Group()); const cache = {};
    return s => { items.clear(); (s.foods || []).forEach((e, i, a) => { const sp = (cache[e + i] ||= emoji(e, 1.15)); const ang = i / Math.max(1, a.length) * Math.PI * 2 + 0.4, r = a.length > 1 ? 1.25 : 0; sp.position.set(Math.cos(ang) * r, 0.75, Math.sin(ang) * r); items.add(sp); }); };
  };
  const set = (VIEWS[kind] || VIEWS["dun-nuoc-da"])();
  if (kind === "dia-can-bang") cam.position.set(0, 6, 6.5);
  if (kind === "tach-chat") { ctl.target.set(0, 2.2, 0); cam.position.set(0, 4.4, 9.8); }

  function resize() { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  const ro = new ResizeObserver(() => requestAnimationFrame(resize)); ro.observe(el); resize(); addEventListener("orientationchange", () => setTimeout(resize, 300));
  const clock = new THREE.Clock(); let alive = true;
  (function tick() {
    if (!alive) return;
    if (!el.isConnected && clock.elapsedTime > 2) { alive = false; ro.disconnect(); R.dispose(); return; }
    if (document.hidden) { requestAnimationFrame(tick); return; }
    const t = clock.getElapsedTime(); anim.forEach(f => f(t)); ctl.update(); R.render(scene, cam); requestAnimationFrame(tick);
  })();
  return { set };
}
