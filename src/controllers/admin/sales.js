const { prisma } = require('../../config/db');

exports.index = async (req, res) => {
  const now = new Date();
  const days7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const days30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  const [orders30, orders7, allOrders] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: days30 }, status: { not: 'CANCELLED' } },
      include: { items: true }
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: days7 }, status: { not: 'CANCELLED' } },
      include: { items: true }
    }),
    prisma.order.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { items: true }
    })
  ]);

  const revenue7 = orders7.reduce((s, o) => s + o.total, 0);
  const revenue30 = orders30.reduce((s, o) => s + o.total, 0);
  const revenueAll = allOrders.reduce((s, o) => s + o.total, 0);
  const avgCheck = orders30.length ? Math.round(revenue30 / orders30.length) : 0;

  // График за 14 дней
  const chart = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    const dayOrders = orders30.filter(o => o.createdAt >= dayStart && o.createdAt < dayEnd);
    chart.push({
      date: dayStart,
      label: dayStart.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      count: dayOrders.length
    });
  }
  const chartMax = Math.max(...chart.map(c => c.revenue), 1);

  // Топ товаров за 30 дней
  const productStats = {};
  orders30.forEach(o => {
    o.items.forEach(it => {
      const key = it.name;
      if (!productStats[key]) productStats[key] = { name: key, qty: 0, revenue: 0 };
      productStats[key].qty += it.qty;
      productStats[key].revenue += it.price * it.qty;
    });
  });
  const topProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Топ клиентов по сумме
  const clientStats = {};
  orders30.forEach(o => {
    const key = o.email;
    if (!clientStats[key]) clientStats[key] = { name: o.name, email: o.email, orders: 0, revenue: 0 };
    clientStats[key].orders++;
    clientStats[key].revenue += o.total;
  });
  const topClients = Object.values(clientStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Статусы заказов за 30 дней
  const byStatus = { NEW: 0, PAID: 0, SHIPPED: 0, DONE: 0, CANCELLED: 0 };
  const all30 = await prisma.order.findMany({ where: { createdAt: { gte: days30 } } });
  all30.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });

  // Последние 10 заказов
  const recent = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' }, take: 10, include: { items: true }
  });

  res.render('admin/sales/index', {
    revenue7, revenue30, revenueAll, avgCheck,
    ordersCount7: orders7.length, ordersCount30: orders30.length,
    chart, chartMax, topProducts, topClients, byStatus, recent
  });
};
