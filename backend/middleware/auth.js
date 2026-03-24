const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../supabaseClient');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function verifyToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Token mancante' });
  const token = parts[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'JWT secret non configurato' });

  try {
    // Check persistent blacklist
    const tokenHash = hashToken(token);
    const { data } = await supabase
      .from('token_blacklist')
      .select('token_hash')
      .eq('token_hash', tokenHash)
      .limit(1);
    if (data && data.length > 0) {
      return res.status(401).json({ error: 'Token invalidato' });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token non valido' });
  }
}

module.exports = { verifyToken };
