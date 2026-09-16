const { prisma } = require('../config/db');

exports.show = async (req, res) => {
  const page = await prisma.page.findUnique({ where: { slug: req.params.slug } });
  if (!page || !page.published) return res.status(404).render('errors/404');
  res.locals.setMeta({ title: page.seoTitle || page.title, description: page.seoDesc || '' });
  res.render('pages/show', { page });
};
