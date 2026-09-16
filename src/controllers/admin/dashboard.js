const { prisma } = require('../../config/db');

exports.index = async (req, res) => {
  const [products, orders, users, posts, pages, newOrders, revenue] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.blogPost.count(),
    prisma.page.count(),
    prisma.order.count({ where: { status: 'NEW' } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: 'CANCELLED' } } })
  ]);
  const hoursAgo = new Date(Date.now() - 60 * 60 * 1000);
  const abandonedCount = await prisma.cart.count({
    where: { status: 'active', itemCount: { gt: 0 }, updatedAt: { lt: hoursAgo } }
  });

  const recent = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' }, take: 8, include: { items: true }
  });
  res.render('admin/dashboard', {
    stats: { products, orders, users, posts, pages, newOrders, revenue: revenue._sum.total || 0, abandonedCount },
    recent
  });
};
