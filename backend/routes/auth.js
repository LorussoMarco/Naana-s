const express = require('express');
const crypto = require('crypto');
const supabase = require('../supabaseClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// ─── Persistent token blacklist (Supabase) ────────────────
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function blacklistToken(token, expiresAt) {
  const tokenHash = hashToken(token);
  try {
    await supabase.from('token_blacklist').insert([{
      token_hash: tokenHash,
      expires_at: new Date(expiresAt).toISOString()
    }]);
  } catch (e) {
    console.error('[AUTH] Failed to blacklist token:', e.message);
  }
}

async function isTokenBlacklisted(token) {
  const tokenHash = hashToken(token);
  try {
    const { data } = await supabase
      .from('token_blacklist')
      .select('token_hash')
      .eq('token_hash', tokenHash)
      .limit(1);
    return data && data.length > 0;
  } catch (e) {
    console.error('[AUTH] Blacklist check error:', e.message);
    return false;
  }
}

// Cleanup expired entries every hour
setInterval(async () => {
  try {
    await supabase
      .from('token_blacklist')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (e) {
    console.error('[AUTH] Blacklist cleanup error:', e.message);
  }
}, 60 * 60 * 1000);

// ─── Login rate limiting ──────────────────────────────────
const LOGIN_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const LOGIN_RATE_LIMIT_MAX = 5;
const loginRateLimitStore = new Map();

function isLoginRateLimited(ip) {
  const now = Date.now();
  const entry = loginRateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > LOGIN_RATE_LIMIT_WINDOW) {
    loginRateLimitStore.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > LOGIN_RATE_LIMIT_MAX;
}

// Cleanup stale entries every 30 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginRateLimitStore) {
    if (now - entry.windowStart > LOGIN_RATE_LIMIT_WINDOW) loginRateLimitStore.delete(ip);
  }
}, 30 * 60 * 1000);

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // Rate limiting
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    if (isLoginRateLimited(clientIp)) {
      return res.status(429).json({ error: 'Troppi tentativi. Riprova tra qualche minuto.' });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password richieste' });
    }

    const { data, error } = await supabase.from('users').select('*').eq('email', email).limit(1);
    if (error) return res.status(500).json({ error: 'Errore interno' });
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

    console.log(`[AUTH] User logged in: ${user.email} at ${new Date().toISOString()}`);

    res.json({
      token,
      refreshToken,
      expiresIn: 3600,
      user: { id: user.id, email: user.email }
    });
  } catch (e) {
    console.error('[AUTH] Login error:', e.message);
    res.status(500).json({ error: 'Errore interno' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token richiesto' });
    }

    if (await isTokenBlacklisted(refreshToken)) {
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
    res.status(500).json({ error: 'Errore interno' });
  }
});

// POST /api/auth/logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { refreshToken } = req.body || {};

    // Blacklist access token (expires in 1h)
    if (token) {
      await blacklistToken(token, Date.now() + 60 * 60 * 1000);
    }

    // Blacklist refresh token (expires in 7d)
    if (refreshToken) {
      await blacklistToken(refreshToken, Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    console.log(`[AUTH] User logged out: ${req.user?.email} at ${new Date().toISOString()}`);

    res.json({ ok: true });
  } catch (e) {
    console.error('[AUTH] Logout error:', e.message);
    res.status(500).json({ error: 'Errore interno' });
  }
});

module.exports = router;
