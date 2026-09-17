const bcrypt = require('bcrypt');
const { prisma } = require('../config/db');
const referral = require('../services/referral');
const loyalty = require('../services/loyalty');
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
  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar || null };
  res.redirect(user.role === 'USER' ? '/' : '/admin');
};

exports.register = async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.render('auth/register', { error: 'Заполните поля' });
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.render('auth/register', { error: 'Email уже занят' });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hash, name, role: 'USER' } });

  // Приветственные баллы
  try {
    const ls = await loyalty.settings();
    if (ls.enabled && ls.forSignup > 0) {
      await loyalty.addPoints(user.id, ls.forSignup, 'signup', 'Бонус за регистрацию');
    }
  } catch (e) { console.error('signup points:', e); }

  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar || null };
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
  // ─── Реферальная программа ───
  if (result.isNewUser) {
    await handleReferralOnSignup(req, user);
  }

  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar || null };
  res.redirect(user.role === 'USER' ? '/' : '/admin');
};

// ─── Хелпер: обработка реферала при регистрации ───
async function handleReferralOnSignup(req, newUser) {
  try {
    const refCode = req.cookies && req.cookies.ref;
    if (!refCode) return;

    const inviter = await referral.findByCode(refCode);
    if (!inviter || inviter.id === newUser.id) return;

    // Создаём связь
    const link = await referral.createReferral(inviter.id, newUser.id);
    if (!link) return;

    // Начисляем приглашённому pending-баллы
    const { getSetting } = require('../services/settings');
    const points = Number(await getSetting('referral_signup_points', '200')) || 0;
    if (points > 0) {
      await referral.awardPendingPoints(newUser.id, points);
    }

    // Убираем cookie
    req.res.clearCookie('ref');
  } catch (e) {
    console.error('referral signup error:', e);
  }
}
