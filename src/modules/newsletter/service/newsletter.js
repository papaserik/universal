const { prisma } = require('../../../config/db');
const mail = require('../../../services/mail');
const { getSetting } = require('../../../services/settings');

function renderTemplate(text, vars) {
  return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || '');
}

async function sendTelegramTo(chatId, text) {
  const token = await getSetting('telegram_bot_token', '');
  if (!token || !chatId) return { ok: false, reason: 'no_config' };
  try {
    const res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    const data = await res.json();
    return data.ok ? { ok: true } : { ok: false, reason: data.description || 'error' };
  } catch (e) { return { ok: false, reason: e.message }; }
}

async function sendEmailTo(email, subject, html) {
  return mail.send({ to: email, subject, html });
}

async function broadcast(newsletterId, onProgress) {
  const nl = await prisma.newsletter.findUnique({ where: { id: newsletterId } });
  if (!nl) throw new Error('Рассылка не найдена');

  let channels = [];
  try { channels = JSON.parse(nl.channels); } catch (e) { channels = ['email']; }

  const subscribers = await prisma.subscriber.findMany({
    where: { unsubscribed: false, confirmed: true }
  });

  let delivered = 0, failed = 0;
  const siteName = await getSetting('site_name', 'Магазин');

  for (const sub of subscribers) {
    const vars = { name: sub.name || 'друг', email: sub.email || '', site: siteName };
    const subjectRendered = renderTemplate(nl.subject, vars);
    const contentRendered = renderTemplate(nl.content, vars);

    if (channels.includes('email') && sub.email) {
      const html = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">' +
        '<h2 style="color:#111">' + subjectRendered + '</h2>' +
        '<div style="color:#374151;line-height:1.7">' + contentRendered + '</div>' +
        '<hr style="border:0;border-top:1px solid #eee;margin:24px 0">' +
        '<p style="font-size:12px;color:#9ca3af">Вы получили это письмо, потому что подписаны на рассылку ' + siteName + '. ' +
        '<a href="' + (process.env.SITE_URL || '') + '/unsubscribe?email=' + encodeURIComponent(sub.email) + '">Отписаться</a></p>' +
        '</div>';
      const r = await sendEmailTo(sub.email, subjectRendered, html);
      if (r.ok) delivered++; else failed++;
      await prisma.newsletterLog.create({ data: {
        newsletterId, subscriberId: sub.id, channel: 'email',
        status: r.ok ? 'sent' : 'failed', error: r.reason || null
      }});
    }

    if (channels.includes('telegram') && sub.telegramChatId) {
      const text = '<b>' + subjectRendered + '</b>\n\n' + contentRendered.replace(/<[^>]+>/g, '');
      const r = await sendTelegramTo(sub.telegramChatId, text);
      if (r.ok) delivered++; else failed++;
      await prisma.newsletterLog.create({ data: {
        newsletterId, subscriberId: sub.id, channel: 'telegram',
        status: r.ok ? 'sent' : 'failed', error: r.reason || null
      }});
    }

    if (onProgress) onProgress(delivered + failed, subscribers.length);
  }

  await prisma.newsletter.update({
    where: { id: newsletterId },
    data: { status: 'sent', sentAt: new Date(), recipients: subscribers.length, delivered, failed }
  });

  return { ok: true, delivered, failed, total: subscribers.length };
}

module.exports = { broadcast, sendTelegramTo, renderTemplate };
