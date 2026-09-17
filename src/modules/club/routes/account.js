const router = require('express').Router();
const { prisma } = require('../../../config/db');
const referral = require('../service');

router.get('/', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');

  const refCode = await referral.ensureRefCode(user.id);
  const info = await referral.stats(user.id);

  const { getSetting } = require('../../../services/settings');
  const settings = {
    enabled:         (await getSetting('referral_enabled', '1')) === '1',
    signupPoints:    Number(await getSetting('referral_signup_points', '200')) || 200,
    firstBonus:      Number(await getSetting('referral_first_purchase_bonus', '500')) || 500,
    cashbackPercent: Number(await getSetting('referral_cashback_percent', '2')) || 2
  };

  const baseUrl = process.env.SITE_URL || (req.protocol + '://' + req.get('host'));
  const refUrl = baseUrl + '/r/' + refCode;

  res.locals.setMeta({ title: 'Клуб — приглашайте друзей' });
  res.render('club/account/club', { refCode, refUrl, info, settings });
});

module.exports = router;
