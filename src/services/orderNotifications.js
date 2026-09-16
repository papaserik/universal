const { getStatusByCode, renderStatusEmail, renderTemplate } = require('./templates');
const { buildVars } = require('./orderVars');
const mail = require('./mail');
const notify = require('./notify');

async function sendOrderCreatedEmail(order) {
  try {
    const vars = await buildVars(order);
    const rendered = await renderTemplate('order_created', vars);
    if (rendered) {
      const result = await mail.send({
        to: order.email,
        subject: rendered.subject,
        html: rendered.html
      });
      if (result.ok) console.log('[order] Спасибо-письмо → ' + order.email);
      else console.log('[order] Письмо не отправлено: ' + (result.reason || 'unknown'));
    }
  } catch (e) {
    console.error('[order] Ошибка письма:', e.message);
  }

  // Письмо получателю подарка — если это подарок и есть email
  if (order.isGift && order.recipientName) {
    try {
      const vars = await buildVars(order);
      const rendered = await renderTemplate('gift_recipient', vars);
      if (!rendered) {
        console.log('[gift] Шаблон gift_recipient не найден');
        return;
      }
      // У получателя может не быть email — тогда пробуем по email покупателя
      // (за неимением отдельного email получателя). Позже можно добавить поле.
      const targetEmail = order.recipientEmail || order.email;
      const result = await mail.send({
        to: targetEmail,
        subject: rendered.subject,
        html: rendered.html
      });
      if (result.ok) console.log('[gift] Письмо получателю → ' + targetEmail);
      else console.log('[gift] Письмо не отправлено: ' + (result.reason || 'unknown'));
    } catch (e) {
      console.error('[gift] Ошибка письма получателю:', e.message);
    }
  }
}

async function notifyStatusChange(order, newStatus, oldStatus) {
  try {
    const status = await getStatusByCode(newStatus);
    if (!status) return;

    const vars = await buildVars(order);

    // Клиенту
    if (status.notifyClient) {
      const rendered = await renderStatusEmail(status, vars);
      if (rendered) {
        const r = await mail.send({ to: order.email, subject: rendered.subject, html: rendered.html });
        if (r.ok) console.log('[status] Клиенту ' + order.email + ' → ' + status.name);
        else console.log('[status] Письмо не отправлено: ' + (r.reason || 'unknown'));
      }
    }

    // Админу в мессенджеры
    if (status.notifyAdmin) {
      const text =
        '🔔 Заказ ' + order.number + ' → ' + (status.icon || '') + ' ' + status.name + '\n' +
        'Клиент: ' + order.name + '\n' +
        'Сумма: ' + Number(order.total).toLocaleString('ru-RU') + ' ₽\n' +
        'Было: ' + (oldStatus || '—');
      try {
        await notify.sendTelegram(text);
        await notify.sendMax(text);
      } catch (e) { console.error('[status] notify error:', e.message); }
    }
  } catch (e) {
    console.error('[status] Ошибка уведомления:', e.message);
  }
}

module.exports = { sendOrderCreatedEmail, notifyStatusChange };
