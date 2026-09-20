let rows = [];
let mode = 'dynamic';

document.getElementById('sample-csv').addEventListener('click', (e) => {
  e.preventDefault();
  const csv = 'title,url\nHomepage,https://example.com\nMenu QR,https://example.com/menu\nContact Us,https://example.com/contact\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sample-qr-bulk.csv'; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('csv-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: (results) => {
      rows = results.data.filter((r) => r.url).slice(0, 500).map((r) => ({ title: r.title || r.url, url: r.url }));
      document.getElementById('csv-summary').textContent = `${rows.length} row${rows.length === 1 ? '' : 's'} loaded.`;
      document.getElementById('preview-table').innerHTML = rows.length
        ? `<table class="data-table" style="width:100%;font-size:13.5px"><thead><tr><th style="text-align:left">Title</th><th style="text-align:left">URL</th></tr></thead><tbody>${rows.slice(0, 8).map((r) => `<tr><td>${escapeHtml(r.title)}</td><td>${escapeHtml(r.url)}</td></tr>`).join('')}</tbody></table>${rows.length > 8 ? `<p class="muted small">+ ${rows.length - 8} more…</p>` : ''}`
        : '<p class="muted">No valid rows found. Make sure your CSV has a "url" column.</p>';
      document.getElementById('generate-btn').disabled = rows.length === 0;
    },
  });
});

document.querySelectorAll('.pill-choice[data-mode]').forEach((p) => {
  p.addEventListener('click', () => {
    document.querySelectorAll('.pill-choice[data-mode]').forEach((x) => x.classList.remove('active'));
    p.classList.add('active');
    mode = p.dataset.mode;
  });
});

document.getElementById('generate-btn').addEventListener('click', async () => {
  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  const progressWrap = document.getElementById('progress-bar-wrap');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  progressWrap.style.display = '';

  const fgColor = document.getElementById('fg-color').value;
  const bgColor = document.getElementById('bg-color').value;
  const zip = new JSZip();
  const qrInst = new QRCodeStyling({
    width: 400, height: 400, type: 'canvas', margin: 8,
    dotsOptions: { color: fgColor, type: 'rounded' },
    backgroundOptions: { color: bgColor },
    cornersSquareOptions: { color: fgColor, type: 'extra-rounded' },
    cornersDotOptions: { color: fgColor, type: 'dot' },
    qrOptions: { errorCorrectionLevel: 'Q' },
  });
  qrInst.append(document.getElementById('hidden-qr'));

  let done = 0;
  for (const row of rows) {
    try {
      const { qrcode } = await api('/qrcodes', {
        method: 'POST',
        body: {
          title: row.title, qrType: 'url', mode,
          content: { url: row.url },
          style: { fgColor, bgColor, dotStyle: 'rounded', cornerStyle: 'extra-rounded', frame: { style: 'none' } },
        },
      });
      const data = qrcode.mode === 'dynamic' ? `${location.origin}/r/${qrcode.short_code}` : qrcode.encoded_value;
      await qrInst.update({ data });
      const blob = await qrInst.getRawData('png');
      const safeName = (row.title || 'qr').replace(/[^a-z0-9\-]+/gi, '_').slice(0, 60);
      zip.file(`${safeName || 'qr'}_${qrcode.id}.png`, blob);
    } catch (err) {
      console.error('Row failed:', row, err);
    }
    done += 1;
    progressBar.style.width = Math.round((done / rows.length) * 100) + '%';
    progressText.textContent = `Generating ${done} / ${rows.length}…`;
  }

  progressText.textContent = 'Zipping up your QR codes…';
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url; a.download = 'qr-codes.zip'; a.click();
  URL.revokeObjectURL(url);
  progressText.textContent = `Done! ${done} QR codes generated and saved to your dashboard.`;
  btn.disabled = false;
});

document.getElementById('logout-btn').addEventListener('click', async () => { await api('/logout', { method: 'POST' }); location.href = '/'; });

(async function boot() {
  const { user } = await api('/me').catch(() => ({ user: null }));
  if (!user) { location.href = '/login'; return; }
})();
