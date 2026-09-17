// ═══════════════════════════════════════════════
// Модуль: Кеширование
// ═══════════════════════════════════════════════
const path = require('path');

module.exports = {
  // Метаданные
  meta: require('./module.json'),

  // Сервис (для использования в других модулях)
  service: require('./service'),

  // Cache busting helper
  asset: require('./asset').asset,

  // Роуты админки
  adminRoutes: require('./routes/admin'),

  // Middleware (подключается в app.js)
  middleware: require('./service').pageCacheMiddleware,

  // Путь к views (для app.js — добавляет в search paths)
  viewsPath: path.join(__dirname, 'views')
};
