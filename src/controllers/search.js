const { prisma } = require('../config/db');

exports.search = async (req, res) => {
  const q = (req.query.q || '').trim();
  const products = [];
  const categories = [];
  const posts = [];

  if (q) {
    [].push.apply(products, await prisma.product.findMany({
      where: {
        published: true,
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { sku: { contains: q } },
          { seoKeywords: { contains: q } }
        ]
      },
      include: { category: true },
      take: 50
    }));

    [].push.apply(categories, await prisma.category.findMany({
      where: { name: { contains: q } },
      take: 20
    }));

    [].push.apply(posts, await prisma.blogPost.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: q } },
          { excerpt: { contains: q } },
          { content: { contains: q } }
        ]
      },
      take: 20
    }));
  }

  res.locals.setMeta({ title: q ? `Поиск: ${q}` : 'Поиск' });
  res.render('shop/search', { q, products, categories, posts });
};
