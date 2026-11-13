// Lớp kết nối dữ liệu. Có 2 cách chạy cùng một giao diện:
//  - SupabaseApi: dùng khi đã điền SUPABASE_URL trong config.js
//  - LocalApi:    "Chế độ thử", lưu trong trình duyệt để thử ngay không cần máy chủ
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAILS, TINI_API } from "./config.js";
import * as G from "./gamelogic.js";
import { randomPics } from "./pics.js";

const ERR_VI = {
  khong_tim_thay: "Không tìm thấy bạn này trong lớp.",
  sai_hinh: "Chưa đúng 3 hình rồi. Em thử lại nhé!",
  sai_mat_khau: "Mật khẩu chưa đúng. Em thử lại nhé!",
  mat_khau_ngan: "Mật khẩu cần ít nhất 4 kí tự.",
  tam_khoa: "Em thử sai nhiều lần quá. Đợi 1 phút rồi thử lại nhé.",
  het_phien: "Phiên học đã hết. Em đăng nhập lại nhé.",
  qua_lon: "Dữ liệu quá lớn, chưa lưu được.",
  chat_nhanh: "Em gửi chậm lại một chút nhé (3 giây một tin).",
  chat_tat: "Cô đang tắt trò chuyện lớp.",
  het_luot: "Lượt này đã hết, chờ câu tiếp theo nhé!",
  da_tra_loi: "Em đã trả lời lượt này rồi.",
  het_gio: "Trò chơi đã kết thúc.",
  khong_phai_admin: "Chỉ admin mới làm được việc này.",
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
  listStudents(classId) { return this._rest(`students?class_id=eq.${classId}&select=id,name,pics,has_pw,state,last_seen&order=name`); }
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
    const r = await this._rpc("student_login_pw", { p_code: code, p_student: studentId, p_pw: pics });
    if (r && r.error) throw apiError(r.error);
    this.studentToken = r.token; return r;
  }
  setMyPassword(pw) { return this._rpc("student_set_password", { p_token: this.studentToken, p_pw: pw }); }
  load() { return this._rpc("student_load", { p_token: this.studentToken }); }
  poll() { return this._rpc("student_poll", { p_token: this.studentToken }); }
  settingsNow() { return this._rpc("student_settings", { p_token: this.studentToken }); }
  save(state) { return this._rpc("student_save", { p_token: this.studentToken, p_state: state }); }
  log(rows) { return rows.length ? this._rpc("student_log", { p_token: this.studentToken, p_rows: rows }) : null; }
  async logout() { const t = this.studentToken; this.studentToken = null; if (t) try { await this._rpc("student_logout", { p_token: t }); } catch {} }
  chatList() { return this._rpc("student_chat_list", { p_token: this.studentToken }); }
  chatSend(text) { const c = chatCheck(text); if (!c.ok) return Promise.reject(new Error(c.reason)); return this._rpc("student_chat_send", { p_token: this.studentToken, p_text: c.text }); }
  leaderboard() { return this._rpc("student_leaderboard", { p_token: this.studentToken }); }
  async tiniAsk(payload) {
    const r = await fetch(TINI_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, token: this.studentToken }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "khong_ai"); return j;
  }
  async teacherTts(text) {
    const r = await fetch(TINI_API, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + await this._token() }, body: JSON.stringify({ mode: "tts", text }) });
    const j = await r.json().catch(() => ({})); if (!r.ok || !j.audio) throw new Error(j.error || "khong_ai"); return j;
  }
  async uploadVoice(id, blob) {
    const r = await fetch(`${this.url}/storage/v1/object/giong-doc/${id}.wav`, { method: "POST", headers: { apikey: this.key, Authorization: "Bearer " + await this._token(), "Content-Type": blob.type || "audio/wav", "x-upsert": "true", "cache-control": "3600" }, body: blob });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || j.error || "tai_len_loi"); } return true;
  }
  async tiniTts(text, ms = 15000) {
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), ms);
    const r = await fetch(TINI_API, { method: "POST", signal: ac.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "tts", text, token: this.studentToken }) }).finally(() => clearTimeout(tm));
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "khong_ai"); return j;
  }
  async tiniDraft(topic) {
    const r = await fetch(TINI_API, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + await this._token() }, body: JSON.stringify({ mode: "draft", text: topic }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "khong_ai"); return j;
  }
  // Rung chuông vàng liên lớp
  rcvCreate(classIds, questions, qtime) { return this._rest("rpc/rcv_create", { method: "POST", body: { p_class_ids: classIds, p_questions: questions, p_qtime: qtime } }); }
  rcvJoin(code, classId) { return this._rest("rpc/rcv_join_class", { method: "POST", body: { p_code: code, p_class_id: classId } }); }
  rcvControl(room, action) { return this._rest("rpc/rcv_control", { method: "POST", body: { p_room: room, p_action: action } }); }
  rcvTeacherState(room) { return this._rest("rpc/rcv_teacher_state", { method: "POST", body: { p_room: room } }); }
  rcvActive(classId) { return this._rest("rpc/rcv_active", { method: "POST", body: { p_class: classId } }); }
  rcvState() { return this._rpc("rcv_state", { p_token: this.studentToken }); }
  rcvAnswer(qi, choice) { return this._rpc("rcv_answer", { p_token: this.studentToken, p_qi: qi, p_choice: choice }); }
  studentGameActive() { return this._rpc("student_game_active", { p_token: this.studentToken }); }
  gameMine() { return this._rpc("game_mine", { p_token: this.studentToken }); }
  gameAnswer(room, round, choice) { return this._rpc("game_answer", { p_token: this.studentToken, p_room: room, p_round: round, p_choice: choice }); }
  gamePickBox(room, idx) { return this._rpc("game_pick_box", { p_token: this.studentToken, p_room: room, p_idx: idx }); }
  gameHack(room, target, order) { return this._rpc("game_hack", { p_token: this.studentToken, p_room: room, p_target: target, p_order: order }); }
  gameCreate(c) { return this._rest("rpc/game_create", { method: "POST", body: { p_class: c.classId, p_kind: c.kind, p_minutes: c.minutes, p_review: !!c.reviewOnly, p_questions: c.questions, p_puzzles: c.puzzles || [], p_qtime: c.qtime || 20 } }); }
  gameStart(id) { return this._rest("rpc/game_start", { method: "POST", body: { p_room: id } }); }
  gameEnd(id) { return this._rest("rpc/game_end", { method: "POST", body: { p_room: id } }); }
  gameState(id) { return this._rest("rpc/game_teacher_state", { method: "POST", body: { p_room: id } }); }
  async gameActive(classId) { const r = await this._rest(`game_rooms?class_id=eq.${classId}&status=neq.end&select=id&order=created_at.desc&limit=1`); return r && r[0] ? r[0].id : null; }
  async isAdmin() { try { return (await this._rest("rpc/am_i_admin", { method: "POST", body: {} })) === true; } catch { return false; } }
  adminOverview() { return this._rest("rpc/admin_overview", { method: "POST", body: {} }); }
  adminList() { return this._rest("app_admins?select=*&order=added_at"); }
  adminAdd(email, role) { return this._rest("rpc/admin_add", { method: "POST", body: { p_email: email, p_role: role } }); }
  adminRemove(email) { return this._rest("rpc/admin_remove", { method: "POST", body: { p_email: email } }); }
  async appSettings() { const r = await this._rest("app_settings?select=key,value", { auth: !!this._auth }).catch(() => []); return Object.fromEntries((r || []).map(x => [x.key, x.value])); }
  setAppSetting(key, value) { return this._rest("app_settings?on_conflict=key", { method: "POST", body: { key, value }, prefer: "resolution=merge-duplicates" }); }
  listSets() { return this._rest("question_sets?select=*&order=created_at.desc"); }
  async saveSet(s) {
    if (s.id) return (await this._rest(`question_sets?id=eq.${s.id}`, { method: "PATCH", body: { title: s.title, questions: s.questions }, prefer: "return=representation" }))[0];
    return (await this._rest("question_sets", { method: "POST", body: { title: s.title, questions: s.questions }, prefer: "return=representation" }))[0];
  }
  deleteSet(id) { return this._rest(`question_sets?id=eq.${id}`, { method: "DELETE" }); }
  listChat(classId, flaggedOnly = false) { return this._rest(`chat_messages?class_id=eq.${classId}${flaggedOnly ? "&flagged=eq.true" : ""}&select=id,name,text,flagged,created_at&order=created_at.desc&limit=60`); }
  deleteChat(id) { return this._rest(`chat_messages?id=eq.${id}`, { method: "DELETE" }); }
}

// ------------------------------------------------------------------
// Chế độ thử: lưu localStorage, có sẵn một lớp mẫu
// ------------------------------------------------------------------
const norm = t => String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const LK = "kvtm-demo-v2";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
function genCode(existing) {
  const ch = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let c;
  do { c = Array.from({ length: 6 }, () => ch[Math.floor(Math.random() * ch.length)]).join(""); } while (existing.includes(c));
  return c;
}
const ALL_ZONES = ["bai-09", "bai-10", "bai-11", "bai-12", "bai-13", "bai-14", "bai-15", "bai-16", "bai-17"];
const DEFAULT_SETTINGS = { open: ALL_ZONES, mute: false, growSeconds: 30, aiMode: "approved", chat: true, tests: { "bai-10": { pre: true, post: true } } };

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
  _myClass(id) { const me = this._me(); const c = this._db.classes.find(c => c.id === id && c.teacher === me); if (!c) throw new Error("Không có lớp này"); return c; }
  listClasses() { const me = this._me(); return this._wait(this._db.classes.filter(c => c.teacher === me)); }
  createClass(name) {
    const base = (name.replace(/^\s*l(ớ|o)p\s*/i, "").normalize("NFD").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8) || "LOP");
    let code; do { code = base + "-" + "ABCDEFGHKLMNPQRSTUVXYZ"[Math.random() * 22 | 0] + "ABCDEFGHKLMNPQRSTUVXYZ"[Math.random() * 22 | 0]; } while (this._db.classes.some(c => norm(c.code) === norm(code)));
    const c = { id: uid(), teacher: this._me(), name, code, class_pw: String(Math.random() * 10000 | 0).padStart(4, "0"), settings: { ...DEFAULT_SETTINGS, open: ["bai-09"] }, created_at: new Date().toISOString() };
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
  updateStudent(id, patch) { const s = this._db.students.find(s => s.id === id); this._myClass(s.class_id); Object.assign(s, patch); if ("pw_hash" in patch) { s.pw = null; s.has_pw = false; } this._write(); return this._wait(s); }
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
    const c = this._db.classes.find(c => norm(c.code) === norm(code)); if (!c) return [];
    return this._wait(this._db.students.filter(s => s.class_id === c.id).map(s => ({ id: s.id, name: s.name, class_name: c.name })).sort((a, b) => a.name.localeCompare(b.name, "vi")));
  }
  async login(code, sid, pw) {
    this._db = this._read();
    const c = this._db.classes.find(c => norm(c.code) === norm(code));
    const s = c && this._db.students.find(s => s.id === sid && s.class_id === c.id);
    if (!s) throw apiError("khong_tim_thay");
    if (s.locked_until && Date.parse(s.locked_until) > Date.now()) throw apiError("tam_khoa");
    const ok = s.pw ? s.pw === pw : String(pw).trim() === String(c.class_pw || "1234");
    if (!ok) { s.fails = (s.fails || 0) + 1; if (s.fails >= 5) s.locked_until = new Date(Date.now() + 60000).toISOString(); this._write(); throw apiError("sai_mat_khau"); }
    s.fails = 0; s.locked_until = null; this._write(); this.studentToken = s.id; return this._wait({ token: s.id, choose: !s.pw });
  }
  async setMyPassword(pw) { const s = this._stu(); if (String(pw).trim().length < 4) throw apiError("mat_khau_ngan"); s.pw = String(pw).trim(); s.has_pw = true; this._write(); }

  async poll() { this._db = this._read(); const s = this._stu(), c = this._db.classes.find(c => c.id === s.class_id); let hh = 0; for (const ch of JSON.stringify(c.settings)) hh = hh * 31 + ch.charCodeAt(0) | 0; return { h: String(hh), game: await this.gameActive(s.class_id), rcv: await this.rcvActive(s.class_id) }; }
  async settingsNow() { this._db = this._read(); const s = this._stu(); return this._wait(this._db.classes.find(c => c.id === s.class_id).settings); }
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
    const ck = chatCheck(text); if (!ck.ok) throw new Error(ck.reason); text = ck.text;
    const s = this._stu(); const c = this._db.classes.find(c => c.id === s.class_id);
    if (c.settings?.chat === false) throw apiError("chat_tat");
    const raw = String(text || "").trim().replace(/\s+/g, " ").slice(0, 120), t = cleanText(raw);
    if (!t) throw apiError("chat_trong");
    if (this._lastChat && Date.now() - this._lastChat < 3000) throw apiError("chat_nhanh");
    this._lastChat = Date.now();
    const m = { id: Date.now(), class_id: s.class_id, sid: s.id, name: s.name, text: t, flagged: t !== raw, at: new Date().toISOString() };
    (this._db.chat ||= []).push(m); if (this._db.chat.length > 400) this._db.chat = this._db.chat.slice(-300); this._write();
    return this._wait(m);
  }
  async leaderboard() {
    const me = this._stu();
    return this._wait(this._db.students.filter(s => s.class_id === me.class_id).map(s => {
      const seeds = Object.values(s.state?.seeds || {}).filter(x => x.done).length, fixed = (s.state?.weeds || []).filter(w => w.fixed).length, houses = (s.state?.houses || []).length;
      return { name: s.name, me: s.id === me.id, avatar: s.state?.avatar || null, seeds, fixed, houses, plaza: s.state?.plaza?.cleared || 0, score: Math.round((Object.keys(s.state?.qpts || {}).length ? Object.values(s.state.qpts).reduce((a, b) => a + b, 0) : seeds * 10) + fixed * 5 + houses * 15 + (s.state?.plaza?.cleared || 0) * 5) };
    }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "vi")));
  }
  demoPics(sid) { return this._read().students.find(s => s.id === sid)?.pics; }
  async tiniAsk() { throw new Error("khong_ai"); }
  async tiniDraft() { throw new Error("khong_ai"); }
  // ----- trò chơi: luật chạy ngay trong trình duyệt, các tab trên cùng máy thấy nhau -----
  _game(id) { this._db = this._read(); const r = (this._db.games ||= {})[id]; if (!r) throw new Error("Không có phòng chơi"); return r; }
  _myRoom() { const s = this._stu(); const rooms = Object.values(this._db.games || {}).filter(r => r.class_id === s.class_id && (r.status !== "end" || Date.now() - (r.ended_at || 0) < 90000)); return [s, rooms.sort((a, b) => b.created_at - a.created_at)[0] || null]; }
  async gameMine() { const [s, r] = this._myRoom(); if (!r) return null; if (r.status !== "end") G.join(r, s.id, s.name); const v = G.mineView(r, s.id); this._write(); return this._wait(v); }
  async gameAnswer(room, round, choice) { const s = this._stu(); const r = this._game(room); const v = G.answer(r, s.id, round, choice); this._write(); return this._wait(v); }
  async gamePickBox(room, idx) { const s = this._stu(); const r = this._game(room); const v = G.pickBox(r, s.id, idx); this._write(); return this._wait(v); }
  async gameHack(room, target, order) { const s = this._stu(); const r = this._game(room); const v = G.hack(r, s.id, target, order); this._write(); return this._wait(v); }
  async gameCreate(c) {
    this._myClass(c.classId); this._db.games ||= {};
    Object.values(this._db.games).forEach(r => { if (r.class_id === c.classId && r.status !== "end") r.status = "end"; });
    const room = G.newRoom({ id: uid(), classId: c.classId, kind: c.kind, minutes: c.minutes, qtime: c.qtime, reviewOnly: c.reviewOnly, questions: c.questions, puzzles: c.puzzles });
    [["bot-gio", "Gió (bạn ảo)"], ["bot-suong", "Sương (bạn ảo)"], ["bot-hoa", "Hoa (bạn ảo)"]].forEach(([id, n]) => G.join(room, id, n));
    this._db.games[room.id] = room; this._write(); return room.id;
  }
  async gameStart(id) { const r = this._game(id); G.start(r); this._write(); }
  async gameEnd(id) { const r = this._game(id); r.status = "end"; r.ended_at = Date.now(); this._write(); }
  async gameState(id) { const r = this._game(id); G.botsAct(r); const v = G.teacherView(r); this._write(); return this._wait(v); }
  // Rung chuông vàng (bản xem thử, lưu trong trình duyệt)
  _rcvView(r, wc) { const now = Date.now(), P = Object.values(r.players || {}), q = r.qi >= 0 && (r.phase === "ask" || r.phase === "reveal") ? r.questions[r.qi] : null;
    return { id: r.id, code: r.code, phase: r.phase, qi: r.qi, total: r.questions.length, qtime: r.qtime, timeLeft: r.phase === "ask" ? Math.max(0, r.qtime - (now - r.qs) / 1000) : null,
      q: q && { prompt: q.prompt, options: q.options, correct: wc || r.phase === "reveal" ? q.correct : undefined },
      classes: r.class_ids.map(id => ({ name: (this._db.classes.find(c => c.id === id) || {}).name, alive: P.filter(p => p.cls === id && p.alive).length, total: P.filter(p => p.cls === id).length, answered: P.filter(p => p.cls === id && p.alive && p.cqi === r.qi).length })),
      alive: P.filter(p => p.alive).sort((a, b) => b.right - a.right).slice(0, 60).map(p => ({ name: p.name, cls: (this._db.classes.find(c => c.id === p.cls) || {}).name, right: p.right })) }; }
  async rcvCreate(classIds, questions, qtime) { this._db = this._read(); const id = uid(); (this._db.rcv ||= {})[id] = { id, code: Math.random().toString(36).slice(2, 7).toUpperCase(), class_ids: classIds, questions, qtime, qi: -1, phase: "lobby", players: {}, at: Date.now() }; this._write(); return id; }
  async rcvJoin(code, classId) { this._db = this._read(); const r = Object.values(this._db.rcv || {}).find(r => r.code === code.trim().toUpperCase() && r.phase !== "end"); if (!r) throw new Error("Không tìm thấy phòng"); if (!r.class_ids.includes(classId)) r.class_ids.push(classId); this._write(); return r.id; }
  async rcvControl(id, a) { this._db = this._read(); const r = this._db.rcv[id], P = Object.values(r.players);
    if (a === "next") { if (r.qi + 1 >= r.questions.length) r.phase = "end"; else { r.qi++; r.phase = "ask"; r.qs = Date.now(); } }
    if (a === "reveal" && r.phase === "ask") { const c = r.questions[r.qi].correct; P.forEach(p => { if (!p.alive) return; if (p.cqi === r.qi && p.choice === c) p.right++; else p.alive = false; }); r.phase = "reveal"; }
    if (a === "revive") P.forEach(p => p.alive = true); if (a === "end") r.phase = "end"; this._write(); }
  async rcvTeacherState(id) { this._db = this._read(); return this._wait(this._rcvView(this._db.rcv[id], true)); }
  async rcvActive(classId) { this._db = this._read(); const r = Object.values(this._db.rcv || {}).filter(r => r.class_ids.includes(classId) && r.phase !== "end").sort((a, b) => b.at - a.at)[0]; return r ? r.id : null; }
  async rcvState() { this._db = this._read(); const s = this._stu(); const r = Object.values(this._db.rcv || {}).filter(r => r.class_ids.includes(s.class_id) && (r.phase !== "end" || Date.now() - r.at < 36e5)).sort((a, b) => b.at - a.at)[0]; if (!r) return null;
    const me = r.players[s.id] ||= { name: s.name, cls: s.class_id, alive: r.phase === "lobby", choice: null, cqi: -1, right: 0 }; this._write();
    return this._wait({ ...this._rcvView(r, false), me: { alive: me.alive, choice: me.cqi === r.qi ? me.choice : null, right: me.right } }); }
  async rcvAnswer(qi, choice) { this._db = this._read(); const s = this._stu(); const r = Object.values(this._db.rcv || {}).find(r => r.class_ids.includes(s.class_id) && r.phase === "ask"); if (!r || r.qi !== qi) throw new Error("Hết giờ"); const me = r.players[s.id]; if (me && me.alive) { me.choice = choice; me.cqi = qi; } this._write(); }
  async studentGameActive() { const s = this._stu(); return this.gameActive(s.class_id); }
  async gameActive(classId) { this._db = this._read(); const r = Object.values(this._db.games || {}).find(r => r.class_id === classId && r.status !== "end"); return r ? r.id : null; }
  async isAdmin() { const e = this.teacherSession()?.email; return !!e && (e === "co@demo" || ADMIN_EMAILS.includes(e) || (this._read().admins || []).some(a => a.email === e)); }
  async adminOverview() {
    this._db = this._read();
    const teachers = Object.keys(this._db.teachers).map(email => { const cls = this._db.classes.filter(c => c.teacher === email); return { email, classes: cls.length, students: this._db.students.filter(s => cls.some(c => c.id === s.class_id)).length }; });
    return { teachers, totals: { teachers: teachers.length, classes: this._db.classes.length, students: this._db.students.length } };
  }
  async adminList() { const extra = this._read().admins || []; return [...ADMIN_EMAILS.map(email => ({ email, role: "tong" })), { email: "co@demo", role: "tong" }, ...extra]; }
  async adminAdd(email, role) { this._db = this._read(); (this._db.admins ||= []).push({ email, role, added_at: new Date().toISOString() }); this._write(); }
  async adminRemove(email) { this._db = this._read(); this._db.admins = (this._db.admins || []).filter(a => a.email !== email); this._write(); }
  async appSettings() { return this._read().app || {}; }
  async setAppSetting(key, value) { this._db = this._read(); (this._db.app ||= {})[key] = value; this._write(); }
  async listSets() { const me = this._me(); return this._wait((this._db.sets || []).filter(s => s.teacher === me)); }
  async saveSet(s) { const me = this._me(); this._db.sets ||= []; if (s.id) { const x = this._db.sets.find(x => x.id === s.id); Object.assign(x, { title: s.title, questions: s.questions }); this._write(); return x; } const n = { id: uid(), teacher: me, title: s.title, questions: s.questions, created_at: new Date().toISOString() }; this._db.sets.push(n); this._write(); return n; }
  async deleteSet(id) { this._me(); this._db.sets = (this._db.sets || []).filter(s => s.id !== id); this._write(); }
  async listChat(classId, flaggedOnly = false) { this._myClass(classId); return this._wait((this._db.chat || []).filter(m => m.class_id === classId && (!flaggedOnly || m.flagged)).slice(-60).reverse().map(m => ({ ...m, created_at: m.at }))); }
  async deleteChat(id) { this._db.chat = (this._db.chat || []).filter(m => m.id !== id); this._write(); }
}

// Lọc từ tục phía máy (máy chủ Supabase cũng lọc lại một lần nữa)
const BAD = ["đụ", "địt", "đéo", "đếch", "lồn", "buồi", "cặc", "đĩ", "vãi lồn", "vãi", "vcl", "vkl", "vl", "đm", "dm", "đcm", "dcm", "đmm", "dmm", "clm", "cl", "cc", "cmm", "đkm", "dkm", "óc chó", "con chó", "thằng chó", "chó má", "mất dạy", "khốn nạn", "khốn", "djt", "dit", "du ma", "fuck", "shit", "bitch", "wtf", "giết", "giết mày", "đánh chết", "đâm chết", "chém", "chém chết", "đâm", "bóp cổ", "đập chết", "đập mày", "đấm mày", "tát mày", "đánh mày", "xử mày", "xử đẹp", "cho mày chết", "chết đi", "chết mẹ", "tự tử", "treo cổ", "súng", "bắn chết", "bom", "nổ tung", "máu me", "dao găm", "ngu", "ngu như bò", "ngu như lợn", "đần", "đần độn", "óc lợn", "óc bò", "thằng điên", "con điên", "khùng", "thằng ngu", "con ngu", "đồ ngu", "não cá vàng", "béo như lợn", "xấu như ma", "đồ ăn hại", "phế vật", "rác rưởi", "biến đi", "cút", "im mồm", "câm mồm", "bố mày", "mẹ mày", "tao", "mày", "dốt", "ngu dốt", "đồ dốt", "dốt nát", "ngốc", "đồ ngốc", "ngu ngốc", "thằng ngốc", "bố láo", "láo", "mất nết", "vô học", "đồ điên", "đồ khùng", "đồ chó", "chó chết", "con lợn", "đồ lợn", "ngu vãi", "cmn", "vcc", "vler", "vờ lờ", "đờ mờ", "ditme", "đitme", "deo", "loz", "cak", "kặc", "stupid", "idiot", "dumb", "damn", "bastard", "asshole", "dick", "pussy", "motherfucker", "fucking", "fucker", "fck", "fuk", "fuq", "stfu", "gay", "gei", "lgbt", "les", "bê đê", "pê đê", "bede", "bóng lộ", "xăng pha nhớt", "thằng lọ", "đồ lọ", "con lọ", "lọ vl", "như lọ", "lọ quá", "lọ thế", "lọ vậy", "thủ dâm", "sex", "porn", "nude"];
// gốc từ tục: có trong chữ là chặn (kể cả viết dính liền, chèn dấu chấm, dấu sao)
const BAD_ROOT = ["lgbt", "fuck", "fuk", "fck", "shit", "bitch", "đụ", "địt", "lồn", "cặc", "buồi", "đéo", "đm", "đcm", "dcm", "ditme", "vcl", "vkl"];
const fold = t => t.normalize("NFC").toLowerCase().replace(/[*.\-_@!|$ ]/g, "");
// Kiểm tra tin nhắn trò chuyện: chặn spam, đường link, chữ vô nghĩa; che từ tục, bạo lực, xúc phạm
export function chatCheck(t) {
  const raw = String(t || "").replace(/\s+/g, " ").trim();
  if (!raw) return { ok: false, reason: "Tin nhắn đang trống." };
  if (/https?:|www\.|\.com|\.vn|\.net/i.test(raw)) return { ok: false, reason: "Không gửi đường link trong trò chuyện lớp nhé." };
  if (/(.)\1{5,}/u.test(raw) || /(\S{2,4})\1{4,}/u.test(raw.replace(/\s/g, ""))) return { ok: false, reason: "Tin nhắn lặp kí tự quá nhiều, em viết lại cho rõ nhé." };
  const words = raw.split(" "); if (words.some(w => w.length > 22)) return { ok: false, reason: "Có từ quá dài, giống chữ gõ linh tinh. Em viết lại nhé." };
  const letters = raw.replace(/[^\p{L}]/gu, ""); if (letters.length >= 6 && !/[aăâeêioôơuưyáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(letters)) return { ok: false, reason: "Tin nhắn chưa có nghĩa, em viết lại nhé." };
  const nfc = raw.normalize("NFC"), clean = cleanText(nfc), rootHit = BAD_ROOT.some(w => fold(nfc).includes(w));
  return { ok: true, text: rootHit ? "***" : clean, flagged: rootHit || clean !== nfc };
}
export function cleanText(t) {
  let out = t;
  for (const w of BAD) out = out.replace(new RegExp("(^|[^\\p{L}\\p{N}])" + w + "(?=$|[^\\p{L}\\p{N}])", "giu"), "$1***");
  return out;
}

export const CONFIGURED = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
// Chưa điền khóa Supabase thì web hiện hướng dẫn cài đặt (bản xem trước nội bộ chỉ mở bằng ?preview).
const PREVIEW = typeof location !== "undefined" && new URLSearchParams(location.search).has("preview");
export const api = CONFIGURED && !PREVIEW ? new SupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY) : new LocalApi();
