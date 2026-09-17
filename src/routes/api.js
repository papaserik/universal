const router = require('express').Router();
router.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));
router.get('/search/suggest', require('../controllers/api/search').suggest);
// ─── Модуль: Push (API) ───
router.use('/push', require('../modules/push/routes/api'));

// ─── Модуль: PWA ───
router.use('/pwa', require('../modules/pwa/routes/api'));

module.exports = router;
