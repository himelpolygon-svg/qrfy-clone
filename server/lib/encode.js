// Builds the literal payload that gets encoded straight into a STATIC QR code
// (no server round-trip - has to be self-contained), and the vCard/iCal text
// used for contact & event types in both static and dynamic mode.

function escapeVCard(str = '') {
  return String(str).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
}

// WIFI: QR payloads are semicolon/colon-delimited (WIFI:T:...;S:...;P:...;;),
// so an SSID or password containing \\, ;, , or : must be backslash-escaped
// per spec, or it silently truncates/corrupts the network name or password
// that phones read back out of the code.
function escapeWifi(str = '') {
  return String(str).replace(/([\\;,:])/g, '\\$1');
}

function buildVCard(c, plus) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(c.lastName || '')};${escapeVCard(c.firstName || '')};;;`,
    `FN:${escapeVCard([c.firstName, c.lastName].filter(Boolean).join(' '))}`,
  ];
  if (c.company) lines.push(`ORG:${escapeVCard(c.company)}`);
  if (c.jobTitle) lines.push(`TITLE:${escapeVCard(c.jobTitle)}`);
  if (c.phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(c.phone)}`);
  if (plus && c.fax) lines.push(`TEL;TYPE=FAX:${escapeVCard(c.fax)}`);
  if (c.email) lines.push(`EMAIL:${escapeVCard(c.email)}`);
  if (c.website) lines.push(`URL:${escapeVCard(c.website)}`);
  if (c.address) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(c.address)};;;;`);
  if (plus && c.photoUrl) lines.push(`PHOTO;VALUE=URI:${c.photoUrl}`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

function toICalDate(value) {
  if (!value) return '';
  // `value` comes from an HTML datetime-local input ("YYYY-MM-DDTHH:mm") with
  // no timezone attached - it's the wall-clock time the event creator typed,
  // e.g. "6pm at the venue". Parsing it with `new Date(value)` interprets it
  // in the SERVER process's timezone and `.toISOString()` then stamps it with
  // a 'Z' as if that were UTC, which silently shifts the event by however many
  // hours the server's timezone differs from the browser's. Instead, pull the
  // digits out directly and emit an iCalendar "floating" local time (no Z),
  // which calendar apps correctly read back as that same wall-clock time.
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return '';
  const [, y, mo, d, h, mi, s] = m;
  return `${y}${mo}${d}T${h}${mi}${s || '00'}`;
}

function buildICS(c) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//QRfy Clone//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${(c.title || '').replace(/\n/g, ' ')}`,
  ];
  if (c.location) lines.push(`LOCATION:${c.location.replace(/\n/g, ' ')}`);
  if (c.description) lines.push(`DESCRIPTION:${c.description.replace(/\n/g, '\\n')}`);
  if (c.start) lines.push(`DTSTART:${toICalDate(c.start)}`);
  if (c.end) lines.push(`DTEND:${toICalDate(c.end)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\n');
}

// The value encoded directly into a STATIC QR (works with zero server involvement).
function buildStaticValue(qrType, c = {}) {
  switch (qrType) {
    case 'url': return c.url || '';
    case 'text': return c.text || '';
    case 'email': {
      const params = new URLSearchParams();
      if (c.subject) params.set('subject', c.subject);
      if (c.body) params.set('body', c.body);
      const qs = params.toString();
      return `mailto:${c.to || ''}${qs ? '?' + qs : ''}`;
    }
    case 'call': return `tel:${c.phone || ''}`;
    case 'sms': return `SMSTO:${c.phone || ''}:${c.message || ''}`;
    case 'whatsapp': {
      const digits = (c.phone || '').replace(/[^\d]/g, '');
      return `https://wa.me/${digits}${c.message ? '?text=' + encodeURIComponent(c.message) : ''}`;
    }
    case 'wifi':
      return `WIFI:T:${c.encryption || 'WPA'};S:${escapeWifi(c.ssid || '')};P:${escapeWifi(c.password || '')};H:${c.hidden ? 'true' : 'false'};;`;
    case 'vcard': return buildVCard(c, false);
    case 'vcard-plus': return buildVCard(c, true);
    case 'location': return `geo:${c.lat || 0},${c.lng || 0}${c.label ? '?q=' + encodeURIComponent(c.label) : ''}`;
    case 'event': return buildICS(c);
    case 'app': return c.fallbackUrl || c.androidUrl || c.iosUrl || '';
    case 'pdf': return c.pdfUrl || '';
    case 'video': return c.videoUrl || '';
    case 'images': return (c.imageUrls && c.imageUrls[0]) || '';
    case 'link-list':
    case 'social':
    case 'business':
    case 'menu':
    case 'coupon':
    case 'feedback':
      // These are "page" types - static mode falls back to the first useful link
      // if provided, otherwise a short text summary (still scannable/offline).
      return c.fallbackUrl || (c.links && c.links[0] && c.links[0].url) || JSON.stringify(c).slice(0, 300);
    default:
      return JSON.stringify(c);
  }
}

module.exports = { buildVCard, buildICS, buildStaticValue };
