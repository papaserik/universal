const { prisma } = require('../../config/db');

exports.list = async (req, res) => {
  const methods = await prisma.paymentMethod.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] });
  res.render('admin/payment/list', { methods });
};

exports.form = async (req, res) => {
  const method = req.params.id ? await prisma.paymentMethod.findUnique({ where: { id: Number(req.params.id) } }) : null;
  res.render('admin/payment/form', { method, error: null });
};

exports.save = async (req, res) => {
  const { code, name, description, type, config, icon, active, sort } = req.body;
  if (!code || !name) return res.redirect('/admin/payment');
  let configStr = '{}';
  if (config && config.trim()) {
    try { JSON.parse(config); configStr = config.trim(); }
    catch (e) { return res.render('admin/payment/form', { method: req.body, error: 'Config: невалидный JSON' }); }
  }
  const data = {
    code: code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
    name, description: description || null, type: type || 'cod',
    config: configStr, icon: icon || null,
    active: active === 'on' || active === 'true',
    sort: Number(sort) || 0
  };
  if (req.params.id) await prisma.paymentMethod.update({ where: { id: Number(req.params.id) }, data });
  else await prisma.paymentMethod.create({ data });
  res.redirect('/admin/payment');
};

exports.remove = async (req, res) => {
  await prisma.paymentMethod.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/payment');
};

exports.toggle = async (req, res) => {
  const m = await prisma.paymentMethod.findUnique({ where: { id: Number(req.params.id) } });
  if (m) await prisma.paymentMethod.update({ where: { id: m.id }, data: { active: !m.active } });
  res.redirect('/admin/payment');
};
