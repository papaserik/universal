const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('══════════════════════════════════════════════');
  console.log('🧪 ТЕСТ РЕФЕРАЛЬНОЙ ПРОГРАММЫ');
  console.log('══════════════════════════════════════════════');
  console.log('');

  // 1. Находим приглашённого с pending-баллами
  const invited = await prisma.user.findFirst({
    where: { pendingReferralPoints: { gt: 0 } },
    include: { referralReceived: true }
  });

  if (!invited) {
    console.log('❌ Не найдено пользователя с pending-баллами.');
    console.log('   Проведите регистрацию по реферальной ссылке или запустите seed:');
    console.log('   см. ниже в инструкции.');
    await prisma.$disconnect();
    return;
  }

  const link = invited.referralReceived;
  const inviter = await prisma.user.findUnique({ where: { id: link.inviterId } });

  console.log('📋 Исходные данные:');
  console.log('   Приглашённый: ' + invited.email + ' (pending: ' + invited.pendingReferralPoints + ')');
  console.log('   Пригласивший: ' + inviter.email);
  console.log('   Статус связи: ' + link.status);
  console.log('');

  // 2. Считаем баланс ДО
  async function balance(userId) {
    const r = await prisma.loyaltyTransaction.aggregate({
      where: { userId, points: { gt: 0 } },
      _sum: { points: true }
    });
    return r._sum.points || 0;
  }

  const inviterBefore = await balance(inviter.id);
  const invitedBefore = await balance(invited.id);

  console.log('💰 Балансы ДО:');
  console.log('   Пригласивший (' + inviter.email + '): ' + inviterBefore + ' б.');
  console.log('   Приглашённый (' + invited.email + '): ' + invitedBefore + ' б.');
  console.log('');

  // 3. Создаём тестовый заказ от имени приглашённого
  const product = await prisma.product.findFirst({ where: { published: true } });
  if (!product) {
    console.log('❌ Нет товаров в БД');
    await prisma.$disconnect();
    return;
  }

  const qty = 2;
  const subtotal = product.price * qty;
  const total = subtotal + 0;
  const number = 'TEST-REF-' + Date.now().toString(36).toUpperCase();

  const defaultStatus = await prisma.orderStatus.findFirst({ where: { isDefault: true } })
    || await prisma.orderStatus.findFirst();

  const order = await prisma.order.create({
    data: {
      number,
      userId: invited.id,
      email: invited.email,
      phone: '+7 900 000-00-00',
      name: invited.name || 'Тестовый друг',
      payment: 'cod',
      delivery: 'courier',
      subtotal,
      deliveryFee: 0,
      total,
      status: defaultStatus ? defaultStatus.code : 'NEW',
      items: {
        create: [{
          productId: product.id,
          name: product.name,
          price: product.price,
          qty
        }]
      }
    },
    include: { items: true }
  });

  console.log('📦 Создан заказ:');
  console.log('   Номер: ' + order.number);
  console.log('   Сумма: ' + order.total + ' ₽');
  console.log('   Товар: ' + product.name + ' × ' + qty);
  console.log('');

  // 4. Вызываем обработку реферала
  console.log('⚙️  Обрабатываю реферал...');
  const referral = require('./src/services/referral');
  await referral.processOrder(order, invited.id);
  console.log('   ✓ processOrder выполнен');
  console.log('');

  // 5. Проверяем результат
  const inviterAfter = await balance(inviter.id);
  const invitedAfter = await balance(invited.id);

  const updatedInvited = await prisma.user.findUnique({ where: { id: invited.id } });
  const updatedLink = await prisma.referral.findUnique({ where: { id: link.id } });

  console.log('💰 Балансы ПОСЛЕ:');
  console.log('   Пригласивший: ' + inviterAfter + ' б. (+' + (inviterAfter - inviterBefore) + ')');
  console.log('   Приглашённый: ' + invitedAfter + ' б. (+' + (invitedAfter - invitedBefore) + ')');
  console.log('');
  console.log('📊 Состояние связи:');
  console.log('   Статус: ' + updatedLink.status);
  console.log('   Pending у приглашённого: ' + updatedInvited.pendingReferralPoints);
  console.log('   Всего заработано пригласившим: ' + updatedLink.totalEarned + ' ₽');
  console.log('');

  // 6. Показываем транзакции
  const txs = await prisma.loyaltyTransaction.findMany({
    where: {
      userId: { in: [inviter.id, invited.id] },
      type: { in: ['referral_bonus', 'referral_cashback', 'referral_unlock', 'referral_pending'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { email: true } } }
  });

  console.log('📜 Все реферальные транзакции:');
  txs.forEach(t => {
    const sign = t.points >= 0 ? '+' : '';
    console.log('   ' + t.user.email.padEnd(35) + ' ' + sign + t.points + ' б.  ' + t.type.padEnd(20) + ' ' + t.reason);
  });
  console.log('');

  console.log('══════════════════════════════════════════════');
  console.log('✅ ТЕСТ ЗАВЕРШЁН');
  console.log('══════════════════════════════════════════════');
  console.log('');
  console.log('Ожидаемые результаты:');
  console.log('  • Приглашённый: pending → 0, +200 баллов к балансу');
  console.log('  • Пригласивший: +500 бонус, +' + Math.round(total * 0.02) + ' (2% кэшбэк)');
  console.log('  • Статус Referral: converted');
  console.log('');

  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
