const { prisma } = require('../../config/db');
const slugify = require('slugify');

exports.list = async (req, res) => {
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    include: { author: true }
  });
  res.render('admin/blog/list', { posts });
};

exports.form = async (req, res) => {
  const post = req.params.id
    ? await prisma.blogPost.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  res.render('admin/blog/form', { post, error: null });
};

exports.save = async (req, res) => {
  const { title, slug, excerpt, content, cover, published, seoTitle, seoDesc } = req.body;
  if (!title || !content) return res.redirect('/admin/blog');

  const data = {
    title, content,
    slug: slug || slugify(title, { lower: true, strict: true }),
    excerpt: excerpt || null,
    cover: cover || null,
    seoTitle: seoTitle || title,
    seoDesc: seoDesc || excerpt || '',
    published: published === 'on' || published === 'true',
    authorId: req.session.user.id
  };

  if (req.params.id) {
    await prisma.blogPost.update({ where: { id: Number(req.params.id) }, data });
  } else {
    await prisma.blogPost.create({ data });
  }
  res.redirect('/admin/blog');
};

exports.remove = async (req, res) => {
  await prisma.blogPost.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/blog');
};
