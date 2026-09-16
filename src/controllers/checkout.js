const { prisma } = require('../config/db');
const cart = require('../services/cart');
const delivery = require('../services/delivery');
const payment = require('../services/payment');

exports.form = async (req, res) => {
  const items = cart.getCart(req);
  if (!items.length) return res.redirect('/cart');
  const deliveries = await delivery.list();
  const payments = await payment.list();
  const subtotal = cart.cartTotal(items);
  const d = await delivery.calculate((deliveries[0] && deliveries[0].code) || 'flat', items);
  const deliveryFee = subtotal >= (d.freeFrom || Infinity) ? 0 : d.cost;
  res.render('shop/checkout', {
    items, subtotal, deliveryFee, total: subtotal + deliveryFee, deliveries, payments
  });
};

exports.submit = async (req, res) => {
  const items = cart.getCart(req);
  if (!items.length) return res.redirect('/cart');
  const subtotal = cart.cartTotal(items);
  const d = await delivery.calculate(req.body.delivery || 'flat', items);
  const deliveryFee = subtotal >= (d.freeFrom || Infinity) ? 0 : d.cost;
  const total = subtotal + deliveryFee;
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
      payment: req.body.payment || 'cod',
      delivery: req.body.delivery || 'flat',
      subtotal, deliveryFee, total, ip: req.ip,
      items: { create: items.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })) }
    },
    include: { items: true }
  });
  const pay = await payment.createPayment(order, order.payment);
  req.session.cart = [];
  res.redirect(pay.redirect);
};

exports.success = async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { number: req.query.order || '' },
    include: { items: true }
  });
  res.render('shop/success', { order });
};
