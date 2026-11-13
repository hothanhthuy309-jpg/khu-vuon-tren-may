// Vercel Serverless Function: Tí Nị AI (POST /api/tini)
// Biến môi trường trên Vercel:
//   SUPABASE_URL, SUPABASE_ANON_KEY   (giống js/config.js)
//   GEMINI_API_KEY   (khuyên dùng, miễn phí ở Google AI Studio), GEMINI_MODEL (mặc định gemini-2.0-flash)
//   GROQ_API_KEY     (dự phòng, không bắt buộc), GROQ_MODEL (mặc định llama-3.1-8b-instant)
//   TINI_DAILY_LIMIT (mặc định 30 lượt hỏi mỗi học sinh mỗi ngày)
// Bảo mật: không gửi tên học sinh lên AI; kiểm tra phiên học sinh và giới hạn lượt ở Supabase; lọc câu trả lời để không lộ đáp án.

const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_ANON_KEY;
const LIMIT = +(process.env.TINI_DAILY_LIMIT || 30);

const SYSTEM = `Em là Tí Nị, một đám mây nhỏ dễ thương, trợ giảng môn Khoa học tự nhiên 6 (phần Hóa học: Bài 9 đến Bài 17, sách Kết nối tri thức) cho học sinh 11-12 tuổi ở Việt Nam.
Luật bắt buộc:
- Luôn trả lời bằng tiếng Việt, thân thiện, câu ngắn, tối đa 3 câu (khoảng 60 chữ).
- KHÔNG BAO GIỜ nói thẳng đáp án của câu hỏi đang làm. Chỉ gợi ý bằng câu hỏi ngược hoặc ví dụ đời sống.
- Chỉ nói về kiến thức trong bài; nếu học sinh hỏi chuyện ngoài lề, nhẹ nhàng mời quay lại bài.
- Không hỏi và không nhắc thông tin cá nhân. Không dùng từ ngữ tiêu cực, không chê học sinh.
- Nếu không chắc, khuyên học sinh hỏi thầy cô.`;

function modePrompt(b) {
  const ctx = `Bài: ${b.lesson || "(chưa rõ)"}\nKiến thức bài: ${(b.theory || "").slice(0, 1500)}`;
  const q = b.question ? `\nCâu hỏi học sinh đang làm: ${b.question.prompt}` : "";
  switch (b.mode) {
    case "hint": return `${ctx}${q}\nGợi ý đã có: ${(b.hints || []).join(" | ")}\nHọc sinh nói: "${b.text}"\nHãy đưa một gợi ý mới, nhỏ hơn đáp án một bước.`;
    case "teach": return `${ctx}\nHọc sinh đang "dạy lại" cho Tí Nị bằng lời của mình: "${b.text}"\nHãy nhận xét theo 3 tiêu chí: (1) đúng khái niệm, (2) có ví dụ, (3) dùng lời của mình. Khen điều làm tốt, gợi ý 1 điều cần thêm.`;
    default: return `${ctx}${q}\nHọc sinh hỏi: "${b.text}"\nTrả lời ngắn gọn, dựa vào kiến thức bài.`;
  }
}
const DRAFT = topic => `Soạn 5 câu hỏi trắc nghiệm KHTN 6 (Hóa học, Kết nối tri thức) về chủ đề: "${topic}".
Mỗi câu 4 phương án, chỉ 1 đúng, có giải thích ngắn. Mức độ: "biet", "hieu" hoặc "vandung".
Chỉ trả về JSON đúng dạng: {"questions":[{"prompt":"...","options":["...","...","...","..."],"correct":0,"explain":"...","level":"hieu"}]}`;

const STORY = (lesson, theory) => `Em là Ông Kể Chuyện trong vương quốc mây. Kể một câu chuyện có thật (lịch sử khoa học, phát minh, hoặc đời sống Việt Nam) liên quan tới bài "${lesson}".
Kiến thức bài: ${theory}
Yêu cầu: giọng kể ấm áp, diễn cảm, xúc tích, 90-130 chữ, dễ hiểu với học sinh lớp 6, có câu cảm thán hoặc câu hỏi tu từ. Sau đó ra 1 câu đố trắc nghiệm 3 phương án, chỉ 1 đúng, trả lời được nhờ nghe chuyện.
Chỉ trả về JSON: {"title":"...","story":"...","q":"...","o":["...","...","..."],"a":0}`;

// Giọng đọc AI (Gemini TTS): trả về âm thanh WAV dạng base64
async function tts(text) {
  if (!process.env.GEMINI_API_KEY) throw new Error("no_tts");
  const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Đọc bằng tiếng Việt, giọng một ông cụ kể chuyện cổ tích: ấm áp, chậm rãi, diễn cảm, ngắt nghỉ rõ ràng: " + text }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: process.env.GEMINI_TTS_VOICE || "Charon" } } } } }),
  });
  if (!r.ok) throw new Error("tts_" + r.status);
  const j = await r.json(); const part = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) throw new Error("tts_empty");
  const pcm = Buffer.from(part.inlineData.data, "base64"), rate = +(/rate=(\d+)/.exec(part.inlineData.mimeType || "")?.[1] || 24000);
  const hd = Buffer.alloc(44); hd.write("RIFF", 0); hd.writeUInt32LE(36 + pcm.length, 4); hd.write("WAVE", 8); hd.write("fmt ", 12); hd.writeUInt32LE(16, 16); hd.writeUInt16LE(1, 20); hd.writeUInt16LE(1, 22);
  hd.writeUInt32LE(rate, 24); hd.writeUInt32LE(rate * 2, 28); hd.writeUInt16LE(2, 32); hd.writeUInt16LE(16, 34); hd.write("data", 36); hd.writeUInt32LE(pcm.length, 40);
  return { mime: "audio/wav", audio: Buffer.concat([hd, pcm]).toString("base64") };
}

async function gemini(prompt, json) {
  if (!process.env.GEMINI_API_KEY) throw new Error("no_gemini");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: json ? 2000 : 220, ...(json ? { responseMimeType: "application/json" } : {}) },
      safetySettings: ["HARASSMENT", "HATE_SPEECH", "SEXUALLY_EXPLICIT", "DANGEROUS_CONTENT"].map(c => ({ category: "HARM_CATEGORY_" + c, threshold: "BLOCK_LOW_AND_ABOVE" })) }),
  });
  if (!r.ok) throw new Error("gemini_" + r.status);
  const j = await r.json();
  return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
}
async function groq(prompt, json) {
  if (!process.env.GROQ_API_KEY) throw new Error("no_groq");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.GROQ_API_KEY },
    body: JSON.stringify({ model: process.env.GROQ_MODEL || "llama-3.1-8b-instant", temperature: 0.6, max_tokens: json ? 2000 : 220,
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }], ...(json ? { response_format: { type: "json_object" } } : {}) }),
  });
  if (!r.ok) throw new Error("groq_" + r.status);
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || "").trim();
}
async function ask(prompt, json = false) {
  try { return await gemini(prompt, json); } catch (e) { return await groq(prompt, json); }
}

const strip = s => String(s || "").toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
function leaks(text, answer) {
  const a = strip(answer); if (!a || a.length < 2) return false;
  return (" " + strip(text) + " ").includes(" " + a + " ");
}

async function sbRpc(fn, args) {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error((j && j.message) || "sb_" + r.status);
  return j;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (!SB || !KEY) return res.status(503).json({ error: "chua_cau_hinh" });
  let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  const text = String(b.text || "").slice(0, 400);
  try {
    if (b.mode === "draft") {
      // chỉ thầy cô đã đăng nhập mới được soạn nháp
      const auth = req.headers.authorization || "";
      const u = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: KEY, Authorization: auth } });
      if (!u.ok) return res.status(401).json({ error: "can_dang_nhap" });
      const raw = await ask(DRAFT(text.slice(0, 200)), true);
      let qs = [];
      try { qs = JSON.parse(raw.replace(/^```json|```$/g, "")).questions || []; } catch { qs = []; }
      qs = qs.filter(q => q && q.prompt && Array.isArray(q.options) && q.options.length >= 2).slice(0, 10).map(q => ({
        prompt: String(q.prompt).slice(0, 300), options: q.options.slice(0, 4).map(o => String(o).slice(0, 160)),
        correct: Math.max(0, Math.min(3, +q.correct || 0)), explain: String(q.explain || "").slice(0, 300), level: ["biet", "hieu", "vandung"].includes(q.level) ? q.level : "hieu" }));
      return res.status(200).json({ questions: qs });
    }
    // thầy cô (đã đăng nhập) tạo sẵn giọng đọc cho Ông Kể Chuyện: không tính lượt học sinh
    if (b.mode === "tts" && !b.token && (req.headers.authorization || "").startsWith("Bearer ")) {
      const u = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: KEY, Authorization: req.headers.authorization } });
      if (!u.ok) return res.status(401).json({ error: "can_dang_nhap" });
      return res.status(200).json(await tts(text.slice(0, 1500)));
    }
    if (!b.token) return res.status(401).json({ error: "het_phien" });
    const quota = await sbRpc("student_tini_quota", { p_token: b.token, p_limit: b.mode === "tts" ? 40 : LIMIT, p_kind: b.mode === "tts" ? "tts" : "ai" });
    if (!quota || !quota.ok) return res.status(quota?.reason === "het_luot" ? 429 : 403).json({ error: quota?.reason || "ai_tat" });
    if (b.mode === "tts") {
      const audio = await tts(text.slice(0, 1200));
      return res.status(200).json(audio);
    }
    if (b.mode === "story") {
      const raw = await ask(STORY(String(b.lesson || "").slice(0, 120), String(b.theory || "").slice(0, 1500)), true);
      let j = {}; try { j = JSON.parse(raw.replace(/^```json|```$/g, "")); } catch {}
      if (!j.story || !Array.isArray(j.o) || j.o.length !== 3) return res.status(502).json({ error: "khong_ai" });
      return res.status(200).json({ title: String(j.title || "").slice(0, 80), story: String(j.story).slice(0, 1200), q: String(j.q).slice(0, 200), o: j.o.map(x => String(x).slice(0, 120)), a: Math.max(0, Math.min(2, +j.a || 0)) });
    }
    const mode = ["hint", "ask", "teach"].includes(b.mode) ? b.mode : "ask";
    let out = await ask(modePrompt({ mode, text, lesson: String(b.lesson || "").slice(0, 120), theory: String(b.theory || ""), question: b.question || null, hints: (b.hints || []).slice(0, 3).map(String) }));
    out = out.replace(/\s+/g, " ").slice(0, 420);
    if (!out || (mode !== "teach" && leaks(out, b.answer))) out = (b.hints && b.hints[0]) ? "Gợi ý nè: " + b.hints[0] : "Em đọc lại phần ý chính của bài rồi thử nghĩ thêm một chút nhé!";
    return res.status(200).json({ text: out });
  } catch (e) {
    const m = String(e.message || "");
    if (/het_phien/.test(m)) return res.status(401).json({ error: "het_phien" });
    return res.status(502).json({ error: "khong_ai" });
  }
}
