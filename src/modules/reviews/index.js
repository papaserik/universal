const path = require('path');
module.exports = {
  meta: require('./module.json'),
  adminRoutes: require('./routes/admin'),
  publicRoutes: require('./routes/public'),
  viewsPath: path.join(__dirname, 'views')
};
