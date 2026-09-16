const { prisma } = require('../config/db');
const cart = require('../services/cart');

function count(req) {
  return (req.session.cart || []).reduce((s, i) => s + i.qty, 0);
}

exports.view = (req, res) => {
  const items = cart.getCart(req);
  res.render('shop/cart', { items, total: cart.cartTotal(items) });
};

exports.add = async (req, res) => {
  const p = await prisma.product.findUnique({ where: { id: Number(req.body.productId) } });
  if (!p) return res.status(404).json({ ok: false });
  cart.addToCart(req, p, Number(req.body.qty) || 1);
  req.session.save(() => {
    res.json({ ok: true, count: count(req) });
  });
};

exports.update = (req, res) => {
  cart.updateQty(req, Number(req.body.productId), Number(req.body.qty));
  req.session.save(() => res.json({ ok: true, count: count(req) }));
};

exports.remove = (req, res) => {
  cart.removeFromCart(req, Number(req.body.productId));
  req.session.save(() => res.json({ ok: true, count: count(req) }));
};
