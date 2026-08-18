'use strict';

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const MAX_BODY_BYTES = 16 * 1024;
const attempts = new Map();

const clean = (value, max) => String(value || '').trim().slice(0, max).replace(/[<>]/g, (char) => char === '<' ? '&lt;' : '&gt;');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reply(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(payload);
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!origin || !host) return false;
  try { return new URL(origin).host === String(host).split(',')[0].trim(); } catch { return false; }
}

function withinRateLimit(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  recent.push(now); attempts.set(ip, recent);
  if (attempts.size > 1000) for (const [key, value] of attempts) if (!value.some((time) => now - time < RATE_WINDOW_MS)) attempts.delete(key);
  return recent.length <= RATE_LIMIT;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(res, 405, { message: 'Method not allowed.' }); }
  if (!sameOrigin(req)) return reply(res, 403, { message: 'Request origin was not accepted.' });
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) return reply(res, 413, { message: 'Inquiry is too large.' });
  if (!withinRateLimit(req)) return reply(res, 429, { message: 'Please wait before sending another inquiry.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return reply(res, 400, { message: 'Invalid request.' }); } }
  if (!body || typeof body !== 'object' || Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) return reply(res, 400, { message: 'Invalid request.' });
  if (String(body.company || '').trim()) return reply(res, 200, { message: 'Thank you. Your inquiry has been received.' });

  const inquiry = {
    name: clean(body.name, 100), email: clean(body.email, 160), organisation: clean(body.organisation, 120),
    service: clean(body.service, 100), timeline: clean(body.timeline, 80), message: clean(body.message, 3000)
  };
  if (inquiry.name.length < 2 || !emailPattern.test(inquiry.email) || inquiry.message.length < 20) return reply(res, 422, { message: 'Please provide a valid name, email, and message.' });

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.INQUIRY_TO_EMAIL || 'Aziq.bytewavedigital@gmail.com';
  const sender = process.env.INQUIRY_FROM_EMAIL;
  if (!apiKey || !sender) return reply(res, 503, { message: 'Email delivery is temporarily unavailable. Please email us directly.' });
  const lines = [`Name: ${inquiry.name}`, `Email: ${inquiry.email}`, `Organisation: ${inquiry.organisation || '—'}`, `Service: ${inquiry.service || '—'}`, `Timeline: ${inquiry.timeline || '—'}`, '', inquiry.message];
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: sender, to: [recipient], reply_to: inquiry.email, subject: `New ByteWave inquiry from ${inquiry.name}`, text: lines.join('\n') }) });
    if (!response.ok) return reply(res, 502, { message: 'We could not send your inquiry. Please email us directly.' });
    return reply(res, 200, { message: 'Thank you. We will be in touch soon.' });
  } catch { return reply(res, 502, { message: 'We could not send your inquiry. Please email us directly.' }); }
};
