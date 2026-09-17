const router = require('express').Router();
const controller = require('../controller-api');

router.get('/public-key',  controller.publicKey);
router.post('/subscribe',  controller.subscribe);
router.post('/unsubscribe', controller.unsubscribe);
router.get('/status',      controller.status);
router.post('/test',       controller.test);

module.exports = router;
