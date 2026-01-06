const express = require('express');
const supabase = require('../supabaseClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email e password richieste' });

    const { data, error } = await supabase.from('users').select('*').eq('email', email).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(401).json({ error: 'Credenziali non valide' });

    const user = data[0];
    const match = await bcrypt.compare(password, user.password || '');
    if (!match) return res.status(401).json({ error: 'Credenziali non valide' });

    const payload = { id: user.id, email: user.email };
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT secret non configurato' });

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });

    // do not send back password
    delete user.password;

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
