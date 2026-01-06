const express = require('express');
const supabase = require('../supabaseClient');
const router = express.Router();

// Helper: attach client data to orders
async function attachClientsToOrders(orders) {
  const clientIds = Array.from(new Set((orders || []).map(o => o.client).filter(Boolean)));
  if (clientIds.length === 0) return orders;
  const { data: clients, error } = await supabase.from('clients').select('*').in('id', clientIds);
  if (error) throw new Error(error.message);
  const clientMap = new Map((clients || []).map(c => [c.id, c]));
  return (orders || []).map(o => ({ ...o, client_info: clientMap.get(o.client) || null }));
}

// List orders
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const withClients = await attachClientsToOrders(data || []);
    res.json(withClients);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single order (with client info)
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = data[0];
    const { data: clientData } = await supabase.from('clients').select('*').eq('id', order.client).limit(1);
    order.client_info = (clientData && clientData[0]) || null;
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create order
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    // If payload.client is an object (new client), create it first
    if (payload.client && typeof payload.client === 'object' && !payload.client.id) {
      const { data: newClient, error: cErr } = await supabase.from('clients').insert([payload.client]).select().single();
      if (cErr) return res.status(500).json({ error: cErr.message });
      payload.client = newClient.id;
    }
    const { data, error } = await supabase.from('orders').insert([payload]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    // attach client info
    const { data: clientData } = await supabase.from('clients').select('*').eq('id', data.client).limit(1);
    const result = { ...data, client_info: clientData && clientData[0] ? clientData[0] : null };
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update order
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    // allow updating client via object
    if (payload.client && typeof payload.client === 'object' && !payload.client.id) {
      const { data: newClient, error: cErr } = await supabase.from('clients').insert([payload.client]).select().single();
      if (cErr) return res.status(500).json({ error: cErr.message });
      payload.client = newClient.id;
    }
    const { data, error } = await supabase.from('orders').update(payload).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    const { data: clientData } = await supabase.from('clients').select('*').eq('id', data.client).limit(1);
    res.json({ ...data, client_info: clientData && clientData[0] ? clientData[0] : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
