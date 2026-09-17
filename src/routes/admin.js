const router = require('express').Router();
const backupAdmin = require('../controllers/admin/backup');
const bannersAdmin = require('../controllers/admin/banners');
const brandsAdmin = require('../controllers/admin/brands');
const tagsAdmin = require('../controllers/admin/tags');
const imagesAdmin = require('../controllers/admin/images');
const modulesAdmin = require('../controllers/admin/modules');
const pushAdmin = require('../controllers/admin/push');
const integrationsAdmin = require('../controllers/admin/integrations');
const integrationsImportCtrl = require('../controllers/admin/integrationsImport');
const syncOrdersCtrl = require('../controllers/admin/syncOrders');
const { requireAuth, requireAdmin, requireAdminGuest } = require('../middleware/auth');
const adminAuth = require('../controllers/admin/auth');
const roles = require('../middleware/roles');
const { imageUpload, importUpload, processUploaded } = require('../services/upload');

// ─── Публичные роуты админки (до защиты) ───
router.get('/login', requireAdminGuest, adminAuth.loginForm);
router.post('/login', requireAdminGuest, adminAuth.login);
router.get('/logout', adminAuth.logout);

// ─── Защита всех остальных роутов ───
router.use(requireAdmin);

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
const orderStatuses = require('../controllers/admin/orderStatuses');
const emailTemplates = require('../controllers/admin/emailTemplates');
const loyalty    = require('../controllers/admin/loyalty');
const reviews    = require('../controllers/admin/reviews');
const reviewsCtrl = require('../controllers/reviews');
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
router.post('/products/upload-images', imageUpload.array('files', 10), processUploaded, products.uploadImages);

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
router.post('/marketplaces/upload-icon', imageUpload.single('files'), processUploaded, marketplaces.uploadIcon);

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

// ─── Drag&drop сортировка ───
router.post('/reorder/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.json({ ok: false, error: 'ids must be array' });

    const { prisma } = require('../config/db');

    const models = {
      products: prisma.product,
      categories: prisma.category,
      blogCategories: prisma.blogCategory,
      marketplaces: prisma.marketplace,
      delivery: prisma.deliveryMethod,
      payment: prisma.paymentMethod
    };
    const model = models[type];
    if (!model) return res.json({ ok: false, error: 'unknown type' });

    for (let i = 0; i < ids.length; i++) {
      await model.update({
        where: { id: Number(ids[i]) },
        data: { sort: (i + 1) * 10 }
      });
    }
    res.json({ ok: true, count: ids.length });
  } catch (e) {
    console.error('reorder error:', e);
    res.json({ ok: false, error: e.message });
  }
});

router.get('/order-statuses', orderStatuses.list);
router.get('/order-statuses/new', orderStatuses.form);
router.get('/order-statuses/:id', orderStatuses.form);
router.post('/order-statuses', orderStatuses.save);
router.post('/order-statuses/:id', orderStatuses.save);
router.post('/order-statuses/:id/delete', orderStatuses.remove);

router.get('/email-templates', emailTemplates.list);
router.get('/email-templates/:id', emailTemplates.form);
router.post('/email-templates/:id', emailTemplates.save);
router.post('/email-templates/:id/reset', emailTemplates.reset);

router.post('/orders/:id/items/add', orders.addItem);
router.post('/orders/:id/items/:itemId/update', orders.updateItem);
router.post('/orders/:id/items/:itemId/remove', orders.removeItem);
router.post('/orders/:id/fields', orders.updateFields);
router.get('/orders/search-products', orders.searchProducts);

router.get('/loyalty/settings', loyalty.settings);
router.post('/loyalty/settings', loyalty.saveSettings);

router.get('/loyalty/levels', loyalty.levels);
router.get('/loyalty/levels/new', loyalty.levelForm);
router.get('/loyalty/levels/:id', loyalty.levelForm);
router.post('/loyalty/levels', loyalty.levelSave);
router.post('/loyalty/levels/:id', loyalty.levelSave);
router.post('/loyalty/levels/:id/delete', loyalty.levelRemove);

router.get('/loyalty/transactions', loyalty.transactions);
router.post('/loyalty/transactions/manual', loyalty.addManual);
router.get('/loyalty/user-balance', loyalty.userBalance);

router.get('/reviews', reviews.list);
router.post('/reviews/:id/approve', reviewsCtrl.approve);
router.post('/reviews/:id/reject', reviewsCtrl.reject);
router.post('/reviews/:id/delete', reviewsCtrl.remove);

router.get('/backup', backupAdmin.index);
router.get('/backup/download', backupAdmin.download);
router.get('/backup/import', backupAdmin.importView);
router.post('/backup/import', require('../services/upload').importUpload.single('file'), backupAdmin.importRun);

router.get('/banners', bannersAdmin.list);
router.get('/banners/new', bannersAdmin.form);
router.get('/banners/:id', bannersAdmin.form);
router.post('/banners', bannersAdmin.save);
router.post('/banners/:id', bannersAdmin.save);
router.post('/banners/:id/toggle', bannersAdmin.toggle);
router.post('/banners/:id/delete', bannersAdmin.remove);
router.post('/banners/upload', require('../services/upload').imageUpload.array('files', 1), processUploaded, bannersAdmin.uploadImage);

router.get('/images', imagesAdmin.index);
router.post('/images/settings', imagesAdmin.saveSettings);
router.post('/images/optimize', imagesAdmin.runOptimize);

router.get('/brands', brandsAdmin.list);
router.get('/brands/new', brandsAdmin.form);
router.get('/brands/:id', brandsAdmin.form);
router.post('/brands', brandsAdmin.save);
router.post('/brands/:id', brandsAdmin.save);
router.post('/brands/:id/toggle', brandsAdmin.toggle);
router.post('/brands/:id/delete', brandsAdmin.remove);
router.post('/brands/upload', imageUpload.array('files', 1), processUploaded, brandsAdmin.list);

router.get('/tags', tagsAdmin.list);
router.get('/tags/new', tagsAdmin.form);
router.get('/tags/:id', tagsAdmin.form);
router.post('/tags', tagsAdmin.save);
router.post('/tags/:id', tagsAdmin.save);
router.post('/tags/:id/delete', tagsAdmin.remove);

router.get('/modules', modulesAdmin.index);
router.post('/modules/save', modulesAdmin.save);

router.get('/integrations', integrationsAdmin.index);
router.get('/integrations/import', integrationsImportCtrl.form);
router.post('/integrations/import', require('../services/upload').importUpload.single('file'), integrationsImportCtrl.run);

router.get('/integrations/status', syncOrdersCtrl.status);
router.post('/integrations/:slug/sync', syncOrdersCtrl.sync);
router.post('/integrations/:slug/sync-stocks', syncOrdersCtrl.syncStocks);
router.post('/integrations/:slug/sync-prices', syncOrdersCtrl.syncPrices);
router.get('/integrations/:slug/test', syncOrdersCtrl.testConnection);

router.get('/integrations/:slug', integrationsAdmin.form);
router.post('/integrations/:slug', integrationsAdmin.save);
router.post('/integrations/:slug/toggle', integrationsAdmin.toggle);
router.get('/integrations/:slug/export/yml', integrationsAdmin.exportYml);
router.get('/integrations/:slug/export/csv', integrationsAdmin.exportCsv);

router.get('/push', pushAdmin.index);
router.post('/push/broadcast', pushAdmin.broadcast);
router.post('/push/:id/delete', pushAdmin.remove);
router.post('/push/run-carts', async (req, res) => {
  try {
    const r = await require('../services/push/cron').runNow('carts');
    res.json(r);
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/push/run-digest', async (req, res) => {
  try {
    const r = await require('../services/push/cron').runNow('digest');
    res.json(r);
  } catch (e) { res.json({ ok: false, error: e.message }); }
});


// ─── Модуль: Кеширование ───
router.use('/cache', require('../modules/cache/routes/admin'));

module.exports = router;
