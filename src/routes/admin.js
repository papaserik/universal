const router = require('express').Router();


const backupAdmin = require('../controllers/admin/backup');
const imagesAdmin = require('../controllers/admin/images');
const modulesAdmin = require('../controllers/admin/modules');
const integrationsAdmin = require('../modules/marketplace-sync/controller-admin/integrations');
const integrationsImportCtrl = require('../modules/marketplace-sync/controller-admin/integrationsImport');
const syncOrdersCtrl = require('../modules/marketplace-sync/controller-admin/syncOrders');
const { requireAuth, requireAdmin, requireAdminGuest } = require('../middleware/auth');
const adminAuth = require('../controllers/admin/auth');
const roles = require('../middleware/roles');
const { imageUpload, importUpload, processUploaded } = require('../services/upload');
const logger = require('../lib/logger');

// ─── Публичные роуты админки (до защиты) ───
router.get('/login', requireAdminGuest, adminAuth.loginForm);
router.post('/login', requireAdminGuest, adminAuth.login);
router.get('/logout', adminAuth.logout);

// ─── Защита всех остальных роутов ───
router.use(requireAdmin);

router.use(require('../modules/marketplace-sync/routes/admin'));
router.use('/preloader', require('../modules/preloader/routes/admin'));
router.use(require('../modules/newsletter/routes/admin'));

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
const marketplaces = require('../modules/marketplace-sync/controller-admin/marketplaces');
const orderStatuses = require('../controllers/admin/orderStatuses');
const emailTemplates = require('../controllers/admin/emailTemplates');
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
router.post('/products/upload-images', imageUpload.array('files', 10), processUploaded, products.uploadImages);
router.post('/products/:id', products.save);
router.post('/products/:id/delete', products.remove);

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
router.post('/blog/upload', imageUpload.array('files', 1), processUploaded, blog.uploadImage);
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
    logger.error('reorder error:', e);
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





router.get('/backup', backupAdmin.index);
router.get('/backup/download', backupAdmin.download);
router.get('/backup/import', backupAdmin.importView);
router.post('/backup/import', require('../services/upload').importUpload.single('file'), backupAdmin.importRun);


router.get('/images', imagesAdmin.index);
router.post('/images/settings', imagesAdmin.saveSettings);
router.post('/images/optimize', imagesAdmin.runOptimize);



router.get('/modules', modulesAdmin.index);
router.post('/modules/save', modulesAdmin.save);




// ─── Модуль: Кеширование ───
router.use('/cache', require('../modules/cache/routes/admin'));

// ─── Модуль: Бренды ───
router.use('/brands', require('../modules/brands/routes/admin'));

// ─── Модуль: Теги ───
router.use('/tags', require('../modules/tags/routes/admin'));

// ─── Модуль: Баннеры ───
router.use('/banners', require('../modules/banners/routes/admin'));

// ─── Модуль: Отзывы ───
router.use('/reviews', require('../modules/reviews/routes/admin'));

// ─── Модуль: Push ───
router.use('/push', require('../modules/push/routes/admin'));

// ─── Модуль: Лояльность ───
router.use('/loyalty', require('../modules/loyalty/routes/admin'));

module.exports = router;
