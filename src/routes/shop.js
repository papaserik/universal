const router = require('express').Router();
const { requireModule } = require('../middleware/module');
const shopCtrl = require('../controllers/shop');
const cartCtrl = require('../controllers/cart');
const checkout = require('../controllers/checkout');
const blog = require('../controllers/blog');
const pages = require('../controllers/pages');
const auth = require('../controllers/auth');

router.get('/r/:code', requireModule('club'), require('../middleware/referral').capture);
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

router.get('/blog', requireModule('blog'), blog.list);
router.get('/blog/category/:slug', requireModule('blog'), blog.category);
router.get('/blog/:slug', requireModule('blog'), blog.post);

router.get('/page/:slug', pages.show);

router.get('/login', auth.loginForm);
router.get('/login/code', auth.codeForm);
router.post('/login/code', auth.codeRequest);
router.post('/login/code/verify', auth.codeVerify);
router.post('/login', auth.login);
router.get('/register', auth.registerForm);
router.post('/register', auth.register);
router.get('/logout', auth.logout);

router.get('/search', require('../controllers/search').search);
router.get('/contacts', require('../controllers/contacts').form);
router.post('/contacts', require('../controllers/contacts').submit);
router.get('/subscribe', require('../controllers/subscribe').form);
router.post('/subscribe', require('../controllers/subscribe').submit);
router.get('/unsubscribe', require('../controllers/subscribe').unsubscribe);

const favorites = require('../controllers/favorites');
router.post('/api/favorites/toggle', requireModule('favorites'), favorites.toggle);
router.get('/api/favorites/ids', requireModule('favorites'), favorites.listIds);
router.get('/favorites', requireModule('favorites'), favorites.page);
const account = require('../controllers/account');
const { imageUpload } = require('../services/upload');

router.get('/account', account.requireAuth, account.dashboard);
router.get('/account/orders', account.requireAuth, account.orders);
router.get('/account/orders/:number', account.requireAuth, account.order);
router.get('/account/club', requireModule('club'), account.requireAuth, account.club);
router.get('/account/loyalty', account.requireAuth, account.loyalty);
router.get('/account/profile', account.requireAuth, account.profile);
router.post('/account/profile', account.requireAuth, account.saveProfile);
router.post('/account/avatar', account.requireAuth, imageUpload.single('avatar'), account.uploadAvatar);
router.post('/account/avatar/remove', account.requireAuth, account.removeAvatar);

router.get('/sitemap.xml', shopCtrl.sitemap);
router.get('/robots.txt', shopCtrl.robots);


router.post('/product/:productId/review', requireModule('reviews'), require('../controllers/reviews').submit);
module.exports = router;
