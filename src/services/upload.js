const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, '_');
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

module.exports = {
  imageUpload: multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } }),
  importUpload: multer({ storage, fileFilter: importFilter, limits: { fileSize: 20 * 1024 * 1024 } }),
  UPLOAD_DIR
};
