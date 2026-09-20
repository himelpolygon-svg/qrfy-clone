// ---------------------------------------------------------------------------
// QR editor: type picker -> dynamic content form + design panel -> live preview
// ---------------------------------------------------------------------------

const params = new URLSearchParams(location.search);
const editId = params.get('id');

let TYPES = [];
let currentUser = null;

const state = {
  id: null,
  title: 'Untitled QR Code',
  qrType: params.get('type') || 'url',
  mode: 'dynamic',
  folderId: null,
  content: {},
  style: {
    fgColor: '#0F172A', bgColor: '#ffffff',
    dotStyle: 'rounded', cornerStyle: 'extra-rounded',
    logoUrl: null, frame: { style: 'none', text: 'SCAN ME' },
  },
};

if (params.get('prefill')) state.content.url = params.get('prefill');

const qrCode = new QRCodeStyling({
  width: 240, height: 240, type: 'canvas', margin: 6,
  data: 'https://example.com',
  dotsOptions: { color: state.style.fgColor, type: state.style.dotStyle },
  backgroundOptions: { color: state.style.bgColor },
  cornersSquareOptions: { color: state.style.fgColor, type: state.style.cornerStyle },
  cornersDotOptions: { color: state.style.fgColor, type: 'dot' },
  qrOptions: { errorCorrectionLevel: 'Q' },
});
qrCode.append(document.getElementById('qr-canvas-wrap'));

// ---------------- Client-side "static" value builder (mirrors server/lib/encode.js) ----------------
// WIFI: QR payloads are semicolon/colon-delimited, so SSIDs or passwords that
// contain \, ;, , or : must be backslash-escaped or they corrupt the format.
function escapeWifi(str = '') {
  return String(str).replace(/([\\;,:])/g, '\\$1');
}
function buildStaticValueClient(qrType, c = {}) {
  switch (qrType) {
    case 'url': return c.url || 'https://example.com';
    case 'text': return c.text || 'Sample text';
    case 'email': {
      const params = [];
      if (c.subject) params.push('subject=' + encodeURIComponent(c.subject));
      if (c.body) params.push('body=' + encodeURIComponent(c.body));
      return `mailto:${c.to || ''}${params.length ? '?' + params.join('&') : ''}`;
    }
    case 'call': return `tel:${c.phone || ''}`;
    case 'sms': return `SMSTO:${c.phone || ''}:${c.message || ''}`;
    case 'whatsapp': return `https://wa.me/${(c.phone || '').replace(/[^\d]/g, '')}${c.message ? '?text=' + encodeURIComponent(c.message) : ''}`;
    case 'wifi': return `WIFI:T:${c.encryption || 'WPA'};S:${escapeWifi(c.ssid || '')};P:${escapeWifi(c.password || '')};H:${c.hidden ? 'true' : 'false'};;`;
    case 'vcard':
    case 'vcard-plus':
      return `BEGIN:VCARD\nVERSION:3.0\nN:${c.lastName || ''};${c.firstName || ''}\nFN:${[c.firstName, c.lastName].filter(Boolean).join(' ')}\n${c.phone ? 'TEL:' + c.phone + '\n' : ''}${c.email ? 'EMAIL:' + c.email + '\n' : ''}END:VCARD`;
    case 'location': return `geo:${c.lat || 0},${c.lng || 0}`;
    case 'event': return `BEGIN:VEVENT\nSUMMARY:${c.title || ''}\nEND:VEVENT`;
    default: return c.url || c.fallbackUrl || (c.links && c.links[0] && c.links[0].url) || 'https://example.com';
  }
}

function previewData() {
  if (state.mode === 'static') return buildStaticValueClient(state.qrType, state.content);
  return `${location.origin}/r/xxxxxxxx`;
}

function updatePreview() {
  const cornerDot = state.style.cornerStyle === 'square' ? 'square' : 'dot';
  qrCode.update({
    data: previewData(),
    dotsOptions: { color: state.style.fgColor, type: state.style.dotStyle },
    backgroundOptions: { color: state.style.bgColor },
    cornersSquareOptions: { color: state.style.fgColor, type: state.style.cornerStyle },
    cornersDotOptions: { color: state.style.fgColor, type: cornerDot },
    image: state.style.logoUrl || undefined,
    imageOptions: { crossOrigin: 'anonymous', margin: 4, imageSize: 0.4 },
  });
  const caption = document.getElementById('frame-caption-preview');
  if (state.style.frame.style === 'none') {
    caption.style.display = 'none';
  } else {
    caption.style.display = '';
    caption.textContent = state.style.frame.text || 'SCAN ME';
    caption.style.background = state.style.fgColor;
    caption.parentElement.style.flexDirection = state.style.frame.style === 'top-banner' ? 'column-reverse' : 'column';
  }
}

// ---------------- Type picker ----------------
function renderTypePicker(filter = '') {
  const groups = {};
  TYPES.filter((t) => !filter || t.label.toLowerCase().includes(filter.toLowerCase())).forEach((t) => {
    (groups[t.group] = groups[t.group] || []).push(t);
  });
  const el = document.getElementById('type-picker');
  el.innerHTML = Object.entries(groups).map(([group, items]) => `
    <div class="type-group-label">${group}</div>
    ${items.map((t) => `<div class="type-item ${t.key === state.qrType ? 'active' : ''}" data-key="${t.key}"><span class="ic">${qrIcon(t.icon)}</span>${t.label}</div>`).join('')}
  `).join('');
  el.querySelectorAll('.type-item').forEach((item) => {
    item.addEventListener('click', () => {
      state.qrType = item.dataset.key;
      state.content = {};
      renderTypePicker(document.getElementById('type-search').value);
      renderContentForm();
      updatePreview();
    });
  });
}

document.getElementById('type-search').addEventListener('input', (e) => renderTypePicker(e.target.value));

// ---------------- Dynamic content form ----------------
function fieldHtml(f) {
  const val = state.content[f.name];
  if (f.type === 'textarea') return `<div class="field"><label>${f.label}</label><textarea data-field="${f.name}" placeholder="${f.placeholder || ''}">${val || ''}</textarea></div>`;
  if (f.type === 'select') {
    const opts = f.options.map((o) => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join('');
    return `<div class="field"><label>${f.label}</label><select data-field="${f.name}">${opts}</select></div>`;
  }
  if (f.type === 'checkbox') return `<div class="field"><label class="checkbox-row"><input type="checkbox" data-field="${f.name}" ${val ? 'checked' : ''}/> ${f.label}</label></div>`;
  if (f.type === 'text-array') {
    const items = state.content[f.name] || [''];
    return `<div class="field"><label>${f.label}</label>
      <div data-array="${f.name}">${items.map((v, i) => `
        <div class="text-array-row">
          <input value="${(v || '').replace(/"/g, '&quot;')}" data-array-field="${f.name}" data-idx="${i}"/>
          <button type="button" class="array-remove" data-array-remove="${f.name}" data-idx="${i}">×</button>
        </div>`).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm" data-array-add="${f.name}">+ Add</button>
    </div>`;
  }
  if (f.type === 'link-array') {
    const items = state.content[f.name] || [{ label: '', url: '' }];
    return `<div class="field"><label>${f.label}</label>
      <div data-array="${f.name}">${items.map((v, i) => `
        <div class="link-array-row">
          <input placeholder="Label" value="${(v.label || '').replace(/"/g, '&quot;')}" data-array-obj="${f.name}" data-key="label" data-idx="${i}"/>
          <input placeholder="https://…" value="${(v.url || '').replace(/"/g, '&quot;')}" data-array-obj="${f.name}" data-key="url" data-idx="${i}"/>
          <button type="button" class="array-remove" data-array-remove="${f.name}" data-idx="${i}">×</button>
        </div>`).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm" data-array-add-obj="${f.name}" data-shape="label,url">+ Add link</button>
    </div>`;
  }
  if (f.type === 'social-array') {
    const platforms = ['Instagram', 'Facebook', 'X (Twitter)', 'TikTok', 'YouTube', 'LinkedIn', 'Website'];
    const items = state.content[f.name] || [{ platform: 'Instagram', url: '' }];
    return `<div class="field"><label>${f.label}</label>
      <div data-array="${f.name}">${items.map((v, i) => `
        <div class="social-array-row">
          <select data-array-obj="${f.name}" data-key="platform" data-idx="${i}" style="width:130px">
            ${platforms.map((p) => `<option ${v.platform === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
          <input placeholder="https://…" value="${(v.url || '').replace(/"/g, '&quot;')}" data-array-obj="${f.name}" data-key="url" data-idx="${i}"/>
          <button type="button" class="array-remove" data-array-remove="${f.name}" data-idx="${i}">×</button>
        </div>`).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm" data-array-add-obj="${f.name}" data-shape="platform,url">+ Add profile</button>
    </div>`;
  }
  if (f.type === 'menu-array') {
    const items = state.content[f.name] || [{ name: '', price: '', description: '' }];
    return `<div class="field"><label>${f.label}</label>
      <div data-array="${f.name}">${items.map((v, i) => `
        <div class="menu-item-block">
          <div class="field-row">
            <input placeholder="Item name" value="${(v.name || '').replace(/"/g, '&quot;')}" data-array-obj="${f.name}" data-key="name" data-idx="${i}"/>
            <input placeholder="Price" value="${(v.price || '').replace(/"/g, '&quot;')}" data-array-obj="${f.name}" data-key="price" data-idx="${i}" style="max-width:100px"/>
          </div>
          <input placeholder="Description (optional)" value="${(v.description || '').replace(/"/g, '&quot;')}" data-array-obj="${f.name}" data-key="description" data-idx="${i}" style="margin-top:8px"/>
          <button type="button" class="btn btn-ghost btn-sm" data-array-remove="${f.name}" data-idx="${i}" style="margin-top:8px;color:#E03131">Remove item</button>
        </div>`).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm" data-array-add-obj="${f.name}" data-shape="name,price,description">+ Add menu item</button>
    </div>`;
  }
  return `<div class="field"><label>${f.label}</label><input type="${f.type}" data-field="${f.name}" placeholder="${f.placeholder || ''}" value="${(val || '').toString().replace(/"/g, '&quot;')}"/></div>`;
}

function renderContentForm() {
  const type = TYPES.find((t) => t.key === state.qrType);
  if (!type) return;
  document.getElementById('type-desc').textContent = type.description;
  // apply defaults
  type.fields.forEach((f) => {
    if (f.default !== undefined && state.content[f.name] === undefined) state.content[f.name] = f.default;
  });
  const form = document.getElementById('content-form');
  form.innerHTML = type.fields.map(fieldHtml).join('');

  form.querySelectorAll('[data-field]').forEach((el) => {
    const evt = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      state.content[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value;
      updatePreview();
    });
  });
  form.querySelectorAll('[data-array-field]').forEach((el) => {
    el.addEventListener('input', () => {
      const arr = state.content[el.dataset.field] || [];
      arr[Number(el.dataset.idx)] = el.value;
      state.content[el.dataset.field] = arr;
      updatePreview();
    });
  });
  form.querySelectorAll('[data-array-obj]').forEach((el) => {
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      const arr = state.content[el.dataset.arrayObj] || [];
      arr[Number(el.dataset.idx)] = arr[Number(el.dataset.idx)] || {};
      arr[Number(el.dataset.idx)][el.dataset.key] = el.value;
      state.content[el.dataset.arrayObj] = arr;
      updatePreview();
    });
  });
  form.querySelectorAll('[data-array-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const arr = state.content[btn.dataset.arrayAdd] || [];
      arr.push('');
      state.content[btn.dataset.arrayAdd] = arr;
      renderContentForm();
    });
  });
  form.querySelectorAll('[data-array-add-obj]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const shape = btn.dataset.shape.split(',');
      const obj = {};
      shape.forEach((k) => (obj[k] = ''));
      const arr = state.content[btn.dataset.arrayAddObj] || [];
      arr.push(obj);
      state.content[btn.dataset.arrayAddObj] = arr;
      renderContentForm();
    });
  });
  form.querySelectorAll('[data-array-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const arr = state.content[btn.dataset.arrayRemove] || [];
      arr.splice(Number(btn.dataset.idx), 1);
      state.content[btn.dataset.arrayRemove] = arr;
      renderContentForm();
      updatePreview();
    });
  });
}

// ---------------- Style panel wiring ----------------
document.querySelectorAll('.style-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.style-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.style-pane').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.pane).classList.add('active');
  });
});

document.getElementById('fg-color').addEventListener('input', (e) => { state.style.fgColor = e.target.value; updatePreview(); });
document.getElementById('bg-color').addEventListener('input', (e) => { state.style.bgColor = e.target.value; updatePreview(); });

function wirePillRow(id, key) {
  document.querySelectorAll(`#${id} .pill-choice`).forEach((p) => {
    p.addEventListener('click', () => {
      document.querySelectorAll(`#${id} .pill-choice`).forEach((x) => x.classList.remove('active'));
      p.classList.add('active');
      if (key === 'frame') {
        // state.style.frame is an object ({ style, text }), not a scalar like the
        // other pill rows - mutate its .style field in place instead of clobbering
        // the whole object with a bare string (that used to break the frame text
        // and the "None" option entirely).
        state.style.frame.style = p.dataset.val;
        document.getElementById('frame-text-field').style.display = p.dataset.val === 'none' ? 'none' : '';
      } else {
        state.style[key] = p.dataset.val;
      }
      updatePreview();
    });
  });
}
wirePillRow('dot-style-row', 'dotStyle');
wirePillRow('corner-style-row', 'cornerStyle');
wirePillRow('frame-style-row', 'frame');

document.getElementById('frame-text').addEventListener('input', (e) => { state.style.frame.text = e.target.value; updatePreview(); });

document.getElementById('logo-drop').addEventListener('click', () => document.getElementById('logo-file').click());
document.getElementById('logo-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.style.logoUrl = reader.result; // data URL for instant preview
    document.getElementById('logo-preview').innerHTML = `<img src="${reader.result}" style="height:40px;border-radius:6px"/>`;
    document.getElementById('logo-remove').style.display = '';
    updatePreview();
  };
  reader.readAsDataURL(file);
  // Also upload to the server so a persistent URL is stored with the code.
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) state.style.logoUrl = data.url;
  } catch (err) { /* keep the data URL fallback */ }
});
document.getElementById('logo-remove').addEventListener('click', () => {
  state.style.logoUrl = null;
  document.getElementById('logo-preview').innerHTML = 'Click to upload a logo (optional)';
  document.getElementById('logo-remove').style.display = 'none';
  updatePreview();
});

// ---------------- Mode toggle ----------------
document.querySelectorAll('.mode-toggle button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-toggle button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    document.getElementById('mode-help').textContent = state.mode === 'dynamic'
      ? 'Trackable, editable after printing.'
      : 'Content is baked into the code — works offline, but can’t be changed later.';
    updatePreview();
  });
});

document.getElementById('qr-title').addEventListener('input', (e) => { state.title = e.target.value; });

// ---------------- Download ----------------
async function exportWithFrame(format) {
  const raw = await qrCode.getRawData(format === 'jpeg' ? 'jpeg' : 'png');
  const url = URL.createObjectURL(raw);
  const img = new Image();
  await new Promise((resolve) => { img.onload = resolve; img.src = url; });
  const frame = state.style.frame;
  const pad = 24;
  const bannerH = frame.style !== 'none' ? 56 : 0;
  const canvas = document.createElement('canvas');
  canvas.width = img.width + pad * 2;
  canvas.height = img.height + pad * 2 + bannerH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = state.style.bgColor || '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const qrY = frame.style === 'top-banner' ? pad + bannerH : pad;
  ctx.drawImage(img, pad, qrY, img.width, img.height);
  if (frame.style !== 'none') {
    ctx.fillStyle = state.style.fgColor;
    const bannerY = frame.style === 'top-banner' ? 0 : img.height + pad * 2;
    ctx.fillRect(0, bannerY, canvas.width, bannerH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frame.text || 'SCAN ME', canvas.width / 2, bannerY + bannerH / 2);
  }
  URL.revokeObjectURL(url);
  return canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

document.querySelectorAll('[data-format]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const fmt = btn.dataset.format;
    const filenameBase = (state.title || 'qrcode').replace(/[^a-z0-9\-]+/gi, '_');
    if (fmt === 'svg') {
      await qrCode.download({ name: filenameBase, extension: 'svg' });
      return;
    }
    const dataUrl = await exportWithFrame(fmt);
    triggerDownload(dataUrl, `${filenameBase}.${fmt === 'jpeg' ? 'jpg' : 'png'}`);
  });
});

// ---------------- Save ----------------
document.getElementById('save-btn').addEventListener('click', async () => {
  if (!currentUser) { location.href = '/signup'; return; }
  const statusEl = document.getElementById('save-status');
  statusEl.textContent = 'Saving…';
  try {
    const payload = {
      title: state.title || 'Untitled QR Code',
      qrType: state.qrType,
      mode: state.mode,
      content: state.content,
      style: state.style,
      folderId: state.folderId,
    };
    let result;
    if (state.id) {
      result = await api(`/qrcodes/${state.id}`, { method: 'PUT', body: payload });
    } else {
      result = await api('/qrcodes', { method: 'POST', body: payload });
      state.id = result.qrcode.id;
    }
    statusEl.textContent = 'Saved just now';
    setTimeout(() => (statusEl.textContent = ''), 2500);
  } catch (err) {
    statusEl.textContent = '';
    alert(err.message);
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => { await api('/logout', { method: 'POST' }); location.href = '/'; });

// ---------------- Boot ----------------
async function boot() {
  const [{ types }, meRes] = await Promise.all([
    fetch('/api/qr-types').then((r) => r.json()),
    api('/me').catch(() => ({ user: null })),
  ]);
  TYPES = types;
  currentUser = meRes.user;
  document.getElementById('auth-hint').style.display = currentUser ? 'none' : '';
  document.getElementById('logout-btn').style.display = currentUser ? '' : 'none';

  if (editId) {
    try {
      const { qrcode } = await api(`/qrcodes/${editId}`);
      state.id = qrcode.id;
      state.title = qrcode.title;
      state.qrType = qrcode.qr_type;
      state.mode = qrcode.mode;
      state.content = qrcode.content || {};
      state.style = Object.assign(state.style, qrcode.style || {});
      document.getElementById('qr-title').value = state.title;
      document.querySelectorAll('.mode-toggle button').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
      document.getElementById('fg-color').value = state.style.fgColor;
      document.getElementById('bg-color').value = state.style.bgColor;
    } catch (e) { /* fall through with defaults */ }
  }

  renderTypePicker();
  renderContentForm();
  updatePreview();
}
boot();
