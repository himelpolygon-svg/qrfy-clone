const UAParser = require('ua-parser-js');
const fetch = require('node-fetch');
const db = require('../db');

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  let ip = (fwd ? fwd.split(',')[0].trim() : req.socket.remoteAddress) || '';
  ip = ip.replace('::ffff:', '');
  return ip;
}

const geoCache = new Map();

async function lookupGeo(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
    return { country: 'Local', city: 'Local network' };
  }
  if (geoCache.has(ip)) return geoCache.get(ip);
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller.signal });
    clearTimeout(t);
    const data = await resp.json();
    const result = { country: data.country_name || 'Unknown', city: data.city || '' };
    geoCache.set(ip, result);
    return result;
  } catch (e) {
    return { country: 'Unknown', city: '' };
  }
}

// Logs a scan immediately (device/browser/os are synchronous), then fills in
// geo-location asynchronously once the lookup resolves so the redirect is never
// slowed down by a third-party API call.
function logScan(qrcodeId, req) {
  const ua = new UAParser(req.headers['user-agent'] || '');
  const device = ua.getDevice().type || 'desktop';
  const browser = ua.getBrowser().name || 'Unknown';
  const os = ua.getOS().name || 'Unknown';
  const ip = getIp(req);

  const info = db.prepare(`
    INSERT INTO scans (qrcode_id, ip, device, browser, os, country, city)
    VALUES (?, ?, ?, ?, ?, 'Looking up...', '')
  `).run(qrcodeId, ip, device, browser, os);

  lookupGeo(ip).then(({ country, city }) => {
    db.prepare('UPDATE scans SET country = ?, city = ? WHERE id = ?').run(country, city, info.lastInsertRowid);
  }).catch(() => {});

  return info.lastInsertRowid;
}

module.exports = { logScan, getIp };
