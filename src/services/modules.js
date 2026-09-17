const { prisma } = require('../config/db');

// ─── Реестр модулей ───
// core: true — нельзя отключить (базовая часть магазина)
const MODULES = [
  // Каталог
  { code: 'brands',         name: 'Бренды',                desc: 'Производители товаров с фильтрацией и выводом на карточке', group: 'catalog', icon: '🏢' },
  { code: 'tags',           name: 'Теги',                  desc: 'Метки товаров: «Новинка», «Хит», «Скидка»',                group: 'catalog', icon: '🏷️' },
  { code: 'filters',        name: 'Фильтры в каталоге',    desc: 'Фильтрация по опциям, брендам, тегам, цене',                group: 'catalog', icon: '🎛' },
  { code: 'marketplaces',   name: 'Маркетплейсы',          desc: 'Кнопки «Купить на Ozon/WB» со ссылками',                    group: 'catalog', icon: '🏪' },
  { code: 'marketplace_sync', name: 'Синхронизация с МП',    desc: 'Импорт/экспорт каталога с Ozon, Wildberries, Яндекс.Маркет', group: 'catalog', icon: '🔄' },
  { code: 'import',         name: 'Импорт товаров',        desc: 'Импорт товаров из XLSX / YML / XML',                        group: 'catalog', icon: '📥' },

  // Контент
  { code: 'blog',           name: 'Блог',                  desc: 'Статьи, категории блога, авторство',                        group: 'content', icon: '📝' },
  { code: 'banners',        name: 'Баннеры на главной',    desc: 'Рекламные баннеры с расписанием и картинками',              group: 'content', icon: '🖼' },

  // Маркетинг
  { code: 'loyalty',        name: 'Баллы и уровни',        desc: 'Кэшбэк баллами, оплата баллами, уровни Bronze→Platinum',    group: 'marketing', icon: '🎁' },
  { code: 'club',           name: 'Клуб (рефералы)',       desc: 'Приглашайте друзей, получайте баллы за их покупки',         group: 'marketing', icon: '👥' },
  { code: 'newsletter',     name: 'Рассылки',              desc: 'Подписка, email-рассылки, экспорт подписчиков',             group: 'marketing', icon: '📨' },
  { code: 'reviews',        name: 'Отзывы',                desc: 'Отзывы с модерацией, рейтинг товаров, баллы за отзыв',      group: 'marketing', icon: '💬' },

  // Клиентские
  { code: 'favorites',      name: 'Избранное',             desc: 'Сердечко на карточках и страница избранного',              group: 'customer', icon: '❤️' },
  { code: 'gift',           name: 'Заказы-подарки',        desc: 'Отправка заказа другому человеку с поздравлением',         group: 'customer', icon: '🎀' },
  { code: 'search_suggest', name: 'Подсказки поиска',      desc: 'Автодополнение при вводе в поиске',                        group: 'customer', icon: '🔍' },

  // Система
  { code: 'image_optimize', name: 'Оптимизация изображений', desc: 'Автосжатие, WebP, миниатюры при загрузке',               group: 'system',  icon: '🖼' },
  { code: 'pwa',            name: 'PWA (установка на телефон)', desc: 'Установка магазина как приложения: манифест, offline-режим, кеш, кнопка установки', group: 'system', icon: '📲' }
];

const CACHE_TTL = 30 * 1000; // 30 секунд

// Кеш всех включённых модулей
let cache = null;
let cacheTime = 0;

async function loadAll() {
  const now = Date.now();
  if (cache && (now - cacheTime) < CACHE_TTL) return cache;

  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: 'module_' } }
  });

  const state = {};
  for (const m of MODULES) {
    const s = settings.find(x => x.key === 'module_' + m.code);
    state[m.code] = s ? s.value === '1' : true; // по умолчанию включено
  }
  cache = state;
  cacheTime = now;
  return state;
}

async function isEnabled(code) {
  const all = await loadAll();
  return all[code] !== false;
}

function invalidate() {
  cache = null;
  cacheTime = 0;
}

// Получить список для админки
async function listWithState() {
  const state = await loadAll();
  return MODULES.map(m => ({ ...m, enabled: state[m.code] !== false }));
}

module.exports = { MODULES, isEnabled, loadAll, invalidate, listWithState };
