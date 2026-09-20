const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { buildStaticValue } = require('../lib/encode');
const { QR_TYPES, getType } = require('../lib/qrTypes');

const router = express.Router();

router.get('/qr-types', (req, res) => {
  res.json({ types: QR_TYPES });
});

function serialize(row) {
  return {
    ...row,
    content: JSON.parse(row.content_json),
    style: JSON.parse(row.style_json),
    content_json: undefined,
    style_json: undefined,
  };
}

// List current user's QR codes (optionally filtered by folder / search / type)
router.get('/qrcodes', requireAuth, (req, res) => {
  const { folderId, q, type } = req.query;
  let sql = 'SELECT * FROM qrcodes WHERE user_id = ?';
  const params = [req.user.id];
  if (folderId) { sql += ' AND folder_id = ?'; params.push(folderId); }
  if (type) { sql += ' AND qr_type = ?'; params.push(type); }
  if (q) { sql += ' AND title LIKE ?'; params.push(`%${q}%`); }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  const withCounts = rows.map((r) => {
    const scanCount = db.prepare('SELECT COUNT(*) c FROM scans WHERE qrcode_id = ?').get(r.id).c;
    return { ...serialize(r), scanCount };
  });
  res.json({ qrcodes: withCounts });
});

router.get('/qrcodes/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM qrcodes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const scanCount = db.prepare('SELECT COUNT(*) c FROM scans WHERE qrcode_id = ?').get(row.id).c;
  res.json({ qrcode: { ...serialize(row), scanCount } });
});

router.post('/qrcodes', requireAuth, (req, res) => {
  const { title, qrType, mode, content, style, folderId } = req.body || {};
  const typeDef = getType(qrType);
  if (!typeDef) return res.status(400).json({ error: 'Unknown QR type.' });
  if (!title) return res.status(400).json({ error: 'A title is required.' });

  const encodedValue = buildStaticValue(qrType, content || {});
  const shortCode = mode === 'dynamic' ? nanoid(8) : null;

  const info = db.prepare(`
    INSERT INTO qrcodes (user_id, folder_id, title, qr_type, mode, content_json, encoded_value, style_json, short_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    folderId || null,
    title,
    qrType,
    mode === 'dynamic' ? 'dynamic' : 'static',
    JSON.stringify(content || {}),
    encodedValue,
    JSON.stringify(style || {}),
    shortCode
  );
  const row = db.prepare('SELECT * FROM qrcodes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ qrcode: { ...serialize(row), scanCount: 0 } });
});

router.put('/qrcodes/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM qrcodes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { title, content, style, folderId, active } = req.body || {};

  const newContent = content !== undefined ? content : JSON.parse(existing.content_json);
  const newStyle = style !== undefined ? style : JSON.parse(existing.style_json);
  const encodedValue = buildStaticValue(existing.qr_type, newContent);

  db.prepare(`
    UPDATE qrcodes SET title = ?, content_json = ?, encoded_value = ?, style_json = ?, folder_id = ?, active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title !== undefined ? title : existing.title,
    JSON.stringify(newContent),
    encodedValue,
    JSON.stringify(newStyle),
    folderId !== undefined ? folderId : existing.folder_id,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    existing.id
  );
  const row = db.prepare('SELECT * FROM qrcodes WHERE id = ?').get(existing.id);
  const scanCount = db.prepare('SELECT COUNT(*) c FROM scans WHERE qrcode_id = ?').get(row.id).c;
  res.json({ qrcode: { ...serialize(row), scanCount } });
});

router.delete('/qrcodes/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id FROM qrcodes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM qrcodes WHERE id = ?').run(existing.id);
  res.json({ ok: true });
});

// ---- Folders ----
router.get('/folders', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id);
  const withCounts = rows.map((f) => ({
    ...f,
    count: db.prepare('SELECT COUNT(*) c FROM qrcodes WHERE folder_id = ?').get(f.id).c,
  }));
  res.json({ folders: withCounts });
});

router.post('/folders', requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Folder name required.' });
  const info = db.prepare('INSERT INTO folders (user_id, name) VALUES (?, ?)').run(req.user.id, name);
  res.status(201).json({ folder: db.prepare('SELECT * FROM folders WHERE id = ?').get(info.lastInsertRowid) });
});

router.delete('/folders/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE qrcodes SET folder_id = NULL WHERE folder_id = ?').run(existing.id);
  db.prepare('DELETE FROM folders WHERE id = ?').run(existing.id);
  res.json({ ok: true });
});

module.exports = router;
