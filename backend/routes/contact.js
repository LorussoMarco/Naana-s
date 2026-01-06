const express = require('express');
const router = express.Router();
// supabase client for saving contact submissions
const supabase = require('../supabaseClient');
// Use Formsubmit.co only (no SMTP, no nodemailer)
const SITE_OWNER_EMAIL = process.env.SITE_OWNER_EMAIL || 'maki4592@gmail.com';
// Origin/Referer to send when calling Formsubmit (some providers require a valid origin)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

function buildMessageFromBody(body) {
  // Create a readable text and HTML summary of the incoming payload
  const entries = Object.entries(body).filter(([k]) => !k.startsWith('_'));
  const textLines = entries.map(([k, v]) => `${k}: ${v}`);
  const htmlLines = entries.map(([k, v]) => `<p><strong>${k}:</strong> ${String(v)}</p>`);
  return {
    text: `You received a new message from the website contact form.\n\n${textLines.join('\n')}`,
    html: `<div><p>You received a new message from the website contact form.</p>${htmlLines.join('')}</div>`,
  };
}

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};

    // Basic validation: require at least one of name/email/message or other useful fields
    if (!Object.keys(body).length) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }

    const { text, html } = buildMessageFromBody(body);

    // Persist the contact form to the database (contact_form table)
    let dbResult = { ok: false };
    try {
      const name = body.name || null;
      const email = body.email || null;
      // prefer 'message' or 'text' fields for the stored message
      const messageText = body.message || body.text || '';
      const insertPayload = { name, email, text: messageText };
      const { data: insertData, error: insertError } = await supabase.from('contact_form').insert([insertPayload]).select();
      if (insertError) {
        console.error('Supabase insert error for contact_form:', insertError);
        dbResult = { ok: false, error: insertError };
      } else {
        dbResult = { ok: true, data: insertData };
      }
    } catch (dbErr) {
      console.error('Exception while inserting contact_form:', dbErr);
      dbResult = { ok: false, error: String(dbErr) };
    }

    // Use Formsubmit.co to send the email (server-side)
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
          // Formsubmit checks referer/origin; set them to your frontend origin
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
        // not JSON
        fetchData = { raw: fetchText };
      }

      // Log detailed response for debugging delivery issues
      console.log('Formsubmit response status:', fetchRes.status);
      console.log('Formsubmit response body:', fetchData);

      if (!fetchRes.ok) {
        console.error('Formsubmit send error', fetchData);
        return res.status(502).json({ ok: false, error: 'Failed to send via Formsubmit', details: fetchData, db: dbResult });
      }
      // Return both DB result and Formsubmit provider response
      return res.json({ ok: true, info: fetchData, status: fetchRes.status, db: dbResult });
    } catch (sendErr) {
      console.error('Formsubmit send exception', sendErr);
      return res.status(500).json({ ok: false, error: 'Failed to send email' });
    }
  } catch (err) {
    console.error('Error sending contact email', err);
    return res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
});

module.exports = router;
