const path = require('path');
module.exports = {
  meta: require('./module.json'),
  service: require('./service'),
  middleware: require('./middleware'),
  accountRoutes: require('./routes/account'),
  viewsPath: path.join(__dirname, 'views')
};
