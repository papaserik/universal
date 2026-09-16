const { prisma } = require('../../config/db');

exports.list = async (req, res) => {
  const items = await prisma.orderStatus.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] });
  const counts = {};
  for (const s of items) counts[s.code] = await prisma.order.count({ where: { status: s.code } });
  res.render('admin/order-statuses/list', { items, counts });
};

exports.form = async (req, res) => {
  const item = req.params.id
    ? await prisma.orderStatus.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  res.render('admin/order-statuses/form', { item, error: null });
};

exports.save = async (req, res) => {
  const { code, name, color, icon, sort, active, isDefault, isFinal, notifyClient, notifyAdmin, emailSubject, emailBody } = req.body;
  if (!code || !name) return res.redirect('/admin/order-statuses');
  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const data = {
    code: cleanCode, name, color: color || '#6b7280', icon: icon || null,
    sort: Number(sort) || 0,
    active: active === 'on', isDefault: isDefault === 'on', isFinal: isFinal === 'on',
    notifyClient: notifyClient === 'on', notifyAdmin: notifyAdmin === 'on',
    emailSubject: emailSubject || null, emailBody: emailBody || null
  };
  if (data.isDefault) await prisma.orderStatus.updateMany({ data: { isDefault: false } });
  if (req.params.id) {
    await prisma.orderStatus.update({ where: { id: Number(req.params.id) }, data });
  } else {
    const exists = await prisma.orderStatus.findUnique({ where: { code: cleanCode } });
    if (exists) return res.redirect('/admin/order-statuses');
    await prisma.orderStatus.create({ data });
  }
  res.redirect('/admin/order-statuses');
};

exports.remove = async (req, res) => {
  const item = await prisma.orderStatus.findUnique({ where: { id: Number(req.params.id) } });
  if (item && item.isDefault) return res.redirect('/admin/order-statuses?error=default');
  await prisma.orderStatus.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/order-statuses');
};
