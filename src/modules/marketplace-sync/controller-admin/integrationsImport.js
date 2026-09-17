const fs = require('fs');
const path = require('path');
const importSvc = require('../service/import');
const { prisma } = require('../../../config/db');
const logger = require('../../../lib/logger');

// ─── Форма ───
exports.form = async (req, res) => {
  const integrations = await prisma.marketplaceIntegration.findMany({
    where: { direction: { in: ['import', 'both'] } },
    orderBy: { name: 'asc' }
  });

  res.render('integrations/import', {
    integrations,
    result: null,
    error: null
  });
};

// ─── Загрузка и импорт ───
exports.run = async (req, res) => {
  const integrations = await prisma.marketplaceIntegration.findMany({
    where: { direction: { in: ['import', 'both'] } },
    orderBy: { name: 'asc' }
  });

  if (!req.file) {
    return res.render('integrations/import', {
      integrations,
      result: null,
      error: 'Файл не загружен'
    });
  }

  const marketplace = req.body.marketplace || 'generic';
  const strategy = req.body.strategy || 'merge';

  // Создаём лог
  const log = await prisma.marketplaceSyncLog.create({
    data: {
      marketplace,
      direction: 'import',
      action: 'file_import',
      strategy,
      status: 'started'
    }
  });

  try {
    const stats = await importSvc.importFile(req.file.path, req.file.originalname, {
      marketplace, strategy
    });

    // Обновляем лог
    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: {
        status: stats.errors > 0 ? 'partial' : 'success',
        total: stats.total,
        created: stats.created,
        updated: stats.updated,
        skipped: stats.skipped,
        failed: stats.errors,
        message: 'Импорт завершён',
        details: JSON.stringify(stats.details.slice(0, 500)),
        finishedAt: new Date()
      }
    });

    // Обновляем интеграцию
    await prisma.marketplaceIntegration.updateMany({
      where: { slug: marketplace },
      data: { lastSyncAt: new Date(), lastSyncStatus: 'success' }
    });

    // Удаляем временный файл
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    res.render('integrations/import', {
      integrations,
      result: stats,
      error: null
    });
  } catch (e) {
    logger.error('import error:', e);
    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: { status: 'error', message: e.message, finishedAt: new Date() }
    });
    res.render('integrations/import', {
      integrations,
      result: null,
      error: e.message
    });
  }
};
