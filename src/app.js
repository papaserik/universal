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
  res.locals.user = req.session.user || null;
  res.locals.cartCount = (req.session.cart || []).reduce((s, i) => s + i.qty, 0);
  res.locals.cookieAccepted = req.cookies && req.cookies.cookie_ok === '1';
  res.locals.settings = {
    siteName:   await getSetting('site_name', 'My Shop'),
    phone:      await getSetting('phone'),
    email:      await getSetting('email'),
    address:    await getSetting('address'),
    gaId:       await getSetting('ga_id'),
    metrikaId:  await getSetting('metrika_id'),
    customHead: await getSetting('custom_head'),
    customBody: await getSetting('custom_body')
  };

  // Карта маркетплейсов: { ozon: 'Ozon', wildberries: 'Wildberries' }
  res.locals.marketplaces = {};
  try {
    const mpList = JSON.parse(await getSetting('marketplaces', '[]'));
    for (const m of mpList) res.locals.marketplaces[m.slug] = m.name;
  } catch (e) { }
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
  if (req.path.startsWith('/admin')) {
    res.locals.layout = 'admin/layouts/admin';
    res.locals.saved  = req.query.saved === '1';
  } else if (!res.locals.layout) {
    res.locals.layout = 'layouts/main';
  }
  next();
});

app.use('/', require('./routes/shop'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));

app.use((req, res) => res.status(404).render('errors/404'));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('errors/500', { error: err.message });
});

module.exports = app;
