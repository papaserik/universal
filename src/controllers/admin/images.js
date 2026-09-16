const imageProcessor = require('../../services/imageProcessor');
const { getAllSettings, setSetting } = require('../../services/settings');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'data', 'uploads');

exports.index = async (req, res) => {
  const values = await getAllSettings();

  // Считаем статистику
  let totalFiles = 0, totalSize = 0, thumbs = 0, webps = 0;

  try {
    const files = fs.readdirSync(UPLOAD_DIR).filter(f =>
      /\.(jpe?g|png|webp|gif|svg)$/i.test(f) && !f.startsWith('_')
    );
    totalFiles = files.length;
    files.forEach(f => {
      try { totalSize += fs.statSync(path.join(UPLOAD_DIR, f)).size; } catch (e) {}
    });
    const thumbsDir = path.join(UPLOAD_DIR, '_thumbs');
    if (fs.existsSync(thumbsDir)) thumbs = fs.readdirSync(thumbsDir).length;
    const webpDir = path.join(UPLOAD_DIR, '_webp');
    if (fs.existsSync(webpDir)) webps = fs.readdirSync(webpDir).length;
  } catch (e) {}

  res.render('admin/images/index', {
    values,
    stats: {
      totalFiles,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      thumbs,
      webps
    },
    saved: req.query.saved === '1',
    msg: req.query.msg || null
  });
};

exports.saveSettings = async (req, res) => {
  const keys = [
    'images_max_width',
    'images_quality',
    'images_format',
    'images_thumb_width'
  ];
  for (const k of keys) {
    if (req.body[k] !== undefined) await setSetting(k, req.body[k]);
  }
  res.redirect('/admin/images?saved=1');
};

exports.runOptimize = async (req, res) => {
  try {
    const result = await imageProcessor.optimizeAll();
    const saved = (result.savedBytes / 1024 / 1024).toFixed(2);
    res.json({
      ok: true,
      total: result.total,
      processed: result.processed,
      failed: result.failed,
      savedMB: saved
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
