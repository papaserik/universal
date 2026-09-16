const { prisma } = require('../config/db');
const { getSetting } = require('./settings');

function num(s, def) { const n = Number(s); return isNaN(n) ? def : n; }

async function settings() {
  return {
    enabled:        (await getSetting('loyalty_enabled', '1')) === '1',
    pointsPerRub:   num(await getSetting('loyalty_points_per_rub', '0.05'), 0.05),
    pointValue:     num(await getSetting('loyalty_point_value', '1'), 1),
    maxPayPercent:  num(await getSetting('loyalty_max_pay_percent', '50'), 50),
    forSignup:      num(await getSetting('loyalty_points_for_signup', '100'), 100),
    forSubscribe:   num(await getSetting('loyalty_points_for_subscribe', '50'), 50),
    forReview:      num(await getSetting('loyalty_points_for_review', '30'), 30)
  };
}

async function balance(userId) {
  const plus = await prisma.loyaltyTransaction.aggregate({
    where: { userId, points: { gt: 0 } },
    _sum: { points: true }
  });
  const minus = await prisma.loyaltyTransaction.aggregate({
    where: { userId, points: { lt: 0 } },
    _sum: { points: true }
  });
  return (plus._sum.points || 0) + (minus._sum.points || 0);
}

async function addPoints(userId, points, type, reason, description, orderId) {
  if (!userId || !points) return null;
  return prisma.loyaltyTransaction.create({
    data: {
      userId,
      points: Math.round(points),
      type, reason,
      description: description || null,
      orderId: orderId || null
    }
  });
}

async function currentLevel(userId) {
  const b = await balance(userId);
  const levels = await prisma.loyaltyLevel.findMany({
    where: { active: true },
    orderBy: { minPoints: 'desc' }
  });
  const current = levels.find(l => b >= l.minPoints) || null;
  const next = levels.filter(l => l.minPoints > b).sort((a, b) => a.minPoints - b.minPoints)[0] || null;
  return { balance: b, current, next, levels };
}

async function awardForOrder(order, userId) {
  if (!userId) return;
  const s = await settings();
  if (!s.enabled) return;
  // Проверяем, не начисляли ли уже
  const existing = await prisma.loyaltyTransaction.findFirst({
    where: { orderId: order.id, type: 'order_cashback' }
  });
  if (existing) return;

  const points = Math.round(order.subtotal * s.pointsPerRub);
  if (points > 0) {
    await addPoints(userId, points, 'order_cashback',
      'Кэшбэк за заказ ' + order.number,
      'Начислено ' + points + ' баллов', order.id);
  }
}

async function spendPoints(userId, points, reason, orderId) {
  if (!userId || !points) return null;
  return addPoints(userId, -Math.abs(points), 'order_payment', reason, null, orderId);
}

module.exports = { settings, balance, addPoints, currentLevel, awardForOrder, spendPoints };
