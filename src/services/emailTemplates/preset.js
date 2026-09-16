function wrapper(inner) {
  return '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">' +
    '<div style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px">' +
      '<h2 style="margin:0;color:#0f172a;font-size:20px">{{site_name}}</h2>' +
    '</div>' +
    inner +
    '<hr style="border:0;border-top:1px solid #eee;margin:24px 0">' +
    '<p style="font-size:12px;color:#9ca3af;line-height:1.5">Если у вас есть вопросы — ответьте на это письмо или свяжитесь с нами: {{site_email}}</p>' +
    '</div>';
}

var ORDER_CREATED_BODY = wrapper(
  '<p>Здравствуйте, <strong>{{order.name}}</strong>!</p>' +
  '<p>Спасибо за заказ <strong>{{order.number}}</strong> в магазине {{site_name}}.</p>' +
  '<p>Мы получили ваш заказ и уже начали его обработку. Ниже — счёт с перечнем позиций.</p>' +
  '<h3 style="margin:24px 0 12px;font-size:16px">Счёт на оплату</h3>' +
  '<table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb">' +
    '<thead><tr style="background:#f9fafb">' +
      '<th style="padding:10px;text-align:left;border-bottom:1px solid #e5e7eb">Наименование</th>' +
      '<th style="padding:10px;text-align:center;border-bottom:1px solid #e5e7eb;width:60px">Кол-во</th>' +
      '<th style="padding:10px;text-align:right;border-bottom:1px solid #e5e7eb;width:90px">Цена</th>' +
      '<th style="padding:10px;text-align:right;border-bottom:1px solid #e5e7eb;width:100px">Сумма</th>' +
    '</tr></thead>' +
    '<tbody>{{order.items_table}}</tbody>' +
    '<tfoot>' +
      '<tr><td colspan="3" style="padding:10px;text-align:right;border-top:1px solid #e5e7eb">Товары:</td><td style="padding:10px;text-align:right;border-top:1px solid #e5e7eb">{{order.subtotal}} ₽</td></tr>' +
      '<tr><td colspan="3" style="padding:10px;text-align:right">Доставка:</td><td style="padding:10px;text-align:right">{{order.delivery_fee}} ₽</td></tr>' +
      '<tr style="font-weight:700;background:#f9fafb"><td colspan="3" style="padding:12px;text-align:right;border-top:2px solid #0f172a">Итого к оплате:</td><td style="padding:12px;text-align:right;border-top:2px solid #0f172a">{{order.total}} ₽</td></tr>' +
    '</tfoot>' +
  '</table>' +
  '<h3 style="margin:24px 0 12px;font-size:16px">Данные заказа</h3>' +
  '<table style="font-size:14px;color:#374151;line-height:1.8">' +
    '<tr><td style="padding-right:20px;color:#6b7280">Номер:</td><td><strong>{{order.number}}</strong></td></tr>' +
    '<tr><td style="padding-right:20px;color:#6b7280">Дата:</td><td>{{order.date}}</td></tr>' +
    '<tr><td style="padding-right:20px;color:#6b7280">Получатель:</td><td>{{order.name}}</td></tr>' +
    '<tr><td style="padding-right:20px;color:#6b7280">Email:</td><td>{{order.email}}</td></tr>' +
    '<tr><td style="padding-right:20px;color:#6b7280">Телефон:</td><td>{{order.phone}}</td></tr>' +
    '{{order.address_row}}' +
    '<tr><td style="padding-right:20px;color:#6b7280">Оплата:</td><td>{{order.payment_name}}</td></tr>' +
    '<tr><td style="padding-right:20px;color:#6b7280">Доставка:</td><td>{{order.delivery_name}}</td></tr>' +
  '</table>' +
  '<p style="margin-top:24px;color:#6b7280;font-size:13.5px;line-height:1.6">Если вы выбрали онлайн-оплату — счёт привязан к вашему заказу. Если оплата при получении — оплата производится при вручении. Менеджер свяжется с вами для подтверждения.</p>'
);

var STATUS_NEW_BODY = wrapper(
  '<p>Здравствуйте, <strong>{{order.name}}</strong>!</p>' +
  '<p>Ваш заказ <strong>{{order.number}}</strong> принят. Мы свяжемся с вами в ближайшее время для подтверждения.</p>'
);

var STATUS_PAID_BODY = wrapper(
  '<p>Здравствуйте, <strong>{{order.name}}</strong>!</p>' +
  '<p>Оплата по заказу <strong>{{order.number}}</strong> на сумму <strong>{{order.total}} ₽</strong> получена.</p>' +
  '<p>Мы передаём заказ в обработку. Ожидайте — скоро сообщим о готовности к отправке.</p>'
);

var STATUS_SHIPPED_BODY = wrapper(
  '<p>Здравствуйте, <strong>{{order.name}}</strong>!</p>' +
  '<p>Ваш заказ <strong>{{order.number}}</strong> отправлен.</p>' +
  '{{order.delivery_info}}' +
  '<p>Если у вас появятся вопросы по доставке — просто ответьте на это письмо.</p>'
);

var STATUS_DONE_BODY = wrapper(
  '<p>Здравствуйте, <strong>{{order.name}}</strong>!</p>' +
  '<p>Заказ <strong>{{order.number}}</strong> доставлен. Спасибо, что выбрали {{site_name}}!</p>' +
  '<p>Будем рады видеть вас снова. Если у вас есть минутка — напишите отзыв о заказе.</p>'
);

var STATUS_CANCELLED_BODY = wrapper(
  '<p>Здравствуйте, <strong>{{order.name}}</strong>!</p>' +
  '<p>Заказ <strong>{{order.number}}</strong> отменён.</p>' +
  '<p>Если это произошло по ошибке или вы хотите оформить новый заказ — свяжитесь с нами: {{site_email}}.</p>'
);

module.exports = {
  templates: [
    {
      key: 'order_created',
      name: 'Спасибо за заказ + счёт',
      description: 'Отправляется клиенту сразу после оформления заказа',
      subject: 'Спасибо за заказ {{order.number}} — {{site_name}}',
      body: ORDER_CREATED_BODY
    }
  ],
  statuses: [
    {
      code: 'NEW', name: 'Новый', color: '#3b82f6', icon: '🆕', sort: 10,
      isDefault: true, isFinal: false, notifyClient: false, notifyAdmin: true,
      emailSubject: 'Заказ {{order.number}} принят',
      emailBody: STATUS_NEW_BODY
    },
    {
      code: 'PAID', name: 'Оплачен', color: '#16a34a', icon: '💰', sort: 20,
      isDefault: false, isFinal: false, notifyClient: true, notifyAdmin: true,
      emailSubject: 'Оплата по заказу {{order.number}} получена',
      emailBody: STATUS_PAID_BODY
    },
    {
      code: 'SHIPPED', name: 'Отправлен', color: '#f59e0b', icon: '📦', sort: 30,
      isDefault: false, isFinal: false, notifyClient: true, notifyAdmin: false,
      emailSubject: 'Ваш заказ {{order.number}} отправлен',
      emailBody: STATUS_SHIPPED_BODY
    },
    {
      code: 'DONE', name: 'Доставлен', color: '#059669', icon: '✅', sort: 40,
      isDefault: false, isFinal: true, notifyClient: true, notifyAdmin: false,
      emailSubject: 'Заказ {{order.number}} доставлен',
      emailBody: STATUS_DONE_BODY
    },
    {
      code: 'CANCELLED', name: 'Отменён', color: '#dc2626', icon: '❌', sort: 50,
      isDefault: false, isFinal: true, notifyClient: true, notifyAdmin: true,
      emailSubject: 'Заказ {{order.number}} отменён',
      emailBody: STATUS_CANCELLED_BODY
    }
  ]
};
