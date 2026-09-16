const router = require('express').Router();
router.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));
module.exports = router;
