const { prisma } = require('../config/db');
const bc = require('../services/breadcrumbs');

exports.show = async (req, res) => {
  const page = await prisma.page.findUnique({ where: { slug: req.params.slug } });
  if (!page || !page.published) return res.status(404).render('errors/404');
  res.locals.setMeta({ title: page.seoTitle || page.title, description: page.seoDesc || '' });

  const breadcrumbs = bc.forPage(page);
  const baseUrl = process.env.SITE_URL || (req.protocol + '://' + req.get('host'));
  res.locals.addJsonLd(bc.jsonLd(breadcrumbs, baseUrl));

  res.render('pages/show', { page, breadcrumbs });
};
