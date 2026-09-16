const bcrypt = require('bcrypt');
const { prisma } = require('../../config/db');

// ─── Форма входа ───
exports.loginForm = async (req, res) => {
  // Если уже залогинен — сразу в админку
  if (req.session.admin) return res.redirect('/admin');

  // Показываем форму
  res.render('admin/auth/login', { layout: false, error: null, email: '' });
};

// ─── Обработка входа ───
exports.login = async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!email || !password) {
      return res.render('admin/auth/login', { layout: false, error: 'Заполните email и пароль', email });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
      return res.render('admin/auth/login', { layout: false, error: 'Неверные данные', email });
  }

  // Только ADMIN или MANAGER
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return res.render('admin/auth/login', {
      layout: false,
      error: 'Этот аккаунт не имеет доступа к админ-панели',
      email
    });
  }

  // Пароль (magic-коды не работают в админке)
  if (user.password.startsWith('magic:')) {
      return res.render('admin/auth/login', {
      layout: false,
      error: 'Для этого аккаунта вход только по коду на email. Используйте личный кабинет.',
      email
    });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
      return res.render('admin/auth/login', { layout: false, error: 'Неверные данные', email });
  }

  // Устанавливаем АДМИНСКУЮ сессию (отдельно от юзерской)
  req.session.admin = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  req.session.save(() => {
    res.redirect('/admin');
  });
};

// ─── Выход ───
exports.logout = (req, res) => {
  // Удаляем только админскую сессию, юзерская остаётся
  delete req.session.admin;
  req.session.save(() => {
    res.redirect('/admin/login');
  });
};

// ─── Проверка ───
exports.isAuthenticated = (req) => {
  return !!(req.session && req.session.admin);
};
