const { prisma } = require('../../config/db');

exports.list = async (req, res) => {
  const hoursAgo = new Date(Date.now() - 60 * 60 * 1000); // старше 1 часа
  const carts = await prisma.cart.findMany({
    where: {
      status: 'active',
      itemCount: { gt: 0 },
      updatedAt: { lt: hoursAgo }
    },
    include: { items: true },
    orderBy: { updatedAt: 'desc' },
    take: 200
  });

  const totalAmount = carts.reduce((s, c) => s + c.total, 0);

  // Конвертированные и активные за 30 дней — для статистики
  const days30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [converted, active, abandoned] = await Promise.all([
    prisma.cart.count({ where: { status: 'converted', convertedAt: { gte: days30 } } }),
    prisma.cart.count({ where: { status: 'active', itemCount: { gt: 0 }, updatedAt: { gte: hoursAgo } } }),
    prisma.cart.count({ where: { status: 'abandoned', updatedAt: { gte: days30 } } })
  ]);

  res.render('admin/sales/abandoned', {
    carts, totalAmount,
    stats: { converted, active, abandoned }
  });
};

exports.remove = async (req, res) => {
  await prisma.cart.update({
    where: { id: Number(req.params.id) },
    data: { status: 'archived' }
  });
  res.redirect('/admin/sales/abandoned');
};
