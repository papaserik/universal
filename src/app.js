const express = require('express');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const expressLayouts = require('express-ejs-layouts');
const { getSetting } = require('./services/settings');
const { loadTheme, viewPaths } = require('./services/theme');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));
app.use('/theme',    express.static(path.join(__dirname, 'themes')));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: 'data' }),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 30, sameSite: 'lax' }
}));

app.set('view engine', 'ejs');
app.set('view cache', false); // всегда рендерить шаблоны заново
app.disable('etag'); // отключаем кеш браузера для HTML
app.use(expressLayouts);
// extractScripts отключён — inline-скрипты работают на месте
// extractStyles отключён — inline-стили работают на месте

app.use(async (req, res, next) => {
  const theme = await loadTheme();
  app.set('views', viewPaths(theme));
  res.locals.theme = theme;
  next();
});

app.use(async (req, res, next) => {
  res.locals.req = req;
  // ─── Юзерская сессия (личный кабинет, витрина) ───
  res.locals.user = req.session.user || null;
  res.locals.userAvatar = req.session.avatar || null;
  res.locals.cartCount = (req.session.cart || []).reduce((s, i) => s + i.qty, 0);

  // ─── Админская сессия (админка) ───
  res.locals.adminUser = req.session.admin || null;

  // Счётчик избранного — только для юзера
  res.locals.favoritesCount = 0;
  if (req.session.user) {
    try {
      const { prisma } = require('./config/db');
      res.locals.favoritesCount = await prisma.favorite.count({ where: { userId: req.session.user.id } });
    } catch (e) {}
  }

  // Pending-баллы реферальной программы
  res.locals.referralPending = 0;
  if (req.session.user) {
    try {
      const { prisma } = require('./config/db');
      const u = await prisma.user.findUnique({
        where: { id: req.session.user.id },
        select: { pendingReferralPoints: true }
      });
      res.locals.referralPending = u?.pendingReferralPoints || 0;
    } catch (e) {}
  }

  // Баллы и уровень — только для юзера
  res.locals.userLoyalty = null;
  if (req.session.user) {
    try {
      const loyalty = require('./services/loyalty');
      res.locals.userLoyalty = await loyalty.currentLevel(req.session.user.id);
    } catch (e) { /* ignore */ }
  }
  res.locals.cookieAccepted = req.cookies && req.cookies.cookie_ok === '1';
  res.locals.settings = {
    siteName:   await getSetting('site_name', 'My Shop'),
    phone:      await getSetting('phone'),
    email:      await getSetting('email'),
    address:    await getSetting('address'),
    gaId:       await getSetting('ga_id'),
    metrikaId:  await getSetting('metrika_id'),
    customHead: await getSetting('custom_head'),
    customBody: await getSetting('custom_body'),
    logoImage:  await getSetting('logo_image'),
    logoText:   await getSetting('logo_text'),
    favicon:    await getSetting('favicon')
  };

  // Карта маркетплейсов из БД: slug -> { name, color, iconUrl }
  res.locals.marketplaces = {};
  res.locals.marketplaceMeta = {};
  try {
    const mpService = require('./services/marketplaces');
    const mpList = await mpService.allActive();
    for (const m of mpList) {
      res.locals.marketplaces[m.slug] = m.name;
      res.locals.marketplaceMeta[m.slug] = { name: m.name, color: m.color, iconUrl: m.iconUrl, slug: m.slug };
    }
  } catch (e) { }
  // ─── Модули (включены/выключены) ───
  try {
    const modules = require('./services/modules');
    res.locals.modules = await modules.loadAll();
  } catch (e) {
    res.locals.modules = {};
  }

  // Хелпер для проверки модуля в шаблонах
  res.locals.moduleEnabled = function(code) {
    return res.locals.modules[code] !== false;
  };

  res.locals.meta = {
    title: res.locals.settings.siteName,
    description: '',
    keywords: '',
    canonical: req.protocol + '://' + req.get('host') + req.originalUrl,
    og: {}
  };
  res.locals.jsonLd = [];
  res.locals.setMeta = (m) => Object.assign(res.locals.meta, m);
  res.locals.addJsonLd = (o) => res.locals.jsonLd.push(o);
  next();
});

app.use((req, res, next) => {
  if (req.path.startsWith('/admin') && !req.path.startsWith('/admin/login')) {
    // Все страницы админки, КРОМЕ /admin/login — с сайдбаром
    res.locals.layout = 'admin/layouts/admin';
    res.locals.saved  = req.query.saved === '1';
  } else if (req.path.startsWith('/admin/login')) {
    // Страница входа в админку — рендерится БЕЗ layout.
    // Отключение передаётся в res.render через { layout: false } в контроллере.
    res.locals.layout = 'admin/layouts/admin'; // дефолтный, контроллер переопределит
  } else if (!res.locals.layout) {
    res.locals.layout = 'layouts/main';
  }
  next();
});

// ─── Кеш публичных страниц ───
app.use(require('./services/cache').pageCacheMiddleware);

app.use('/', require('./routes/shop'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));

app.use((req, res) => res.status(404).render('errors/404'));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('errors/500', { error: err.message });
});

module.exports = app;
