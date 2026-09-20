// Shared helpers used across every page: current-user aware nav, small fetch wrapper.

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

async function refreshNavAuthState() {
  const guestEls = document.querySelectorAll('[data-nav="guest"]');
  const userEls = document.querySelectorAll('[data-nav="user"]');
  try {
    const { user } = await api('/me');
    if (user) {
      guestEls.forEach((el) => (el.style.display = 'none'));
      userEls.forEach((el) => (el.style.display = ''));
      document.querySelectorAll('[data-nav="user-name"]').forEach((el) => (el.textContent = user.name));
    } else {
      guestEls.forEach((el) => (el.style.display = ''));
      userEls.forEach((el) => (el.style.display = 'none'));
    }
    return user;
  } catch (e) {
    guestEls.forEach((el) => (el.style.display = ''));
    userEls.forEach((el) => (el.style.display = 'none'));
    return null;
  }
}

function logoSvgMarkup() {
  return '<span class="logo-mark">Q</span>';
}

const QR_ICONS = {
  link: '🔗', list: '📋', share: '📣', briefcase: '💼', menu: '🍽️', tag: '🏷️',
  star: '⭐', contact: '👤', id: '🪪', mail: '✉️', phone: '📞', message: '💬',
  whatsapp: '🟢', pin: '📍', calendar: '📅', wifi: '📶', app: '📱', pdf: '📄',
  image: '🖼️', video: '🎬', text: '📝',
};
function qrIcon(key) { return QR_ICONS[key] || '🔳'; }

document.addEventListener('DOMContentLoaded', refreshNavAuthState);
