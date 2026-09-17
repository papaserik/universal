const { prisma } = require('../../config/db');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'data', 'uploads');

async function getMarketplaces() {
  return prisma.marketplace.findMany({
    where: { active: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }]
  });
}

exports.list = async (req, res) => {
  const q = (req.query.q || '').trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = 20;
  const where = q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, include: { category: true },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * perPage, take: perPage
    }),
    prisma.product.count({ where })
  ]);

  res.render('admin/products/list', {
    products, total, q, page, pages: Math.ceil(total / perPage)
  });
};

exports.form = async (req, res) => {
  const product = req.params.id
    ? await prisma.product.findUnique({
        where: { id: Number(req.params.id) },
        include: { options: { include: { option: true, value: true } } }
      })
    : null;
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  const options = await prisma.option.findMany({
    include: { values: true }, orderBy: { name: 'asc' }
  });

  let library = [];
  try {
    library = fs.readdirSync(UPLOAD_DIR)
      .filter(f => /\.(png|jpe?g|webp|gif|svg)$/i.test(f) && !f.startsWith('_'))
      .map(f => '/uploads/' + f);
  } catch (e) {}

  const marketplaces = await getMarketplaces();
  const brands = await prisma.brand.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }, { name: 'asc' }] });
  const allTags = await prisma.tag.findMany({ orderBy: [{ sort: 'asc' }, { name: 'asc' }] });

  // Текущие теги товара
  let productTags = [];
  if (product) {
    const pts = await prisma.productTag.findMany({ where: { productId: product.id } });
    productTags = pts.map(pt => pt.tagId);
  }

  // Собираем список привязанных маркетплейсов
  let currentMps = [];
  if (product) {
    try { currentMps = JSON.parse(product.marketplaceLinks || '[]'); } catch (e) { currentMps = []; }
    if (!currentMps.length && product.marketplace && product.marketplaceUrl) {
      currentMps = [{ slug: product.marketplace, url: product.marketplaceUrl }];
    }
  }

  res.render('admin/products/form', {
    product, categories, options, library, marketplaces,
    brands, allTags, productTags,
    currentMps,
    error: null,
    selectedOptions: product ? product.options.map(o => o.valueId) : []
  });
};

exports.save = async (req, res) => {
  const {
    name, slug, sku, price, oldPrice, stock, weight, description,
    categoryId, seoTitle, seoDesc, seoKeywords, published, sort, images,
    optionValues, marketplaceLinks, brandId, tags
  } = req.body;

  // Парсим массив маркетплейсов
  let mpArr = [];
  try { mpArr = JSON.parse(marketplaceLinks || '[]'); } catch (e) { mpArr = []; }
  mpArr = mpArr.filter(x => x && x.slug && x.url);

  // Первый маркетплейс пишем в legacy-поля для совместимости
  const firstMp = mpArr[0] || { slug: null, url: null };

  if (!name || !price) return res.redirect('/admin/products/new?error=1');

  const data = {
    name,
    slug: slug || slugify(name, { lower: true, strict: true }),
    sku: sku || null,
    price: Number(price),
    oldPrice: oldPrice ? Number(oldPrice) : null,
    stock: Number(stock) || 0,
    weight: Number(weight) || 0.5,
    description: description || '',
    categoryId: categoryId ? Number(categoryId) : null,
    brandId: brandId ? Number(brandId) : null,
    seoTitle: seoTitle || name,
    seoDesc: seoDesc || '',
    seoKeywords: seoKeywords || '',
    marketplace: firstMp.slug,
    marketplaceUrl: firstMp.url,
    marketplaceLinks: JSON.stringify(mpArr),
    published: published === 'on' || published === 'true',
    sort: Number(sort) || 0,
    images: JSON.stringify((images || '').split('\n').map(s => s.trim()).filter(Boolean))
  };

  let productId;
  if (req.params.id) {
    await prisma.product.update({ where: { id: Number(req.params.id) }, data });
    productId = Number(req.params.id);
    await prisma.productOption.deleteMany({ where: { productId } });
  } else {
    const created = await prisma.product.create({ data });
    productId = created.id;
  }

  const valueIds = [].concat(optionValues || []).map(Number).filter(Boolean);
  for (const valueId of valueIds) {
    const v = await prisma.optionValue.findUnique({ where: { id: valueId } });
    if (v) await prisma.productOption.create({
      data: { productId, optionId: v.optionId, valueId: v.id }
    });
  }

  // Обновляем теги
  await prisma.productTag.deleteMany({ where: { productId } });
  const tagIds = [].concat(tags || []).map(Number).filter(Boolean);
  for (const tagId of tagIds) {
    const t = await prisma.tag.findUnique({ where: { id: tagId } });
    if (t) await prisma.productTag.create({ data: { productId, tagId } });
  }

  // ─── Автосинхронизация с маркетплейсами (если включена) ───
  try {
    const autoSync = (await require('../../services/settings').getSetting('marketplace_auto_sync', '0')) === '1';
    if (autoSync) {
      const updated = await prisma.product.findUnique({ where: { id: productId } });
      if (updated && updated.externalIds && updated.externalIds !== '{}') {
        let ext = {};
        try { ext = JSON.parse(updated.externalIds || '{}'); } catch (e) {}
        const syncStockPrice = require('../../modules/marketplace-sync/service/syncStockPrice');
        // Пуш остатков на все МП, где есть externalId
        for (const mpSlug of Object.keys(ext)) {
          if (['ozon', 'wildberries'].includes(mpSlug)) {
            try {
              await syncStockPrice.syncStocks(mpSlug, [productId]);
              if (mpSlug === 'ozon') {
                await syncStockPrice.syncPrices(mpSlug, [productId]);
              }
              console.log('[autosync] ' + mpSlug + ' ← товар #' + productId);
            } catch (e) {
              console.error('[autosync] ' + mpSlug + ':', e.message);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('autosync error:', e);
  }

  // Сброс кеша страниц
  try {
    const cache = require('../../services/cache');
    cache.delByPrefix('page:/');
    cache.delByPrefix('page:');
  } catch (e) {}

  res.redirect('/admin/products/' + productId + '?saved=1');
};

exports.remove = async (req, res) => {
  await prisma.product.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/products');
};

exports.uploadImages = async (req, res) => {
  if (!req.files || !req.files.length) return res.json({ ok: false });
  const urls = req.files.map(f => {
    if (f.processed && f.processed.url) return f.processed.url;
    return '/uploads/' + f.filename;
  });
  res.json({ ok: true, urls });
};

exports.listFiles = async (req, res) => {
  let files = [];
  try {
    files = fs.readdirSync(UPLOAD_DIR)
      .filter(f => /\.(png|jpe?g|webp|gif|svg)$/i.test(f))
      .map(f => '/uploads/' + f);
  } catch (e) {}
  res.json({ ok: true, files });
};
