// Decides what happens when a DYNAMIC QR code is scanned: an instant redirect
// for "link-like" types, a downloadable file for contact/event types, or a
// rendered mini landing page for the richer "page" types (menu, business, etc).

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function directRedirectUrl(qrType, c, userAgent = '') {
  switch (qrType) {
    case 'url': return c.url || null;
    case 'whatsapp': {
      const digits = (c.phone || '').replace(/[^\d]/g, '');
      return `https://wa.me/${digits}${c.message ? '?text=' + encodeURIComponent(c.message) : ''}`;
    }
    case 'call': return `tel:${c.phone || ''}`;
    case 'sms': return `sms:${c.phone || ''}${c.message ? '?body=' + encodeURIComponent(c.message) : ''}`;
    case 'email': {
      const params = new URLSearchParams();
      if (c.subject) params.set('subject', c.subject);
      if (c.body) params.set('body', c.body);
      const qs = params.toString();
      return `mailto:${c.to || ''}${qs ? '?' + qs : ''}`;
    }
    case 'location':
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.lat},${c.lng}`)}`;
    case 'pdf': return c.pdfUrl || null;
    case 'video': return c.videoUrl || null;
    case 'app': {
      const ua = userAgent.toLowerCase();
      if (ua.includes('iphone') || ua.includes('ipad')) return c.iosUrl || c.fallbackUrl || null;
      if (ua.includes('android')) return c.androidUrl || c.fallbackUrl || null;
      return c.fallbackUrl || c.iosUrl || c.androidUrl || null;
    }
    default: return null;
  }
}

function shell(title, bodyHtml) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<link rel="stylesheet" href="/css/style.css"/>
<link rel="stylesheet" href="/css/landing.css"/>
</head><body class="landing-body">
<main class="landing-card">${bodyHtml}</main>
<footer class="landing-footer">Powered by <a href="/">QRfy Clone</a></footer>
</body></html>`;
}

function renderLandingPage(qrcode, c) {
  const type = qrcode.qr_type;
  if (type === 'wifi') {
    return shell(c.ssid || 'WiFi', `
      <div class="landing-icon">📶</div>
      <h1>${esc(c.ssid || 'WiFi Network')}</h1>
      <p class="muted">Scan complete — use these details to connect.</p>
      <div class="kv"><span>Network</span><strong>${esc(c.ssid || '')}</strong></div>
      <div class="kv"><span>Password</span><strong id="wifi-pass">${esc(c.password || '(none)')}</strong></div>
      <div class="kv"><span>Security</span><strong>${esc(c.encryption || 'WPA')}</strong></div>
      <button class="btn btn-primary" onclick="navigator.clipboard && navigator.clipboard.writeText('${esc(c.password || '')}')">Copy password</button>
    `);
  }
  if (type === 'text') {
    return shell(c.title || 'Text', `<h1>Text</h1><p style="white-space:pre-wrap">${esc(c.text || '')}</p>`);
  }
  if (type === 'images') {
    const imgs = (c.imageUrls || []).map((u) => `<img src="${esc(u)}" alt="" class="landing-gallery-img"/>`).join('');
    return shell(c.title || 'Gallery', `<h1>${esc(c.title || 'Gallery')}</h1><div class="landing-gallery">${imgs}</div>`);
  }
  if (type === 'menu') {
    const rows = (c.items || []).map((it) => `
      <div class="menu-row">
        <div><strong>${esc(it.name || '')}</strong>${it.description ? `<div class="muted small">${esc(it.description)}</div>` : ''}</div>
        <div class="menu-price">${esc(it.price || '')}</div>
      </div>`).join('');
    return shell(c.restaurantName || 'Menu', `<h1>${esc(c.restaurantName || 'Menu')}</h1><div class="menu-list">${rows || '<p class="muted">No items yet.</p>'}</div>`);
  }
  if (type === 'business') {
    return shell(c.businessName || 'Business', `
      <h1>${esc(c.businessName || '')}</h1>
      ${c.tagline ? `<p class="muted">${esc(c.tagline)}</p>` : ''}
      ${c.phone ? `<div class="kv"><span>Phone</span><a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></div>` : ''}
      ${c.email ? `<div class="kv"><span>Email</span><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>` : ''}
      ${c.website ? `<div class="kv"><span>Website</span><a href="${esc(c.website)}" target="_blank">${esc(c.website)}</a></div>` : ''}
      ${c.address ? `<div class="kv"><span>Address</span><span>${esc(c.address)}</span></div>` : ''}
      ${c.hours ? `<div class="kv"><span>Hours</span><span style="white-space:pre-wrap">${esc(c.hours)}</span></div>` : ''}
    `);
  }
  if (type === 'social') {
    const links = (c.links || []).map((l) => `<a class="btn btn-block" href="${esc(l.url)}" target="_blank">${esc(l.platform || l.url)}</a>`).join('');
    return shell(c.title || 'Follow us', `<h1>${esc(c.title || 'Follow us')}</h1><div class="link-stack">${links}</div>`);
  }
  if (type === 'link-list') {
    const links = (c.links || []).map((l) => `<a class="btn btn-block" href="${esc(l.url)}" target="_blank">${esc(l.label || l.url)}</a>`).join('');
    return shell(c.title || 'Links', `<h1>${esc(c.title || 'My Links')}</h1>${c.bio ? `<p class="muted">${esc(c.bio)}</p>` : ''}<div class="link-stack">${links}</div>`);
  }
  if (type === 'coupon') {
    return shell(c.title || 'Coupon', `
      <div class="landing-icon">🏷️</div>
      <h1>${esc(c.title || 'Special offer')}</h1>
      ${c.description ? `<p class="muted">${esc(c.description)}</p>` : ''}
      ${c.code ? `<div class="coupon-code">${esc(c.code)}</div>` : ''}
      ${c.expiry ? `<p class="muted small">Expires ${esc(c.expiry)}</p>` : ''}
    `);
  }
  if (type === 'feedback') {
    const qs = (c.questions || []).map((q, i) => `
      <label class="field">
        <span>${esc(q)}</span>
        <textarea name="q${i}" rows="2"></textarea>
      </label>`).join('');
    return shell(c.title || 'Feedback', `
      <h1>${esc(c.title || 'How did we do?')}</h1>
      <form method="post" action="/p/${esc(qrcode.short_code)}/submit" class="feedback-form">
        ${qs}
        <button class="btn btn-primary" type="submit">Submit feedback</button>
      </form>
    `);
  }
  if (type === 'vcard' || type === 'vcard-plus') {
    return shell([c.firstName, c.lastName].filter(Boolean).join(' ') || 'Contact', `
      <div class="landing-icon">👤</div>
      <h1>${esc([c.firstName, c.lastName].filter(Boolean).join(' '))}</h1>
      ${c.jobTitle || c.company ? `<p class="muted">${esc([c.jobTitle, c.company].filter(Boolean).join(' @ '))}</p>` : ''}
      <a class="btn btn-primary btn-block" href="/r/${esc(qrcode.short_code)}/vcard.vcf">Save contact</a>
    `);
  }
  if (type === 'event') {
    return shell(c.title || 'Event', `
      <div class="landing-icon">📅</div>
      <h1>${esc(c.title || 'Event')}</h1>
      ${c.location ? `<p class="muted">${esc(c.location)}</p>` : ''}
      ${c.description ? `<p>${esc(c.description)}</p>` : ''}
      <a class="btn btn-primary btn-block" href="/r/${esc(qrcode.short_code)}/event.ics">Add to calendar</a>
    `);
  }
  return shell('QR Code', `<h1>Content unavailable</h1><p class="muted">This code has no destination configured.</p>`);
}

module.exports = { renderLandingPage, directRedirectUrl, shell, esc };
