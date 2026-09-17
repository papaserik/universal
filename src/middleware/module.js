const modules = require('../services/modules');

// Блокирует роут, если модуль выключен
function requireModule(code) {
  return async (req, res, next) => {
    const enabled = await modules.isEnabled(code);
    if (!enabled) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(404).json({ ok: false, error: 'Модуль отключён' });
      }
      return res.status(404).render('errors/404');
    }
    next();
  };
}

module.exports = { requireModule };
