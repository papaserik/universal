const path = require('path');
module.exports = {
  meta: require('./module.json'),
  apiRoutes: require('./routes/api'),
  publicPath: path.join(__dirname, 'public'),
  staticUrl: '/modules/pwa'
};
