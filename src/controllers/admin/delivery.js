const { prisma } = require('../../config/db');

exports.list = async (req, res) => {
  const methods = await prisma.deliveryMethod.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] });
  res.render('admin/delivery/list', { methods });
};

exports.form = async (req, res) => {
  const method = req.params.id ? await prisma.deliveryMethod.findUnique({ where: { id: Number(req.params.id) } }) : null;
  res.render('admin/delivery/form', { method, error: null });
};

exports.save = async (req, res) => {
  const { code, name, description, type, price, freeFrom, pricePerKg, icon, active, sort } = req.body;
  if (!code || !name) return res.redirect('/admin/delivery');
  const data = {
    code: code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
    name, description: description || null, type: type || 'flat',
    price: Number(price) || 0,
    freeFrom: freeFrom ? Number(freeFrom) : null,
    pricePerKg: pricePerKg ? Number(pricePerKg) : null,
    icon: icon || null,
    active: active === 'on' || active === 'true',
    sort: Number(sort) || 0
  };
  if (req.params.id) await prisma.deliveryMethod.update({ where: { id: Number(req.params.id) }, data });
  else await prisma.deliveryMethod.create({ data });
  res.redirect('/admin/delivery');
};

exports.remove = async (req, res) => {
  await prisma.deliveryMethod.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/delivery');
};

exports.toggle = async (req, res) => {
  const m = await prisma.deliveryMethod.findUnique({ where: { id: Number(req.params.id) } });
  if (m) await prisma.deliveryMethod.update({ where: { id: m.id }, data: { active: !m.active } });
  res.redirect('/admin/delivery');
};
