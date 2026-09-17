const { prisma } = require('../../../config/db');
const syncOrders = require('../service/syncOrders');
const access = require('../service/access');

// ─── Тест подключения к API ───
exports.testConnection = async (req, res) => {
  const slug = req.params.slug;

  try {
    let result;
    if (slug === 'ozon') {
      result = await require('../service/api/ozon').testConnection();
    } else if (slug === 'wildberries') {
      result = await require('../service/api/wildberries').testConnection();
    } else {
      result = { ok: false, error: 'API для этого маркетплейса не реализован' };
    }

    res.json(result);
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};

// ─── Синхронизация заказов ───
exports.sync = async (req, res) => {
  const slug = req.params.slug;
  const hours = Number(req.body.hours) || 24;

  // Лог
  const log = await prisma.marketplaceSyncLog.create({
    data: {
      marketplace: slug,
      direction: 'import',
      action: 'orders',
      strategy: 'merge',
      status: 'started'
    }
  });

  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    let stats;

    if (slug === 'ozon') stats = await syncOrders.syncOzon(since);
    else if (slug === 'wildberries') stats = await syncOrders.syncWildberries(since);
    else throw new Error('Синхронизация для ' + slug + ' не поддерживается');

    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: {
        status: stats.failed > 0 ? 'partial' : 'success',
        total: stats.created + stats.skipped,
        created: stats.created,
        skipped: stats.skipped,
        failed: stats.failed,
        message: 'Синхронизировано за ' + hours + ' ч',
        details: JSON.stringify(stats.errors.slice(0, 50)),
        finishedAt: new Date()
      }
    });

    await prisma.marketplaceIntegration.updateMany({
      where: { slug },
      data: { lastSyncAt: new Date(), lastSyncStatus: 'success' }
    });

    res.json({
      ok: true,
      created: stats.created,
      skipped: stats.skipped,
      failed: stats.failed,
      errors: stats.errors.slice(0, 10)
    });
  } catch (e) {
    console.error('sync orders error:', e);
    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: { status: 'error', message: e.message, finishedAt: new Date() }
    });
    res.json({ ok: false, error: e.message });
  }
};

// ─── Статус API ───
exports.status = async (req, res) => {
  const list = await access.listApiReady();
  res.json({ ok: true, integrations: list });
};

// ─── Синхронизация остатков ───
exports.syncStocks = async (req, res) => {
  const slug = req.params.slug;
  const syncStockPrice = require('../service/syncStockPrice');

  const log = await prisma.marketplaceSyncLog.create({
    data: {
      marketplace: slug,
      direction: 'export',
      action: 'stocks',
      status: 'started'
    }
  });

  try {
    const stats = await syncStockPrice.syncStocks(slug, null);

    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: {
        status: stats.failed > 0 ? 'partial' : 'success',
        total: stats.total,
        updated: stats.updated,
        failed: stats.failed,
        message: 'Остатки обновлены',
        details: JSON.stringify(stats.errors.slice(0, 30)),
        finishedAt: new Date()
      }
    });

    res.json({
      ok: true,
      total: stats.total,
      updated: stats.updated,
      failed: stats.failed,
      errors: stats.errors.slice(0, 10)
    });
  } catch (e) {
    console.error('sync stocks error:', e);
    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: { status: 'error', message: e.message, finishedAt: new Date() }
    });
    res.json({ ok: false, error: e.message });
  }
};

// ─── Синхронизация цен ───
exports.syncPrices = async (req, res) => {
  const slug = req.params.slug;
  const syncStockPrice = require('../service/syncStockPrice');

  const log = await prisma.marketplaceSyncLog.create({
    data: {
      marketplace: slug,
      direction: 'export',
      action: 'prices',
      status: 'started'
    }
  });

  try {
    const stats = await syncStockPrice.syncPrices(slug, null);

    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: {
        status: stats.failed > 0 ? 'partial' : 'success',
        total: stats.total,
        updated: stats.updated,
        failed: stats.failed,
        message: 'Цены обновлены',
        details: JSON.stringify(stats.errors.slice(0, 30)),
        finishedAt: new Date()
      }
    });

    res.json({
      ok: true,
      total: stats.total,
      updated: stats.updated,
      failed: stats.failed,
      errors: stats.errors.slice(0, 10)
    });
  } catch (e) {
    console.error('sync prices error:', e);
    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: { status: 'error', message: e.message, finishedAt: new Date() }
    });
    res.json({ ok: false, error: e.message });
  }
};
