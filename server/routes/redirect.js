const express = require('express');
const db = require('../db');
const { logScan } = require('../lib/tracker');
const { renderLandingPage, directRedirectUrl } = require('../lib/landing');
const { buildVCard, buildICS } = require('../lib/encode');

const router = express.Router();

function getActiveQr(shortCode, res) {
  const qrcode = db.prepare('SELECT * FROM qrcodes WHERE short_code = ?').get(shortCode);
  if (!qrcode) { res.status(404).send('QR code not found.'); return null; }
  if (!qrcode.active) { res.status(410).send('This QR code has been paused by its owner.'); return null; }
  return qrcode;
}

// Direct downloads for vCard / calendar event (kept separate from the tracked hit
// on /r/:code so "Save contact" / "Add to calendar" don't double count).
router.get('/r/:code/vcard.vcf', (req, res) => {
  const qrcode = getActiveQr(req.params.code, res);
  if (!qrcode) return;
  const content = JSON.parse(qrcode.content_json);
  res.set('Content-Type', 'text/vcard').set('Content-Disposition', 'attachment; filename="contact.vcf"');
  res.send(buildVCard(content, qrcode.qr_type === 'vcard-plus'));
});

router.get('/r/:code/event.ics', (req, res) => {
  const qrcode = getActiveQr(req.params.code, res);
  if (!qrcode) return;
  const content = JSON.parse(qrcode.content_json);
  res.set('Content-Type', 'text/calendar').set('Content-Disposition', 'attachment; filename="event.ics"');
  res.send(buildICS(content));
});

// The URL every DYNAMIC QR code actually encodes.
router.get('/r/:code', (req, res) => {
  const qrcode = getActiveQr(req.params.code, res);
  if (!qrcode) return;

  logScan(qrcode.id, req);

  const content = JSON.parse(qrcode.content_json);
  const redirectUrl = directRedirectUrl(qrcode.qr_type, content, req.headers['user-agent'] || '');
  if (redirectUrl) return res.redirect(302, redirectUrl);

  // Types with no direct redirect target render a mini landing page instead.
  res.send(renderLandingPage(qrcode, content));
});

// Feedback form submissions land here.
router.post('/p/:code/submit', express.urlencoded({ extended: true }), (req, res) => {
  const qrcode = db.prepare('SELECT * FROM qrcodes WHERE short_code = ?').get(req.params.code);
  if (!qrcode) return res.status(404).send('QR code not found.');
  db.prepare('INSERT INTO feedback_responses (qrcode_id, answers_json) VALUES (?, ?)')
    .run(qrcode.id, JSON.stringify(req.body || {}));
  res.send(`<!doctype html><html><head><meta charset="utf-8"/><link rel="stylesheet" href="/css/style.css"/><link rel="stylesheet" href="/css/landing.css"/></head>
  <body class="landing-body"><main class="landing-card"><div class="landing-icon">✅</div><h1>Thanks!</h1><p class="muted">Your feedback was submitted.</p></main></body></html>`);
});

module.exports = router;
