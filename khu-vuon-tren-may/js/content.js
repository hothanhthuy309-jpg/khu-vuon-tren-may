// Đọc nội dung bài học từ thư mục data/
const cache = {};
async function getJson(path) {
  if (!cache[path]) cache[path] = fetch(path, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error("Không đọc được " + path); return r.json(); });
  return cache[path];
}
export const loadMap = () => getJson("data/lessons.json");
export async function loadLesson(id) {
  const map = await loadMap(); const z = map.zones.find(z => z.id === id);
  if (!z || !z.file) return null;
  return getJson(z.file);
}
export async function loadAllLessons() {
  const map = await loadMap(); const out = {};
  await Promise.all(map.zones.filter(z => z.file).map(async z => { out[z.id] = await getJson(z.file); }));
  return out;
}
// "Nước đá nóng chảy vẫn tăng nhiệt" → "Cỏ Nước-đá-nóng-chảy-vẫn-tăng-nhiệt"
export const weedName = label => "Cỏ " + String(label || "hiểu nhầm").trim().replace(/\s+/g, "-");
