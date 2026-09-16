const { prisma } = require('../config/db');
const cart = require('../services/cart');
const delivery = require('../services/delivery');
const payment = require('../services/payment');

async function enrichItems(items) {
  // Подтягиваем актуальный вес из БД для каждого товара
  const ids = items.map(i => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, weight: true }
  });
  const wMap = Object.fromEntries(products.map(p => [p.id, p.weight || 0.5]));
  return items.map(i => ({ ...i, weight: wMap[i.productId] || 0.5 }));
}

function cartWeight(items) {
  return items.reduce((s, i) => s + (i.weight || 0.5) * i.qty, 0);
}

exports.form = async (req, res) => {
  const raw = cart.getCart(req);
  if (!raw.length) return res.redirect('/cart');

  const items = await enrichItems(raw);
  const subtotal = cart.cartTotal(items);
  const weight = cartWeight(items);

  const [deliveries, payments] = await Promise.all([
    delivery.listActive(),
    payment.listActive()
  ]);

  // Первый активный способ доставки — по умолчанию
  const selected = deliveries[0] || null;
  const dResult = delivery.calc(selected, subtotal, weight);

  res.render('shop/checkout', {
    items,
    subtotal,
    weight,
    deliveries,
    payments,
    selectedDelivery: selected ? selected.code : null,
    selectedPayment: payments[0] ? payments[0].code : null,
    deliveryFee: dResult.cost,
    deliveryNote: dResult.note,
    total: subtotal + dResult.cost
  });
};

exports.submit = async (req, res) => {
  const raw = cart.getCart(req);
  if (!raw.length) return res.redirect('/cart');

  const items = await enrichItems(raw);
  const subtotal = cart.cartTotal(items);
  const weight = cartWeight(items);

  const deliveryCode = req.body.delivery || '';
  const paymentCode = req.body.payment || '';

  const [deliveryMethod, paymentMethod] = await Promise.all([
    deliveryCode ? prisma.deliveryMethod.findUnique({ where: { code: deliveryCode } }) : null,
    paymentCode ? prisma.paymentMethod.findUnique({ where: { code: paymentCode } }) : null
  ]);

  // Обновим корзину в БД — сохраним контакты и последний статус
  try {
    await prisma.cart.updateMany({
      where: { sessionId: req.sessionID, status: 'active' },
      data: {
        email: req.body.email || null,
        name: req.body.name || null,
        phone: req.body.phone || null
      }
    });
  } catch (e) { /* ignore */ }

  const dResult = delivery.calc(deliveryMethod, subtotal, weight);
  const total = subtotal + dResult.cost;
  const number = 'ORD-' + Date.now().toString(36).toUpperCase();

  const order = await prisma.order.create({
    data: {
      number,
      userId: req.session.user ? req.session.user.id : null,
      email: req.body.email,
      phone: req.body.phone,
      name: req.body.name,
      address: req.body.address || '',
      comment: req.body.comment || '',
      payment: paymentMethod ? paymentMethod.code : 'manual',
      delivery: deliveryMethod ? deliveryMethod.code : 'manager',
      subtotal, deliveryFee: dResult.cost, total, ip: req.ip,
      items: { create: items.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })) }
    },
    include: { items: true }
  });

  await cart.markConverted(req);

  const pay = await payment.createPayment(order, paymentMethod);
  req.session.cart = [];
  req.session.save(() => res.redirect(pay.redirect));
};

exports.success = async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { number: req.query.order || '' },
    include: { items: true }
  });

  // Рекомендации: случайные товары, которых нет в заказе
  let recommendations = [];
  try {
    const orderedIds = order ? order.items.map(i => i.productId).filter(Boolean) : [];
    recommendations = await prisma.product.findMany({
      where: {
        published: true,
        stock: { gt: 0 },
        id: orderedIds.length ? { notIn: orderedIds } : undefined
      },
      include: { category: true },
      take: 4,
      orderBy: { createdAt: 'desc' }
    });
  } catch (e) { /* ignore */ }

  // Промокод — из настроек (если есть)
  const { getSetting } = require('../services/settings');
  const couponCode = await getSetting('coupon_welcome', '');
  const couponPercent = await getSetting('coupon_welcome_percent', '');

  res.render('shop/success', { order, recommendations, couponCode, couponPercent });
};
