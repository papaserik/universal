const nodemailer = require('nodemailer');
const { getSetting } = require('./settings');
const logger = require('../lib/logger');

let _transport = null;
let _cacheKey = '';

async function transport() {
  const host = await getSetting('smtp_host');
  const port = Number(await getSetting('smtp_port', '587'));
  const user = await getSetting('smtp_user');
  const pass = await getSetting('smtp_pass');
  const secure = (await getSetting('smtp_secure', '0')) === '1';

  if (!host || !user) return null;

  const key = [host, port, user, pass, secure].join('|');
  if (_transport && _cacheKey === key) return _transport;

  _transport = nodemailer.createTransport({
    host, port, secure,
    auth: user ? { user, pass } : undefined
  });
  _cacheKey = key;
  return _transport;
}

async function send({ to, subject, html, text }) {
  const t = await transport();
  if (!t) {
    logger.debug('[mail] SMTP не настроен, письмо пропущено:', subject);
    return { ok: false, reason: 'not_configured' };
  }
  const from = (await getSetting('smtp_from')) || (await getSetting('email')) || 'shop@example.com';
  try {
    await t.sendMail({ from, to, subject, html, text });
    return { ok: true };
  } catch (e) {
    logger.error('[mail] Ошибка отправки:', e.message);
    return { ok: false, reason: e.message };
  }
}

module.exports = { send };
