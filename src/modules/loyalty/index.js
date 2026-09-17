const path = require('path');
module.exports = {
  meta: require('./module.json'),
  service: require('./service'),
  adminRoutes: require('./routes/admin'),
  accountRoutes: require('./routes/account'),
  viewsPath: path.join(__dirname, 'views')
};
