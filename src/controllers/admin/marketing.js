const { prisma } = require('../../config/db');
const newsletter = require('../../services/newsletter');

// ─── Подписчики ───
exports.subscribers = async (req, res) => {
  const filter = req.query.filter || 'all';
  const where = {};
  if (filter === 'confirmed') where.confirmed = true;
  if (filter === 'unconfirmed') where.confirmed = false;
  if (filter === 'unsubscribed') where.unsubscribed = true;

  const items = await prisma.subscriber.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500
  });
  const counts = {
    total: await prisma.subscriber.count(),
    confirmed: await prisma.subscriber.count({ where: { confirmed: true, unsubscribed: false } }),
    unconfirmed: await prisma.subscriber.count({ where: { confirmed: false, unsubscribed: false } }),
    unsubscribed: await prisma.subscriber.count({ where: { unsubscribed: true } })
  };
  res.render('admin/marketing/subscribers', { items, counts, filter });
};

exports.subscriberForm = async (req, res) => {
  const item = req.params.id
    ? await prisma.subscriber.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  res.render('admin/marketing/subscriber-form', { item, error: null });
};

exports.subscriberSave = async (req, res) => {
  const { email, name, phone, telegramChatId, confirmed, unsubscribed } = req.body;
  const data = {
    email: email || null,
    name: name || null,
    phone: phone || null,
    telegramChatId: telegramChatId || null,
    confirmed: confirmed === 'on',
    unsubscribed: unsubscribed === 'on'
  };
  try {
    if (req.params.id) {
      await prisma.subscriber.update({ where: { id: Number(req.params.id) }, data });
    } else {
      await prisma.subscriber.create({ data });
    }
    res.redirect('/admin/marketing/subscribers');
  } catch (e) {
    res.render('admin/marketing/subscriber-form', { item: req.body, error: e.message });
  }
};

exports.subscriberRemove = async (req, res) => {
  await prisma.subscriber.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/marketing/subscribers');
};

exports.subscribersExport = async (req, res) => {
  const items = await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } });
  const header = ['ID', 'Email', 'Имя', 'Телефон', 'Telegram Chat ID', 'Подтверждён', 'Отписан', 'Дата'];
  const rows = [header.join(';')];
  items.forEach(s => {
    rows.push([
      s.id, s.email || '', s.name || '', s.phone || '', s.telegramChatId || '',
      s.confirmed ? 'да' : 'нет', s.unsubscribed ? 'да' : 'нет',
      s.createdAt.toISOString()
    ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';'));
  });
  const csv = '\uFEFF' + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="subscribers-' + new Date().toISOString().slice(0,10) + '.csv"');
  res.send(csv);
};

// ─── Рассылки ───
exports.newsletters = async (req, res) => {
  const items = await prisma.newsletter.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.render('admin/marketing/newsletters', { items });
};

exports.newsletterForm = async (req, res) => {
  const item = req.params.id
    ? await prisma.newsletter.findUnique({ where: { id: Number(req.params.id) } })
    : null;
  const counts = {
    confirmed: await prisma.subscriber.count({ where: { confirmed: true, unsubscribed: false } }),
    withEmail: await prisma.subscriber.count({ where: { confirmed: true, unsubscribed: false, email: { not: null } } }),
    withTg: await prisma.subscriber.count({ where: { confirmed: true, unsubscribed: false, telegramChatId: { not: null } } })
  };
  res.render('admin/marketing/newsletter-form', { item, counts, error: null });
};

exports.newsletterSave = async (req, res) => {
  const { subject, content, channels } = req.body;
  if (!subject || !content) return res.redirect('/admin/marketing/newsletters');
  const chArr = [].concat(channels || 'email');
  const data = {
    subject, content,
    channels: JSON.stringify(chArr)
  };
  if (req.params.id) {
    await prisma.newsletter.update({ where: { id: Number(req.params.id) }, data });
    res.redirect('/admin/marketing/newsletters/' + req.params.id);
  } else {
    const created = await prisma.newsletter.create({ data });
    res.redirect('/admin/marketing/newsletters/' + created.id);
  }
};

exports.newsletterRemove = async (req, res) => {
  await prisma.newsletter.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/marketing/newsletters');
};

exports.newsletterSend = async (req, res) => {
  try {
    const result = await newsletter.broadcast(Number(req.params.id));
    res.json(result);
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
