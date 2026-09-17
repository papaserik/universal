const { prisma } = require('../../config/db');
const slugify = require('slugify');

exports.list = async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } }
  });
  res.render('admin/categories/list', { categories });
};

exports.form = async (req, res) => {
  const cat = req.params.id
    ? await prisma.category.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.render('admin/categories/form', { cat, categories, error: null });
};

exports.save = async (req, res) => {
  const { name, slug, parentId, sort, seoTitle, seoDesc, imageUrl } = req.body;
  if (!name) return res.render('admin/categories/form', { cat: req.body, categories: [], error: 'Укажите название' });

  const data = {
    name,
    slug: slug || slugify(name, { lower: true, strict: true }),
    parentId: parentId ? Number(parentId) : null,
    sort: Number(sort) || 0,
    seoTitle: seoTitle || null,
    seoDesc: seoDesc || null,
    imageUrl: imageUrl || null
  };

  if (req.params.id) {
    await prisma.category.update({ where: { id: Number(req.params.id) }, data });
  } else {
    await prisma.category.create({ data });
  }
  try { require('../../modules/cache').delByPrefix('page:'); } catch (e) {}
  res.redirect('/admin/categories');
};

exports.remove = async (req, res) => {
  await prisma.category.delete({ where: { id: Number(req.params.id) } });
  try { require('../../modules/cache').delByPrefix('page:'); } catch (e) {}
  res.redirect('/admin/categories');
};
