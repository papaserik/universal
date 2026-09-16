const bcrypt = require('bcrypt');
const { prisma } = require('../config/db');
const authCode = require('../services/authCode');
const { getSetting } = require('../services/settings');

exports.loginForm = (req, res) => {
  res.render('auth/login', { error: null, step: 'password' });
};

exports.registerForm = (req, res) => {
  res.render('auth/register', { error: null });
};

// ─── Пароль ───
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return res.render('auth/login', { error: 'Неверные данные', step: 'password' });
  if (user.password.startsWith('magic:')) {
    return res.render('auth/login', { error: 'Для этого аккаунта вход только по коду на email', step: 'password' });
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.render('auth/login', { error: 'Неверные данные', step: 'password' });
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

// ─── Вход по коду ───
exports.codeForm = (req, res) => {
  res.render('auth/login-code', { error: null, step: 'email', email: '' });
};

exports.codeRequest = async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const result = await authCode.createAndSend(email, req.ip);

  if (!result.ok) {
    return res.render('auth/login-code', { error: result.reason, step: 'email', email });
  }

  // Сохраняем email в сессии — чтобы на следующей странице не вводить заново
  req.session.pendingEmail = email;
  res.render('auth/login-code', { error: null, step: 'code', email, sent: true });
};

exports.codeVerify = async (req, res) => {
  const email = (req.body.email || req.session.pendingEmail || '').trim().toLowerCase();
  const code = req.body.code || '';

  const result = await authCode.verify(email, code);
  if (!result.ok) {
    return res.render('auth/login-code', { error: result.reason, step: 'code', email });
  }

  delete req.session.pendingEmail;
  const user = result.user;
  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  res.redirect(user.role === 'USER' ? '/' : '/admin');
};
