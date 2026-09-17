require('dotenv').config();
const app = require('./app');
const logger = require('./lib/logger');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.debug(`🚀 Shop running: http://localhost:${PORT}`));
