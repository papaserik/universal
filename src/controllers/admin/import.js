const importFile = require('../../services/import');

exports.form = (req, res) => {
  res.render('admin/import/form', { result: null, error: null });
};

exports.run = async (req, res) => {
  if (!req.file) {
    return res.render('admin/import/form', { result: null, error: 'Файл не загружен' });
  }
  try {
    const result = await importFile(req.file.path, req.file.originalname);
    res.render('admin/import/form', { result, error: null });
  } catch (e) {
    res.render('admin/import/form', { result: null, error: e.message });
  }
};
