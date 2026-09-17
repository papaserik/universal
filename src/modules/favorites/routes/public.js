const router = require('express').Router();
const controller = require('../controller');

// ─── API ───
// Монтируется на /api/favorites
router.post('/toggle', controller.toggle);
router.get('/ids', controller.listIds);

// ─── Страница избранного ───
// Монтируется на /favorites и /account/favorites
router.get('/', (req, res, next) => {
  // На /account/favorites нужна авторизация
  if (req.baseUrl === '/account/favorites') {
    if (!req.session.user) return res.redirect('/login');
  }
  next();
}, controller.page);

module.exports = router;
