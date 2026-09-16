const { prisma } = require('../config/db');

// ─── API: переключить ───
exports.toggle = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.json({ ok: false, needAuth: true, error: 'Войдите в аккаунт' });
    }

    const productId = Number(req.body.productId);
    if (!productId) return res.json({ ok: false, error: 'Нет productId' });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.json({ ok: false, error: 'Товар не найден' });

    const existing = await prisma.favorite.findUnique({
      where: { userId_productId: { userId: user.id, productId } }
    });

    let isFavorite;
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      isFavorite = false;
    } else {
      await prisma.favorite.create({ data: { userId: user.id, productId } });
      isFavorite = true;
    }

    const count = await prisma.favorite.count({ where: { userId: user.id } });
    res.json({ ok: true, isFavorite, count });
  } catch (e) {
    console.error('[favorites toggle]', e);
    res.json({ ok: false, error: e.message });
  }
};

// ─── API: список ID избранного (для подсветки сердечек) ───
exports.listIds = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.json({ ok: true, ids: [] });

    const items = await prisma.favorite.findMany({
      where: { userId: user.id },
      select: { productId: true }
    });
    res.json({ ok: true, ids: items.map(i => i.productId) });
  } catch (e) {
    res.json({ ok: false, ids: [] });
  }
};

// ─── Страница /favorites ───
exports.page = async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');

  const items = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: { brand: true, tags: { include: { tag: true } } }
      }
    }
  });

  const products = items
    .map(i => i.product)
    .filter(p => p && p.published);

  res.locals.setMeta({ title: 'Избранное' });
  res.render('account/favorites', { products });
};
