// Точка входа: cluster-режим на проде, одиночный процесс в dev.
const cluster = require('cluster');
const os = require('os');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';
const wantCluster = process.env.CLUSTER === '1' || (isProd && process.env.CLUSTER !== '0');
const workers = parseInt(process.env.WORKERS || '0', 10) || Math.min(os.cpus().length, 4);

if (wantCluster && cluster.isPrimary) {
  const logger = require('./src/lib/logger');
  logger.info(`[cluster] primary ${process.pid}, forks: ${workers}`);
  for (let i = 0; i < workers; i++) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`[cluster] worker ${worker.process.pid} died (${signal || code}), restarting...`);
    cluster.fork();
  });
} else {
  require('./src/app').listen(process.env.PORT || 3000, () => {
    const logger = require('./src/lib/logger');
    logger.info(`Shop running: http://localhost:${process.env.PORT || 3000} (pid ${process.pid})`);
  });
}
