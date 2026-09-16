const { prisma } = require('../../config/db');

async function listActive() {
  return prisma.deliveryMethod.findMany({
    where: { active: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }]
  });
}

/**
 * Считает стоимость доставки
 * @param {Object} method — запись DeliveryMethod
 * @param {Number} subtotal — сумма товаров
 * @param {Number} weight — общий вес в кг
 */
function calc(method, subtotal, weight) {
  if (!method) return { cost: 0, free: true, note: '' };

  switch (method.type) {
    case 'free':
      return { cost: 0, free: true, note: '' };

    case 'flat': {
      if (method.freeFrom && subtotal >= method.freeFrom) {
        return { cost: 0, free: true, note: 'бесплатно от ' + method.freeFrom + ' ₽' };
      }
      return { cost: method.price || 0, free: false, note: '' };
    }

    case 'weight': {
      const pricePerKg = method.pricePerKg || 0;
      const cost = Math.round(weight * pricePerKg);
      if (method.freeFrom && subtotal >= method.freeFrom) {
        return { cost: 0, free: true, note: 'бесплатно от ' + method.freeFrom + ' ₽' };
      }
      return { cost, free: false, note: 'за ' + weight.toFixed(2) + ' кг' };
    }

    case 'manager':
      return { cost: 0, free: false, note: 'уточнит менеджер' };

    default:
      return { cost: 0, free: true, note: '' };
  }
}

module.exports = { listActive, calc };
