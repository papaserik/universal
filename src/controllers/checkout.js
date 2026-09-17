const { prisma } = require('../config/db');
const cart = require('../services/cart');
const delivery = require('../services/delivery');
const payment = require('../services/payment');
const loyalty = require('../modules/loyalty/service');
const logger = require('../lib/logger');

async function enrichItems(items) {
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

// Рассчитывает баланс баллов для текущего пользователя
async function getLoyaltyInfo(req) {
  const user = req.session.user;
  if (!user) return { enabled: false, balance: 0, current: null, next: null, maxPay: 0, pointValue: 1 };
  const s = await loyalty.settings();
  if (!s.enabled) return { enabled: false, balance: 0, current: null, next: null, maxPay: 0, pointValue: 1 };
  const info = await loyalty.currentLevel(user.id);
  return {
    enabled: true,
    balance: info.balance,
    current: info.current,
    next: info.next,
    pointValue: s.pointValue,
    maxPayPercent: s.maxPayPercent
  };
}

exports.form = async (req, res) => {
  const raw = cart.getCart(req);
  if (!raw.length) return res.redirect('/cart');

  const items = await enrichItems(raw);
  const subtotal = cart.cartTotal(items);
  const weight = cartWeight(items);

  const [deliveries, payments, loyaltyInfo] = await Promise.all([
    delivery.listActive(),
    payment.listActive(),
    getLoyaltyInfo(req)
  ]);

  const selected = deliveries[0] || null;
  const dResult = delivery.calc(selected, subtotal, weight);

  // Максимум, сколько можно списать баллами
  const maxPointsByPercent = Math.floor((subtotal * loyaltyInfo.maxPayPercent / 100) / (loyaltyInfo.pointValue || 1));
  const maxPointsUsable = Math.min(loyaltyInfo.balance, maxPointsByPercent);

  // Сохранённый адрес и данные клиента
  let savedAddress = {};
  let savedProfile = null;
  if (req.session.user) {
    savedProfile = await prisma.user.findUnique({ where: { id: req.session.user.id } });
    if (savedProfile && savedProfile.savedAddress) {
      try { savedAddress = JSON.parse(savedProfile.savedAddress || '{}'); } catch (e) {}
    }
  }

  res.render('shop/checkout', {
    items, subtotal, weight,
    deliveries, payments,
    selectedDelivery: selected ? selected.code : null,
    selectedPayment: payments[0] ? payments[0].code : null,
    deliveryFee: dResult.cost,
    deliveryNote: dResult.note,
    total: subtotal + dResult.cost,
    loyalty: loyaltyInfo,
    maxPointsUsable,
    savedAddress,
    savedProfile
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

  const dResult = delivery.calc(deliveryMethod, subtotal, weight);

  // ─── Баллы ───
  let pointsUsed = 0;
  let pointsDiscount = 0;
  const user = req.session.user;
  let loyaltyInfo = { enabled: false };
  if (user) loyaltyInfo = await getLoyaltyInfo(req);

  const requestedPoints = Math.max(0, Math.floor(Number(req.body.usePoints) || 0));
  if (loyaltyInfo.enabled && requestedPoints > 0 && loyaltyInfo.balance > 0) {
    const pointValue = loyaltyInfo.pointValue || 1;
    const maxByPercent = Math.floor((subtotal * loyaltyInfo.maxPayPercent / 100) / pointValue);
    const usable = Math.min(requestedPoints, loyaltyInfo.balance, maxByPercent);
    pointsUsed = usable;
    pointsDiscount = usable * pointValue;
  }

  const total = Math.max(0, subtotal + dResult.cost - pointsDiscount);
  const number = 'ORD-' + Date.now().toString(36).toUpperCase();

  // ─── Подарок ───
  const isGift = req.body.isGift === 'on' || req.body.isGift === 'true' || req.body.isGift === '1';
  const recipientName    = isGift ? (req.body.recipientName || '').trim() : '';
  const recipientPhone   = isGift ? (req.body.recipientPhone || '').trim() : '';
  const recipientAddress = isGift ? (req.body.recipientAddress || '').trim() : '';
  const giftMessage      = isGift ? (req.body.giftMessage || '').trim() : '';

  // Адрес заказа: если подарок — берём адрес получателя
  const shippingAddress = isGift ? recipientAddress : (req.body.address || '');

  // ─── Источник заказа ───
  // Со своего сайта = 'own'. Заказы с маркетплейсов создаются через отдельный сервис.
  const orderSource = req.body.source || 'own';

  // Комиссия (для своего сайта = 0)
  let commissionPercent = 0;
  if (orderSource !== 'own') {
    const integration = await prisma.marketplaceIntegration.findUnique({
      where: { slug: orderSource }
    });
    if (integration) commissionPercent = integration.commissionPercent || 0;
  }
  const commissionAmount = Math.round(total * commissionPercent / 100 * 100) / 100;
  const netProfit = total - commissionAmount;

  const order = await prisma.order.create({
    data: {
      number,
      source: orderSource,
      commissionPercent,
      commissionAmount,
      netProfit,
      userId: user ? user.id : null,
      email: req.body.email,
      phone: req.body.phone,
      name: req.body.name,
      address: shippingAddress,
      comment: req.body.comment || '',
      payment: paymentMethod ? paymentMethod.code : 'manual',
      delivery: deliveryMethod ? deliveryMethod.code : 'manager',
      subtotal,
      deliveryFee: dResult.cost,
      pointsUsed,
      pointsDiscount,
      total,
      ip: req.ip,
      isGift,
      recipientName:    recipientName    || null,
      recipientPhone:   recipientPhone   || null,
      recipientAddress: recipientAddress || null,
      giftMessage:      giftMessage      || null,
      items: { create: items.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })) }
    },
    include: { items: true }
  });

  // Списание баллов
  if (pointsUsed > 0 && user) {
    await loyalty.spendPoints(user.id, pointsUsed, 'Оплата заказа ' + number, order.id);
  }

  // Начисление кэшбэка (по сумме после скидки доставки, без учёта баллов)
  if (user) {
    try { await loyalty.awardForOrder(order, user.id); } catch (e) { logger.error('loyalty award:', e); }

    // ─── Реферальная программа ───
    try {
      const referral = require('../modules/club/service');
      await referral.processOrder(order, user.id);
    } catch (e) { logger.error('referral processOrder:', e); }
  }

  // Уведомления
  try {
    const mailer = require('../services/orderMailer');
    await mailer.notifyAdmin(order);
    if (mailer.notifyChannels) await mailer.notifyChannels(order);
  } catch (e) { logger.error('mail error', e); }

  try {
    const orderNotifications = require('../services/orderNotifications');
    await orderNotifications.sendOrderCreatedEmail(order);
  } catch (e) { logger.error('order email error', e); }

  // Помечаем корзину как оформленную
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

  let recommendations = [];
  try {
    const orderedIds = order ? order.items.map(i => i.productId).filter(Boolean) : [];
    recommendations = await prisma.product.findMany({
      where: {
        published: true,
        stock: { gt: 0 },
        id: orderedIds.length ? { notIn: orderedIds } : undefined
      },
      take: 4,
      orderBy: { createdAt: 'desc' }
    });
  } catch (e) { }

  const { getSetting } = require('../services/settings');
  const couponCode = await getSetting('coupon_welcome', '');
  const couponPercent = await getSetting('coupon_welcome_percent', '');

  // Информация о лояльности для этой страницы
  let loyaltyAfter = null;
  if (order && req.session.user) {
    loyaltyAfter = await loyalty.currentLevel(req.session.user.id);
  }

  res.render('shop/success', { order, recommendations, couponCode, couponPercent, loyaltyAfter });
};
