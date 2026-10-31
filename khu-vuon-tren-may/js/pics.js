// 12 hình mật khẩu chủ đề mây và hóa học
export const PICS = [
  { id: "may",       icon: "☁️", name: "đám mây" },
  { id: "giot-mua",  icon: "💧", name: "giọt mưa" },
  { id: "cau-vong",  icon: "🌈", name: "cầu vồng" },
  { id: "binh-tn",   icon: "⚗️", name: "bình thí nghiệm" },
  { id: "ngon-lua",  icon: "🔥", name: "ngọn lửa nhỏ" },
  { id: "hat-muoi",  icon: "🧂", name: "hạt muối" },
  { id: "bong-tuyet",icon: "❄️", name: "bông tuyết" },
  { id: "hoi-nuoc",  icon: "💨", name: "hơi nước" },
  { id: "cay-non",   icon: "🌱", name: "cây non" },
  { id: "khinh-khi-cau", icon: "🎈", name: "khinh khí cầu" },
  { id: "ngoi-sao",  icon: "⭐", name: "ngôi sao" },
  { id: "ong-nghiem",icon: "🧪", name: "ống nghiệm" },
];
export const PIC = Object.fromEntries(PICS.map(p => [p.id, p]));

export function randomPics() {
  const ids = PICS.map(p => p.id);
  const out = [];
  while (out.length < 3) {
    const i = ids.splice(Math.floor(Math.random() * ids.length), 1)[0];
    out.push(i);
  }
  return out;
}
