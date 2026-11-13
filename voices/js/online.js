// Phòng online của lớp: thấy các bạn đang ở trong vương quốc, vị trí và tin nhắn theo thời gian thực.
//  - Có Supabase: dùng Supabase Realtime (presence + broadcast) trên kênh riêng của lớp.
//  - Chế độ thử: dùng BroadcastChannel (mỗi tab là một bạn) và thêm vài bạn ảo đi dạo.
import { api } from "./api.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { randomAvatar } from "./avatar.js";

/**
 * me: { id, name, avatar, x, y, z }
 * on: { join(p), leave(id), move(id, pos), chat(msg), look(id, avatar) }
 * Trả về { move(pos), chat(msg), look(avatar), leave() }
 */
export async function joinRoom(classId, me, on) {
  return api.demo ? localRoom(classId, me, on) : supaRoom(classId, me, on);
}

async function supaRoom(classId, me, on) {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const ch = sb.channel("lop-" + classId, { config: { presence: { key: me.id }, broadcast: { self: false } } });
  const known = new Map();
  ch.on("presence", { event: "sync" }, () => {
    const st = ch.presenceState(), seen = new Set();
    for (const [key, metas] of Object.entries(st)) {
      if (key === me.id || !metas.length) continue;
      const m = metas[metas.length - 1]; seen.add(key);
      const old = known.get(key);
      if (!old) { known.set(key, m); on.join({ id: key, name: m.name, avatar: m.avatar, x: m.x, y: m.y, z: m.z }); }
      else if (JSON.stringify(old.avatar) !== JSON.stringify(m.avatar)) { known.set(key, m); on.look(key, m.avatar); }
    }
    for (const k of [...known.keys()]) if (!seen.has(k)) { known.delete(k); on.leave(k); }
  });
  ch.on("broadcast", { event: "pos" }, ({ payload }) => payload?.id && on.move(payload.id, payload));
  ch.on("broadcast", { event: "chat" }, ({ payload }) => payload && on.chat(payload));
  const meta = () => ({ name: me.name, avatar: me.avatar, x: me.x, y: me.y, z: me.z });
  await new Promise(res => {
    const timer = setTimeout(res, 6000);
    ch.subscribe(async status => { if (status === "SUBSCRIBED") { clearTimeout(timer); try { await ch.track(meta()); } catch {} res(); } });
  });
  // cập nhật vị trí trong presence thỉnh thoảng, để bạn mới vào thấy đúng chỗ
  const keep = setInterval(() => { try { if (!document.hidden) ch.track(meta()); } catch {} }, 30000);
  return {
    move(p) { Object.assign(me, p); ch.send({ type: "broadcast", event: "pos", payload: { id: me.id, ...p } }); },
    chat(m) { ch.send({ type: "broadcast", event: "chat", payload: m }); },
    look(av) { me.avatar = av; try { ch.track(meta()); } catch {} },
    leave() { clearInterval(keep); try { sb.removeChannel(ch); } catch {} },
  };
}

function localRoom(classId, me, on) {
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("kvtm-room-" + classId) : null;
  const peers = new Map(); // id -> last seen
  const num = v => (typeof v === "number" ? v : +v || 0);
  const post = m => { if (!bc) return; for (const k of ["x", "y", "z", "ry"]) if (k in m) m[k] = num(m[k]); try { bc.postMessage({ ...m, from: me.id }); } catch (e) { console.warn(e); } };
  if (bc) bc.onmessage = ({ data: d }) => {
    if (!d || d.from === me.id) return;
    if (d.type === "hello" || d.type === "here") {
      if (!peers.has(d.from)) on.join({ id: d.from, name: d.name, avatar: d.avatar, x: d.x, y: d.y, z: d.z });
      else if (d.avatar) on.look(d.from, d.avatar);
      peers.set(d.from, Date.now());
      if (d.type === "hello") post({ type: "here", name: me.name, avatar: me.avatar, x: me.x, y: me.y, z: me.z });
    } else if (d.type === "pos") { peers.set(d.from, Date.now()); on.move(d.from, d); }
    else if (d.type === "chat") on.chat(d.msg);
    else if (d.type === "bye") { peers.delete(d.from); on.leave(d.from); }
  };
  post({ type: "hello", name: me.name, avatar: me.avatar, x: me.x, y: me.y, z: me.z });
  const beat = setInterval(() => {
    post({ type: "here", name: me.name, avatar: me.avatar, x: me.x, y: me.y, z: me.z });
    for (const [id, t] of peers) if (Date.now() - t > 16000) { peers.delete(id); on.leave(id); }
  }, 5000);
  const bye = () => post({ type: "bye" });
  addEventListener("pagehide", bye);

  // Bạn ảo cho chế độ thử
  const BOTS = [["bot-gio", "Gió"], ["bot-suong", "Sương"], ["bot-hoa", "Hoa"], ["bot-bao", "Bảo"]];
  const LINES = ["Chào cả lớp!", "Ai học xong Hồ Ba Thể chưa?", "Mình vừa nhổ được 2 bụi cỏ!", "Nước đá tan ở 0 °C đó nha.", "Cố lên mọi người!", "Tủ đồ có cánh nhỏ xinh lắm."];
  const spot = () => { for (;;) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 8; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (z < -2 && Math.abs(x) < 6) continue; if (Math.hypot(x, z - 3) < 3) continue; if (Math.abs(x) > 5.5 && Math.abs(x) < 11 && z > -1.8 && z < 3.8) continue; return { x, z }; } };
  const bots = BOTS.map(([id, name]) => { const p = spot(); const b = { id, name, avatar: randomAvatar(), x: p.x, y: 0, z: p.z, t: spot(), wait: Math.random() * 3 }; on.join({ ...b, name: name + " (bạn ảo)" }); return b; });
  let last = performance.now();
  const botTimer = setInterval(() => {
    const now = performance.now(), dt = (now - last) / 1000; last = now;
    for (const b of bots) {
      const dx = b.t.x - b.x, dz = b.t.z - b.z, d = Math.hypot(dx, dz);
      if (d > 0.2) { const s = Math.min(d, 3.2 * dt); b.x += dx / d * s; b.z += dz / d * s; on.move(b.id, { x: b.x, y: 0, z: b.z, ry: Math.atan2(dx, dz) }); }
      else if ((b.wait -= dt) < 0) { b.t = spot(); b.wait = 2 + Math.random() * 4; }
    }
    if (Math.random() < 0.004) { const b = bots[(Math.random() * bots.length) | 0]; on.chat({ sid: b.id, name: b.name + " (bạn ảo)", text: LINES[(Math.random() * LINES.length) | 0], at: new Date().toISOString() }); }
  }, 100);

  return {
    move(p) { Object.assign(me, p); post({ type: "pos", ...p }); },
    chat(m) { post({ type: "chat", msg: m }); },
    look(av) { me.avatar = av; post({ type: "here", name: me.name, avatar: av, x: me.x, y: me.y, z: me.z }); },
    leave() { clearInterval(beat); clearInterval(botTimer); bye(); removeEventListener("pagehide", bye); bc && bc.close(); },
  };
}
