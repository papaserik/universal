// ═══════════════════════════════════════════════
// Модуль: Push-уведомления
// ═══════════════════════════════════════════════
const path = require('path');

module.exports = {
  meta: require('./module.json'),

  // Сервис (для использования в других модулях)
  service: require('./service'),

  // Cron-задачи
  cron: require('./service/cron'),

  // Роуты
  adminRoutes: require('./routes/admin'),
  apiRoutes: require('./routes/api'),

  // Статика
  publicPath: path.join(__dirname, 'public'),
  staticUrl: '/modules/push',

  // Views
  viewsPath: path.join(__dirname, 'views')
};
