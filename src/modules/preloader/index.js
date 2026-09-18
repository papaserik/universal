const path = require('path');
module.exports = {
  meta:        require('./module.json'),
  service:     require('./service'),
  adminRoutes: require('./routes/admin'),
  viewsPath:   path.join(__dirname, 'views'),
  publicPath:  path.join(__dirname, 'public'),
  staticUrl:   '/modules/preloader',
};
