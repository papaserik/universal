const cron = require('node-cron');
const { prisma } = require('../../../config/db');
const push = require('./index');
const { getSetting } = require('../../../services/settings');

// ─── Проверка брошенных корзин ───
async function checkAbandonedCarts() {
  const enabled = (await getSetting('push_cart_abandoned', '0')) === '1';
  if (!enabled) return { ok: true, skipped: 'disabled' };

  const hoursAgo = Number(await getSetting('push_cart_hours', '2')) || 2;
  const threshold = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const cooldown = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Ищем корзины для отправки:
  // - активные
  // - с товарами
  // - не обновлялись больше N часов
  // - push ещё не отправлялся или был больше суток назад
  // - есть userId (иначе нет кому отправлять)
  const carts = await prisma.cart.findMany({
    where: {
      status: 'active',
      itemCount: { gt: 0 },
      userId: { not: null },
      updatedAt: { lt: threshold },
      OR: [
        { pushSentAt: null },
        { pushSentAt: { lt: cooldown } }
      ]
    },
    include: {
      user: { select: { id: true, name: true, email: true } }
    },
    take: 100
  });

  if (!carts.length) {
    console.log('[push/cron] Брошенных корзин для отправки нет');
    return { ok: true, sent: 0, total: 0 };
  }

  let sent = 0, failed = 0;

  for (const cart of carts) {
    try {
      // Проверяем, есть ли у юзера активная подписка
      const subsCount = await prisma.pushSubscription.count({
        where: { userId: cart.userId, active: true }
      });
      if (!subsCount) {
        // Помечаем, чтобы не проверять каждый раз
        await prisma.cart.update({
          where: { id: cart.id },
          data: { pushSentAt: new Date() }
        });
        continue;
      }

      const name = cart.user.name || cart.user.email.split('@')[0];
      const itemCount = cart.itemCount;
      const total = Math.round(cart.total);

      const result = await push.sendToUser(cart.userId, {
        title: '🛒 Забыли про товары?',
        body: name + ', у вас в корзине ' + itemCount + ' товар' + (itemCount === 1 ? '' : (itemCount < 5 ? 'а' : 'ов')) + ' на ' + total + ' ₽',
        url: '/cart',
        tag: 'cart-abandoned-' + cart.id,
        icon: '/icons/icon-192.png',
        actions: [
          { action: 'open_cart', title: 'Открыть корзину' }
        ]
      });

      if (result && result.sent > 0) {
        sent++;
        console.log('[push/cron] Отправлено ' + cart.user.email + ' (' + itemCount + ' тов., ' + total + ' ₽)');
      }

      // Помечаем, что отправлено (даже если неуспешно — не спамим)
      await prisma.cart.update({
        where: { id: cart.id },
        data: { pushSentAt: new Date() }
      });
    } catch (e) {
      failed++;
      console.error('[push/cron] Ошибка для cart#' + cart.id + ':', e.message);
    }
  }

  return { ok: true, sent, failed, total: carts.length };
}

// ─── Ежедневная сводка админу ───
async function dailyDigest() {
  const enabled = (await getSetting('push_daily_digest', '0')) === '1';
  if (!enabled) return { ok: true, skipped: 'disabled' };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } },
    select: { total: true, source: true }
  });

  if (!orders.length) {
    console.log('[push/cron] Сводка: заказов за сутки нет');
    return { ok: true, sent: 0 };
  }

  const totalSum = orders.reduce((s, o) => s + o.total, 0);
  const count = orders.length;
  const ownCount = orders.filter(o => (o.source || 'own') === 'own').length;
  const mpCount = count - ownCount;

  let body = count + ' заказ' + (count === 1 ? '' : (count < 5 ? 'а' : 'ов')) + ' на ' + Math.round(totalSum) + ' ₽';
  if (mpCount > 0) {
    body += ' (свой: ' + ownCount + ', МП: ' + mpCount + ')';
  }

  const result = await push.sendToAdmins({
    title: '📊 Сводка за сутки',
    body,
    url: '/admin/sales',
    tag: 'daily-digest-' + new Date().toISOString().slice(0, 10),
    icon: '/icons/icon-192.png'
  });

  console.log('[push/cron] Сводка отправлена:', result.sent);
  return { ok: true, sent: result.sent };
}

// ─── Запуск всех cron-задач ───
let started = false;

function start() {
  if (started) return;
  started = true;

  // Каждые 30 минут — проверяем брошенные корзины
  cron.schedule('*/30 * * * *', () => {
    checkAbandonedCarts().catch(e => console.error('[push/cron] carts error:', e.message));
  });

  // Каждый день в 9:00 — сводка админам
  cron.schedule('0 9 * * *', () => {
    dailyDigest().catch(e => console.error('[push/cron] digest error:', e.message));
  });

  console.log('[push/cron] Запущены задачи: брошенные корзины (каждые 30 мин), сводка (в 9:00)');
}

// ─── Ручной запуск для отладки ───
async function runNow(task) {
  if (task === 'carts') return checkAbandonedCarts();
  if (task === 'digest') return dailyDigest();
  return { ok: false, error: 'unknown task' };
}

module.exports = { start, checkAbandonedCarts, dailyDigest, runNow };
