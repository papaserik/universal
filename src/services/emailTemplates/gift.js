// Письмо получателю подарка — без цены и реквизитов оплаты
function giftRecipientBody() {
  return '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">' +
    '<div style="border-bottom:2px solid #d97706;padding-bottom:12px;margin-bottom:24px">' +
      '<h2 style="margin:0;color:#78350f;font-size:22px">🎁 Вам подарок!</h2>' +
    '</div>' +
    '<p style="font-size:16px;line-height:1.6">Здравствуйте, <strong>{{order.recipient_name}}</strong>!</p>' +
    '<p style="font-size:16px;line-height:1.6"><strong>{{order.buyer_name}}</strong> отправил(а) вам подарок из магазина {{site_name}}.</p>' +
    '{{order.gift_message_block}}' +
    '<h3 style="margin:28px 0 12px;font-size:16px">Что внутри</h3>' +
    '<ul style="font-size:15px;line-height:1.8;padding-left:20px;color:#374151">' +
      '{{order.items_list}}' +
    '</ul>' +
    '<p style="margin-top:24px;font-size:14px;line-height:1.6;color:#6b7280">' +
      'Мы свяжемся с вами для согласования доставки.<br>' +
      'Если что-то нужно уточнить — ответьте на это письмо.' +
    '</p>' +
    '<hr style="border:0;border-top:1px solid #eee;margin:24px 0">' +
    '<p style="font-size:12px;color:#9ca3af;line-height:1.5">Это письмо отправлено получателю подарка. Отменить или изменить заказ может только отправитель.</p>' +
    '</div>';
}

module.exports = {
  templates: [
    {
      key: 'gift_recipient',
      name: 'Получателю подарка',
      description: 'Отправляется получателю, когда заказ оформлен как подарок',
      subject: '🎁 {{order.buyer_name}} отправил(а) вам подарок',
      body: giftRecipientBody()
    }
  ]
};
