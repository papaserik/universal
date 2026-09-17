const { prisma } = require('../../config/db');

exports.list = async (req, res) => {
  const items = await prisma.banner.findMany({
    orderBy: [{ sort: 'asc' }, { id: 'desc' }]
  });
  res.render('admin/banners/list', { items });
};

exports.form = async (req, res) => {
  const item = req.params.id
    ? await prisma.banner.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  res.render('admin/banners/form', { item, error: null });
};

exports.save = async (req, res) => {
  const {
    title, subtitle, body, ctaText, ctaUrl, imageUrl,
    bgColor, textColor, textPosition, overlay, layout, sort, active,
    startsAt, endsAt
  } = req.body;

  if (!title) return res.redirect('/admin/banners');

  const data = {
    title,
    subtitle:     subtitle || null,
    body:         body || null,
    ctaText:      ctaText || null,
    ctaUrl:       ctaUrl || null,
    imageUrl:     imageUrl || null,
    bgColor:      bgColor || '#0f172a',
    textColor:    textColor || '#ffffff',
    textPosition: textPosition || 'left',
    overlay:      Math.max(0, Math.min(80, Number(overlay) || 0)),
    layout:       layout || 'hero',
    sort:         Number(sort) || 0,
    active:       active === 'on',
    startsAt:     startsAt ? new Date(startsAt) : null,
    endsAt:       endsAt   ? new Date(endsAt)   : null
  };

  if (req.params.id) {
    await prisma.banner.update({ where: { id: Number(req.params.id) }, data });
  } else {
    await prisma.banner.create({ data });
  }
  res.redirect('/admin/banners?saved=1');
};

exports.remove = async (req, res) => {
  await prisma.banner.delete({ where: { id: Number(req.params.id) } });
  try { require('../../services/cache').delByPrefix('page:'); } catch (e) {}
  res.redirect('/admin/banners');
};

exports.toggle = async (req, res) => {
  const b = await prisma.banner.findUnique({ where: { id: Number(req.params.id) } });
  if (b) await prisma.banner.update({ where: { id: b.id }, data: { active: !b.active } });
  try { require('../../services/cache').delByPrefix('page:'); } catch (e) {}
  res.redirect('/admin/banners');
};

exports.uploadImage = async (req, res) => {
  if (!req.file) return res.json({ ok: false });
  res.json({ ok: true, url: '/uploads/' + req.file.filename });
};
