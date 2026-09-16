const { prisma } = require('../../config/db');

exports.list = async (req, res) => {
  const status = req.query.status || '';
  const where = status ? { status } : {};
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.render('admin/orders/list', { orders, status });
};

exports.view = async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: Number(req.params.id) },
    include: { items: true, user: true }
  });
  if (!order) return res.status(404).render('errors/404');
  res.render('admin/orders/view', { order });
};

exports.updateStatus = async (req, res) => {
  await prisma.order.update({
    where: { id: Number(req.params.id) },
    data: { status: req.body.status }
  });
  res.redirect('/admin/orders/' + req.params.id);
};
