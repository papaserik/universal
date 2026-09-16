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
      comment: order.comment || '',
      // ─── Подарок ───
      is_gift: order.isGift ? '1' : '',
      recipient_name: order.recipientName || '',
      recipient_phone: order.recipientPhone || '',
      recipient_address: order.recipientAddress || '',
      gift_message: order.giftMessage || '',
      buyer_name: order.name,
      buyer_email: order.email,
      gift_message_block: order.giftMessage
        ? '<div style="margin:24px 0;padding:20px;background:#fffbeb;border-left:4px solid #d97706;border-radius:8px">' +
          '<p style="margin:0 0 8px;font-size:13px;color:#92400e;text-transform:uppercase;letter-spacing:.5px">Поздравление</p>' +
          '<p style="margin:0;font-size:15px;line-height:1.6;color:#78350f;font-style:italic">«' + order.giftMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '»</p>' +
          '</div>'
        : '',
      items_list: (order.items || []).map(function (i) {
        return '<li>' + (i.name || '') + ' — ' + i.qty + ' шт.</li>';
      }).join('')
    }
  };
}

module.exports = { buildVars, money };
