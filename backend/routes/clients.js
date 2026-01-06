const express = require('express');
const supabase = require('../supabaseClient');
const router = express.Router();

// List clients
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single client
router.get('/:id', async (req, res) => {
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

// Create client
router.post('/', async (req, res) => {
  try {
    const payload = req.body; // expect first_name, last_name, email, phone_number
    const { data, error } = await supabase.from('clients').insert([payload]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    const { data, error } = await supabase.from('clients').update(payload).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
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
