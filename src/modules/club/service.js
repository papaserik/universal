const { prisma } = require('../../config/db');
const crypto = require('crypto');

// Генерирует уникальный 8-символьный код
async function generateRefCode() {
  let code;
  let attempts = 0;
  do {
    code = crypto.randomBytes(4).toString('hex').toUpperCase();
    attempts++;
    if (attempts > 20) throw new Error('Не удалось сгенерировать код');
  } while (await prisma.user.findUnique({ where: { refCode: code } }));
  return code;
}

// Устанавливает refCode пользователю, если его нет
async function ensureRefCode(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  if (user.refCode) return user.refCode;

  const code = await generateRefCode();
  await prisma.user.update({ where: { id: userId }, data: { refCode: code } });
  return code;
}

// Находит пригласившего по коду
async function findByCode(code) {
  if (!code) return null;
  return prisma.user.findUnique({ where: { refCode: code.toUpperCase() } });
}

// Создаёт связь реферала (при регистрации нового)
// Правила:
// - пригласивший существует и активен
// - приглашённый ≠ пригласивший
// - приглашённый ещё не привязан к другому
async function createReferral(inviterId, invitedId) {
  if (inviterId === invitedId) return null;

  // Проверка: уже есть связь
  const existing = await prisma.referral.findUnique({ where: { invitedId } });
  if (existing) return null;

  const inviter = await prisma.user.findUnique({ where: { id: inviterId } });
  if (!inviter || !inviter.active) return null;

  return prisma.referral.create({
    data: { inviterId, invitedId, status: 'registered' }
  });
}

// Начисляет pending-баллы приглашённому (не тратятся до первой покупки)
async function awardPendingPoints(userId, points) {
  if (!points || points <= 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: { pendingReferralPoints: { increment: points } }
  });
  // Лог для истории
  try {
    const loyalty = require('../modules/loyalty/service');
    await loyalty.addPoints(userId, 0, 'referral_pending',
      `Бонус за регистрацию по приглашению (${points} б. разблокируются после первой покупки)`);
  } catch (e) {}
}

// Разблокирует pending-баллы после первой покупки
async function unlockPendingPoints(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.pendingReferralPoints || user.pendingReferralPoints <= 0) return 0;

  const points = user.pendingReferralPoints;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { pendingReferralPoints: 0 }
    })
  ]);

  // Начисляем реальные баллы
  const loyalty = require('../modules/loyalty/service');
  await loyalty.addPoints(userId, points, 'referral_unlock',
    'Реферальные баллы разблокированы после первой покупки');

  return points;
}

// ─── Обработка заказа для реферальной программы ───
// Вызывается при успешном оформлении заказа.
// 1. Если это первый заказ приглашённого — разблокируем его pending-баллы
// 2. Пригласившему начисляем бонус за первую покупку + кэшбэк % с заказа
async function processOrder(order, buyerId) {
  if (!order || !buyerId) return;

  const { getSetting } = require('../../services/settings');
  const loyalty = require('../modules/loyalty/service');

  const link = await prisma.referral.findUnique({
    where: { invitedId: buyerId }
  });

  // Покупатель не был приглашён — ничего не делаем
  if (!link) return;

  const enabled = (await getSetting('module_club', '1')) === '1';
  if (!enabled) return;

  // ─── 1. Первый заказ: разблокировка баллов приглашённого + бонус пригласившему ───
  if (link.status === 'registered') {
    // Разблокируем pending-баллы покупателю
    const unlocked = await unlockPendingPoints(buyerId);
    if (unlocked > 0) {
      console.log('[referral] Разблокировано', unlocked, 'баллов для userId', buyerId);
    }

    // Начисляем бонус пригласившему
    const bonusPoints = Number(await getSetting('referral_first_purchase_bonus', '500')) || 0;
    if (bonusPoints > 0) {
      await loyalty.addPoints(
        link.inviterId,
        bonusPoints,
        'referral_bonus',
        'Бонус за первую покупку приглашённого друга'
      );
      console.log('[referral] Пригласившему начислено', bonusPoints, 'бонусных баллов');
    }

    // Обновляем статус связи
    await prisma.referral.update({
      where: { id: link.id },
      data: {
        status: 'converted',
        firstOrderId: order.id,
        convertedAt: new Date(),
        totalEarned: bonusPoints
      }
    });
  }

  // ─── 2. Кэшбэк пригласившему с каждой покупки друга ───
  const cashbackPercent = Number(await getSetting('referral_cashback_percent', '2')) || 0;
  if (cashbackPercent > 0 && order.total > 0) {
    const cashbackPoints = Math.round(order.total * cashbackPercent / 100);
    if (cashbackPoints > 0) {
      await loyalty.addPoints(
        link.inviterId,
        cashbackPoints,
        'referral_cashback',
        `${cashbackPercent}% от заказа друга (${order.number})`
      );
      await prisma.referral.update({
        where: { id: link.id },
        data: { totalEarned: { increment: cashbackPoints } }
      });
      console.log('[referral] Пригласившему начислено', cashbackPoints, 'кэшбэка');
    }
  }
}

// Получить статистику рефералов для пользователя
async function stats(userId) {
  const [sent, earned, bonuses] = await Promise.all([
    prisma.referral.findMany({
      where: { inviterId: userId },
      include: { invited: { select: { email: true, name: true, createdAt: true } } },
      orderBy: { invitedAt: 'desc' }
    }),
    prisma.loyaltyTransaction.aggregate({
      where: { userId, type: { in: ['referral_bonus', 'referral_cashback'] } },
      _sum: { points: true }
    }),
    prisma.loyaltyTransaction.findMany({
      where: { userId, type: { in: ['referral_bonus', 'referral_cashback'] } },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  ]);

  const totalInvited = sent.length;
  const converted = sent.filter(r => r.status === 'converted').length;
  const totalEarned = earned._sum.points || 0;

  return { referrals: sent, totalInvited, converted, totalEarned, bonuses };
}

module.exports = {
  generateRefCode,
  ensureRefCode,
  findByCode,
  createReferral,
  awardPendingPoints,
  unlockPendingPoints,
  processOrder,
  stats
};
