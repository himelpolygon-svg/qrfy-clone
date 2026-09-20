const db = require('../db');

function attachUser(req, res, next) {
  req.user = null;
  if (req.session && req.session.userId) {
    const user = db.prepare('SELECT id, name, email, plan, created_at FROM users WHERE id = ?').get(req.session.userId);
    if (user) req.user = user;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

module.exports = { attachUser, requireAuth };
