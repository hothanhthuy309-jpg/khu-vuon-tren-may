// Nhân vật học sinh tỉ lệ chibi (nam / nữ) và Tủ đồ chủ đề mây
import { h, btn, modal } from "./ui.js";
import { sound } from "./sound.js";

export const SKIN = ["#ffe0c7", "#f1c39b", "#c98e62"];
export const HAIR = ["#3b2a2a", "#7a4a2a", "#e8b04a", "#ff8fb8", "#7c6cff", "#e6e6ee"];
export const SHIRT = ["#ff8fb8", "#7cc8ff", "#7ee0b5", "#ffd23f", "#b79cff", "#ff9f80"];
export const HATS = [["", "Không đội"], ["bong", "Mũ bông"], ["luoitrai", "Mũ lưỡi trai"], ["no", "Nơ xinh"], ["mua", "Mũ mưa vàng"], ["vuongmien", "👑 Vương miện", 40], ["phuthuy", "🧙 Mũ phù thủy", 30], ["vonghoa", "🌸 Vòng hoa", 20], ["tainghe", "🎧 Tai nghe", 25], ["baoho", "🥽 Kính bảo hộ thí nghiệm", 15]];
export const ACCS = [["", "Không có"], ["canh", "Cánh nhỏ"], ["kinh", "Kính phi công"], ["khan", "Khăn quàng"], ["aomua", "Áo mưa vàng"], ["aochoang", "🦸 Áo choàng", 35], ["balo", "🎒 Ba lô", 20], ["binh", "⚗️ Bình thí nghiệm", 15]];
// Kiểu tóc, giày, cặp túi, huy hiệu: [mã, tên, giá, dành cho]
export const HAIRSTYLES = [["buoc", "Tóc buộc hai bên", 0, "nu"], ["xoa", "Tóc dài xõa", 0, "nu"], ["duoingua", "Tóc đuôi ngựa", 0, "nu"], ["bui", "Tóc búi cao", 10, "nu"], ["bob", "Tóc bob ngắn", 10, "nu"],
  ["ngan", "Tóc ngắn", 0, "nam"], ["dung", "Tóc dựng ngầu", 10, "nam"], ["maidai", "Tóc mái dài", 0, "nam"], ["dinh", "Đầu đinh", 0, "nam"], ["xoan", "Tóc xoăn", 10, "nam"]];
export const PANTS = ["#4d5fa8", "#2f3b55", "#c8a46a", "#3e8f5a", "#8a5a3c", "#e7e7ef"];
export const SHOES = [["", "Giày thường", 0, ""], ["thethao", "👟 Giày thể thao", 10, ""], ["bata", "Giày bata xanh", 10, ""], ["bupbe", "🩰 Giày búp bê", 15, "nu"], ["sandal", "🩴 Dép quai hậu", 10, ""], ["ung", "🥾 Ủng đi mưa", 15, ""]];
export const BAGS = [["", "Không mang", 0, ""], ["capsach", "🎒 Cặp sách", 15, ""], ["tuixach", "👜 Túi xách", 20, "nu"], ["deocheo", "💼 Túi đeo chéo", 15, ""], ["hopbut", "✏️ Hộp bút", 10, ""]];
export const BADGES = [["", "Không gắn", 0, ""], ["⭐", "⭐ Ngôi sao", 10, ""], ["❤️", "❤️ Trái tim", 10, ""], ["🌈", "🌈 Cầu vồng", 10, ""], ["☁️", "☁️ Đám mây", 10, ""], ["🔬", "🔬 Kính hiển vi", 15, ""], ["⚗️", "⚗️ Bình hóa học", 15, ""], ["🏅", "🏅 Huy chương", 25, ""], ["🐱", "🐱 Mèo con", 10, ""], ["🦖", "🦖 Khủng long", 10, ""], ["🌸", "🌸 Hoa anh đào", 10, ""]];
// Trang phục: [mã, tên, giá giọt mây, dành cho "nam" | "nu" | ""]
export const OUTFITS = [["", "Đồ thường", 0, ""], ["blouse", "🥼 Áo blouse nhà khoa học", 25, ""], ["thethao", "⚽ Đồ thể thao", 20, ""], ["vest", "🤵 Vest và nơ", 35, "nam"], ["samurai", "🥋 Võ phục", 30, "nam"], ["vaycongchua", "👗 Váy công chúa", 35, "nu"], ["vayhoa", "🌼 Váy hoa", 25, "nu"], ["aodai", "🇻🇳 Áo dài", 40, ""], ["hoodiemeo", "🐱 Hoodie tai mèo", 25, ""], ["hoodiecao", "🦊 Hoodie tai cáo", 30, ""], ["hoodiegau", "🐻 Hoodie gấu", 25, ""], ["quandui", "🩳 Quần đùi", 10, "nam"], ["quandai", "👖 Quần dài jean", 15, "nam"], ["quankaki", "👖 Quần dài kaki", 15, "nam"]];
export const AV_DEFAULT = { gender: "nu", skin: 0, hair: 0, shirt: 0, pants: 0, hairStyle: "", shoe: "", bag: "", badge: "", hat: "", acc: "", outfit: "", nick: "" };
export const LISTS = { hat: HATS, acc: ACCS, outfit: OUTFITS, hairStyle: HAIRSTYLES, shoe: SHOES, bag: BAGS, badge: BADGES };
export const priceOf = (key, v) => { const L = LISTS[key] || OUTFITS; const it = L.find(x => x[0] === v); return it ? (it[2] || 0) : 0; };

export function randomAvatar() {
  const r = n => Math.floor(Math.random() * n);
  return { gender: r(2) ? "nam" : "nu", skin: r(3), hair: r(5), shirt: r(6), hat: HATS[r(5)][0], acc: ACCS[r(4)][0] };
}
export function normAvatar(av) { return { ...AV_DEFAULT, ...(av && typeof av === "object" ? av : {}) }; }

/** Dựng nhân vật: chân chạm đất ở y = 0, mặt quay về +z. userData: body, legs, arms, wings */
export function makeKid(THREE, avIn) {
  const av = normAvatar(avIn);
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  // chất liệu hoạt hình 3 bậc sáng cho nhân vật trông mềm, dễ thương
  const M = (c, o = {}) => { const { roughness, metalness, flatShading, ...rest } = o; return THREE.MeshToonMaterial ? new THREE.MeshToonMaterial({ color: c, ...rest }) : new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o }); };
  const add = (geo, m, x, y, z, parent = body) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; parent.add(me); return me; };
  const skin = M(SKIN[+av.skin] || SKIN[0]), hair = M(HAIR[+av.hair] || HAIR[0]);
  const shirtC = av.acc === "aomua" ? "#ffd23f" : (SHIRT[+av.shirt] || SHIRT[0]);
  const shirt = M(shirtC), girl = av.gender !== "nam";
  const pantC = { quandui: "#ff8a3d", quandai: "#2f4a8a", quankaki: "#c8a46a" }[av.outfit] || PANTS[av.pants] || PANTS[0], shorts = !girl && av.outfit === "quandui";

  // chân (khớp ở hông để đung đưa khi đi)
  const legs = [];
  [-1, 1].forEach(s => {
    const l = new THREE.Group(); l.position.set(s * 0.15, 0.55, 0); g.add(l);
    add(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8), girl || shorts ? skin : M(pantC), 0, -0.25, 0, l);
    if (shorts) add(new THREE.CylinderGeometry(0.14, 0.15, 0.2, 12), M(pantC), 0, -0.06, 0, l);
    const shC = { thethao: "#ffffff", bata: "#3b6ad9", bupbe: "#e0303a", sandal: "#8a5a3c", ung: "#ffd23f" }[av.shoe] || (girl ? "#ff7aa8" : "#ffffff");
    const shoe = add(new THREE.SphereGeometry(0.17, 14, 10), M(shC, av.shoe === "bupbe" ? { roughness: 0.25, metalness: 0.2 } : {}), 0, -0.46, 0.06, l); shoe.scale.set(1.05, av.shoe === "sandal" ? 0.35 : 0.72, 1.45);
    if (av.shoe !== "sandal" && av.shoe !== "ung") { add(new THREE.CylinderGeometry(0.17, 0.18, 0.07, 14), M("#f4f0ff"), 0, -0.53, 0.06, l).scale.z = 1.4; add(new THREE.CylinderGeometry(0.115, 0.115, 0.16, 12), M("#ffffff"), 0, -0.33, 0, l); } // đế giày + tất cao cổ
    if (av.shoe === "thethao") add(new THREE.BoxGeometry(0.2, 0.03, 0.2), M("#ff5a6a"), 0, -0.43, 0.08, l);
    if (av.shoe === "bata") add(new THREE.BoxGeometry(0.24, 0.04, 0.3), M("#ffffff"), 0, -0.51, 0.05, l);
    if (av.shoe === "ung") add(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 12), M(shC), 0, -0.32, 0, l);
    legs.push(l);
  });
  if (girl) add(new THREE.CylinderGeometry(0.24, 0.44, 0.4, 18), M(shirtC), 0, 0.64, 0);
  else add(new THREE.CylinderGeometry(0.3, 0.32, 0.22, 16), M(pantC), 0, 0.6, 0);
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
  const head = add(new THREE.SphereGeometry(0.45, 28, 20), skin, 0, 1.62, 0); head.scale.set(1.08, 0.98, 1);
  [-1, 1].forEach(s => {
    add(new THREE.SphereGeometry(0.09, 10, 8), skin, s * 0.47, 1.58, 0); // tai
    const e = add(new THREE.SphereGeometry(0.085, 16, 12), M("#2b2238"), s * 0.17, 1.6, 0.39); e.scale.set(0.85, 1.15, 0.5); // mắt to
    const ir = add(new THREE.SphereGeometry(0.05, 12, 8), M(girl ? "#7a4fd0" : "#3b6ad9"), s * 0.17, 1.575, 0.425); ir.scale.set(1, 1, 0.4);
    add(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffffff" }), s * 0.17 + 0.03, 1.64, 0.44); // ánh sáng trong mắt
    add(new THREE.SphereGeometry(0.014, 6, 4), new THREE.MeshBasicMaterial({ color: "#ffffff" }), s * 0.17 - 0.025, 1.565, 0.445);
    const bw = add(new THREE.CapsuleGeometry(0.012, 0.07, 3, 6), hair, s * 0.17, 1.73, 0.4); bw.rotation.z = Math.PI / 2 + s * 0.15; // lông mày
    if (girl) [0, 1].forEach(k => { const l = add(new THREE.CapsuleGeometry(0.01, 0.04, 3, 4), M("#2b2238"), s * (0.24 + k * 0.025), 1.67 - k * 0.025, 0.37); l.rotation.z = s * (0.9 + k * 0.4); }); // lông mi
    const c = add(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffb3cc", transparent: true, opacity: 0.75 }), s * 0.28, 1.5, 0.36); c.scale.set(1.3, 0.65, 0.4); // má hồng
  });
  const mouth = add(new THREE.TorusGeometry(0.05, 0.014, 6, 14, Math.PI), M("#d9506f"), 0, 1.47, 0.43); mouth.rotation.z = Math.PI; // miệng cười
  add(new THREE.SphereGeometry(0.018, 6, 4), M("#f0a088"), 0, 1.53, 0.45); // mũi xíu
  // tóc
  add(new THREE.SphereGeometry(0.48, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 1.66, -0.02);
  const hs = HAIRSTYLES.some(x => x[0] === av.hairStyle && x[3] === av.gender) ? av.hairStyle : (girl ? "buoc" : "ngan");
  if (hs !== "dinh") { const fringe = add(new THREE.SphereGeometry(0.3, 14, 10), hair, hs === "maidai" ? 0.08 : 0, hs === "maidai" ? 1.86 : 1.92, 0.24); fringe.scale.set(hs === "maidai" ? 1.45 : 1.25, hs === "maidai" ? 0.62 : 0.4, 0.7); }
  if (hs === "buoc") {
    const back = add(new THREE.SphereGeometry(0.46, 18, 14), hair, 0, 1.45, -0.2); back.scale.set(1, 1.15, 0.6);
    [-1, 1].forEach(s => { add(new THREE.SphereGeometry(0.17, 12, 10), hair, s * 0.5, 1.5, -0.05); add(new THREE.TorusGeometry(0.08, 0.03, 6, 12), M("#ff7aa8"), s * 0.42, 1.6, -0.03).rotation.y = Math.PI / 2; });
  } else if (hs === "xoa") { const b = add(new THREE.SphereGeometry(0.48, 18, 14), hair, 0, 1.3, -0.16); b.scale.set(1.06, 1.6, 0.62); [-1, 1].forEach(s => { const x = add(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), hair, s * 0.4, 1.32, 0.02); x.rotation.z = s * 0.08; }); }
  else if (hs === "duoingua") { const b = add(new THREE.SphereGeometry(0.46, 18, 14), hair, 0, 1.55, -0.18); b.scale.set(1, 1, 0.6); add(new THREE.TorusGeometry(0.07, 0.03, 6, 12), M("#ffd23f"), 0, 1.78, -0.44); const t = add(new THREE.CapsuleGeometry(0.11, 0.5, 4, 8), hair, 0, 1.45, -0.55); t.rotation.x = 0.35; }
  else if (hs === "bui") { const b = add(new THREE.SphereGeometry(0.46, 18, 14), hair, 0, 1.55, -0.18); b.scale.set(1, 1, 0.6); add(new THREE.SphereGeometry(0.22, 14, 10), hair, 0, 2.12, -0.12); add(new THREE.TorusGeometry(0.17, 0.03, 6, 16), M("#ff7aa8"), 0, 2.0, -0.12).rotation.x = Math.PI / 2; }
  else if (hs === "bob") { const b = add(new THREE.SphereGeometry(0.5, 18, 14), hair, 0, 1.55, -0.1); b.scale.set(1.08, 0.9, 0.85); [-1, 1].forEach(s => add(new THREE.SphereGeometry(0.2, 12, 10), hair, s * 0.42, 1.42, 0.08)); }
  else if (hs === "ngan") { const tuft = add(new THREE.ConeGeometry(0.1, 0.22, 8), hair, 0.05, 2.12, -0.05); tuft.rotation.z = -0.4; }
  else if (hs === "dung") for (let k = 0; k < 7; k++) { const c = add(new THREE.ConeGeometry(0.09, 0.3, 6), hair, -0.3 + k * 0.1, 2.08 + Math.sin(k) * 0.03, 0.05 - Math.abs(k - 3) * 0.05); c.rotation.z = (k - 3) * -0.15; }
  else if (hs === "xoan") for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; add(new THREE.SphereGeometry(0.13, 8, 6), hair, Math.cos(a) * 0.36, 1.98 + Math.sin(k * 1.7) * 0.05, Math.sin(a) * 0.32 - 0.04); }
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

  // trang phục và đồ mới mua bằng giọt mây
  const o = av.outfit;
  if (o === "blouse") { add(new THREE.CylinderGeometry(0.31, 0.38, 0.62, 18, 1, true), M("#ffffff", { side: THREE.DoubleSide }), 0, 0.82, 0); [-1, 1].forEach(s => add(new THREE.BoxGeometry(0.08, 0.1, 0.02), M("#7cc8ff"), s * 0.14, 1.0, 0.29)); }
  if (o === "thethao") { [0.86, 1.06].forEach(y => { const r = add(new THREE.TorusGeometry(0.285, 0.035, 6, 24), M("#ffffff"), 0, y, 0); r.rotation.x = Math.PI / 2; }); add(new THREE.CircleGeometry(0.07, 12), M("#ff5a6a"), 0.12, 1.0, 0.285); }
  if (o === "vest") { add(new THREE.CapsuleGeometry(0.292, 0.26, 6, 14), M("#3b3f5c"), 0, 0.95, -0.01); add(new THREE.BoxGeometry(0.12, 0.34, 0.02), M("#ffffff"), 0, 1.0, 0.29); const b = add(new THREE.ConeGeometry(0.06, 0.12, 4), M("#ff4a6a"), -0.05, 1.18, 0.31); b.rotation.z = Math.PI / 2; const b2 = add(new THREE.ConeGeometry(0.06, 0.12, 4), M("#ff4a6a"), 0.05, 1.18, 0.31); b2.rotation.z = -Math.PI / 2; }
  if (o === "samurai") { add(new THREE.CapsuleGeometry(0.295, 0.26, 6, 14), M("#ffffff"), 0, 0.95, -0.01); const belt = add(new THREE.TorusGeometry(0.3, 0.04, 6, 24), M("#2b2830"), 0, 0.84, 0); belt.rotation.x = Math.PI / 2; }
  if (o === "vaycongchua") { add(new THREE.ConeGeometry(0.62, 0.7, 24, 1, true), M(shirtC, { side: THREE.DoubleSide }), 0, 0.5, 0); [0.36, 0.56].forEach((y, i) => { const r = add(new THREE.TorusGeometry(0.5 - i * 0.12, 0.03, 6, 30), M("#ffe680", { metalness: 0.4 }), 0, y, 0); r.rotation.x = Math.PI / 2; }); }
  if (o === "vayhoa") { add(new THREE.ConeGeometry(0.5, 0.55, 22, 1, true), M(shirtC, { side: THREE.DoubleSide }), 0, 0.58, 0); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; add(new THREE.SphereGeometry(0.05, 8, 6), M(k % 2 ? "#ff8fb8" : "#7ee0b5"), Math.cos(a) * 0.4, 0.42, Math.sin(a) * 0.4); } }
  if (o === "aodai") { add(new THREE.CylinderGeometry(0.29, 0.36, 0.9, 18, 1, true), M(girl ? "#ff6aa8" : "#3b6ad9", { side: THREE.DoubleSide }), 0, 0.68, 0); add(new THREE.CylinderGeometry(0.12, 0.13, 0.12, 14), M(girl ? "#ff6aa8" : "#3b6ad9"), 0, 1.26, 0); }
  if (o && o.startsWith("hoodie")) { const hc = M(shirtC), ear = M(o === "hoodiecao" ? "#ff9a4a" : o === "hoodiegau" ? "#a9784f" : shirtC), inner = M(o === "hoodiecao" ? "#ffffff" : "#ffb3cc");
    add(new THREE.CapsuleGeometry(0.31, 0.26, 6, 14), hc, 0, 0.95, -0.01); add(new THREE.BoxGeometry(0.34, 0.14, 0.06), M("#ffffff", {}), 0, 0.82, 0.3); // túi trước
    [-1, 1].forEach(s => { add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4), M("#ffffff"), s * 0.07, 1.08, 0.31); add(new THREE.SphereGeometry(0.025, 6, 4), M("#ffffff"), s * 0.07, 0.97, 0.31); });
    const hood = add(new THREE.SphereGeometry(0.52, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), hc, 0, 1.64, -0.06); hood.rotation.x = -0.35; // mũ trùm
    const brim = add(new THREE.TorusGeometry(0.46, 0.06, 8, 30, Math.PI * 1.25), hc, 0, 1.68, 0.12); brim.rotation.set(0, 0, -Math.PI * 0.125 + Math.PI);
    [-1, 1].forEach(s => { if (o === "hoodiegau") { add(new THREE.SphereGeometry(0.14, 12, 10), ear, s * 0.34, 2.06, -0.05); add(new THREE.SphereGeometry(0.08, 10, 8), inner, s * 0.34, 2.06, 0.05); }
      else { const e1 = add(new THREE.ConeGeometry(0.15, 0.32, 4), ear, s * 0.3, 2.12, -0.05); e1.rotation.z = -s * 0.35; const e2 = add(new THREE.ConeGeometry(0.08, 0.18, 4), inner, s * 0.29, 2.1, 0.02); e2.rotation.z = -s * 0.35; } });
    if (o === "hoodiecao") { const tl = add(new THREE.SphereGeometry(0.2, 12, 10), M("#ff9a4a"), 0, 0.62, -0.42); tl.scale.set(0.8, 1.5, 0.8); add(new THREE.SphereGeometry(0.11, 10, 8), M("#ffffff"), 0, 0.88, -0.5); } }
  if (av.hat === "vuongmien") { add(new THREE.CylinderGeometry(0.26, 0.28, 0.16, 16, 1, true), M("#ffd23f", { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }), 0, 2.08, 0); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; add(new THREE.ConeGeometry(0.05, 0.14, 6), M("#ffd23f", { metalness: 0.6 }), Math.cos(a) * 0.26, 2.22, Math.sin(a) * 0.26); } add(new THREE.SphereGeometry(0.05, 8, 6), M("#ff4a6a"), 0, 2.1, 0.28); }
  if (av.hat === "phuthuy") { add(new THREE.ConeGeometry(0.34, 0.7, 20), M("#5b3fb0"), 0, 2.36, 0); add(new THREE.CylinderGeometry(0.52, 0.52, 0.04, 24), M("#5b3fb0"), 0, 2.02, 0); add(new THREE.SphereGeometry(0.06, 8, 6), M("#ffd23f", { emissive: "#ffd23f", emissiveIntensity: 0.6 }), 0.1, 2.3, 0.22); }
  if (av.hat === "vonghoa") for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; add(new THREE.SphereGeometry(0.075, 8, 6), M(["#ff8fb8", "#ffd23f", "#ffffff"][k % 3]), Math.cos(a) * 0.4, 1.98, Math.sin(a) * 0.4); }
  if (av.hat === "tainghe") { const bd = add(new THREE.TorusGeometry(0.44, 0.04, 8, 24, Math.PI), M("#3b3f5c"), 0, 1.7, 0); [-1, 1].forEach(s => add(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 16), M("#ff6aa8"), s * 0.45, 1.66, 0).rotation.z = Math.PI / 2); }
  if (av.hat === "baoho") { add(new THREE.BoxGeometry(0.62, 0.16, 0.06), M("#bff0ff", { transparent: true, opacity: 0.7 }), 0, 1.68, 0.42); const st = add(new THREE.TorusGeometry(0.45, 0.025, 6, 24), M("#ff9f4d"), 0, 1.68, 0); st.rotation.x = Math.PI / 2; }
  if (av.acc === "aochoang") { const c = add(new THREE.PlaneGeometry(0.7, 0.9), M("#ff4a6a", { side: THREE.DoubleSide }), 0, 0.82, -0.32); c.rotation.x = 0.15; }
  if (av.acc === "balo") { add(new THREE.BoxGeometry(0.42, 0.46, 0.2), M("#7ee0b5"), 0, 0.96, -0.34); add(new THREE.BoxGeometry(0.3, 0.16, 0.04), M("#5fc49a"), 0, 0.86, -0.45); }
  if (av.acc === "binh") { add(new THREE.SphereGeometry(0.11, 12, 10), M("#c9a0ff", { emissive: "#9c7cff", emissiveIntensity: 0.5, transparent: true, opacity: 0.85 }), 0.42, 0.68, 0.12); add(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8), M("#e8f6ff"), 0.42, 0.82, 0.12); }

  // cặp, túi
  if (av.bag === "capsach") { add(new THREE.BoxGeometry(0.46, 0.5, 0.22), M("#3b6ad9"), 0, 0.98, -0.36); add(new THREE.BoxGeometry(0.34, 0.18, 0.06), M("#ffd23f"), 0, 0.86, -0.49); [-1, 1].forEach(s => add(new THREE.BoxGeometry(0.06, 0.5, 0.04), M("#2a4aa8"), s * 0.18, 1.0, 0.27)); }
  if (av.bag === "tuixach") { add(new THREE.BoxGeometry(0.26, 0.2, 0.1), M("#ff6aa8"), 0.5, 0.66, 0.06); const hd = add(new THREE.TorusGeometry(0.09, 0.02, 6, 16, Math.PI), M("#c2185b"), 0.5, 0.76, 0.06); hd.rotation.z = 0; }
  if (av.bag === "deocheo") { const st = add(new THREE.TorusGeometry(0.4, 0.025, 6, 30), M("#8a5a3c"), 0, 0.98, 0); st.rotation.set(Math.PI / 2, 0.75, 0); add(new THREE.BoxGeometry(0.26, 0.22, 0.08), M("#a0703c"), 0.3, 0.7, 0.2); }
  if (av.bag === "hopbut") { add(new THREE.BoxGeometry(0.32, 0.1, 0.1), M("#7ee0b5"), -0.5, 0.7, 0.1); add(new THREE.ConeGeometry(0.03, 0.08, 6), M("#ffd23f"), -0.5, 0.79, 0.1); }
  // huy hiệu / sticker trên áo
  if (av.badge && typeof document !== "undefined") { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); x.font = "48px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(av.badge, 32, 36);
    const tx = new THREE.CanvasTexture(c); const b = add(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ map: tx, transparent: true }), 0.13, 1.06, 0.3); b.castShadow = false; }
  // tỉ lệ chibi: đầu (và tóc, mũ, mặt) to gấp 1,3 lần quanh điểm cổ
  const PIV = 1.28, K = 1.3;
  body.children.forEach(c => { if (c.position.y > PIV && !arms.includes(c) && !wings.includes(c)) { c.position.y = PIV + (c.position.y - PIV) * K; c.position.x *= K; c.position.z *= K; c.scale.multiplyScalar(K); } });
  g.userData = { body, legs, arms, wings };
  g.scale.setScalar(0.88);
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
export function openWardrobe(THREE, current, onSave, shop = null) {
  let av = normAvatar(current);
  const W = 280, H = 330;
  const canvas = h("canvas", { width: W, height: H, class: "wd-canvas", "aria-label": "Xem trước nhân vật" });
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W, H, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7d8ff, 1.4));
  const dl = new THREE.DirectionalLight(0xfff0d8, 1.6); dl.position.set(2, 4, 3); scene.add(dl);
  const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 50); cam.position.set(0, 1.5, 6.2); cam.lookAt(0, 1.25, 0);
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
    return colors.map((c, i) => h("button", { class: "wd-sw" + (+av[key] === i ? " on" : ""), style: { background: c }, "aria-label": `${key} ${i + 1}`, onclick: () => set({ [key]: i }) }));
  }
  const owned = () => (shop && shop.owned()) || [];
  const has = (key, v, price) => !price || owned().includes(key + ":" + v);
  function choice(key, list) { return list.filter(it => !it[3] || it[3] === av.gender).map(([v, label, price]) => h("button", { class: "wd-ch" + (av[key] === v ? " on" : "") + (has(key, v, price) ? "" : " lock"), onclick: () => {
    if (has(key, v, price)) return set({ [key]: v });
    if (!shop) return;
    if (shop.drops() < price) { sound.play("sai"); return paintMsg(`Cần ${price} 💧 giọt mây, em đang có ${shop.drops()}. Chơi trò chơi ở Đảo Trò Chơi để nhận thêm nhé!`); }
    if (shop.buy(key + ":" + v, price)) { sound.play("ting"); set({ [key]: v }); paintMsg(`Đã mua ${label}! Còn ${shop.drops()} 💧`); }
  } }, label, price && !has(key, v, price) ? h("small", { class: "wd-price" }, ` ${price}💧`) : null)); }
  const msg = h("p", { class: "small wd-msg" }); const paintMsg = t => { msg.textContent = t; };
  const nick = h("input", { class: "wd-nick", value: av.nick || "", maxlength: 16, placeholder: "Đặt tên cho nhân vật (tối đa 16 kí tự)", oninput: e => { av = { ...av, nick: e.target.value.replace(/[<>]/g, "") }; } });
  function paint() {
    opts.replaceChildren(
      row("Tên nhân vật", [nick]),
      shop ? h("div", { class: "wd-drops" }, `💧 Em có ${shop.drops()} giọt mây`) : null,
      row("Bạn là", choice("gender", [["nu", "Bạn nữ"], ["nam", "Bạn nam"]])),
      row("Màu da", swatch("skin", SKIN)),
      row("Kiểu tóc", choice("hairStyle", HAIRSTYLES)),
      row("Màu tóc", swatch("hair", HAIR)),
      row("Màu áo / váy", swatch("shirt", SHIRT)),
      av.gender === "nam" ? row("Màu quần", swatch("pants", PANTS)) : null,
      row("Trang phục", choice("outfit", OUTFITS)),
      row("Giày", choice("shoe", SHOES)),
      row("Cặp & túi", choice("bag", BAGS)),
      row("Huy hiệu", choice("badge", BADGES)),
      row("Mũ", choice("hat", HATS)),
      row("Phụ kiện", choice("acc", ACCS)), msg);
  }
  function set(p) { sound.play("bam"); av = { ...av, ...p }; if (p.gender) { av.hairStyle = ""; if ((OUTFITS.find(x => x[0] === av.outfit)?.[3] || p.gender) !== p.gender) av.outfit = ""; } rebuild(); paint(); }
  paint();
  const m = modal(h("div", { class: "wd" },
    h("h2", {}, "Tủ đồ mây"),
    h("div", { class: "wd-body" }, h("div", { class: "wd-stage" }, canvas), opts),
    h("div", { class: "actions" },
      btn("Ngẫu nhiên", () => set({ ...randomAvatar(), nick: av.nick }), "btn btn-soft"),
      btn("Mặc bộ này", () => { sound.play("chuong"); const ok = k => has(k, av[k], priceOf(k, av[k])); ["hat", "acc", "shoe", "bag", "badge", "hairStyle"].forEach(k => { if (!ok(k)) av[k] = ""; }); if (!ok("outfit") || (OUTFITS.find(x => x[0] === av.outfit)?.[3] || av.gender) !== av.gender) av.outfit = ""; onSave(av); m.close(); }, "btn btn-main"))),
    { wide: true, onClose: () => { alive = false; cancelAnimationFrame(raf); renderer.dispose(); } });
}
