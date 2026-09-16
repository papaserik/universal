const { prisma } = require('../../config/db');
const orderNotifications = require('../../services/orderNotifications');

exports.list = async (req, res) => {
  const status = req.query.status || '';
  const where = status ? { status } : {};
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  const statuses = await prisma.orderStatus.findMany({
    where: { active: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }]
  });
  const statusMap = {};
  statuses.forEach(s => { statusMap[s.code] = s; });
  res.render('admin/orders/list', { orders, status, statuses, statusMap });
};

exports.view = async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: Number(req.params.id) },
    include: { items: true, user: true }
  });
  if (!order) return res.status(404).render('errors/404');

  const statuses = await prisma.orderStatus.findMany({
    where: { active: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }]
  });
  const currentStatus = statuses.find(s => s.code === order.status);

  res.render('admin/orders/view', {
    order, statuses, currentStatus, changed: req.query.changed === '1'
  });
};

exports.updateStatus = async (req, res) => {
  const orderId = Number(req.params.id);
  const newStatus = req.body.status;

  const current = await prisma.order.findUnique({ where: { id: orderId } });
  if (!current) return res.redirect('/admin/orders');

  const oldStatus = current.status;

  // Обновляем заказ
  await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus }
  });

  // Если статус сменился — отправляем уведомления
  if (oldStatus !== newStatus) {
    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });
    // Не блокируем ответ — отправка идёт в фоне
    orderNotifications.notifyStatusChange(updated, newStatus, oldStatus)
      .catch(e => console.error('notifyStatusChange:', e));
  }

  res.redirect('/admin/orders/' + orderId + '?changed=1');
};
