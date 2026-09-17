const router = require('express').Router();
const controller = require('../controller-admin');
const { imageUpload, processUploaded } = require('../../../services/upload');

router.get('/',            controller.list);
router.get('/new',         controller.form);
router.get('/:id',         controller.form);
router.post('/',           controller.save);
router.post('/:id',        controller.save);
router.post('/:id/toggle', controller.toggle);
router.post('/:id/delete', controller.remove);
router.post('/upload',     imageUpload.array('files', 1), processUploaded, controller.uploadImage);

module.exports = router;
