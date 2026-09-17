const { prisma } = require('../config/db');
const loyalty = require('../services/loyalty');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// ─── Дашборд кабинета ───
exports.dashboard = async (req, res) => {
  const user = req.session.user;

  const [orders, statuses, loyaltyInfo, blogPosts, profile, favoritesCount] = await Promise.all([
    prisma.order.findMany({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.orderStatus.findMany(),
    loyalty.currentLevel(user.id),
    prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { blogCategory: true }
    }),
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.favorite.count({ where: { userId: user.id } })
  ]);

  const statusMap = {};
  statuses.forEach(s => { statusMap[s.code] = s; });

  const totalOrders = await prisma.order.count({
    where: { OR: [{ userId: user.id }, { email: user.email }] }
  });

  const totalSpent = await prisma.order.aggregate({
    where: {
      OR: [{ userId: user.id }, { email: user.email }],
      status: { not: 'CANCELLED' }
    },
    _sum: { total: true }
  });

  const savedAddress = safeJson(profile.savedAddress);

  res.locals.setMeta({ title: 'Личный кабинет' });
  res.render('account/dashboard', {
    favoritesCount,
    orders,
    statusMap,
    loyaltyInfo,
    blogPosts,
    profile,
    savedAddress,
    totalOrders,
    totalSpent: totalSpent._sum.total || 0
  });
};

// ─── Заказы ───
exports.orders = async (req, res) => {
  const user = req.session.user;
  const orders = await prisma.order.findMany({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });
  const statuses = await prisma.orderStatus.findMany();
  const statusMap = {};
  statuses.forEach(s => { statusMap[s.code] = s; });

  res.locals.setMeta({ title: 'Мои заказы' });
  res.render('account/orders', { orders, statusMap });
};

exports.order = async (req, res) => {
  const user = req.session.user;
  const order = await prisma.order.findUnique({
    where: { number: req.params.number },
    include: { items: true }
  });
  if (!order) return res.status(404).render('errors/404');
  if (order.email !== user.email && order.userId !== user.id) {
    return res.status(403).render('errors/403');
  }
  const statuses = await prisma.orderStatus.findMany();
  const statusMap = {};
  statuses.forEach(s => { statusMap[s.code] = s; });
  res.locals.setMeta({ title: 'Заказ ' + order.number });
  res.render('account/order', { order, statusMap });
};

// ─── Баллы ───
exports.loyalty = async (req, res) => {
  const user = req.session.user;
  const info = await loyalty.currentLevel(user.id);
  const transactions = await prisma.loyaltyTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  res.locals.setMeta({ title: 'Мои баллы' });
  res.render('account/loyalty', { info, transactions });
};

// ─── Профиль и адрес ───
exports.profile = async (req, res) => {
  const profile = await prisma.user.findUnique({ where: { id: req.session.user.id } });
  const savedAddress = safeJson(profile.savedAddress);
  res.locals.setMeta({ title: 'Профиль' });
  res.render('account/profile', {
    profile,
    savedAddress,
    saved: req.query.saved === '1',
    error: null
  });
};

exports.uploadAvatar = async (req, res) => {
  if (!req.file) return res.json({ ok: false });
  const url = '/uploads/' + req.file.filename;
  await prisma.user.update({
    where: { id: req.session.user.id },
    data: { avatar: url }
  });
  req.session.user.avatar = url;
  res.json({ ok: true, url });
};

exports.removeAvatar = async (req, res) => {
  await prisma.user.update({
    where: { id: req.session.user.id },
    data: { avatar: null }
  });
  res.redirect('/account/profile?saved=1');
};

exports.saveProfile = async (req, res) => {
  const { name, savedPhone, address, city, postalCode, savedName } = req.body;

  // Склеиваем адрес
  const addressObj = {
    address: address || '',
    city: city || '',
    postalCode: postalCode || ''
  };

  await prisma.user.update({
    where: { id: req.session.user.id },
    data: {
      name: name || null,
      savedPhone: savedPhone || null,
      savedName: savedName || null,
      savedAddress: JSON.stringify(addressObj)
    }
  });
  req.session.user.name = name;
  res.redirect('/account/profile?saved=1');
};

function safeJson(s) {
  try { return JSON.parse(s || '{}'); } catch (e) { return {}; }
}

module.exports.requireAuth = requireAuth;
module.exports._safeJson = safeJson;

// ─── Клуб / Реферальная программа ───
exports.club = async (req, res) => {
  const user = req.session.user;
  const referral = require('../services/referral');
  const { getSetting } = require('../services/settings');

  // Убедимся, что у юзера есть refCode
  const refCode = await referral.ensureRefCode(user.id);

  // Обновим сессию (если код только что сгенерировался)
  if (refCode && req.session.user) {
    req.session.user.refCode = refCode;
  }

  const info = await referral.stats(user.id);

  const settings = {
    enabled:          (await getSetting('referral_enabled', '1')) === '1',
    signupPoints:     Number(await getSetting('referral_signup_points', '200')) || 200,
    firstBonus:       Number(await getSetting('referral_first_purchase_bonus', '500')) || 500,
    cashbackPercent:  Number(await getSetting('referral_cashback_percent', '2')) || 2
  };

  // Полный URL реферальной ссылки
  const baseUrl = process.env.SITE_URL || (req.protocol + '://' + req.get('host'));
  const refUrl = baseUrl + '/r/' + refCode;

  res.locals.setMeta({ title: 'Клуб — приглашайте друзей' });
  res.render('account/club', {
    refCode,
    refUrl,
    info,
    settings
  });
};
