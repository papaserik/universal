const router = require('express').Router();
const controller = require('../controller-admin');

router.get('/',             controller.list);
router.post('/:id/approve', controller.approve);
router.post('/:id/reject',  controller.reject);
router.post('/:id/delete',  controller.remove);

module.exports = router;
