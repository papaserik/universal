const router = require('express').Router();
const controller = require('../controller-admin');
const { imageUpload, processUploaded } = require('../../../services/upload');

// ВАЖНО: /upload и /new ОБЯЗАТЕЛЬНО выше /:id,
// иначе Express матчит 'upload' / 'new' как id

// ── Upload ──
router.post('/upload', imageUpload.array('files', 1), processUploaded, controller.uploadImage);

// ── List / New ──
router.get('/',    controller.list);
router.get('/new', controller.form);

// ── Actions (с :id) ──
router.post('/:id/toggle', controller.toggle);
router.post('/:id/delete', controller.remove);

// ── Save (POST) ──
router.post('/',    controller.save);
router.post('/:id', controller.save);

// ── Form (GET :id — В КОНЦЕ, чтобы не перебивать /new и /upload) ──
router.get('/:id', controller.form);

module.exports = router;
