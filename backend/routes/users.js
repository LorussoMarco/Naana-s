const express = require('express');
const supabase = require('../supabaseClient');
const bcrypt = require('bcryptjs');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Safe fields — NEVER return password hashes
const SAFE_USER_FIELDS = 'id, email, created_at';

// ALL user routes require authentication
router.use(verifyToken);

// List users
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select(SAFE_USER_FIELDS).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single user (safe fields only)
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('users').select(SAFE_USER_FIELDS).eq('id', id).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create user with hashed password (admin-only)
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password richieste' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato email non valido' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri' });
    }

    // Check existing user
    const { data: existing, error: selErr } = await supabase.from('users').select('id').eq('email', email).limit(1);
    if (selErr) return res.status(500).json({ error: selErr.message });
    if (existing && existing.length > 0) return res.status(409).json({ error: 'Email già registrata' });

    const hashed = await bcrypt.hash(password, 12);
    // Whitelist: only email + hashed password
    const toInsert = { email, password: hashed };
    const { data, error } = await supabase.from('users').insert([toInsert]).select(SAFE_USER_FIELDS).single();
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update user (only own account, whitelist fields)
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    // Users can only update their own account
    if (String(req.user.id) !== String(id)) {
      return res.status(403).json({ error: 'Non puoi modificare un altro utente' });
    }

    const { email, password } = req.body || {};
    const updatePayload = {};

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato email non valido' });
      }
      updatePayload.email = email;
    }
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri' });
      }
      updatePayload.password = await bcrypt.hash(password, 12);
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }

    const { data, error } = await supabase.from('users').update(updatePayload).eq('id', id).select(SAFE_USER_FIELDS).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete user (only own account)
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    if (String(req.user.id) !== String(id)) {
      return res.status(403).json({ error: 'Non puoi eliminare un altro utente' });
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
