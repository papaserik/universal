const router = require('express').Router();
const ctrl = require('../controller-admin');

router.get('/',  ctrl.form);
router.post('/', ctrl.save);

module.exports = router;
