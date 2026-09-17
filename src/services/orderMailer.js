const { getSetting } = require('./settings');
const mail = require('./mail');
const logger = require('../lib/logger');

function money(n) { return Number(n).toLocaleString('ru-RU') + ' ₽'; }

exports.notifyAdmin = async (order) => {
  const adminEmail = await getSetting('order_notify_email') || await getSetting('email');
  if (!adminEmail) return;
  const rows = order.items.map(i =>
    `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.price} ₽</td><td>${i.price * i.qty} ₽</td></tr>`
  ).join('');
  const html = `
    <h2>Новый заказ ${order.number}</h2>
    <p><strong>Клиент:</strong> ${order.name}<br>
       <strong>Email:</strong> ${order.email}<br>
       <strong>Телефон:</strong> ${order.phone}<br>
       <strong>Адрес:</strong> ${order.address || '—'}</p>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead><tr><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>Товары:</strong> ${money(order.subtotal)}<br>
       <strong>Доставка:</strong> ${money(order.deliveryFee)}<br>
       <strong>Итого:</strong> ${money(order.total)}</p>
    <p><strong>Оплата:</strong> ${order.payment}<br>
       <strong>Доставка:</strong> ${order.delivery}</p>
    <p><a href="${process.env.SITE_URL || ''}/admin/orders/${order.id}">Открыть в админке</a></p>
  `;
  await mail.send({ to: adminEmail, subject: `Новый заказ ${order.number} на ${money(order.total)}`, html });
};

exports.notifyClient = async (order) => {
  const siteName = await getSetting('site_name', 'Магазин');
  const rows = order.items.map(i =>
    `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.price} ₽</td><td>${i.price * i.qty} ₽</td></tr>`
  ).join('');
  const html = `
    <h2>Спасибо за заказ в ${siteName}!</h2>
    <p>Номер вашего заказа: <strong>${order.number}</strong></p>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead><tr><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>Итого:</strong> ${money(order.total)}</p>
    <p>Мы свяжемся с вами для подтверждения.</p>
  `;
  await mail.send({ to: order.email, subject: `Заказ ${order.number} принят`, html });
};


exports.notifyChannels = async (order) => {
  try {
    const notify = require('./notify');
    await notify.notifyNewOrder(order);
  } catch (e) { logger.error('[notify] error:', e.message); }
};
