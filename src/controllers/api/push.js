const { prisma } = require('../../config/db');
const push = require('../../services/push');

// ─── Публичный ключ для клиента ───
exports.publicKey = (req, res) => {
  res.json({ key: push.getPublicKey() });
};

// ─── Сохранить подписку ───
exports.subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ ok: false, error: 'Неверные данные подписки' });
    }

    const user = req.session.user;
    const userId = user ? user.id : null;
    const userAgent = (req.headers['user-agent'] || '').slice(0, 500);

    // Upsert по endpoint
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint }
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent,
          active: true,
          failCount: 0
        }
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent
        }
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('push subscribe error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};

// ─── Удалить подписку ───
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ ok: false });

    await prisma.pushSubscription.updateMany({
      where: { endpoint },
      data: { active: false }
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

// ─── Статус подписки текущего пользователя ───
exports.status = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.json({ ok: true, subscribed: false });

    const count = await prisma.pushSubscription.count({
      where: { userId: user.id, active: true }
    });

    res.json({ ok: true, subscribed: count > 0, count });
  } catch (e) {
    res.json({ ok: false });
  }
};

// ─── Тестовое уведомление (для проверки) ───
exports.test = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ ok: false });

    const result = await push.sendToUser(user.id, {
      title: '🔔 Тестовое уведомление',
      body: 'Push-уведомления работают! Спасибо, что вы с нами.',
      url: '/account',
      tag: 'test',
      icon: '/icons/icon-192.png'
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
