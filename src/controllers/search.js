const { prisma } = require('../config/db');

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\-_.,;:!?()\[\]{}"'«»]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matches(haystack, needle) {
  const h = norm(haystack);
  const n = norm(needle);
  if (!n) return false;
  if (h.includes(n)) return true;
  const words = n.split(' ').filter(Boolean);
  if (words.length > 1) return words.every(w => h.includes(w));
  return false;
}

exports.search = async (req, res) => {
  const q = (req.query.q || '').trim();
  const products = [], categories = [], posts = [];

  if (q) {
    const [allProducts, allCats, allPosts] = await Promise.all([
      prisma.product.findMany({ where: { published: true }, include: { category: true } }),
      prisma.category.findMany(),
      prisma.blogPost.findMany({ where: { published: true } })
    ]);

    for (const p of allProducts) {
      if (matches(p.name, q) || matches(p.description, q) || matches(p.seoKeywords, q) || matches(p.sku, q)) {
        products.push(p);
      }
    }
    for (const c of allCats) {
      if (matches(c.name, q)) categories.push(c);
    }
    for (const p of allPosts) {
      if (matches(p.title, q) || matches(p.excerpt, q) || matches(p.content, q)) {
        posts.push(p);
      }
    }
  }

  res.locals.setMeta({ title: q ? 'Поиск: ' + q : 'Поиск' });
  res.render('shop/search', { q, products, categories, posts });
};
