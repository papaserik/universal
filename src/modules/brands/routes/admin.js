const router = require('express').Router();
const controller = require('../controller-admin');

router.get('/',            controller.list);
router.get('/new',         controller.form);
router.get('/:id',         controller.form);
router.post('/',           controller.save);
router.post('/:id',        controller.save);
router.post('/:id/toggle', controller.toggle);
router.post('/:id/delete', controller.remove);

module.exports = router;
