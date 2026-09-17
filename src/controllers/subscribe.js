const { prisma } = require('../config/db');
const mail = require('../services/mail');
const { getSetting } = require('../services/settings');
const loyalty = require('../modules/loyalty/service');
const logger = require('../lib/logger');

// ─── Подписка ───
exports.form = async (req, res) => {
  res.render('pages/subscribe', { sent: false, error: null, unsubscribed: false, email: '' });
};

exports.submit = async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const name = (req.body.name || '').trim();

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.render('pages/subscribe', { sent: false, error: 'Введите корректный email', unsubscribed: false, email });
  }
  if (!req.body.agree) {
    return res.render('pages/subscribe', { sent: false, error: 'Необходимо согласие на обработку данных', unsubscribed: false, email });
  }

  try {
    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (existing) {
      if (existing.unsubscribed) {
        await prisma.subscriber.update({
          where: { id: existing.id },
          data: { unsubscribed: false, confirmed: true, name: name || existing.name }
        });
        return res.render('pages/subscribe', { sent: true, error: null, unsubscribed: false, email });
      }
      return res.render('pages/subscribe', { sent: true, error: null, unsubscribed: false, email });
    }

    await prisma.subscriber.create({
      data: {
        email,
        name: name || null,
        confirmed: true,
        source: 'site'
      }
    });

    // Баллы за подписку — если пользователь авторизован и email совпадает
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const ls = await loyalty.settings();
        if (ls.enabled && ls.forSubscribe > 0) {
          // Не начислять повторно
          const already = await prisma.loyaltyTransaction.findFirst({
            where: { userId: user.id, type: 'subscribe' }
          });
          if (!already) {
            await loyalty.addPoints(user.id, ls.forSubscribe, 'subscribe', 'Бонус за подписку на новости');
          }
        }
      }
    } catch (e) { logger.error('subscribe points:', e); }

    // Приветственное письмо
    const siteName = await getSetting('site_name', 'Магазин');
    mail.send({
      to: email,
      subject: 'Подписка оформлена — ' + siteName,
      html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">' +
        '<h2 style="color:#111">Спасибо за подписку!</h2>' +
        '<p style="color:#374151;line-height:1.7">Теперь вы будете получать первыми наши новости, акции и скидки в ' + siteName + '.</p>' +
        '<p style="font-size:12px;color:#9ca3af">Если захотите отписаться — <a href="' + (process.env.SITE_URL || '') + '/unsubscribe?email=' + encodeURIComponent(email) + '">отписаться</a>.</p>' +
        '</div>'
    }).catch(() => {});

    res.render('pages/subscribe', { sent: true, error: null, unsubscribed: false, email });
  } catch (e) {
    logger.error('subscribe error:', e);
    res.render('pages/subscribe', { sent: false, error: 'Ошибка сервера. Попробуйте позже.', unsubscribed: false, email });
  }
};

// ─── Отписка ───
exports.unsubscribe = async (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) return res.render('pages/subscribe', { sent: false, error: null, unsubscribed: false, email: '' });

  const sub = await prisma.subscriber.findUnique({ where: { email } });
  if (sub) {
    await prisma.subscriber.update({
      where: { id: sub.id },
      data: { unsubscribed: true, confirmed: false }
    });
  }
  res.render('pages/subscribe', { sent: false, error: null, unsubscribed: true, email });
};
