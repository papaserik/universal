const path = require('path');
module.exports = {
  meta: require('./module.json'),
  adminRoutes: require('./routes/admin'),
  viewsPath: path.join(__dirname, 'views')
};
