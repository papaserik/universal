const backup = require('../../services/backup');
const fs = require('fs');
const path = require('path');

exports.index = async (req, res) => {
  // Считаем размеры таблиц
  const { prisma } = require('../../config/db');
const logger = require('../../lib/logger');
  const counts = {};
  let total = 0;
  for (const t of backup.TABLES) {
    if (!prisma[t]) continue;
    try {
      counts[t] = await prisma[t].count();
      total += counts[t];
    } catch (e) {
      counts[t] = 0;
    }
  }

  // Информация о файле БД
  const dbPath = path.join(__dirname, '..', '..', '..', 'prisma', 'data', 'shop.db');
  let dbSize = 0;
  try { dbSize = fs.statSync(dbPath).size; } catch (e) {}

  res.render('admin/backup/index', {
    counts,
    total,
    tables: backup.TABLES,
    dbSize,
    msg: req.query.msg || null,
    error: req.query.error || null
  });
};

exports.download = async (req, res) => {
  try {
    const data = await backup.exportAll();
    const json = JSON.stringify(data, null, 2);
    const filename = 'shop-backup-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.send(json);
  } catch (e) {
    logger.error('backup download error:', e);
    res.status(500).send('Ошибка экспорта: ' + e.message);
  }
};

exports.importView = (req, res) => {
  res.render('admin/backup/import', { error: null });
};

exports.importRun = async (req, res) => {
  if (!req.file) {
    return res.render('admin/backup/import', { error: 'Файл не загружен' });
  }
  try {
    const raw = fs.readFileSync(req.file.path, 'utf8');
    const json = JSON.parse(raw);
    const mode = req.body.mode || 'replace';

    const result = await backup.importAll(json, { mode });

    // Удаляем временный файл
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    res.redirect('/admin/backup?msg=' + encodeURIComponent(
      'Импорт завершён (' + mode + '). Ошибок: ' + result.errors.length
    ));
  } catch (e) {
    logger.error('import error:', e);
    res.render('admin/backup/import', { error: 'Ошибка импорта: ' + e.message });
  }
};
