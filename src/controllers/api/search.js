const { prisma } = require('../../config/db');
const logger = require('../../lib/logger');

// Нормализация: нижний регистр, ё→е, убираем лишние пробелы/дефисы, пробелы→пробел
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\-_.,;:!?()\[\]{}"'«»]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Нечёткое сравнение: «планшет z» найдёт «Планшет Z», «часы» найдёт «Умные часы W»
function matches(haystack, needle) {
  const h = norm(haystack);
  const n = norm(needle);
  if (!n) return false;
  if (h.includes(n)) return true;
  // Все слова запроса должны присутствовать в любом порядке
  const words = n.split(' ').filter(Boolean);
  if (words.length > 1) {
    return words.every(w => h.includes(w));
  }
  return false;
}

exports.suggest = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ items: [] });

    const [allProducts, allCategories, allPosts] = await Promise.all([
      prisma.product.findMany({ where: { published: true }, select: { id: true, name: true, slug: true, price: true, description: true, seoKeywords: true, sku: true } }),
      prisma.category.findMany({ select: { id: true, name: true, slug: true } }),
      prisma.blogPost.findMany({ where: { published: true }, select: { id: true, title: true, slug: true } })
    ]);

    const products = allProducts.filter(p =>
      matches(p.name, q) || matches(p.description, q) || matches(p.seoKeywords, q) || matches(p.sku, q)
    ).slice(0, 6);

    const categories = allCategories.filter(c => matches(c.name, q)).slice(0, 3);
    const posts = allPosts.filter(p => matches(p.title, q)).slice(0, 3);

    const items = [
      ...products.map(p => ({ type: 'product', title: p.name, url: '/product/' + p.slug, extra: p.price + ' ₽' })),
      ...categories.map(c => ({ type: 'category', title: c.name, url: '/catalog/' + c.slug, extra: 'категория' })),
      ...posts.map(p => ({ type: 'post', title: p.title, url: '/blog/' + p.slug, extra: 'блог' }))
    ];

    res.json({ items });
  } catch (e) {
    logger.error('suggest error:', e);
    res.status(500).json({ items: [], error: e.message });
  }
};
