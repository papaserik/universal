const { prisma } = require('../../config/db');
const slugify = require('slugify');

exports.list = async (req, res) => {
  const q = (req.query.q || '').trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = 20;
  const where = q ? { OR: [
    { name: { contains: q } },
    { sku: { contains: q } }
  ] } : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage
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
  res.render('admin/products/form', {
    product, categories, options, error: null,
    selectedOptions: product ? product.options.map(o => o.valueId) : []
  });
};

exports.save = async (req, res) => {
  const {
    name, slug, sku, price, oldPrice, stock, weight, description,
    categoryId, seoTitle, seoDesc, seoKeywords, published, sort, images, optionValues
  } = req.body;

  if (!name || !price) {
    return res.redirect('/admin/products/new?error=1');
  }

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
    seoTitle: seoTitle || name,
    seoDesc: seoDesc || '',
    seoKeywords: seoKeywords || '',
    published: published === 'on' || published === 'true',
    sort: Number(sort) || 0,
    images: JSON.stringify(
      (images || '').split('\n').map(s => s.trim()).filter(Boolean)
    )
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
    if (v) {
      await prisma.productOption.create({
        data: { productId, optionId: v.optionId, valueId: v.id }
      });
    }
  }

  res.redirect('/admin/products');
};

exports.remove = async (req, res) => {
  await prisma.product.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/products');
};

exports.uploadImages = async (req, res) => {
  if (!req.files || !req.files.length) return res.json({ ok: false });
  const urls = req.files.map(f => '/uploads/' + f.filename);
  res.json({ ok: true, urls });
};
