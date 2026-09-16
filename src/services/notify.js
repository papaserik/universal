const { getSetting } = require('./settings');

function money(n) { return Number(n).toLocaleString('ru-RU') + ' ₽'; }

function orderText(order) {
  const lines = [];
  lines.push('🛒 Новый заказ ' + order.number);
  lines.push('Клиент: ' + order.name);
  lines.push('Email: ' + order.email);
  lines.push('Телефон: ' + order.phone);
  if (order.address) lines.push('Адрес: ' + order.address);
  lines.push('');
  (order.items || []).forEach(i => {
    lines.push('• ' + i.name + ' × ' + i.qty + ' = ' + (i.price * i.qty) + ' ₽');
  });
  lines.push('');
  lines.push('Товары: ' + money(order.subtotal));
  lines.push('Доставка: ' + money(order.deliveryFee));
  lines.push('Итого: ' + money(order.total));
  lines.push('Оплата: ' + order.payment);
  lines.push('Доставка: ' + order.delivery);
  if (order.comment) lines.push('Комментарий: ' + order.comment);
  return lines.join('\n');
}

// ─── Telegram ───
async function sendTelegram(text) {
  const enabled = (await getSetting('telegram_enabled', '0')) === '1';
  if (!enabled) return { ok: false, reason: 'disabled' };

  const token = await getSetting('telegram_bot_token', '');
  const chatId = await getSetting('telegram_chat_id', '');
  if (!token || !chatId) return { ok: false, reason: 'no_config' };

  try {
    const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    const data = await res.json();
    if (!data.ok) return { ok: false, reason: data.description || 'telegram error' };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// ─── WhatsApp (через webhook) ───
async function sendWhatsApp(order) {
  const enabled = (await getSetting('whatsapp_enabled', '0')) === '1';
  if (!enabled) return { ok: false, reason: 'disabled' };

  const provider = await getSetting('whatsapp_provider', 'webhook');

  if (provider === 'webhook') {
    const url = await getSetting('whatsapp_webhook_url', '');
    const phone = await getSetting('whatsapp_phone', '');
    if (!url) return { ok: false, reason: 'no_webhook' };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone,
          type: 'order',
          order: {
            number: order.number, total: order.total,
            name: order.name, email: order.email, phone: order.phone,
            items: order.items, address: order.address
          },
          text: orderText(order)
        })
      });
      if (!res.ok) return { ok: false, reason: 'HTTP ' + res.status };
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  if (provider === 'callmebot') {
    // Бесплатный вариант через callmebot.com
    const phone = await getSetting('whatsapp_phone', '');
    const apikey = await getSetting('whatsapp_callmebot_apikey', '');
    if (!phone || !apikey) return { ok: false, reason: 'no_config' };
    try {
      const url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(phone) +
        '&text=' + encodeURIComponent(orderText(order)) +
        '&apikey=' + encodeURIComponent(apikey);
      const res = await fetch(url);
      return { ok: res.ok };
    } catch (e) { return { ok: false, reason: e.message }; }
  }

  return { ok: false, reason: 'unknown_provider' };
}


// ─── MAX (мессенджер) ───
async function sendMax(text) {
  const enabled = (await getSetting('max_enabled', '0')) === '1';
  if (!enabled) return { ok: false, reason: 'disabled' };

  const token = await getSetting('max_bot_token', '');
  const chatId = await getSetting('max_chat_id', '');
  if (!token || !chatId) return { ok: false, reason: 'no_config' };

  try {
    // MAX Bot API похож на Telegram Bot API
    const url = 'https://botapi.max.ru/messages?access_token=' + encodeURIComponent(token) + '&chat_id=' + encodeURIComponent(chatId);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, format: 'markdown' })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, reason: 'HTTP ' + res.status + ' ' + errText.slice(0, 200) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

async function notifyNewOrder(order) {
  const text = orderText(order);
  const results = await Promise.allSettled([
    sendTelegram(text),
    sendWhatsApp(order),
    sendMax(text)
  ]);
  results.forEach((r, i) => {
    const name = i === 0 ? 'Telegram' : (i === 1 ? 'WhatsApp' : 'MAX');
    if (r.status === 'fulfilled' && r.value && r.value.ok) {
      console.log('[notify] ' + name + ' — отправлено');
    } else {
      const reason = r.value && r.value.reason || r.reason || 'unknown';
      console.log('[notify] ' + name + ' — не отправлено: ' + reason);
    }
  });
}

async function sendTest(channel) {
  const testOrder = {
    number: 'TEST-' + Date.now().toString(36).toUpperCase(),
    name: 'Тестовый клиент', email: 'test@example.com', phone: '+7 000 000-00-00',
    address: 'г. Тест', subtotal: 1000, deliveryFee: 300, total: 1300,
    payment: 'cod', delivery: 'courier',
    items: [{ name: 'Тестовый товар', qty: 2, price: 500 }]
  };
  if (channel === 'telegram') return sendTelegram(orderText(testOrder));
  if (channel === 'whatsapp') return sendWhatsApp(testOrder);
  if (channel === 'max') return sendMax(orderText(testOrder));
  return { ok: false, reason: 'unknown_channel' };
}

module.exports = { notifyNewOrder, sendTest, sendTelegram, sendWhatsApp, sendMax };
