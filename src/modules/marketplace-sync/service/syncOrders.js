const { prisma } = require('../../../config/db');
const access = require('./access');
const commission = require('./commission');
const ozon = require('./api/ozon');
const wb = require('./api/wildberries');

// ─── Создать/обновить заказ с маркетплейса в нашей БД ───
async function upsertMarketplaceOrder(data) {
  const { source, externalId, externalNumber, items, total, commission: exactCommission, customer, deliveryAddress, createdAt } = data;

  // Проверяем, есть ли уже
  const existing = await prisma.order.findFirst({
    where: { externalId: String(externalId), source }
  });
  if (existing) return { action: 'skipped', order: existing };

  // Комиссия: если API отдал точную — используем её; иначе из ручных ставок
  let commissionAmount = exactCommission || 0;
  let commissionStatus = exactCommission ? 'exact' : 'api_pending';
  let commissionPercent = 0;
  let netProfit = total - commissionAmount;

  if (exactCommission) {
    commissionPercent = total > 0 ? Math.round((exactCommission / total) * 10000) / 100 : 0;
  }

  // Генерируем внутренний номер
  const internalNumber = (source.toUpperCase().slice(0, 4)) + '-' + Date.now().toString(36).toUpperCase();

  // Создаём заказ
  const order = await prisma.order.create({
    data: {
      number: internalNumber,
      source,
      externalId: String(externalId),
      externalNumber: externalNumber ? String(externalNumber) : null,
      commissionPercent,
      commissionAmount,
      netProfit,
      commissionStatus,
      email: customer?.email || 'noreply@marketplace.local',
      phone: customer?.phone || '',
      name: customer?.name || 'Покупатель ' + source,
      address: deliveryAddress || '',
      payment: 'marketplace',
      delivery: 'marketplace',
      subtotal: total,
      deliveryFee: 0,
      total,
      status: 'PAID',
      createdAt: createdAt || new Date(),
      items: {
        create: items.map(i => ({
          productId: i.productId || null,
          name: i.name,
          price: i.price,
          qty: i.qty
        }))
      }
    },
    include: { items: true }
  });

  return { action: 'created', order };
}

// ─── Синхронизация Ozon ───
async function syncOzon(since) {
  const stats = { created: 0, skipped: 0, failed: 0, errors: [] };

  try {
    const postings = await ozon.getOrders(since);

    for (const posting of postings) {
      try {
        // Пропускаем отменённые
        if (posting.status === 'cancelled') continue;

        const items = (posting.products || []).map(p => ({
          name: p.name || 'Товар Ozon',
          price: Number(p.price) || 0,
          qty: Number(p.quantity) || 1,
          productId: null
        }));

        // Ищем наши товары по offer_id (SKU)
        for (let i = 0; i < items.length; i++) {
          const p = posting.products[i];
          if (p.offer_id) {
            const ourProduct = await prisma.product.findUnique({ where: { sku: String(p.offer_id) } });
            if (ourProduct) items[i].productId = ourProduct.id;
          }
        }

        // Точная комиссия от Ozon
        let exactCommission = 0;
        if (posting.financial_data && posting.financial_data.posting_services) {
          const services = posting.financial_data.posting_services;
          exactCommission = Number(services.commission_amount) || 0;
        }

        const total = (posting.products || []).reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);

        const result = await upsertMarketplaceOrder({
          source: 'ozon',
          externalId: posting.posting_number,
          externalNumber: posting.order_number || posting.posting_number,
          items,
          total,
          commission: exactCommission,
          customer: {
            email: '',
            phone: '',
            name: 'Ozon ' + posting.posting_number
          },
          deliveryAddress: posting.customer?.address || '',
          createdAt: posting.in_process_at ? new Date(posting.in_process_at) : new Date()
        });

        if (result.action === 'created') stats.created++;
        else stats.skipped++;
      } catch (e) {
        stats.failed++;
        stats.errors.push(posting.posting_number + ': ' + e.message);
      }
    }
  } catch (e) {
    stats.failed++;
    stats.errors.push('Ozon sync: ' + e.message);
  }

  return stats;
}

// ─── Синхронизация Wildberries ───
async function syncWildberries(since) {
  const stats = { created: 0, skipped: 0, failed: 0, errors: [] };

  try {
    const orders = await wb.getOrders(since);

    for (const o of orders) {
      try {
        if (o.isCancel || o.cancelDt) continue;

        // WB отдаёт только метаданные, детали нужны отдельным запросом
        let details;
        try {
          details = await wb.getOrderDetails(o.id);
        } catch (e) {
          details = o;
        }

        const items = (details.items || []).map(it => ({
          name: it.nmId ? ('Товар WB ' + it.nmId) : 'Товар WB',
          price: Number(it.price) / 100 || 0, // WB в копейках
          qty: 1,
          productId: null
        }));

        const total = items.reduce((s, i) => s + i.price * i.qty, 0);

        const result = await upsertMarketplaceOrder({
          source: 'wildberries',
          externalId: o.id,
          externalNumber: o.id,
          items,
          total,
          commission: 0, // WB отдаёт отчёт по комиссиям в другом API
          customer: {
            email: '',
            phone: '',
            name: 'WB ' + o.id
          },
          deliveryAddress: '',
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date()
        });

        if (result.action === 'created') stats.created++;
        else stats.skipped++;
      } catch (e) {
        stats.failed++;
        stats.errors.push(o.id + ': ' + e.message);
      }
    }
  } catch (e) {
    stats.failed++;
    stats.errors.push('WB sync: ' + e.message);
  }

  return stats;
}

// ─── Общая синхронизация ───
async function syncAll(hoursBack = 24) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const [ozonStats, wbStats] = await Promise.all([
    syncOzon(since),
    syncWildberries(since)
  ]);

  return {
    since,
    ozon: ozonStats,
    wildberries: wbStats,
    totalCreated: ozonStats.created + wbStats.created,
    totalFailed: ozonStats.failed + wbStats.failed
  };
}

module.exports = { syncAll, syncOzon, syncWildberries, upsertMarketplaceOrder };
