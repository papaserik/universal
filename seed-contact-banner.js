const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  let existing = await p.banner.findFirst({ where: { layout: 'contact' } });

  if (existing) {
    console.log('ℹ️  Баннер contact уже есть, id=' + existing.id);
  } else {
    const created = await p.banner.create({
      data: {
        title: 'Контакты',
        layout: 'contact',
        sort: 10,
        active: true,
      }
    });
    console.log('✅ Создан баннер contact, id=' + created.id);
  }

  // Проверка
  const list = await p.banner.findMany({
    select: { id: true, layout: true, title: true, imageUrl: true }
  });
  console.log('\n📊 Все баннеры:');
  list.forEach(b => console.log('  id=' + b.id, '| layout=' + b.layout, '| img=' + (b.imageUrl ? '✓' : '✗')));
  p.$disconnect();
})();
