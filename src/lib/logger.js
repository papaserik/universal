// Мини-логгер без зависимостей.
// Уровни: debug < info < warn < error
// Управление: LOG_LEVEL=debug|info|warn|error (default: info в prod, debug в dev)

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const env = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const minLevel = LEVELS[env] || LEVELS.info;

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
function fmt(level, args) {
  const prefix = `[${ts()}] ${level.toUpperCase()}`;
  return [prefix, ...args];
}
function log(level, args) {
  if (LEVELS[level] < minLevel) return;
  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[method](...fmt(level, args));
}

module.exports = {
  debug: (...a) => log('debug', a),
  info:  (...a) => log('info',  a),
  warn:  (...a) => log('warn',  a),
  error: (...a) => log('error', a),
};
