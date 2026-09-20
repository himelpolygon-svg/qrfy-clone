const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

router.post('/signup', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name.trim(), email.toLowerCase().trim(), hash);

  // Seed a default folder
  db.prepare('INSERT INTO folders (user_id, name) VALUES (?, ?)').run(info.lastInsertRowid, 'My QR Codes');

  req.session.userId = info.lastInsertRowid;
  const user = db.prepare('SELECT id, name, email, plan, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.json({ user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  req.session.userId = user.id;
  res.json({ user: { id: user.id, name: user.name, email: user.email, plan: user.plan, created_at: user.created_at } });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('qrfy.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

module.exports = router;
