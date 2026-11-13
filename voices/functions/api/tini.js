// Cloudflare Pages Function: chạy lại đúng mã api/tini.js (bản Vercel) trên Cloudflare.
// Biến môi trường đặt ở Cloudflare Pages → Settings → Variables and Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY…
import { Buffer } from "node:buffer";

export async function onRequest({ request, env }) {
  globalThis.process ||= { env: {} }; globalThis.process.env ||= {};
  for (const [k, v] of Object.entries(env || {})) if (typeof v === "string") globalThis.process.env[k] = v;
  globalThis.Buffer ||= Buffer;
  const { default: handler } = await import("../../api/tini.js");
  let body = {}; if (request.method === "POST") { try { body = await request.json(); } catch { body = {}; } }
  const headers = Object.fromEntries([...request.headers].map(([k, v]) => [k.toLowerCase(), v]));
  return new Promise(resolve => {
    let status = 200; const h = new Headers({ "Content-Type": "application/json; charset=utf-8" });
    const res = { setHeader(k, v) { h.set(k, v); return res; }, status(c) { status = c; return res; }, json(o) { resolve(new Response(JSON.stringify(o), { status, headers: h })); return res; } };
    Promise.resolve(handler({ method: request.method, body, headers }, res)).catch(e => resolve(new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: h })));
  });
}
