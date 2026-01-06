const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Token mancante' });
  const token = parts[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'JWT secret non configurato' });

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token non valido' });
  }
}

module.exports = { verifyToken };
