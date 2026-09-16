const { getSetting } = require('./settings');
const { prisma } = require('../config/db');

function money(n) {
  return Number(n || 0).toLocaleString('ru-RU');
}

async function buildVars(order) {
  const siteName = await getSetting('site_name', 'Магазин');
  const siteEmail = await getSetting('email', '');

  let paymentName = order.payment;
  let deliveryName = order.delivery;
  try {
    const pm = await prisma.paymentMethod.findUnique({ where: { code: order.payment } });
    if (pm) paymentName = pm.name;
    const dm = await prisma.deliveryMethod.findUnique({ where: { code: order.delivery } });
    if (dm) deliveryName = dm.name;
  } catch (e) {}

  // Таблица товаров в HTML
  const rows = (order.items || []).map(function (i) {
    return '<tr>' +
      '<td style="padding:10px;border-bottom:1px solid #e5e7eb">' + (i.name || '') + '</td>' +
      '<td style="padding:10px;text-align:center;border-bottom:1px solid #e5e7eb">' + i.qty + '</td>' +
      '<td style="padding:10px;text-align:right;border-bottom:1px solid #e5e7eb">' + money(i.price) + ' ₽</td>' +
      '<td style="padding:10px;text-align:right;border-bottom:1px solid #e5e7eb">' + money(i.price * i.qty) + ' ₽</td>' +
      '</tr>';
  }).join('');

  const addressRow = order.address
    ? '<tr><td style="padding-right:20px;color:#6b7280">Адрес:</td><td>' + order.address + '</td></tr>'
    : '';

  const deliveryInfo = order.address
    ? '<p style="background:#f9fafb;padding:12px;border-radius:6px">Адрес доставки: <strong>' + order.address + '</strong></p>'
    : '';

  return {
    site_name: siteName,
    site_email: siteEmail,
    order: {
      number: order.number,
      name: order.name,
      email: order.email,
      phone: order.phone,
      address: order.address || '',
      total: money(order.total),
      subtotal: money(order.subtotal),
      delivery_fee: money(order.deliveryFee),
      items_table: rows,
      address_row: addressRow,
      delivery_info: deliveryInfo,
      payment_name: paymentName,
      delivery_name: deliveryName,
      date: order.createdAt ? order.createdAt.toLocaleString('ru-RU') : new Date().toLocaleString('ru-RU'),
      comment: order.comment || ''
    }
  };
}

module.exports = { buildVars, money };
