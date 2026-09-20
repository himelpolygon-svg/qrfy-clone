const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function ownedQrIds(userId) {
  return db.prepare('SELECT id FROM qrcodes WHERE user_id = ?').all(userId).map((r) => r.id);
}

// Account-wide overview: totals + scans/day for the last 30 days + breakdowns.
router.get('/analytics/overview', requireAuth, (req, res) => {
  const ids = ownedQrIds(req.user.id);
  if (ids.length === 0) {
    return res.json({ totalScans: 0, totalCodes: 0, dynamicCodes: 0, series: [], byDevice: [], byBrowser: [], byCountry: [], topCodes: [] });
  }
  const placeholders = ids.map(() => '?').join(',');

  const totalScans = db.prepare(`SELECT COUNT(*) c FROM scans WHERE qrcode_id IN (${placeholders})`).get(...ids).c;
  const totalCodes = ids.length;
  const dynamicCodes = db.prepare(`SELECT COUNT(*) c FROM qrcodes WHERE user_id = ? AND mode = 'dynamic'`).get(req.user.id).c;

  const series = db.prepare(`
    SELECT date(scanned_at) day, COUNT(*) count
    FROM scans WHERE qrcode_id IN (${placeholders}) AND scanned_at >= datetime('now', '-30 days')
    GROUP BY day ORDER BY day ASC
  `).all(...ids);

  const byDevice = db.prepare(`
    SELECT COALESCE(device, 'desktop') device, COUNT(*) count FROM scans
    WHERE qrcode_id IN (${placeholders}) GROUP BY device ORDER BY count DESC
  `).all(...ids);

  const byBrowser = db.prepare(`
    SELECT COALESCE(browser, 'Unknown') browser, COUNT(*) count FROM scans
    WHERE qrcode_id IN (${placeholders}) GROUP BY browser ORDER BY count DESC LIMIT 8
  `).all(...ids);

  const byCountry = db.prepare(`
    SELECT COALESCE(NULLIF(country, ''), 'Unknown') country, COUNT(*) count FROM scans
    WHERE qrcode_id IN (${placeholders}) GROUP BY country ORDER BY count DESC LIMIT 10
  `).all(...ids);

  const topCodes = db.prepare(`
    SELECT q.id, q.title, q.qr_type, COUNT(s.id) scanCount
    FROM qrcodes q LEFT JOIN scans s ON s.qrcode_id = q.id
    WHERE q.user_id = ? GROUP BY q.id ORDER BY scanCount DESC LIMIT 5
  `).all(req.user.id);

  res.json({ totalScans, totalCodes, dynamicCodes, series, byDevice, byBrowser, byCountry, topCodes });
});

// Per-code analytics
router.get('/analytics/qrcodes/:id', requireAuth, (req, res) => {
  const qrcode = db.prepare('SELECT * FROM qrcodes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!qrcode) return res.status(404).json({ error: 'Not found' });

  const totalScans = db.prepare('SELECT COUNT(*) c FROM scans WHERE qrcode_id = ?').get(qrcode.id).c;
  const series = db.prepare(`
    SELECT date(scanned_at) day, COUNT(*) count FROM scans
    WHERE qrcode_id = ? AND scanned_at >= datetime('now', '-30 days') GROUP BY day ORDER BY day ASC
  `).all(qrcode.id);
  const byDevice = db.prepare(`SELECT COALESCE(device,'desktop') device, COUNT(*) count FROM scans WHERE qrcode_id = ? GROUP BY device`).all(qrcode.id);
  const byBrowser = db.prepare(`SELECT COALESCE(browser,'Unknown') browser, COUNT(*) count FROM scans WHERE qrcode_id = ? GROUP BY browser ORDER BY count DESC LIMIT 8`).all(qrcode.id);
  const byCountry = db.prepare(`SELECT COALESCE(NULLIF(country,''),'Unknown') country, COUNT(*) count FROM scans WHERE qrcode_id = ? GROUP BY country ORDER BY count DESC LIMIT 10`).all(qrcode.id);
  const recent = db.prepare(`SELECT scanned_at, country, city, device, browser, os FROM scans WHERE qrcode_id = ? ORDER BY scanned_at DESC LIMIT 25`).all(qrcode.id);

  let feedback = [];
  if (qrcode.qr_type === 'feedback') {
    feedback = db.prepare('SELECT answers_json, submitted_at FROM feedback_responses WHERE qrcode_id = ? ORDER BY submitted_at DESC').all(qrcode.id)
      .map((r) => ({ answers: JSON.parse(r.answers_json), submitted_at: r.submitted_at }));
  }

  res.json({ totalScans, series, byDevice, byBrowser, byCountry, recent, feedback });
});

module.exports = router;
