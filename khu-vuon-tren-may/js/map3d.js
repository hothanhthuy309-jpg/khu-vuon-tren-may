// Vương quốc mây 3D (Three.js) cho màn hình ngang.
// Học sinh tự đi lại (WASD / phím mũi tên / bấm chuột), thấy các bạn đang online,
// trò chuyện lớp, bảng xếp hạng và Tủ đồ. Three.js tải từ CDN qua importmap trong index.html.
import { sound } from "./sound.js";
import { api, friendlyError } from "./api.js";
import { h, modal, toast } from "./ui.js";
import { makeKid, animateKid, openWardrobe, normAvatar, SHIRT } from "./avatar.js";
import { joinRoom } from "./online.js";

const KIND = { "bai-09": "cotton", "bai-10": "lake", "bai-11": "wind", "bai-12": "workshop", "bai-13": "mine", "bai-14": "furnace", "bai-15": "kitchen", "bai-16": "colors", "bai-17": "filter" };
const COLOR = { "bai-09": "#5fd39e", "bai-10": "#4fb0ee", "bai-11": "#7cc8ff", "bai-12": "#f08a5d", "bai-13": "#9c86e8", "bai-14": "#ff7a5a", "bai-15": "#f5b83d", "bai-16": "#ff8fb8", "bai-17": "#3fbfa8" };

export function can3D() {
  if (window.innerWidth < 900) return false;
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

const ICON = {
  shirt: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3l-5 3 2 5 2-1v11h10V10l2 1 2-5-5-3a4 4 0 0 1-8 0z" fill="#ff8fb8" stroke="#a8436c" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  cup: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="#ffd23f" stroke="#b9840f" stroke-width="1.6"/><path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4" stroke="#b9840f" stroke-width="1.6" fill="none"/><path d="M12 13v4M8 21h8l-1-4H9z" fill="#ffd23f" stroke="#b9840f" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  center: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="#5b3fb0"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#5b3fb0" stroke-width="2.6" stroke-linecap="round"/></svg>',
};

/**
 * me: { id, name, classId, avatar }
 * zones (lessons.json), isOpen(id), doneOf(id), chatOn, onEnter(id), onFail(err), onSaveAvatar(av)
 */
export async function mountMap3D(root, { zones, isOpen, doneOf, me, chatOn = true, onEnter, onFail, onSaveAvatar }) {
  const THREE = await import("three");
  const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.innerHTML = `<canvas aria-label="Bản đồ 3D Vương quốc mây"></canvas><div id="labels"></div>
    <nav class="m3-panel" id="journey" aria-label="Các khu"><h2>Hành trình</h2><div id="jlist"></div></nav>
    <aside class="m3-panel" id="zone" aria-live="polite"></aside>
    <div class="m3-top">
      <span class="m3-panel m3-status" id="status">Bấm vào một khu, hoặc đi bằng phím W A S D</span>
      <span class="m3-panel m3-online" id="online">1 bạn trong vương quốc</span>
      <button class="m3-round" id="wardrobe" aria-label="Tủ đồ" title="Tủ đồ">${ICON.shirt}</button>
      <button class="m3-round" id="rank" aria-label="Bảng xếp hạng" title="Bảng xếp hạng">${ICON.cup}</button>
      <button class="m3-round" id="recenter" aria-label="Đưa máy quay về nhân vật" title="Về nhân vật">${ICON.center}</button>
    </div>
    <section class="m3-panel m3-chat" id="chat" aria-label="Trò chuyện lớp">
      <header><b>Trò chuyện lớp</b><button id="chatToggle" aria-label="Thu gọn khung chat">–</button></header>
      <div class="m3-log" id="chatlog" aria-live="polite"></div>
      <div class="m3-quick" id="quick"></div>
      <form id="chatform"><input id="chatin" maxlength="120" autocomplete="off" placeholder="Nhắn cho cả lớp…" aria-label="Tin nhắn"><button type="submit">Gửi</button></form>
    </section>
    <button class="m3-panel m3-prompt" id="prompt" hidden></button>
    <div class="m3-hint">W A S D / mũi tên để đi · kéo chuột để xoay · cuộn để phóng to</div>`;
  const $ = s => root.querySelector(s);
  me = { ...me, avatar: normAvatar(me.avatar) };

  // ======================= cảnh =======================
  const canvas = $("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcde8ff, 110, 260);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 900);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 9; controls.maxDistance = 120; controls.maxPolarAngle = 1.32; controls.minPolarAngle = 0.3;

  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color("#3fa6f5") }, mid: { value: new THREE.Color("#bfe6ff") }, bot: { value: new THREE.Color("#ffe3f0") } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float k = vP.y; vec3 c = k > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, k)) : mix(mid, bot, smoothstep(0.0, 0.5, -k)); gl_FragColor = vec4(c,1.0); }",
  }));
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa9cfff, 1.25));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
  sun.position.set(45, 80, 35); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 220 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
  scene.add(sun);

  const MC = {};
  const mat = (c, o = {}) => (MC[c + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o }));
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
  const walkables = []; // mặt đi được: mặt cỏ các đảo, ván cầu
  function makeIsland(r, depth, grass) {
    const g = new THREE.Group();
    const top = mesh(new THREE.CylinderGeometry(r, r * 1.01, 0.8, 48), mat(grass), 0, -0.4, 0, false); g.add(top); top.userData.walk = true; walkables.push(top);
    g.add(mesh(new THREE.CylinderGeometry(r * 1.03, r * 0.98, 0.25, 48), mat("#a7e07f"), 0, -0.05, 0, false));
    g.add(mesh(new THREE.CylinderGeometry(r, r * 0.94, 0.8, 48), mat("#a77a52"), 0, -1.2, 0, false));
    const rock = jitter(new THREE.ConeGeometry(r * 0.96, depth, 12, 4), r * 0.15); rock.rotateX(Math.PI);
    g.add(mesh(rock, mat("#cbd6ea", { flatShading: true }), 0, -1.6 - depth / 2, 0, false));
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2, rr = r * (0.45 + Math.random() * 0.4);
      const s = jitter(new THREE.ConeGeometry(r * 0.16, depth * 0.45, 6, 2), r * 0.05); s.rotateX(Math.PI);
      g.add(mesh(s, mat("#b9c6e0", { flatShading: true }), Math.cos(a) * rr, -1.6 - depth * 0.3, Math.sin(a) * rr, false));
    }
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.7 }), Math.round(r * 10));
    const cols = ["#ff8fb8", "#ffd84d", "#ffffff", "#b79cff", "#ff9f80"].map(c => new THREE.Color(c)); const d = new THREE.Object3D();
    for (let i = 0; i < fl.count; i++) { const a = Math.random() * Math.PI * 2, rr = r * (0.62 + Math.random() * 0.36); d.position.set(Math.cos(a) * rr, 0.12, Math.sin(a) * rr); d.updateMatrix(); fl.setMatrixAt(i, d.matrix); fl.setColorAt(i, cols[i % cols.length]); }
    g.add(fl);
    return g;
  }
  function tree(color = "#6cc04a", s = 1, pink = false) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.18 * s, 0.3 * s, 1.6 * s, 7), mat("#9a6a45"), 0, 0.8 * s, 0));
    const c = pink ? "#ff9ccc" : color;
    [[0, 2.2, 0, 1.1], [0.7, 1.8, 0.2, 0.75], [-0.6, 1.9, -0.2, 0.8], [0.1, 2.8, -0.1, 0.75]].forEach(([x, y, z, r]) => g.add(mesh(new THREE.SphereGeometry(r * s, 14, 10), mat(c), x * s, y * s, z * s)));
    return g;
  }
  function bush(x, z, s = 1, c = "#5fbf4a") {
    const g = new THREE.Group();
    [[0, 0.45, 0, 0.55], [0.45, 0.35, 0.1, 0.4], [-0.4, 0.35, -0.1, 0.42]].forEach(([a, b, dd, r]) => g.add(mesh(new THREE.SphereGeometry(r * s, 12, 8), mat(c), a * s, b * s, dd * s)));
    g.position.set(x, 0, z); return g;
  }
  function gable(w, ht, d, color) {
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, ht); sh.lineTo(-w / 2, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2 });
    geo.translate(0, 0, -d / 2); return mesh(geo, mat(color));
  }
  function house(w, ht, d, wall, roof, door = "#5aa35e") {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(w, ht, d), mat(wall), 0, ht / 2, 0));
    const r = gable(w + 0.8, ht * 0.75, d + 0.6, roof); r.position.y = ht; g.add(r);
    g.add(mesh(new THREE.BoxGeometry(w * 0.22, ht * 0.6, 0.12), mat(door), 0, ht * 0.3, d / 2 + 0.03));
    [-1, 1].forEach(sx => {
      g.add(mesh(new THREE.TorusGeometry(ht * 0.14, 0.07, 8, 20), mat("#8a5a3a"), sx * w * 0.3, ht * 0.6, d / 2 + 0.05));
      g.add(mesh(new THREE.CircleGeometry(ht * 0.14, 20), mat("#bfe8ff", { emissive: "#7cc8ff", emissiveIntensity: 0.2 }), sx * w * 0.3, ht * 0.6, d / 2 + 0.04, false));
    });
    [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(0.18, ht, 0.18), mat("#8a5a3a"), x, ht / 2, z)));
    return g;
  }

  // ======================= đảo trung tâm =======================
  const world = new THREE.Group(); scene.add(world);
  const CENTER_R = 15, RING = 46, ZR = 7.5, WALK_R = 12.4, LS = 1.4;
  const center = makeIsland(CENTER_R, 13, "#86d16a"); world.add(center);
  const anim = [];
  const RECTS = [
    { x0: -4.6, x1: 4.6, z0: -9.8, z1: -2.6 },   // Nhà Tí Nị
    { x0: -10.4, x1: -5.6, z0: -1.6, z1: 2.4 },  // Tiệm áo mây
    { x0: 5.8, x1: 10.2, z0: -0.8, z1: 1.9 },    // Bảng xếp hạng
  ];
  const CIRCLES = [{ x: 0, z: 3, r: 1.9 }];       // đài phun nước
  const blocked = (x, z) => RECTS.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) || CIRCLES.some(c => Math.hypot(x - c.x, z - c.z) < c.r);
  const SHOP_DOOR = new THREE.Vector3(-8, 0, 3.4), BOARD_SPOT = new THREE.Vector3(8, 0, 3.2);
  let boardTex = null;
  {
    const cot = house(5.2, 3, 4, "#f6ead2", "#6fbf4f", "#4f8a52"); cot.scale.setScalar(1.5); cot.position.set(0, 0, -6.2); center.add(cot);
    [[-2.4, 6, -6.2, 1], [1.8, 6.4, -5.4, 0.9], [0.3, 7.3, -6.8, 0.8], [-3.6, 5.2, -3.8, 0.7], [3.4, 5.4, -7.6, 0.8]].forEach(([x, y, z, r]) => center.add(mesh(new THREE.SphereGeometry(r, 12, 8), mat("#7cc95a"), x, y, z)));
    center.add(mesh(new THREE.BoxGeometry(1.1, 2.2, 1.1), mat("#c8b49a"), 2.4, 6.4, -7.6));
    // quảng trường + đài phun
    center.add(mesh(new THREE.CylinderGeometry(5, 5, 0.08, 40), mat("#efe8f6"), 0, 0.04, 3, false));
    center.add(mesh(new THREE.CylinderGeometry(1.6, 1.75, 0.6, 28), mat("#d6cfe6"), 0, 0.3, 3));
    center.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.06, 28), mat("#7fd0ff", { emissive: "#4fb0ee", emissiveIntensity: 0.25 }), 0, 0.62, 3, false));
    center.add(mesh(new THREE.CylinderGeometry(0.2, 0.26, 1.6, 10), mat("#d6cfe6"), 0, 1.2, 3));
    const orb = mesh(new THREE.SphereGeometry(0.45, 16, 12), mat("#bfe8ff", { emissive: "#7cc8ff", emissiveIntensity: 0.5 }), 0, 2.2, 3); center.add(orb);
    anim.push(t => { orb.position.y = 2.2 + Math.sin(t * 2) * 0.15; });
    // đèn lồng quanh quảng trường
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2 + 0.3, x = Math.cos(a) * 5.6, z = 3 + Math.sin(a) * 5.6;
      if (blocked(x, z)) continue;
      center.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.8, 6), mat("#8a6a52"), x, 0.9, z));
      center.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), mat("#fff3c4", { emissive: "#ffd23f", emissiveIntensity: 0.7 }), x, 1.9, z, false));
    }
    // Tiệm áo mây (mở Tủ đồ)
    const shop = house(4, 2.6, 3.4, "#ffe3ef", "#ff8fb8", "#c85b8a"); shop.position.set(-8, 0, 0.4); center.add(shop);
    const sign = mesh(new THREE.BoxGeometry(2.6, 0.7, 0.12), mat("#fff6e6"), -8, 3.1, 2.2); center.add(sign);
    sign.material = new THREE.MeshStandardMaterial({ map: textTexture("Tiệm áo mây", "#c85b8a", 512, 140), roughness: 0.8 });
    const hanger = mesh(new THREE.BoxGeometry(0.9, 1.1, 0.12), mat(SHIRT[1]), -6.5, 1.4, 2.25); center.add(hanger);
    shop.traverse(o => { o.userData.action = "wardrobe"; }); sign.userData.action = "wardrobe"; hanger.userData.action = "wardrobe";
    // Bảng xếp hạng: bục 3 bậc + bảng tên
    [[8, 1.2, "#ffd23f"], [6.9, 0.85, "#d6dbe8"], [9.1, 0.6, "#f0a46a"]].forEach(([x, hh, c]) => { const p = mesh(new THREE.CylinderGeometry(0.55, 0.6, hh, 20), mat(c), x, hh / 2, 1.2); p.userData.action = "board"; center.add(p); });
    const post1 = mesh(new THREE.BoxGeometry(0.2, 3.4, 0.2), mat("#9a6a45"), 6.4, 1.7, 0); const post2 = post1.clone(); post2.position.x = 9.6;
    boardTex = textTexture("Bảng xếp hạng", "#7a5232", 512, 320);
    const board = mesh(new THREE.BoxGeometry(3.6, 2.2, 0.15), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.8 }), 8, 3.1, 0.05);
    [post1, post2, board].forEach(o => { o.userData.action = "board"; center.add(o); });
    // vườn rau sau nhà
    for (let i = 0; i < 4; i++) {
      center.add(mesh(new THREE.BoxGeometry(1.6, 0.3, 0.8), mat("#a8774f"), -8.2, 0.15, -6 - i * 1.2));
      for (let k = 0; k < 3; k++) center.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(["#7ee0b5", "#ffb04d", "#ff7aa0", "#f5e36a"][i]), -8.7 + k * 0.5, 0.48, -6 - i * 1.2));
    }
    center.add(bush(5, -4, 1.2)); center.add(bush(-5.5, -3, 1)); center.add(bush(3.5, 9, 0.9, "#6ccb52")); center.add(bush(-3.5, 9.5, 1));
    // ghế đá
    [[-3.2, 7.6], [3.2, 7.6]].forEach(([x, z]) => { center.add(mesh(new THREE.BoxGeometry(1.6, 0.18, 0.55), mat("#c99a6b"), x, 0.5, z)); [-0.6, 0.6].forEach(dx => center.add(mesh(new THREE.BoxGeometry(0.15, 0.45, 0.45), mat("#a7764c"), x + dx, 0.22, z))); });
  }

  function textTexture(text, color, w, ht) {
    const c = document.createElement("canvas"); c.width = w; c.height = ht; const g = c.getContext("2d");
    g.fillStyle = "#fff8ec"; g.fillRect(0, 0, w, ht);
    g.strokeStyle = color; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, ht - 10);
    g.fillStyle = color; g.font = `800 ${Math.round(ht * 0.32)}px "Baloo 2", Nunito, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, w / 2, ht < 200 ? ht / 2 : ht * 0.2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.canvas = c; return t;
  }
  function drawBoard(list) {
    const c = boardTex.userData.canvas, g = c.getContext("2d"), w = c.width, ht = c.height;
    g.fillStyle = "#fff8ec"; g.fillRect(0, 0, w, ht); g.strokeStyle = "#7a5232"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, ht - 10);
    g.fillStyle = "#7a5232"; g.textAlign = "center"; g.font = '800 46px "Baloo 2", Nunito, sans-serif'; g.fillText("Bảng xếp hạng", w / 2, 58);
    g.textAlign = "left"; g.font = '800 38px Nunito, sans-serif';
    ["#e2a91a", "#8a93a8", "#c9733a"].forEach((col, i) => {
      const r = list[i]; if (!r) return;
      g.fillStyle = col; g.fillText(`${i + 1}. ${r.name}`, 40, 130 + i * 62);
      g.textAlign = "right"; g.fillText(`${r.score}`, w - 40, 130 + i * 62); g.textAlign = "left";
    });
    boardTex.needsUpdate = true;
  }

  // ======================= 9 khu =======================
  const HEIGHTS = [0.6, -1.6, 2, -0.6, 1.4, -2, 0.8, -1.1, 2.2];
  const ZONES = zones.map((z, i) => {
    const a = Math.PI / 2 + 0.35 + i * (Math.PI * 2 / 9);
    return { id: z.id, num: z.num, zone: z.zone, title: z.title, file: z.file, seeds: z.seeds, kind: KIND[z.id] || "cotton", color: COLOR[z.id] || "#7cc8ff",
      open: isOpen(z.id), done: doneOf(z.id), angle: a, dir: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), pos: new THREE.Vector3(Math.cos(a) * RING, HEIGHTS[i % 9], Math.sin(a) * RING) };
  });
  ZONES.forEach((z, i) => {
    const isl = makeIsland(ZR, 8 + Math.random() * 3, z.open ? "#8ad66e" : "#a9cf96");
    isl.position.copy(z.pos); world.add(isl); z.group = isl;
    const lm = new THREE.Group(); lm.scale.setScalar(LS); lm.rotation.y = Math.atan2(-Math.cos(z.angle), -Math.sin(z.angle)); isl.add(lm);
    buildLandmark(z, lm);
    if (!z.open) addFog(isl);
    if (z.done === 3) addRainbow(isl, lm.rotation.y);
    if (z.open && z.file && z.done < 3) addMarker(isl);
    for (let k = 0; k < 4; k++) { const ta = k / 4 * Math.PI * 2 + 0.6, rr = ZR * 0.8; const t = tree("#6cc04a", 0.7 + Math.random() * 0.25, k === 2); t.position.set(Math.cos(ta) * rr, 0, Math.sin(ta) * rr); isl.add(t); }
    isl.traverse(o => { if (o.userData.zoneIdx === undefined) o.userData.zoneIdx = i; });
  });
  function buildLandmark(z, g) {
    const add = m => (g.add(m), m);
    switch (z.kind) {
      case "cotton": [[-1.6, 0.6, 1, true], [1.4, -0.4, 1.1, false], [0, -1.8, 1.2, true], [-0.4, 1.2, 0.8, false]].forEach(([x, zz, s, p]) => { const t = tree("#ffffff", s, p); t.position.set(x, 0, zz); g.add(t); }); break;
      case "lake": {
        add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.12, 36), mat("#5ab8f5", { emissive: "#3b97d6", emissiveIntensity: 0.25, roughness: 0.2 }), 0, 0.02, 0, false));
        add(mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), mat("#e4f7ff", { transparent: true, opacity: 0.9, roughness: 0.15 }), -1, 0.55, 0.4)).rotation.y = 0.5;
        const drop = new THREE.Group(); drop.add(mesh(new THREE.SphereGeometry(0.55, 18, 14), mat("#6fc6ff", { roughness: 0.2 }))); drop.add(mesh(new THREE.ConeGeometry(0.47, 0.7, 18), mat("#6fc6ff", { roughness: 0.2 }), 0, 0.55, 0));
        drop.position.set(0.9, 1.3, -0.2); g.add(drop); anim.push(t => { drop.position.y = 1.3 + Math.sin(t * 2) * 0.2; });
        const puffs = [0, 1, 2].map(k => add(mesh(new THREE.SphereGeometry(0.35, 12, 8), mat("#ffffff", { transparent: true, opacity: 0.85 }), 0.2 + k * 0.4, 1, 1.2, false)));
        anim.push(t => puffs.forEach((p, k) => { const f = (t * 0.5 + k / 3) % 1; p.position.y = 0.5 + f * 2.6; p.material.opacity = 0.85 * (1 - f); p.scale.setScalar(0.6 + f); }));
        break;
      }
      case "wind": {
        add(mesh(new THREE.CylinderGeometry(0.55, 0.95, 4, 10), mat("#fbf6ee"), 0, 2, 0)); add(mesh(new THREE.ConeGeometry(0.9, 1.1, 10), mat("#ff8a6a"), 0, 4.5, 0));
        const bl = new THREE.Group(); bl.position.set(0, 3.6, 0.8);
        for (let k = 0; k < 4; k++) { const piv = new THREE.Group(); piv.rotation.z = k * Math.PI / 2; piv.add(mesh(new THREE.BoxGeometry(0.4, 2.4, 0.08), mat(k % 2 ? "#ffd84d" : "#ffffff"), 0, 1.2, 0)); bl.add(piv); }
        g.add(bl); anim.push((t, dt) => { bl.rotation.z -= dt * 1.2; }); break;
      }
      case "workshop": { g.add(house(3.4, 2.4, 2.8, "#f2a07a", "#8e8fa8", "#7a5232")); add(mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), mat("#b5655a"), 1, 3.6, -0.5)); [[2.3, 1], [2.6, 0.2], [-2.3, 1.2]].forEach(([x, zz]) => add(mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat("#d9a066"), x, 0.35, zz))); break; }
      case "mine":
        [[-1, 0, 0.9], [1.2, 0.6, 0.7], [0.2, -1.2, 1.1]].forEach(([x, zz, s]) => add(mesh(new THREE.DodecahedronGeometry(s), mat("#a9b2c8", { flatShading: true }), x, s * 0.7, zz)));
        [["#b79cff", -0.3, 0.6], ["#5fd3b4", 0.8, -0.4], ["#ff8fb8", -1.4, -0.9]].forEach(([c, x, zz]) => { const cr = add(mesh(new THREE.OctahedronGeometry(0.45), mat(c, { emissive: c, emissiveIntensity: 0.35, roughness: 0.3 }), x, 1.5, zz)); cr.scale.y = 1.6; anim.push(t => { cr.rotation.y = t; }); });
        break;
      case "furnace": {
        add(mesh(new THREE.SphereGeometry(1.6, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#c9b8a6", { flatShading: true }), 0, 0, 0));
        add(mesh(new THREE.CircleGeometry(0.6, 20), mat("#ff7a2a", { emissive: "#ff6a1a", emissiveIntensity: 1.2 }), 0, 0.6, 1.55, false));
        const fl = add(mesh(new THREE.ConeGeometry(0.4, 1.2, 12), mat("#ffb43a", { emissive: "#ff8a1a", emissiveIntensity: 1, transparent: true, opacity: 0.9 }), 0, 2.1, 0, false));
        anim.push(t => { fl.scale.set(1 + Math.sin(t * 9) * 0.1, 1 + Math.sin(t * 7) * 0.2, 1); }); break;
      }
      case "kitchen": { const hs = house(3, 2.2, 2.6, "#fff1d6", "#ffb04d", "#c96a3a"); hs.position.z = -0.8; g.add(hs); for (let k = 0; k < 3; k++) { add(mesh(new THREE.BoxGeometry(0.9, 0.25, 1.8), mat("#a8774f"), -1.4 + k * 1.4, 0.12, 1.8)); add(mesh(new THREE.SphereGeometry(0.28, 10, 8), mat(["#7ee0b5", "#ff9f4d", "#f5e36a"][k]), -1.4 + k * 1.4, 0.45, 1.8)); } break; }
      case "colors": [["#ff8fb8", -1.3, 0.5], ["#ffd84d", 1.2, 0.7], ["#7cc8ff", 0, -1.2]].forEach(([c, x, zz]) => add(mesh(new THREE.CylinderGeometry(1, 1, 0.14, 28), mat(c, { emissive: c, emissiveIntensity: 0.25, roughness: 0.25 }), x, 0.04, zz, false))); break;
      case "filter": {
        add(mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 10), mat("#e7e2f2"), 0, 1.5, 0));
        add(mesh(new THREE.ConeGeometry(1.2, 1.6, 20, 1, true), mat("#d9f2ff", { side: THREE.DoubleSide, roughness: 0.2 }), 0, 3.6, 0)).rotation.x = Math.PI;
        const dp = add(mesh(new THREE.SphereGeometry(0.18, 10, 8), mat("#5ab8f5"), 0, 2.6, 0, false)); anim.push(t => { dp.position.y = 2.6 - ((t * 0.8) % 1) * 2.4; });
        add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 24), mat("#5ab8f5", { roughness: 0.2 }), 0, 0.1, 0, false)); break;
      }
    }
  }
  function addFog(g) {
    const fm = new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.55, roughness: 1, depthWrite: false });
    const fog = new THREE.Group();
    for (let k = 0; k < 11; k++) { const a = k / 11 * Math.PI * 2, rr = ZR * (0.25 + Math.random() * 0.6); const s = new THREE.Mesh(new THREE.SphereGeometry(1.8 + Math.random() * 1.2, 14, 10), fm); s.position.set(Math.cos(a) * rr, 1.5 + Math.random() * 1.8, Math.sin(a) * rr); fog.add(s); }
    g.add(fog); anim.push(t => { fog.rotation.y = t * 0.08; });
  }
  function addRainbow(g, ry) {
    const r = new THREE.Group(); r.rotation.y = ry; g.add(r);
    ["#ff8fb8", "#ffd84d", "#7ee0b5", "#7cc8ff", "#b79cff"].forEach((c, k) => r.add(mesh(new THREE.TorusGeometry(6.2 - k * 0.42, 0.2, 8, 48, Math.PI), mat(c, { emissive: c, emissiveIntensity: 0.35 }), 0, 0.2, -2.2, false)));
  }
  function addMarker(g) {
    const star = mesh(new THREE.OctahedronGeometry(0.8), mat("#ffd23f", { emissive: "#ffb800", emissiveIntensity: 0.7, roughness: 0.3 }), 0, 8.5, 0, false); g.add(star);
    const ring = mesh(new THREE.TorusGeometry(ZR - 0.5, 0.15, 8, 72), mat("#ffe680", { emissive: "#ffd23f", emissiveIntensity: 0.8 }), 0, 0.08, 0, false); ring.rotation.x = Math.PI / 2; g.add(ring);
    anim.push(t => { star.position.y = 8.5 + Math.sin(t * 2.4) * 0.4; star.rotation.y = t * 1.5; ring.material.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.3; });
  }
  // cây quanh rìa đảo trung tâm, nằm giữa các cây cầu
  ZONES.forEach((z, i) => { const a = z.angle + Math.PI / 9; const t = tree("#6cc04a", 0.95 + Math.random() * 0.35, i % 3 === 0); t.position.set(Math.cos(a) * 13.6, 0, Math.sin(a) * 13.6); center.add(t); });

  // ======================= cầu =======================
  const bridgeGroup = new THREE.Group(); world.add(bridgeGroup);
  ZONES.forEach(z => {
    const s = z.dir.clone().multiplyScalar(CENTER_R - 0.2), e = z.pos.clone().sub(z.dir.clone().multiplyScalar(ZR - 0.3));
    const N = 40; z.bridge = [];
    for (let k = 0; k <= N; k++) { const t = k / N; const p = s.clone().lerp(e, t); p.y = THREE.MathUtils.lerp(0, z.pos.y, t) + Math.sin(Math.PI * t) * 2.4 + 0.12; z.bridge.push(p); }
    const side = new THREE.Vector3().crossVectors(z.dir, new THREE.Vector3(0, 1, 0)).normalize();
    const wood = mat("#c99a6b"), post = mat("#a7764c"), rope = mat(z.open ? z.color : "#d9d3e6");
    for (let k = 0; k < N; k++) {
      const a = z.bridge[k], b = z.bridge[k + 1];
      const pl = mesh(new THREE.BoxGeometry(2.2, 0.14, a.distanceTo(b) * 0.85), wood);
      pl.position.copy(a).add(b).multiplyScalar(0.5); pl.position.y -= 0.12; pl.lookAt(b.x, b.y - 0.12, b.z); pl.userData.walk = true; bridgeGroup.add(pl); walkables.push(pl);
      if (k % 4 === 0) [-1, 1].forEach(sg => { const p = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.9, 6), post); p.position.copy(a).addScaledVector(side, sg * 1.05); p.position.y += 0.3; bridgeGroup.add(p); });
    }
    [-1, 1].forEach(sg => { const pts = z.bridge.map(p => p.clone().addScaledVector(side, sg * 1.05).add(new THREE.Vector3(0, 0.72, 0))); bridgeGroup.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.07, 6), rope, 0, 0, 0, false)); });
  });

  // ======================= mây trôi =======================
  const clouds = [], cloudMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, opacity: 0.95 });
  for (let i = 0; i < 22; i++) {
    const c = new THREE.Group(), n = 4 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(2 + Math.random() * 2, 14, 10), cloudMat); s.position.set(k * 2.6 - n * 1.3, Math.random() * 1.4, Math.random() * 2.5); c.add(s); }
    const low = i < 13;
    c.position.set((Math.random() - 0.5) * 260, low ? -20 - Math.random() * 12 : 16 + Math.random() * 20, (Math.random() - 0.5) * 220);
    c.scale.setScalar(low ? 1.8 : 1.1); c.userData.v = 0.6 + Math.random() * 0.8; scene.add(c); clouds.push(c);
  }

  // ======================= nhân vật =======================
  function eyes(g, y, z, gap = 0.16, r = 0.06) { [-1, 1].forEach(s => { g.add(mesh(new THREE.SphereGeometry(r, 8, 6), mat("#2b2238"), s * gap, y, z, false)); g.add(mesh(new THREE.SphereGeometry(r * 0.35, 6, 4), mat("#ffffff"), s * gap + 0.02, y + 0.02, z + r * 0.8, false)); }); }
  function cheeks(g, y, z, gap = 0.26) { [-1, 1].forEach(s => { const c = mesh(new THREE.SphereGeometry(0.07, 8, 6), mat("#ffadc6"), s * gap, y, z, false); c.scale.set(1.3, 0.7, 0.5); g.add(c); }); }
  function makeTiNi() {
    const g = new THREE.Group(), m = mat("#ffffff", { roughness: 0.9, emissive: "#dfe8ff", emissiveIntensity: 0.15 });
    [[0, 0, 0, 0.45], [0.35, -0.05, 0, 0.32], [-0.35, -0.05, 0, 0.32], [0.15, 0.25, -0.05, 0.3], [-0.18, 0.22, -0.05, 0.28]].forEach(([x, y, z, r]) => g.add(mesh(new THREE.SphereGeometry(r, 14, 10), m, x, y, z)));
    eyes(g, 0.02, 0.4, 0.14, 0.055); cheeks(g, -0.1, 0.38, 0.28); return g;
  }
  function makeDroplet() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const m = mat("#8fd3ff", { roughness: 0.3 });
    body.add(mesh(new THREE.SphereGeometry(0.55, 18, 14), m, 0, 0.6, 0)); body.add(mesh(new THREE.ConeGeometry(0.47, 0.75, 18), m, 0, 1.25, 0));
    body.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 20), mat("#7ee0b5"), 0, 1.2, 0)); body.add(mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.35, 16), mat("#7ee0b5"), 0, 1.4, 0));
    eyes(body, 0.68, 0.48, 0.15, 0.06); cheeks(body, 0.55, 0.46, 0.3); g.userData = { body, legs: [] }; return g;
  }
  function makeBuilder() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    body.add(mesh(new THREE.CapsuleGeometry(0.42, 0.5, 6, 14), mat("#d9c9ff"), 0, 0.75, 0));
    body.add(mesh(new THREE.SphereGeometry(0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#ffd23f"), 0, 1.25, 0)); body.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 20), mat("#ffd23f"), 0, 1.25, 0));
    eyes(body, 0.95, 0.38, 0.14, 0.055); cheeks(body, 0.83, 0.36, 0.27);
    const hm = new THREE.Group(); hm.position.set(0.5, 0.7, 0.1); hm.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), mat("#9a6a45"), 0, 0.2, 0)); hm.add(mesh(new THREE.BoxGeometry(0.3, 0.16, 0.16), mat("#8e8fa8"), 0, 0.5, 0)); body.add(hm);
    g.userData = { body, legs: [] }; return g;
  }

  const labelsEl = $("#labels");
  const mk = (cls, text = "") => { const e = document.createElement("div"); e.className = cls; e.textContent = text; labelsEl.append(e); return e; };

  const START = new THREE.Vector3(0, 0, 9.5);
  const player = new THREE.Group(); world.add(player);
  let kid = makeKid(THREE, me.avatar); player.add(kid);
  let startAt = null; try { const s = sessionStorage.getItem("kvtm-m3d-here"); if (s && s !== "center" && ZONES[+s]) startAt = +s; } catch {}
  const standAt = z => z.pos.clone().sub(z.dir.clone().multiplyScalar(ZR - 2.2));
  if (startAt !== null) { player.position.copy(standAt(ZONES[startAt])); player.rotation.y = Math.atan2(-ZONES[startAt].dir.x, -ZONES[startAt].dir.z); }
  else { player.position.copy(START); player.rotation.y = Math.PI; }
  const myTag = mk("tag me", me.name), myBub = mk("bub"); myBub.style.opacity = 0;
  const tini = makeTiNi(); world.add(tini); tini.position.copy(player.position).add(new THREE.Vector3(-1, 2.2, 0));

  const npcs = [
    { o: makeDroplet(), name: "Bác Giọt Sương", lines: ["Nhổ cỏ dại là hiểu bài chắc hơn đó!", "Vườn Mây ở sau nhà, ghé tưới cây nhé.", "Giọt sương là hơi nước ngưng tụ đấy."] },
    { o: makeBuilder(), name: "Cô Thợ Mây", lines: ["Cát nung chảy thành thủy tinh đó!", "Ghé Tiệm áo mây thay đồ đi con.", "Xưởng Vật Liệu sắp mở rồi!"] },
  ];
  const randomSpot = () => { for (;;) { const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 8.5; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (!blocked(x, z) && Math.hypot(x, z - 3) > 2.6) return new THREE.Vector3(x, 0, z); } };
  npcs.forEach((n, k) => { n.o.scale.setScalar(1.15); world.add(n.o); n.o.position.copy(randomSpot()); n.target = n.o.position.clone(); n.wait = 1 + k * 2; n.say = -2 - k * 3; n.bub = mk("bub"); n.bub.style.opacity = 0; });

  // các bạn online
  const others = new Map();
  function addOther(p) {
    if (others.has(p.id)) return;
    const g = new THREE.Group(); const m = makeKid(THREE, p.avatar); g.add(m); world.add(g);
    const pos = new THREE.Vector3(p.x ?? 0, p.y ?? 0, p.z ?? 0); if (p.x == null) pos.copy(randomSpot());
    g.position.copy(pos);
    others.set(p.id, { g, m, name: p.name, target: pos.clone(), ry: p.ry || 0, tag: mk("tag", p.name), bub: mk("bub"), bubT: 0 });
    updateOnline();
  }
  function removeOther(id) { const o = others.get(id); if (!o) return; world.remove(o.g); o.tag.remove(); o.bub.remove(); others.delete(id); updateOnline(); }
  function updateOnline() { $("#online").textContent = `${others.size + 1} bạn trong vương quốc`; }

  // ======================= đi lại =======================
  function bridgeHit(p) {
    let best = null;
    ZONES.forEach((z, i) => {
      const B = z.bridge;
      for (let k = 0; k < B.length - 1; k++) {
        const a = B[k], b = B[k + 1], abx = b.x - a.x, abz = b.z - a.z, L = abx * abx + abz * abz;
        let t = ((p.x - a.x) * abx + (p.z - a.z) * abz) / L; t = Math.max(0, Math.min(1, t));
        const qx = a.x + abx * t, qz = a.z + abz * t, d = Math.hypot(p.x - qx, p.z - qz);
        if (d < 1.05 && (!best || d < best.d)) best = { type: "b", i, k, d, y: a.y + (b.y - a.y) * t - 0.05 };
      }
    });
    return best;
  }
  function regionOf(p) {
    if (Math.hypot(p.x, p.z) <= CENTER_R - 0.6) return { type: "c", y: 0 };
    for (let i = 0; i < ZONES.length; i++) { const z = ZONES[i]; if (Math.hypot(p.x - z.pos.x, p.z - z.pos.z) <= ZR - 0.6) return { type: "z", i, y: z.pos.y }; }
    return bridgeHit(p);
  }
  const canStand = p => { const r = regionOf(p); return r && !(r.type === "c" && blocked(p.x, p.z)) ? r : null; };
  function ringArc(a0, a1) {
    let d = a1 - a0; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    const n = Math.max(1, Math.ceil(Math.abs(d) / 0.08)), pts = [];
    for (let k = 0; k <= n; k++) { const a = a0 + d * k / n; pts.push(new THREE.Vector3(Math.cos(a) * WALK_R, 0, Math.sin(a) * WALK_R)); }
    return pts;
  }
  const clear = (a, b) => { for (let k = 1; k <= 16; k++) { const x = a.x + (b.x - a.x) * k / 16, z = a.z + (b.z - a.z) * k / 16; if (blocked(x, z)) return false; } return true; };
  function routeTo(T) {
    const P = player.position.clone(), rp = regionOf(P), rt = canStand(T);
    if (!rt) return null;
    const pts = [];
    const onSide = r => r && (r.type === "z" || r.type === "b");
    if (onSide(rp) && onSide(rt) && rp.i === rt.i) {
      const B = ZONES[rp.i].bridge, kp = rp.type === "b" ? rp.k : B.length - 1, kt = rt.type === "b" ? rt.k : B.length - 1;
      if (kp <= kt) for (let k = kp + 1; k <= kt; k++) pts.push(B[k]); else for (let k = kp; k > kt; k--) pts.push(B[k]);
      pts.push(T); return pts;
    }
    if (rp && rp.type === "z") pts.push(...ZONES[rp.i].bridge.slice().reverse());
    else if (rp && rp.type === "b") pts.push(...ZONES[rp.i].bridge.slice(0, rp.k + 1).reverse());
    const cur = pts.length ? pts[pts.length - 1] : P;
    if (rt.type === "c") {
      if (clear(cur, T)) pts.push(T);
      else { pts.push(...ringArc(Math.atan2(cur.z, cur.x), Math.atan2(T.z, T.x))); pts.push(T); }
    } else {
      const B = ZONES[rt.i].bridge, k = rt.type === "b" ? rt.k : B.length - 1;
      pts.push(...ringArc(Math.atan2(cur.z, cur.x), ZONES[rt.i].angle));
      pts.push(...B.slice(0, k + 1)); pts.push(T);
    }
    return pts;
  }
  let route = [], seg = 0, walking = false, follow = true;
  function walkToPoint(T, label) {
    const r = routeTo(T); if (!r || !r.length) return false;
    route = [player.position.clone(), ...r]; seg = 0; walking = true; follow = true;
    if (label) { $("#status").textContent = "Đang đi tới " + label + "…"; tiNiSay("Theo mình nào! Mình đi tới " + label + " nhé."); }
    return true;
  }
  const walkToZone = i => walkToPoint(standAt(ZONES[i]), ZONES[i].zone);
  const walkToCenter = () => walkToPoint(START.clone(), "Quảng trường mây");

  // bàn phím
  const keys = new Set();
  const isTyping = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  const onKeyDown = e => {
    if (isTyping(e) || !root.isConnected) return;
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { keys.add(k); e.preventDefault(); walking = false; follow = true; }
    if (k === "e" && nearby) { e.preventDefault(); nearby.act(); }
    if (k === "enter") { $("#chatin").focus(); e.preventDefault(); }
  };
  const onKeyUp = e => keys.delete(e.key.toLowerCase());
  addEventListener("keydown", onKeyDown); addEventListener("keyup", onKeyUp);
  addEventListener("blur", () => keys.clear());

  // bấm chuột trong cảnh
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let downAt = null;
  canvas.addEventListener("pointerdown", e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const rc = canvas.getBoundingClientRect(); ptr.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects([center, bridgeGroup, ...ZONES.map(z => z.group)], true);
    for (const hit of hits) {
      const o = hit.object;
      if (o.userData.action === "wardrobe") return openWd();
      if (o.userData.action === "board") return openRank();
      if (o.userData.walk) { const T = world.worldToLocal(hit.point.clone()); const r = canStand(T); if (r) { T.y = r.y; walkToPoint(T); sound.play("bam"); } return; }
      if (o.userData.zoneIdx !== undefined) return walkToZone(o.userData.zoneIdx);
      if (o.type === "InstancedMesh") continue;
      return;
    }
  });
  controls.addEventListener("start", () => { follow = false; });
  $("#recenter").onclick = () => { follow = true; };

  // ======================= giao diện =======================
  ZONES.forEach((z, i) => {
    const b = document.createElement("button");
    b.className = "zl" + (z.open ? "" : " locked") + (z.open && z.file && z.done < 3 ? " cur" : "");
    b.innerHTML = `<b>${z.zone}</b><small>Bài ${z.num} · ${z.open ? (!z.file ? "đang xây" : z.done === 3 ? "đã nở hoa" : z.done + "/3 hạt") : "chờ cô mở"}</small>`;
    b.addEventListener("click", () => walkToZone(i)); labelsEl.append(b); z.label = b;
  });
  const jl = $("#jlist");
  const jc = document.createElement("button"); jc.className = "jz"; jc.innerHTML = `<span class="dot" style="background:#b79cff">★</span><span>Quảng trường mây<small>Tiệm áo · Bảng xếp hạng</small></span>`; jc.onclick = walkToCenter; jl.append(jc);
  ZONES.forEach((z, i) => {
    const b = document.createElement("button"); b.className = "jz" + (z.open ? "" : " locked");
    b.innerHTML = `<span class="dot" style="background:${z.open ? z.color : "#c3bfd1"}">${z.num}</span><span>${z.zone}<small>${z.open ? (!z.file ? "Đang xây" : z.done === 3 ? "Đã hồi sinh" : z.done + "/3 hạt giống") : "Phủ sương · chờ cô mở"}</small></span>`;
    b.onclick = () => walkToZone(i); jl.append(b); z.jbtn = b;
  });
  function openZone(z) {
    const el = $("#zone");
    el.innerHTML = `<div class="zhead"><div class="zic" style="background:${z.open ? z.color : "#c3bfd1"};box-shadow:inset 0 -5px 0 rgba(0,0,0,.12)">${z.num}</div><div><h2>${z.zone}</h2><p class="sub">Bài ${z.num}. ${z.title}</p></div></div>` +
      z.seeds.map((s, k) => `<div class="seed ${k < z.done ? "done" : ""}"><i>${k < z.done ? "✓" : k + 1}</i>${s}</div>`).join("") +
      (z.open ? `<button class="m3-btn" id="enter">${z.file ? (z.done === 3 ? "Vào khu học lại" : "Vào khu học hạt " + (z.done + 1)) : "Vào xem khu"}</button>` : `<div class="lockmsg">Khu này còn phủ sương mù mềm. Khi cô mở khu, sương tan và cầu sáng lên.</div>`) +
      `<button class="m3-btn ghost" id="back">Về quảng trường</button>`;
    el.classList.add("show");
    el.querySelector("#back").onclick = walkToCenter;
    el.querySelector("#enter")?.addEventListener("click", () => onEnter(z.id));
  }
  const closeZone = () => $("#zone").classList.remove("show");
  let regionNow = null;
  function onRegionChange(r) {
    const zi = r && r.type === "z" ? r.i : null;
    if (zi === regionNow) return;
    regionNow = zi;
    ZONES.forEach((z, i) => z.jbtn.classList.toggle("here", i === zi)); jc.classList.toggle("here", r && r.type === "c");
    if (zi === null) { closeZone(); if (r && r.type === "c") $("#status").textContent = "Em đang ở Quảng trường mây"; return; }
    const z = ZONES[zi]; sound.play("chuong");
    try { sessionStorage.setItem("kvtm-m3d-here", String(zi)); } catch {}
    $("#status").textContent = "Em đang ở " + z.zone;
    tiNiSay(!z.open ? "Khu này còn phủ sương mù mềm. Đợi cô mở khu rồi mình cùng vào nhé!" : !z.file ? "Cô Thợ Mây đang xây khu này, sắp xong rồi!" : z.done === 3 ? "Khu này đã nở hoa nhờ em đó! Muốn ôn thì vào học lại nhé." : "Tới " + z.zone + " rồi! Còn " + (3 - z.done) + " hạt giống đang chờ em.");
    openZone(z);
  }

  // khung chat
  const log = $("#chatlog");
  const fmt = iso => { try { return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
  function addMsg(m, mine = false) {
    const d = document.createElement("div"); d.className = "msg" + (mine ? " mine" : "") + (m.sys ? " sys" : "");
    const b = document.createElement("b"); b.textContent = m.name + ": "; const s = document.createElement("span"); s.textContent = m.text;
    const t = document.createElement("small"); t.textContent = m.at ? " " + fmt(m.at) : "";
    d.append(b, s, t); log.append(d); while (log.children.length > 80) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function tiNiSay(text) { addMsg({ name: "Tí Nị", text, sys: true }); }
  function bubble(el, text) { el.textContent = text.length > 60 ? text.slice(0, 58) + "…" : text; el.style.opacity = 1; el._t = performance.now() + 5000; }
  async function sendChat(text) {
    text = text.trim(); if (!text) return;
    if (!chatOn) return toast("Cô đang tắt trò chuyện lớp.");
    try { const m = await api.chatSend(text); addMsg(m, true); bubble(myBub, m.text); room && room.chat(m); sound.play("bam"); }
    catch (e) { toast(friendlyError(e), "bad"); }
  }
  $("#chatform").addEventListener("submit", e => { e.preventDefault(); const i = $("#chatin"); const v = i.value; i.value = ""; sendChat(v); });
  ["Chào cả lớp!", "Cố lên mọi người!", "Ai học Hồ Ba Thể chưa?", "Đi nhổ cỏ cùng mình không?"].forEach(q => { const b = document.createElement("button"); b.type = "button"; b.textContent = q; b.onclick = () => sendChat(q); $("#quick").append(b); });
  $("#chatToggle").onclick = () => { const c = $("#chat"); c.classList.toggle("min"); $("#chatToggle").textContent = c.classList.contains("min") ? "+" : "–"; };
  if (!chatOn) { $("#chatin").disabled = true; $("#chatin").placeholder = "Cô đang tắt trò chuyện lớp"; }
  api.chatList().then(list => { (list || []).forEach(m => addMsg(m, m.sid === me.id)); tiNiSay(startAt !== null ? "Em đang ở " + ZONES[startAt].zone + ". Đi tiếp bằng phím W A S D hoặc bấm vào khu khác nhé!" : "Chào " + me.name + "! Đi bằng phím W A S D, hoặc bấm vào chỗ muốn tới. Ghé Tiệm áo mây để thay đồ nhé!"); }).catch(() => tiNiSay("Chào " + me.name + "!"));

  // bảng xếp hạng
  async function openRank() {
    let list = [];
    try { list = await api.leaderboard(); } catch (e) { return toast(friendlyError(e), "bad"); }
    drawBoard(list);
    const rank = list.findIndex(r => r.me) + 1;
    const medal = ["#ffd23f", "#d6dbe8", "#f0a46a"];
    modal(h("div", { class: "rank" },
      h("h2", {}, "Bảng xếp hạng lớp"),
      h("p", { class: "small muted" }, "Điểm mây = hạt giống đã học × 10 + cỏ dại đã tự sửa × 5"),
      rank ? h("p", { class: "rank-me" }, `Em đang đứng thứ ${rank} / ${list.length}`) : null,
      h("ol", { class: "rank-list" }, list.slice(0, 30).map((r, i) => h("li", { class: r.me ? "me" : "" },
        h("span", { class: "rk", style: { background: medal[i] || "#efe8ff" } }, i + 1),
        h("b", {}, r.name), h("span", { class: "small muted" }, `${r.seeds} hạt · ${r.fixed} cỏ`), h("span", { class: "pts" }, r.score))))), {});
  }
  $("#rank").onclick = openRank;
  api.leaderboard().then(drawBoard).catch(() => {});

  // tủ đồ
  function openWd() {
    openWardrobe(THREE, me.avatar, av => {
      me.avatar = av; onSaveAvatar && onSaveAvatar(av);
      player.remove(kid); kid = makeKid(THREE, av); player.add(kid);
      room && room.look(av); bubble(myBub, "Đồ mới xinh không?");
    });
  }
  $("#wardrobe").onclick = openWd;

  // gợi ý khi đứng gần tiệm / bảng
  let nearby = null;
  const SPOTS = [{ p: SHOP_DOOR, text: "Mở Tủ đồ (phím E)", act: openWd }, { p: BOARD_SPOT, text: "Xem Bảng xếp hạng (phím E)", act: openRank }];
  const prompt = $("#prompt"); prompt.onclick = () => nearby && nearby.act();

  // ======================= online =======================
  let room = null;
  joinRoom(me.classId, { id: me.id, name: me.name, avatar: me.avatar, x: player.position.x, y: player.position.y, z: player.position.z }, {
    join: p => addOther(p),
    leave: id => removeOther(id),
    move: (id, p) => { const o = others.get(id); if (o) { o.target.set(p.x, p.y ?? 0, p.z); if (p.ry !== undefined) o.ry = p.ry; } },
    look: (id, av) => { const o = others.get(id); if (o) { o.g.remove(o.m); o.m = makeKid(THREE, av); o.g.add(o.m); } },
    chat: m => { addMsg(m, false); const o = others.get(m.sid); if (o) bubble(o.bub, m.text); },
  }).then(r => { room = r; if (!root.isConnected) r.leave(); }).catch(err => { console.warn("Không vào được phòng online", err); tiNiSay("Chưa kết nối được với các bạn. Em vẫn học bình thường nhé."); });

  // ======================= vòng lặp =======================
  const tmp = new THREE.Vector3(), prevT = new THREE.Vector3();
  function resize() { const w = root.clientWidth || 800, ht = root.clientHeight || 500; renderer.setSize(w, ht, false); camera.aspect = w / ht; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();
  camera.position.copy(player.position).add(new THREE.Vector3(0, 16, 24)); controls.target.copy(player.position).add(new THREE.Vector3(0, 1, 0));
  function place(el, p, hide = false) {
    if (hide) { el.style.display = "none"; return; }
    tmp.copy(p); world.localToWorld(tmp); tmp.project(camera);
    if (tmp.z > 1 || Math.abs(tmp.x) > 1.2 || Math.abs(tmp.y) > 1.2) { el.style.display = "none"; return; }
    el.style.display = "";
    el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * root.clientWidth}px, ${(-tmp.y * 0.5 + 0.5) * root.clientHeight}px) translate(-50%, -100%)`;
  }
  const UP = (y) => new THREE.Vector3(0, y, 0);
  function cleanup() {
    ro.disconnect(); renderer.dispose(); removeEventListener("keydown", onKeyDown); removeEventListener("keyup", onKeyUp);
    room && room.leave();
  }

  let lastSend = 0, lastSent = new THREE.Vector3(1e9, 0, 0);
  const clock = new THREE.Clock();
  function tick() {
    if (!root.isConnected) { cleanup(); return; }
    try {
      const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      const before = player.position.clone();
      // bàn phím: hướng theo máy quay
      if (keys.size) {
        const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
        const v = new THREE.Vector3();
        if (keys.has("w") || keys.has("arrowup")) v.add(fwd);
        if (keys.has("s") || keys.has("arrowdown")) v.sub(fwd);
        if (keys.has("d") || keys.has("arrowright")) v.add(right);
        if (keys.has("a") || keys.has("arrowleft")) v.sub(right);
        if (v.lengthSq() > 0) {
          v.normalize().multiplyScalar(7 * dt);
          const p = player.position;
          for (const c of [new THREE.Vector3(p.x + v.x, 0, p.z + v.z), new THREE.Vector3(p.x + v.x, 0, p.z), new THREE.Vector3(p.x, 0, p.z + v.z)]) {
            const r = canStand(c); if (r) { p.x = c.x; p.z = c.z; p.y = THREE.MathUtils.lerp(p.y, r.y, 0.5); break; }
          }
        }
      } else if (walking) {
        let step = 7 * dt;
        while (step > 0 && seg < route.length - 1) {
          const a = player.position, b = route[seg + 1], d = a.distanceTo(b);
          if (d <= step) { a.copy(b); seg++; step -= d; } else { a.addScaledVector(b.clone().sub(a).normalize(), step); step = 0; }
        }
        if (seg >= route.length - 1) walking = false;
      }
      const mv = player.position.clone().sub(before); mv.y = 0;
      const moving = mv.lengthSq() > 1e-6;
      if (moving) player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, Math.atan2(mv.x, mv.z), 0.3);
      animateKid(kid, moving, t);
      onRegionChange(regionOf(player.position));
      // gần tiệm / bảng
      nearby = SPOTS.find(s => s.p.distanceTo(player.position) < 2.8) || null;
      prompt.hidden = !nearby; if (nearby) prompt.textContent = nearby.text;
      // gửi vị trí cho các bạn
      if (room && performance.now() - lastSend > 150 && lastSent.distanceTo(player.position) > 0.05) {
        lastSend = performance.now(); lastSent.copy(player.position);
        room.move({ x: +player.position.x.toFixed(2), y: +player.position.y.toFixed(2), z: +player.position.z.toFixed(2), ry: +player.rotation.y.toFixed(2) });
      }
      // Tí Nị bay theo
      const behind = player.position.clone().add(new THREE.Vector3(-Math.sin(player.rotation.y) * 1.4 - 0.6, 2.3 + Math.sin(t * 2.2) * 0.2, -Math.cos(player.rotation.y) * 1.4));
      tini.position.lerp(behind, 0.06); tini.rotation.y = player.rotation.y;
      // NPC
      npcs.forEach(n => {
        const o = n.o, d = n.target.clone().sub(o.position); d.y = 0;
        if (d.length() > 0.1) { const s = d.normalize().multiplyScalar(1.6 * dt); o.position.add(s); o.rotation.y = Math.atan2(s.x, s.z); o.userData.body.position.y = Math.abs(Math.sin(t * 8)) * 0.12; }
        else { o.userData.body.position.y = 0; if ((n.wait -= dt) < 0) { n.target = randomSpot(); n.wait = 2 + Math.random() * 3; } }
        n.say -= dt;
        if (n.say < -8) { n.say = 4; n.bub.textContent = n.name + ": " + n.lines[(Math.random() * n.lines.length) | 0]; }
        n.bub.style.opacity = n.say > 0 ? 1 : 0;
        place(n.bub, o.position.clone().add(UP(2.4)));
      });
      // các bạn online
      const now = performance.now();
      others.forEach(o => {
        const d = o.target.clone().sub(o.g.position), dist = d.length();
        o.g.position.lerp(o.target, dist > 12 ? 1 : 0.18);
        const mvv = dist > 0.04;
        if (mvv) o.g.rotation.y = THREE.MathUtils.lerp(o.g.rotation.y, Math.atan2(d.x, d.z), 0.25);
        animateKid(o.m, mvv, t + 0.5);
        place(o.tag, o.g.position.clone().add(UP(2.15)));
        if (o.bub._t && now > o.bub._t) o.bub.style.opacity = 0;
        place(o.bub, o.g.position.clone().add(UP(2.75)), o.bub.style.opacity === "0" || !o.bub._t);
      });
      anim.forEach(f => f(t, dt));
      clouds.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > 140) c.position.x = -140; });
      world.position.y = reduce ? 0 : Math.sin(t * 0.6) * 0.15;
      if (follow) {
        prevT.copy(controls.target);
        const want = player.position.clone().add(UP(1.2 + world.position.y));
        controls.target.lerp(want, 0.08);
        camera.position.add(controls.target.clone().sub(prevT));
      }
      controls.update();
      renderer.render(scene, camera);
      ZONES.forEach(z => place(z.label, z.pos.clone().add(UP(10))));
      place(myTag, player.position.clone().add(UP(2.15)));
      if (myBub._t && now > myBub._t) myBub.style.opacity = 0;
      place(myBub, player.position.clone().add(UP(2.75)), myBub.style.opacity === "0" || !myBub._t);
    } catch (err) { console.error(err); cleanup(); onFail && onFail(err); return; }
    requestAnimationFrame(tick);
  }
  tick();
}
