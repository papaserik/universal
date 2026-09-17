const { prisma } = require('../../../config/db');
const access = require('./access');
const ozon = require('./api/ozon');
const wb = require('./api/wildberries');

/**
 * Собирает товары с внешним ID для конкретного маркетплейса.
 */
async function getProductsForMarketplace(marketplace) {
  const products = await prisma.product.findMany({
    where: { published: true }
  });

  const result = [];
  for (const p of products) {
    let ext = {};
    try { ext = JSON.parse(p.externalIds || '{}'); } catch (e) {}
    const externalId = ext[marketplace];
    if (externalId) {
      result.push({ product: p, externalId: String(externalId) });
    }
  }
  return result;
}

/**
 * Синхронизация остатков на маркетплейс.
 * @param {string} marketplace - 'ozon' | 'wildberries'
 * @param {Array<number>} productIds - опционально: конкретные товары (если не задано — все)
 */
async function syncStocks(marketplace, productIds = null) {
  const stats = { total: 0, updated: 0, failed: 0, skipped: 0, errors: [] };

  const items = await getProductsForMarketplace(marketplace);
  const filtered = productIds
    ? items.filter(i => productIds.includes(i.product.id))
    : items;

  stats.total = filtered.length;
  if (!filtered.length) {
    stats.errors.push('Нет товаров с externalId для ' + marketplace);
    return stats;
  }

  if (marketplace === 'ozon') {
    // Ozon принимает пачками
    const chunk = 100;
    for (let i = 0; i < filtered.length; i += chunk) {
      const batch = filtered.slice(i, i + chunk).map(x => ({
        offer_id: x.externalId,
        stock: x.product.stock || 0
      }));

      try {
        const r = await ozon.updateStocks(batch);
        if (r.ok) {
          // Ozon возвращает результат по каждой позиции
          const results = (r.result && r.result.result) || [];
          for (const res of results) {
            if (res.updated) stats.updated++;
            else {
              stats.failed++;
              if (res.errors && res.errors.length) {
                stats.errors.push(res.offer_id + ': ' + res.errors.join(', '));
              }
            }
          }
        } else {
          stats.failed += batch.length;
          stats.errors.push(r.error);
        }
      } catch (e) {
        stats.failed += batch.length;
        stats.errors.push('Ozon: ' + e.message);
      }
    }
  } else if (marketplace === 'wildberries') {
    // WB принимает пачками до 1000
    const chunk = 1000;
    for (let i = 0; i < filtered.length; i += chunk) {
      const batch = filtered.slice(i, i + chunk).map(x => ({
        sku: x.externalId,
        stock: x.product.stock || 0
      }));

      try {
        const r = await wb.updateStocks(batch);
        if (r.ok) stats.updated += batch.length;
        else {
          stats.failed += batch.length;
          stats.errors.push(r.error);
        }
      } catch (e) {
        stats.failed += batch.length;
        stats.errors.push('WB: ' + e.message);
      }
    }
  } else {
    stats.errors.push('Синхронизация остатков для ' + marketplace + ' не поддерживается');
  }

  return stats;
}

/**
 * Синхронизация цен на маркетплейс.
 */
async function syncPrices(marketplace, productIds = null) {
  const stats = { total: 0, updated: 0, failed: 0, skipped: 0, errors: [] };

  const items = await getProductsForMarketplace(marketplace);
  const filtered = productIds
    ? items.filter(i => productIds.includes(i.product.id))
    : items;

  stats.total = filtered.length;
  if (!filtered.length) {
    stats.errors.push('Нет товаров с externalId для ' + marketplace);
    return stats;
  }

  if (marketplace === 'ozon') {
    const chunk = 100;
    for (let i = 0; i < filtered.length; i += chunk) {
      const batch = filtered.slice(i, i + chunk).map(x => ({
        offer_id: x.externalId,
        price: x.product.price,
        old_price: x.product.oldPrice || 0
      }));

      try {
        const r = await ozon.updatePrices(batch);
        if (r.ok) {
          const results = (r.result && r.result.result) || [];
          for (const res of results) {
            if (res.updated) stats.updated++;
            else {
              stats.failed++;
              if (res.errors && res.errors.length) {
                stats.errors.push(res.offer_id + ': ' + res.errors.join(', '));
              }
            }
          }
        } else {
          stats.failed += batch.length;
          stats.errors.push(r.error);
        }
      } catch (e) {
        stats.failed += batch.length;
        stats.errors.push('Ozon: ' + e.message);
      }
    }
  } else if (marketplace === 'wildberries') {
    // WB: нужен nmID (числовой), не SKU. Пока не поддерживаем — слишком сложная связка.
    stats.errors.push('Синхронизация цен для WB требует nmID — настройте через личный кабинет WB');
    stats.skipped = filtered.length;
  } else {
    stats.errors.push('Синхронизация цен для ' + marketplace + ' не поддерживается');
  }

  return stats;
}

module.exports = { syncStocks, syncPrices, getProductsForMarketplace };
