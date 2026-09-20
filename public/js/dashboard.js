let TYPES = [];
let FOLDERS = [];
let CODES = [];
let activeFolder = '';

function previewValueFor(qr) {
  if (qr.mode === 'dynamic') return `${location.origin}/r/${qr.short_code}`;
  return qr.encoded_value || 'https://example.com';
}

function renderThumb(container, qr) {
  const style = qr.style || {};
  const inst = new QRCodeStyling({
    width: 160, height: 160, type: 'canvas', margin: 4,
    data: previewValueFor(qr),
    dotsOptions: { color: style.fgColor || '#0F172A', type: style.dotStyle || 'rounded' },
    backgroundOptions: { color: style.bgColor || '#ffffff' },
    cornersSquareOptions: { color: style.fgColor || '#0F172A', type: style.cornerStyle || 'extra-rounded' },
    cornersDotOptions: { color: style.fgColor || '#0F172A', type: style.cornerStyle === 'square' ? 'square' : 'dot' },
    image: style.logoUrl || undefined,
    imageOptions: { crossOrigin: 'anonymous', margin: 4, imageSize: 0.4 },
    qrOptions: { errorCorrectionLevel: 'Q' },
  });
  inst.append(container);
}

function typeLabel(key) {
  const t = TYPES.find((x) => x.key === key);
  return t ? t.label : key;
}
function typeIconKey(key) {
  const t = TYPES.find((x) => x.key === key);
  return t ? t.icon : 'link';
}

function renderFolders() {
  const el = document.getElementById('folder-list');
  el.innerHTML = FOLDERS.map((f) => `
    <div class="side-link ${activeFolder == f.id ? 'active' : ''}" data-folder="${f.id}" style="cursor:pointer;justify-content:space-between">
      <span><span class="ic">📁</span>${f.name}</span>
      <span class="muted small">${f.count}</span>
    </div>
  `).join('') + `<div class="side-link ${activeFolder === '' ? 'active' : ''}" data-folder="" style="cursor:pointer">All codes</div>`;
  el.querySelectorAll('[data-folder]').forEach((row) => {
    row.addEventListener('click', () => { activeFolder = row.dataset.folder; loadCodes(); renderFolders(); });
  });
  const sel = document.getElementById('filter-folder');
  sel.innerHTML = '<option value="">All folders</option>' + FOLDERS.map((f) => `<option value="${f.id}">${f.name}</option>`).join('');
}

function renderTypeFilter() {
  const sel = document.getElementById('filter-type');
  sel.innerHTML = '<option value="">All types</option>' + TYPES.map((t) => `<option value="${t.key}">${t.label}</option>`).join('');
}

function cardHtml(qr) {
  const modeBadge = qr.mode === 'dynamic' ? '<span class="badge badge-blue">Dynamic</span>' : '<span class="badge badge-gray">Static</span>';
  const activeBadge = qr.active ? '' : '<span class="badge badge-orange">Paused</span>';
  return `
    <div class="qr-card" data-id="${qr.id}">
      <div class="qr-thumb" data-thumb></div>
      <div class="qr-card-title">${qr.title}</div>
      <div class="qr-card-meta">
        ${modeBadge}${activeBadge}
        <span class="badge badge-gray">${qrIcon(typeIconKey(qr.qr_type))} ${typeLabel(qr.qr_type)}</span>
      </div>
      <div class="muted small">${qr.scanCount} scan${qr.scanCount === 1 ? '' : 's'}</div>
      <div class="qr-card-actions">
        <a class="btn btn-secondary" href="/app/editor?id=${qr.id}">Edit</a>
        ${qr.mode === 'dynamic' ? `<a class="btn btn-secondary" href="/app/analytics?id=${qr.id}">Stats</a>` : ''}
        <button class="btn btn-danger" data-delete="${qr.id}">Delete</button>
      </div>
    </div>
  `;
}

function renderGrid() {
  const grid = document.getElementById('qr-grid');
  const q = document.getElementById('search-input').value.toLowerCase();
  const typeFilter = document.getElementById('filter-type').value;
  const filtered = CODES.filter((c) => (!q || c.title.toLowerCase().includes(q)) && (!typeFilter || c.qr_type === typeFilter));
  document.getElementById('empty-state').style.display = filtered.length ? 'none' : '';
  grid.innerHTML = filtered.map(cardHtml).join('');
  filtered.forEach((qr) => {
    const container = grid.querySelector(`.qr-card[data-id="${qr.id}"] [data-thumb]`);
    if (container) renderThumb(container, qr);
  });
  grid.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this QR code? This cannot be undone.')) return;
      await api(`/qrcodes/${btn.dataset.delete}`, { method: 'DELETE' });
      loadCodes();
    });
  });
}

async function loadCodes() {
  const qs = activeFolder ? `?folderId=${activeFolder}` : '';
  const { qrcodes } = await api('/qrcodes' + qs);
  CODES = qrcodes;
  renderGrid();
}

async function loadStats() {
  const overview = await api('/analytics/overview');
  document.getElementById('stat-total').textContent = overview.totalCodes;
  document.getElementById('stat-dynamic').textContent = overview.dynamicCodes;
  document.getElementById('stat-scans').textContent = overview.totalScans;
}

document.getElementById('search-input').addEventListener('input', renderGrid);
document.getElementById('filter-type').addEventListener('change', renderGrid);
document.getElementById('filter-folder').addEventListener('change', (e) => { activeFolder = e.target.value; loadCodes(); renderFolders(); });
document.getElementById('new-folder-btn').addEventListener('click', async () => {
  const name = prompt('Folder name');
  if (!name) return;
  await api('/folders', { method: 'POST', body: { name } });
  const { folders } = await api('/folders');
  FOLDERS = folders;
  renderFolders();
});
document.getElementById('logout-btn').addEventListener('click', async () => { await api('/logout', { method: 'POST' }); location.href = '/'; });

async function boot() {
  const { user } = await api('/me').catch(() => ({ user: null }));
  if (!user) { location.href = '/login'; return; }
  document.getElementById('stat-plan').textContent = user.plan.charAt(0).toUpperCase() + user.plan.slice(1);

  const [{ types }, { folders }] = await Promise.all([api('/qr-types'), api('/folders')]);
  TYPES = types;
  FOLDERS = folders;
  renderFolders();
  renderTypeFilter();
  await Promise.all([loadCodes(), loadStats()]);
}
boot();
