const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const db = require('./db');
const { attachUser, requireAuth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const qrcodeRoutes = require('./routes/qrcodes');
const analyticsRoutes = require('./routes/analytics');
const redirectRoutes = require('./routes/redirect');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(session({
  name: 'qrfy.sid',
  secret: process.env.SESSION_SECRET || 'qrfy-clone-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 30 },
}));
app.use(attachUser);

// ---- Logo / asset uploads (used by the editor's "add logo" feature) ----
// Requires login and only accepts images: this used to accept ANY file from
// ANY visitor (no auth check at all) and wrote it straight into the public,
// statically-served uploads folder - effectively free, anonymous file hosting
// on this server for anyone who found the endpoint.
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']);
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname)),
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED_LOGO_TYPES.has(file.mimetype)),
});
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded. Only PNG, JPG, WEBP, GIF or SVG images up to 3MB are accepted.' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ---- API routes ----
app.use('/api', authRoutes);
app.use('/api', qrcodeRoutes);
app.use('/api', analyticsRoutes);

// ---- Public redirect / landing-page routes for dynamic QR codes ----
app.use('/', redirectRoutes);

// ---- Static site & app ----
app.use(express.static(PUBLIC_DIR));

function page(file) {
  return (req, res) => res.sendFile(path.join(PUBLIC_DIR, file));
}
app.get('/', page('index.html'));
app.get('/login', page('login.html'));
app.get('/signup', page('signup.html'));
app.get('/pricing', page('pricing.html'));
app.get('/app/dashboard', page('app/dashboard.html'));
app.get('/app/editor', page('app/editor.html'));
app.get('/app/analytics', page('app/analytics.html'));
app.get('/app/account', page('app/account.html'));
app.get('/app/bulk', page('app/bulk.html'));

app.use((req, res) => res.status(404).send('Not found'));

// Catches anything that throws synchronously in a route handler (a bad JSON
// body, a duplicate short_code, etc.) - without this, Express's own default
// handler sends the raw error back to the client, stack trace and all
// (file paths, dependency versions), instead of a clean JSON error.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 400;
  console.error(err);
  res.status(status).json({ error: status < 500 ? (err.message || 'Invalid request.') : 'Something went wrong on our end.' });
});

app.listen(PORT, () => {
  console.log(`QRfy Clone running at http://localhost:${PORT}`);
});
