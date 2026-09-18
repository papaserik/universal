const svc = require('./service');

exports.form = async (req, res) => {
  const settings = await svc.getSettings();
  res.render('admin/preloader/index', {
    settings,
    saved: req.query.saved === '1',
  });
};

exports.save = async (req, res) => {
  const { bg, accent, text, textColor, style, duration } = req.body;
  await svc.saveSettings({ bg, accent, text, textColor, style, duration });
  res.redirect('/admin/preloader?saved=1');
};
