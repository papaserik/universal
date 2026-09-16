const RIGHTS = {
  ADMIN:   ['*'],
  MANAGER: ['products:*', 'orders:*', 'blog:*', 'pages:*', 'import:*', 'settings:read'],
  USER:    []
};
module.exports = function roles(...required) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) return res.redirect('/login');
    const rights = RIGHTS[user.role] || [];
    const ok = rights.includes('*') || required.every(r => {
      const [group] = r.split(':');
      return rights.includes(r) || rights.includes(group + ':*');
    });
    if (!ok) return res.status(403).render('errors/403');
    next();
  };
};
