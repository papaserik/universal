// ═══════════════════════════════════════════════
// Модуль: Бренды
// ═══════════════════════════════════════════════
const path = require('path');

module.exports = {
  meta: require('./module.json'),
  adminRoutes: require('./routes/admin'),
  adminPath: 'brands',
  viewsPath: path.join(__dirname, 'views')
};
