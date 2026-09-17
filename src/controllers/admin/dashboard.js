const { prisma } = require('../../config/db');

exports.index = async (req, res) => {
  const hoursAgo = new Date(Date.now() - 60 * 60 * 1000);
  const days30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [
    products, orders, users, posts, pages, newOrders,
    abandonedCount, statuses, integrations
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.blogPost.count(),
    prisma.page.count(),
    prisma.order.count({ where: { status: 'NEW' } }),
    prisma.cart.count({ where: { status: 'active', itemCount: { gt: 0 }, updatedAt: { lt: hoursAgo } } }),
    prisma.orderStatus.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }, { id: 'asc' }] }),
    prisma.marketplaceIntegration.findMany({ orderBy: { name: 'asc' } })
  ]);

  // ─── Все заказы (без отменённых) для расчётов ───
  const allOrders = await prisma.order.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: {
      id: true, total: true, commissionAmount: true, netProfit: true,
      source: true, status: true, createdAt: true
    }
  });

  // ─── Общая выручка и прибыль ───
  const revenue = allOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalCommission = allOrders.reduce((s, o) => s + (o.commissionAmount || 0), 0);
  const totalProfit = allOrders.reduce((s, o) => s + (o.netProfit || o.total || 0), 0);

  // ─── Разбивка по источникам ───
  const bySource = {};
  // Инициализация
  bySource.own = { count: 0, revenue: 0, commission: 0, profit: 0, name: 'Свой магазин', icon: '🏠', color: '#16a34a' };
  for (const i of integrations) {
    const icon = i.slug === 'ozon' ? '🔵' : i.slug === 'wildberries' ? '🟣' : i.slug === 'yandex' ? '🔴' : i.slug === 'sbermarket' ? '🟢' : '🏪';
    const color = i.slug === 'ozon' ? '#005bff' : i.slug === 'wildberries' ? '#cb11ab' : i.slug === 'yandex' ? '#fc3f1d' : i.slug === 'sbermarket' ? '#21a038' : '#6b7280';
    bySource[i.slug] = { count: 0, revenue: 0, commission: 0, profit: 0, name: i.name, icon, color };
  }

  for (const o of allOrders) {
    const src = o.source || 'own';
    if (!bySource[src]) {
      bySource[src] = { count: 0, revenue: 0, commission: 0, profit: 0, name: src, icon: '🏪', color: '#6b7280' };
    }
    bySource[src].count += 1;
    bySource[src].revenue += o.total || 0;
    bySource[src].commission += o.commissionAmount || 0;
    bySource[src].profit += o.netProfit || o.total || 0;
  }

  // Отфильтруем источники без заказов, но оставим «own» всегда
  const sourceList = Object.entries(bySource)
    .filter(([slug, data]) => slug === 'own' || data.count > 0)
    .map(([slug, data]) => ({ slug, ...data }));

  // ─── Заказы по статусам (30 дней) ───
  const statusCounts = {};
  for (const s of statuses) {
    statusCounts[s.code] = await prisma.order.count({
      where: { status: s.code, createdAt: { gte: days30 } }
    });
  }

  // ─── Последние 10 заказов ───
  const recent = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { items: true }
  });

  const statusMap = {};
  statuses.forEach(s => { statusMap[s.code] = s; });

  // Карта интеграций для иконок
  const integrationMap = {};
  integrations.forEach(i => {
    const icon = i.slug === 'ozon' ? '🔵' : i.slug === 'wildberries' ? '🟣' : i.slug === 'yandex' ? '🔴' : i.slug === 'sbermarket' ? '🟢' : '🏪';
    const color = i.slug === 'ozon' ? '#005bff' : i.slug === 'wildberries' ? '#cb11ab' : i.slug === 'yandex' ? '#fc3f1d' : i.slug === 'sbermarket' ? '#21a038' : '#6b7280';
    integrationMap[i.slug] = { name: i.name, icon, color };
  });

  res.render('admin/dashboard', {
    stats: {
      products, orders, users, posts, pages,
      newOrders, abandonedCount,
      revenue, totalCommission, totalProfit
    },
    sourceList,
    statuses, statusCounts, statusMap,
    recent, integrationMap
  });
};
