// ═══════════════════════════════════════════════
// Модуль: Избранное
// ═══════════════════════════════════════════════
const path = require('path');

module.exports = {
  meta: require('./module.json'),
  publicRoutes: require('./routes/public'),
  publicPath: path.join(__dirname, 'public'),
  staticUrl: '/modules/favorites'
};
