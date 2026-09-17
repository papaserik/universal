const { prisma } = require('../../config/db');
const push = require('../../services/push');

exports.index = async (req, res) => {
  const [total, active, users, recent] = await Promise.all([
    prisma.pushSubscription.count(),
    prisma.pushSubscription.count({ where: { active: true } }),
    prisma.user.count({ where: { pushSubscriptions: { some: { active: true } } } }),
    prisma.pushSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { email: true, name: true } } }
    })
  ]);

  res.render('admin/push/index', {
    stats: { total, active, users, inactive: total - active },
    subscriptions: recent,
    msg: req.query.msg || null,
    error: req.query.error || null,
    sent: req.query.sent || null
  });
};

exports.broadcast = async (req, res) => {
  try {
    const { title, body, url } = req.body;
    if (!title || !body) {
      return res.redirect('/admin/push?error=' + encodeURIComponent('Заполните заголовок и текст'));
    }

    const result = await push.sendToAll({
      title,
      body,
      url: url || '/',
      icon: '/icons/icon-192.png',
      tag: 'broadcast-' + Date.now()
    });

    res.redirect('/admin/push?sent=' + result.sent + '&msg=' + encodeURIComponent('Отправлено: ' + result.sent + ' из ' + result.total));
  } catch (e) {
    res.redirect('/admin/push?error=' + encodeURIComponent(e.message));
  }
};

exports.remove = async (req, res) => {
  await prisma.pushSubscription.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/push?msg=' + encodeURIComponent('Подписка удалена'));
};
