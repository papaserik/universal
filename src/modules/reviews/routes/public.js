const router = require('express').Router();
const controller = require('../controller-public');

router.post('/product/:productId/review', controller.submit);

module.exports = router;
