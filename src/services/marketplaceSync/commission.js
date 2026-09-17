const { prisma } = require('../../config/db');
const access = require('./access');

/**
 * Определяет, нужно ли вообще считать комиссию.
 * Если API подключено → false (комиссия будет получена от API)
 * Если API нет → true (считаем вручную)
 */
async function shouldUseManualCommission(marketplace) {
  if (!marketplace || marketplace === 'own') return false;
  const a = await access.hasApiAccess(marketplace);
  // Если API готово — НЕ считаем вручную (данные придут из API)
  return !a.ok;
}

/**
 * Ручная комиссия: товар → категория → null (не задано).
 * Никакого «дефолта» — если пользователь не задал, значит не считаем.
 */
async function getManualCommission(marketplace, product) {
  if (!marketplace || marketplace === 'own') {
    return { percent: 0, source: 'own', label: 'Свой магазин' };
  }

  // 1. По товару
  if (product && product.id) {
    const byProduct = await prisma.commissionRate.findFirst({
      where: { marketplace, productId: product.id }
    });
    if (byProduct) {
      return { percent: byProduct.percent, source: 'product', label: 'ставка товара' };
    }
  }

  // 2. По категории
  if (product && product.categoryId) {
    const byCategory = await prisma.commissionRate.findFirst({
      where: { marketplace, categoryId: product.categoryId, productId: null }
    });
    if (byCategory) {
      return { percent: byCategory.percent, source: 'category', label: 'ставка категории' };
    }
  }

  // Не задано — не считаем
  return { percent: 0, source: 'none', label: 'ставка не задана' };
}

/**
 * Основной расчёт для одной позиции.
 */
async function getCommission(marketplace, product) {
  if (!marketplace || marketplace === 'own') {
    return { percent: 0, source: 'own', label: 'Свой магазин' };
  }

  const a = await access.hasApiAccess(marketplace);
  if (a.ok) {
    return { percent: 0, source: 'api_pending', label: 'ожидает API' };
  }

  return getManualCommission(marketplace, product);
}

/**
 * Расчёт комиссии для всего заказа.
 * Возвращает точную структуру + флаг, откуда взяты данные.
 */
async function calcOrderCommission(marketplace, items) {
  if (!marketplace || marketplace === 'own') {
    return {
      percent: 0,
      amount: 0,
      netProfit: items.reduce((s, i) => s + i.price * i.qty, 0),
      source: 'own',
      sourceLabel: 'Свой магазин',
      apiPending: false,
      breakdown: items.map(i => ({
        name: i.name, price: i.price, qty: i.qty,
        percent: 0, commission: 0, source: 'own'
      }))
    };
  }

  const a = await access.hasApiAccess(marketplace);

  // Загружаем товары (нужны категории)
  const productIds = items.map(i => i.productId).filter(Boolean);
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, categoryId: true } })
    : [];
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  const breakdown = [];
  let totalSum = 0;
  let totalCommission = 0;

  for (const item of items) {
    const p = item.productId ? productMap[item.productId] : null;
    const c = await getCommission(marketplace, p);
    const lineTotal = item.price * item.qty;
    const lineCommission = lineTotal * c.percent / 100;

    breakdown.push({
      name: item.name,
      price: item.price,
      qty: item.qty,
      percent: c.percent,
      source: c.source,
      label: c.label,
      commission: Math.round(lineCommission * 100) / 100
    });

    totalSum += lineTotal;
    totalCommission += lineCommission;
  }

  const avgPercent = totalSum > 0 ? (totalCommission / totalSum) * 100 : 0;

  return {
    percent: Math.round(avgPercent * 100) / 100,
    amount: Math.round(totalCommission * 100) / 100,
    netProfit: Math.round((totalSum - totalCommission) * 100) / 100,
    source: a.ok ? 'api_pending' : 'manual',
    sourceLabel: a.ok ? 'Ожидает точной комиссии от API' : 'Ручная ставка',
    apiPending: a.ok,
    breakdown
  };
}

module.exports = {
  getCommission,
  getManualCommission,
  calcOrderCommission,
  shouldUseManualCommission
};
