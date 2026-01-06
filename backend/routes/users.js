const express = require('express');
const supabase = require('../supabaseClient');
const bcrypt = require('bcryptjs');
const router = express.Router();

// List users (email + created_at) — minimal fields per new schema
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('id, email, created_at').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('users').select('*').eq('id', id).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create user with hashed password
router.post('/', async (req, res) => {
  try {
    const payload = req.body; // expect { email, password }
    if (!payload || !payload.email || !payload.password) {
      return res.status(400).json({ error: 'Email e password richieste' });
    }

    // check existing user
    const { data: existing, error: selErr } = await supabase.from('users').select('id').eq('email', payload.email).limit(1);
    if (selErr) return res.status(500).json({ error: selErr.message });
    if (existing && existing.length > 0) return res.status(409).json({ error: 'Email già registrata' });

    const hashed = await bcrypt.hash(payload.password, 12);
    const toInsert = { ...payload, password: hashed };
    const { data, error } = await supabase.from('users').insert([toInsert]).select().single();
    if (error) return res.status(500).json({ error: error.message });

    // do not return password to client
    if (data && data.password) delete data.password;
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    const { data, error } = await supabase.from('users').update(payload).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
