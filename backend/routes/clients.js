const express = require('express');
const supabase = require('../supabaseClient');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Whitelist of allowed client fields
const CLIENT_ALLOWED_FIELDS = ['first_name', 'last_name', 'email', 'phone_number'];

function pickAllowed(obj, allowedKeys) {
  const result = {};
  for (const key of allowedKeys) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}

// ─── PROTECTED routes (admin only) ──────────────────────────

// List clients
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single client
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PUBLIC route (customer creation from order stepper) ────

// Create client (whitelisted fields only)
router.post('/', async (req, res) => {
  try {
    const safePayload = pickAllowed(req.body || {}, CLIENT_ALLOWED_FIELDS);

    if (!safePayload.first_name || !safePayload.last_name) {
      return res.status(400).json({ error: 'Nome e cognome richiesti' });
    }

    const { data, error } = await supabase.from('clients').insert([safePayload]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PROTECTED routes (admin only) ──────────────────────────

// Update client (whitelisted fields)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const safePayload = pickAllowed(req.body || {}, CLIENT_ALLOWED_FIELDS);

    if (Object.keys(safePayload).length === 0) {
      return res.status(400).json({ error: 'Nessun campo valido da aggiornare' });
    }

    const { data, error } = await supabase.from('clients').update(safePayload).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete client
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
