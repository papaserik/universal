const { prisma } = require('../../config/db');
const slugify = require('slugify');

exports.list = async (req, res) => {
  const items = await prisma.tag.findMany({
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } }
  });
  res.render('admin/tags/list', { items });
};

exports.form = async (req, res) => {
  const item = req.params.id
    ? await prisma.tag.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  res.render('admin/tags/form', { item, error: null });
};

exports.save = async (req, res) => {
  const { name, slug, color, sort } = req.body;
  if (!name) return res.redirect('/admin/tags');

  const data = {
    name,
    slug: slug || slugify(name, { lower: true, strict: true }),
    color: color || '#6b7280',
    sort: Number(sort) || 0
  };

  if (req.params.id) {
    await prisma.tag.update({ where: { id: Number(req.params.id) }, data });
  } else {
    await prisma.tag.create({ data });
  }
  res.redirect('/admin/tags');
};

exports.remove = async (req, res) => {
  await prisma.tag.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/tags');
};
