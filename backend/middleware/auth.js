const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../supabaseClient');

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
    userEmail: String(req.user?.email || '').toLowerCase() || null,
    ...details,
  };
  console.warn('[SECURITY]', JSON.stringify(payload));
}

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function verifyToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    securityLog('auth_missing_bearer', req);
    return res.status(401).json({ error: 'Token mancante' });
  }
  const token = parts[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    securityLog('auth_server_misconfigured', req, { reason: 'missing_jwt_secret' });
    return res.status(500).json({ error: 'JWT secret non configurato' });
  }

  try {
    // Check persistent blacklist
    const tokenHash = hashToken(token);
    const { data } = await supabase
      .from('token_blacklist')
      .select('token_hash')
      .eq('token_hash', tokenHash)
      .limit(1);
    if (data && data.length > 0) {
      securityLog('auth_token_blacklisted', req);
      return res.status(401).json({ error: 'Token invalidato' });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (e) {
    securityLog('auth_token_invalid', req, { reason: e.message || 'verify_failed' });
    return res.status(401).json({ error: 'Token non valido' });
  }
}

function requireAdmin(req, res, next) {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) {
    securityLog('admin_check_misconfigured', req, { reason: 'missing_admin_emails' });
    return res.status(500).json({ error: 'ADMIN_EMAILS non configurato' });
  }

  const userEmail = String(req.user?.email || '').trim().toLowerCase();
  if (!userEmail || !adminEmails.includes(userEmail)) {
    securityLog('admin_access_denied', req, { attemptedEmail: userEmail || null });
    return res.status(403).json({ error: 'Accesso admin richiesto' });
  }

  next();
}

module.exports = { verifyToken, requireAdmin };
