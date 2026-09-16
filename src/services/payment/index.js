const { prisma } = require('../../config/db');

async function listActive() {
  return prisma.paymentMethod.findMany({
    where: { active: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }]
  });
}

async function getByCode(code) {
  return prisma.paymentMethod.findUnique({ where: { code } });
}

/**
 * Возвращает { redirect: '/url' } — куда перебросить после создания заказа.
 * Для типов stripe/yookassa, если не настроены ключи — тоже редиректит на success
 * с пометкой, что оплата будет уточнена менеджером.
 */
async function createPayment(order, method) {
  if (!method) return { redirect: '/checkout/success?order=' + order.number };

  switch (method.type) {
    case 'cod':
    case 'manual':
    case 'other':
      return { redirect: '/checkout/success?order=' + order.number };

    case 'stripe': {
      try {
        const stripeSvc = require('./stripe');
        return await stripeSvc.create(order);
      } catch (e) {
        console.error('Stripe error:', e.message);
        return { redirect: '/checkout/success?order=' + order.number };
      }
    }

    case 'yookassa': {
      try {
        const yooSvc = require('./yookassa');
        return await yooSvc.create(order);
      } catch (e) {
        console.error('YooKassa error:', e.message);
        return { redirect: '/checkout/success?order=' + order.number };
      }
    }

    default:
      return { redirect: '/checkout/success?order=' + order.number };
  }
}

module.exports = { listActive, getByCode, createPayment };
