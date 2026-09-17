const router = require('express').Router();
const controller = require('../controller-admin');

router.get('/', controller.index);
router.post('/save', controller.save);
router.post('/clear', controller.clear);

module.exports = router;
