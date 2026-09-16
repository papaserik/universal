const router = require('express').Router();
const shopCtrl = require('../controllers/shop');
const cartCtrl = require('../controllers/cart');
const checkout = require('../controllers/checkout');
const blog = require('../controllers/blog');
const pages = require('../controllers/pages');
const auth = require('../controllers/auth');

router.get('/', shopCtrl.home);
router.get('/catalog', shopCtrl.catalog);
router.get('/catalog/:slug', shopCtrl.category);
router.get('/product/:slug', shopCtrl.product);

router.get('/cart', cartCtrl.view);
router.post('/cart/add', cartCtrl.add);
router.post('/cart/update', cartCtrl.update);
router.post('/cart/remove', cartCtrl.remove);

router.get('/checkout', checkout.form);
router.post('/checkout', checkout.submit);
router.get('/checkout/success', checkout.success);

router.get('/blog', blog.list);
router.get('/blog/:slug', blog.post);

router.get('/page/:slug', pages.show);

router.get('/login', auth.loginForm);
router.post('/login', auth.login);
router.get('/register', auth.registerForm);
router.post('/register', auth.register);
router.get('/logout', auth.logout);

router.get('/sitemap.xml', shopCtrl.sitemap);
router.get('/robots.txt', shopCtrl.robots);

module.exports = router;
