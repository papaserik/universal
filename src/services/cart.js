const { prisma } = require('../config/db');
const logger = require('../lib/logger');

function getCart(req) {
  return req.session.cart || (req.session.cart = []);
}

async function syncDb(req) {
  try {
    const items = getCart(req);
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const count = items.reduce((s, i) => s + i.qty, 0);
    const sid = req.sessionID;
    if (!sid) return;

    if (!items.length) {
      // Пустая — если есть активная, помечаем как abandoned
      await prisma.cart.updateMany({
        where: { sessionId: sid, status: 'active' },
        data: { status: 'abandoned', total: 0, itemCount: 0 }
      });
      return;
    }

    const user = req.session.user;
    const existing = await prisma.cart.findUnique({ where: { sessionId: sid } });

    const cartData = {
      total,
      itemCount: count,
      userId: user ? user.id : null,
      email: user ? user.email : (existing ? existing.email : null),
      name: user ? (user.name || null) : (existing ? existing.name : null)
    };

    let cartId;
    if (existing) {
      await prisma.cart.update({ where: { id: existing.id }, data: cartData });
      cartId = existing.id;
      await prisma.cartItem.deleteMany({ where: { cartId } });
    } else {
      const created = await prisma.cart.create({
        data: { sessionId: sid, ...cartData }
      });
      cartId = created.id;
    }

    for (const it of items) {
      await prisma.cartItem.create({
        data: {
          cartId,
          productId: it.productId,
          name: it.name,
          slug: it.slug,
          price: it.price,
          qty: it.qty
        }
      });
    }
  } catch (e) {
    logger.error('[cart sync]', e.message);
  }
}

async function markConverted(req) {
  try {
    const sid = req.sessionID;
    if (!sid) return;
    await prisma.cart.updateMany({
      where: { sessionId: sid },
      data: { status: 'converted', convertedAt: new Date() }
    });
  } catch (e) { logger.error('[cart mark]', e.message); }
}

function addToCart(req, product, qty = 1) {
  const cart = getCart(req);
  const item = cart.find(i => i.productId === product.id);
  if (item) item.qty += qty;
  else cart.push({
    productId: product.id, slug: product.slug, name: product.name,
    price: product.price, image: (JSON.parse(product.images || '[]')[0]) || null, qty
  });
}

function updateQty(req, productId, qty) {
  const item = getCart(req).find(i => i.productId === productId);
  if (item) item.qty = Math.max(1, qty);
}

function removeFromCart(req, productId) {
  req.session.cart = getCart(req).filter(i => i.productId !== productId);
}

function cartTotal(cart) {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

module.exports = { getCart, addToCart, updateQty, removeFromCart, cartTotal, syncDb, markConverted };
