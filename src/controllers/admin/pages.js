const { prisma } = require('../../config/db');
const slugify = require('slugify');

exports.list = async (req, res) => {
  const pages = await prisma.page.findMany({ orderBy: { createdAt: 'desc' } });
  res.render('admin/pages/list', { pages });
};

exports.form = async (req, res) => {
  const page = req.params.id
    ? await prisma.page.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  res.render('admin/pages/form', { page, error: null });
};

exports.save = async (req, res) => {
  const { title, slug, content, published, seoTitle, seoDesc } = req.body;
  if (!title || !content) return res.redirect('/admin/pages');

  const data = {
    title, content,
    slug: slug || slugify(title, { lower: true, strict: true }),
    seoTitle: seoTitle || title,
    seoDesc: seoDesc || '',
    published: published === 'on' || published === 'true'
  };

  if (req.params.id) {
    await prisma.page.update({ where: { id: Number(req.params.id) }, data });
  } else {
    await prisma.page.create({ data });
  }
  try { require('../../services/cache').delByPrefix('page:'); } catch (e) {}
  res.redirect('/admin/pages');
};

exports.remove = async (req, res) => {
  await prisma.page.delete({ where: { id: Number(req.params.id) } });
  try { require('../../services/cache').delByPrefix('page:'); } catch (e) {}
  res.redirect('/admin/pages');
};
