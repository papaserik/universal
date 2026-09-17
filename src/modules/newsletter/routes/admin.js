const router = require('express').Router();
const marketing = require('../controller-admin/marketing');

router.get('/marketing/subscribers', marketing.subscribers);
router.get('/marketing/subscribers/export', marketing.subscribersExport);
router.get('/marketing/subscribers/new', marketing.subscriberForm);
router.get('/marketing/subscribers/:id', marketing.subscriberForm);
router.post('/marketing/subscribers', marketing.subscriberSave);
router.post('/marketing/subscribers/:id', marketing.subscriberSave);
router.post('/marketing/subscribers/:id/delete', marketing.subscriberRemove);

router.get('/marketing/newsletters', marketing.newsletters);
router.get('/marketing/newsletters/new', marketing.newsletterForm);
router.get('/marketing/newsletters/:id', marketing.newsletterForm);
router.post('/marketing/newsletters', marketing.newsletterSave);
router.post('/marketing/newsletters/:id', marketing.newsletterSave);
router.post('/marketing/newsletters/:id/delete', marketing.newsletterRemove);
router.post('/marketing/newsletters/:id/send', marketing.newsletterSend);

module.exports = router;
