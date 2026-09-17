const { prisma } = require('../config/db');
const mail = require('./mail');
const { getSetting } = require('./settings');
const loyalty = require('../modules/loyalty/service');
const referral = require('./referral');

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createAndSend(email, ip) {
  email = String(email || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, reason: 'Введите корректный email' };
  }

  // Отзыв старых активных кодов для этого email
  await prisma.loginCode.updateMany({
    where: { email, used: false },
    data: { used: true }
  });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

  await prisma.loginCode.create({
    data: { email, code, expiresAt, ip: ip || null }
  });

  const siteName = await getSetting('site_name', 'Магазин');
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h2 style="color:#111;margin:0 0 16px">Вход в ${siteName}</h2>
      <p style="color:#374151;line-height:1.6">Ваш код для входа:</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:8px;background:#f3f4f6;padding:18px;border-radius:8px;text-align:center;color:#111;font-family:ui-monospace,Menlo,monospace">${code}</div>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin-top:16px">Код действует 10 минут. Если вы не запрашивали вход — просто проигнорируйте это письмо.</p>
    </div>
  `;

  const result = await mail.send({
    to: email,
    subject: 'Код для входа: ' + code,
    html,
    text: 'Ваш код для входа в ' + siteName + ': ' + code
  });

  if (!result.ok && result.reason === 'not_configured') {
    return { ok: false, reason: 'SMTP не настроен. Обратитесь к администратору.' };
  }
  if (!result.ok) {
    return { ok: false, reason: 'Ошибка отправки: ' + result.reason };
  }
  return { ok: true };
}

async function verify(email, code) {
  email = String(email || '').trim().toLowerCase();
  code = String(code || '').trim();

  if (!email || !code) return { ok: false, reason: 'Заполните поля' };

  const record = await prisma.loginCode.findFirst({
    where: { email, used: false },
    orderBy: { createdAt: 'desc' }
  });

  if (!record) return { ok: false, reason: 'Код не запрашивался или уже использован' };
  if (record.expiresAt < new Date()) return { ok: false, reason: 'Код истёк. Запросите новый.' };
  if (record.attempts >= 5) return { ok: false, reason: 'Слишком много попыток. Запросите новый код.' };

  if (record.code !== code) {
    await prisma.loginCode.update({
      where: { id: record.id },
      data: { attempts: record.attempts + 1 }
    });
    return { ok: false, reason: 'Неверный код' };
  }

  await prisma.loginCode.update({
    where: { id: record.id },
    data: { used: true }
  });

  // Найти или создать пользователя
  let user = await prisma.user.findUnique({ where: { email } });
  let isNewUser = false;
  if (!user) {
    const refCode = await referral.generateRefCode();
    user = await prisma.user.create({
      data: {
        email,
        password: 'magic:' + Math.random().toString(36).slice(2) + Date.now(),
        name: email.split('@')[0],
        role: 'USER',
        active: true,
        refCode
      }
    });
    isNewUser = true;

    // Приветственные баллы за регистрацию
    try {
      const ls = await loyalty.settings();
      if (ls.enabled && ls.forSignup > 0) {
        await loyalty.addPoints(user.id, ls.forSignup, 'signup', 'Бонус за первую регистрацию');
      }
    } catch (e) { console.error('signup points:', e); }
  }
  if (!user.active) return { ok: false, reason: 'Аккаунт заблокирован' };

  return { ok: true, user, isNewUser };
}

module.exports = { createAndSend, verify };
