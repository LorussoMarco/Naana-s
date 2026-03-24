const express = require('express');
const supabase = require('../supabaseClient');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// ─── Rate limiting for review submissions ───────────────────
const REVIEW_RATE_WINDOW = 60 * 60 * 1000; // 1 hour
const REVIEW_RATE_MAX = 3; // max 3 reviews per IP per hour
const reviewRateLimitStore = new Map();

function isReviewRateLimited(ip) {
  const now = Date.now();
  const entry = reviewRateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > REVIEW_RATE_WINDOW) {
    reviewRateLimitStore.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > REVIEW_RATE_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of reviewRateLimitStore) {
    if (now - entry.windowStart > REVIEW_RATE_WINDOW) reviewRateLimitStore.delete(ip);
  }
}, 30 * 60 * 1000);

// Allowed fields for review creation
const REVIEW_ALLOWED_FIELDS = ['order_id', 'name', 'event_type', 'rating', 'text'];

function sanitizeText(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .slice(0, 500);
}

// ─── PUBLIC: Get approved reviews ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, name, event_type, rating, text, created_at')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: 'Errore interno' });
  }
});

// ─── PUBLIC: Submit a review ────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    if (isReviewRateLimited(clientIp)) {
      return res.status(429).json({ error: 'Troppe richieste. Riprova più tardi.' });
    }

    const body = req.body || {};

    // Validate required fields
    if (!body.name || !body.text || !body.rating) {
      return res.status(400).json({ error: 'Nome, testo e valutazione sono obbligatori' });
    }

    const rating = parseInt(body.rating, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La valutazione deve essere tra 1 e 5' });
    }

    const name = sanitizeText(body.name).slice(0, 100);
    const text = sanitizeText(body.text);
    const eventType = body.event_type ? sanitizeText(body.event_type).slice(0, 100) : null;
    const orderId = body.order_id ? parseInt(body.order_id, 10) : null;

    // Check for duplicate review per order
    if (orderId) {
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', orderId)
        .limit(1);
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'Una review per questo ordine esiste già' });
      }
    }

    const insertPayload = {
      name,
      text,
      rating,
      event_type: eventType,
      order_id: orderId,
      approved: false,
    };

    const { data, error } = await supabase.from('reviews').insert([insertPayload]).select().single();
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: 'Errore interno' });
  }
});

// ─── PROTECTED: Get all reviews (admin) ─────────────────────
router.get('/all', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: 'Errore interno' });
  }
});

// ─── PROTECTED: Approve/reject review ───────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { approved } = req.body || {};
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'Campo "approved" (boolean) richiesto' });
    }
    const { data, error } = await supabase
      .from('reviews')
      .update({ approved })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Errore interno' });
  }
});

// ─── PROTECTED: Delete review ───────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Errore interno' });
  }
});

module.exports = router;
