const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

// Кеш версий по пути
const versionCache = new Map();

/**
 * Возвращает URL с версией: /css/base.css?v=1700000000
 * Версия = mtime файла (обновляется при изменении файла).
 */
function asset(url) {
  if (!url) return url;
  if (url.startsWith('http')) return url;

  const cleanUrl = url.split('?')[0];
  const filePath = path.join(PUBLIC_DIR, cleanUrl.replace(/^\//, ''));

  let version = versionCache.get(filePath);
  if (!version) {
    try {
      const stat = fs.statSync(filePath);
      version = Math.floor(stat.mtimeMs);
      versionCache.set(filePath, version);
    } catch (e) {
      version = '1';
    }
  }

  return cleanUrl + '?v=' + version;
}

module.exports = { asset };
