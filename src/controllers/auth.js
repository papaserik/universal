const bcrypt = require('bcrypt');
const { prisma } = require('../config/db');

exports.loginForm = (req, res) => res.render('auth/login', { error: null });
exports.registerForm = (req, res) => res.render('auth/register', { error: null });

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return res.render('auth/login', { error: 'Неверные данные' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.render('auth/login', { error: 'Неверные данные' });
  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  res.redirect(user.role === 'USER' ? '/' : '/admin');
};

exports.register = async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.render('auth/register', { error: 'Заполните поля' });
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.render('auth/register', { error: 'Email уже занят' });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hash, name, role: 'USER' } });
  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  res.redirect('/');
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/'));
};
