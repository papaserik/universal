const { prisma } = require('../config/db');
const cart = require('../services/cart');

exports.view = (req, res) => {
  const items = cart.getCart(req);
  res.render('shop/cart', { items, total: cart.cartTotal(items) });
};

exports.add = async (req, res) => {
  const p = await prisma.product.findUnique({ where: { id: Number(req.body.productId) } });
  if (!p) return res.status(404).json({ ok: false });
  cart.addToCart(req, p, Number(req.body.qty) || 1);
  res.json({ ok: true, count: req.session.cart.reduce((s, i) => s + i.qty, 0) });
};

exports.update = (req, res) => {
  cart.updateQty(req, Number(req.body.productId), Number(req.body.qty));
  res.json({ ok: true });
};

exports.remove = (req, res) => {
  cart.removeFromCart(req, Number(req.body.productId));
  res.json({ ok: true });
};
