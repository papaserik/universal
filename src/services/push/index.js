const webpush = require('web-push');
const { prisma } = require('../../config/db');

// Настраиваем VAPID один раз при загрузке
let configured = false;
function setup() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@shop.local';

  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID-ключи не заданы — push-уведомления отключены');
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  console.log('[push] VAPID настроены');
}

// ─── Отправка одному подписчику ───
async function sendToSubscription(subscription, payload) {
  setup();
  if (!configured) return { ok: false, error: 'not_configured' };

  const pushSub = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };

  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload));
    // Обновляем статистику
    await prisma.pushSubscription.update({
      where: { id: subscription.id },
      data: { lastSentAt: new Date(), failCount: 0 }
    });
    return { ok: true };
  } catch (e) {
    console.error('[push] ошибка:', e.statusCode, e.message);
    // 404/410 = подписка недействительна — деактивируем
    if (e.statusCode === 404 || e.statusCode === 410) {
      await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { active: false }
      });
    } else {
      // Просто увеличиваем счётчик ошибок
      await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { failCount: { increment: 1 } }
      });
    }
    return { ok: false, error: e.message };
  }
}

// ─── Отправка всем подпискам пользователя ───
async function sendToUser(userId, payload) {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId, active: true }
  });
  if (!subs.length) return { ok: true, sent: 0 };

  const results = await Promise.all(subs.map(s => sendToSubscription(s, payload)));
  const sent = results.filter(r => r.ok).length;
  return { ok: true, sent, total: subs.length };
}

// ─── Отправка всем активным подпискам (для админа/маркетинга) ───
async function sendToAll(payload, filter = {}) {
  const subs = await prisma.pushSubscription.findMany({
    where: { active: true, ...filter }
  });
  if (!subs.length) return { ok: true, sent: 0 };

  const results = await Promise.all(subs.map(s => sendToSubscription(s, payload)));
  const sent = results.filter(r => r.ok).length;
  return { ok: true, sent, total: subs.length };
}

// ─── Отправка админам (для уведомлений о заказах) ───
async function sendToAdmins(payload) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'MANAGER'] }, active: true },
    select: { id: true }
  });
  const adminIds = admins.map(a => a.id);
  if (!adminIds.length) return { ok: true, sent: 0 };

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: adminIds }, active: true }
  });

  const results = await Promise.all(subs.map(s => sendToSubscription(s, payload)));
  const sent = results.filter(r => r.ok).length;
  return { ok: true, sent, total: subs.length };
}

// ─── Публичный ключ для клиента ───
function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

module.exports = {
  sendToSubscription,
  sendToUser,
  sendToAll,
  sendToAdmins,
  getPublicKey,
  setup
};
