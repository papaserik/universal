const { prisma } = require('../../config/db');

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ');
  return /[",;]/.test(s) ? '"' + s + '"' : s;
}

exports.export = async (req, res) => {
  const status = req.query.status || '';
  const where = status ? { status } : {};
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });

  const header = [
    'Номер', 'Дата', 'Клиент', 'Email', 'Телефон', 'Адрес',
    'Товары', 'Кол-во позиций', 'Товары сумма', 'Доставка', 'Итого',
    'Оплата', 'Способ доставки', 'Статус', 'Комментарий'
  ];

  const rows = [header.join(';')];

  orders.forEach(o => {
    const itemsText = o.items.map(i => `${i.name} x${i.qty}`).join(' | ');
    rows.push([
      o.number,
      o.createdAt.toISOString(),
      o.name,
      o.email,
      o.phone,
      o.address || '',
      itemsText,
      o.items.length,
      o.subtotal,
      o.deliveryFee,
      o.total,
      o.payment,
      o.delivery,
      o.status,
      o.comment || ''
    ].map(csvEscape).join(';'));
  });

  const csv = '\uFEFF' + rows.join('\n'); // BOM для Excel
  const filename = 'orders-' + new Date().toISOString().slice(0, 10) + '.csv';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
  res.send(csv);
};
