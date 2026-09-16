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

  // Фото товаров — подтягиваем по productId
  const productIds = order.items.map(i => i.productId).filter(Boolean);
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, images: true, slug: true, stock: true } })
    : [];
  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });

  // Обогащаем items
  const enrichedItems = order.items.map(i => {
    let image = null;
    if (i.productId && productMap[i.productId]) {
      try { image = JSON.parse(productMap[i.productId].images || '[]')[0] || null; } catch (e) {}
    }
    return {
      ...i,
      image,
      slug: productMap[i.productId] ? productMap[i.productId].slug : null
    };
  });

  res.render('admin/orders/view', {
    order,
    items: enrichedItems,
    statuses,
    currentStatus,
    changed: req.query.changed === '1',
    saved: req.query.saved === '1',
    error: req.query.error || null
  });
};

exports.updateStatus = async (req, res) => {
  const orderId = Number(req.params.id);
  const newStatus = req.body.status;

  const current = await prisma.order.findUnique({ where: { id: orderId } });
  if (!current) return res.redirect('/admin/orders');

  const oldStatus = current.status;

  await prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });

  if (oldStatus !== newStatus) {
    const updated = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    orderNotifications.notifyStatusChange(updated, newStatus, oldStatus)
      .catch(e => console.error('notifyStatusChange:', e));
  }

  res.redirect('/admin/orders/' + orderId + '?changed=1');
};

// ─── Обновление полей клиента ───
exports.updateFields = async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, phone, address, comment, deliveryFee } = req.body;
  const data = {
    name: name || '',
    email: email || '',
    phone: phone || '',
    address: address || '',
    comment: comment || ''
  };
  if (deliveryFee !== undefined && deliveryFee !== '') {
    data.deliveryFee = Number(deliveryFee) || 0;
  }

  const order = await prisma.order.update({ where: { id }, data, include: { items: true } });
  await recalc(order.id);
  res.redirect('/admin/orders/' + id + '?saved=1');
};

// ─── Пересчёт суммы ───
async function recalc(orderId) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  const total = subtotal + (order.deliveryFee || 0);
  await prisma.order.update({
    where: { id: orderId },
    data: { subtotal, total }
  });
  return { subtotal, total };
}

// ─── Добавить товар ───
exports.addItem = async (req, res) => {
  const orderId = Number(req.params.id);
  const productId = Number(req.body.productId);
  const qty = Math.max(1, Number(req.body.qty) || 1);

  if (!productId) return res.redirect('/admin/orders/' + orderId);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.redirect('/admin/orders/' + orderId);

  // Если такой товар уже есть — увеличиваем количество
  const existing = await prisma.orderItem.findFirst({
    where: { orderId, productId, price: product.price }
  });

  if (existing) {
    await prisma.orderItem.update({
      where: { id: existing.id },
      data: { qty: existing.qty + qty }
    });
  } else {
    await prisma.orderItem.create({
      data: {
        orderId,
        productId,
        name: product.name,
        price: product.price,
        qty
      }
    });
  }

  await recalc(orderId);
  res.redirect('/admin/orders/' + orderId + '?saved=1');
};

// ─── Изменить кол-во/цену позиции ───
exports.updateItem = async (req, res) => {
  const orderId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const qty = Math.max(1, Number(req.body.qty) || 1);
  const price = req.body.price !== undefined && req.body.price !== '' ? Number(req.body.price) : undefined;

  const data = { qty };
  if (price !== undefined) data.price = price;

  await prisma.orderItem.update({ where: { id: itemId }, data });
  await recalc(orderId);
  res.redirect('/admin/orders/' + orderId + '?saved=1');
};

// ─── Удалить позицию ───
exports.removeItem = async (req, res) => {
  const orderId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  await prisma.orderItem.delete({ where: { id: itemId } });
  await recalc(orderId);
  res.redirect('/admin/orders/' + orderId + '?saved=1');
};

// ─── Поиск товаров для добавления (AJAX) ───
exports.searchProducts = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ items: [] });
  const products = await prisma.product.findMany({
    where: {
      published: true,
      OR: [{ name: { contains: q } }, { sku: { contains: q } }]
    },
    select: { id: true, name: true, price: true, stock: true, images: true },
    take: 10
  });
  const items = products.map(p => {
    let image = null;
    try { image = JSON.parse(p.images || '[]')[0] || null; } catch (e) {}
    return { id: p.id, name: p.name, price: p.price, stock: p.stock, image };
  });
  res.json({ items });
};
