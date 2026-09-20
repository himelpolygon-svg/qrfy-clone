document.getElementById('year').textContent = new Date().getFullYear();

// ---- Hero live QR demo (pure client-side, no account needed) ----
const heroQr = new QRCodeStyling({
  width: 220, height: 220,
  data: document.getElementById('hero-url').value,
  margin: 4,
  dotsOptions: { color: '#1D59F9', type: 'rounded' },
  cornersSquareOptions: { color: '#0F172A', type: 'extra-rounded' },
  cornersDotOptions: { color: '#1D59F9', type: 'dot' },
  backgroundOptions: { color: '#ffffff' },
  qrOptions: { errorCorrectionLevel: 'Q' },
});
heroQr.append(document.getElementById('hero-qr'));

document.getElementById('hero-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const val = document.getElementById('hero-url').value.trim() || 'https://example.com';
  heroQr.update({ data: val });
  document.querySelector('.hero-customize-link').href = '/signup?prefill=' + encodeURIComponent(val);
});

// ---- QR type showcase grid ----
fetch('/api/qr-types').then((r) => r.json()).then(({ types }) => {
  const grid = document.getElementById('type-grid');
  grid.innerHTML = types.map((t) => `
    <a class="type-tile" href="/app/editor?type=${encodeURIComponent(t.key)}">
      <span class="ic">${qrIcon(t.icon)}</span>
      <span>${t.label}</span>
    </a>
  `).join('');
}).catch(() => {});
