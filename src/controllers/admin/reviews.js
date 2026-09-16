const { prisma } = require('../../config/db');

exports.list = async (req, res) => {
  const filter = req.query.filter || 'pending';
  let where = {};
  if (filter === 'pending')  where = { approved: false };
  if (filter === 'approved') where = { approved: true };

  const items = await prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 });
  const productIds = [...new Set(items.map(i => i.productId))];
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, slug: true } })
    : [];
  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });
  const enriched = items.map(i => ({ ...i, product: productMap[i.productId] }));

  const counts = {
    pending:  await prisma.review.count({ where: { approved: false } }),
    approved: await prisma.review.count({ where: { approved: true } }),
    total:    await prisma.review.count()
  };

  res.render('admin/reviews/list', { items: enriched, filter, counts });
};
