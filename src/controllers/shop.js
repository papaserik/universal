const { prisma } = require('../config/db');

exports.home = async (req, res) => {
  const [products, posts] = await Promise.all([
    prisma.product.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.blogPost.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' }, take: 3 })
  ]);
  res.locals.setMeta({ title: res.locals.settings.siteName });
  res.render('shop/home', { products, posts });
};

exports.catalog = async (req, res) => {
  const where = { published: true };
  if (req.query.min || req.query.max) {
    where.price = {};
    if (req.query.min) where.price.gte = Number(req.query.min);
    if (req.query.max) where.price.lte = Number(req.query.max);
  }
  const opts = req.query.opt || {};
  if (Object.keys(opts).length) {
    where.AND = Object.entries(opts).map(([slug, vals]) => ({
      options: { some: { option: { slug }, value: { slug: { in: String(vals).split(',') } } } }
    }));
  }
  const sortMap = { 'price-asc': { price: 'asc' }, 'price-desc': { price: 'desc' }, 'new': { createdAt: 'desc' } };
  const orderBy = sortMap[req.query.sort] || { createdAt: 'desc' };
  const [products, options, categories] = await Promise.all([
    prisma.product.findMany({ where, orderBy }),
    prisma.option.findMany({ include: { values: true } }),
    prisma.category.findMany({ orderBy: { sort: 'asc' } })
  ]);
  res.locals.setMeta({ title: 'Каталог' });
  res.render('shop/catalog', { products, options, categories });
};

exports.category = async (req, res) => {
  const cat = await prisma.category.findUnique({
    where: { slug: req.params.slug },
    include: { products: { where: { published: true } } }
  });
  if (!cat) return res.status(404).render('errors/404');
  res.locals.setMeta({ title: cat.seoTitle || cat.name, description: cat.seoDesc || '' });
  res.locals.addJsonLd({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: cat.name, url: res.locals.meta.canonical });
  res.render('shop/category', { cat });
};

exports.product = async (req, res) => {
  const p = await prisma.product.findUnique({
    where: { slug: req.params.slug },
    include: { category: true, options: { include: { option: true, value: true } } }
  });
  if (!p || !p.published) return res.status(404).render('errors/404');
  res.locals.setMeta({
    title: p.seoTitle || p.name,
    description: p.seoDesc || (p.description || '').slice(0, 160),
    keywords: p.seoKeywords || ''
  });
  res.locals.addJsonLd({
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.name, image: JSON.parse(p.images || '[]'),
    description: p.description || '', sku: p.sku || undefined,
    offers: {
      '@type': 'Offer', priceCurrency: 'RUB', price: p.price,
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    }
  });
  const related = await prisma.product.findMany({
    where: { categoryId: p.categoryId, id: { not: p.id }, published: true }, take: 4
  });
  res.render('shop/product', { p, related });
};

exports.sitemap = async (req, res) => {
  const [products, categories, posts, pages] = await Promise.all([
    prisma.product.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.blogPost.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.page.findMany({ where: { published: true }, select: { slug: true } })
  ]);
  const base = process.env.SITE_URL || (req.protocol + '://' + req.get('host'));
  const u = (loc, lastmod, priority) =>
    '<url><loc>' + base + loc + '</loc>' + (lastmod ? '<lastmod>' + lastmod.toISOString() + '</lastmod>' : '') + '<priority>' + (priority || 0.5) + '</priority></url>';
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    u('/', null, 1.0) + u('/catalog', null, 0.9) +
    categories.map(c => u('/catalog/' + c.slug, null, 0.8)).join('') +
    products.map(p => u('/product/' + p.slug, p.updatedAt, 0.7)).join('') +
    u('/blog', null, 0.6) +
    posts.map(p => u('/blog/' + p.slug, p.updatedAt, 0.6)).join('') +
    pages.map(p => u('/page/' + p.slug, null, 0.4)).join('') +
    '\n</urlset>';
  res.type('application/xml').send(xml);
};

exports.robots = (req, res) => {
  const base = process.env.SITE_URL || (req.protocol + '://' + req.get('host'));
  res.type('text/plain').send('User-agent: *\nAllow: /\nSitemap: ' + base + '/sitemap.xml\n');
};
