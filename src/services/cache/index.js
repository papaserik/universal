// ═══════════════════════════════════════════════
// In-memory кеш с TTL
// ═══════════════════════════════════════════════

const store = new Map();
let stats = { hits: 0, misses: 0, sets: 0, evicts: 0 };

function get(key) {
  const entry = store.get(key);
  if (!entry) { stats.misses++; return null; }
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    store.delete(key);
    stats.evicts++;
    stats.misses++;
    return null;
  }
  stats.hits++;
  return entry.value;
}

function set(key, value, ttlMs = 60 * 1000) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    createdAt: Date.now()
  });
  stats.sets++;
}

function del(key) {
  store.delete(key);
}

function delByPrefix(prefix) {
  let count = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      count++;
    }
  }
  return count;
}

function clear() {
  const size = store.size;
  store.clear();
  stats.evicts += size;
  return size;
}

function size() { return store.size; }
function getStats() { return { ...stats, size: store.size }; }
function resetStats() { stats = { hits: 0, misses: 0, sets: 0, evicts: 0 }; }

// ─── Middleware: HTML-кеш публичных страниц ───
async function pageCacheMiddleware(req, res, next) {
  // Проверяем, включён ли модуль кеша
  try {
    const modules = require('../modules');
    const enabled = await modules.isEnabled('cache');
    if (!enabled) return next();
  } catch (e) { return next(); }

  // Только GET
  if (req.method !== 'GET') return next();

  // Только публичные страницы
  const path = req.path;
  const excluded = ['/admin', '/api', '/account', '/cart', '/checkout', '/login', '/logout', '/register', '/r/'];
  if (excluded.some(p => path.startsWith(p))) return next();

  // Только HTML (не файлы)
  if (/\.(css|js|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|xml|json|txt)$/i.test(path)) return next();

  // Только анонимные пользователи (для авторизованных — свой контент)
  if (req.session && req.session.user) return next();

  const cacheKey = 'page:' + path + ':' + (req.url.includes('?') ? req.url.split('?')[1] : '');

  const cached = get(cacheKey);
  if (cached) {
    res.set('X-Cache', 'HIT');
    res.set('X-Cache-Key', cacheKey);
    return res.type('html').send(cached);
  }

  // Перехватываем render
  const originalRender = res.render.bind(res);
  res.render = function (view, locals, cb) {
    res.set('X-Cache', 'MISS');
    originalRender(view, locals, (err, html) => {
      if (err) return next(err);
      if (res.statusCode === 200 && html) {
        const ttl = parseInt(process.env.CACHE_PAGES_TTL || '300', 10) * 1000;
        set(cacheKey, html, ttl);
      }
      if (cb) cb(null, html);
      else res.send(html);
    });
  };

  next();
}

module.exports = {
  get, set, del, delByPrefix, clear, size, getStats, resetStats,
  pageCacheMiddleware
};
