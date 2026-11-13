// Vương quốc mây 3D toàn màn hình (Three.js). Học sinh tự đi lại (W A S D / phím mũi tên / bấm chuột),
// thấy các bạn đang online, trò chuyện lớp, bảng xếp hạng, Tủ đồ, và các công trình có chức năng:
// Lò Mây · Tiệm áo mây · Bảng xếp hạng · Vườn Mây · Công trường Xây nhà · Bảng tin kiểm tra · Đảo Thí Nghiệm.
import { sound } from "./sound.js";
import { api, friendlyError, chatCheck } from "./api.js";
import { h, modal, toast, btn } from "./ui.js";
import { makeKid, animateKid, openWardrobe, normAvatar, SHIRT } from "./avatar.js";
import { joinRoom } from "./online.js";
import { say } from "./shell.js";
import { tellStory } from "./story.js";

const KIND = { "bai-09": "cotton", "bai-10": "lake", "bai-11": "wind", "bai-12": "workshop", "bai-13": "mine", "bai-14": "furnace", "bai-15": "kitchen", "bai-16": "colors", "bai-17": "filter" };
const COLOR = { "bai-09": "#36c98a", "bai-10": "#2f9ff0", "bai-11": "#56b8ff", "bai-12": "#f0784a", "bai-13": "#8a6cf0", "bai-14": "#ff5f4a", "bai-15": "#f2a91c", "bai-16": "#ff6aa8", "bai-17": "#22b49a" };
const MAT_COLOR = { gach: "#d0674a", go_tam: "#c99a6b", xi_mang: "#b8bcc8", thep: "#8e9bb5", gom: "#d96f45", thuy_tinh: "#bfe8ff", nhua: "#7cc8ff", cao_su_tam: "#3b2a4a" };

export function can3D() {
  try { if (sessionStorage.getItem("kvtm-2d") === "1") return false; } catch {}
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

/**
 * opts: zones, isOpen(id), doneOf(id), me {id,name,classId,avatar}, chatOn, houses(), alerts(), score(), seeds(),
 *       onNav(hash), onSaveAvatar(av), onLogout(), onFail(err)
 */
export async function mountWorld(root, o) {
  const THREE = await import("three");
  const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let me = { ...o.me, avatar: normAvatar(o.me.avatar) };
  const girl = me.avatar.gender !== "nam";

  root.innerHTML = `<canvas aria-label="Vương quốc mây 3D"></canvas><div class="w-labels" id="labels"></div>
    <div class="w-hud glass w-tl"><div class="w-ava" id="ava">${girl ? "👧" : "👦"}</div><div><b id="pname"></b><small id="pclass"></small><div class="w-stats"><span id="pseeds"></span><span id="pscore"></span></div></div></div>
    <div class="w-hud w-top"><span class="glass" id="status">Đi bằng phím W A S D hoặc bấm vào chỗ muốn tới</span><span class="glass w-online" id="online">1 bạn trong vương quốc</span></div>
    <div class="w-hud w-tr"><div class="w-tools">
      <button class="icon-btn" id="b-go" title="Đi tới đâu?" aria-label="Đi tới đâu">🧭</button><button class="icon-btn" id="b-wd" title="Tủ đồ" aria-label="Tủ đồ">👕</button><button class="icon-btn" id="b-rank" title="Bảng xếp hạng" aria-label="Bảng xếp hạng">🏆</button>
      <button class="icon-btn" id="b-snd" title="Âm thanh" aria-label="Bật tắt âm thanh">🔊</button><button class="icon-btn" id="b-fs" title="Toàn màn hình" aria-label="Toàn màn hình">⛶</button>
      <button class="icon-btn" id="b-ctr" title="Về nhân vật" aria-label="Đưa máy quay về nhân vật">🎯</button><button class="icon-btn" id="b-out" title="Đăng xuất" aria-label="Đăng xuất">🚪</button></div>
      <canvas class="minimap" id="mini" width="392" height="392" aria-label="Bản đồ nhỏ, bấm để đi tới"></canvas></div>
    <nav class="w-hud glass w-dock" id="dock" aria-label="Điều hướng"></nav>
    <section class="w-hud glass w-chat" id="chat" aria-label="Trò chuyện lớp"><header><b>💬 Trò chuyện lớp</b><button id="chatToggle" aria-label="Thu gọn">–</button></header>
      <div class="w-log" id="chatlog" aria-live="polite"></div><div class="w-quick" id="quick"></div>
      <form id="chatform"><input id="chatin" maxlength="120" autocomplete="off" placeholder="Nhắn cho cả lớp… (Enter)" aria-label="Tin nhắn"><button type="submit">Gửi</button></form></section>
    <button class="w-hud w-prompt" id="prompt" hidden></button>
    <aside class="w-hud glass w-zone" id="zone" aria-live="polite"></aside>
    <div class="w-hud glass w-journey" id="journey" hidden></div>
    <div class="w-hud w-hint">W A S D đi · E tương tác · kéo chuột xoay · cuộn phóng to</div>`;
  const $ = s => root.querySelector(s);

  // ======================= cảnh =======================
  const canvas = $("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !(/iPad|iPhone|Android|Mobi/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)), powerPreference: "high-performance" });
  const LOW = /iPad|iPhone|Android|Mobi/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1 : 2));
  renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe9ff, 140, 360);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 1200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 9; controls.maxDistance = 150; controls.maxPolarAngle = 1.32; controls.minPolarAngle = 0.3;

  scene.add(new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color("#3a9ff2") }, mid: { value: new THREE.Color("#c4e8ff") }, bot: { value: new THREE.Color("#ffe1f0") } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float k = vP.y; vec3 c = k > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, k)) : mix(mid, bot, smoothstep(0.0, 0.5, -k)); gl_FragColor = vec4(c,1.0); }",
  })));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa9cfff, 1.3));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);
  const rim = new THREE.DirectionalLight(0xbfd8ff, 0.7); rim.position.set(-60, 40, -50); scene.add(rim);

  const MC = {};
  const mat = (c, x = {}) => (MC[c + JSON.stringify(x)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0, ...x }));
  function mesh(geo, material, x = 0, y = 0, z = 0, cast = true) { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; return m; }
  function jitter(geo, amt) {
    const p = geo.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = p.getX(i).toFixed(3) + "," + p.getY(i).toFixed(3) + "," + p.getZ(i).toFixed(3);
      let d = seen.get(key); if (!d) { d = [(Math.random() - 0.5) * amt, (Math.random() - 0.5) * amt * 0.6, (Math.random() - 0.5) * amt]; seen.set(key, d); }
      p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
    }
    geo.computeVertexNormals(); return geo;
  }
  const anim = [];
  function makeIsland(r, depth, grass) {
    const g = new THREE.Group();
    const top = mesh(new THREE.CylinderGeometry(r, r * 1.01, 0.8, 56), mat(grass), 0, -0.4, 0, false); g.add(top); top.userData.walk = true;
    g.add(mesh(new THREE.CylinderGeometry(r * 1.03, r * 0.98, 0.25, 56), mat("#a7e07f"), 0, -0.05, 0, false));
    g.add(mesh(new THREE.CylinderGeometry(r, r * 0.94, 0.8, 56), mat("#a77a52"), 0, -1.2, 0, false));
    const rock = jitter(new THREE.ConeGeometry(r * 0.96, depth, 14, 4), r * 0.15); rock.rotateX(Math.PI);
    g.add(mesh(rock, mat("#cbd6ea", { flatShading: true }), 0, -1.6 - depth / 2, 0, false));
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2, rr = r * (0.45 + Math.random() * 0.4);
      const s = jitter(new THREE.ConeGeometry(r * 0.16, depth * 0.45, 6, 2), r * 0.05); s.rotateX(Math.PI);
      g.add(mesh(s, mat("#b9c6e0", { flatShading: true }), Math.cos(a) * rr, -1.6 - depth * 0.3, Math.sin(a) * rr, false));
    }
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.7 }), Math.round(r * 10));
    const cols = ["#ff8fb8", "#ffd84d", "#ffffff", "#b79cff", "#ff9f80"].map(c => new THREE.Color(c)), d = new THREE.Object3D();
    for (let i = 0; i < fl.count; i++) { const a = Math.random() * Math.PI * 2, rr = r * (0.66 + Math.random() * 0.32); d.position.set(Math.cos(a) * rr, 0.12, Math.sin(a) * rr); d.updateMatrix(); fl.setMatrixAt(i, d.matrix); fl.setColorAt(i, cols[i % cols.length]); }
    g.add(fl);
    return g;
  }
  function tree(color = "#6cc04a", s = 1, pink = false) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.18 * s, 0.3 * s, 1.6 * s, 7), mat("#9a6a45"), 0, 0.8 * s, 0));
    const c = pink ? "#ff9ccc" : color;
    [[0, 2.2, 0, 1.1], [0.7, 1.8, 0.2, 0.75], [-0.6, 1.9, -0.2, 0.8], [0.1, 2.8, -0.1, 0.75]].forEach(([x, y, z, r]) => g.add(mesh(new THREE.SphereGeometry(r * s, 16, 12), mat(c), x * s, y * s, z * s)));
    return g;
  }
  function bush(x, z, s = 1, c = "#5fbf4a") { const g = new THREE.Group(); [[0, 0.45, 0, 0.55], [0.45, 0.35, 0.1, 0.4], [-0.4, 0.35, -0.1, 0.42]].forEach(([a, b, dd, r]) => g.add(mesh(new THREE.SphereGeometry(r * s, 12, 8), mat(c), a * s, b * s, dd * s))); g.position.set(x, 0, z); return g; }
  function gable(w, ht, d, color) {
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, ht); sh.lineTo(-w / 2, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2 });
    geo.translate(0, 0, -d / 2); return mesh(geo, mat(color));
  }
  function house(w, ht, d, wall, roof, door = "#5aa35e", win = "#bfe8ff") {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(w, ht, d), mat(wall), 0, ht / 2, 0));
    const r = gable(w + 0.8, ht * 0.75, d + 0.6, roof); r.position.y = ht; g.add(r);
    const dr = mesh(new THREE.BoxGeometry(w * 0.22, ht * 0.6, 0.12), mat(door), 0, ht * 0.3, d / 2 + 0.03); g.add(dr); g.userData.door = dr;
    [-1, 1].forEach(sx => {
      g.add(mesh(new THREE.TorusGeometry(ht * 0.14, 0.07, 8, 20), mat("#8a5a3a"), sx * w * 0.3, ht * 0.6, d / 2 + 0.05));
      g.add(mesh(new THREE.CircleGeometry(ht * 0.14, 20), mat(win, { emissive: "#7cc8ff", emissiveIntensity: 0.25 }), sx * w * 0.3, ht * 0.6, d / 2 + 0.04, false));
    });
    [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(0.18, ht, 0.18), mat("#8a5a3a"), x, ht / 2, z)));
    return g;
  }
  const signs = [];
  function sign(text, p, act, cls = "") { const b = document.createElement("button"); b.className = "sign3d " + cls; b.textContent = text; if (act) b.onclick = act; $("#labels").append(b); signs.push({ el: b, p }); return b; }

  // ======================= đảo trung tâm =======================
  const world = new THREE.Group(); scene.add(world);
  const CENTER_R = 27, RING = 72, WALK_R = 24.5, LS = 1.6;
  const center = makeIsland(CENTER_R, 18, "#86d16a"); world.add(center);
  const RECTS = [
    { x0: -12.6, x1: -7.4, z0: -8.8, z1: -4.0 },  // Tiệm áo mây
    { x0: 7.4, x1: 12.6, z0: -8.2, z1: -4.4 },    // Bảng xếp hạng
    { x0: -11.6, x1: -8.4, z0: 8.6, z1: 11.0 },   // Bảng tin
  ];
  const CIRCLES = [{ x: 0, z: 0, r: 2.6 }, { x: 10, z: 10, r: 2.1 }];
  const blocked = (x, z) => RECTS.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) || CIRCLES.some(c => Math.hypot(x - c.x, z - c.z) < c.r);
  const faceC = (g, x, z) => { g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); return g; };
  let boardTex = null, noticeGlow = null;
  {
    // quảng trường lát đá rộng
    center.add(mesh(new THREE.CylinderGeometry(9.6, 9.6, 0.08, 72), mat("#efe8f6"), 0, 0.04, 0, false));
    const rim = mesh(new THREE.TorusGeometry(9.6, 0.2, 6, 90), mat("#d9cfee"), 0, 0.08, 0, false); rim.rotation.x = Math.PI / 2; center.add(rim);
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; center.add(mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.05, 20), mat(k % 2 ? "#ffe3ef" : "#e3f3ff"), Math.cos(a) * 6.6, 0.07, Math.sin(a) * 6.6, false)); }
    // đài phun nước
    center.add(mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.7, 32), mat("#d6cfe6"), 0, 0.35, 0));
    center.add(mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.06, 32), mat("#7fd0ff", { emissive: "#4fb0ee", emissiveIntensity: 0.3 }), 0, 0.72, 0, false));
    center.add(mesh(new THREE.CylinderGeometry(0.24, 0.3, 2, 10), mat("#d6cfe6"), 0, 1.5, 0));
    center.add(mesh(new THREE.CylinderGeometry(0.9, 0.5, 0.3, 20), mat("#d6cfe6"), 0, 2.4, 0));
    const orb = mesh(new THREE.SphereGeometry(0.5, 18, 14), mat("#bfe8ff", { emissive: "#7cc8ff", emissiveIntensity: 0.6 }), 0, 3.1, 0); center.add(orb);
    const drops = [0, 1, 2, 3, 4, 5, 6, 7].map(() => { const s = mesh(new THREE.SphereGeometry(0.1, 8, 6), mat("#9fdcff", { emissive: "#7cc8ff", emissiveIntensity: 0.5 }), 0, 2, 0, false); center.add(s); return s; });
    anim.push(t => { orb.position.y = 3.1 + Math.sin(t * 2) * 0.15; drops.forEach((s, k) => { const f = (t * 0.8 + k / 8) % 1, a = k / 8 * Math.PI * 2; s.position.set(Math.cos(a) * f * 1.7, 2.6 + f * 0.8 - f * f * 2.6, Math.sin(a) * f * 1.7); }); });
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2 + 0.26, x = Math.cos(a) * 10.4, z = Math.sin(a) * 10.4; if (blocked(x, z)) continue;
      center.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.9, 6), mat("#8a6a52"), x, 0.95, z));
      center.add(mesh(new THREE.SphereGeometry(0.24, 10, 8), mat("#fff3c4", { emissive: "#ffd23f", emissiveIntensity: 0.8 }), x, 2, z, false));
    }
    // Tiệm áo mây
    const shop = house(4, 2.6, 3.4, "#ffe3ef", "#ff8fb8", "#c85b8a"); faceC(shop, -10, -6.4); center.add(shop);
    shop.add(mesh(new THREE.BoxGeometry(0.9, 1.1, 0.12), mat(SHIRT[1]), 1.5, 1.4, 1.85));
    shop.traverse(x => { x.userData.action = "wardrobe"; });
    // Bảng xếp hạng
    const lb = new THREE.Group(); faceC(lb, 10, -6.2); center.add(lb);
    [[0, 1.2, "#ffd23f"], [-1.1, 0.85, "#d6dbe8"], [1.1, 0.6, "#f0a46a"]].forEach(([x, hh, c]) => lb.add(mesh(new THREE.CylinderGeometry(0.55, 0.6, hh, 20), mat(c), x, hh / 2, 1.2)));
    [-1.6, 1.6].forEach(x => lb.add(mesh(new THREE.BoxGeometry(0.2, 3.4, 0.2), mat("#9a6a45"), x, 1.7, 0)));
    boardTex = textTexture("Bảng xếp hạng", "#7351e6", 512, 320);
    lb.add(mesh(new THREE.BoxGeometry(3.6, 2.2, 0.15), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.8 }), 0, 3.1, 0.05));
    lb.traverse(x => { x.userData.action = "board"; });
    // Bảng tin kiểm tra
    const nbG = new THREE.Group(); faceC(nbG, -10, 9.8); center.add(nbG);
    nbG.add(mesh(new THREE.BoxGeometry(2.4, 1.6, 0.15), mat("#fff8ec"), 0, 2.2, 0));
    [-1.1, 1.1].forEach(x => nbG.add(mesh(new THREE.BoxGeometry(0.16, 2.6, 0.16), mat("#9a6a45"), x, 1.3, 0)));
    noticeGlow = mesh(new THREE.TorusGeometry(1.5, 0.08, 8, 40), mat("#ffd23f", { emissive: "#ffcf3a", emissiveIntensity: 1 }), 0, 2.2, 0.15, false); nbG.add(noticeGlow);
    nbG.traverse(x => { x.userData.action = "test"; });
    // Hồ câu cá
    const pond = new THREE.Group(); pond.position.set(-5.5, 0, -15); center.add(pond);
    const rimP = mesh(new THREE.TorusGeometry(2.6, 0.35, 10, 40), mat("#b8b0c8", { flatShading: true }), 0, 0.15, 0); rimP.rotation.x = Math.PI / 2; pond.add(rimP);
    pond.add(mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.12, 40), mat("#4fb8f0", { emissive: "#2f8fd0", emissiveIntensity: 0.25, roughness: 0.1 }), 0, 0.1, 0, false));
    [[-1, 0.9], [1.2, -0.6]].forEach(([x, z]) => { const lp = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.03, 16), mat("#5fc46a"), x, 0.18, z, false); pond.add(lp); pond.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), mat("#ff8fb8"), x + 0.1, 0.26, z)); });
    const fishes = [0, 1, 2].map(k => { const f = new THREE.Group(); f.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(["#ff8a3d", "#ffd23f", "#ff6aa8"][k]), 0, 0, 0, false)); const tl = mesh(new THREE.ConeGeometry(0.14, 0.25, 6), mat(["#ff8a3d", "#ffd23f", "#ff6aa8"][k]), 0, 0, -0.3, false); tl.rotation.x = -Math.PI / 2; f.add(tl); f.scale.set(1, 0.7, 1.3); pond.add(f); return f; });
    anim.push(t => fishes.forEach((f, k) => { const a = t * (0.5 + k * 0.15) + k * 2.1, r = 1.1 + k * 0.4; f.position.set(Math.cos(a) * r, 0.2 + Math.abs(Math.sin(t * 2 + k)) * (k === 1 ? 0.25 : 0.05), Math.sin(a) * r); f.rotation.y = -a; }));
    const rod = mesh(new THREE.CylinderGeometry(0.04, 0.05, 3, 6), mat("#9a6a45"), 2.4, 1.3, 1.6); rod.rotation.z = 0.7; pond.add(rod);
    pond.traverse(x => { x.userData.action = "fish"; });
    // Nhà thú cưng
    const ph = new THREE.Group(); ph.position.set(5.5, 0, -15); center.add(ph);
    ph.add(mesh(new THREE.BoxGeometry(2.6, 1.9, 2.2), mat("#ffe0b0"), 0, 0.95, 0));
    const roof = mesh(new THREE.ConeGeometry(2.3, 1.4, 4), mat("#ff7a9a"), 0, 2.6, 0); roof.rotation.y = Math.PI / 4; ph.add(roof);
    const door = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 20, 1, false, 0, Math.PI), mat("#8a5a3c"), 0, 0.55, 1.12); door.rotation.x = Math.PI / 2; ph.add(door);
    ph.add(mesh(new THREE.BoxGeometry(1.1, 0.6, 0.1), mat("#8a5a3c"), 0, 0.3, 1.12));
    const pawT = textTexture("🐾 Thú cưng", "#ff7a9a", 256, 96); ph.add(mesh(new THREE.BoxGeometry(1.8, 0.6, 0.08), new THREE.MeshStandardMaterial({ map: pawT }), 0, 1.6, 1.15));
    const kitty = new THREE.Group(); kitty.add(mesh(new THREE.SphereGeometry(0.3, 12, 10), mat("#ffb347"), 0, 0.3, 0)); kitty.add(mesh(new THREE.SphereGeometry(0.24, 12, 10), mat("#ffb347"), 0, 0.62, 0.15)); [-1, 1].forEach(s => kitty.add(mesh(new THREE.ConeGeometry(0.08, 0.16, 6), mat("#ffb347"), s * 0.13, 0.85, 0.12))); kitty.position.set(1.6, 0, 1.6); ph.add(kitty);
    anim.push(t => { kitty.position.y = Math.abs(Math.sin(t * 3)) * 0.25; });
    ph.traverse(x => { x.userData.action = "pet"; });
    // Góc kể chuyện: gốc cây cổ thụ, ghế gỗ, đèn lồng
    const st = new THREE.Group(); st.position.set(10, 0, 10); center.add(st);
    st.add(mesh(new THREE.CylinderGeometry(1.6, 1.9, 1, 24), mat("#a7764c"), 0, 0.5, 0));
    st.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.04, 24), mat("#e8c79a"), 0, 1.02, 0, false));
    const big = tree("#6cc04a", 1.9, true); big.position.set(2.2, 0, 2.2); st.add(big);
    [0, 1, 2].forEach(k => { const a = -2.4 + k * 0.7, lg = mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 12), mat("#b5835a"), Math.cos(a) * 3.4, 0.35, Math.sin(a) * 3.4); lg.rotation.set(0, -a, Math.PI / 2); st.add(lg); });
    const lantern = mesh(new THREE.SphereGeometry(0.3, 12, 10), mat("#ffe2a8", { emissive: "#ffb43a", emissiveIntensity: 1 }), -1.4, 2.4, 1.2, false); st.add(lantern);
    st.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), mat("#8a6a52"), -1.4, 1.2, 1.2));
    anim.push(t => { lantern.material.emissiveIntensity = 0.8 + Math.sin(t * 3) * 0.2; });
    st.traverse(x => { x.userData.action = "story"; });
    // ghế đá
    [[-4.8, 8.6], [4.8, -8.6]].forEach(([x, z]) => { const b = new THREE.Group(); faceC(b, x, z); b.add(mesh(new THREE.BoxGeometry(1.8, 0.18, 0.55), mat("#c99a6b"), 0, 0.5, 0)); [-0.7, 0.7].forEach(dx => b.add(mesh(new THREE.BoxGeometry(0.15, 0.45, 0.45), mat("#a7764c"), dx, 0.22, 0))); center.add(b); });
  }
  function textTexture(text, color, w, ht) {
    const c = document.createElement("canvas"); c.width = w; c.height = ht; const g = c.getContext("2d");
    g.fillStyle = "#fffaf0"; g.fillRect(0, 0, w, ht); g.strokeStyle = color; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, ht - 12);
    g.fillStyle = color; g.font = `800 ${Math.round(ht * 0.16)}px "Baloo 2", Nunito, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, ht * 0.2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.canvas = c; return t;
  }
  function drawBoard(list) {
    const c = boardTex.userData.canvas, g = c.getContext("2d"), w = c.width, ht = c.height;
    g.fillStyle = "#fffaf0"; g.fillRect(0, 0, w, ht); g.strokeStyle = "#7351e6"; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, ht - 12);
    g.fillStyle = "#7351e6"; g.textAlign = "center"; g.font = '800 46px "Baloo 2", Nunito, sans-serif'; g.fillText("Bảng xếp hạng", w / 2, 60);
    g.textAlign = "left"; g.font = '800 38px Nunito, sans-serif';
    ["#d99a0a", "#7d879c", "#c9733a"].forEach((col, i) => { const r = list[i]; if (!r) return; g.fillStyle = col; g.fillText(`${i + 1}. ${r.name}`, 40, 134 + i * 62); g.textAlign = "right"; g.fillText(`${r.score}`, w - 40, 134 + i * 62); g.textAlign = "left"; });
    boardTex.needsUpdate = true;
  }

  // ======================= các đảo theo chức năng =======================
  const PLOTS = [[-3.6, 2.4], [3.6, 2.4], [-5, -0.6], [5, -0.6]];
  const ISLES = [
    { id: "hoc", name: "Quần đảo Học Tập", sub: "Bài học cô đã mở", kind: "study", color: "#ffb84d", href: "#/hoc", icon: "📚", btn: "Mở Quần đảo Học Tập ➜" },
    { id: "mo-phong", name: "Đảo Thí Nghiệm & Mô Phỏng", sub: "Thí nghiệm, mô phỏng của tất cả các bài", kind: "lab", color: "#1fbf9a", href: "#/mo-phong", icon: "⚗️", btn: "Vào làm thí nghiệm ➜" },
    { id: "tro-choi", name: "Đảo Trò Chơi", sub: "Hack Mật Mã Mây · Đua khinh khí cầu", kind: "game", color: "#ff6aa8", href: "#/tro-choi", icon: "🎮", btn: "Vào Đảo Trò Chơi ➜" },
    { id: "vuon", name: "Đảo Vườn Mây", sub: "Gieo hạt · nhổ cỏ · Cô Mây trông vườn", kind: "garden", color: "#4fd69c", href: "#/vuon", icon: "🌱", btn: "Vào Vườn Mây ➜" },
    { id: "xuong", name: "Xưởng Mây", sub: "Lò Mây · Công trường xây nhà", kind: "workshop", color: "#ff7a3a", href: "#/lo-may", icon: "🔥", btn: "🔥 Vào Lò Mây" },
    { id: "giam", name: "Đảo Giam Giữ", sub: "Lười học hoặc gian lận sẽ bị giam ở đây", kind: "jail", color: "#7a7f94", href: "#/giam", icon: "🔒", btn: "Trả lời 5 câu để ra ➜" },
  ];
  const ZONES = ISLES.map((z, i) => {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / ISLES.length), r = z.kind === "study" ? 14 : 12.5;
    return { ...z, zone: z.name, r, angle: a, open: true, dir: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), pos: new THREE.Vector3(Math.cos(a) * RING, [1.5, -1, 2, 0.5, -1.5, 1, -2.5][i], Math.sin(a) * RING) };
  });
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); };
  ZONES.forEach((z, i) => {
    const isl = makeIsland(z.r, 13, z.kind === "garden" ? "#7fd667" : z.kind === "jail" ? "#9aa29a" : "#8ad66e"); isl.position.copy(z.pos); world.add(isl); z.group = isl;
    const lm = new THREE.Group(); lm.scale.setScalar(LS); lm.rotation.y = Math.atan2(-Math.cos(z.angle), -Math.sin(z.angle)); isl.add(lm); z.lm = lm;
    buildLandmark(z, lm);
    for (let k = 0; k < 6; k++) { const ta = k / 6 * Math.PI * 2 + 0.3; if (angDiff(ta, z.angle + Math.PI) < 0.7) continue; const rr = z.r * 0.84; const t = tree("#6cc04a", 0.8 + Math.random() * 0.3, k % 3 === 0); t.position.set(Math.cos(ta) * rr, 0, Math.sin(ta) * rr); isl.add(t); }
    const ring = mesh(new THREE.TorusGeometry(z.r - 0.4, 0.14, 8, 90), mat(z.color, { emissive: z.color, emissiveIntensity: 0.5 }), 0, 0.08, 0, false); ring.rotation.x = Math.PI / 2; isl.add(ring); z.ring = ring;
    isl.traverse(x => { if (x.userData.zoneIdx === undefined) x.userData.zoneIdx = i; });
    // lối đá từ quảng trường ra cầu
    for (let d = 11; d < CENTER_R - 0.5; d += 1.7) center.add(mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 14), mat("#e9e1f3"), z.dir.x * d, 0.06, z.dir.z * d, false));
  });
  anim.push(t => ZONES.forEach((z, k) => { z.ring.material.emissiveIntensity = (z.hot ? 0.9 : 0.35) + Math.sin(t * (z.hot ? 6 : 2) + k) * 0.25; }));
  const ZI = id => ZONES.findIndex(z => z.id === id);
  // các đảo nhỏ của từng bài, bay quanh Quần đảo Học Tập; bài chưa mở phủ sương
  const study = ZONES[ZI("hoc")], islets = [];
  o.zones.forEach((lz, k) => {
    const n = o.zones.length, a = study.angle + (k - (n - 1) / 2) * 0.22, R = RING + 23 + (k % 2) * 4;
    const pos = new THREE.Vector3(Math.cos(a) * R, study.pos.y + 3 + (k % 3) * 1.4, Math.sin(a) * R), open = o.isOpen(lz.id);
    const g = makeIsland(3.4, 5, open ? "#9be07f" : "#b9c7b0"); g.position.copy(pos); world.add(g);
    const lm = new THREE.Group(); lm.scale.setScalar(0.62); lm.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); g.add(lm);
    buildLandmark({ kind: KIND[lz.id] || "cotton" }, lm);
    if (!open) addFog(g, 3.4);
    g.traverse(x => { x.userData.lesson = lz.id; });
    islets.push({ z: lz, g, pos, open, base: pos.y, ph: k });
  });
  anim.push(t => islets.forEach(s => { s.g.position.y = s.base + Math.sin(t * 0.8 + s.ph) * 0.45; }));
  // cây quanh rìa quảng trường (tránh lối ra cầu)
  for (let k = 0; k < 26; k++) { const a = k / 26 * Math.PI * 2 + 0.12; if (ZONES.some(z => angDiff(a, z.angle) < 0.16)) continue; const rr = 21.5 + (k % 3) * 1.6; const t = tree("#6cc04a", 1 + (k % 4) * 0.15, k % 4 === 1); t.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); center.add(t); }
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + 0.4; if (ZONES.some(z => angDiff(a, z.angle) < 0.2)) continue; center.add(bush(Math.cos(a) * 18, Math.sin(a) * 18, 1.1, k % 2 ? "#6ccb52" : "#5fbf4a")); }
  function buildLandmark(z, g) {
    const add = m => (g.add(m), m);
    switch (z.kind) {
      case "cotton": [[-1.6, 0.6, 1, true], [1.4, -0.4, 1.1, false], [0, -1.8, 1.2, true], [-0.4, 1.2, 0.8, false]].forEach(([x, zz, s, p]) => { const t = tree("#ffffff", s, p); t.position.set(x, 0, zz); g.add(t); }); break;
      case "lake": {
        add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.12, 40), mat("#5ab8f5", { emissive: "#3b97d6", emissiveIntensity: 0.3, roughness: 0.15 }), 0, 0.02, 0, false));
        add(mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), mat("#e4f7ff", { transparent: true, opacity: 0.9, roughness: 0.1 }), -1, 0.55, 0.4)).rotation.y = 0.5;
        const drop = new THREE.Group(); drop.add(mesh(new THREE.SphereGeometry(0.55, 20, 16), mat("#6fc6ff", { roughness: 0.15 }))); drop.add(mesh(new THREE.ConeGeometry(0.47, 0.7, 20), mat("#6fc6ff", { roughness: 0.15 }), 0, 0.55, 0));
        drop.position.set(0.9, 1.3, -0.2); g.add(drop); anim.push(t => { drop.position.y = 1.3 + Math.sin(t * 2) * 0.2; });
        const puffs = [0, 1, 2].map(k => add(mesh(new THREE.SphereGeometry(0.35, 12, 8), mat("#ffffff", { transparent: true, opacity: 0.85 }).clone(), 0.2 + k * 0.4, 1, 1.2, false)));
        anim.push(t => puffs.forEach((p, k) => { const f = (t * 0.5 + k / 3) % 1; p.position.y = 0.5 + f * 2.6; p.material.opacity = 0.85 * (1 - f); p.scale.setScalar(0.6 + f); })); break;
      }
      case "wind": {
        add(mesh(new THREE.CylinderGeometry(0.55, 0.95, 4, 12), mat("#fbf6ee"), 0, 2, 0)); add(mesh(new THREE.ConeGeometry(0.9, 1.1, 12), mat("#ff8a6a"), 0, 4.5, 0));
        const bl = new THREE.Group(); bl.position.set(0, 3.6, 0.8);
        for (let k = 0; k < 4; k++) { const piv = new THREE.Group(); piv.rotation.z = k * Math.PI / 2; piv.add(mesh(new THREE.BoxGeometry(0.4, 2.4, 0.08), mat(k % 2 ? "#ffd84d" : "#ffffff"), 0, 1.2, 0)); bl.add(piv); }
        g.add(bl); anim.push((t, dt) => { bl.rotation.z -= dt * 1.2; }); break;
      }
      case "workshop": { g.add(house(3.4, 2.4, 2.8, "#f2a07a", "#8e8fa8", "#7a5232")); add(mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), mat("#b5655a"), 1, 3.6, -0.5)); [[2.3, 1], [2.6, 0.2], [-2.3, 1.2]].forEach(([x, zz]) => add(mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat("#d9a066"), x, 0.35, zz))); break; }
      case "mine":
        [[-1, 0, 0.9], [1.2, 0.6, 0.7], [0.2, -1.2, 1.1]].forEach(([x, zz, s]) => add(mesh(new THREE.DodecahedronGeometry(s), mat("#a9b2c8", { flatShading: true }), x, s * 0.7, zz)));
        [["#b79cff", -0.3, 0.6], ["#5fd3b4", 0.8, -0.4], ["#ff8fb8", -1.4, -0.9]].forEach(([c, x, zz]) => { const cr = add(mesh(new THREE.OctahedronGeometry(0.45), mat(c, { emissive: c, emissiveIntensity: 0.4, roughness: 0.25 }), x, 1.5, zz)); cr.scale.y = 1.6; anim.push(t => { cr.rotation.y = t; }); }); break;
      case "furnace": {
        add(mesh(new THREE.SphereGeometry(1.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#c9b8a6", { flatShading: true }), 0, 0, 0));
        add(mesh(new THREE.CircleGeometry(0.6, 20), mat("#ff7a2a", { emissive: "#ff6a1a", emissiveIntensity: 1.3 }), 0, 0.6, 1.55, false));
        const fl = add(mesh(new THREE.ConeGeometry(0.4, 1.2, 14), mat("#ffb43a", { emissive: "#ff8a1a", emissiveIntensity: 1.1, transparent: true, opacity: 0.9 }), 0, 2.1, 0, false));
        anim.push(t => { fl.scale.set(1 + Math.sin(t * 9) * 0.1, 1 + Math.sin(t * 7) * 0.2, 1); }); break;
      }
      case "kitchen": { const hs = house(3, 2.2, 2.6, "#fff1d6", "#ffb04d", "#c96a3a"); hs.position.z = -0.8; g.add(hs); for (let k = 0; k < 3; k++) { add(mesh(new THREE.BoxGeometry(0.9, 0.25, 1.8), mat("#a8774f"), -1.4 + k * 1.4, 0.12, 1.8)); add(mesh(new THREE.SphereGeometry(0.28, 10, 8), mat(["#7ee0b5", "#ff9f4d", "#f5e36a"][k]), -1.4 + k * 1.4, 0.45, 1.8)); } break; }
      case "colors": [["#ff8fb8", -1.3, 0.5], ["#ffd84d", 1.2, 0.7], ["#7cc8ff", 0, -1.2]].forEach(([c, x, zz]) => add(mesh(new THREE.CylinderGeometry(1, 1, 0.14, 28), mat(c, { emissive: c, emissiveIntensity: 0.3, roughness: 0.2 }), x, 0.04, zz, false))); break;
      case "filter": {
        add(mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 10), mat("#e7e2f2"), 0, 1.5, 0));
        add(mesh(new THREE.ConeGeometry(1.2, 1.6, 22, 1, true), mat("#d9f2ff", { side: THREE.DoubleSide, roughness: 0.15 }), 0, 3.6, 0)).rotation.x = Math.PI;
        const dp = add(mesh(new THREE.SphereGeometry(0.18, 10, 8), mat("#5ab8f5"), 0, 2.6, 0, false)); anim.push(t => { dp.position.y = 2.6 - ((t * 0.8) % 1) * 2.4; });
        add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 24), mat("#5ab8f5", { roughness: 0.2 }), 0, 0.1, 0, false)); break;
      }
      case "study": {
        const sc = house(4.4, 2.6, 3.4, "#fff3d6", "#ff9f4d", "#5aa35e"); sc.position.z = -0.8; g.add(sc);
        add(mesh(new THREE.BoxGeometry(1, 1.3, 1), mat("#fff3d6"), 0, 5, -0.8)); add(mesh(new THREE.ConeGeometry(0.9, 1, 4), mat("#ff7a5a"), 0, 6.15, -0.8)).rotation.y = Math.PI / 4;
        const bell = add(mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat("#ffd23f", { metalness: 0.4, roughness: 0.3 }), 0, 4.8, -0.25)); bell.rotation.x = Math.PI; anim.push(t => { bell.rotation.z = Math.sin(t * 3) * 0.3; });
        [-1, 1].forEach(sx => { const pg = add(mesh(new THREE.BoxGeometry(1.3, 0.1, 1.7), mat("#ffffff"), sx * 0.66, 0.55, 3)); pg.rotation.z = sx * -0.25; });
        add(mesh(new THREE.BoxGeometry(2.8, 0.14, 1.9), mat("#5bb8ff"), 0, 0.38, 3));
        add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), mat("#d6cfe6"), 3, 2, 1.6)); add(mesh(new THREE.BoxGeometry(1.2, 0.7, 0.04), mat("#ff8fb8"), 3.6, 3.6, 1.6)); break;
      }
      case "sim": {
        add(mesh(new THREE.CylinderGeometry(2, 2.2, 2.6, 28), mat("#eef0ff"), 0, 1.3, 0));
        add(mesh(new THREE.SphereGeometry(2, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat("#9c7cff", { metalness: 0.2, roughness: 0.4 }), 0, 2.6, 0));
        const tel = add(mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.6, 12), mat("#5a4f8a"), 0.8, 4, 0.6)); tel.rotation.set(0.6, 0, -0.5);
        const orbit = new THREE.Group(); orbit.position.set(0, 7, 0); g.add(orbit);
        [["#7fd0ff", 1], ["#ff8fb8", 1.5], ["#ffd23f", 2]].forEach(([c, r], k) => { for (let n = 0; n < 4; n++) { const b = mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(c, { emissive: c, emissiveIntensity: 0.6 }), Math.cos(n / 4 * Math.PI * 2) * r, 0, Math.sin(n / 4 * Math.PI * 2) * r, false); b.userData.k = k; orbit.add(b); } });
        anim.push(t => { orbit.children.forEach((b, n) => { const k = b.userData.k, r = [1, 1.5, 2][k], a = t * (1.6 - k * 0.4) + n; b.position.set(Math.cos(a) * r, Math.sin(t * 2 + n) * 0.2 * k, Math.sin(a) * r); }); }); break;
      }
      case "game": {
        const wheel = new THREE.Group(); wheel.position.set(0, 4, -1); g.add(wheel);
        [-0.35, 0.35].forEach(dz => wheel.add(mesh(new THREE.TorusGeometry(2.8, 0.1, 8, 40), mat("#ff6aa8"), 0, 0, dz, false)));
        for (let k = 0; k < 8; k++) { const sp = mesh(new THREE.BoxGeometry(0.08, 5.6, 0.08), mat("#ffffff"), 0, 0, 0, false); sp.rotation.z = k * Math.PI / 8; wheel.add(sp); }
        const cabs = [0, 1, 2, 3, 4, 5].map(k => { const c = mesh(new THREE.BoxGeometry(0.7, 0.6, 0.6), mat(["#ffd23f", "#7ee0b5", "#7cc8ff", "#b79cff", "#ff9f80", "#ff8fb8"][k])); g.add(c); return c; });
        [-1, 1].forEach(sx => { const lg = add(mesh(new THREE.BoxGeometry(0.25, 4.6, 0.25), mat("#9c7cff"), sx * 1.1, 2, -1)); lg.rotation.z = sx * 0.28; });
        anim.push(t => { wheel.rotation.z = t * 0.35; cabs.forEach((c, k) => { const a = t * 0.35 + k / 6 * Math.PI * 2; c.position.set(Math.cos(a) * 2.8, 4 + Math.sin(a) * 2.8 - 0.4, -1); }); });
        const bal = new THREE.Group(); bal.position.set(3.4, 5.5, 2); g.add(bal);
        bal.add(mesh(new THREE.SphereGeometry(1, 18, 14), mat("#ffd23f"), 0, 1, 0)); bal.add(mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), mat("#b9825a"), 0, -0.3, 0));
        anim.push(t => { bal.position.y = 5.5 + Math.sin(t) * 0.5; });
        ["#ff6aa8", "#7cc8ff", "#ffd23f"].forEach((c, k) => add(mesh(new THREE.ConeGeometry(0.9, 1.6, 16), mat(c), -3.4 + k * 0.4, 0.8, 2.6 - k * 1.4))); break;
      }
      case "garden": {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { add(mesh(new THREE.BoxGeometry(1.5, 0.35, 1.5), mat("#a8774f"), -2.7 + c * 1.8, 0.17, -2.6 + r * 1.8));
          add(mesh(new THREE.SphereGeometry(0.32, 10, 8), mat(["#ff8fb8", "#ffd23f", "#7ee0b5", "#ff9f4d"][(r + c) % 4]), -2.7 + c * 1.8, 0.62, -2.6 + r * 1.8)); }
        const arch = add(mesh(new THREE.TorusGeometry(1.8, 0.15, 8, 30, Math.PI), mat("#7ee0b5", { emissive: "#4fd69c", emissiveIntensity: 0.3 }), 0, 0, 3.6));
        for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; if (Math.abs(Math.sin(a)) > 0.9 && Math.sin(a) > 0) continue; add(mesh(new THREE.SphereGeometry(0.34, 10, 8), mat("#ffffff"), Math.cos(a) * 5.4, 0.35, Math.sin(a) * 5.4)); }
        const gh = add(mesh(new THREE.BoxGeometry(2, 1.4, 1.5), mat("#e8fbff", { transparent: true, opacity: 0.6, roughness: 0.1 }), 3.6, 0.7, -3.6)); break;
      }
      case "workshop": {
        const cot = house(5.2, 3, 4, "#f6ead2", "#6fbf4f", "#ff7a2a"); cot.position.z = -2.6; g.add(cot); cot.traverse(x => x.userData.action = "kiln");
        const door = cot.userData.door; door.material = new THREE.MeshStandardMaterial({ color: "#ff8a3a", emissive: "#ff6a1a", emissiveIntensity: 0.9 });
        anim.push(t => { door.material.emissiveIntensity = 0.7 + Math.sin(t * 6) * 0.2; });
        add(mesh(new THREE.BoxGeometry(0.8, 1.8, 0.8), mat("#c8b49a"), 1.6, 4.6, -3.4));
        const smoke = [0, 1, 2, 3].map(() => add(mesh(new THREE.SphereGeometry(0.45, 12, 8), mat("#ffffff", { transparent: true, opacity: 0.8 }).clone(), 1.6, 5.6, -3.4, false)));
        anim.push(t => smoke.forEach((sm, k) => { const f = (t * 0.35 + k / 4) % 1; sm.position.set(1.6 + f, 5.6 + f * 3.2, -3.4 - f * 0.4); sm.scale.setScalar(0.6 + f * 1.4); sm.material.opacity = 0.8 * (1 - f); }));
        const crane = new THREE.Group(); crane.position.set(-5, 0, -3.6); g.add(crane);
        crane.add(mesh(new THREE.BoxGeometry(0.3, 4.4, 0.3), mat("#ffcf3a"), 0, 2.2, 0)); crane.add(mesh(new THREE.BoxGeometry(3.4, 0.25, 0.25), mat("#ffcf3a"), 1.2, 4.3, 0));
        anim.push(t => { crane.rotation.y = Math.sin(t * 0.4) * 0.8; });
        PLOTS.forEach(([x, zz]) => { const lot = add(mesh(new THREE.BoxGeometry(2.6, 0.1, 2.6), mat("#d9b88a"), x, 0.05, zz, false)); lot.userData.action = "build";
          [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([dx, dz]) => add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), mat("#ff9b73"), x + dx, 0.3, zz + dz))); });
        break;
      }
      case "jail": {
        for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), mat("#5a5f73", { metalness: 0.7, roughness: 0.35 }), Math.cos(a) * 2.4, 1.6, Math.sin(a) * 2.4)); }
        [0.15, 3.1].forEach(y => { const r = add(mesh(new THREE.TorusGeometry(2.4, 0.1, 8, 40), mat("#5a5f73", { metalness: 0.7 }), 0, y, 0)); r.rotation.x = Math.PI / 2; });
        add(mesh(new THREE.ConeGeometry(2.8, 1.4, 14), mat("#4a4f60"), 0, 3.8, 0));
        add(mesh(new THREE.BoxGeometry(0.8, 1.1, 0.3), mat("#ffd23f", { metalness: 0.5 }), 0, 1.2, 2.5));
        [[-3.4, -2], [3.2, -2.4], [-2.6, 2.8]].forEach(([x, zz]) => add(mesh(new THREE.DodecahedronGeometry(0.6), mat("#8a8f9e", { flatShading: true }), x, 0.4, zz)));
        const rc = new THREE.Group(); rc.position.set(0, 7.5, 0); g.add(rc); [[0, 0, 1.1], [1, -0.1, 0.8], [-1, -0.1, 0.8]].forEach(([x, y, r]) => rc.add(mesh(new THREE.SphereGeometry(r, 14, 10), mat("#7d8296"), x, y, 0, false)));
        const drops = [...Array(8)].map((_, k) => { const d = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), mat("#9fdcff"), -1.2 + (k % 4) * 0.8, 6.5, (k > 3 ? 0.4 : -0.4), false); g.add(d); return d; });
        anim.push(t => drops.forEach((d, k) => { d.position.y = 6.6 - ((t * 1.2 + k / 8) % 1) * 5; })); break;
      }
      case "lab": {
        add(mesh(new THREE.CylinderGeometry(2.6, 2.8, 2.2, 28), mat("#f4f1ff"), 0, 1.1, 0));
        add(mesh(new THREE.SphereGeometry(2.6, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat("#bff0ff", { transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1 }), 0, 2.2, 0));
        add(mesh(new THREE.BoxGeometry(1, 1.6, 0.2), mat("#1fbf9a", { emissive: "#1fbf9a", emissiveIntensity: 0.4 }), 0, 0.8, 2.7));
        const cols = ["#ff6aa8", "#5bb8ff", "#ffcf3a", "#4fd69c"];
        cols.forEach((c, k) => { const a = k / 4 * Math.PI * 2 + 0.4, x = Math.cos(a) * 3.6, zz = Math.sin(a) * 3.6;
          add(mesh(new THREE.SphereGeometry(0.55, 16, 12), mat("#e9f6ff", { transparent: true, opacity: 0.5, roughness: 0.05 }), x, 0.55, zz));
          add(mesh(new THREE.SphereGeometry(0.42, 16, 12), mat(c, { emissive: c, emissiveIntensity: 0.6 }), x, 0.45, zz));
          add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 10), mat("#e9f6ff", { transparent: true, opacity: 0.6 }), x, 1.2, zz));
          const b = add(mesh(new THREE.SphereGeometry(0.12, 8, 6), mat("#ffffff", { transparent: true, opacity: 0.9 }).clone(), x, 1.5, zz, false));
          anim.push(t => { const f = (t * 0.7 + k / 4) % 1; b.position.y = 1.5 + f * 2; b.material.opacity = 0.9 * (1 - f); }); });
        const ringA = add(mesh(new THREE.TorusGeometry(1.2, 0.07, 8, 48), mat("#9c7cff", { emissive: "#9c7cff", emissiveIntensity: 0.8 }), 0, 6, 0, false));
        const ringB = add(mesh(new THREE.TorusGeometry(0.9, 0.07, 8, 48), mat("#1fbf9a", { emissive: "#1fbf9a", emissiveIntensity: 0.8 }), 0, 6, 0, false));
        anim.push(t => { ringA.rotation.set(t, t * 0.7, 0); ringB.rotation.set(-t * 0.8, 0, t); }); break;
      }
    }
  }
  function addFog(g, r) {
    const fm = new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.55, roughness: 1, depthWrite: false });
    const fog = new THREE.Group();
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, rr = r * (0.25 + Math.random() * 0.6); const s = new THREE.Mesh(new THREE.SphereGeometry(1.9 + Math.random() * 1.3, 14, 10), fm); s.position.set(Math.cos(a) * rr, 1.5 + Math.random() * 1.8, Math.sin(a) * rr); fog.add(s); }
    g.add(fog); anim.push(t => { fog.rotation.y = t * 0.08; }); return fog;
  }
  // ======================= cầu =======================
  const bridgeGroup = new THREE.Group(); world.add(bridgeGroup);
  ZONES.forEach(z => {
    const s = z.dir.clone().multiplyScalar(CENTER_R - 0.2), e = z.pos.clone().sub(z.dir.clone().multiplyScalar(z.r - 0.3));
    const N = 40; z.bridge = [];
    for (let k = 0; k <= N; k++) { const t = k / N; const p = s.clone().lerp(e, t); p.y = THREE.MathUtils.lerp(0, z.pos.y, t) + Math.sin(Math.PI * t) * 3 + 0.12; z.bridge.push(p); }
    const side = new THREE.Vector3().crossVectors(z.dir, new THREE.Vector3(0, 1, 0)).normalize();
    const wood = mat("#c99a6b"), post = mat("#a7764c"), rope = mat(z.open ? z.color : "#d9d3e6");
    for (let k = 0; k < N; k++) {
      const a = z.bridge[k], b = z.bridge[k + 1];
      const pl = mesh(new THREE.BoxGeometry(2.2, 0.14, a.distanceTo(b) * 0.85), wood);
      pl.position.copy(a).add(b).multiplyScalar(0.5); pl.position.y -= 0.12; pl.lookAt(b.x, b.y - 0.12, b.z); pl.userData.walk = true; bridgeGroup.add(pl);
      if (k % 4 === 0) [-1, 1].forEach(sg => { const p = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.9, 6), post); p.position.copy(a).addScaledVector(side, sg * 1.05); p.position.y += 0.3; bridgeGroup.add(p); });
    }
    [-1, 1].forEach(sg => { const pts = z.bridge.map(p => p.clone().addScaledVector(side, sg * 1.05).add(new THREE.Vector3(0, 0.72, 0))); bridgeGroup.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N + 20, 0.07, 6), rope, 0, 0, 0, false)); });
  });

  // ======================= bầu trời sinh động =======================
  const clouds = [], cloudMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, opacity: 0.95 });
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Group(), n = 4 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(2.2 + Math.random() * 2.2, 14, 10), cloudMat); s.position.set(k * 2.8 - n * 1.4, Math.random() * 1.4, Math.random() * 2.5); c.add(s); }
    const low = i < 15;
    c.position.set((Math.random() - 0.5) * 340, low ? -24 - Math.random() * 14 : 18 + Math.random() * 24, (Math.random() - 0.5) * 300);
    c.scale.setScalar(low ? 2 : 1.2); c.userData.v = 0.6 + Math.random() * 0.8; scene.add(c); clouds.push(c);
  }
  const balloons = [0, 1, 2].map(i => {
    const b = new THREE.Group(); const cols = [["#ff7eb6", "#ffd23f"], ["#5bb8ff", "#ffffff"], ["#9c7cff", "#7ee0b5"]][i];
    b.add(mesh(new THREE.SphereGeometry(2.4, 20, 16), mat(cols[0]), 0, 3, 0)); b.add(mesh(new THREE.SphereGeometry(2.42, 20, 16, 0, Math.PI * 2, 1.2, 0.5), mat(cols[1]), 0, 3, 0));
    b.add(mesh(new THREE.BoxGeometry(1.1, 0.8, 1.1), mat("#b9825a"), 0, 0, 0)); scene.add(b);
    b.userData = { r: 70 + i * 22, a: i * 2.1, y: 22 + i * 7, v: 0.03 + i * 0.01 }; return b;
  });
  const sparkG = new THREE.BufferGeometry(), sp = new Float32Array(300 * 3);
  for (let i = 0; i < 300; i++) { sp[i * 3] = (Math.random() - 0.5) * 140; sp[i * 3 + 1] = Math.random() * 30 + 1; sp[i * 3 + 2] = (Math.random() - 0.5) * 140; }
  sparkG.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const sparks = new THREE.Points(sparkG, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.8 })); scene.add(sparks);
  const birds = [0, 1, 2, 3, 4].map(i => { const b = new THREE.Group(); [-1, 1].forEach(s => { const w = mesh(new THREE.BoxGeometry(0.9, 0.06, 0.3), mat("#ffffff"), s * 0.45, 0, 0, false); w.rotation.z = s * 0.3; b.add(w); }); scene.add(b); b.userData = { r: 30 + i * 9, a: i, y: 14 + i * 2 }; return b; });

  // ======================= nhân vật =======================
  function eyes(g, y, z, gap = 0.16, r = 0.06) { [-1, 1].forEach(s => { g.add(mesh(new THREE.SphereGeometry(r, 8, 6), mat("#2b2238"), s * gap, y, z, false)); g.add(mesh(new THREE.SphereGeometry(r * 0.35, 6, 4), mat("#ffffff"), s * gap + 0.02, y + 0.02, z + r * 0.8, false)); }); }
  function cheeks(g, y, z, gap = 0.26) { [-1, 1].forEach(s => { const c = mesh(new THREE.SphereGeometry(0.07, 8, 6), mat("#ffadc6"), s * gap, y, z, false); c.scale.set(1.3, 0.7, 0.5); g.add(c); }); }
  function makeTiNi() { const g = new THREE.Group(), m = mat("#ffffff", { roughness: 0.9, emissive: "#dfe8ff", emissiveIntensity: 0.18 }); [[0, 0, 0, 0.45], [0.35, -0.05, 0, 0.32], [-0.35, -0.05, 0, 0.32], [0.15, 0.25, -0.05, 0.3], [-0.18, 0.22, -0.05, 0.28]].forEach(([x, y, z, r]) => g.add(mesh(new THREE.SphereGeometry(r, 16, 12), m, x, y, z))); eyes(g, 0.02, 0.4, 0.14, 0.055); cheeks(g, -0.1, 0.38, 0.28); return g; }
  function makeDroplet() { const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const m = mat("#8fd3ff", { roughness: 0.25 }); body.add(mesh(new THREE.SphereGeometry(0.55, 18, 14), m, 0, 0.6, 0)); body.add(mesh(new THREE.ConeGeometry(0.47, 0.75, 18), m, 0, 1.25, 0)); body.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 20), mat("#7ee0b5"), 0, 1.2, 0)); body.add(mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.35, 16), mat("#7ee0b5"), 0, 1.4, 0)); eyes(body, 0.68, 0.48, 0.15, 0.06); cheeks(body, 0.55, 0.46, 0.3); g.userData = { body, legs: [] }; return g; }
  function chibiNpc(av, extra) { const g = makeKid(THREE, av); const body = g.userData.body; extra && extra(body); g.userData.legs = []; return g; }
  function makeBuilder() { return chibiNpc({ gender: "nu", skin: 1, hair: 1, hairStyle: "duoingua", shirt: 3, hat: "luoitrai", outfit: "hoodiecao", shoe: "ung", bag: "deocheo" }, b => {
    b.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), mat("#8a5a3c"), 0.5, 0.75, 0.25)); b.add(mesh(new THREE.BoxGeometry(0.28, 0.12, 0.12), mat("#9aa4b8"), 0.5, 1.05, 0.25)); }); }
  function makeElder() { return chibiNpc({ gender: "nam", skin: 0, hair: 5, hairStyle: "ngan", shirt: 4, acc: "kinh", outfit: "hoodiegau", shoe: "thethao" }, b => {
    const beard = mesh(new THREE.SphereGeometry(0.3, 14, 10), mat("#f4f4f8"), 0, 1.5, 0.48); beard.scale.set(1.1, 0.75, 0.5); b.add(beard);
    b.add(mesh(new THREE.BoxGeometry(0.5, 0.36, 0.1), mat("#ff8fb8"), -0.45, 0.85, 0.42)); b.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), mat("#9a6a45"), 0.6, 0.8, 0.2)); }); }
  function makeBuilderOld() { const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.add(mesh(new THREE.CapsuleGeometry(0.42, 0.5, 6, 14), mat("#d9c9ff"), 0, 0.75, 0)); body.add(mesh(new THREE.SphereGeometry(0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#ffd23f"), 0, 1.25, 0)); body.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 20), mat("#ffd23f"), 0, 1.25, 0)); eyes(body, 0.95, 0.38, 0.14, 0.055); cheeks(body, 0.83, 0.36, 0.27); const hm = new THREE.Group(); hm.position.set(0.5, 0.7, 0.1); hm.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), mat("#9a6a45"), 0, 0.2, 0)); hm.add(mesh(new THREE.BoxGeometry(0.3, 0.16, 0.16), mat("#8e8fa8"), 0, 0.5, 0)); body.add(hm); g.userData = { body, legs: [] }; return g; }
  function makeElderOld() { // Ông Kể Chuyện cũ (đám mây)
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const m = mat("#eef1f8", { roughness: 0.95 });
    [[0, 1, 0, 0.6], [0.4, 0.9, 0, 0.42], [-0.4, 0.9, 0, 0.42], [0, 1.45, -0.05, 0.42]].forEach(([x, y, z, r]) => body.add(mesh(new THREE.SphereGeometry(r, 16, 12), m, x, y, z)));
    eyes(body, 1.12, 0.55, 0.16, 0.055); const beard = mesh(new THREE.ConeGeometry(0.32, 0.6, 14), mat("#ffffff"), 0, 0.7, 0.45); beard.rotation.x = Math.PI; body.add(beard);
    body.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), mat("#9a6a45"), 0.75, 0.8, 0.2)); body.add(mesh(new THREE.BoxGeometry(0.5, 0.36, 0.1), mat("#ff8fb8"), -0.55, 0.9, 0.45));
    g.userData = { body, legs: [] }; return g;
  }

  const labelsEl = $("#labels");
  const mk = (cls, text = "") => { const e = document.createElement("div"); e.className = cls; e.textContent = text; labelsEl.append(e); return e; };
  const START = new THREE.Vector3(0, 0, 8);
  const player = new THREE.Group(); world.add(player);
  let kid = makeKid(THREE, me.avatar); player.add(kid);
  const standAt = z => z.pos.clone().sub(z.dir.clone().multiplyScalar(z.r - 2.2));
  let startAt = null; try { const s = sessionStorage.getItem("kvtm-m3d-here"); if (s && s !== "center" && ZONES[+s]) startAt = +s; } catch {}
  const inJail = () => o.jailed && o.jailed();
  if (inJail()) startAt = ZONES.findIndex(z => z.kind === "jail");
  if (inJail()) { const J = ZONES[startAt]; player.position.set(J.pos.x, J.pos.y, J.pos.z); player.rotation.y = 0; }
  else if (startAt !== null) { player.position.copy(standAt(ZONES[startAt])); player.rotation.y = Math.atan2(-ZONES[startAt].dir.x, -ZONES[startAt].dir.z); }
  else { player.position.copy(START); player.rotation.y = Math.PI; }
  const myTag = mk("tag3d me", me.name), myBub = mk("bub"); myBub.style.opacity = 0;
  // thú cưng đi theo
  const PET_C = { ga: ["#ffe066", "#ff9f40"], tho: ["#ffffff", "#ffb3cc"], meo: ["#ffb347", "#ffffff"], cun: ["#c8a07a", "#7a4f2c"], kl: ["#7ee0b5", "#3f9f73"], rong: ["#b79cff", "#ffd23f"] };
  function makePet(k, st = 0) { // st: 0 em bé, 1 thiếu niên, 2 lớn khỏe, 3 trưởng thành — hình dạng thay đổi theo tuổi
    const root = new THREE.Group(), g = new THREE.Group(); root.add(g); const [c1, c2] = PET_C[k] || PET_C.meo, T = (c) => new THREE.MeshToonMaterial({ color: c });
    const legH = [0, 0.14, 0.26, 0.32][st]; g.position.y = legH;
    const bd = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), T(c1)); bd.scale.set(1, 0.85, 1.15); bd.position.y = 0.32; g.add(bd);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), T(c1)); hd.position.set(0, 0.68, 0.22); g.add(hd);
    [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), T("#2b2238")); e.position.set(s * 0.1, 0.72, 0.45); g.add(e);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.017, 6, 4), new THREE.MeshBasicMaterial({ color: "#fff" })); hl.position.set(s * 0.1 + 0.015, 0.74, 0.49); g.add(hl);
      let ear; if (k === "tho") { ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), T(c1)); ear.position.set(s * 0.1, 1.0, 0.18); }
      else if (k === "meo" || k === "rong") { ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 8), T(k === "rong" ? c2 : c1)); ear.position.set(s * 0.15, 0.92, 0.2); }
      else if (k === "cun") { ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), T(c2)); ear.scale.set(0.6, 1.3, 0.5); ear.position.set(s * 0.25, 0.66, 0.2); }
      if (ear) g.add(ear);
      if (k === "rong") { const w = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), T(c2)); w.scale.set(1, 0.5, 0.15); w.position.set(s * 0.35, 0.5, -0.05); w.rotation.y = s * 0.5; g.add(w); } });
    if (k === "ga") { const b = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), T(c2)); b.rotation.x = Math.PI / 2; b.position.set(0, 0.66, 0.5); g.add(b); }
    else { const n = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), T("#ff7a9a")); n.position.set(0, 0.66, 0.48); g.add(n); }
    if (k === "kl") for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 6), T(c2)); sp.position.set(0, 0.62 - i * 0.05, 0.05 - i * 0.14); g.add(sp); }
    const tl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), T(k === "tho" ? "#ffffff" : c2)); tl.position.set(0, 0.36, -0.4); g.add(tl);
    // đầu to khi bé, thân dài và chân cao khi lớn
    const [hs, bl] = [[1.25, 0.85], [1.05, 1.05], [0.92, 1.25], [0.88, 1.35]][st]; bd.scale.set(1, 0.85, 1.15 * bl); hd.scale.setScalar(hs);
    // chân theo đúng loài: gà 2 chân mảnh, khủng long 2 chân sau to + 2 tay ngắn, rồng không chân (bay lơ lửng), còn lại 4 chân
    const LEGS = { ga: [[-0.1, 0], [0.1, 0]], kl: [[-0.2, -0.12], [0.2, -0.12]], rong: [] }[k] || [[-0.17, 0.2], [0.17, 0.2], [-0.17, -0.22], [0.17, -0.22]];
    const thin = k === "ga", thick = k === "kl";
    if (st > 0) LEGS.forEach(([x, z]) => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(thin ? 0.025 : thick ? 0.11 : 0.07, thin ? 0.025 : thick ? 0.12 : 0.08, legH + 0.12, 8), T(thin ? "#ff9f40" : c1)); lg.position.set(x, legH / 2 - 0.02, z * bl); root.add(lg); const ft = new THREE.Mesh(new THREE.SphereGeometry(thin ? 0.06 : thick ? 0.12 : 0.085, 8, 6), T(thin ? "#ff9f40" : c2)); ft.scale.y = 0.5; ft.position.set(x, 0.03, z * bl + 0.05); root.add(ft); });
    if (k === "kl" && st > 0) [-1, 1].forEach(sd => { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.12, 3, 6), T(c1)); arm.position.set(sd * 0.22, 0.42, 0.25); arm.rotation.x = -0.9; g.add(arm); });
    if (k === "ga") [-1, 1].forEach(sd => { const w = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), T(c1)); w.scale.set(0.35, 0.7, 1); w.position.set(sd * 0.3, 0.36, -0.02); g.add(w); });
    if (k === "ga" && st >= 2) { const comb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), T("#ff4a4a")); comb.scale.set(0.6, 1, 1.4); comb.position.set(0, 0.93, 0.22); g.add(comb); }
    if (k === "rong") { g.position.y = 0.55 + st * 0.1; // rồng bay: thân dài uốn lượn, sừng, cánh lớn dần
      for (let i = 1; i <= 2 + st; i++) { const sg = new THREE.Mesh(new THREE.SphereGeometry(0.22 - i * 0.03, 10, 8), T(i % 2 ? c1 : c2)); sg.position.set(Math.sin(i) * 0.08, 0.32 - i * 0.04, -0.3 - i * 0.22); g.add(sg); }
      if (st >= 1) [-1, 1].forEach(sd => { const hn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18 + st * 0.04, 6), T("#ffd23f")); hn.position.set(sd * 0.08, 0.95, 0.15); hn.rotation.x = -0.4; g.add(hn); });
      g.children.forEach(c => { if (c.scale.z === 0.15) c.scale.set(1 + st * 0.35, 0.5 + st * 0.1, 0.15); }); }
    if (k === "rong") tl.visible = false; else if (st >= 2) { tl.scale.set(1.4, 1.4, 3); tl.position.z = -0.45 * bl; }
    if (st >= 1) { const col = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 20), T(st >= 3 ? "#ff4a6a" : "#7cc8ff")); col.rotation.x = Math.PI / 2 + 0.4; col.position.set(0, 0.52, 0.2); g.add(col); }
    if (st >= 3) { const bell = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshToonMaterial({ color: "#ffd23f", emissive: "#ffb400", emissiveIntensity: 0.4 })); bell.position.set(0, 0.42, 0.36); g.add(bell);
      const cr = new THREE.Group(); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), T("#ffd23f")); sp.position.set(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12); cr.add(sp); }
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 16), T("#ffd23f")); band.rotation.x = Math.PI / 2; band.position.y = -0.05; cr.add(band); cr.position.set(0, 0.98, 0.2); g.add(cr); }
    root.userData.body = bd; root.scale.setScalar(0.85); return root;
  }
  let pet = null, petKind = "";
  function syncPet() { const k0 = o.pet ? o.pet() : "", st = o.petStage ? o.petStage() : 0, k = k0 ? k0 + ":" + st : ""; if (pet && o.petScale) pet.scale.setScalar(0.85 * o.petScale()); if (k === petKind) return; const old = pet && pet.position.clone(); petKind = k; if (pet) world.remove(pet); pet = k0 ? makePet(k0, st) : null; if (pet && old) { world.add(pet); pet.position.copy(old); if (o.petScale) pet.scale.setScalar(0.85 * o.petScale()); return; } if (pet) { world.add(pet); pet.position.copy(player.position).add(new THREE.Vector3(1, 0, 1)); } }
  syncPet();
  const tini = makeTiNi(); world.add(tini); tini.position.copy(player.position).add(new THREE.Vector3(-1, 2.2, 0));

  const randomSpot = () => { for (;;) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 14; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (!blocked(x, z) && Math.hypot(x, z) > 3) return new THREE.Vector3(x, 0, z); } };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const islandPoint = (id, lx, lz) => { const z = ZONES[ZI(id)]; return V(lx, 0, lz).multiplyScalar(LS).applyAxisAngle(V(0, 1, 0), z.lm.rotation.y).add(z.pos); };
  function makeCoMay() { // Cô Mây trông vườn: mây trắng, nón rơm, bình tưới
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const m = mat("#ffffff", { roughness: 0.95, emissive: "#e8eeff", emissiveIntensity: 0.18 });
    [[0, 1, 0, 0.55], [0.4, 0.85, 0, 0.38], [-0.4, 0.85, 0, 0.38], [0, 1.4, -0.05, 0.4], [0, 0.5, 0, 0.42]].forEach(([x, y, z, r]) => body.add(mesh(new THREE.SphereGeometry(r, 14, 10), m, x, y, z)));
    eyes(body, 1.15, 0.5, 0.15, 0.055); cheeks(body, 1.03, 0.48, 0.28);
    body.add(mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.05, 20), mat("#f2c46a"), 0, 1.75, 0)); body.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.34, 18), mat("#f2c46a"), 0, 1.92, 0)); body.add(mesh(new THREE.CylinderGeometry(0.51, 0.51, 0.09, 18), mat("#ff8fb8"), 0, 1.8, 0));
    body.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.38, 12), mat("#7cc8ff", { metalness: 0.3, roughness: 0.4 }), 0.65, 0.8, 0.25));
    g.userData = { body, legs: [] }; return g;
  }
  const npcs = [
    { o: makeDroplet(), name: "Bác Giọt Sương", home: V(3.4, 0, 4.4), lines: ["Cỏ dại mọc ở quảng trường kìa! Trả lời đúng ngay là +5 điểm.", "Cỏ dại hỏi bài cô đã mở đó nha!", "Giọt sương là hơi nước ngưng tụ đấy."], act: () => o.onNav("#/giot-suong") },
    { o: makeCoMay(), name: "Cô Mây", home: islandPoint("vuon", 0, 4.6), lines: ["Cô tưới cây mỗi ngày đó!", "Học xong hạt giống thì mang ra vườn gieo nhé.", "Nhổ cỏ dại để cây lớn nhanh hơn!"], act: () => o.onNav("#/vuon") },
    { o: makeBuilder(), name: "Cô Thợ Mây", home: islandPoint("xuong", 1.8, 4.6), lines: ["Cát nung chảy thành thủy tinh đó!", "Gạch, kính, thép làm ở Lò Mây.", "Cửa sổ cần vật liệu trong suốt."], act: () => o.onNav("#/xay-nha") },
    { o: makeElder(), name: "Ông Kể Chuyện", home: V(8, 0, 7.4), lines: ["Lại đây ông kể chuyện cho nghe!", "Chuyện hôm nay hay lắm đấy.", "Nghe xong có câu đố nhé!"], act: () => story() },
  ];
  npcs.forEach((n, k) => { n.o.scale.setScalar(1.15); world.add(n.o); n.o.position.copy(n.home); n.target = n.home.clone(); n.wait = 1 + k * 2; n.say = -2 - k * 3; n.bub = mk("bub"); n.bub.style.opacity = 0; n.tag = mk("tag3d", n.name); n.o.traverse(x => x.userData.npc = k); });
  const story = () => tellStory({ openIds: o.openIds ? o.openIds() : [], aiMode: o.aiMode });
  // các bạn online
  const others = new Map();
  function addOther(p) {
    if (others.has(p.id)) return;
    const g = new THREE.Group(); const m = makeKid(THREE, p.avatar); g.add(m); world.add(g);
    const pos = new THREE.Vector3(p.x ?? 0, p.y ?? 0, p.z ?? 0); if (p.x == null) pos.copy(randomSpot()); g.position.copy(pos);
    others.set(p.id, { g, m, name: p.name, target: pos.clone(), ry: p.ry || 0, tag: mk("tag3d", p.name), bub: mk("bub") }); updateOnline();
  }
  function removeOther(id) { const x = others.get(id); if (!x) return; world.remove(x.g); x.tag.remove(); x.bub.remove(); others.delete(id); updateOnline(); }
  function updateOnline() { $("#online").textContent = `${others.size + 1} bạn trong vương quốc`; }

  // ======================= nhà đã xây trên các lô đất của Xưởng Mây =======================
  const houseGroup = new THREE.Group(); ZONES[ZI("xuong")].lm.add(houseGroup);
  function buildHouses() {
    houseGroup.clear();
    (o.houses() || []).slice(-4).forEach((hs, i) => {
      const [x, z] = PLOTS[i], p = hs.parts || {};
      const g = house(2.2, 1.5, 1.9, MAT_COLOR[p.tuong] || "#f6ead2", MAT_COLOR[p.mai] || "#d96f45", MAT_COLOR[p.cua] || "#c99a6b", MAT_COLOR[p.cua_so] || "#bfe8ff");
      g.position.set(x, 0.1, z); houseGroup.add(g);
      if (p.loi_day && p.vo_day) houseGroup.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), mat("#fff3b0", { emissive: "#ffd23f", emissiveIntensity: 1.4 }), x, 2.7, z, false));
      g.traverse(c => c.userData.action = "build");
    });
  }
  buildHouses();
  // ======================= cỏ dại ở quảng trường =======================
  const pweeds = new Map(), pwGroup = new THREE.Group(); center.add(pwGroup);
  const hashId = s => { let x = 7; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
  function weedMesh() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.IcosahedronGeometry(0.55, 0), mat("#8a5cc7", { flatShading: true }), 0, 0.6, 0));
    for (let k = 0; k < 7; k++) { const sp = mesh(new THREE.ConeGeometry(0.12, 0.6, 5), mat("#6c3fb0")); const a = k / 7 * Math.PI * 2; sp.position.set(Math.cos(a) * 0.45, 0.75, Math.sin(a) * 0.45); sp.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(sp); }
    eyes(g, 0.7, 0.5, 0.18, 0.08);
    [-1, 1].forEach(sx => { const b = mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), mat("#2f2346"), sx * 0.18, 0.85, 0.52); b.rotation.z = sx * 0.4; g.add(b); });
    return g;
  }
  function syncWeeds() {
    const list = o.plazaWeeds ? o.plazaWeeds() : [], ids = new Set(list.map(w => w.id));
    pweeds.forEach((v, id) => { if (!ids.has(id)) { pwGroup.remove(v.m); pweeds.delete(id); } });
    list.forEach(w => {
      if (pweeds.has(w.id)) return;
      const hs = hashId(w.id); let x = 0, z = 0;
      for (let t = 0; t < 14; t++) { const a = (hs % 3600) / 3600 * Math.PI * 2 + t * 0.9, r = 11.5 + ((hs >>> 12) % 800) / 100; x = Math.cos(a) * r; z = Math.sin(a) * r; if (!blocked(x, z) && ZONES.every(zz => angDiff(Math.atan2(z, x), zz.angle) > 0.12)) break; }
      const m = weedMesh(); m.position.set(x, 0, z); m.traverse(c => { c.userData.pweed = w.id; }); pwGroup.add(m);
      pweeds.set(w.id, { m, pos: new THREE.Vector3(x, 0, z) });
    });
  }
  anim.push(t => { let k = 0; pweeds.forEach(v => { v.m.rotation.z = Math.sin(t * 4 + k) * 0.12; v.m.position.y = Math.abs(Math.sin(t * 3 + k++)) * 0.1; }); });
  syncWeeds();
  const weedAct = id => () => o.onPlazaWeed && o.onPlazaWeed(id);

  // ======================= đi lại =======================
  function bridgeHit(p) {
    let best = null;
    ZONES.forEach((z, i) => { const B = z.bridge; for (let k = 0; k < B.length - 1; k++) {
      const a = B[k], b = B[k + 1], abx = b.x - a.x, abz = b.z - a.z, L = abx * abx + abz * abz;
      let t = ((p.x - a.x) * abx + (p.z - a.z) * abz) / L; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(p.x - (a.x + abx * t), p.z - (a.z + abz * t));
      if (d < 1.05 && (!best || d < best.d)) best = { type: "b", i, k, d, y: a.y + (b.y - a.y) * t - 0.05 };
    } });
    return best;
  }
  function regionOf(p) {
    if (Math.hypot(p.x, p.z) <= CENTER_R - 0.6) return { type: "c", y: 0 };
    for (let i = 0; i < ZONES.length; i++) { const z = ZONES[i]; if (Math.hypot(p.x - z.pos.x, p.z - z.pos.z) <= z.r - 0.6) return { type: "z", i, y: z.pos.y }; }
    return bridgeHit(p);
  }
  const JI = ZONES.findIndex(z => z.kind === "jail");
  const canStand = p => { const r = regionOf(p); if (r && o.jailed && o.jailed() && !(r.type === "z" && r.i === JI && Math.hypot(p.x - ZONES[JI].pos.x, p.z - ZONES[JI].pos.z) < 1.9)) return null; return r && !(r.type === "c" && blocked(p.x, p.z)) ? r : null; };
  function ringArc(a0, a1) {
    let d = a1 - a0; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    const n = Math.max(1, Math.ceil(Math.abs(d) / 0.08)), pts = [];
    for (let k = 0; k <= n; k++) { const a = a0 + d * k / n; pts.push(new THREE.Vector3(Math.cos(a) * WALK_R, 0, Math.sin(a) * WALK_R)); }
    return pts;
  }
  const clear = (a, b) => { for (let k = 1; k <= 20; k++) { const x = a.x + (b.x - a.x) * k / 20, z = a.z + (b.z - a.z) * k / 20; if (blocked(x, z)) return false; } return true; };
  function routeTo(T) {
    const P = player.position.clone(), rp = regionOf(P), rt = canStand(T);
    if (!rt) return null;
    const pts = [], onSide = r => r && (r.type === "z" || r.type === "b");
    if (onSide(rp) && onSide(rt) && rp.i === rt.i) {
      const B = ZONES[rp.i].bridge, kp = rp.type === "b" ? rp.k : B.length - 1, kt = rt.type === "b" ? rt.k : B.length - 1;
      if (kp <= kt) for (let k = kp + 1; k <= kt; k++) pts.push(B[k]); else for (let k = kp; k > kt; k--) pts.push(B[k]);
      pts.push(T); return pts;
    }
    if (rp && rp.type === "z") pts.push(...ZONES[rp.i].bridge.slice().reverse());
    else if (rp && rp.type === "b") pts.push(...ZONES[rp.i].bridge.slice(0, rp.k + 1).reverse());
    const cur = pts.length ? pts[pts.length - 1] : P;
    if (rt.type === "c") { if (clear(cur, T)) pts.push(T); else { pts.push(...ringArc(Math.atan2(cur.z, cur.x), Math.atan2(T.z, T.x))); pts.push(T); } }
    else { const B = ZONES[rt.i].bridge, k = rt.type === "b" ? rt.k : B.length - 1; pts.push(...ringArc(Math.atan2(cur.z, cur.x), ZONES[rt.i].angle)); pts.push(...B.slice(0, k + 1)); pts.push(T); }
    return pts;
  }
  let route = [], seg = 0, walking = false, follow = true, paused = false, onArrive = null;
  function walkToPoint(T, label, then) {
    const r = routeTo(T); if (!r || !r.length) return false;
    route = [player.position.clone(), ...r]; seg = 0; walking = true; follow = true; onArrive = then || null;
    if (label) { $("#status").textContent = "Đang đi tới " + label + "…"; say("Theo mình nào! Mình đi tới " + label + " nhé.", 4000); }
    return true;
  }
  const walkToZone = (i, then) => walkToPoint(standAt(ZONES[i]), ZONES[i].zone, then);
  const walkToCenter = () => walkToPoint(START.clone(), "Quảng trường mây");

  // các điểm tương tác ở quảng trường (bấm E)
  const SPOTS = [
    { key: "wardrobe", p: V(-7, 0, -4.5), r: 2.8, text: "Mở Tủ đồ ở Tiệm áo mây", act: () => openWd(), sign: "👕 Tiệm áo mây", sp: V(-10, 5.4, -6.4) },
    { key: "board", p: V(7, 0, -4.3), r: 2.8, text: "Xem Bảng xếp hạng", act: () => openRank(), sign: "🏆 Bảng xếp hạng", sp: V(10, 5.4, -6.2) },
    { key: "test", p: V(-7.2, 0, 7), r: 2.6, text: "Xem Bảng tin kiểm tra", act: () => openNotice(), sign: "📝 Bảng tin", sp: V(-10, 4.2, 9.8) },
    { key: "story", p: V(7, 0, 7), r: 2.8, text: "Nghe Ông Kể Chuyện", act: () => story(), sign: "📜 Góc kể chuyện", sp: V(10, 5.6, 10) },
    { key: "fish", p: V(-5.5, 0, -11.6), r: 3.2, text: "Câu cá ở Hồ câu cá", act: () => o.onNav("#/ho-ca"), sign: "🎣 Hồ câu cá", sp: V(-5.5, 4, -15) },
    { key: "pet", p: V(5.5, 0, -12.2), r: 3.2, text: "Vào Nhà thú cưng", act: () => o.onNav("#/thu-cung"), sign: "🐾 Nhà thú cưng", sp: V(5.5, 4.8, -15) },
  ];
  SPOTS.forEach(s => sign(s.sign, s.sp, () => walkToPoint(s.p, s.sign.slice(2), s.act)));
  npcs.forEach(n => SPOTS.push({ npc: n, r: 2.2, text: "Nói chuyện với " + n.name, act: n.act }));
  let nearby = null;

  // bàn phím
  const keys = new Set();
  const isTyping = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  const onKeyDown = e => {
    if (isTyping(e) || !root.isConnected || paused || document.querySelector(".modal-back")) return;
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { keys.add(k); e.preventDefault(); walking = false; follow = true; }
    if (k === "e" && nearby) { e.preventDefault(); nearby.act(); }
    if (k === "enter") { const c = $("#chat"); c.classList.remove("min"); $("#chatin").focus(); e.preventDefault(); }
  };
  const onKeyUp = e => keys.delete(e.key.toLowerCase());
  addEventListener("keydown", onKeyDown); addEventListener("keyup", onKeyUp);
  const onBlur = () => keys.clear(); addEventListener("blur", onBlur);
  // iPad / điện thoại: phím điều hướng trên màn hình
  if (LOW || navigator.maxTouchPoints > 0) {
    const pad = document.createElement("div"); pad.className = "dpad";
    [["arrowup", "▲", "u"], ["arrowleft", "◀", "l"], ["arrowright", "▶", "r"], ["arrowdown", "▼", "d"]].forEach(([k, t, c]) => {
      const b = document.createElement("button"); b.className = "dp-" + c; b.textContent = t;
      const on = e => { e.preventDefault(); keys.add(k); walking = false; follow = true; b.classList.add("on"); }, off = e => { e.preventDefault(); keys.delete(k); b.classList.remove("on"); };
      b.addEventListener("pointerdown", on); ["pointerup", "pointercancel", "pointerleave"].forEach(ev => b.addEventListener(ev, off)); b.addEventListener("contextmenu", e => e.preventDefault()); pad.append(b); });
    root.append(pad);
  }

  // bấm chuột trong cảnh
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let downAt = null;
  canvas.addEventListener("pointerdown", e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", e => {
    if (paused || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const rc = canvas.getBoundingClientRect(); ptr.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects([center, bridgeGroup, ...npcs.map(n => n.o), ...ZONES.map(z => z.group), ...islets.map(i => i.g)], true);
    for (const hit of hits) {
      const x = hit.object;
      if (x.userData.npc !== undefined) { const n = npcs[x.userData.npc]; return walkToPoint(n.o.position.clone().add(new THREE.Vector3(0, 0, 1.4)), n.name, n.act); }
      if (x.userData.pweed) { const w = pweeds.get(x.userData.pweed); if (w) return walkToPoint(w.pos.clone().multiplyScalar(0.92), "bụi cỏ dại", weedAct(x.userData.pweed)); }
      if (x.userData.lesson) { const s = islets.find(i => i.z.id === x.userData.lesson); return s.open ? o.onNav("#/khu/" + s.z.id) : toast("Bài " + s.z.num + " còn phủ sương. Đợi cô mở bài nhé! ☁️"); }
      const ac = x.userData.action;
      if (ac === "kiln" || ac === "build") return walkToZone(ZI("xuong"), () => o.onNav(ac === "kiln" ? "#/lo-may" : "#/xay-nha"));
      const act = SPOTS.find(sp => sp.key && sp.key === ac);
      if (act) return walkToPoint(act.p, act.sign.slice(2), act.act);
      if (x.userData.walk) { const T = world.worldToLocal(hit.point.clone()); const r = canStand(T); if (r) { T.y = r.y; walkToPoint(T); sound.play("bam"); } return; }
      if (x.userData.zoneIdx !== undefined) return walkToZone(x.userData.zoneIdx);
      if (x.type === "InstancedMesh") continue;
      return;
    }
  });
  controls.addEventListener("start", () => { follow = false; });

  // ======================= giao diện =======================
  $("#pname").textContent = me.name; $("#pclass").textContent = "Cư dân mây";
  function refreshStats() { $("#pseeds").textContent = "🌰 " + o.seeds() + " hạt mây"; $("#pscore").textContent = "⭐ " + o.score() + " điểm"; }
  const DOCK = [["hoc", "📚", "Bài học", () => o.onNav("#/hoc")], ["vuon", "🌱", "Vườn Mây", () => o.onNav("#/vuon")], ["lo", "🔥", "Lò Mây", () => o.onNav("#/lo-may")], ["nha", "🏡", "Xây nhà", () => o.onNav("#/xay-nha")],
    ["tn", "⚗️", "Thí nghiệm", () => o.onNav("#/mo-phong")], ["kt", "📝", "Kiểm tra", () => openNotice()], ["game", "🎮", "Trò chơi", () => o.onNav("#/tro-choi")], ["st", "📒", "Sổ tay", () => o.onNav("#/so-tay")], ["nv", "🎯", "Nhiệm vụ", () => o.onNav("#/nhiem-vu")], ["boss", "👾", "Boss", () => o.onNav("#/boss")], ["the", "🃏", "Thẻ", () => o.onNav("#/the-bai")], ["pet", "🐾", "Thú cưng", () => o.onNav("#/thu-cung")], ["ca", "🎣", "Câu cá", () => o.onNav("#/ho-ca")], ["hd", "❓", "Hướng dẫn", () => o.onHelp && o.onHelp()]];
  const dockBtns = {};
  DOCK.forEach(([k, ic, t, f]) => { const b = h("button", { class: "w-dbtn", onclick: () => { sound.play("bam"); f(); } }, h("span", { class: "d-ic" }, ic), t); dockBtns[k] = b; $("#dock").append(b); });
  function refreshAlerts() {
    const a = o.alerts();
    const badge = (b, n) => { b.querySelector(".badge")?.remove(); if (n) b.append(h("span", { class: "badge" }, n)); };
    badge(dockBtns.vuon, a.weeds); dockBtns.kt.classList.toggle("glow", !!a.test); dockBtns.game.classList.toggle("glow", !!a.game); dockBtns.boss && dockBtns.boss.classList.toggle("glow", !!a.boss);
    noticeGlow.visible = !!a.test; ZONES[ZI("tro-choi")].hot = !!a.game;
  }
  function toggleJourney() {
    const j = $("#journey"); if (!j.hidden) { j.hidden = true; return; }
    j.replaceChildren(h("h3", {}, "Đi tới đâu?"),
      h("button", { class: "jz", onclick: () => { j.hidden = true; walkToCenter(); } }, h("span", { class: "dot", style: { background: "#9c7cff" } }, "★"), h("span", {}, "Quảng trường mây", h("small", {}, "Tiệm áo · Xếp hạng · Kể chuyện · Cỏ dại"))),
      ...ZONES.map((z, i) => h("button", { class: "jz" + (regionNow === i ? " here" : ""), onclick: () => { j.hidden = true; walkToZone(i); } }, h("span", { class: "dot", style: { background: z.color } }, z.icon), h("span", {}, z.name, h("small", {}, z.sub)))));
    j.hidden = false;
  }
  ZONES.forEach((z, i) => { const b = document.createElement("button"); b.addEventListener("click", () => walkToZone(i)); labelsEl.append(b); z.label = b; });
  islets.forEach(s => { const b = document.createElement("button"); b.className = "il" + (s.open ? "" : " locked"); b.innerHTML = `<b>${s.open ? "" : "☁ "}Bài ${s.z.num}</b>`; b.title = s.z.title;
    b.onclick = () => s.open ? o.onNav("#/khu/" + s.z.id) : toast("Bài " + s.z.num + " còn phủ sương. Đợi cô mở bài nhé! ☁️"); labelsEl.append(b); s.label = b; });
  const openLessons = () => o.zones.filter(z => o.isOpen(z.id));
  function paintLabels() { ZONES.forEach(z => { z.label.className = "zl" + (z.hot ? " cur" : ""); z.label.innerHTML = `<b>${z.icon} ${z.name}</b><small>${z.kind === "study" ? openLessons().length + " bài đang mở" : z.sub}</small>`; }); }
  paintLabels();
  function openZone(z) {
    const el = $("#zone");
    el.innerHTML = `<div class="zh"><div class="zic" style="background:${z.color}">${z.icon}</div><div><h2>${z.name}</h2><p class="sub">${z.sub}</p></div></div>`;
    if (z.kind === "study") {
      const ls = openLessons();
      if (!ls.length) el.append(h("div", { class: "w-lock" }, "Cô chưa mở bài nào. Khi cô mở, các đảo nhỏ quanh đây sẽ tan sương."));
      ls.slice(0, 5).forEach(lz => { const d = o.doneOf(lz.id); el.append(h("button", { class: "w-seed" + (d === 3 ? " done" : ""), onclick: () => o.onNav("#/khu/" + lz.id) }, h("i", {}, d === 3 ? "✓" : lz.num), `Bài ${lz.num}. ${lz.title}`)); });
      if (ls.length > 5) el.append(h("p", { class: "small muted" }, `và ${ls.length - 5} bài nữa…`));
    }
    if (z.kind === "game") el.append(h("p", { class: "small" }, o.alerts().game ? "🟢 Cô đang mở trò chơi! Vào ngay nhé." : "Khi cô mở phòng chơi, đảo sẽ sáng nhấp nháy."));
    el.append(btn(z.btn, () => o.onNav(z.href), "btn btn-main"));
    if (z.kind === "workshop") el.append(btn("🏡 Vào Công trường xây nhà", () => o.onNav("#/xay-nha"), "btn btn-mint"));
    el.append(btn("Về quảng trường", walkToCenter, "btn btn-soft"));
    el.classList.add("show");
  }
  const closeZone = () => $("#zone").classList.remove("show");
  let regionNow = null;
  function onRegionChange(r) {
    const zi = r && r.type === "z" ? r.i : null;
    if (zi === regionNow) return; regionNow = zi;
    if (zi === null) { closeZone(); if (r && r.type === "c") $("#status").textContent = "Em đang ở Quảng trường mây"; return; }
    const z = ZONES[zi]; sound.play("chuong");
    try { sessionStorage.setItem("kvtm-m3d-here", String(zi)); } catch {}
    $("#status").textContent = "Em đang ở " + z.name;
    say(`Tới ${z.name} rồi! ${z.sub}. Bấm E để vào nhé.`);
    openZone(z);
  }

  // khung chat
  const chatOn = o.chatOn !== false, log = $("#chatlog");
  const fmt = iso => { try { return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
  function addMsg(m, mine = false) {
    const d = document.createElement("div"); d.className = "msg" + (mine ? " mine" : "");
    const b = document.createElement("b"); b.textContent = m.name + ": "; const s = document.createElement("span"); s.textContent = m.text;
    const t = document.createElement("small"); t.textContent = m.at ? " " + fmt(m.at) : "";
    d.append(b, s, t); log.append(d); while (log.children.length > 80) log.firstChild.remove(); log.scrollTop = log.scrollHeight;
  }
  function bubble(el, text) { el.textContent = text.length > 60 ? text.slice(0, 58) + "…" : text; el.style.opacity = 1; el._t = performance.now() + 5000; }
  async function sendChat(text) {
    text = text.trim(); if (!text) return;
    if (!chatOn) return toast("Cô đang tắt trò chuyện lớp.");
    if (chatCheck(text).flagged) { o.onFlag && o.onFlag(); const J = ZONES[JI]; if (J) { player.position.set(J.pos.x, J.pos.y, J.pos.z); walking = false; follow = true; } }
    try { const m = await api.chatSend(text); addMsg(m, true); bubble(myBub, m.text); room && room.chat(m); sound.play("bam"); } catch (e) { toast(friendlyError(e), "bad"); }
  }
  $("#chatform").addEventListener("submit", e => { e.preventDefault(); const i = $("#chatin"); const v = i.value; i.value = ""; sendChat(v); });
  ["Chào cả lớp!", "Cố lên mọi người!", "Ai học Hồ Ba Thể chưa?", "Đi nhổ cỏ cùng mình không?", "Nhà mình xây xong rồi!"].forEach(q => $("#quick").append(h("button", { type: "button", onclick: () => sendChat(q) }, q)));
  $("#chatToggle").onclick = () => { const c = $("#chat"); c.classList.toggle("min"); $("#chatToggle").textContent = c.classList.contains("min") ? "+" : "–"; };
  if (!chatOn) { $("#chatin").disabled = true; $("#chatin").placeholder = "Cô đang tắt trò chuyện lớp"; }
  api.chatList().then(list => (list || []).forEach(m => addMsg(m, m.sid === me.id))).catch(() => {});

  // bảng xếp hạng
  async function openRank() {
    let list = []; try { list = await api.leaderboard(); } catch (e) { return toast(friendlyError(e), "bad"); }
    drawBoard(list); const rank = list.findIndex(r => r.me) + 1, medal = ["#ffd23f", "#d6dbe8", "#f0a46a"];
    modal(h("div", { class: "rank" }, h("h2", {}, "🏆 Bảng xếp hạng lớp"), h("p", { class: "small muted" }, "Điểm mây = hạt giống × 10 + cỏ vườn tự sửa × 5 + nhà đã xây × 15 + cỏ quảng trường đúng ngay × 5"),
      rank ? h("p", { class: "rank-me" }, `Em đang đứng thứ ${rank} / ${list.length}`) : null,
      h("ol", { class: "rank-list" }, list.slice(0, 30).map((r, i) => h("li", { class: r.me ? "me" : "" }, h("span", { class: "rk", style: { background: medal[i] || "#efe8ff" } }, i + 1), h("b", {}, r.name), h("span", { class: "small muted" }, `${r.seeds} hạt · ${r.fixed} cỏ${r.houses ? " · " + r.houses + " nhà" : ""}${r.plaza ? " · " + r.plaza + " cỏ QT" : ""}`), h("span", { class: "pts" }, r.score))))));
  }
  api.leaderboard().then(drawBoard).catch(() => {});
  // tủ đồ
  function openWd() {
    openWardrobe(THREE, me.avatar, av => { me.name = av.nick || o.realName || me.name; myTag.textContent = me.name;
      me.avatar = av; o.onSaveAvatar && o.onSaveAvatar(av); $("#ava").textContent = av.gender === "nam" ? "👦" : "👧";
      player.remove(kid); kid = makeKid(THREE, av); player.add(kid); room && room.look(av); bubble(myBub, "Đồ mới xinh không?");
    }, o.shop);
  }
  function openNotice() { const a = o.alerts(); if (a.test) o.onNav(a.test); else { say("Bảng tin chưa có bài kiểm tra nào. Khi cô giao bài, bảng tin sẽ sáng lên!"); toast("Chưa có bài kiểm tra nào đang mở."); } }
  $("#b-go").onclick = toggleJourney; $("#b-wd").onclick = openWd; $("#b-rank").onclick = openRank; $("#b-ctr").onclick = () => { follow = true; };
  $("#b-out").onclick = () => o.onLogout();
  $("#b-snd").onclick = () => { if (sound.classMuted) return toast("Cô đã tắt nhạc cả lớp."); const on = sound.toggle(); $("#b-snd").textContent = on ? "🔊" : "🔇"; };
  $("#b-snd").textContent = sound.muted ? "🔇" : "🔊";
  $("#b-fs").onclick = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch {} };
  const prompt = $("#prompt"); prompt.onclick = () => nearby && nearby.act();

  // bản đồ nhỏ
  const mini = $("#mini"), mg = mini.getContext("2d"), MS = 392 / 236; // 236 đơn vị thế giới trên toàn bản đồ
  const toMini = (x, z) => [196 + x * MS, 196 + z * MS];
  function drawMini() {
    mg.clearRect(0, 0, 392, 392); mg.fillStyle = "#dff1ff"; mg.beginPath(); mg.arc(196, 196, 196, 0, Math.PI * 2); mg.fill();
    mg.lineWidth = 6; ZONES.forEach(z => { mg.strokeStyle = z.open ? "#f3d7b3" : "#e2dcef"; mg.beginPath(); const [a, b] = toMini(z.bridge[0].x, z.bridge[0].z), [c, d] = toMini(z.bridge[z.bridge.length - 1].x, z.bridge[z.bridge.length - 1].z); mg.moveTo(a, b); mg.lineTo(c, d); mg.stroke(); });
    const dot = (x, z, r, col) => { const [a, b] = toMini(x, z); mg.fillStyle = col; mg.beginPath(); mg.arc(a, b, r, 0, Math.PI * 2); mg.fill(); };
    dot(0, 0, CENTER_R * MS, "#8ad66e");
    ZONES.forEach(z => dot(z.pos.x, z.pos.z, z.r * MS, z.open ? z.color : "#c9c3da"));
    islets.forEach(s => dot(s.pos.x, s.pos.z, 3.4 * MS, s.open ? "#ffcf6a" : "#d6d1e2")); pweeds.forEach(v => dot(v.pos.x, v.pos.z, 4, "#8a5cc7"));
    others.forEach(x => dot(x.g.position.x, x.g.position.z, 6, "#ffffff"));
    dot(player.position.x, player.position.z, 9, "#ffcf3a"); mg.strokeStyle = "#2f2346"; mg.lineWidth = 3; const [px, pz] = toMini(player.position.x, player.position.z); mg.beginPath(); mg.arc(px, pz, 9, 0, Math.PI * 2); mg.stroke();
  }
  mini.addEventListener("click", e => {
    const rc = mini.getBoundingClientRect(), x = ((e.clientX - rc.left) / rc.width * 392 - 196) / MS, z = ((e.clientY - rc.top) / rc.height * 392 - 196) / MS;
    if (Math.hypot(x, z) < CENTER_R) return walkToPoint(new THREE.Vector3(x, 0, z).clampLength(0, 11), "đó");
    let best = 0, bd = 1e9; ZONES.forEach((zz, i) => { const d = Math.hypot(zz.pos.x - x, zz.pos.z - z); if (d < bd) { bd = d; best = i; } }); walkToZone(best);
  });

  // ======================= online =======================
  let room = null;
  joinRoom(me.classId, { id: me.id, name: me.name, avatar: me.avatar, x: player.position.x, y: player.position.y, z: player.position.z }, {
    join: p => addOther(p), leave: id => removeOther(id),
    move: (id, p) => { const x = others.get(id); if (x) { x.target.set(p.x, p.y ?? 0, p.z); if (p.ry !== undefined) x.ry = p.ry; } },
    look: (id, av) => { const x = others.get(id); if (x) { x.g.remove(x.m); x.m = makeKid(THREE, av); x.g.add(x.m); } },
    chat: m => { addMsg(m, false); const x = others.get(m.sid); if (x) bubble(x.bub, m.text); },
  }).then(r => { room = r; if (!root.isConnected) r.leave(); }).catch(err => { console.warn("Không vào được phòng online", err); });

  // ======================= vòng lặp =======================
  const tmp = new THREE.Vector3(), prevT = new THREE.Vector3();
  function resize() { const w = root.clientWidth || innerWidth, ht = root.clientHeight || innerHeight; renderer.setSize(w, ht, false); camera.aspect = w / ht; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();
  camera.position.copy(player.position).add(new THREE.Vector3(0, 15, 23)); controls.target.copy(player.position).add(new THREE.Vector3(0, 1, 0));
  function place(el, p, hide = false, maxD = 0) {
    if (hide || paused) { el.style.display = "none"; return; }
    tmp.copy(p); world.localToWorld(tmp); if (maxD && tmp.distanceTo(camera.position) > maxD) { el.style.display = "none"; return; } tmp.project(camera);
    if (tmp.z > 1 || Math.abs(tmp.x) > 1.15 || Math.abs(tmp.y) > 1.15) { el.style.display = "none"; return; }
    el.style.display = "";
    el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * root.clientWidth}px, ${(-tmp.y * 0.5 + 0.5) * root.clientHeight}px) translate(-50%, -100%)`;
  }
  const UP = y => new THREE.Vector3(0, y, 0);
  // nhãn chồng lên nhau thì chỉ giữ nhãn quan trọng hơn
  function declutter() {
    const pri = e => e.classList.contains("me") ? 6 : e.classList.contains("bub") ? 5 : e.classList.contains("zl") ? 4 : e.classList.contains("sign3d") ? 3 : e.classList.contains("il") ? 2 : 1;
    const els = [...labelsEl.children].filter(e => e.style.display !== "none" && e.style.opacity !== "0").sort((a, b) => pri(b) - pri(a)), kept = [];
    els.forEach(e => { const r = e.getBoundingClientRect(); const hit = kept.some(k => r.left < k.right - 2 && r.right > k.left + 2 && r.top < k.bottom - 1 && r.bottom > k.top + 1); e.style.visibility = hit ? "hidden" : ""; if (!hit) kept.push(r); });
  }
  let alive = true;
  function cleanup() { alive = false; ro.disconnect(); renderer.dispose(); removeEventListener("keydown", onKeyDown); removeEventListener("keyup", onKeyUp); removeEventListener("blur", onBlur); room && room.leave(); }
  let lastSend = 0, lastStep = 0, frame = 0; const lastSent = new THREE.Vector3(1e9, 0, 0);
  const clock = new THREE.Clock();
  function tick() {
    if (!alive) return;
    if (!root.isConnected) { cleanup(); return; }
    frame++;
    if (paused && (LOW || frame % 12)) { clock.getDelta(); requestAnimationFrame(tick); return; }
    try {
      const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      const before = player.position.clone();
      if (!paused && keys.size) {
        const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
        const right = new THREE.Vector3().crossVectors(fwd, UP(1)), v = new THREE.Vector3();
        if (keys.has("w") || keys.has("arrowup")) v.add(fwd); if (keys.has("s") || keys.has("arrowdown")) v.sub(fwd);
        if (keys.has("d") || keys.has("arrowright")) v.add(right); if (keys.has("a") || keys.has("arrowleft")) v.sub(right);
        if (v.lengthSq() > 0) {
          v.normalize().multiplyScalar(8 * dt); const p = player.position;
          for (const c of [new THREE.Vector3(p.x + v.x, 0, p.z + v.z), new THREE.Vector3(p.x + v.x, 0, p.z), new THREE.Vector3(p.x, 0, p.z + v.z)]) { const r = canStand(c); if (r) { p.x = c.x; p.z = c.z; p.y = THREE.MathUtils.lerp(p.y, r.y, 0.5); break; } }
        }
      } else if (walking) {
        let step = 8 * dt;
        while (step > 0 && seg < route.length - 1) { const a = player.position, b = route[seg + 1], d = a.distanceTo(b); if (d <= step) { a.copy(b); seg++; step -= d; } else { a.addScaledVector(b.clone().sub(a).normalize(), step); step = 0; } }
        if (seg >= route.length - 1) { walking = false; const f = onArrive; onArrive = null; if (f) setTimeout(f, 150); }
      }
      const mv = player.position.clone().sub(before); mv.y = 0; const moving = mv.lengthSq() > 1e-6;
      if (moving) { player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, Math.atan2(mv.x, mv.z), 0.3); if (t - lastStep > 0.32) { lastStep = t; sound.play("buoc"); } }
      animateKid(kid, moving, t);
      onRegionChange(regionOf(player.position));
      // gần công trình / NPC
      nearby = SPOTS.find(s => (s.npc ? s.npc.o.position : s.p).distanceTo(player.position) < s.r) || null;
      if (!nearby) for (const [id, v] of pweeds) if (v.pos.distanceTo(player.position) < 2) { nearby = { text: "Nhổ cỏ dại (đúng ngay +5 điểm)", act: weedAct(id) }; break; }
      if (!nearby && regionNow !== null) { const z = ZONES[regionNow]; nearby = { text: z.btn.replace(" ➜", ""), act: () => o.onNav(z.href) }; }
      prompt.hidden = !nearby || paused; if (nearby) prompt.innerHTML = `<kbd>E</kbd>${nearby.text}`;
      if (room && performance.now() - lastSend > 400 && lastSent.distanceTo(player.position) > 0.05) { lastSend = performance.now(); lastSent.copy(player.position); room.move({ x: +player.position.x.toFixed(2), y: +player.position.y.toFixed(2), z: +player.position.z.toFixed(2), ry: +player.rotation.y.toFixed(2) }); }
      const behind = player.position.clone().add(new THREE.Vector3(-Math.sin(player.rotation.y) * 1.4 - 0.6, 2.3 + Math.sin(t * 2.2) * 0.2, -Math.cos(player.rotation.y) * 1.4));
      tini.position.lerp(behind, 0.06); tini.rotation.y = player.rotation.y;
      if (frame % 30 === 0) syncPet();
      if (pet) { const tg = player.position.clone().add(new THREE.Vector3(-Math.sin(player.rotation.y) * 1.3 + Math.cos(player.rotation.y) * 0.9, 0, -Math.cos(player.rotation.y) * 1.3 - Math.sin(player.rotation.y) * 0.9)); const d = tg.clone().sub(pet.position); d.y = 0;
        if (d.length() > 0.15) { pet.position.add(d.multiplyScalar(0.07)); pet.rotation.y = Math.atan2(d.x, d.z); pet.children[0].position.y = (pet.children[0].userData.base ??= pet.children[0].position.y) + Math.abs(Math.sin(t * 12)) * 0.08; } pet.position.y = THREE.MathUtils.lerp(pet.position.y, player.position.y, 0.2); }
      npcs.forEach(n => {
        const x = n.o, d = n.target.clone().sub(x.position); d.y = 0;
        if (d.length() > 0.1) { const s = d.normalize().multiplyScalar(1.4 * dt); x.position.add(s); x.rotation.y = Math.atan2(s.x, s.z); x.userData.body.position.y = Math.abs(Math.sin(t * 8)) * 0.12; }
        else { x.userData.body.position.y = 0; if ((n.wait -= dt) < 0) { const p = n.home.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)); n.target = blocked(p.x, p.z) ? n.home.clone() : p; n.wait = 2 + Math.random() * 4; } }
        n.say -= dt; if (n.say < -9) { n.say = 4; n.bub.textContent = n.lines[(Math.random() * n.lines.length) | 0]; }
        n.bub.style.opacity = n.say > 0 ? 1 : 0; place(n.bub, x.position.clone().add(UP(2.9)), false, 60); place(n.tag, x.position.clone().add(UP(2.25)), false, 45);
      });
      const now = performance.now();
      others.forEach(x => {
        const d = x.target.clone().sub(x.g.position), dist = d.length(); x.g.position.lerp(x.target, dist > 12 ? 1 : 0.18);
        const mvv = dist > 0.04; if (mvv) x.g.rotation.y = THREE.MathUtils.lerp(x.g.rotation.y, Math.atan2(d.x, d.z), 0.25);
        animateKid(x.m, mvv, t + 0.5); place(x.tag, x.g.position.clone().add(UP(2.55)), false, 45);
        if (x.bub._t && now > x.bub._t) x.bub.style.opacity = 0; place(x.bub, x.g.position.clone().add(UP(3.1)), x.bub.style.opacity === "0" || !x.bub._t);
      });
      anim.forEach(f => f(t, dt));
      clouds.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > 180) c.position.x = -180; });
      balloons.forEach(b => { const u = b.userData; u.a += u.v * dt; b.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 0.5 + u.a) * 2, Math.sin(u.a) * u.r); });
      birds.forEach((b, i) => { const u = b.userData; const a = u.a + t * 0.25; b.position.set(Math.cos(a) * u.r, u.y, Math.sin(a) * u.r); b.rotation.y = -a; b.children.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * (0.3 + Math.sin(t * 9 + i) * 0.5); }); });
      sparks.rotation.y = t * 0.02;
      world.position.y = reduce ? 0 : Math.sin(t * 0.6) * 0.15;
      if (follow) { prevT.copy(controls.target); controls.target.lerp(player.position.clone().add(UP(1.2 + world.position.y)), 0.08); camera.position.add(controls.target.clone().sub(prevT)); }
      sun.position.copy(player.position).add(new THREE.Vector3(40, 70, 30)); sun.target.position.copy(player.position);
      controls.update(); renderer.render(scene, camera);
      if (!LOW || frame % 2 === 0) { ZONES.forEach(z => place(z.label, z.pos.clone().add(UP(13)))); islets.forEach(s => place(s.label, s.g.position.clone().add(UP(5)))); signs.forEach(s => place(s.el, s.p, false, 70)); }
      if (frame % 4 === 0) declutter();
      place(myTag, player.position.clone().add(UP(2.55)));
      if (myBub._t && now > myBub._t) myBub.style.opacity = 0; place(myBub, player.position.clone().add(UP(3.1)), myBub.style.opacity === "0" || !myBub._t);
      if (frame % 10 === 0) drawMini();
    } catch (err) { console.error(err); cleanup(); o.onFail && o.onFail(err); return; }
    requestAnimationFrame(tick);
  }
  refreshStats(); refreshAlerts(); tick();

  return {
    pause(p) { paused = !!p; root.classList.toggle("paused", paused); keys.clear(); if (paused) { prompt.hidden = true; $("#journey").hidden = true; } },
    refresh() {
      paintLabels(); buildHouses(); syncWeeds(); refreshStats(); refreshAlerts(); if (regionNow !== null) openZone(ZONES[regionNow]);
    },
    alerts: refreshAlerts,
    dispose() { cleanup(); root.innerHTML = ""; },
  };
}
