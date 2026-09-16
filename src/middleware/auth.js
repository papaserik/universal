// ─── Юзерская авторизация (личный кабинет) ───
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireGuest(req, res, next) {
  if (req.session.user) return res.redirect('/');
  next();
}

// ─── Админская авторизация (админка) ───
function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.redirect('/admin/login');
  if (req.session.admin.role !== 'ADMIN' && req.session.admin.role !== 'MANAGER') {
    return res.redirect('/admin/login');
  }
  next();
}

function requireAdminGuest(req, res, next) {
  if (req.session.admin) return res.redirect('/admin');
  next();
}

module.exports = { requireAuth, requireGuest, requireAdmin, requireAdminGuest };
