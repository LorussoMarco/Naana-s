const express = require('express');
const supabase = require('../supabaseClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// In-memory token blacklist (in production, usare Redis)
const tokenBlacklist = new Set();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password richieste' });
    }

    const { data, error } = await supabase.from('users').select('*').eq('email', email).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = data[0];
    const match = await bcrypt.compare(password, user.password || '');
    if (!match) return res.status(401).json({ error: 'Credenziali non valide' });

    const secret = process.env.JWT_SECRET;
    const refreshSecret = process.env.REFRESH_SECRET || secret;
    if (!secret) return res.status(500).json({ error: 'JWT secret non configurato' });

    // Generate access token (1 hour)
    const payload = { id: user.id, email: user.email, type: 'access' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });

    // Generate refresh token (7 days)
    const refreshPayload = { id: user.id, email: user.email, type: 'refresh' };
    const refreshToken = jwt.sign(refreshPayload, refreshSecret, { expiresIn: '7d' });

    // Log security event
    console.log(`[AUTH] User logged in: ${user.email} at ${new Date().toISOString()}`);

    res.json({
      token,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      user: { id: user.id, email: user.email }
    });
  } catch (e) {
    console.error('[AUTH] Login error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token richiesto' });
    }

    if (tokenBlacklist.has(refreshToken)) {
      return res.status(401).json({ error: 'Token invalidato' });
    }

    const secret = process.env.JWT_SECRET;
    const refreshSecret = process.env.REFRESH_SECRET || secret;
    if (!secret) return res.status(500).json({ error: 'JWT secret non configurato' });

    try {
      const decoded = jwt.verify(refreshToken, refreshSecret);

      if (decoded.type !== 'refresh') {
        return res.status(401).json({ error: 'Token non valido' });
      }

      // Generate new access token
      const newPayload = { id: decoded.id, email: decoded.email, type: 'access' };
      const newToken = jwt.sign(newPayload, secret, { expiresIn: '1h' });

      console.log(`[AUTH] Token refreshed for user: ${decoded.email}`);

      res.json({
        token: newToken,
        expiresIn: 3600
      });
    } catch (e) {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }
  } catch (e) {
    console.error('[AUTH] Refresh error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      tokenBlacklist.add(token);
      // In production: set expiry for cleanup after token lifetime
      setTimeout(() => tokenBlacklist.delete(token), 24 * 60 * 60 * 1000);
    }

    console.log(`[AUTH] User logged out: ${req.user?.email} at ${new Date().toISOString()}`);

    res.json({ ok: true });
  } catch (e) {
    console.error('[AUTH] Logout error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
