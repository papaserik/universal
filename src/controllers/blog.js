const { prisma } = require('../config/db');
const bc = require('../services/breadcrumbs');

exports.list = async (req, res) => {
  const cats = await prisma.blogCategory.findMany({
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { posts: true } } }
  });
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    include: { blogCategory: true }
  });
  res.locals.setMeta({ title: 'Блог' });
  const breadcrumbs = bc.crumbs([{ name: 'Блог', url: '/blog' }]);
  res.render('blog/list', { posts, cats, currentCat: null, breadcrumbs });
};

exports.category = async (req, res) => {
  const cat = await prisma.blogCategory.findUnique({
    where: { slug: req.params.slug },
    include: { children: true }
  });
  if (!cat) return res.status(404).render('errors/404');

  // Собираем ID всех подкатегорий рекурсивно
  const allCats = await prisma.blogCategory.findMany();
  const ids = [cat.id];
  function collect(pid) {
    for (const c of allCats) {
      if (c.parentId === pid) { ids.push(c.id); collect(c.id); }
    }
  }
  collect(cat.id);

  const posts = await prisma.blogPost.findMany({
    where: { published: true, blogCategoryId: { in: ids } },
    orderBy: { createdAt: 'desc' },
    include: { blogCategory: true }
  });
  const cats = await prisma.blogCategory.findMany({
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { posts: true } } }
  });

  res.locals.setMeta({ title: cat.name + ' — блог', description: 'Статьи в категории ' + cat.name });

  const breadcrumbs = bc.crumbs([
    { name: 'Блог', url: '/blog' },
    { name: cat.name, url: '/blog/category/' + cat.slug }
  ]);
  const baseUrl = process.env.SITE_URL || (req.protocol + '://' + req.get('host'));
  res.locals.addJsonLd(bc.jsonLd(breadcrumbs, baseUrl));

  res.render('blog/list', { posts, cats, currentCat: cat, breadcrumbs });
};

exports.post = async (req, res) => {
  const post = await prisma.blogPost.findUnique({
    where: { slug: req.params.slug },
    include: { blogCategory: true }
  });
  if (!post || !post.published) return res.status(404).render('errors/404');
  await prisma.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } });
  res.locals.setMeta({ title: post.seoTitle || post.title, description: post.seoDesc || post.excerpt || '' });
  res.locals.addJsonLd({
    '@context': 'https://schema.org', '@type': 'Article',
    headline: post.title, datePublished: post.createdAt.toISOString()
  });

  const breadcrumbs = await bc.forBlogPost(post);
  const baseUrl = process.env.SITE_URL || (req.protocol + '://' + req.get('host'));
  res.locals.addJsonLd(bc.jsonLd(breadcrumbs, baseUrl));

  res.render('blog/post', { post, breadcrumbs });
};
