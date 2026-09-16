const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const roles = require('../middleware/roles');
const { imageUpload, importUpload } = require('../services/upload');

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.session.user.role === 'USER') return res.status(403).render('errors/403');
  next();
});

const dashboard = require('../controllers/admin/dashboard');
const categories = require('../controllers/admin/categories');
const options    = require('../controllers/admin/options');
const products   = require('../controllers/admin/products');
const orders     = require('../controllers/admin/orders');
const users      = require('../controllers/admin/users');
const blog       = require('../controllers/admin/blog');
const pages      = require('../controllers/admin/pages');
const settings   = require('../controllers/admin/settings');
const importer   = require('../controllers/admin/import');
const delivery   = require('../controllers/admin/delivery');
const blogCats   = require('../controllers/admin/blogCategories');
const sales      = require('../controllers/admin/sales');
const abandoned  = require('../controllers/admin/abandoned');
const marketplaces = require('../controllers/admin/marketplaces');
const marketing  = require('../controllers/admin/marketing');
const payment    = require('../controllers/admin/payment');
const ordersExport = require('../controllers/admin/ordersExport');

router.get('/', dashboard.index);
router.get('/sales', sales.index);
router.get('/sales/abandoned', abandoned.list);
router.post('/sales/abandoned/:id/remove', abandoned.remove);

router.get('/categories', categories.list);
router.get('/categories/new', categories.form);
router.get('/categories/:id', categories.form);
router.post('/categories', categories.save);
router.post('/categories/:id', categories.save);
router.post('/categories/:id/delete', categories.remove);

router.get('/options', options.list);
router.post('/options', options.create);
router.post('/options/value', options.addValue);
router.post('/options/value/:id/delete', options.removeValue);
router.post('/options/:id/delete', options.remove);

router.get('/products', products.list);
router.get('/products/new', products.form);
router.get('/products/:id', products.form);
router.post('/products', products.save);
router.post('/products/:id', products.save);
router.post('/products/:id/delete', products.remove);
router.post('/products/upload-images', imageUpload.array('files', 10), products.uploadImages);

router.get('/orders', orders.list);
router.get('/orders/export/csv', ordersExport.export);

router.get('/orders/:id', orders.view);
router.post('/orders/:id/status', orders.updateStatus);

router.get('/users', users.list);
router.get('/users/new', users.form);
router.get('/users/:id', users.form);
router.post('/users', users.save);
router.post('/users/:id', users.save);
router.post('/users/:id/delete', users.remove);

router.get('/blog', blog.list);
router.get('/blog/new', blog.form);
router.get('/blog/:id', blog.form);
router.post('/blog', blog.save);
router.post('/blog/:id', blog.save);
router.post('/blog/:id/delete', blog.remove);

router.get('/pages', pages.list);
router.get('/pages/new', pages.form);
router.get('/pages/:id', pages.form);
router.post('/pages', pages.save);
router.post('/pages/:id', pages.save);
router.post('/pages/:id/delete', pages.remove);

router.post('/settings/upload', imageUpload.single('file'), async (req, res) => {
  if (!req.file) return res.json({ ok: false });
  res.json({ ok: true, url: '/uploads/' + req.file.filename });
});
router.post('/settings/test-notify', async (req, res) => {
  try {
    const notify = require('../services/notify');
    const out = await notify.sendTest(req.body.channel);
    res.json(out || { ok: false });
  } catch (e) {
    res.json({ ok: false, reason: e.message });
  }
});
router.get('/settings', settings.form);
router.post('/settings', settings.save);

router.get('/import', importer.form);
router.post('/import', importUpload.single('file'), importer.run);

router.get('/delivery', delivery.list);
router.get('/delivery/new', delivery.form);
router.get('/delivery/:id', delivery.form);
router.post('/delivery', delivery.save);
router.post('/delivery/:id', delivery.save);
router.post('/delivery/:id/toggle', delivery.toggle);
router.post('/delivery/:id/delete', delivery.remove);

router.get('/payment', payment.list);
router.get('/payment/new', payment.form);
router.get('/payment/:id', payment.form);
router.post('/payment', payment.save);
router.post('/payment/:id', payment.save);
router.post('/payment/:id/toggle', payment.toggle);
router.post('/payment/:id/delete', payment.remove);

router.get('/blog-categories', blogCats.list);
router.get('/blog-categories/new', blogCats.form);
router.get('/blog-categories/:id', blogCats.form);
router.post('/blog-categories', blogCats.save);
router.post('/blog-categories/:id', blogCats.save);
router.post('/blog-categories/:id/delete', blogCats.remove);

router.get('/marketplaces', marketplaces.list);
router.get('/marketplaces/new', marketplaces.form);
router.get('/marketplaces/:id', marketplaces.form);
router.post('/marketplaces', marketplaces.save);
router.post('/marketplaces/:id', marketplaces.save);
router.post('/marketplaces/:id/toggle', marketplaces.toggle);
router.post('/marketplaces/:id/delete', marketplaces.remove);
router.post('/marketplaces/upload-icon', imageUpload.single('files'), marketplaces.uploadIcon);

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
