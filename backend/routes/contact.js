const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

const SITE_OWNER_EMAIL = process.env.SITE_OWNER_EMAIL || 'maki4592@gmail.com';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// ─── Rate limiting (in-memory) ──────────────────────────────
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // max 5 submissions per window per IP
const rateLimitStore = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// Cleanup stale entries every 30 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitStore.delete(ip);
  }
}, 30 * 60 * 1000);

// ─── HTML sanitization ─────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildMessageFromBody(body) {
  const entries = Object.entries(body).filter(([k]) => !k.startsWith('_'));
  const textLines = entries.map(([k, v]) => `${k}: ${v}`);
  const htmlLines = entries.map(([k, v]) => `<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</p>`);
  return {
    text: `You received a new message from the website contact form.\n\n${textLines.join('\n')}`,
    html: `<div><p>You received a new message from the website contact form.</p>${htmlLines.join('')}</div>`,
  };
}

// ─── Contact form endpoint ──────────────────────────────────
router.post('/', async (req, res) => {
  try {
    // Rate limiting
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      return res.status(429).json({ ok: false, error: 'Troppe richieste. Riprova tra qualche minuto.' });
    }

    const body = req.body || {};

    if (!Object.keys(body).length) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }

    // Validate required contact fields
    if (!body.name || !body.email) {
      return res.status(400).json({ ok: false, error: 'Nome e email richiesti' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return res.status(400).json({ ok: false, error: 'Formato email non valido' });
    }

    const { text, html } = buildMessageFromBody(body);

    // Persist to database (sanitised fields only)
    let dbOk = false;
    try {
      const name = String(body.name || '').slice(0, 200);
      const email = String(body.email || '').slice(0, 200);
      const messageText = String(body.message || body.text || '').slice(0, 5000);
      const insertPayload = { name, email, text: messageText };
      const { error: insertError } = await supabase.from('contact_form').insert([insertPayload]);
      if (insertError) {
        console.error('Supabase insert error for contact_form:', insertError);
      } else {
        dbOk = true;
      }
    } catch (dbErr) {
      console.error('Exception while inserting contact_form:', dbErr);
    }

    // Send email via Formsubmit.co
    try {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        params.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
      params.append('_subject', body._subject || `Website message from ${body.name || 'visitor'}`);

      const endpoint = `https://formsubmit.co/ajax/${encodeURIComponent(SITE_OWNER_EMAIL)}`;
      const fetchRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: FRONTEND_ORIGIN,
          Origin: FRONTEND_ORIGIN,
        },
        body: params.toString(),
      });
      const fetchText = await fetchRes.text().catch(() => '');
      let fetchData = {};
      try {
        fetchData = fetchText ? JSON.parse(fetchText) : {};
      } catch (e) {
        fetchData = { raw: fetchText };
      }

      console.log('Formsubmit response status:', fetchRes.status);

      if (!fetchRes.ok) {
        console.error('Formsubmit send error', fetchData);
        // Don't leak internal details to client
        return res.status(502).json({ ok: false, error: 'Invio email fallito. Riprova più tardi.' });
      }

      return res.json({ ok: true });
    } catch (sendErr) {
      console.error('Formsubmit send exception', sendErr);
      return res.status(500).json({ ok: false, error: 'Invio email fallito' });
    }
  } catch (err) {
    console.error('Error sending contact email', err);
    return res.status(500).json({ ok: false, error: 'Errore interno' });
  }
});

module.exports = router;
