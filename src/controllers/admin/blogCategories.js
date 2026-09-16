const { prisma } = require('../../config/db');
const slugify = require('slugify');

exports.list = async (req, res) => {
  const cats = await prisma.blogCategory.findMany({
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { posts: true } } }
  });
  res.render('admin/blog-categories/list', { cats });
};

exports.form = async (req, res) => {
  const cat = req.params.id
    ? await prisma.blogCategory.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  const cats = await prisma.blogCategory.findMany({ orderBy: { name: 'asc' } });
  res.render('admin/blog-categories/form', { cat, cats, error: null });
};

exports.save = async (req, res) => {
  const { name, slug, parentId, sort } = req.body;
  if (!name) return res.redirect('/admin/blog-categories');
  const data = {
    name,
    slug: slug || slugify(name, { lower: true, strict: true }),
    parentId: parentId ? Number(parentId) : null,
    sort: Number(sort) || 0
  };
  if (req.params.id) {
    await prisma.blogCategory.update({ where: { id: Number(req.params.id) }, data });
  } else {
    await prisma.blogCategory.create({ data });
  }
  res.redirect('/admin/blog-categories');
};

exports.remove = async (req, res) => {
  await prisma.blogCategory.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/blog-categories');
};
