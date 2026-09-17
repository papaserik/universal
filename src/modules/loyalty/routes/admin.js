const router = require('express').Router();
const controller = require('../controller-admin');

router.get('/settings',      controller.settings);
router.post('/settings',     controller.saveSettings);

router.get('/levels',        controller.levels);
router.get('/levels/new',    controller.levelForm);
router.get('/levels/:id',    controller.levelForm);
router.post('/levels',       controller.levelSave);
router.post('/levels/:id',   controller.levelSave);
router.post('/levels/:id/delete', controller.levelRemove);

router.get('/transactions',  controller.transactions);
router.post('/transactions/manual', controller.addManual);
router.get('/user-balance',  controller.userBalance);

module.exports = router;
