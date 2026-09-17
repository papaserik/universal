const router = require('express').Router();
const controller = require('../controller-admin');

router.get('/',                controller.index);
router.post('/broadcast',      controller.broadcast);
router.post('/:id/delete',     controller.remove);
router.post('/run-carts',      async (req, res) => {
  try {
    const r = await require('../service/cron').runNow('carts');
    res.json(r);
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/run-digest',     async (req, res) => {
  try {
    const r = await require('../service/cron').runNow('digest');
    res.json(r);
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

module.exports = router;
