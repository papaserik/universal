const multer = require('multer');
const path = require('path');
const fs = require('fs');
const imageProcessor = require('./imageProcessor');
const logger = require('../lib/logger');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Хранилище: кладём файл во временную папку, потом обработаем
const tempDir = path.join(UPLOAD_DIR, '_tmp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9-_]/gi, '_')
      .slice(0, 40);
    cb(null, Date.now() + '-' + base + ext);
  }
});

const imageFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) cb(null, true);
  else cb(new Error('Только изображения'));
};

const importFilter = (req, file, cb) => {
  if (/\.(xlsx|xls|yml|yaml|xml)$/i.test(file.originalname)) cb(null, true);
  else cb(new Error('Поддерживаются .xlsx, .xls, .yml, .xml'));
};

/**
 * Middleware: после multer переносит временные файлы из _tmp в uploads
 * и обрабатывает их через sharp (ресайз, сжатие, webp, миниатюры)
 */
async function processUploaded(req, res, next) {
  try {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
      if (Array.isArray(req.files)) files.push(...req.files);
      else Object.values(req.files).forEach(arr => files.push(...arr));
    }

    for (const file of files) {
      if (!/^image\//.test(file.mimetype)) continue;
      // Перемещаем в uploads/ и сразу обрабатываем
      const dest = path.join(UPLOAD_DIR, file.filename);
      fs.renameSync(file.path, dest);

      const result = await imageProcessor.process(dest);
      if (result.ok) {
        file.processed = result;
        file.filename = path.basename(result.url);
        file.path = dest;
      }
    }
    next();
  } catch (e) {
    logger.error('[upload processor]', e);
    next();
  }
}

module.exports = {
  imageUpload: multer({ storage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } }),
  importUpload: multer({ storage, fileFilter: importFilter, limits: { fileSize: 20 * 1024 * 1024 } }),
  processUploaded,
  UPLOAD_DIR
};
