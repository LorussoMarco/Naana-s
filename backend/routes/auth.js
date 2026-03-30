const express = require('express');
const crypto = require('crypto');
const supabase = require('../supabaseClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const REFRESH_COOKIE_NAME = 'refresh_token';

function getRefreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

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
const LOGIN_LOCK_BASE_MS = 5 * 60 * 1000; // 5 minutes
const LOGIN_LOCK_MAX_MS = 60 * 60 * 1000; // 60 minutes
const loginRateLimitStore = new Map();

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return 'unknown-email';
  return email.trim().toLowerCase();
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function securityLog(event, req, details = {}) {
  const payload = {
    event,
    path: req.originalUrl || req.url,
    method: req.method,
    ip: getClientIp(req),
    ...details,
  };
  console.warn('[SECURITY]', JSON.stringify(payload));
}

function checkLoginRateLimit(key) {
  const now = Date.now();
  const entry = loginRateLimitStore.get(key);

  if (entry && entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfterMs = entry.blockedUntil - now;
    return { limited: true, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }

  if (!entry || now - entry.windowStart > LOGIN_RATE_LIMIT_WINDOW) {
    loginRateLimitStore.set(key, {
      windowStart: now,
      count: 1,
      strikes: entry?.strikes || 0,
      blockedUntil: 0,
    });
    return { limited: false, retryAfterSec: 0 };
  }

  entry.count++;

  if (entry.count > LOGIN_RATE_LIMIT_MAX) {
    entry.strikes = (entry.strikes || 0) + 1;
    const lockMs = Math.min(LOGIN_LOCK_BASE_MS * Math.pow(2, entry.strikes - 1), LOGIN_LOCK_MAX_MS);
    entry.blockedUntil = now + lockMs;
    entry.windowStart = now;
    entry.count = 0;
    return { limited: true, retryAfterSec: Math.ceil(lockMs / 1000) };
  }

  const limited = false;
  const retryAfterMs = Math.max(0, LOGIN_RATE_LIMIT_WINDOW - (now - entry.windowStart));
  return { limited, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
}

// Cleanup stale entries every 30 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginRateLimitStore) {
    if (!entry.blockedUntil && now - entry.windowStart > LOGIN_RATE_LIMIT_WINDOW) {
      loginRateLimitStore.delete(key);
    }
    if (entry.blockedUntil && now > entry.blockedUntil + LOGIN_RATE_LIMIT_WINDOW) {
      loginRateLimitStore.delete(key);
    }
  }
}, 30 * 60 * 1000);

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password richieste' });
    }

    // Rate limiting keyed by IP + email to reduce lockout collisions.
    const clientIp = getClientIp(req);
    const rateLimitKey = `${clientIp}:${normalizeEmail(email)}`;
    const rateLimitResult = checkLoginRateLimit(rateLimitKey);
    if (rateLimitResult.limited) {
      securityLog('login_rate_limited', req, {
        email: normalizeEmail(email),
        retryAfterSec: rateLimitResult.retryAfterSec,
      });
      res.setHeader('Retry-After', String(rateLimitResult.retryAfterSec));
      return res.status(429).json({ error: 'Troppi tentativi. Riprova tra qualche minuto.' });
    }

    const { data, error } = await supabase.from('users').select('*').eq('email', email).limit(1);
    if (error) return res.status(500).json({ error: 'Errore interno' });
    if (!data || data.length === 0) {
      securityLog('login_invalid_credentials', req, { email: normalizeEmail(email), reason: 'user_not_found' });
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = data[0];
    const match = await bcrypt.compare(password, user.password || '');
    if (!match) {
      securityLog('login_invalid_credentials', req, { email: normalizeEmail(email), reason: 'password_mismatch' });
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const secret = process.env.JWT_SECRET;
    const refreshSecret = process.env.REFRESH_SECRET || secret;
    if (!secret) return res.status(500).json({ error: 'JWT secret non configurato' });

    // Generate access token (1 hour)
    const payload = { id: user.id, email: user.email, type: 'access' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });

    // Generate refresh token (7 days)
    const refreshPayload = { id: user.id, email: user.email, type: 'refresh' };
    const refreshToken = jwt.sign(refreshPayload, refreshSecret, { expiresIn: '7d' });

    // Keep refresh token in an HttpOnly cookie to reduce exposure to XSS.
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    // Reset rate-limit counter after successful authentication.
    loginRateLimitStore.delete(rateLimitKey);

    console.log(`[AUTH] User logged in: ${user.email} at ${new Date().toISOString()}`);

    res.json({
      token,
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
    const bodyRefreshToken = req.body?.refreshToken;
    const cookieRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const refreshToken = cookieRefreshToken || bodyRefreshToken;
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
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    // Blacklist access token (expires in 1h)
    if (token) {
      await blacklistToken(token, Date.now() + 60 * 60 * 1000);
    }

    // Blacklist refresh token (expires in 7d)
    if (refreshToken) {
      await blacklistToken(refreshToken, Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());

    console.log(`[AUTH] User logged out: ${req.user?.email} at ${new Date().toISOString()}`);

    res.json({ ok: true });
  } catch (e) {
    console.error('[AUTH] Logout error:', e.message);
    res.status(500).json({ error: 'Errore interno' });
  }
});

module.exports = router;
