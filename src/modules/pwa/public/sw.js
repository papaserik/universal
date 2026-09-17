// ═══════════════════════════════════════════════
// Service Worker для Universal Shop
// ═══════════════════════════════════════════════

const VERSION = 'v202609180001';
const CACHE_STATIC  = 'shop-static-'  + VERSION;
const CACHE_IMAGES  = 'shop-images-'  + VERSION;
const CACHE_PAGES   = 'shop-pages-'   + VERSION;
const CACHE_OFFLINE = 'shop-offline-' + VERSION;

// Что кешируем сразу при установке
const PRECACHE_URLS = [
  '/',
  '/modules/pwa/offline.html',
  '/modules/pwa/manifest.json',

  '/js/base.js',
  '/js/info-tips.js',
  '/js/favorites.js',
  '/modules/pwa/icons/icon-192.png',
  '/modules/pwa/icons/icon-512.png',
  '/modules/pwa/icons/favicon-32.png'
];

// Публичные страницы — кешируем динамически
const CACHEABLE_PATHS = [
  '/',
  '/catalog',
  '/blog',
  '/contacts',
  '/product/',
  '/page/'
];

// ─── Установка ───
self.addEventListener('install', (event) => {
  console.log('[SW] install', VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ─── Активация: удаляем старые версии ───
self.addEventListener('activate', (event) => {
  console.log('[SW] activate', VERSION);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => !k.endsWith(VERSION))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Классификация запросов ───
function isImage(url) {
  return /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname);
}

function isStatic(url) {
  return /\.(css|js|woff2?|ttf|eot|json|webmanifest)$/i.test(url.pathname);
}

function isApi(url) {
  return url.pathname.startsWith('/api/');
}

function isAdmin(url) {
  return url.pathname.startsWith('/admin');
}

function isPrivate(url) {
  return url.pathname.startsWith('/account') ||
         url.pathname.startsWith('/cart') ||
         url.pathname.startsWith('/checkout') ||
         url.pathname.startsWith('/login') ||
         url.pathname.startsWith('/logout');
}

function isCacheablePage(url) {
  if (isAdmin(url) || isPrivate(url) || isApi(url)) return false;
  return CACHEABLE_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(p));
}

// ─── Fetch: стратегии ───
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isAdmin(url) || isApi(url) || isPrivate(url)) return;

  // 1. Картинки — Cache First
  if (isImage(url)) {
    event.respondWith(
      caches.open(CACHE_IMAGES).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // 2. Статика (CSS/JS/шрифты) — Cache First
  if (isStatic(url)) {
    event.respondWith(
      caches.open(CACHE_STATIC).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // 3. HTML-страницы витрины — Network First с fallback на кеш
  if (req.mode === 'navigate' && isCacheablePage(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_PAGES).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            if (cached) return cached;
            // Офлайн-страница
            return caches.match('/modules/pwa/offline.html');
          });
        })
    );
    return;
  }
});

// ─── Сообщения от страницы (например, для update) ───
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ═══════════════════════════════════════════════
// PUSH-УВЕДОМЛЕНИЯ
// ═══════════════════════════════════════════════

// Приём push-сообщения
self.addEventListener('push', (event) => {
  let data = {
    title: 'Universal Shop',
    body: 'Новое уведомление',
    icon: '/modules/pwa/icons/icon-192.png',
    badge: '/modules/pwa/icons/icon-192.png',
    url: '/',
    tag: 'default'
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = Object.assign(data, payload);
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: { url: data.url },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false
  };

  // Действия (кнопки)
  if (data.actions && Array.isArray(data.actions)) {
    options.actions = data.actions;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) || '/';
  const action = event.action;

  // Обработка действий
  let targetUrl = url;
  if (action === 'open_cart') targetUrl = '/cart';
  if (action === 'open_orders') targetUrl = '/account/orders';
  if (action === 'open_catalog') targetUrl = '/catalog';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Если есть открытая вкладка нашего сайта — фокусируемся
        for (const client of clients) {
          if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Иначе открываем новую
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Закрытие уведомления
self.addEventListener('notificationclose', (event) => {
  // Можно отправить аналитику
  console.log('[SW] Уведомление закрыто:', event.notification.tag);
});
