# QRfy Clone

A full-featured QR code generator platform inspired by [qrfy.com](https://qrfy.com) — built from scratch as a real, working Node.js application (not a mockup).

## What's included

- **21 QR code types**: website URL, list of links, social media, business page, restaurant menu, coupon, feedback form, vCard, vCard Plus, email, phone call, SMS, WhatsApp, location, event, WiFi, app download, PDF, image gallery, video, plain text.
- **Static and dynamic QR codes.** Static codes bake the content directly into the code (work offline, can't be changed). Dynamic codes point to a short link on this server, so you can edit the destination after printing — and every scan is logged.
- **Full visual customization**: foreground/background color, 6 dot styles, 3 corner styles, logo upload, and a "scan me" banner frame. Export as PNG, JPG or SVG.
- **Real scan analytics**: total scans, a 30-day trend chart, and breakdowns by device, browser and country, per QR code and account-wide. Country/city are looked up from the scanner's IP; device/browser/OS are parsed from the User-Agent.
- **Accounts, dashboard & folders**: sign up, log in, organize your codes into folders, search and filter.
- **Bulk generation**: upload a CSV of `title,url` rows and generate + download a ZIP of up to 500 QR codes in one go (each is also saved to your account).
- **Marketing site & pricing page** styled after QRfy's blue branding.


## Live demo

A live instance is running at **https://qrfy-clone.onrender.com** (free tier — it may take ~50s to wake up if idle, and the database resets on redeploys/restarts since the free plan has no persistent disk).

Repo: https://github.com/himelpolygon-svg/qrfy-clone

## Getting started

Requires Node.js 18+.

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

The first run creates a local SQLite database at `data/qrfy.sqlite` — no external database needed.

## How dynamic QR codes work

Every dynamic QR code encodes a short link: `http://<your-domain>/r/<shortCode>`. When that link is opened:

- **Link-like types** (URL, WhatsApp, call, SMS, email, location, app, PDF, video) redirect straight to their destination.
- **Contact/event types** (vCard, vCard Plus, Event) serve a downloadable `.vcf` / `.ics` file so the phone offers "Save contact" / "Add to calendar".
- **Richer "page" types** (menu, business page, social links, link list, coupon, feedback form, image gallery, WiFi, plain text) render a small hosted landing page.

Every hit is logged to the `scans` table with a timestamp, device/browser/OS (parsed from the User-Agent) and an approximate country/city (looked up from the visitor's IP via the free ipapi.co API — this requires outbound internet access; it fails gracefully to "Unknown" if unavailable).

**Important:** if you deploy this somewhere other than `localhost`, dynamic QR codes created on `localhost` will stop working (they encode the domain they were created on). Set the site up on its real domain before generating dynamic codes you intend to print.

## Project structure

```
server/
  index.js          Express app, sessions, static file serving
  db.js             SQLite schema (users, folders, qrcodes, scans, feedback_responses)
  lib/
    qrTypes.js      Single source of truth for the 21 QR types & their form fields
    encode.js       Builds the literal value encoded into STATIC QR codes (vCard, WiFi, iCal, etc.)
    landing.js      Renders the mini landing pages served for DYNAMIC "page" types
    tracker.js      Logs a scan: device/browser/OS + async IP geolocation
  routes/
    auth.js         signup / login / logout / me
    qrcodes.js      QR code + folder CRUD
    analytics.js    Scan aggregation endpoints
    redirect.js     The public /r/:code and /p/:code routes dynamic codes hit
public/
  index.html, login.html, signup.html, pricing.html   Marketing site
  app/              Dashboard, editor, analytics, bulk generator, account (the logged-in app)
  js/               Client-side logic (editor.js is the biggest — the QR designer)
  css/              Shared design system (blue branding, #1D59F9)
  vendor/           Offline copies of qr-code-styling, Chart.js, JSZip and PapaParse
```

## Notable design decisions / known limitations

- **Client-side QR rendering.** The QR code itself (colors, dot styles, logo) is drawn in the browser with the `qr-code-styling` library, not on the server. This keeps the server simple and makes the live preview instant. Frame banners are composited onto the exported PNG/JPG on download; SVG export does not include the frame.
- **No payment processing.** The pricing page is a UI-only mockup — clicking a plan just sends you to sign up. Wire up Stripe (or similar) if you want real billing.
- **Plan limits aren't enforced.** The Free/Starter/Pro/Business tiers shown on the pricing page are illustrative; the backend does not currently cap how many dynamic codes a Free account can create.
- **`/api/upload` (logo upload) has no auth check**, so it's open to anyone running the server. Fine for local/personal use; add `requireAuth` in `server/index.js` before exposing this publicly.
- **Session secret**: set the `SESSION_SECRET` environment variable in production instead of using the built-in dev default.
- This is an independent clone built for demonstration purposes and is **not affiliated with or endorsed by QRfy.com**.

## Ideas for extending it

- Enforce plan limits and add real billing (Stripe Checkout + webhooks).
- Add password reset / email verification.
- Support custom short-link domains (the Business plan promises this on the pricing page).
- Add team accounts / multi-user folders.
- Move the IP geolocation lookup to a paid provider for higher accuracy and rate limits.
