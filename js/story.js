// Ông Kể Chuyện: kể chuyện bằng giọng đọc (AI nếu cô bật, không thì giọng tiếng Việt của máy), nhạc nền tắt khi ông kể,
// nghe xong có câu đố. Chuyện được chọn theo các bài cô đã mở.
import { h, modal, toast } from "./ui.js";
import { sound } from "./sound.js";
import { api } from "./api.js";
import { SUPABASE_URL } from "./config.js";
// Giọng đọc đã tạo sẵn (cô tạo một lần trong Quản trị), lưu ở Supabase Storage: tải nhanh, không tốn lượt AI
export const voiceUrl = id => SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/giong-doc/${id}.wav` : "";
// Giọng đọc đặt sẵn trong thư mục voices/ của web (Cloudflare/Vercel, không tốn băng thông Supabase): voices/bai-09.wav hoặc .mp3
export const localVoiceUrls = id => [`voices/${id}.mp3`, `voices/${id}.wav`];
const playUrl = url => new Promise((res, rej) => { const a = new Audio(url); a.oncanplaythrough = () => res(a); a.onerror = rej; setTimeout(() => rej(new Error("cham")), 8000); a.load(); });
import { loadLesson } from "./content.js";

export const STORIES = [
  { l: "bai-09", title: "Vương miện của nhà vua", t: "Ngày xưa, vua Hiêrôn nghi người thợ kim hoàn đã trộn bạc vào chiếc vương miện vàng. Nhà bác học Ác-si-mét nghĩ mãi chưa ra cách kiểm tra mà không làm hỏng vương miện. Một hôm, khi bước vào bồn tắm, ông thấy nước dâng lên. Ông reo lên: Ơ-rê-ca! Tìm ra rồi! Vàng và bạc là hai chất khác nhau, có tính chất khác nhau, nên cùng một khối lượng thì chiếm chỗ khác nhau trong nước.", q: "Ác-si-mét phân biệt vàng và bạc nhờ điều gì?", o: ["Chúng là hai chất có tính chất khác nhau", "Màu vương miện đổi khi vào nước", "Vàng tan trong nước"], a: 0 },
  { l: "bai-10", title: "Nhiệt kế của ông Xen-xi-út", t: "Năm 1742, nhà thiên văn học An-đơ Xen-xi-út muốn đo nhiệt độ cho thật chính xác. Ông nhận ra nước đá luôn tan ở cùng một nhiệt độ, và nước luôn sôi ở cùng một nhiệt độ. Ông chia khoảng giữa hai mốc ấy thành một trăm phần bằng nhau. Nhờ vậy, ngày nay chúng ta nói: nước đá nóng chảy ở 0 độ C và nước sôi ở 100 độ C.", q: "Trong lúc nước đá đang tan, nhiệt độ của nó thế nào?", o: ["Giữ nguyên 0 °C cho tới khi tan hết", "Tăng đều liên tục", "Giảm xuống dưới 0 °C"], a: 0 },
  { l: "bai-11", title: "Khí giúp ngọn nến cháy", t: "Hơn hai trăm năm trước, nhà hóa học La-voa-diê làm rất nhiều thí nghiệm đốt cháy trong bình kín. Ông thấy ngọn lửa chỉ cháy khi còn một phần không khí, và phần ấy cũng giúp con chuột sống được. Ông đặt tên cho chất khí quan trọng ấy là oxygen. Từ đó, người ta hiểu: oxygen duy trì sự cháy và sự hô hấp.", q: "Úp cốc lên ngọn nến, vì sao nến tắt?", o: ["Oxygen trong cốc bị dùng hết", "Cốc làm nến lạnh đi", "Nước dập tắt nến"], a: 0 },
  { l: "bai-12", title: "Chiếc lốp xe của Gút-đờ", t: "Cao su thời xưa rất khó dùng: trời nóng thì chảy nhão, trời lạnh thì cứng giòn. Ông Sác-lơ Gút-đờ thử đủ cách suốt nhiều năm. Một lần, ông vô tình làm rơi hỗn hợp cao su và lưu huỳnh lên bếp nóng. Thật bất ngờ, cao su trở nên dẻo dai và bền chắc. Nhờ phát hiện ấy, ngày nay ta có lốp xe đàn hồi, không thấm nước.", q: "Vì sao lốp xe được làm bằng cao su?", o: ["Cao su đàn hồi, không thấm nước", "Cao su trong suốt", "Cao su dẫn điện tốt"], a: 0 },
  { l: "bai-13", title: "Hạt cát hóa thủy tinh", t: "Chuyện kể rằng các thương nhân xưa nhóm lửa trên bãi cát, kê nồi lên những khối đá chứa sô-đa. Sáng hôm sau, họ thấy dưới đống tro có những giọt trong suốt lấp lánh. Cát đã nóng chảy rồi đông đặc lại thành thủy tinh. Cát là một nguyên liệu, còn thủy tinh là vật liệu được làm ra từ nó.", q: "Cát dùng để làm thủy tinh được gọi là gì?", o: ["Nguyên liệu", "Nhiên liệu", "Lương thực"], a: 0 },
  { l: "bai-14", title: "Ngọn đèn an toàn của thợ mỏ", t: "Ngày xưa, thợ mỏ than mang đèn có lửa xuống hầm sâu. Trong hầm có khí mê-tan, gặp lửa là gây nổ rất nguy hiểm. Năm 1815, nhà khoa học Hăm-phri Đây-vy làm ra chiếc đèn có lưới kim loại bao quanh ngọn lửa. Lưới hút bớt nhiệt nên khí bên ngoài không bắt lửa. Chiếc đèn nhỏ ấy đã cứu sống rất nhiều người.", q: "Khí gas rò rỉ trong bếp, việc đầu tiên nên làm là gì?", o: ["Khóa van gas, mở cửa cho thoáng", "Bật đèn lên để nhìn cho rõ", "Đốt diêm kiểm tra"], a: 0 },
  { l: "bai-15", title: "Bí mật của hạt gạo lứt", t: "Cuối thế kỉ 19, bác sĩ Ây-cơ-man thấy nhiều người bị bệnh tê phù. Ông để ý những con gà chỉ ăn gạo trắng cũng mắc bệnh, còn gà ăn gạo lứt thì khỏe mạnh. Hóa ra lớp cám bên ngoài hạt gạo chứa vitamin B1. Từ đó, người ta hiểu: muốn khỏe, bữa ăn cần đủ các nhóm chất, kể cả vitamin.", q: "Bữa ăn cân bằng cần có gì?", o: ["Đủ các nhóm chất: tinh bột, đạm, chất béo, vitamin, khoáng chất", "Chỉ cần thật nhiều cơm", "Chỉ ăn rau thôi"], a: 0 },
  { l: "bai-16", title: "Cốc nước muối của em bé", t: "Có một em bé hỏi bà: Bà ơi, muối đi đâu mất khi con khuấy vào nước? Bà mỉm cười: Muối không mất đâu con, nó tan ra thành những hạt rất nhỏ, trộn đều khắp cốc nước. Ta gọi đó là dung dịch. Còn bột đất khuấy vào nước thì sao? Để một lúc là đất lắng xuống đáy, đó là huyền phù.", q: "Muối khuấy tan đều trong nước tạo thành gì?", o: ["Dung dịch", "Huyền phù", "Nhũ tương"], a: 0 },
  { l: "bai-17", title: "Cánh đồng muối Sa Huỳnh", t: "Ở Sa Huỳnh, Quảng Ngãi, diêm dân dẫn nước biển vào những ô ruộng phẳng. Nắng và gió làm nước bay hơi dần dần. Cuối ngày, những hạt muối trắng tinh kết tinh lại trên mặt ruộng. Đó chính là cách tách muối ra khỏi nước biển bằng phương pháp cô cạn, cha ông ta đã làm từ hàng trăm năm trước.", q: "Diêm dân tách muối khỏi nước biển bằng cách nào?", o: ["Cho nước bay hơi (cô cạn)", "Lọc qua giấy lọc", "Chiết bằng phễu"], a: 0 },
];

let speaking = null; // { stop() }
function stopSpeak() { if (speaking) { try { speaking.stop(); } catch {} speaking = null; } }

const ttsCache = new Map();
const voicesReady = () => new Promise(res => { const ss = window.speechSynthesis; if (!ss) return res([]); const v = ss.getVoices(); if (v.length) return res(v);
  const done = () => res(ss.getVoices()); ss.addEventListener?.("voiceschanged", done, { once: true }); setTimeout(done, 1500); });
/** đọc to câu chuyện; gọi onEnd khi đọc xong. Ưu tiên giọng AI (máy chủ), rồi giọng tiếng Việt có sẵn trong máy. */
async function speak(text, onEnd, onInfo, id) {
  stopSpeak();
  if (id) for (const u of localVoiceUrls(id)) try { // ưu tiên file trong web
    const a = await playUrl(u); speaking = { stop: () => a.pause() }; a.onended = () => { speaking = null; onEnd(); }; onInfo && onInfo(""); await a.play(); return true;
  } catch {}
  if (id && voiceUrl(id)) try {
    const a = await playUrl(voiceUrl(id) + "?v=" + (STORIES.find(x => x.l === id)?.t.length || 0));
    speaking = { stop: () => a.pause() }; a.onended = () => { speaking = null; onEnd(); }; onInfo && onInfo(""); await a.play(); return true;
  } catch {}
  try {
    let r = ttsCache.get(text);
    if (!r && api.tiniTts) { onInfo && onInfo("Ông đang hắng giọng… (chờ tối đa 15 giây)"); r = await api.tiniTts(text).catch(e => { onInfo && onInfo(""); throw e; }); if (r && r.audio) ttsCache.set(text, r); }
    if (r && r.audio) {
      const a = new Audio("data:" + (r.mime || "audio/wav") + ";base64," + r.audio);
      speaking = { stop: () => a.pause() }; a.onended = () => { speaking = null; onEnd(); };
      onInfo && onInfo(""); await a.play(); return true;
    }
  } catch {}
  const ss = window.speechSynthesis; const voices = await voicesReady();
  const vis = voices.filter(v => /^vi/i.test(v.lang) || /Vietnam|Tiếng Việt/i.test(v.name));
  const vi = vis.find(v => /NamMinh|Nam Minh|male/i.test(v.name)) || vis.find(v => /natural|online|google/i.test(v.name)) || vis[0];
  if (!ss || !vi) { onInfo && onInfo("Máy này chưa có giọng đọc tiếng Việt. Cô bật giọng AI (khóa Gemini) hoặc mở bằng trình duyệt Edge để nghe ông kể nhé. Giờ em đọc theo dòng chữ sáng dần."); return false; }
  onInfo && onInfo("");
  const parts = text.match(/[^.!?:;]+[.!?:;]*/g) || [text]; let i = 0, stopped = false;
  speaking = { stop: () => { stopped = true; ss.cancel(); } };
  const next = () => {
    if (stopped) return; if (i >= parts.length) { speaking = null; onEnd(); return; }
    const u = new SpeechSynthesisUtterance(parts[i++].trim()); u.lang = vi.lang || "vi-VN"; u.voice = vi;
    u.rate = 0.86; u.pitch = /[!?]/.test(u.text) ? 0.95 : 0.78; // giọng ông trầm ấm, chậm rãi; câu cảm thì nhấn hơn
    u.onend = () => setTimeout(next, /[.!?]$/.test(u.text) ? 380 : 160); u.onerror = () => next();
    ss.speak(u);
  };
  ss.cancel(); next(); return true;
}

export async function tellStory({ openIds = [], aiMode = "approved" } = {}) {
  const pool = STORIES.filter(s => openIds.includes(s.l)), list = pool.length ? pool : STORIES;
  let s = { ...list[Math.floor(Math.random() * list.length)], fixed: true };
  const body = h("div", { class: "story" }, h("p", { class: "lead center" }, "Ông đang nghĩ một câu chuyện hay…"));
  const m = modal(h("div", {}, h("div", { class: "story-head" }, h("span", { class: "elder" }, "🧓☁️"), h("div", {}, h("h2", { style: { margin: 0 } }, "📜 Ông Kể Chuyện"), h("p", { class: "small muted", style: { margin: 0 } }, "Nghe ông kể, rồi giải câu đố nhé!"))), body),
    { wide: true, onClose: () => { stopSpeak(); sound.startBgm("world"); } });
  if (aiMode === "ai" && openIds.length) {
    try {
      const lid = openIds[Math.floor(Math.random() * openIds.length)], L = await loadLesson(lid);
      const r = await api.tiniAsk({ mode: "story", lesson: L.title, theory: L.seeds.map(sd => sd.theory.intro).join(" ") });
      if (r && r.story && r.q && Array.isArray(r.o) && r.o.length === 3) s = { l: lid, title: r.title || "Chuyện của ông", t: r.story, q: r.q, o: r.o, a: Math.max(0, Math.min(2, r.a | 0)) };
    } catch {}
  }
  if (!document.body.contains(body)) return;
  // xáo phương án
  const order = [0, 1, 2].sort(() => Math.random() - 0.5);
  const words = s.t.split(/(\s+)/).map(w => h("span", {}, w));
  const textEl = h("p", { class: "story-text" }, words);
  const quiz = h("div", { class: "story-quiz", hidden: true });
  const fb = h("div", { class: "feedback" });
  const opts = order.map(i => h("button", { class: "opt", onclick: () => {
    opts.forEach(b => b.disabled = true); const ok = i === s.a; sound.play(ok ? "ting" : "sai");
    opts[order.indexOf(i)].classList.add(ok ? "ok" : "bad"); if (!ok) opts[order.indexOf(s.a)].classList.add("ok");
    fb.className = "feedback " + (ok ? "fb-ok" : "fb-info"); fb.textContent = ok ? "Giỏi quá! Cháu nghe chuyện chăm chú lắm. Ông thưởng một tràng vỗ tay!" : "Cháu nghe lại chuyện nhé, đáp án đúng đã sáng lên rồi.";
    if (ok) sound.play("votay");
  } }, s.o[i]));
  quiz.append(h("h3", {}, "🧩 Câu đố của ông"), h("p", { class: "q-prompt" }, s.q), h("div", { class: "opts" }, opts), fb);
  const playBtn = h("button", { class: "btn btn-main" }, "🔊 Nghe ông kể"), skip = h("button", { class: "btn btn-soft" }, "Làm câu đố luôn");
  let hl = null;
  const finish = () => { clearInterval(hl); words.forEach(w => w.classList.add("read")); quiz.hidden = false; playBtn.textContent = "🔁 Nghe lại"; sound.startBgm("world"); };
  const info = h("p", { class: "small muted center" });
  function play() {
    sound.stopBgm(); playBtn.textContent = "⏹ Đang kể…"; words.forEach(w => w.classList.remove("read"));
    let k = 0; clearInterval(hl);
    const glow = () => { clearInterval(hl); hl = setInterval(() => { while (k < words.length && !words[k].textContent.trim()) k++; if (k < words.length) words[k++].classList.add("read"); else if (!speaking) finish(); }, 360); };
    speak(s.t, finish, t => { info.textContent = t; }, s.fixed ? s.l : null).then(ok => { glow(); if (!ok) playBtn.textContent = "⏹ Dừng"; });
  }
  playBtn.onclick = () => { if (speaking) { stopSpeak(); finish(); } else play(); };
  skip.onclick = () => { stopSpeak(); finish(); };
  body.replaceChildren(h("h3", { class: "story-title" }, s.title || "Chuyện của ông"), textEl, info, h("div", { class: "actions center" }, playBtn, skip), quiz);
  sound.play("chuong"); setTimeout(play, 500);
  return m;
}
