const BRAND = '#1D59F9';
const PALETTE = ['#1D59F9', '#6C8CFF', '#12B76A', '#F79009', '#E03131', '#8B5CF6', '#0EA5E9', '#EC4899'];

let charts = {};
function destroyCharts() { Object.values(charts).forEach((c) => c && c.destroy()); charts = {}; }

function renderSeriesChart(series) {
  const ctx = document.getElementById('chart-series');
  charts.series = new Chart(ctx, {
    type: 'line',
    data: {
      labels: series.map((s) => s.day),
      datasets: [{ label: 'Scans', data: series.map((s) => s.count), borderColor: BRAND, backgroundColor: 'rgba(29,89,249,.12)', fill: true, tension: .35, pointRadius: 2 }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
  });
}
function renderDoughnut(canvasId, key, rows, labelKey, valueKey) {
  charts[key] = new Chart(document.getElementById(canvasId), {
    type: 'doughnut',
    data: { labels: rows.map((r) => r[labelKey]), datasets: [{ data: rows.map((r) => r[valueKey]), backgroundColor: PALETTE }] },
    options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } },
  });
}
function renderBar(canvasId, key, rows, labelKey, valueKey) {
  charts[key] = new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: { labels: rows.map((r) => r[labelKey]), datasets: [{ data: rows.map((r) => r[valueKey]), backgroundColor: BRAND, borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
  });
}

function renderOverview(data) {
  document.getElementById('stat-scans').textContent = data.totalScans;
  document.getElementById('stat-30d').textContent = (data.series || []).reduce((a, b) => a + b.count, 0);
  document.getElementById('stat-device').textContent = (data.byDevice[0] && data.byDevice[0].device) || '–';
  document.getElementById('stat-country').textContent = (data.byCountry[0] && data.byCountry[0].country) || '–';

  destroyCharts();
  renderSeriesChart(data.series);
  renderDoughnut('chart-device', 'device', data.byDevice, 'device', 'count');
  renderBar('chart-browser', 'browser', data.byBrowser, 'browser', 'count');
  renderBar('chart-country', 'country', data.byCountry, 'country', 'count');

  document.getElementById('top-codes-body').innerHTML = (data.topCodes || []).map((c) => `<tr><td>${escapeHtml(c.title)}</td><td>${escapeHtml(c.qr_type)}</td><td>${c.scanCount}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">No data yet.</td></tr>';
  document.getElementById('top-codes-card').style.display = '';
  document.getElementById('recent-card').style.display = 'none';
  document.getElementById('feedback-card').style.display = 'none';
}

function renderSingle(data, qrType) {
  document.getElementById('stat-scans').textContent = data.totalScans;
  document.getElementById('stat-30d').textContent = (data.series || []).reduce((a, b) => a + b.count, 0);
  document.getElementById('stat-device').textContent = (data.byDevice[0] && data.byDevice[0].device) || '–';
  document.getElementById('stat-country').textContent = (data.byCountry[0] && data.byCountry[0].country) || '–';

  destroyCharts();
  renderSeriesChart(data.series);
  renderDoughnut('chart-device', 'device', data.byDevice, 'device', 'count');
  renderBar('chart-browser', 'browser', data.byBrowser, 'browser', 'count');
  renderBar('chart-country', 'country', data.byCountry, 'country', 'count');

  document.getElementById('top-codes-card').style.display = 'none';
  document.getElementById('recent-card').style.display = '';
  // device/browser/os are parsed from the scanning visitor's User-Agent header,
  // and feedback answers are typed in by whoever scans the code - both are
  // untrusted, attacker-controllable input from a third party (not this
  // account's own data), so they must be escaped before going into the QR
  // owner's analytics page via innerHTML, or a crafted UA/feedback submission
  // could run script in the owner's browser.
  document.getElementById('recent-body').innerHTML = (data.recent || []).map((r) => `
    <tr><td>${new Date(r.scanned_at + 'Z').toLocaleString()}</td><td>${escapeHtml(r.device)}</td><td>${escapeHtml(r.browser)}</td><td>${escapeHtml(r.os)}</td><td>${escapeHtml([r.city, r.country].filter(Boolean).join(', ')) || '–'}</td></tr>
  `).join('') || '<tr><td colspan="5" class="muted">No scans yet — share the QR code to see activity here.</td></tr>';

  if (qrType === 'feedback' && data.feedback && data.feedback.length) {
    document.getElementById('feedback-card').style.display = '';
    document.getElementById('feedback-list').innerHTML = data.feedback.map((f) => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div class="muted small">${new Date(f.submitted_at + 'Z').toLocaleString()}</div>
        ${Object.values(f.answers).map((a) => `<div>${escapeHtml(a)}</div>`).join('')}
      </div>
    `).join('');
  } else {
    document.getElementById('feedback-card').style.display = 'none';
  }
}

async function loadFor(id) {
  if (!id) {
    const data = await api('/analytics/overview');
    renderOverview(data);
  } else {
    const [{ qrcode }, data] = await Promise.all([api(`/qrcodes/${id}`), api(`/analytics/qrcodes/${id}`)]);
    renderSingle(data, qrcode.qr_type);
  }
}

document.getElementById('code-select').addEventListener('change', (e) => loadFor(e.target.value));
document.getElementById('logout-btn').addEventListener('click', async () => { await api('/logout', { method: 'POST' }); location.href = '/'; });

async function boot() {
  const { user } = await api('/me').catch(() => ({ user: null }));
  if (!user) { location.href = '/login'; return; }
  const { qrcodes } = await api('/qrcodes');
  const dynamicCodes = qrcodes.filter((q) => q.mode === 'dynamic');
  const sel = document.getElementById('code-select');
  sel.innerHTML = '<option value="">All QR codes (account overview)</option>' + dynamicCodes.map((q) => `<option value="${q.id}">${escapeHtml(q.title)}</option>`).join('');

  const params = new URLSearchParams(location.search);
  const preselect = params.get('id');
  if (preselect) sel.value = preselect;
  await loadFor(sel.value);
}
boot();
