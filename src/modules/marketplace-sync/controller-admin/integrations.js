const { prisma } = require('../../../config/db');
const exportSvc = require('../service/export');

// ─── Список интеграций ───
exports.index = async (req, res) => {
  const integrations = await prisma.marketplaceIntegration.findMany({
    orderBy: { name: 'asc' }
  });

  // Считаем статистику по логам
  const stats = {};
  for (const i of integrations) {
    const lastLog = await prisma.marketplaceSyncLog.findFirst({
      where: { marketplace: i.slug },
      orderBy: { startedAt: 'desc' }
    });
    stats[i.slug] = lastLog || null;
  }

  res.render('admin/integrations/index', {
    integrations,
    stats,
    saved: req.query.saved === '1',
    error: req.query.error || null
  });
};

// ─── Форма редактирования интеграции ───
exports.form = async (req, res) => {
  const integration = await prisma.marketplaceIntegration.findUnique({
    where: { slug: req.params.slug }
  });
  if (!integration) return res.redirect('/admin/integrations');

  let config = {};
  try { config = JSON.parse(integration.config || '{}'); } catch (e) {}

  // Для контекста — сколько товаров
  const totalProducts = await prisma.product.count();
  const publishedProducts = await prisma.product.count({ where: { published: true } });
  const withStock = await prisma.product.count({ where: { published: true, stock: { gt: 0 } } });

  // Логи
  const logs = await prisma.marketplaceSyncLog.findMany({
    where: { marketplace: integration.slug },
    orderBy: { startedAt: 'desc' },
    take: 20
  });

  res.render('admin/integrations/form', {
    integration,
    config,
    counts: { totalProducts, publishedProducts, withStock },
    logs,
    saved: req.query.saved === '1',
    error: req.query.error || null
  });
};

// ─── Сохранение настроек ───
exports.save = async (req, res) => {
  const slug = req.params.slug;
  const { enabled, direction, strategy, config } = req.body;

  const integration = await prisma.marketplaceIntegration.findUnique({
    where: { slug }
  });
  if (!integration) return res.redirect('/admin/integrations');

  // Сохраняем config как JSON
  let configStr = integration.config;
  if (config && typeof config === 'object') {
    // Собираем только непустые значения
    const clean = {};
    for (const [k, v] of Object.entries(config)) {
      if (v !== undefined && v !== '') clean[k] = v;
    }
    configStr = JSON.stringify(clean);
  }

  await prisma.marketplaceIntegration.update({
    where: { slug },
    data: {
      enabled: enabled === 'on' || enabled === 'true',
      direction: direction || 'both',
      strategy: strategy || 'merge',
      config: configStr
    }
  });

  res.redirect('/admin/integrations/' + slug + '?saved=1');
};

// ─── Toggle ───
exports.toggle = async (req, res) => {
  const integration = await prisma.marketplaceIntegration.findUnique({
    where: { slug: req.params.slug }
  });
  if (!integration) return res.redirect('/admin/integrations');

  await prisma.marketplaceIntegration.update({
    where: { slug: integration.slug },
    data: { enabled: !integration.enabled }
  });

  res.redirect('/admin/integrations');
};

// ─── Экспорт в YML ───
exports.exportYml = async (req, res) => {
  const slug = req.params.slug;
  const integration = await prisma.marketplaceIntegration.findUnique({
    where: { slug }
  });
  if (!integration) return res.redirect('/admin/integrations');

  // Создаём лог
  const log = await prisma.marketplaceSyncLog.create({
    data: {
      integrationId: integration.id,
      marketplace: slug,
      direction: 'export',
      action: 'yml',
      strategy: integration.strategy,
      status: 'started'
    }
  });

  try {
    const result = await exportSvc.generateYml({
      onlyWithStock: req.query.all !== '1',
      onlyPublished: true
    });

    // Обновляем лог
    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: {
        status: 'success',
        total: result.productsCount,
        created: result.productsCount,
        message: 'Файл сформирован',
        finishedAt: new Date()
      }
    });

    await prisma.marketplaceIntegration.update({
      where: { slug },
      data: { lastSyncAt: new Date(), lastSyncStatus: 'success' }
    });

    const filename = slug + '-export-' + new Date().toISOString().slice(0, 10) + '.yml';
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.send(result.xml);
  } catch (e) {
    console.error('export yml error:', e);
    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: {
        status: 'error',
        message: e.message,
        finishedAt: new Date()
      }
    });
    res.redirect('/admin/integrations/' + slug + '?error=' + encodeURIComponent(e.message));
  }
};

// ─── Экспорт CSV ───
exports.exportCsv = async (req, res) => {
  const slug = req.params.slug;
  const integration = await prisma.marketplaceIntegration.findUnique({
    where: { slug }
  });
  if (!integration) return res.redirect('/admin/integrations');

  const log = await prisma.marketplaceSyncLog.create({
    data: {
      integrationId: integration.id,
      marketplace: slug,
      direction: 'export',
      action: 'csv',
      strategy: integration.strategy,
      status: 'started'
    }
  });

  try {
    const csv = await exportSvc.generateCsv();

    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: {
        status: 'success',
        total: csv.split('\n').length - 1,
        message: 'CSV сформирован',
        finishedAt: new Date()
      }
    });

    const filename = slug + '-export-' + new Date().toISOString().slice(0, 10) + '.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.send(csv);
  } catch (e) {
    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: { status: 'error', message: e.message, finishedAt: new Date() }
    });
    res.redirect('/admin/integrations/' + slug + '?error=' + encodeURIComponent(e.message));
  }
};
