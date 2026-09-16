const { prisma } = require('../../config/db');
const slugify = require('slugify');

exports.list = async (req, res) => {
  const options = await prisma.option.findMany({
    include: { values: { orderBy: { value: 'asc' } } },
    orderBy: { name: 'asc' }
  });
  res.render('admin/options/list', { options });
};

exports.create = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.redirect('/admin/options');
  await prisma.option.create({
    data: { name, slug: slugify(name, { lower: true, strict: true }) }
  });
  res.redirect('/admin/options');
};

exports.addValue = async (req, res) => {
  const { optionId, value } = req.body;
  if (!value) return res.redirect('/admin/options');
  await prisma.optionValue.create({
    data: {
      optionId: Number(optionId),
      value,
      slug: slugify(value, { lower: true, strict: true })
    }
  });
  res.redirect('/admin/options');
};

exports.removeValue = async (req, res) => {
  await prisma.optionValue.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/options');
};

exports.remove = async (req, res) => {
  await prisma.option.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/options');
};
