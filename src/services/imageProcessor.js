const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const logger = require('../lib/logger');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, '_thumbs');
const WEBP_DIR = path.join(UPLOAD_DIR, '_webp');

// Создаём подпапки для вариантов
[THUMB_DIR, WEBP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Обрабатывает загруженное изображение:
 * - Уменьшает до maxWidth по длинной стороне
 * - Сжимает до quality %
 * - Дополнительно создаёт WebP версию
 * - Дополнительно создаёт миниатюру 400×400
 *
 * Возвращает { url, thumb, webp, width, height, size }
 */
async function process(inputPath, options = {}) {
  // Подтягиваем настройки из БД
  let dbMaxWidth = 1600, dbQuality = 82, dbFormat = 'original';
  try {
    const { getSetting } = require('./settings');
    dbMaxWidth = Number(await getSetting('images_max_width', '1600')) || 1600;
    dbQuality  = Number(await getSetting('images_quality', '82')) || 82;
    dbFormat   = await getSetting('images_format', 'original') || 'original';
  } catch (e) { /* используем значения по умолчанию */ }

  const maxWidth = options.maxWidth || dbMaxWidth;
  const quality = options.quality || dbQuality;
  const format = options.format || dbFormat; // original | webp | jpeg | png

  const ext = path.extname(inputPath).toLowerCase();
  const baseName = path.basename(inputPath, ext);
  const isImage = /\.(jpe?g|png|webp|gif|tiff?|avif)$/i.test(ext);
  if (!isImage) return { ok: false, reason: 'not_image' };

  const stats = fs.statSync(inputPath);
  let originalWidth = 0, originalHeight = 0;

  try {
    const meta = await sharp(inputPath).metadata();
    originalWidth = meta.width || 0;
    originalHeight = meta.height || 0;
  } catch (e) {
    return { ok: false, reason: 'invalid_image' };
  }

  // ─── Основной файл: уменьшаем и сжимаем ───
  let mainPath = inputPath;
  let mainUrl = '/uploads/' + path.basename(inputPath);
  let mainSize = stats.size;

  // Пересжимаем только если это не SVG и не GIF (анимация сломается)
  const canProcess = !/\.(svg|gif)$/i.test(ext);

  if (canProcess) {
    try {
      let pipeline = sharp(inputPath).rotate(); // авто-поворот по EXIF

      // Ресайз, если больше maxWidth
      if (originalWidth > maxWidth || originalHeight > maxWidth) {
        pipeline = pipeline.resize({
          width: maxWidth,
          height: maxWidth,
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Формат и сжатие
      if (format === 'webp') {
        pipeline = pipeline.webp({ quality });
        const webpPath = path.join(WEBP_DIR, baseName + '.webp');
        await pipeline.toFile(webpPath);
        const webpSize = fs.statSync(webpPath).size;
        if (webpSize < mainSize) {
          mainPath = webpPath;
          mainUrl = '/uploads/_webp/' + path.basename(webpPath);
          mainSize = webpSize;
        }
      } else if (ext === '.png') {
        pipeline = pipeline.png({ compressionLevel: 9, quality: quality });
        await pipeline.toFile(inputPath + '.tmp');
        fs.renameSync(inputPath + '.tmp', inputPath);
      } else if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        await pipeline.toFile(inputPath + '.tmp');
        fs.renameSync(inputPath + '.tmp', inputPath);
      } else {
        // Другие форматы — оставляем как есть, но уменьшаем
        await pipeline.toFile(inputPath + '.tmp');
        fs.renameSync(inputPath + '.tmp', inputPath);
      }

      if (mainPath === inputPath) {
        mainSize = fs.statSync(inputPath).size;
      }

      // ─── Всегда создаём WebP версию (для <picture>) ───
      const webpPath = path.join(WEBP_DIR, baseName + '.webp');
      if (!fs.existsSync(webpPath)) {
        await sharp(inputPath).webp({ quality }).toFile(webpPath);
      }

      // ─── Миниатюра 400×400 для каталога ───
      const thumbPath = path.join(THUMB_DIR, baseName + '.jpg');
      await sharp(inputPath)
        .resize(400, 400, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(thumbPath);
    } catch (e) {
      logger.error('[imageProcessor] ошибка обработки:', e.message);
      // Продолжаем с оригиналом
    }
  }

  const finalMeta = await sharp(mainPath).metadata().catch(() => ({}));
  return {
    ok: true,
    url: mainUrl,
    thumb: '/uploads/_thumbs/' + baseName + '.jpg',
    webp: '/uploads/_webp/' + baseName + '.webp',
    width: finalMeta.width || originalWidth,
    height: finalMeta.height || originalHeight,
    size: mainSize,
    originalSize: stats.size,
    saved: stats.size - mainSize
  };
}

/**
 * Оптимизирует все уже загруженные файлы
 */
async function optimizeAll(onProgress) {
  const files = fs.readdirSync(UPLOAD_DIR)
    .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
    .map(f => path.join(UPLOAD_DIR, f));

  const total = files.length;
  let processed = 0, saved = 0, failed = 0;

  for (const file of files) {
    try {
      const r = await process(file);
      if (r.ok) {
        saved += r.saved || 0;
        processed++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
    if (onProgress) onProgress(processed + failed, total);
  }

  return { total, processed, failed, savedBytes: saved };
}

module.exports = { process, optimizeAll, UPLOAD_DIR, THUMB_DIR, WEBP_DIR };
