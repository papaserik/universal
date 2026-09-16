const { prisma } = require('../../config/db');

exports.index = async (req, res) => {
  const hoursAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [
    products, orders, users, posts, pages, newOrders, revenue,
    abandonedCount, statuses
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.blogPost.count(),
    prisma.page.count(),
    prisma.order.count({ where: { status: 'NEW' } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: 'CANCELLED' } } }),
    prisma.cart.count({ where: { status: 'active', itemCount: { gt: 0 }, updatedAt: { lt: hoursAgo } } }),
    prisma.orderStatus.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }, { id: 'asc' }] })
  ]);

  // Счётчики по статусам за последние 30 дней
  const days30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const statusCounts = {};
  for (const s of statuses) {
    statusCounts[s.code] = await prisma.order.count({
      where: { status: s.code, createdAt: { gte: days30 } }
    });
  }

  // Последние 10 заказов
  const recent = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { items: true }
  });

  const statusMap = {};
  statuses.forEach(s => { statusMap[s.code] = s; });

  res.render('admin/dashboard', {
    stats: {
      products, orders, users, posts, pages, newOrders,
      revenue: revenue._sum.total || 0,
      abandonedCount
    },
    statuses, statusCounts, statusMap, recent
  });
};
