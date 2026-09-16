function requireAuth(req, res, next) { if (!req.session.user) return res.redirect('/login'); next(); }
function requireGuest(req, res, next) { if (req.session.user) return res.redirect('/'); next(); }
module.exports = { requireAuth, requireGuest };
