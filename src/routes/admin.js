const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
router.use(requireAuth);
router.get('/', (req, res) => res.render('admin/dashboard', { stats: {} }));
module.exports = router;
