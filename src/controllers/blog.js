const { prisma } = require('../config/db');

exports.list = async (req, res) => {
  const posts = await prisma.blogPost.findMany({
    where: { published: true }, orderBy: { createdAt: 'desc' }
  });
  res.locals.setMeta({ title: 'Блог' });
  res.render('blog/list', { posts });
};

exports.post = async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug } });
  if (!post || !post.published) return res.status(404).render('errors/404');
  await prisma.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } });
  res.locals.setMeta({
    title: post.seoTitle || post.title,
    description: post.seoDesc || post.excerpt || ''
  });
  res.locals.addJsonLd({
    '@context': 'https://schema.org', '@type': 'Article',
    headline: post.title, datePublished: post.createdAt.toISOString()
  });
  res.render('blog/post', { post });
};
