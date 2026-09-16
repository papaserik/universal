const { prisma } = require('../../config/db');
const slugify = require('slugify');
const mpService = require('../../services/marketplaces');

exports.list = async (req, res) => {
  const items = await prisma.marketplace.findMany({
    orderBy: [{ sort: 'asc' }, { id: 'asc' }]
  });
  res.render('admin/marketplaces/list', { items });
};

exports.form = async (req, res) => {
  const item = req.params.id
    ? await prisma.marketplace.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  res.render('admin/marketplaces/form', { item, error: null });
};

exports.save = async (req, res) => {
  const { name, slug, iconUrl, color, sort, active } = req.body;
  if (!name) return res.redirect('/admin/marketplaces');

  const data = {
    name,
    slug: slug || slugify(name, { lower: true, strict: true }),
    iconUrl: iconUrl || null,
    color: color || '#0f172a',
    sort: Number(sort) || 0,
    active: active === 'on' || active === 'true'
  };

  if (req.params.id) {
    await prisma.marketplace.update({ where: { id: Number(req.params.id) }, data });
  } else {
    await prisma.marketplace.create({ data });
  }
  mpService.invalidate();
  res.redirect('/admin/marketplaces');
};

exports.remove = async (req, res) => {
  await prisma.marketplace.delete({ where: { id: Number(req.params.id) } });
  mpService.invalidate();
  res.redirect('/admin/marketplaces');
};

exports.toggle = async (req, res) => {
  const m = await prisma.marketplace.findUnique({ where: { id: Number(req.params.id) } });
  if (m) await prisma.marketplace.update({ where: { id: m.id }, data: { active: !m.active } });
  mpService.invalidate();
  res.redirect('/admin/marketplaces');
};

exports.uploadIcon = async (req, res) => {
  if (!req.file) return res.json({ ok: false });
  res.json({ ok: true, url: '/uploads/' + req.file.filename });
};
