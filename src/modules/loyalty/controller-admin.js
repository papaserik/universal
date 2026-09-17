const { prisma } = require('../../config/db');
const loyalty = require('./service');
const { getAllSettings, setSetting } = require('../../services/settings');

// ─── Настройки баллов ───
exports.settings = async (req, res) => {
  const values = await getAllSettings();
  const levels = await prisma.loyaltyLevel.findMany({ orderBy: { minPoints: 'asc' } });
  res.render('admin/loyalty/settings', {
    values, levels,
    saved: req.query.saved === '1'
  });
};

exports.saveSettings = async (req, res) => {
  const keys = [
    'loyalty_points_per_rub', 'loyalty_point_value', 'loyalty_max_pay_percent',
    'loyalty_points_for_signup', 'loyalty_points_for_subscribe', 'loyalty_points_for_review'
  ];
  for (const k of keys) {
    if (req.body[k] !== undefined) await setSetting(k, req.body[k]);
  }
  await setSetting('loyalty_enabled', req.body.loyalty_enabled ? '1' : '0');
  res.redirect('/admin/loyalty/settings?saved=1');
};

// ─── Уровни ───
exports.levels = async (req, res) => {
  const items = await prisma.loyaltyLevel.findMany({ orderBy: [{ sort: 'asc' }, { minPoints: 'asc' }] });
  res.render('admin/loyalty/levels', { items });
};

exports.levelForm = async (req, res) => {
  const item = req.params.id
    ? await prisma.loyaltyLevel.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  res.render('admin/loyalty/level-form', { item, error: null });
};

exports.levelSave = async (req, res) => {
  const { name, slug, minPoints, color, icon, discountPercent, cashbackPercent, sort, active } = req.body;
  if (!name) return res.redirect('/admin/loyalty/levels');

  const slugify = require('slugify');
  const data = {
    name,
    slug: slug || slugify(name, { lower: true, strict: true }),
    minPoints: Number(minPoints) || 0,
    color: color || '#a16207',
    icon: icon || null,
    discountPercent: Number(discountPercent) || 0,
    cashbackPercent: Number(cashbackPercent) || 0,
    sort: Number(sort) || 0,
    active: active === 'on'
  };
  if (req.params.id) {
    await prisma.loyaltyLevel.update({ where: { id: Number(req.params.id) }, data });
  } else {
    await prisma.loyaltyLevel.create({ data });
  }
  res.redirect('/admin/loyalty/levels');
};

exports.levelRemove = async (req, res) => {
  await prisma.loyaltyLevel.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/loyalty/levels');
};

// ─── История транзакций ───
exports.transactions = async (req, res) => {
  const filter = req.query.filter || 'all';
  const where = {};
  if (filter === 'plus')  where.points = { gt: 0 };
  if (filter === 'minus') where.points = { lt: 0 };

  const items = await prisma.loyaltyTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500
  });
  // Подтягиваем email пользователей
  const userIds = [...new Set(items.map(i => i.userId))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, name: true } })
    : [];
  const userMap = {};
  users.forEach(u => { userMap[u.id] = u; });

  const enriched = items.map(i => ({ ...i, user: userMap[i.userId] || null }));

  const totals = {
    plus:  (await prisma.loyaltyTransaction.aggregate({ where: { points: { gt: 0 } }, _sum: { points: true } }))._sum.points || 0,
    minus: Math.abs((await prisma.loyaltyTransaction.aggregate({ where: { points: { lt: 0 } }, _sum: { points: true } }))._sum.points || 0)
  };

  res.render('admin/loyalty/transactions', { items: enriched, filter, totals });
};

exports.addManual = async (req, res) => {
  const { email, points, reason } = req.body;
  if (!email || !points) return res.redirect('/admin/loyalty/transactions');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.redirect('/admin/loyalty/transactions?error=user');
  await loyalty.addPoints(user.id, Number(points), 'manual', reason || 'Ручное начисление');
  res.redirect('/admin/loyalty/transactions');
};

exports.userBalance = async (req, res) => {
  const email = (req.query.email || '').trim();
  if (!email) return res.json({ ok: false });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json({ ok: false, error: 'Пользователь не найден' });
  const info = await loyalty.currentLevel(user.id);
  res.json({
    ok: true, email, name: user.name,
    balance: info.balance,
    level: info.current ? info.current.name : null,
    nextLevel: info.next ? info.next.name : null,
    nextAt: info.next ? info.next.minPoints : null
  });
};
