// Vườn Mây 3D: 25 luống đất trên một hòn đảo mây nhỏ, Cô Mây đội nón rơm cầm bình tưới đi trông vườn.
// opts: getTiles() → [{ plant: {stage, prog, color} | null, weeds: [{id, big}] }], onTile(i, ev), onWeed(id, ev), onCoMay()
export async function mountGarden3D(root, o) {
  const THREE = await import("three");
  const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
  const canvas = document.createElement("canvas"); canvas.setAttribute("aria-label", "Vườn Mây 3D: bấm vào luống đất để gieo, thu hoạch hoặc nhổ cỏ");
  const tip = document.createElement("div"); tip.className = "g3d-tip"; tip.hidden = true;
  root.append(canvas, tip);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const LOW = /iPad|iPhone|Android|Mobi/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.25 : 2)); renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 300);
  camera.position.set(17, 22, 21);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, enablePan: false, minDistance: 16, maxDistance: 48, minPolarAngle: 0.45, maxPolarAngle: 1.1 });
  controls.target.set(0, 0, 0.6);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb6dcff, 1.4));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.3); sun.position.set(10, 22, 12); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 }); sun.shadow.normalBias = 0.04; scene.add(sun);

  const MC = {};
  const mat = (c, x = {}) => (MC[c + JSON.stringify(x)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...x }));
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const k = new THREE.Mesh(g, m); k.position.set(x, y, z); k.castShadow = true; k.receiveShadow = true; return k; };
  const anim = [];

  // ====== Nông trại mây (kiểu nông trại vui vẻ): đất vuông, hàng rào, chuồng trại, cây ăn quả viền quanh ======
  const island = new THREE.Group(); scene.add(island);
  const HALF = 15;
  island.add(mesh(new THREE.BoxGeometry(HALF * 2, 0.6, HALF * 2), mat("#7fcf57"), 0, -0.3, 0));
  island.add(mesh(new THREE.BoxGeometry(HALF * 2 - 0.4, 3.2, HALF * 2 - 0.4), mat("#b98a5e"), 0, -2.2, 0));
  island.add(mesh(new THREE.BoxGeometry(HALF * 2 - 2, 2, HALF * 2 - 2), mat("#9a6b45"), 0, -4.4, 0));
  for (let k = 0; k < 7; k++) island.add(mesh(new THREE.BoxGeometry(HALF * 2 - 0.2, 0.02, 1.6), mat("#8bd862"), 0, 0.01, -HALF + 2 + k * 4.4)); // sọc cỏ
  for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, r = HALF * 1.45; island.add(mesh(new THREE.SphereGeometry(1.2 + (k % 3) * 0.4, 12, 10), mat("#ffffff"), Math.cos(a) * r * 0.75, -3 + (k % 2), Math.sin(a) * r * 0.75)); }
  // cỏ lấm tấm
  const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.35, 4), mat("#5fb83f"), 260), d = new THREE.Object3D();
  for (let i = 0; i < tuft.count; i++) { let x, z; do { x = (Math.random() - 0.5) * (HALF * 2 - 1); z = (Math.random() - 0.5) * (HALF * 2 - 1); } while (Math.abs(x) < 8.8 && Math.abs(z) < 8.8); d.position.set(x, 0.15, z); d.rotation.y = Math.random() * 3; d.updateMatrix(); tuft.setMatrixAt(i, d.matrix); }
  island.add(tuft);
  // cây ăn quả viền quanh nông trại
  function tree(x, z, c, s = 1, fruit = "#ff4a4a") { const g = new THREE.Group(); g.position.set(x, 0, z); g.add(mesh(new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 1.2 * s, 7), mat("#8a5a3c"), 0, 0.6 * s, 0));
    g.add(mesh(new THREE.SphereGeometry(0.95 * s, 12, 10), mat(c), 0, 1.75 * s, 0)); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + x; g.add(mesh(new THREE.SphereGeometry(0.13 * s, 8, 6), mat(fruit), Math.cos(a) * 0.8 * s, 1.6 * s + (k % 2) * 0.35, Math.sin(a) * 0.8 * s)); }
    island.add(g); return g; }
  for (let k = -13; k <= 13; k += 2.2) { tree(k, -HALF + 1, k % 4 > 1 ? "#4fae3a" : "#5cbf45", 1, k % 3 > 1 ? "#ff8a1f" : "#ff4a4a"); tree(k + 1.1, HALF - 1, "#5cbf45", 0.95, k % 3 > 1 ? "#ff4a4a" : "#ffb31f");
    if (Math.abs(k) > 1) { tree(-HALF + 1, k, "#4fae3a", 0.95, "#ff4a4a"); tree(HALF - 1, k + 1.1, "#5cbf45", 1, "#ff8a1f"); } }
  // hàng rào gỗ quanh khu luống (chừa cổng phía trước)
  const F = 8.4, wood = mat("#c89b6a"), woodD = mat("#a87a4c");
  function fenceLine(x1, z1, x2, z2, gap = null) { const n = Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 1.2);
    for (let k = 0; k <= n; k++) { const x = x1 + (x2 - x1) * k / n, z = z1 + (z2 - z1) * k / n; if (gap && Math.abs(x) < gap) continue; island.add(mesh(new THREE.BoxGeometry(0.18, 0.9, 0.18), woodD, x, 0.45, z)); }
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
    const rails = gap ? [[x1, -gap], [gap, x2]] : [[x1, x2]];
    rails.forEach(([a, b]) => [0.35, 0.7].forEach(y => { const L = gap ? Math.abs(b - a) : len; const r = mesh(new THREE.BoxGeometry(L, 0.1, 0.08), wood, gap ? (a + b) / 2 : (x1 + x2) / 2, y, gap ? z1 : (z1 + z2) / 2); r.rotation.y = gap ? 0 : -ang; island.add(r); })); }
  fenceLine(-F, -F, F, -F); fenceLine(-F, -F, -F, F); fenceLine(F, -F, F, F); fenceLine(-F, F, F, F, 1.4);
  // lối đi lát đá từ cổng
  for (let k = 0; k < 6; k++) island.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 8), mat("#cfc6b8"), (k % 2 - 0.5) * 0.5, 0.03, F + 0.9 + k * 1.05));
  // chuồng đỏ + tháp ủ
  const barn = new THREE.Group(); barn.position.set(-10.8, 0, -10.6); barn.rotation.y = 0.5; island.add(barn);
  barn.add(mesh(new THREE.BoxGeometry(4, 3, 3.4), mat("#d63a3a"), 0, 1.5, 0));
  const rf = new THREE.CylinderGeometry(2.6, 2.6, 3.6, 3, 1); rf.rotateZ(Math.PI / 2); rf.rotateY(Math.PI / 2); const rfm = mesh(rf, mat("#8a2a2a"), 0, 3.6, 0); rfm.scale.set(0.82, 0.55, 1); rfm.rotation.y = Math.PI / 2; barn.add(rfm);
  barn.add(mesh(new THREE.BoxGeometry(1.8, 2, 0.1), mat("#ffffff"), 0, 1, 1.72)); [-1, 1].forEach(s => { const x = mesh(new THREE.BoxGeometry(2.6, 0.14, 0.12), mat("#ffffff"), 0, 1, 1.78); x.rotation.z = s * 0.82; barn.add(x); });
  barn.add(mesh(new THREE.BoxGeometry(0.9, 0.9, 0.1), mat("#ffffff"), 0, 2.7, 1.72));
  const silo = new THREE.Group(); silo.position.set(-13.4, 0, -8.2); island.add(silo);
  silo.add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 4.2, 16), mat("#e8e2d6"), 0, 2.1, 0)); silo.add(mesh(new THREE.SphereGeometry(0.92, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat("#7a8aa8"), 0, 4.2, 0));
  // nhà vàng mái xanh
  const house = new THREE.Group(); house.position.set(11, 0, -10.5); house.rotation.y = -0.5; island.add(house);
  house.add(mesh(new THREE.BoxGeometry(3.4, 2.4, 2.8), mat("#ffe27a"), 0, 1.2, 0));
  const hr = mesh(new THREE.ConeGeometry(2.7, 1.6, 4), mat("#5a6a8a"), 0, 3.2, 0); hr.rotation.y = Math.PI / 4; hr.scale.z = 0.85; house.add(hr);
  house.add(mesh(new THREE.BoxGeometry(0.7, 1.3, 0.1), mat("#8a5a3c"), 0, 0.65, 1.42)); [-1, 1].forEach(s => house.add(mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), mat("#bfe8ff", { emissive: "#7fc8ff", emissiveIntensity: 0.3 }), s * 1.05, 1.4, 1.42)));
  // chuồng thú: bò, lợn, cừu
  const pen = new THREE.Group(); pen.position.set(11.6, 0, 2.6); island.add(pen);
  [[-2.2, -5, 2.2, -5], [-2.2, 5, 2.2, 5], [-2.2, -5, -2.2, 5], [2.2, -5, 2.2, 5]].forEach(([a, b, c, e]) => { const n = Math.ceil(Math.hypot(c - a, e - b) / 1.1);
    for (let k = 0; k <= n; k++) pen.add(mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), woodD, a + (c - a) * k / n, 0.4, b + (e - b) * k / n));
    const r = mesh(new THREE.BoxGeometry(Math.hypot(c - a, e - b), 0.08, 0.08), wood, (a + c) / 2, 0.6, (b + e) / 2); r.rotation.y = -Math.atan2(e - b, c - a); pen.add(r); });
  pen.add(mesh(new THREE.BoxGeometry(1.4, 0.3, 0.5), mat("#8a5a3c"), -1.2, 0.15, -4.2)); pen.add(mesh(new THREE.BoxGeometry(1.2, 0.08, 0.35), mat("#7fd0ff"), -1.2, 0.32, -4.2));
  function animal(kind) { const g = new THREE.Group(); const C = { bo: ["#ffffff", "#2b2238"], lon: ["#ffb3c6", "#ff8fab"], cuu: ["#f4f4f8", "#3b3346"] }[kind];
    const b = mesh(new THREE.BoxGeometry(kind === "cuu" ? 0.9 : 1.1, kind === "bo" ? 0.7 : 0.6, kind === "cuu" ? 0.7 : 0.65), mat(C[0]), 0, kind === "bo" ? 0.75 : 0.55, 0); g.add(b);
    if (kind === "cuu") for (let k = 0; k < 6; k++) g.add(mesh(new THREE.SphereGeometry(0.3, 8, 6), mat("#ffffff"), -0.3 + (k % 3) * 0.3, 0.8, k < 3 ? -0.15 : 0.15));
    if (kind === "bo") [[0.2, 0.2], [-0.25, -0.15]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(0.3, 0.3, 0.02), mat("#2b2238"), x, 0.85, 0.34 * Math.sign(z + 0.01))));
    const hd = mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), mat(kind === "cuu" ? C[1] : C[0]), 0.7, kind === "bo" ? 1 : 0.7, 0); g.add(hd);
    if (kind === "lon") g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 10), mat(C[1]), 0.95, 0.66, 0)).rotation.z = Math.PI / 2;
    [[-0.35, -0.2], [-0.35, 0.2], [0.35, -0.2], [0.35, 0.2]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(0.14, kind === "bo" ? 0.45 : 0.3, 0.14), mat(kind === "cuu" ? C[1] : C[0]), x, kind === "bo" ? 0.22 : 0.15, z)));
    g.userData.base = { x: 0, z: 0 }; return g; }
  const herd = [["bo", -0.8, -3.2], ["bo", 0.8, -2], ["lon", -0.6, 0.4], ["lon", 0.9, 1.2], ["cuu", -0.8, 2.8], ["cuu", 0.6, 3.6], ["cuu", 1.2, 2.4]].map(([k, x, z], i) => { const a = animal(k); a.position.set(x, 0, z); a.rotation.y = i; a.userData.home = [x, z]; pen.add(a); return a; });
  anim.push(t => herd.forEach((a, i) => { const [hx, hz] = a.userData.home; a.position.x = hx + Math.sin(t * 0.3 + i) * 0.5; a.position.z = hz + Math.cos(t * 0.25 + i * 2) * 0.4; a.rotation.y = Math.sin(t * 0.3 + i) * 1.2 + i; a.children[0].position.y += Math.sin(t * 6 + i) * 0.002; }));
  // gà, đống rơm, bù nhìn bên trái
  [[-11.5, 1], [-12.6, 2.4], [-10.6, 3.2], [-12, 4.6]].forEach(([x, z], i) => { const c = new THREE.Group(); c.position.set(x, 0, z); c.add(mesh(new THREE.SphereGeometry(0.28, 10, 8), mat("#ffffff"), 0, 0.3, 0)); c.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), mat("#ffffff"), 0.2, 0.55, 0)); c.add(mesh(new THREE.ConeGeometry(0.05, 0.1, 4), mat("#ffb31f"), 0.36, 0.55, 0)).rotation.z = -Math.PI / 2; c.add(mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), mat("#ff4a4a"), 0.2, 0.72, 0)); island.add(c); anim.push(t => { c.position.y = Math.abs(Math.sin(t * 4 + i)) * 0.1; c.rotation.y = Math.sin(t * 0.7 + i) * 2; }); });
  [[-11.4, -3.2], [-12.6, -3.2], [-12, -2.2], [-11.2, -1.8]].forEach(([x, z], k) => island.add(mesh(new THREE.BoxGeometry(1.1, 0.7, 0.8), mat(k === 2 ? "#f2d06a" : "#e8c25a"), x, 0.35 + (k === 2 ? 0.7 : 0), z)));
  const sc = new THREE.Group(); sc.position.set(-10.4, 0, 7.4); island.add(sc); sc.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), wood, 0, 1.1, 0)); sc.add(mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), wood, 0, 1.6, 0)); sc.add(mesh(new THREE.BoxGeometry(0.6, 0.7, 0.3), mat("#3b6ad9"), 0, 1.5, 0)); sc.add(mesh(new THREE.SphereGeometry(0.25, 10, 8), mat("#f2d06a"), 0, 2.1, 0)); sc.add(mesh(new THREE.ConeGeometry(0.4, 0.3, 10), mat("#c89b2a"), 0, 2.35, 0));
  // bướm
  const flies = [0, 1, 2, 3].map(i => { const b = new THREE.Group(); [-1, 1].forEach(s => { const w = mesh(new THREE.CircleGeometry(0.25, 12), mat(["#ffb3d1", "#ffe680", "#b79cff", "#9ff0d0"][i], { side: THREE.DoubleSide })); w.position.x = s * 0.2; b.add(w); }); island.add(b); return b; });
  anim.push(t => flies.forEach((b, i) => { const a = t * 0.5 + i * 1.6; b.position.set(Math.cos(a) * (7 + i), 1.6 + Math.sin(t * 2 + i) * 0.5, Math.sin(a * 1.3) * (6 + i * 0.5)); b.rotation.y = -a; b.children.forEach((w, k) => { w.rotation.y = (k ? -1 : 1) * Math.sin(t * 14) * 0.8; }); }));

  // 25 luống
  const S = 2.35, tiles = [];
  for (let i = 0; i < 25; i++) {
    const x = (i % 5 - 2) * S, z = (Math.floor(i / 5) - 2) * S + 0.6;
    const g = new THREE.Group(); g.position.set(x, 0, z); island.add(g);
    const soil = mesh(new THREE.BoxGeometry(2, 0.4, 2, 1, 1, 1), new THREE.MeshStandardMaterial({ color: "#a8774f", roughness: 0.95 }), 0, 0.2, 0);
    soil.userData.tile = i; g.add(soil);
    [-0.6, -0.2, 0.2, 0.6].forEach(dz => g.add(mesh(new THREE.BoxGeometry(1.8, 0.12, 0.22), mat("#7a4f2c"), 0, 0.44, dz)));
    g.add(mesh(new THREE.BoxGeometry(2.15, 0.12, 2.15), mat("#5fb83f"), 0, 0.02, 0));
    const slot = new THREE.Group(); g.add(slot);
    tiles.push({ g, soil, slot, key: "" });
  }
  const hit = (obj, data) => obj.traverse(c => Object.assign(c.userData, data));

  function plant(stage, color, t) {
    const g = new THREE.Group(), leaf = mat("#5fc24a");
    if (stage === 0) { g.add(mesh(new THREE.SphereGeometry(0.45, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat("#8d5f3b"), 0, 0.4, 0)); g.add(mesh(new THREE.SphereGeometry(0.13, 10, 8), mat(color), 0, 0.72, 0)); return g; }
    const h = [0, 0.7, 1.3, 1.8][stage];
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, h, 6), leaf, 0, 0.4 + h / 2, 0));
    const lv = stage === 1 ? 2 : 4;
    for (let k = 0; k < lv; k++) { const l = mesh(new THREE.SphereGeometry(0.28, 10, 6), leaf, 0, 0, 0); l.scale.set(1.3, 0.35, 0.7); const a = k / lv * Math.PI * 2; l.position.set(Math.cos(a) * 0.3, 0.45 + h * (0.4 + (k % 2) * 0.3), Math.sin(a) * 0.3); l.rotation.y = -a; g.add(l); }
    if (stage >= 2) [[0.32, 0.1], [-0.3, -0.12]].forEach(([dx, dz]) => g.add(mesh(new THREE.SphereGeometry(0.34, 12, 10), mat("#6ccb52"), dx, 0.4 + h * 0.75, dz)));
    if (stage === 3) {
      const top = new THREE.Group(); top.position.y = 0.45 + h; g.add(top);
      for (let k = 0; k < 6; k++) { const p = mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(color, { emissive: color, emissiveIntensity: 0.25 })); const a = k / 6 * Math.PI * 2; p.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3); p.scale.y = 0.6; top.add(p); }
      top.add(mesh(new THREE.SphereGeometry(0.2, 12, 10), mat("#ffd23f", { emissive: "#ffcf3a", emissiveIntensity: 0.6 })));
      const ring = mesh(new THREE.TorusGeometry(0.85, 0.05, 6, 32), mat("#fff3b0", { emissive: "#ffd23f", emissiveIntensity: 1 }), 0, 0.45, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
      g.userData.ready = { top, ring };
    }
    return g;
  }
  function weed(big) {
    const g = new THREE.Group(), s = 0.75 + big * 0.22;
    const body = mesh(new THREE.IcosahedronGeometry(0.42 * s, 0), mat("#8a5cc7", { flatShading: true }), 0, 0.75 * s, 0); g.add(body);
    for (let k = 0; k < 7; k++) { const sp = mesh(new THREE.ConeGeometry(0.1 * s, 0.45 * s, 5), mat("#6c3fb0")); const a = k / 7 * Math.PI * 2; sp.position.set(Math.cos(a) * 0.36 * s, 0.85 * s, Math.sin(a) * 0.36 * s); sp.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(sp); }
    [-1, 1].forEach(sx => { g.add(mesh(new THREE.SphereGeometry(0.08 * s, 8, 6), mat("#ffffff"), sx * 0.14 * s, 0.82 * s, 0.36 * s)); g.add(mesh(new THREE.SphereGeometry(0.045 * s, 6, 4), mat("#2f2346"), sx * 0.14 * s, 0.82 * s, 0.42 * s));
      const brow = mesh(new THREE.BoxGeometry(0.14 * s, 0.03 * s, 0.03 * s), mat("#2f2346"), sx * 0.14 * s, 0.94 * s, 0.4 * s); brow.rotation.z = sx * 0.4; g.add(brow); });
    return g;
  }
  let weedObjs = [];
  function update() {
    const data = o.getTiles(); weedObjs = [];
    data.forEach((d, i) => {
      const T = tiles[i], p = d.plant;
      const key = p ? p.stage + p.color : "", wk = d.weeds.map(w => w.id + w.big).join();
      T.soil.material.color.set(p ? "#9a6a45" : "#a8774f");
      if (key + "|" + wk === T.key) { T.weeds && weedObjs.push(...T.weeds); return; }
      T.key = key + "|" + wk; T.slot.clear(); T.plant = null; T.weeds = [];
      if (p) { const pl = plant(p.stage, p.color); hit(pl, { tile: i }); T.slot.add(pl); T.plant = pl; }
      d.weeds.slice(0, 3).forEach((w, k) => { const wo = weed(w.big); wo.position.set(-0.6 + k * 0.6, 0, 0.6); hit(wo, { weed: w.id }); wo.userData.base = wo.position.clone(); T.slot.add(wo); T.weeds.push(wo); });
      weedObjs.push(...T.weeds);
    });
  }
  anim.push(t => tiles.forEach((T, i) => {
    const r = T.plant?.userData.ready; if (r) { r.top.position.y = r.top.position.y + Math.sin(t * 3 + i) * 0.004; r.top.rotation.y = t; r.ring.material.emissiveIntensity = 0.6 + Math.sin(t * 4) * 0.4; }
    T.weeds?.forEach((w, k) => { w.rotation.z = Math.sin(t * 5 + k + i) * 0.12; w.position.y = Math.abs(Math.sin(t * 3 + k)) * 0.06; });
  }));

  // Cô Mây trông vườn: đám mây trắng, nón rơm, bình tưới
  const coMay = new THREE.Group(), body = new THREE.Group(); coMay.add(body); island.add(coMay);
  const cm = mat("#ffffff", { roughness: 0.95, emissive: "#e8eeff", emissiveIntensity: 0.2 });
  [[0, 1.1, 0, 0.62], [0.45, 0.95, 0, 0.42], [-0.45, 0.95, 0, 0.42], [0, 1.55, -0.05, 0.45], [0, 0.6, 0, 0.45]].forEach(([x, y, z, r]) => body.add(mesh(new THREE.SphereGeometry(r, 16, 12), cm, x, y, z)));
  [-1, 1].forEach(sx => { body.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), mat("#2f2346"), sx * 0.17, 1.3, 0.55)); const ck = mesh(new THREE.SphereGeometry(0.09, 8, 6), mat("#ffadc6"), sx * 0.32, 1.17, 0.5); ck.scale.set(1.3, 0.7, 0.5); body.add(ck); });
  body.add(mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 12, Math.PI), mat("#2f2346"), 0, 1.16, 0.6)).rotation.z = Math.PI;
  body.add(mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 24), mat("#f2c46a"), 0, 1.92, 0));
  body.add(mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.38, 20), mat("#f2c46a"), 0, 2.1, 0));
  body.add(mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.1, 20), mat("#ff8fb8"), 0, 1.98, 0));
  const can = new THREE.Group(); can.position.set(0.75, 0.9, 0.25); body.add(can);
  can.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.42, 14), mat("#7cc8ff", { metalness: 0.3, roughness: 0.4 })));
  const spout = mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.5, 6), mat("#7cc8ff")); spout.position.set(0.3, 0.1, 0); spout.rotation.z = -1; can.add(spout);
  const drops = [0, 1, 2, 3, 4].map(() => { const dd = mesh(new THREE.SphereGeometry(0.05, 6, 4), mat("#7fd0ff", { emissive: "#4fb0ee", emissiveIntensity: 0.5 })); dd.visible = false; island.add(dd); return dd; });
  hit(coMay, { coMay: true });
  let cmTarget = new THREE.Vector3(0, 0, 7.2), cmWait = 0, watering = 0;
  coMay.position.set(0, 0, 7.2);
  const route = [[-7, 7.4], [7, 7.4], [7.4, -6.4], [-7.4, -6.4]];
  let ri = 0;
  anim.push((t, dt) => {
    const dv = cmTarget.clone().sub(coMay.position); dv.y = 0;
    if (dv.length() > 0.1) { const s = dv.normalize().multiplyScalar(1.6 * dt); coMay.position.add(s); coMay.rotation.y = Math.atan2(s.x, s.z); body.position.y = Math.abs(Math.sin(t * 7)) * 0.12; }
    else if ((cmWait -= dt) < 0) {
      const busy = tiles.filter(T => T.plant); // ghé một luống đang có cây để tưới
      if (busy.length && Math.random() < 0.6) { const T = busy[Math.floor(Math.random() * busy.length)]; cmTarget = T.g.position.clone().add(new THREE.Vector3(-1.4, 0, 1.4)); watering = 2.5; }
      else { const r = route[ri++ % route.length]; cmTarget = new THREE.Vector3(r[0], 0, r[1]); watering = 0; }
      cmWait = 2 + Math.random() * 2;
    } else { body.position.y = Math.sin(t * 2) * 0.05; }
    const w = dv.length() <= 0.1 && watering > 0; can.rotation.z = w ? -0.6 : 0;
    drops.forEach((dd, k) => { dd.visible = w; if (w) { const f = (t * 1.5 + k / 5) % 1; const sp = new THREE.Vector3(); can.localToWorld(sp.set(0.55, 0, 0)); island.worldToLocal(sp); dd.position.set(sp.x + f * 0.5, sp.y - f * 1.1, sp.z + (k - 2) * 0.05); } });
    if (w) watering -= dt;
  });

  // bấm chọn
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null, hover = null;
  const pick = e => { const rc = canvas.getBoundingClientRect(); ptr.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1); ray.setFromCamera(ptr, camera);
    for (const x of ray.intersectObjects(island.children, true)) { const u = x.object.userData; if (u.weed || u.tile !== undefined || u.coMay) return u; } return null; };
  canvas.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const u = pick(e); if (!u) return;
    if (u.weed) o.onWeed(u.weed, e); else if (u.coMay) o.onCoMay && o.onCoMay(); else o.onTile(u.tile, e);
  });
  canvas.addEventListener("pointermove", e => {
    const u = pick(e); const i = u && !u.weed && !u.coMay ? u.tile : null;
    if (hover !== null && hover !== i) tiles[hover].soil.material.emissive.set("#000000");
    if (i !== null && i !== undefined) tiles[i].soil.material.emissive.set("#5a3a10");
    hover = i ?? null; canvas.style.cursor = u ? "pointer" : "grab";
    tip.hidden = !u; if (u) { tip.textContent = u.weed ? "Cỏ dại: bấm để nhổ" : u.coMay ? "Cô Mây trông vườn" : o.tipOf ? o.tipOf(u.tile) : ""; tip.style.transform = `translate(${e.offsetX + 14}px, ${e.offsetY + 10}px)`; }
  });

  function resize() { const w = root.clientWidth, ht = root.clientHeight; if (!w || !ht) return; renderer.setSize(w, ht, false); camera.aspect = w / ht; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();
  const clock = new THREE.Clock(); let alive = true;
  function tick() {
    if (!alive) return;
    if (!root.isConnected) { dispose(); return; }
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    anim.forEach(f => f(t, dt)); island.rotation.y = 0; controls.update(); renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  function dispose() { alive = false; ro.disconnect(); renderer.dispose(); }
  update(); tick();
  return { update, dispose };
}
