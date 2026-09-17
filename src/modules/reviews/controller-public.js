const { prisma } = require('../../config/db');
const loyalty = require('../../modules/loyalty/service');
const logger = require('../../lib/logger');

const rateMap = new Map();
function rateLimit(ip, limit = 5, windowMs = 3600 * 1000) {
  const now = Date.now();
  const rec = rateMap.get(ip);
  if (!rec || rec.resetAt < now) { rateMap.set(ip, { count: 1, resetAt: now + windowMs }); return true; }
  if (rec.count >= limit) return false;
  rec.count++;
  return true;
}

function looksSpammy(text) {
  if (!text || text.length < 10) return true;
  if (text.length > 3000) return true;
  const links = (text.match(/https?:\/\/|www\./gi) || []).length;
  if (links > 2) return true;
  if (/(.)\1{7,}/.test(text)) return true;
  const caps = (text.match(/[A-ZА-Я]/g) || []).length;
  if (text.length > 20 && caps / text.length > 0.6) return true;
  return false;
}

exports.listForProduct = async (productId) => {
  return prisma.review.findMany({ where: { productId, approved: true }, orderBy: { createdAt: 'desc' }, take: 50 });
};

exports.ratingSummary = async (productId) => {
  const all = await prisma.review.findMany({ where: { productId, approved: true } });
  if (!all.length) return { avg: 0, count: 0 };
  const sum = all.reduce((s, r) => s + r.rating, 0);
  return { avg: Math.round((sum / all.length) * 10) / 10, count: all.length };
};

exports.submit = async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const { name, text, rating, website } = req.body;
    const user = req.session.user;
    const ip = req.ip || 'unknown';

    if (website) return res.json({ ok: true, id: 0, pending: true });

    if (!rateLimit(ip, 5, 3600 * 1000)) return res.json({ ok: false, error: 'Слишком много отзывов. Попробуйте позже.' });
    if (!name || !text) return res.json({ ok: false, error: 'Заполните имя и текст' });
    if (name.length > 100 || text.length > 3000) return res.json({ ok: false, error: 'Слишком длинно' });
    if (looksSpammy(text)) return res.json({ ok: false, error: 'Отзыв похож на спам' });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.json({ ok: false, error: 'Товар не найден' });

    if (user) {
      const existing = await prisma.review.findFirst({ where: { productId, userId: user.id } });
      if (existing) return res.json({ ok: false, error: 'Вы уже оставляли отзыв об этом товаре' });
    }

    let orderId = null, verified = false;
    if (user) {
      const purchased = await prisma.orderItem.findFirst({
        where: { productId, order: { OR: [{ userId: user.id }, { email: user.email }] } }
      });
      if (purchased) { orderId = purchased.orderId; verified = true; }
    }

    const review = await prisma.review.create({
      data: {
        productId,
        userId: user ? user.id : null,
        orderId,
        name: name.trim(),
        email: user ? user.email : null,
        rating: Math.max(1, Math.min(5, Number(rating) || 5)),
        text: text.trim(),
        approved: false
      }
    });

    if (user && verified) {
      try {
        const ls = await loyalty.settings();
        if (ls.enabled && ls.forReview > 0) {
          const already = await prisma.loyaltyTransaction.findFirst({
            where: { userId: user.id, type: 'review', description: { contains: 'товар#' + productId } }
          });
          if (!already) {
            await loyalty.addPoints(user.id, ls.forReview, 'review',
              'Отзыв о товаре "' + product.name + '"',
              'Баллы за отзыв товар#' + productId);
          }
        }
      } catch (e) { logger.error('review points:', e); }
    }

    res.json({ ok: true, id: review.id, pending: true });
  } catch (e) {
    logger.error('review submit error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};

exports.approve = async (req, res) => {
  await prisma.review.update({ where: { id: Number(req.params.id) }, data: { approved: true } });
  res.redirect('/admin/reviews');
};
exports.reject = async (req, res) => {
  await prisma.review.update({ where: { id: Number(req.params.id) }, data: { approved: false } });
  res.redirect('/admin/reviews');
};
exports.remove = async (req, res) => {
  await prisma.review.delete({ where: { id: Number(req.params.id) } });
  res.redirect('/admin/reviews');
};
