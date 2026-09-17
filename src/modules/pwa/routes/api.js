const router = require('express').Router();
const modules = require('../../../services/modules');

router.get('/status', async (req, res) => {
  try {
    const enabled = await modules.isEnabled('pwa');
    res.set('Cache-Control', 'no-store');
    res.json({ enabled });
  } catch (e) {
    res.json({ enabled: false });
  }
});

module.exports = router;
