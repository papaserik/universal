const { prisma } = require('../config/db');
const { getSetting } = require('../services/settings');

exports.form = async (req, res) => {
  res.locals.setMeta({
    title: 'Контакты',
    description: 'Свяжитесь с нами: ' + (await getSetting('phone')) + ', ' + (await getSetting('email'))
  });
  res.locals.addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Контакты',
    url: res.locals.meta.canonical
  });
  res.render('pages/contacts', { sent: req.query.sent === '1', error: null });
};

exports.submit = async (req, res) => {
  const { name, email, phone, message, agree } = req.body;

  if (!name || !email || !message) {
    return res.render('pages/contacts', { sent: false, error: 'Заполните обязательные поля' });
  }
  if (!agree) {
    return res.render('pages/contacts', { sent: false, error: 'Необходимо согласие на обработку данных' });
  }
  // Простейший honeypot от ботов
  if (req.body.website) {
    return res.redirect('/contacts?sent=1');
  }

  // Пишем сообщение в БД (используем Page с особым slug-префиксом)
  // В идеале — отдельная модель, но пока так, чтобы не мигрировать
  const text = [
    'Имя: ' + name,
    'Email: ' + email,
    'Телефон: ' + (phone || '—'),
    '---',
    message
  ].join('\n');

  await prisma.page.create({
    data: {
      slug: 'contact-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      title: 'Сообщение от ' + name + ' (' + email + ')',
      content: '<pre>' + text.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])) + '</pre>',
      published: false
    }
  });

  res.redirect('/contacts?sent=1');
};
