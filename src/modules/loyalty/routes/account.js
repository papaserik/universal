const router = require('express').Router();
const { prisma } = require('../../../config/db');
const loyalty = require('../service');

router.get('/', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');

  const info = await loyalty.currentLevel(user.id);
  const transactions = await prisma.loyaltyTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  res.locals.setMeta({ title: 'Мои баллы' });
  res.render('loyalty/account/loyalty', { info, transactions });
});

module.exports = router;
