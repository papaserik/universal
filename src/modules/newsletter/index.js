const path = require('path');
module.exports = {
  meta:        require('./module.json'),
  service:     require('./service/newsletter'),
  adminRoutes: require('./routes/admin'),
  viewsPath:   path.join(__dirname, 'views')
};
