// Lớp kết nối dữ liệu. Có 2 cách chạy cùng một giao diện:
//  - SupabaseApi: dùng khi đã điền SUPABASE_URL trong config.js
//  - LocalApi:    "Chế độ thử", lưu trong trình duyệt để thử ngay không cần máy chủ
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { randomPics } from "./pics.js";

const ERR_VI = {
  khong_tim_thay: "Không tìm thấy bạn này trong lớp.",
  sai_hinh: "Chưa đúng 3 hình rồi. Em thử lại nhé!",
  tam_khoa: "Em thử sai nhiều lần quá. Đợi 1 phút rồi thử lại nhé.",
  het_phien: "Phiên học đã hết. Em đăng nhập lại nhé.",
  qua_lon: "Dữ liệu quá lớn, chưa lưu được.",
  chat_nhanh: "Em gửi chậm lại một chút nhé (3 giây một tin).",
  chat_tat: "Cô đang tắt trò chuyện lớp.",
  chat_trong: "Em chưa gõ gì cả.",
  "Invalid login credentials": "Email hoặc mật khẩu chưa đúng.",
  "User already registered": "Email này đã có tài khoản. Cô đăng nhập nhé.",
  "Email not confirmed": "Email chưa được xác nhận. Cô mở hộp thư để bấm xác nhận.",
};
export function friendlyError(e) {
  const m = (e && (e.message || e.error_description || e.msg)) || String(e);
  for (const k of Object.keys(ERR_VI)) if (m.includes(k)) return ERR_VI[k];
  if (/Failed to fetch|NetworkError/i.test(m)) return "Mất kết nối mạng. Kiểm tra wifi rồi thử lại.";
  return m;
}
function apiError(code) { const e = new Error(code); e.code = code; return e; }

const SS = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ------------------------------------------------------------------
// Supabase (gọi REST trực tiếp, không cần cài thư viện)
// ------------------------------------------------------------------
class SupabaseApi {
  constructor(url, key) { this.url = url.replace(/\/$/, ""); this.key = key; this.demo = false; }

  // ----- giáo viên -----
  get _auth() { return SS.get("kvtm-teacher"); }
  set _auth(v) { SS.set("kvtm-teacher", v); }

  async _authCall(path, body) {
    const r = await fetch(`${this.url}/auth/v1/${path}`, {
      method: "POST", headers: { apikey: this.key, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.msg || j.error_description || j.message || "Lỗi đăng nhập");
    return j;
  }
  _keep(j) {
    if (!j.access_token) return null;
    this._auth = { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in - 60) * 1000, email: j.user?.email };
    return this._auth;
  }
  async signUp(email, password) {
    const j = await this._authCall("signup", { email, password });
    if (!j.access_token) return { needConfirm: true };
    this._keep(j); return { ok: true };
  }
  async signIn(email, password) { this._keep(await this._authCall("token?grant_type=password", { email, password })); return { ok: true }; }
  async signOut() { this._auth = null; }
  teacherSession() { return this._auth ? { email: this._auth.email } : null; }
  async _token() {
    const a = this._auth; if (!a) throw new Error("Cô cần đăng nhập lại.");
    if (Date.now() < a.exp) return a.access;
    const j = await this._authCall("token?grant_type=refresh_token", { refresh_token: a.refresh });
    return this._keep(j).access;
  }
  async _rest(path, { method = "GET", body, prefer, auth = true } = {}) {
    const headers = { apikey: this.key, "Content-Type": "application/json" };
    if (auth) headers.Authorization = "Bearer " + await this._token();
    if (prefer) headers.Prefer = prefer;
    const r = await fetch(`${this.url}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 204) return null;
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && (j.message || j.hint)) || "Lỗi máy chủ " + r.status);
    return j;
  }
  listClasses() { return this._rest("classes?select=*&order=created_at"); }
  async createClass(name) { return (await this._rest("classes", { method: "POST", body: { name }, prefer: "return=representation" }))[0]; }
  async updateClass(id, patch) { return (await this._rest(`classes?id=eq.${id}`, { method: "PATCH", body: patch, prefer: "return=representation" }))[0]; }
  deleteClass(id) { return this._rest(`classes?id=eq.${id}`, { method: "DELETE" }); }
  listStudents(classId) { return this._rest(`students?class_id=eq.${classId}&select=id,name,pics,state,last_seen&order=name`); }
  addStudents(classId, names) {
    return this._rest("students", { method: "POST", prefer: "return=representation",
      body: names.map(name => ({ class_id: classId, name, pics: randomPics() })) });
  }
  async updateStudent(id, patch) { return (await this._rest(`students?id=eq.${id}`, { method: "PATCH", body: patch, prefer: "return=representation" }))[0]; }
  deleteStudent(id) { return this._rest(`students?id=eq.${id}`, { method: "DELETE" }); }
  listAnswers(classId, sinceIso) {
    return this._rest(`answers?class_id=eq.${classId}&created_at=gte.${encodeURIComponent(sinceIso)}&select=student_id,lesson,seed,question_id,kind,correct,first_try,misconception,created_at&order=created_at.desc&limit=5000`);
  }

  // ----- học sinh -----
  _rpc(fn, args) { return this._rest(`rpc/${fn}`, { method: "POST", body: args, auth: false }); }
  get studentToken() { return SS.get("kvtm-student"); }
  set studentToken(v) { SS.set("kvtm-student", v); }
  roster(code) { return this._rpc("class_roster", { p_code: code }); }
  async login(code, studentId, pics) {
    const r = await this._rpc("student_login", { p_code: code, p_student: studentId, p_pics: pics });
    if (r && r.error) throw apiError(r.error);
    this.studentToken = r.token; return true;
  }
  load() { return this._rpc("student_load", { p_token: this.studentToken }); }
  save(state) { return this._rpc("student_save", { p_token: this.studentToken, p_state: state }); }
  log(rows) { return rows.length ? this._rpc("student_log", { p_token: this.studentToken, p_rows: rows }) : null; }
  async logout() { const t = this.studentToken; this.studentToken = null; if (t) try { await this._rpc("student_logout", { p_token: t }); } catch {} }
  chatList() { return this._rpc("student_chat_list", { p_token: this.studentToken }); }
  chatSend(text) { return this._rpc("student_chat_send", { p_token: this.studentToken, p_text: text }); }
  leaderboard() { return this._rpc("student_leaderboard", { p_token: this.studentToken }); }
}

// ------------------------------------------------------------------
// Chế độ thử: lưu localStorage, có sẵn một lớp mẫu
// ------------------------------------------------------------------
const LK = "kvtm-demo-v1";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
function genCode(existing) {
  const ch = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let c;
  do { c = Array.from({ length: 6 }, () => ch[Math.floor(Math.random() * ch.length)]).join(""); } while (existing.includes(c));
  return c;
}
const DEFAULT_SETTINGS = { open: ["bai-09", "bai-10"], mute: false, growSeconds: 60, aiMode: "approved" };

class LocalApi {
  constructor() { this.demo = true; this._db = this._read(); }
  _read() {
    let db = null; try { db = JSON.parse(localStorage.getItem(LK)); } catch {}
    if (!db) {
      const cls = { id: uid(), teacher: "co@demo", name: "6A (lớp thử)", code: "MAY666", settings: { ...DEFAULT_SETTINGS }, created_at: new Date().toISOString() };
      db = { teachers: { "co@demo": { pw: "123456" } }, classes: [cls], students: [], answers: [] };
      [["Bông", ["may", "cau-vong", "ngoi-sao"]], ["Mây", ["giot-mua", "cay-non", "ong-nghiem"]], ["Nắng", ["ngon-lua", "bong-tuyet", "hat-muoi"]]]
        .forEach(([name, pics]) => db.students.push({ id: uid(), class_id: cls.id, name, pics, state: {}, last_seen: null, fails: 0 }));
      try { localStorage.setItem(LK, JSON.stringify(db)); } catch {}
    }
    return db;
  }
  _write() { try { localStorage.setItem(LK, JSON.stringify(this._db)); } catch {} }
  _wait(v) { return new Promise(r => setTimeout(() => r(structuredClone(v)), 60)); }

  async signUp(email, pw) { if (this._db.teachers[email]) throw new Error("User already registered"); this._db.teachers[email] = { pw }; this._write(); SS.set("kvtm-demo-t", email); return { ok: true }; }
  async signIn(email, pw) { const t = this._db.teachers[email]; if (!t || t.pw !== pw) throw new Error("Invalid login credentials"); SS.set("kvtm-demo-t", email); return { ok: true }; }
  async signOut() { SS.set("kvtm-demo-t", null); }
  teacherSession() { const e = SS.get("kvtm-demo-t"); return e ? { email: e } : null; }
  _me() { this._db = this._read(); const e = SS.get("kvtm-demo-t"); if (!e) throw new Error("Cô cần đăng nhập lại."); return e; }
  _myClass(id) { const c = this._db.classes.find(c => c.id === id && c.teacher === this._me()); if (!c) throw new Error("Không có lớp này"); return c; }
  listClasses() { const me = this._me(); return this._wait(this._db.classes.filter(c => c.teacher === me)); }
  createClass(name) {
    const c = { id: uid(), teacher: this._me(), name, code: genCode(this._db.classes.map(c => c.code)), settings: { ...DEFAULT_SETTINGS, open: ["bai-09"] }, created_at: new Date().toISOString() };
    this._db.classes.push(c); this._write(); return this._wait(c);
  }
  updateClass(id, patch) { const c = this._myClass(id); Object.assign(c, patch); this._write(); return this._wait(c); }
  deleteClass(id) { this._myClass(id); this._db.classes = this._db.classes.filter(c => c.id !== id); this._db.students = this._db.students.filter(s => s.class_id !== id); this._write(); return this._wait(null); }
  listStudents(classId) { this._myClass(classId); return this._wait(this._db.students.filter(s => s.class_id === classId).sort((a, b) => a.name.localeCompare(b.name, "vi"))); }
  addStudents(classId, names) {
    this._myClass(classId);
    const rows = names.map(name => ({ id: uid(), class_id: classId, name, pics: randomPics(), state: {}, last_seen: null, fails: 0 }));
    this._db.students.push(...rows); this._write(); return this._wait(rows);
  }
  updateStudent(id, patch) { const s = this._db.students.find(s => s.id === id); this._myClass(s.class_id); Object.assign(s, patch); this._write(); return this._wait(s); }
  deleteStudent(id) { this._db.students = this._db.students.filter(s => s.id !== id); this._write(); return this._wait(null); }
  listAnswers(classId, since) { return this._wait(this._db.answers.filter(a => a.class_id === classId && a.created_at >= since)); }

  get studentToken() { return SS.get("kvtm-demo-s"); }
  set studentToken(v) { SS.set("kvtm-demo-s", v); }
  _stu() {
    this._db = this._read();
    const s = this._db.students.find(s => s.id === this.studentToken);
    if (!s) throw apiError("het_phien"); return s;
  }
  async roster(code) {
    const c = this._db.classes.find(c => c.code === code.trim().toUpperCase()); if (!c) return [];
    return this._wait(this._db.students.filter(s => s.class_id === c.id).map(s => ({ id: s.id, name: s.name, class_name: c.name })).sort((a, b) => a.name.localeCompare(b.name, "vi")));
  }
  async login(code, sid, pics) {
    this._db = this._read();
    const c = this._db.classes.find(c => c.code === code.trim().toUpperCase());
    const s = c && this._db.students.find(s => s.id === sid && s.class_id === c.id);
    if (!s) throw apiError("khong_tim_thay");
    if (s.locked_until && Date.parse(s.locked_until) > Date.now()) throw apiError("tam_khoa");
    if (s.pics.join() !== pics.join()) {
      s.fails = (s.fails || 0) + 1; if (s.fails >= 5) s.locked_until = new Date(Date.now() + 60000).toISOString();
      this._write(); throw apiError("sai_hinh");
    }
    s.fails = 0; s.locked_until = null; s.last_seen = new Date().toISOString(); this._write();
    this.studentToken = s.id; return true;
  }
  async load() { const s = this._stu(); const c = this._db.classes.find(c => c.id === s.class_id); s.last_seen = new Date().toISOString(); this._write(); return this._wait({ id: s.id, name: s.name, state: s.state, className: c.name, settings: c.settings, classId: c.id }); }
  async save(state) { const s = this._stu(); s.state = structuredClone(state); s.last_seen = new Date().toISOString(); this._write(); }
  async log(rows) {
    if (!rows.length) return; const s = this._stu();
    rows.forEach(r => this._db.answers.push({ student_id: s.id, class_id: s.class_id, lesson: r.lesson, seed: r.seed, question_id: r.qid, kind: r.kind || "seed", correct: !!r.correct, first_try: !!r.firstTry, misconception: r.code || null, created_at: new Date().toISOString() }));
    if (this._db.answers.length > 20000) this._db.answers = this._db.answers.slice(-15000);
    this._write();
  }
  async logout() { this.studentToken = null; }
  async chatList() { const s = this._stu(); return this._wait((this._db.chat || []).filter(m => m.class_id === s.class_id).slice(-40)); }
  async chatSend(text) {
    const s = this._stu(); const c = this._db.classes.find(c => c.id === s.class_id);
    if (c.settings?.chat === false) throw apiError("chat_tat");
    const t = cleanText(String(text || "").trim().replace(/\s+/g, " ").slice(0, 120));
    if (!t) throw apiError("chat_trong");
    if (this._lastChat && Date.now() - this._lastChat < 3000) throw apiError("chat_nhanh");
    this._lastChat = Date.now();
    const m = { id: Date.now(), class_id: s.class_id, sid: s.id, name: s.name, text: t, at: new Date().toISOString() };
    (this._db.chat ||= []).push(m); if (this._db.chat.length > 400) this._db.chat = this._db.chat.slice(-300); this._write();
    return this._wait(m);
  }
  async leaderboard() {
    const me = this._stu();
    return this._wait(this._db.students.filter(s => s.class_id === me.class_id).map(s => {
      const seeds = Object.values(s.state?.seeds || {}).filter(x => x.done).length, fixed = (s.state?.weeds || []).filter(w => w.fixed).length;
      return { name: s.name, me: s.id === me.id, avatar: s.state?.avatar || null, seeds, fixed, score: seeds * 10 + fixed * 5 };
    }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "vi")));
  }
  demoPics(sid) { return this._read().students.find(s => s.id === sid)?.pics; }
}

// Lọc từ tục phía máy (máy chủ Supabase cũng lọc lại một lần nữa)
const BAD = ["đụ", "địt", "đéo", "đếch", "lồn", "buồi", "cặc", "đĩ", "vcl", "vkl", "vl", "đm", "dm", "đcm", "dcm", "đmm", "dmm", "clm", "cl", "cc", "óc chó", "con chó", "thằng chó", "mất dạy", "khốn nạn", "djt", "fuck", "shit", "bitch"];
export function cleanText(t) {
  let out = t;
  for (const w of BAD) out = out.replace(new RegExp("(^|[^\\p{L}\\p{N}])" + w + "(?=$|[^\\p{L}\\p{N}])", "giu"), "$1***");
  return out;
}

export const api = SUPABASE_URL && SUPABASE_ANON_KEY ? new SupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY) : new LocalApi();
