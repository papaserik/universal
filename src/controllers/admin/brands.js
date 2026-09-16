const { prisma } = require('../../config/db');
const slugify = require('slugify');

exports.list = async (req, res) => {
  const items = await prisma.brand.findMany({
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } }
  });
  res.render('admin/brands/list', { items });
};

exports.form = async (req, res) => {
  const item = req.params.id
    ? await prisma.brand.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  res.render('admin/brands/form', { item, error: null });
};

exports.save = async (req, res) => {
  const { name, slug, logoUrl, description, country, sort, active } = req.body;
  if (!name) return res.redirect('/admin/brands');

  const data = {
    name,
    slug: slug || slugify(name, { lower: true, strict: true }),
    logoUrl: logoUrl || null,
    description: description || null,
    country: country || null,
    sort: Number(sort) || 0,
    active: active === 'on'
  };

  if (req.params.id) {
    await prisma.brand.update({ where: { id: Number(req.params.id) }, data });
  } else {
    await prisma.brand.create({ data });
  }
  res.redirect('/admin/brands');
};

exports.remove = async (req, res) => {
  await prisma.brand.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/brands');
};

exports.toggle = async (req, res) => {
  const b = await prisma.brand.findUnique({ where: { id: Number(req.params.id) } });
  if (b) await prisma.brand.update({ where: { id: b.id }, data: { active: !b.active } });
  res.redirect('/admin/brands');
};
