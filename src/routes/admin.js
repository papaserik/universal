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

router.get('/', dashboard.index);

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

router.get('/settings', settings.form);
router.post('/settings', settings.save);

router.get('/import', importer.form);
router.post('/import', importUpload.single('file'), importer.run);

module.exports = router;
