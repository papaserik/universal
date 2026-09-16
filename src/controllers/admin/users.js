const bcrypt = require('bcrypt');
const { prisma } = require('../../config/db');

exports.list = async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } }
  });
  res.render('admin/users/list', { users });
};

exports.form = async (req, res) => {
  const user = req.params.id
    ? await prisma.user.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  res.render('admin/users/form', { user, error: null });
};

exports.save = async (req, res) => {
  const { email, name, role, active, password } = req.body;
  if (!email) return res.redirect('/admin/users');

  const data = {
    email, name: name || null, role: role || 'USER',
    active: active === 'on' || active === 'true'
  };
  if (password) data.password = await bcrypt.hash(password, 10);

  if (req.params.id) {
    await prisma.user.update({ where: { id: Number(req.params.id) }, data });
  } else {
    if (!password) return res.redirect('/admin/users/new?error=password');
    await prisma.user.create({ data });
  }
  res.redirect('/admin/users');
};

exports.remove = async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/users');
};
