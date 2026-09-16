module.exports = function adminLayout(req, res, next) {
  res.locals.layout = 'admin/layouts/admin';
  res.locals.saved = req.query.saved === '1';
  next();
};
