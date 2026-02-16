const express = require('express');
const supabase = require('../supabaseClient');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Whitelist of allowed fields for order creation / update
const ORDER_ALLOWED_FIELDS = [
  'client', 'event_type', 'num_people', 'max_budget',
  'date', 'message', 'street', 'city', 'postal_code',
  'delivery_type', 'status'
];

// Whitelist of allowed fields for inline client creation
const CLIENT_ALLOWED_FIELDS = ['first_name', 'last_name', 'email', 'phone_number'];

function pickAllowed(obj, allowedKeys) {
  const result = {};
  for (const key of allowedKeys) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}

// Helper: attach client data to orders (safe fields only)
async function attachClientsToOrders(orders) {
  const clientIds = Array.from(new Set((orders || []).map(o => o.client).filter(Boolean)));
  if (clientIds.length === 0) return orders;
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, phone_number')
    .in('id', clientIds);
  if (error) throw new Error(error.message);
  const clientMap = new Map((clients || []).map(c => [c.id, c]));
  return (orders || []).map(o => ({ ...o, client_info: clientMap.get(o.client) || null }));
}

// ─── PROTECTED routes (admin only) ──────────────────────────

// List orders
router.get('/', verifyToken, async (req, res) => {
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
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = data[0];
    const { data: clientData } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone_number')
      .eq('id', order.client)
      .limit(1);
    order.client_info = (clientData && clientData[0]) || null;
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PUBLIC route (customer order from homepage stepper) ────

// Create order
router.post('/', async (req, res) => {
  try {
    let payload = req.body || {};

    // If payload.client is an object (new client), create it first — whitelisted fields only
    if (payload.client && typeof payload.client === 'object' && !payload.client.id) {
      const safeClient = pickAllowed(payload.client, CLIENT_ALLOWED_FIELDS);
      const { data: newClient, error: cErr } = await supabase.from('clients').insert([safeClient]).select().single();
      if (cErr) return res.status(500).json({ error: cErr.message });
      payload = { ...payload, client: newClient.id };
    }

    // Whitelist order fields
    const safeOrder = pickAllowed(payload, ORDER_ALLOWED_FIELDS);
    const { data, error } = await supabase.from('orders').insert([safeOrder]).select().single();
    if (error) return res.status(500).json({ error: error.message });

    // attach client info
    const { data: clientData } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone_number')
      .eq('id', data.client)
      .limit(1);
    const result = { ...data, client_info: clientData && clientData[0] ? clientData[0] : null };
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PROTECTED routes (admin only) ──────────────────────────

// Update order
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    let payload = req.body || {};

    // allow updating client via object
    if (payload.client && typeof payload.client === 'object' && !payload.client.id) {
      const safeClient = pickAllowed(payload.client, CLIENT_ALLOWED_FIELDS);
      const { data: newClient, error: cErr } = await supabase.from('clients').insert([safeClient]).select().single();
      if (cErr) return res.status(500).json({ error: cErr.message });
      payload = { ...payload, client: newClient.id };
    }

    const safeOrder = pickAllowed(payload, ORDER_ALLOWED_FIELDS);
    const { data, error } = await supabase.from('orders').update(safeOrder).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    const { data: clientData } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone_number')
      .eq('id', data.client)
      .limit(1);
    res.json({ ...data, client_info: clientData && clientData[0] ? clientData[0] : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete order
router.delete('/:id', verifyToken, async (req, res) => {
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
